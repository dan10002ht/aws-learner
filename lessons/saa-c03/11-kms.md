# Bài 11 — KMS (Key Management Service) Deep

## 1. Mục tiêu
- Hiểu **envelope encryption** — vì sao AWS không encrypt data trực tiếp bằng CMK.
- Phân biệt 4 loại key: AWS-managed, Customer-managed (CMK), AWS-owned, Imported.
- Viết **key policy** đúng + dùng **grants**.
- Cross-account, cross-region key sharing.
- Tích hợp KMS với S3, EBS, RDS, Secrets Manager.

---

## 2. Lý thuyết

### 2.1 Vì sao cần KMS

**KMS là gì.** AWS Key Management Service là dịch vụ **giữ khoá mã hoá hộ bạn và thực hiện phép mã hoá/giải mã bên trong nó**. Điểm cốt lõi: khoá **không bao giờ rời khỏi KMS ở dạng đọc được**. Bạn không tải khoá về; bạn gửi dữ liệu nhỏ lên, KMS mã hoá/giải mã rồi trả kết quả. Vì mọi lần dùng khoá đều là một lời gọi API, AWS kiểm được quyền (ai được gọi) và ghi được log (CloudTrail ghi lại từng lần `Decrypt`).

Ba thuật ngữ dùng suốt bài:

- **HSM (Hardware Security Module)** — thiết bị phần cứng chuyên giữ khoá, được thiết kế để khoá chỉ tồn tại bên trong nó; cạy vỏ máy thì khoá tự huỷ. KMS chạy trên một dàn HSM do AWS vận hành.
- **KMS key** — một *tài nguyên* trong KMS, gồm ID, alias (tên gọi), key policy (ai được dùng) và phần bí mật bên dưới. Tài liệu cũ và nhiều câu hỏi thi gọi nó là **CMK (Customer Master Key)**; hai tên chỉ cùng một thứ. Bài này dùng "CMK" theo thói quen đề thi.
- **Key material** — chính chuỗi bit bí mật (256 bit với khoá đối xứng AES-256) nằm bên trong KMS key. Phân biệt hai thứ này quan trọng cho §2.3 (import key material) và §2.6 (rotation đổi material nhưng giữ nguyên KMS key).

**Vậy sao không gửi hết dữ liệu lên KMS để mã hoá?** Vì API `Encrypt` chỉ nhận tối đa **4.096 byte (4 KB)** mỗi lần gọi. Thử ép một file 1 GB qua giới hạn đó:

```
1 GB ÷ 4 KB mỗi lần gọi          = 262.144 lần gọi Encrypt
262.144 ÷ 10.000 × $0,03          ≈ $0,79 cho MỘT file
Quota mặc định 10.000 request/giây → file này ngốn trọn quota của cả account trong ~26 giây
```

Chưa kể 1 GB dữ liệu phải đi qua mạng tới KMS rồi quay về. Trong khi đó, thuật toán AES chạy ngay trên CPU của server bạn thì không tốn lần gọi mạng nào. Giải pháp là để KMS chỉ bảo vệ **một cái khoá nhỏ**, còn dữ liệu thì mã hoá tại chỗ bằng cái khoá nhỏ đó. Kỹ thuật này tên là **Envelope Encryption** (mã hoá phong bì).

### 2.2 Envelope Encryption

```
1. App gọi KMS GenerateDataKey(CMK)
2. KMS trả về:
   - Plaintext data key (32 bytes AES-256)
   - Encrypted data key (CMK encrypt cái trên)
3. App encrypt data với plaintext data key (AES-GCM, local)
4. App lưu: ciphertext + encrypted data key
5. App XÓA plaintext data key khỏi memory
6. Khi decrypt:
   - Gọi KMS Decrypt(encrypted data key) → plaintext data key
   - Decrypt data local
```

→ KMS chỉ xử lý **32 bytes data key**, không thấy data thật. File 1 GB ở §2.1 giờ chỉ tốn **1 lần gọi KMS** (thay vì 262.144 lần), còn CMK vẫn không rời khỏi KMS.

Vì sao gọi là "phong bì": data key đã mã hoá được cất **ngay cạnh** dữ liệu, như chìa khoá bỏ trong một phong bì dán kín mà chỉ KMS mở được. Mất file thì kẻ trộm có cả ciphertext lẫn phong bì, nhưng không mở được phong bì nếu không có quyền gọi `Decrypt` trên CMK. Mọi dịch vụ AWS mã hoá bằng KMS (S3, EBS, RDS…) đều làm đúng flow này thay bạn.

### 2.3 Loại CMK

Các loại khoá khác nhau ở đúng hai câu hỏi: **ai nắm quyền điều khiển khoá** (sửa policy, bật/tắt, xoá, chia sẻ) và **key material sinh ra ở đâu**. Càng nhiều quyền điều khiển thì càng nhiều việc phải tự làm.

**AWS owned key** — khoá thuộc về chính dịch vụ AWS, dùng chung cho nhiều khách hàng, nằm ngoài account của bạn. Bạn không nhìn thấy nó, không có log CloudTrail về nó, không tốn đồng nào. Đây là mặc định của DynamoDB và của S3 SSE-S3. Hợp khi yêu cầu chỉ là "dữ liệu phải được mã hoá at rest".

**AWS managed key** — khoá nằm **trong account của bạn** nhưng do một dịch vụ AWS tạo và quản, nhận ra bằng alias dạng `aws/<service>` (`aws/s3`, `aws/rds`, `aws/ebs`…). Bạn xem được nó và thấy log dùng khoá trong CloudTrail, nhưng **không sửa được key policy**. Hệ quả trực tiếp: không thể cho account khác dùng, nên snapshot/AMI mã hoá bằng `aws/ebs` **không share cross-account được**. Không tính phí lưu khoá, vẫn tính phí request.

**Customer managed key** — khoá bạn tự tạo. Bạn viết key policy, tự bật rotation, disable, xoá, cho account khác dùng. Đây là thứ đề thi muốn khi câu hỏi có một trong các cụm: *"kiểm soát ai được dùng khoá"*, *"audit + tự quản rotation"*, *"share dữ liệu mã hoá sang account khác"*, *"thu hồi quyền truy cập bằng cách vô hiệu khoá"*.

**Imported key material (BYOK — Bring Your Own Key)** — vẫn là customer managed key, nhưng key material do **bạn sinh ra bên ngoài AWS** (ví dụ từ HSM on-premises) rồi nạp vào một KMS key rỗng. Lý do tồn tại: một số quy định bắt buộc tổ chức phải tự sinh khoá và giữ một bản sao ngoài cloud. Cái giá: bạn tự chịu trách nhiệm giữ bản gốc (AWS không khôi phục hộ), material có thể đặt ngày hết hạn, và **không có auto-rotation**.

**Custom key store** — KMS key mà key material nằm trong một cụm **CloudHSM** của riêng bạn thay vì trong dàn HSM dùng chung của KMS. CloudHSM là dịch vụ cho thuê HSM **chỉ một khách hàng dùng** (chi tiết ở §2.11). Bạn vẫn gọi KMS API như thường, các dịch vụ AWS vẫn tích hợp được, nhưng khoá nằm trên phần cứng bạn kiểm soát. Dùng khi auditor yêu cầu "khoá phải nằm trên HSM single-tenant". Cái giá: phải nuôi cụm CloudHSM tối thiểu 2 HSM, không auto-rotation, và trần 1.800 request/giây cho mỗi key store.

| Loại | Ai tạo | Ai quản | Rotation | Cross-account | Cost (us-east-1) |
|------|--------|---------|----------|---------------|------|
| **AWS Owned** | AWS | AWS | Do dịch vụ sở hữu khoá quyết định | Không | Free |
| **AWS Managed** (`aws/s3`, `aws/rds`…) | AWS | AWS | Tự động **1 năm**, không tắt/chỉnh được | Không | Free key, $0.03/10k call |
| **Customer Managed (CMK)** | Bạn | Bạn | Tự bật; mặc định **1 năm**, chỉnh được 90–2.560 ngày | **Có** | $1/key/tháng + $0.03/10k call |
| **Imported** (BYOK) | Bạn | Bạn | Không auto (phải import material mới) | Có | $1/key/tháng |
| **Custom Key Store** (CloudHSM-backed) | Bạn | Bạn | Tự làm thủ công | Có | $1/key + CloudHSM cluster (≥2 HSM, ~$1.60/HSM/giờ) |

Mọi account có 20.000 request KMS miễn phí mỗi tháng. Quy tắc chọn nhanh:

| Đề bài nói | Chọn |
|-----------|------|
| Chỉ cần "encrypt at rest", ít vận hành nhất, rẻ nhất | AWS owned / AWS managed (mặc định của dịch vụ) |
| Tự kiểm soát policy, audit, rotation, share cross-account | **Customer managed key** |
| Key material phải do công ty tự sinh / giữ bản sao ngoài AWS | **Imported key (BYOK)** |
| Khoá phải nằm trên HSM dedicated nhưng vẫn muốn dùng KMS API và tích hợp S3/EBS/RDS | **Custom key store** |
| Cần HSM dedicated và tự gọi bằng PKCS#11/JCE, không qua KMS | **CloudHSM** trực tiếp (§2.11) |

> Bẫy thi: *"share encrypted snapshot/AMI sang account khác"* mà khoá đang là `aws/ebs` → không share được. Phải **copy snapshot và mã hoá lại bằng customer managed key**, rồi cấp quyền key đó cho account kia (§2.7).

### 2.4 Key Policy (resource policy của KMS) — BẮT BUỘC

**Key policy** là resource policy gắn trên từng KMS key (giống bucket policy của S3), và mỗi key **bắt buộc có đúng một** cái. Nhưng cách nó phối hợp với IAM thì **khác S3**, và đây là điểm đề thi khai thác:

- **Với S3**, trong cùng một account, IAM policy tự nó đã đủ. User có `s3:GetObject` trong IAM policy thì đọc được object, kể cả khi bucket không có bucket policy nào.
- **Với KMS**, key policy là **gốc của mọi quyền**. Nó không tự động cấp gì cho account sở hữu hay cho bất kỳ ai trong account. Nếu key policy không nhắc tới bạn (trực tiếp hoặc gián tiếp), thì dù IAM policy có `kms:*` hay `AdministratorAccess` cũng bị từ chối.

Vậy tại sao trong thực tế bạn vẫn cấp quyền KMS bằng IAM policy được? Vì statement **đầu tiên** trong policy mẫu dưới đây. Principal `arn:aws:iam::123:root` không có nghĩa là "user root", mà là **"cả account 123"**. Cấp `kms:*` cho principal đó không cho riêng ai dùng khoá; nó có nghĩa là **"key này uỷ quyền cho account, IAM policy trong account được phép cấp tiếp"**. Có statement đó thì IAM policy mới có hiệu lực với key.

Tóm lại, một request tới KMS trong cùng account được cho phép khi rơi vào **một trong hai** đường:

```
Đường 1: key policy nêu ĐÍCH DANH principal (role/user) và action đó   → cho phép, không cần IAM
Đường 2: key policy có statement "root" của account
         VÀ IAM policy của principal cho phép action đó               → cho phép
Không đường nào khớp                                                  → AccessDenied
(Explicit Deny ở bất kỳ đâu — key policy, IAM, SCP — luôn thắng)
```

Policy mẫu dưới đây có đủ ba phần thường gặp: statement uỷ quyền cho account, nhóm **quản trị** key (sửa policy, bật/tắt, xoá, nhưng *không* được mã hoá/giải mã), và nhóm **sử dụng** key (mã hoá/giải mã, nhưng không sửa được policy). Tách hai nhóm này là cách KMS thực hiện *separation of duties*: người quản khoá không đọc được dữ liệu.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnableRootPermissions",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123:root" },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "AllowKeyAdmins",
      "Effect": "Allow",
      "Principal": { "AWS": ["arn:aws:iam::123:role/KeyAdmin"] },
      "Action": ["kms:Create*","kms:Describe*","kms:Enable*","kms:List*","kms:Put*","kms:Update*","kms:Revoke*","kms:Disable*","kms:Get*","kms:Delete*","kms:TagResource","kms:UntagResource","kms:ScheduleKeyDeletion","kms:CancelKeyDeletion"],
      "Resource": "*"
    },
    {
      "Sid": "AllowUseOfKey",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123:role/AppRole" },
      "Action": ["kms:Encrypt","kms:Decrypt","kms:ReEncrypt*","kms:GenerateDataKey*","kms:DescribeKey"],
      "Resource": "*"
    }
  ]
}
```

**Bỏ statement root thì chuyện gì xảy ra?** Hai hậu quả:

1. **IAM policy mất tác dụng với key này.** Mọi IAM policy `Allow` trên key trở nên vô hiệu (IAM `Deny` thì vẫn có hiệu lực). Chỉ những principal được nêu đích danh trong key policy mới dùng được.
2. **Key có thể thành "không quản lý được".** Giả sử key policy chỉ nêu đích danh role `KeyAdmin`. Một ngày ai đó xoá role này. Không còn principal nào có quyền `kms:PutKeyPolicy` để sửa lại policy, và admin của account cũng không vào được vì key policy không uỷ quyền cho account. Dữ liệu mã hoá bằng key đó coi như bị khoá ngoài cửa. Lối ra duy nhất là mở case với **AWS Support** để lấy lại quyền truy cập, tức là downtime tính bằng giờ hoặc ngày chứ không tự xử lý được.

**Luôn để root trong key policy.** User root của account là principal duy nhất không thể bị xoá, nên statement này là dây an toàn cuối cùng.

> Bẫy thi: *"IAM user có AdministratorAccess nhưng vẫn AccessDenied khi decrypt"* → nhìn vào **key policy** (thiếu statement root, hoặc không nêu user đó). Còn *"key policy đã cho phép role X nhưng role ở account khác vẫn bị từ chối"* → thiếu IAM policy ở account bên kia (§2.7).

### 2.5 Grants — alternative cho key policy

**Nó là gì.** Grant là một **giấy uỷ quyền nhỏ, gắn trên một KMS key, cấp cho đúng một principal một danh sách thao tác cụ thể**. Nó được xét cùng với key policy và IAM policy khi KMS quyết định cho phép hay không. Grant **chỉ cho phép, không deny được**, và mỗi grant chỉ áp cho đúng một key.

**Giải quyết bài toán gì.** Key policy là một tài liệu JSON duy nhất cho cả key. Nếu mỗi lần một EBS volume, một RDS instance hay một job tạm thời cần dùng khoá mà lại phải sửa tài liệu đó, thì policy phình ra nhanh, hai người sửa đồng thời sẽ ghi đè nhau, và dọn dẹp sau này phải dò từng dòng. Grant tách việc đó ra: tạo một grant, dùng quyền, xong thì xoá grant. Key policy không bị đụng tới. Một key chứa được tới 50.000 grant.

Khi muốn **temp** cấp quyền cho principal mà không sửa key policy (e.g. EBS volume cần dùng key tạm thời để snapshot):

```bash
aws kms create-grant --key-id <KEY> \
  --grantee-principal arn:aws:iam::123:role/Snapshotter \
  --operations Encrypt Decrypt GenerateDataKey
```

Lệnh trả về hai thứ: `GrantId` (để xoá grant sau này) và `GrantToken`.

**GrantToken dùng để làm gì.** KMS là hệ thống phân tán theo mô hình **eventual consistency** (nhất quán sau cùng): một thay đổi vừa ghi ở chỗ này cần thời gian để lan tới mọi máy chủ của KMS. Với grant, thường là dưới vài giây, đôi khi tới vài phút. Trong khoảng đó, nếu request của bạn rơi vào một máy chủ chưa biết về grant mới thì nhận `AccessDenied`. **GrantToken** là một chuỗi đại diện cho grant vừa tạo; kèm nó vào lời gọi (`--grant-tokens`) thì KMS chấp nhận quyền của grant **ngay lập tức**, không phải chờ lan truyền. Sau khi grant đã lan đủ thì không cần token nữa.

**Xoá grant: retire hay revoke?** Cả hai đều xoá grant và kết quả giống hệt nhau. Khác nhau ở chỗ **ai được gọi**:

| | **RetireGrant** | **RevokeGrant** |
|--|-----------------|-----------------|
| Ai gọi | Bên **được ghi trong chính grant**: retiring principal, hoặc grantee nếu grant có thao tác `RetireGrant` | Bất kỳ ai có quyền `kms:RevokeGrant` qua key policy/IAM, thường là **key admin** |
| Ý nghĩa | "Tôi dùng xong rồi, tự trả lại quyền" | "Tôi thu hồi quyền của anh" |

**Vì sao dịch vụ AWS dùng grant.** Khi bạn attach một EBS volume đã mã hoá vào EC2, EC2 cần giải mã data key của volume đó, và chỉ volume đó. EC2 thay mặt bạn tạo một grant hẹp trên key, dùng xong (detach volume) thì tự retire. Với hàng nghìn volume được gắn/tháo mỗi ngày, làm việc này bằng cách sửa key policy là bất khả thi. RDS, Lambda, Redshift cũng theo mẫu này. Đó là lý do key policy mặc định do console tạo có sẵn statement cho phép `kms:CreateGrant` kèm điều kiện `kms:GrantIsForAWSResource = true`, nghĩa là chỉ dịch vụ AWS mới được tạo grant thay bạn.

> Bẫy thi: *"cấp quyền dùng khoá tạm thời / theo từng tài nguyên mà không sửa key policy"* → **grant**. *"cần dùng quyền ngay sau khi tạo grant, tránh lỗi AccessDenied chập chờn"* → **grant token**.

### 2.6 Key rotation

**Rotation là gì.** Thay key material (chuỗi bit bí mật) bằng một cái mới, để nếu material cũ bị lộ thì lượng dữ liệu bị ảnh hưởng có giới hạn. Nhiều tiêu chuẩn compliance bắt buộc xoay khoá định kỳ.

**Cơ chế — vì sao xoay khoá mà app không phải sửa gì.** Một KMS key là cái vỏ có ID/ARN/alias/policy cố định, bên trong chứa **nhiều phiên bản key material**. Khi rotate:

```
Trước rotate:   KMS key 1234abcd  →  [material v1 = current]
Sau rotate:     KMS key 1234abcd  →  [material v1 (giữ lại)] [material v2 = current]

Encrypt / GenerateDataKey  → luôn dùng material CURRENT (v2)
Decrypt                    → KMS đọc metadata gắn trong ciphertext, tự chọn đúng v1 hoặc v2
```

Mỗi ciphertext do KMS tạo ra đều mang kèm metadata cho biết nó được mã hoá bằng key nào và phiên bản material nào. Vì vậy lúc giải mã bạn không cần (và không thể) chỉ định phiên bản; KMS tự chọn. Key ID, ARN, alias, policy **không đổi**, nên app và các dịch vụ AWS tiếp tục chạy mà không sửa dòng code nào. KMS giữ mọi material cũ cho tới khi chính KMS key bị xoá.

**Lưu ý:** Rotation KHÔNG re-encrypt data cũ. Data cũ (chính xác là các data key cũ) vẫn nằm dưới key material cũ và vẫn giải mã được bình thường. Nếu muốn dữ liệu cũ chuyển sang material mới thì phải gọi `ReEncrypt` thủ công. Hệ quả: rotation **không cứu** được một data key đã lộ, nó chỉ giới hạn thiệt hại cho dữ liệu ghi về sau.

**Các kiểu rotation theo loại khoá:**

- **AWS-managed key**: AWS tự rotate mỗi **1 năm**, không tắt và không chỉnh được. (Trước tháng 5/2022 là 3 năm; tài liệu ôn thi cũ có thể còn ghi con số này.)
- **CMK auto-rotation**: tắt theo mặc định, bạn tự bật. Chu kỳ mặc định **365 ngày**, chỉnh được trong khoảng **90 đến 2.560 ngày** (khoảng 7 năm). Chỉ áp dụng cho khoá **đối xứng có material do KMS sinh**.
- **On-demand rotation**: gọi `RotateKeyOnDemand` để xoay **ngay lập tức**, độc lập với lịch tự động. Giới hạn 25 lần cho mỗi key. Dùng khi nghi lộ khoá hoặc cần chứng minh với auditor.
- **Manual rotation**: tạo CMK mới + update alias + re-encrypt data cũ (cần `kms:ReEncrypt*`). Đây là cách duy nhất cho khoá **bất đối xứng**, khoá **HMAC** và khoá trong **custom key store**. Vì key ID đổi nên app phải tham chiếu qua **alias** thì mới không phải sửa code.
- **Imported key**: KHÔNG auto-rotate. Muốn xoay thì bạn tự sinh material mới, import vào, rồi kích hoạt on-demand rotation (hoặc làm manual rotation như trên).

Về chi phí: mỗi lần rotate thêm một phiên bản material phải lưu, KMS tính thêm $1/tháng cho lần rotate thứ nhất và thứ hai, **từ lần thứ ba trở đi không tính thêm**. Tức một key rotate nhiều năm tốn tối đa $3/tháng.

> Đề thi SAA-C03 quen dùng phát biểu *"auto-rotation của customer managed key là mỗi năm một lần"*. Con số đó nay là **mặc định**, không còn là giá trị duy nhất. Nếu đề hỏi *"cần rotate mỗi 90 ngày, ít công vận hành nhất"* thì đáp án là bật auto-rotation với chu kỳ tuỳ chỉnh; tài liệu cũ sẽ đáp là viết Lambda làm manual rotation.

### 2.7 Cross-account & Cross-region

**Cross-account.** Account A giữ CMK, app chạy ở account B cần giải mã. Phải mở **hai cánh cửa**, vì mỗi account tự quyết định phần của mình:

1. Key policy account A allow account B principal. Đây là A nói "tôi cho B dùng khoá của tôi".
2. IAM policy account B allow `kms:Decrypt` trên key A. Đây là B nói "tôi cho role này của tôi được dùng khoá bên ngoài đó".

Thiếu cửa nào cũng `AccessDenied`. Lý do cần cửa thứ hai: nếu key policy của A ghi principal là `arn:aws:iam::B:root`, thì A mới chỉ uỷ quyền cho *account* B (đúng cơ chế ở §2.4), còn role cụ thể nào trong B được dùng là do admin của B quyết bằng IAM policy. Lời gọi phải chỉ key bằng **ARN đầy đủ** (alias trần không dùng được cho key ở account khác). Request cross-account tính phí và tính quota cho **account gọi** (B), không phải account giữ khoá.

Nhắc lại bẫy ở §2.3: AWS managed key không sửa được key policy nên **không bao giờ dùng cross-account được**.

**Cross-region:**

- Default KMS key **regional** — gọi từ region khác = fail. Mỗi key sinh ra và ở lại trong đúng một region; key material không rời region đó. Hai key tạo ở hai region là hai key **khác hẳn nhau**, kể cả khi bạn đặt cùng alias.

Thử một kịch bản DR để thấy vấn đề. App ở Singapore mã hoá phía client (envelope encryption tự làm) rồi ghi vào DynamoDB Global Table, bảng tự nhân bản sang Tokyo:

```
Singapore:  app gọi GenerateDataKey trên key K-sgp → lưu [ciphertext + data key đã mã hoá bởi K-sgp]
            DynamoDB nhân bản nguyên bản ghi đó sang Tokyo

Tokyo:      app đọc bản ghi, cần giải mã data key
   Key thường:  K-tyo là key khác, material khác → không mở được data key do K-sgp mã hoá.
                Cách duy nhất: từ Tokyo gọi ngược về KMS ở Singapore
                → thêm độ trễ liên region, và nếu Singapore sập (đúng lúc cần DR) thì KHÔNG giải mã được.
   Multi-Region Key:  replica ở Tokyo có CÙNG key material → giải mã tại chỗ, không phụ thuộc Singapore.
```

- **Multi-Region Key (2021+)**: tạo replica key ở region khác, **cùng key material** và cùng key ID (bắt đầu bằng `mrk-`), decrypt ciphertext của nhau. Một bộ gồm một **primary** và các **replica**; rotation chỉ bật trên primary và KMS tự đồng bộ material mới sang các replica.
- Use case: DynamoDB Global Tables, S3 CRR, Aurora Global.

Ba điều cần nhớ để không hiểu quá tay về Multi-Region Key:

- **Không phải khoá "global".** Bạn phải tự replicate vào từng region. Mỗi replica là một KMS key đầy đủ với **key policy, grant, alias riêng**, không tự đồng bộ, và tính $1/tháng mỗi cái.
- **Phải quyết định lúc tạo key.** Không chuyển được một key single-region có sẵn thành multi-region; muốn thế phải tạo key mới và mã hoá lại dữ liệu.
- **Lợi ích lớn nhất là cho client-side encryption.** Với mã hoá phía server, phần lớn dịch vụ vẫn coi multi-region key như key thường: S3 CRR vẫn giải mã rồi mã hoá lại data key bằng key của region đích, kể cả khi hai bên là primary/replica của nhau. Đề thi thường gộp chung thành *"dữ liệu mã hoá ở region này cần giải mã ở region khác mà không gọi KMS liên region"* → Multi-Region Key.

AWS khuyến nghị mặc định vẫn dùng key single-region (cô lập theo region là một tính năng bảo mật), chỉ dùng multi-region khi thật sự có nhu cầu trên.

### 2.8 Tích hợp với service

Mọi dịch vụ dưới đây đều làm envelope encryption (§2.2) thay bạn: dịch vụ xin KMS một data key, mã hoá dữ liệu bằng data key đó, rồi lưu data key đã mã hoá cạnh dữ liệu. Khác nhau ở chỗ **bao lâu thì dịch vụ gọi KMS một lần**, và điều đó quyết định hoá đơn KMS.

- **EBS, RDS** dùng **một data key cho cả volume/instance**, giải mã một lần lúc attach/khởi động rồi giữ trong bộ nhớ. Số lần gọi KMS gần như không đáng kể.
- **S3 SSE-KMS** mặc định dùng **một data key riêng cho mỗi object**. Mỗi `PUT` là một lần `GenerateDataKey`, mỗi `GET` là một lần `Decrypt`. Bucket nhiều request thì số lần gọi KMS tăng theo đúng số request.

**S3 Bucket Key — bớt một tầng gọi KMS.** Khi bật, S3 xin KMS một **khoá cấp bucket có thời hạn ngắn** rồi giữ tạm trong S3. Trong thời hạn đó, S3 tự dùng khoá cấp bucket này để tạo data key cho từng object mới, **không cần gọi KMS nữa**. Hết hạn thì S3 xin khoá mới. (AWS không công bố thời hạn cụ thể; chỉ nói là "short-lived".) Chuỗi khoá thành ba tầng thay vì hai:

```
Không Bucket Key:  CMK → data key của từng object                   (1 lần gọi KMS / request)
Có Bucket Key:     CMK → bucket key (giữ tạm trong S3) → data key   (1 lần gọi KMS / mỗi lần S3 cần bucket key mới)
```

Tính thử cho một bucket nhận 1 triệu PUT và 5 triệu GET mỗi ngày (giá us-east-1, $0.03 mỗi 10.000 request):

```
PUT:  1.000.000 × 30 ngày =  30.000.000 request → 30.000.000 ÷ 10.000 × $0,03 = $90/tháng
GET:  5.000.000 × 30 ngày = 150.000.000 request → 150.000.000 ÷ 10.000 × $0,03 = $450/tháng
Tổng không Bucket Key:                                                          = $540/tháng
Bật Bucket Key, giảm tối đa 99%:                              $540 × 1%         ≈ $5,40/tháng
```

"Tới 99%" là mức tối đa AWS công bố. Mức thực tế phụ thuộc số **requester** khác nhau: S3 lấy bucket key riêng ít nhất một lần cho mỗi requester (role hoặc account khác nhau tính là requester khác nhau), nên ít role gọi dồn dập vào cùng bucket thì tiết kiệm nhiều nhất.

Bucket Key còn giúp tránh **throttling**. KMS giới hạn tổng số thao tác mã hoá đối xứng của cả account trong một region: mặc định **10.000 request/giây**, một số region là 20.000 (trong đó có Singapore), và 100.000 ở us-east-1, us-west-2, eu-west-1. Request do S3 gọi thay bạn cũng tính vào đây. Một job phân tích đọc 15.000 object/giây từ bucket SSE-KMS ở region 10.000 sẽ bị `ThrottlingException`; bật Bucket Key thì gần như toàn bộ số gọi đó biến mất.

Ba thay đổi kéo theo khi bật Bucket Key: CloudTrail của KMS ghi **ARN của bucket** thay vì ARN từng object và có ít event hơn; policy nào đang dùng encryption context là ARN object thì phải sửa thành ARN bucket; và object **đã có sẵn** không tự hưởng, phải `CopyObject` lại.

| Service | KMS pattern |
|---------|-------------|
| **S3 SSE-KMS** | Mỗi PUT call KMS. Bật **Bucket Key** để giảm tới ~99% call (S3 giữ tạm một khoá cấp bucket ngắn hạn và tự sinh data key cho object từ đó). |
| **EBS** | Volume encrypt với CMK. Snapshot inherit. Copy snapshot có thể re-encrypt với key khác. |
| **RDS** | Encrypt at rest bật khi create, **không bật được sau** (workaround: snapshot → copy encrypted → restore). |
| **Secrets Manager** | Mỗi secret 1 CMK (hoặc default `aws/secretsmanager`). |
| **Lambda env vars** | Mặc định AWS-managed. CMK cho compliance. |
| **CloudTrail logs** | Encrypt CloudTrail log file với CMK. |
| **DynamoDB** | At-rest default AWS-owned; CMK option. |

Vì sao RDS (và EBS) **không bật mã hoá sau khi tạo được**: mã hoá diễn ra ở tầng storage, mọi block trên đĩa đều phải được ghi ra dưới dạng đã mã hoá. Không có thao tác "mã hoá tại chỗ" cho dữ liệu đang nằm đó, nên cách duy nhất là ghi lại toàn bộ dữ liệu sang một storage mới có mã hoá. Đó chính là chuỗi *snapshot → copy snapshot (bật encryption, chọn key) → restore thành instance mới → trỏ app sang*. Cùng lý do, read replica của một instance chưa mã hoá cũng không mã hoá được.

> Bẫy thi: *"hoá đơn KMS tăng vọt / bị throttle KMS sau khi bật SSE-KMS cho bucket nhiều request"* → bật **S3 Bucket Key**. *"mã hoá một RDS/EBS đang chạy mà chưa mã hoá"* → **snapshot → copy có mã hoá → restore**.

### 2.9 Key deletion
- **Schedule deletion**: min **7 ngày**, max 30 ngày waiting period.
- Trong period: key disabled, không dùng được, **có thể cancel deletion**.
- Sau period: **PERMANENT** — data encrypted bằng key → mất vĩnh viễn = **crypto-shred**.
- Đây là feature (compliance GDPR right-to-be-forgotten), không phải bug.

> Key không dùng được **không làm tài nguyên đang chạy chết ngay**. Một EBS volume đang attach vẫn đọc/ghi bình thường, vì EC2 đang giữ data key đã giải mã trong phần cứng Nitro và không cần hỏi lại KMS. Chỉ tới lần cần giải mã data key kế tiếp (detach rồi attach lại, restore snapshot) mới thất bại. Vì vậy "xoá key xong thấy hệ thống vẫn chạy" **không** chứng minh là key không còn được dùng. Nếu chưa chắc, hãy **disable** key thay vì xoá: disable bật lại được, xoá thì không.

### 2.10 Asymmetric keys + Signing
Khoá **đối xứng** (mọi thứ từ đầu bài tới đây) dùng cùng một bí mật để mã hoá và giải mã, nên bên nào cần mã hoá cũng phải gọi được KMS. Khoá **bất đối xứng** là một cặp: **public key** phát công khai được, ai cũng dùng nó để mã hoá hoặc kiểm chữ ký; **private key** giữ kín, dùng để giải mã hoặc ký. Nhờ vậy một bên **không có AWS account** vẫn làm việc được với khoá của bạn.

- KMS hỗ trợ RSA, ECC keys cho encrypt/decrypt + sign/verify.
- Use case: JWT signing, code signing, document sign.
- Không export private key — sign call qua KMS. Public key thì tải về được (`GetPublicKey`) và dùng ngoài AWS.
- Giới hạn cần biết: không auto-rotation (§2.6), request đắt hơn khoá đối xứng (~$0.15 so với $0.03 mỗi 10.000 request), và RSA chỉ mã hoá trực tiếp được vài trăm byte (190 byte với RSA-2048 dùng OAEP-SHA-256).

### 2.11 CloudHSM vs KMS

Cả hai đều giữ khoá trong HSM (định nghĩa ở §2.1). Khác biệt gốc là **ai dùng chung phần cứng với bạn và ai điều khiển nó**:

- **KMS** là dịch vụ **multi-tenant**: dàn HSM do AWS vận hành, phục vụ khoá của mọi khách hàng (khoá được cô lập bằng mật mã và phân quyền, nhưng không tách phần cứng). Bạn không đụng tới HSM, chỉ gọi API của AWS. AWS lo sẵn sàng, backup, scale.
- **CloudHSM** cho bạn các HSM **single-tenant** đặt trong VPC của bạn: chỉ mình bạn truy cập được, AWS không có quyền thấy khoá hay thao tác trên khoá. Đổi lại bạn tự quản user của HSM, tự dựng cụm cho HA (khuyến nghị tối thiểu 2 HSM ở 2 AZ), và nếu làm mất thông tin đăng nhập thì AWS **không** khôi phục khoá giúp được.

Ba thuật ngữ trong bảng dưới:

- **FIPS 140** là tiêu chuẩn của chính phủ Mỹ để chứng nhận module mật mã, có 4 cấp. **Level 3** yêu cầu phần cứng chống cạy phá (phát hiện xâm nhập thì xoá khoá) và xác thực theo danh tính người vận hành. FIPS 140-3 là phiên bản kế nhiệm của 140-2.
- **PKCS#11, JCE, KSP/CNG** là các **giao diện lập trình chuẩn của ngành** để phần mềm nói chuyện với HSM: PKCS#11 cho C/C++, JCE cho Java, KSP/CNG cho Windows. Phần mềm có sẵn như Oracle TDE, máy chủ CA của Windows, hay webserver cần offload TLS thường chỉ biết nói các giao diện này chứ không biết gọi KMS API. Đó là lý do kỹ thuật thứ hai (bên cạnh compliance) để chọn CloudHSM.
- **Custom key store** (§2.3) là điểm giữa: gọi bằng KMS API, nhưng key material nằm trong cụm CloudHSM của bạn.

| | KMS | CloudHSM |
|--|-----|----------|
| Multi-tenant | ✓ | ✗ (dedicated) |
| FIPS 140-2 | Level 3 (HSM-backed); HSM hiện tại đã lên FIPS 140-3 Level 3 | Level 3 (loại `hsm2m.medium`: FIPS 140-3 Level 3) |
| Bạn quản key material | Partial (CMK) | Full |
| API | AWS API | PKCS#11, JCE, KSP/CNG |
| Use case | Hầu hết workload | Compliance bắt buộc dedicated HSM (PCI-DSS Level 1, banking) |
| Cost | $1/key/tháng | ~$1,000/HSM/tháng |

Con số "$1,000/HSM/tháng" là mức đề thi và tài liệu hay làm tròn. Tính theo mức ~$1.60/HSM/giờ (us-east-1) mà trang giá KMS dùng làm ví dụ:

```
1 HSM:                 $1,60 × 730 giờ ≈ $1.168/tháng
Cụm tối thiểu cho HA:  2 HSM            ≈ $2.336/tháng   (trả cả khi không có request nào)
So với KMS:            $1/key/tháng + $0,03 mỗi 10.000 request
```

> Bẫy thi: vì KMS cũng đã đạt Level 3, câu hỏi chỉ nêu *"FIPS 140-2 Level 3"* **chưa đủ** để chọn CloudHSM. Từ khoá quyết định là *"dedicated / single-tenant HSM"*, *"toàn quyền kiểm soát khoá, AWS không truy cập được"*, hoặc *"ứng dụng dùng PKCS#11/JCE"*. Nếu đề thêm *"nhưng vẫn muốn tích hợp với S3/EBS/RDS"* → **KMS Custom Key Store**.

---

## 3. Hands-on

### Lab 1 — Tạo CMK + encrypt small data (10 phút)
```bash
KEY_ID=$(aws kms create-key --description "learn-cmk" \
  --tags TagKey=Project,TagValue=aws-learner \
  --query 'KeyMetadata.KeyId' --output text)
aws kms create-alias --alias-name alias/learn-key --target-key-id $KEY_ID

# Encrypt 4KB max
aws kms encrypt --key-id $KEY_ID --plaintext "hello secret" \
  --query CiphertextBlob --output text | base64 -d > /tmp/ct

aws kms decrypt --ciphertext-blob fileb:///tmp/ct \
  --query Plaintext --output text | base64 -d
```

### Lab 2 — Envelope encryption code (Python)
```python
import boto3, base64
kms = boto3.client('kms')

# Generate data key
r = kms.generate_data_key(KeyId='alias/learn-key', KeySpec='AES_256')
data_key = r['Plaintext']  # use locally
ciphertext_data_key = r['CiphertextBlob']  # store with data

# Use data_key with AES-GCM to encrypt large file (e.g. cryptography lib)
# Store: ciphertext_data_key + ciphertext

# Decrypt
data_key_back = kms.decrypt(CiphertextBlob=ciphertext_data_key)['Plaintext']
# decrypt local data with data_key_back
```

### Lab 3 — S3 SSE-KMS + Bucket Key (5 phút)
```bash
aws s3api put-bucket-encryption --bucket $BUCKET \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "alias/learn-key"
      },
      "BucketKeyEnabled": true
    }]
  }'
```

### Lab 4 — Cross-region replication với Multi-Region Key
1. Tạo primary key region A. Key phải được tạo là multi-region ngay từ đầu (`aws kms create-key --multi-region`); key của Lab 1 là single-region nên **không** replicate được.
2. Replicate sang region B:
   ```bash
   aws kms replicate-key --key-id $KEY_ID --replica-region us-east-1
   ```
3. S3 bucket A SSE-KMS + replicate sang bucket B. Bucket B dùng replica key → decrypt được. (S3 vẫn mã hoá lại data key bằng key của region đích trong lúc replicate, xem §2.7; role replication cần `kms:Decrypt` trên key nguồn và `kms:Encrypt` trên key đích.)

### Lab 5 — Schedule deletion + cancel
```bash
aws kms schedule-key-deletion --key-id $KEY_ID --pending-window-in-days 7
# Đổi ý:
aws kms cancel-key-deletion --key-id $KEY_ID
```

---

## 4. Tự kiểm tra

1. Bucket S3 SSE-KMS có Bucket Key. App PUT 1M object/ngày. Mỗi PUT có gọi KMS không?
   <details><summary>Đáp án</summary>**Không phải mỗi PUT** — khi bật Bucket Key, S3 xin KMS một khoá cấp bucket có thời hạn ngắn, giữ tạm trong S3 và tự sinh data key cho từng object từ đó, giảm tới ~99% KMS call. S3 chỉ gọi lại KMS khi cần bucket key mới (hết hạn, hoặc có requester khác). Phép tính: 1M PUT/ngày = 30M request/tháng ≈ $90/tháng nếu không có Bucket Key, còn khoảng $0.90 nếu giảm được 99% (xem §2.8).</details>

2. EBS volume encrypted với CMK X. Bạn xóa CMK X (đợi 7 ngày). Volume có còn dùng được không?
   <details><summary>Đáp án</summary>**Không** — data trên volume crypto-shred. Snapshot cũng không restore được. Đây là feature (right-to-be-forgotten). Chi tiết dễ nhầm: nếu volume **đang attach**, nó vẫn chạy tiếp cho tới khi detach/stop instance, vì data key đã giải mã đang nằm trong phần cứng Nitro; lần attach kế tiếp mới thất bại (§2.9).</details>

3. KMS key policy trống. IAM user có `kms:*` full Admin. Decrypt được không?
   <details><summary>Đáp án</summary>**Không** — KMS yêu cầu **key policy** allow. IAM policy không override. Đây là khác biệt lớn so S3. Cụ thể: key policy không có statement uỷ quyền cho account (`...:root`) thì mọi IAM `Allow` trên key đều vô hiệu, và key policy cũng không nêu đích danh user này (§2.4).</details>

4. Cross-account: account A có CMK. App account B muốn decrypt. Setup gì?
   <details><summary>Đáp án</summary>(1) Key policy A allow B principal. (2) IAM policy B allow `kms:Decrypt` + `kms:DescribeKey` trên ARN key A.</details>

5. RDS instance tạo unencrypted, giờ muốn encrypt. Làm sao?
   <details><summary>Đáp án</summary>**Không bật trực tiếp được**. Snapshot → copy snapshot với encryption + KMS key → restore from encrypted snapshot. Có downtime hoặc dùng read replica chuyển sang.</details>

6. Lambda function ở 2 region. Encrypt env vars với 1 CMK. Có hoạt động không?
   <details><summary>Đáp án</summary>**Không** với key regional. Cần **Multi-Region Key** replicate sang region thứ 2. Hoặc dùng 2 key riêng.</details>

7. 3rd-party vendor cần encrypt data gửi cho bạn. Họ không có AWS account. Pattern?
   <details><summary>Đáp án</summary>**Imported CMK (BYOK)** — bạn tạo material, share với vendor, họ encrypt local; hoặc dùng KMS asymmetric public key (export public, vendor encrypt với public, bạn decrypt). Cách thứ hai sạch hơn vì không phải trao bí mật nào cho vendor: public key lộ ra cũng không giải mã được gì (§2.10).</details>

8. Compliance PCI-DSS Level 1 bắt buộc dedicated HSM. KMS đủ không?
   <details><summary>Đáp án</summary>Đa số đủ (KMS FIPS 140-2 Level 3, HSM hiện tại là FIPS 140-3 Level 3). Nếu auditor bắt buộc dedicated HSM tách biệt → **CloudHSM** hoặc **KMS Custom Key Store** (backed by CloudHSM).</details>

---

## 5. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| KMS | **Cloud KMS** |
| CMK | **Key (CryptoKey)** trong KeyRing |
| AWS-managed key | **Google-managed key** (default) |
| Imported (BYOK) | **Imported key version** |
| Custom Key Store | **External Key Manager (EKM)** + Cloud HSM |
| Multi-Region Key | **Multi-region location** key (auto-replicate) |
| Key Policy | IAM binding trên key resource |
| Grants | **không có equivalent** — dùng IAM với conditions |
| Envelope encryption | Same — `EncryptDataKey` flow |
| KMS asymmetric | **Cloud KMS asymmetric** (RSA, ECC) |
| CloudHSM | **Cloud HSM** |
| Rotation | Auto rotate (tự config period) |

**Bẫy từ GCP qua AWS:**
1. **GCP IAM duy nhất** kiểm quyền key. AWS có **Key Policy + IAM** — key policy là chính, IAM không override.
2. **GCP keys multi-region built-in** chỉ chọn location. AWS phải **explicit replicate** Multi-Region Key.
3. **GCP key destruction** 24h waiting (default). AWS **min 7 ngày**.
4. **GCP không có "grants"** — quyền tạm thời qua **Conditional IAM** (expires).

---

## 6. Lưu ý SAA-C03

- **Key Policy bắt buộc** allow — IAM không cứu được.
- **Root trong key policy** — chính statement này cho phép IAM policy có hiệu lực; nếu thiếu, key có thể thành không quản lý được (phải nhờ AWS Support).
- **Multi-Region Key** cho cross-region replication.
- **Bucket Key** giảm 99% KMS cost cho S3.
- **Imported key** không auto-rotate.
- **Auto-rotation của CMK**: mặc định 1 năm (chỉnh được 90–2.560 ngày); rotation không re-encrypt data cũ.
- **AWS managed key** (`aws/ebs`…) không share cross-account được → copy snapshot với customer managed key.
- **Crypto-shred** = xóa key = mất data.
- **CloudHSM** chỉ khi compliance bắt buộc dedicated HSM.
- **Custom Key Store** = KMS API + CloudHSM backing.
- KMS API quota có limit per region (mặc định 10.000 request/giây cho thao tác mã hoá đối xứng, tới 100.000 ở vài region lớn; request S3/EBS gọi thay bạn cũng tính) — workload vượt mức đó cần xin tăng hoặc Bucket Key.

## 7. Lưu ý khi đi làm

### Best practice
- **1 CMK per workload/data classification** (PII, PHI, billing, logs…) — không 1 key dùng chung mọi thứ.
- **Alias** thay vì KeyId — alias trỏ sang key mới được (cần cho manual rotation), KeyId thì cố định.
- **Auto-rotation ON** cho mọi CMK trừ legacy bắt buộc material cố định.
- **Key policy giới hạn theo `kms:ViaService`** để chỉ cho phép service dùng key:
  ```json
  "Condition": {
    "StringEquals": { "kms:ViaService": "s3.ap-southeast-1.amazonaws.com" }
  }
  ```
- **CloudTrail data events** cho KMS để audit decrypt call.
- **Tag key** với `DataClassification=PII` etc.

### Anti-pattern
- ✗ Bỏ statement root khỏi key policy → IAM mất tác dụng, key dễ thành không quản lý được.
- ✗ Schedule key deletion mà còn data dùng key đó → crypto-shred prod.
- ✗ Cross-account chỉ sửa key policy quên IAM bên kia.
- ✗ Mua CloudHSM khi KMS đủ ($1k/tháng vs $1/key).
- ✗ Không bật Bucket Key cho S3 SSE-KMS workload lớn → cost vọt.

---

## 8. Foundations
Chưa cần. Bài 15 (DB) sẽ dùng concept consistency để giải thích tại sao replicate key đa region khác replicate data.

## 9. Flashcard
- **Envelope encryption** — CMK encrypt data key, data key encrypt data.
- **CMK** — $1/key/tháng + API calls.
- **Key policy bắt buộc**, IAM không override.
- **Root trong policy** — bật IAM policy cho key + chống key thành không quản lý được.
- **Grants** — temp quyền, không sửa key policy.
- **Multi-Region Key** — replicate cùng material cross-region.
- **Bucket Key** — giảm 99% KMS call cho S3 SSE-KMS.
- **Crypto-shred** — xóa key = xóa data.
- **Schedule deletion** — min 7 ngày.
- **CloudHSM** — dedicated, $1k/tháng.
- **Custom Key Store** — KMS API + CloudHSM backing.
- **kms:ViaService** — restrict key chỉ cho service cụ thể.
- **Imported key** không auto-rotate.
- **Rotation** — đổi key material, giữ nguyên key ID; mặc định 365 ngày, chỉnh 90–2.560 ngày; không re-encrypt data cũ.
- **Encrypt trực tiếp** — tối đa 4 KB; lớn hơn thì envelope encryption.
- **GrantToken** — dùng quyền của grant ngay, không chờ eventual consistency.
- **STS regional endpoint** ưu tiên.
