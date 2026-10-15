# SAA Ch4.2 — Storage Cost Optimization

> Mục tiêu: Cắt storage bill bằng đúng tier (S3 class, Glacier), lifecycle automation, EBS right-sizing, snapshot cleanup, và pattern data tiering không mất truy cập.

Tiền đề: [[ch2-02-storage-performance]], CLF [[05-s3]].

> Mọi giá trong bài là giá niêm yết **us-east-1**, làm tròn, dùng để so sánh tương quan. Đề thi không hỏi con số giá chính xác — nó hỏi bạn biết **cái gì rẻ hơn cái gì, đổi lại mất gì**. Để phép tính dễ theo dõi, bài coi 1 TB = 1.000 GB và dùng giá S3 Standard bậc đầu ($0.023/GB) cho mọi dung lượng (thực tế từ TB thứ 51 trở đi còn $0.022).

---

## 1. Câu chuyện mở đầu — "Bucket 500TB Standard, đọc 1 lần/năm"

Audit một bucket: 500 TB nằm hết ở S3 Standard. Access pattern: 99% object **không bao giờ được đọc lại sau 30 ngày**, 1% còn lại được đọc 1–2 lần/năm.

Tiền lưu trữ S3 tính rất đơn giản: **số GB × giá mỗi GB-tháng của tầng (storage class) đang chứa nó**. Cùng 500 TB đó, đặt ở bốn tầng khác nhau thì ra bốn hoá đơn khác nhau:

```
500 TB = 500.000 GB

Tất cả ở Standard             : 500.000 × $0.023   = $11.500 / tháng   ← hiện tại
Tất cả ở Standard-IA          : 500.000 × $0.0125  =  $6.250 / tháng
Tất cả ở Glacier Instant      : 500.000 × $0.004   =  $2.000 / tháng
Tất cả ở Glacier Deep Archive : 500.000 × $0.00099 =    $495 / tháng
```

Ba dòng dưới là hoá đơn **nếu toàn bộ dữ liệu nằm ở tầng đó**, không phải cộng dồn. Thực tế bucket luôn có dữ liệu mới đổ vào, nên sau khi bật lifecycle (quy tắc tự chuyển tầng theo tuổi object — §3) dữ liệu sẽ rải ra nhiều tầng. Giả sử phân bố theo tuổi như sau:

```
 20 TB mới hơn 30 ngày   → Standard        :  20.000 × $0.023   =   $460
 40 TB tuổi 30–90 ngày   → Standard-IA     :  40.000 × $0.0125  =   $500
140 TB tuổi 90–365 ngày  → Glacier Instant : 140.000 × $0.004   =   $560
300 TB cũ hơn 1 năm      → Deep Archive    : 300.000 × $0.00099 =   $297
                                                         Tổng   = $1.817 / tháng

Tiết kiệm: $11.500 − $1.817 = $9.683 / tháng (~84%)
```

Dữ liệu càng già thì phần nằm ở Deep Archive càng lớn, hoá đơn càng tiến về mức ~$500.

Có một khoản **trả một lần** dễ bị quên: mỗi lần lifecycle chuyển một object sang tầng khác là một *transition request*, tính tiền theo **số object** chứ không theo GB. Nếu 500 TB đó gồm 100 triệu object (trung bình 5 MB/object) và mỗi object đi qua đủ ba bước:

```
100.000.000 object ÷ 1.000 × ($0.01 + $0.02 + $0.05) = $8.000   (một lần)
                              └ sang IA  └ sang GIR  └ sang Deep Archive
```

$8.000 hoàn vốn trong chưa đầy một tháng tiết kiệm, nên vẫn rất đáng làm. Nhưng nếu cùng 500 TB đó là 10 tỷ object 50 KB thì phí chuyển tầng gấp 100 lần — đó là lý do §3.2 nói kỹ về object nhỏ.

→ Storage cost = **đặt đúng tầng × dung lượng**, cộng thêm **chi phí di chuyển** giữa các tầng. Lifecycle policy là công cụ chính.

---

## 2. S3 storage classes — bảng đầy đủ

Mọi storage class của S3 đều có cùng độ bền (durability) 99,999999999% — không class nào "dễ mất dữ liệu hơn". Chúng khác nhau ở chỗ **AWS giảm giá lưu trữ, đổi lại bạn chịu thêm một hay nhiều điều kiện** bên dưới. Hiểu bốn điều kiện này trước, rồi bảng tổng hợp ở §2.4 mới đọc được.

### 2.1 Bốn khoản "đổi lại" khi chọn tầng rẻ

**Retrieval fee (phí lấy dữ liệu).** Tầng rẻ tính thêm tiền **mỗi GB bạn đọc ra**, ngoài phí request GET thông thường. Standard không có khoản này. Standard-IA tính $0.01/GB, nên phép so sánh với Standard là:

```
Standard     : $0.023  / GB-tháng, đọc bao nhiêu cũng không thêm phí theo GB
Standard-IA  : $0.0125 / GB-tháng + $0.01 cho mỗi GB đọc ra

Chênh lệch tiền lưu: $0.023 − $0.0125 = $0.0105 / GB-tháng
→ chỉ cần đọc lại toàn bộ dữ liệu hơn ~1 lần/tháng ($0.0105 ÷ $0.01 ≈ 1,05) là IA đắt hơn Standard
```

Đó là nghĩa cụ thể của chữ "infrequent access": **đọc dưới một lần mỗi tháng**.

**Minimum storage duration (thời gian lưu tối thiểu).** Tầng rẻ tính tiền mỗi object **ít nhất N ngày**, dù bạn xoá, ghi đè hay chuyển nó đi sớm hơn. Object ở Standard-IA (tối thiểu 30 ngày) bị xoá sau 10 ngày vẫn bị tính đủ 30 ngày. Tầng càng lạnh N càng dài: 30 ngày cho hai tầng IA, 90 ngày cho Glacier Instant và Glacier Flexible, 180 ngày cho Deep Archive. Hệ quả: dữ liệu sống ngắn (file tạm, log giữ 7 ngày) đặt vào tầng lạnh là lỗ.

**Minimum billable object size (kích thước tính tiền tối thiểu).** Ở Standard-IA, One Zone-IA và Glacier Instant, object nhỏ hơn 128 KB vẫn **bị tính tiền như thể nó nặng 128 KB**. Ví dụ 1 triệu file 10 KB:

```
Dung lượng thật        : 1.000.000 × 10 KB  ≈  10 GB
Ở Standard             : 10 GB  × $0.023    = $0.23 / tháng
Ở Standard-IA (tính 128 KB/object):
                         1.000.000 × 128 KB ≈ 128 GB × $0.0125 = $1.60 / tháng   ← đắt gấp ~7 lần
```

Glacier Flexible và Deep Archive không có mức 128 KB, nhưng mỗi object bị cộng thêm **40 KB metadata** (8 KB tính giá Standard để S3 vẫn liệt kê được tên object, 32 KB tính giá Glacier cho chỉ mục). Với 1 triệu file 10 KB, riêng 8 KB × 1 triệu = 8 GB giá Standard đã là $0.18/tháng — gần bằng để nguyên ở Standard ($0.23), chưa kể $50 phí chuyển tầng. Kết luận chung: **object nhỏ không hợp với tầng lạnh**; muốn archive thì gom nhiều file nhỏ thành một file lớn (tar/zip) trước.

**Restore (khôi phục) — chỉ với Glacier Flexible và Deep Archive.** Object ở hai tầng này ở trạng thái *archived*: gọi `GET` sẽ lỗi, không đọc trực tiếp được. Phải gửi lệnh `RestoreObject`, chờ S3 dựng một **bản sao tạm** của object (vài phút tới 48 giờ tuỳ gói — §10), rồi mới đọc được bản sao đó. Bản sao tạm tồn tại trong số ngày bạn chỉ định và bị tính giá Standard trong thời gian đó; object gốc vẫn nằm nguyên ở Glacier. Vì vậy cột Availability của hai tầng này ghi "sau khi restore".

### 2.2 Từng class đổi cái gì

- **Standard** — mặc định, không có điều kiện nào ở trên. Dùng cho dữ liệu đọc nhiều hơn một lần/tháng.
- **Standard-IA** — giá lưu gần bằng một nửa Standard, đọc vẫn tính bằng mili-giây như Standard. Đổi lại: retrieval fee, tối thiểu 30 ngày, tối thiểu 128 KB.
- **One Zone-IA** — giống Standard-IA nhưng dữ liệu chỉ nằm trong **một AZ** thay vì ít nhất ba, nên rẻ hơn thêm 20%. Nguyên nhân rẻ cũng là rủi ro: AZ đó bị phá huỷ thì mất dữ liệu. Chỉ dùng cho thứ tái tạo được (thumbnail, bản sao thứ hai của backup).
- **Glacier Instant Retrieval** — giá lưu bằng khoảng 1/6 Standard, **vẫn đọc ngay bằng mili-giây, không cần restore**. Đổi lại: retrieval fee cao gấp ba IA ($0.03/GB), tối thiểu 90 ngày. Hợp với dữ liệu đọc khoảng một lần mỗi quý nhưng khi cần thì phải có ngay (hồ sơ y tế, ảnh cũ của người dùng).
- **Glacier Flexible Retrieval** — rẻ hơn Glacier Instant một chút (~10%), nhưng **phải restore**, chờ từ vài phút tới 12 giờ. Điểm mạnh là gói restore Bulk **miễn phí**, nên hợp với backup lớn mà khi cần lấy lại thì chờ được vài giờ.
- **Glacier Deep Archive** — rẻ nhất, khoảng 1/23 giá Standard. Phải restore, chờ 12–48 giờ, tối thiểu 180 ngày. Dành cho dữ liệu giữ 7–10 năm vì quy định và gần như không bao giờ đọc.
- **Intelligent-Tiering** — không phải một mức giá mà là một cơ chế: S3 theo dõi từng object và tự chuyển nó giữa các mức giá tương đương các class trên. Không có retrieval fee và không có thời gian lưu tối thiểu; đổi lại trả phí giám sát theo số object. Chi tiết ở §4.

### 2.3 Vì sao AWS bán rẻ được

Tầng lạnh rẻ vì AWS đặt dữ liệu trên phần cứng chậm hơn và mật độ cao hơn, với giả định bạn hiếm khi đọc. Retrieval fee, thời gian lưu tối thiểu và kích thước tối thiểu là cách AWS **buộc giả định đó đúng**: ai dùng tầng lạnh như tầng nóng sẽ trả nhiều hơn Standard. Khi làm bài thi, câu hỏi "class nào tiết kiệm nhất" luôn phải trả lời kèm tần suất đọc và thời gian lưu trong đề.

### 2.4 Bảng tổng hợp

| Class | Giá lưu / GB-tháng | Phí lấy dữ liệu | Thời gian lưu tối thiểu | Kích thước tính tiền tối thiểu | Availability (thiết kế) |
|-------|--------------------|-----------------|--------------------------|--------------------------------|--------------------------|
| **Standard** | $0.023 | Không, đọc ngay (ms) | — | — | 99.99% |
| **Intelligent-Tiering** | $0.023 (Frequent) → $0.0125 (Infrequent) → $0.004 (Archive Instant) → $0.0036 (Archive, tuỳ chọn) → $0.00099 (Deep Archive, tuỳ chọn) | Không; thay bằng phí giám sát theo object | — | — (object < 128 KB không được chuyển tầng) | 99.9% |
| **Standard-IA** | $0.0125 | $0.01/GB, đọc ngay (ms) | 30 ngày | 128 KB | 99.9% |
| **One Zone-IA** | $0.01 | $0.01/GB, đọc ngay (ms) | 30 ngày | 128 KB | 99.5% (1 AZ) |
| **Glacier Instant Retrieval** | $0.004 | $0.03/GB, đọc ngay (ms) | 90 ngày | 128 KB | 99.9% |
| **Glacier Flexible Retrieval** | $0.0036 | Phải restore: $0.03/GB (Expedited), $0.01/GB (Standard), miễn phí (Bulk) | 90 ngày | — (+40 KB metadata/object) | 99.99% (sau khi restore) |
| **Glacier Deep Archive** | $0.00099 | Phải restore: $0.02/GB (Standard), $0.0025/GB (Bulk) | 180 ngày | — (+40 KB metadata/object) | 99.99% (sau khi restore) |

### Quy tắc chọn

| Pattern | Class |
|---------|-------|
| Nóng, đọc thường xuyên (hơn 1 lần/tháng) | Standard |
| Lẫn lộn nóng và lạnh, không biết trước pattern | Intelligent-Tiering |
| Biết chắc lạnh (sau 30 ngày ít đọc), cần đọc ngay khi cần | Standard-IA |
| Bản sao phụ, tái tạo được, không quan trọng | One Zone-IA |
| Archive nhưng đôi khi phải có ngay (ms) | Glacier Instant |
| Archive, chờ vài phút tới vài giờ được | Glacier Flexible |
| Lưu dài hạn vì compliance, chờ 12–48 giờ được | Glacier Deep Archive |

> Bẫy thi: đề nói *"truy cập ngay lập tức / millisecond"* thì loại Glacier Flexible và Deep Archive, dù chúng rẻ nhất. Đề nói *"dữ liệu tái tạo được"* thì One Zone-IA là đáp án tiết kiệm hơn Standard-IA.

---

## 3. Lifecycle policies

**Lifecycle policy** là bộ quy tắc gắn vào bucket để S3 **tự chuyển object sang tầng khác hoặc tự xoá** khi object đủ một số tuổi, tính bằng ngày kể từ lúc object được tạo. Bạn không viết cron job nào; S3 quét và thực hiện mỗi ngày.

### 3.1 Cấu trúc

```json
{
  "Rules": [{
    "ID": "ArchiveOldLogs",
    "Filter": { "Prefix": "logs/" },
    "Status": "Enabled",
    "Transitions": [
      { "Days": 30, "StorageClass": "STANDARD_IA" },
      { "Days": 90, "StorageClass": "GLACIER_IR" },
      { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
    ],
    "Expiration": { "Days": 2555 }
  }]
}
```

Đọc rule này: chỉ áp dụng cho object có key bắt đầu bằng `logs/` (`Filter`). Mỗi `Days` là **tuổi của object**, không phải thời gian nằm ở tầng trước: object tròn 30 ngày tuổi thì sang Standard-IA, tròn 90 ngày tuổi sang Glacier Instant, tròn 365 ngày tuổi sang Deep Archive, và tròn 2.555 ngày (7 năm) thì bị xoá (`Expiration`). Chuyển tầng chỉ đi **một chiều từ nóng xuống lạnh**; lifecycle không kéo object ngược lên Standard.

### 3.2 Chú ý
- **Min storage duration**: nếu xóa/transition object trước duration min của class hiện tại → **pay full duration**. Ví dụ object Standard-IA xóa sau 10 ngày → pay 30 ngày.
- **Phí giám sát theo object của Intelligent-Tiering.** Nếu rule chuyển object sang Intelligent-Tiering, mỗi object từ 128 KB trở lên bị tính phí giám sát hằng tháng (§4).
- **Mỗi lần chuyển tầng là một request tính tiền**, theo số object chứ không theo dung lượng. Giá mỗi 1.000 object tăng dần theo độ lạnh của tầng đích:

  | Chuyển vào | Phí / 1.000 object |
  |------------|--------------------|
  | Standard-IA, One Zone-IA, Intelligent-Tiering | $0.01 |
  | Glacier Instant Retrieval | $0.02 |
  | Glacier Flexible Retrieval | $0.03 |
  | Glacier Deep Archive | $0.05 |

  ```
  10 triệu object → Deep Archive:  10.000.000 ÷ 1.000 × $0.05 = $500 (một lần)

  Nếu mỗi object 100 MB (tổng 1.000 TB): tiết kiệm ~$22.000/tháng → $500 không đáng kể
  Nếu mỗi object 10 KB  (tổng 100 GB)  : tiền lưu ở Standard chỉ $2.30/tháng → $500 không bao giờ hoàn vốn
  ```

  Vì lý do này, từ tháng 9/2024 lifecycle **mặc định không chuyển object nhỏ hơn 128 KB** sang bất kỳ tầng nào; muốn chuyển phải tự thêm bộ lọc kích thước vào rule. Đề thi và tài liệu cũ thường mô tả hành vi trước đó: object nhỏ vẫn bị chuyển sang IA và bị tính như 128 KB — cả hai cách nói đều dẫn tới cùng kết luận là **đừng chuyển object nhỏ xuống tầng lạnh**.
- **Non-current versions cần rule riêng.** *Versioning* là tính năng của bucket: khi bật, mỗi lần ghi đè hay xoá một object, S3 giữ lại bản cũ thay vì bỏ đi. Bản mới nhất gọi là *current version*, các bản cũ là *non-current versions*. Rule `Transitions`/`Expiration` thông thường chỉ tác động lên current version; các bản cũ cần khai báo riêng bằng `NoncurrentVersionTransition` và `NoncurrentVersionExpiration`. Quên bước này thì bản cũ tích tụ mãi và vẫn tính giá Standard (§6.1).
- **Multipart upload dở dang.** File lớn được tải lên theo từng phần (*multipart upload*). Nếu upload bị ngắt giữa chừng, các phần đã lên **vẫn nằm trong bucket và bị tính tiền**, nhưng không hiện ra khi liệt kê object. Thêm action `AbortIncompleteMultipartUpload` vào lifecycle để S3 tự dọn sau N ngày.

### 3.3 Pattern lifecycle phổ biến

**Log/audit** — giữ 7 năm vì quy định, càng cũ càng ít ai đọc. Các mốc dưới đây là **tuổi của object** và khớp với rule JSON ở §3.1:

| Tuổi object | Nằm ở | Lý do |
|-------------|-------|-------|
| 0 → 30 ngày | Standard | Đang được query để debug, điều tra sự cố |
| 30 → 90 ngày | Standard-IA | Thỉnh thoảng tra lại, vẫn cần đọc ngay |
| 90 → 365 ngày | Glacier Instant Retrieval | Hiếm khi đọc, nhưng audit hỏi thì phải có ngay |
| 365 ngày → 7 năm | Glacier Deep Archive | Chỉ giữ cho đủ quy định; chờ 12–48 giờ được |
| Sau 7 năm | Xoá (expire) | Hết nghĩa vụ lưu |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời object S3 theo tuổi: chuyển tầng để giảm chi phí</title>
  <desc>Timeline ngang theo tuổi object log/audit. Standard từ 0 đến 30 ngày, Standard-IA tại 30 ngày, Glacier Instant tại 90 ngày, Deep Archive tại 365 ngày, rồi expire. Càng về cuối chi phí lưu trữ càng giảm nhưng thời gian lấy lại càng tăng.</desc>
  <text x="16" y="24" font-size="14.5" font-weight="700" fill="currentColor">Lifecycle log/audit — chuyển tầng theo tuổi object</text>
  <line x1="30" y1="70" x2="690" y2="70" stroke="currentColor" stroke-opacity="0.45"/>
  <polygon points="690,70 680,65 680,75" fill="currentColor" fill-opacity="0.6"/>
  <text x="30" y="58" font-size="11" fill="currentColor" opacity="0.7">0d</text>
  <text x="190" y="58" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">30d</text>
  <text x="350" y="58" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">90d</text>
  <text x="510" y="58" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">365d</text>
  <text x="660" y="58" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">7y</text>
  <g>
    <rect x="30" y="86" width="150" height="58" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <line x1="30" y1="70" x2="30" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="105" y="110" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Standard</text>
    <text x="105" y="128" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">đọc tức thì · giá cao nhất</text>
  </g>
  <g>
    <rect x="190" y="86" width="150" height="58" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <line x1="190" y1="70" x2="190" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="265" y="110" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Standard-IA</text>
    <text x="265" y="128" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">đọc ms · phí retrieval</text>
  </g>
  <g>
    <rect x="350" y="86" width="150" height="58" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <line x1="350" y1="70" x2="350" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="425" y="110" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Glacier Instant</text>
    <text x="425" y="128" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">đọc ms · giá thấp</text>
  </g>
  <g>
    <rect x="510" y="86" width="150" height="58" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <line x1="510" y1="70" x2="510" y2="86" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="585" y="110" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Deep Archive</text>
    <text x="585" y="128" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">restore 12-48h · rẻ nhất</text>
  </g>
  <g fill="currentColor" fill-opacity="0.55">
    <polygon points="180,115 192,109 192,121"/>
    <polygon points="340,115 352,109 352,121"/>
    <polygon points="500,115 512,109 512,121"/>
  </g>
  <g transform="translate(660,86)">
    <text x="6" y="34" font-size="11" font-weight="700" fill="currentColor" opacity="0.7">expire</text>
    <text x="6" y="50" font-size="10" fill="currentColor" opacity="0.55">(xóa)</text>
  </g>
  <text x="30" y="216" font-size="11.5" font-weight="700" fill="currentColor">Chi phí lưu trữ / GB</text>
  <rect x="30" y="226" width="660" height="14" rx="7" fill="#10b981" fill-opacity="0.18"/>
  <text x="40" y="237" font-size="10.5" fill="currentColor" opacity="0.75">cao</text>
  <text x="680" y="237" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.75">rất thấp</text>
  <polygon points="30,233 680,228 680,238 30,238" fill="#10b981" fill-opacity="0.22"/>
  <text x="30" y="270" font-size="11.5" font-weight="700" fill="currentColor">Thời gian lấy lại (retrieval)</text>
  <rect x="30" y="280" width="660" height="14" rx="7" fill="#f59e0b" fill-opacity="0.16"/>
  <text x="40" y="291" font-size="10.5" fill="currentColor" opacity="0.75">tức thì</text>
  <text x="680" y="291" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.75">hàng giờ-ngày</text>
  <polygon points="30,288 680,283 680,293 30,293" fill="#f59e0b" fill-opacity="0.22"/>
</svg>

Tính thử tiền lưu **1 GB log trong suốt 7 năm** (84 tháng) theo hai cách:

```
Để nguyên Standard:   84 tháng × $0.023                              = $1.932

Theo lifecycle trên:   1 tháng × $0.023   (Standard)                 = $0.023
                       2 tháng × $0.0125  (Standard-IA)              = $0.025
                       9 tháng × $0.004   (Glacier Instant)          = $0.036
                      72 tháng × $0.00099 (Deep Archive)             = $0.071
                                                              Tổng   = $0.155

→ rẻ hơn ~92%. Với 1 TB log: $155 thay vì $1.932 cho cả 7 năm.
```

Nếu audit không bao giờ cần đọc ngay, có thể thay Glacier Instant bằng Glacier Flexible (rẻ hơn chút, restore Bulk miễn phí). Khi đề viết trống không "chuyển sang Glacier" mà không nói loại nào, hãy đọc yêu cầu thời gian lấy lại: cần mili-giây là Instant, chờ được vài giờ là Flexible, chờ được nửa ngày trở lên là Deep Archive.

**User upload** (ảnh, tài liệu người dùng tải lên):
- Năm đầu còn được xem thường xuyên: Standard.
- Sau đó: Standard-IA nếu biết chắc ít ai mở lại, hoặc Intelligent-Tiering nếu không đoán được file nào sẽ được mở lại.
- Xoá sau N năm theo chính sách lưu trữ (retention) của sản phẩm.

**Backup**: gần như không đọc lại, nên đưa thẳng lên Glacier ngay từ lúc tải lên (ghi trực tiếp với storage class `GLACIER` hoặc `DEEP_ARCHIVE`, không cần đi qua Standard), rồi để lifecycle xoá khi hết hạn giữ. Chọn Flexible hay Deep Archive theo thời gian khôi phục chấp nhận được.

---

## 4. S3 Intelligent-Tiering deep

**Nó là gì.** Lifecycle ở §3 chuyển tầng theo **tuổi** object, tức là bạn phải biết trước "sau 30 ngày thì không ai đọc nữa". Khi không biết — ví dụ kho ảnh mà tấm nào cũng có thể bất ngờ được mở lại — Intelligent-Tiering giải quyết bằng cách chuyển tầng theo **lần truy cập gần nhất của từng object**. S3 ghi nhận mỗi object được đọc lần cuối khi nào và tự di chuyển nó giữa các *access tier* bên trong cùng một storage class:

- **Frequent Access**: nơi object nằm khi mới vào hoặc vừa được đọc. Giá bằng Standard.
- **Infrequent Access**: object không được đọc **30 ngày liên tiếp** thì xuống đây. Giá bằng Standard-IA.
- **Archive Instant Access**: không được đọc **90 ngày liên tiếp** thì xuống đây. Giá bằng Glacier Instant, vẫn đọc ngay bằng mili-giây.
- **Archive Access (tuỳ chọn, phải bật)**: sau tối thiểu 90 ngày không đọc. Giá bằng Glacier Flexible, và giống Glacier Flexible là **phải restore** mới đọc được.
- **Deep Archive Access (tuỳ chọn, phải bật)**: sau tối thiểu 180 ngày không đọc. Giá bằng Deep Archive, **phải restore**.

Ba tầng đầu là tự động và đều đọc được ngay. Khi một object ở tầng Infrequent hay Archive Instant được đọc, S3 **đưa nó về Frequent Access** và đồng hồ đếm lại từ đầu. Khác với việc tự đặt object vào Standard-IA, ở đây **không có retrieval fee và không có thời gian lưu tối thiểu** — đoán sai không bị phạt. Hai tầng tuỳ chọn chỉ nên bật khi ứng dụng chịu được việc chờ restore.

**Cái giá: phí giám sát.** S3 thu **$0.0025 cho mỗi 1.000 object mỗi tháng** để theo dõi. Phí tính theo **số object**, không theo dung lượng, nên object càng nhỏ thì phí càng nặng so với tiền tiết kiệm được.

**Object nhỏ hơn 128 KB** là trường hợp riêng: S3 **không giám sát** chúng, nên **không thu phí giám sát**, nhưng cũng **không bao giờ chuyển tầng** — chúng nằm mãi ở Frequent Access với giá Standard. Tức là đưa object nhỏ vào Intelligent-Tiering thì không lỗ thêm mà cũng không lãi gì.

**Tính thử** với 1 triệu object, giả sử 80% trong số đó nguội đi và xuống tầng Infrequent:

```
Phí giám sát: 1.000.000 ÷ 1.000 × $0.0025 = $2.50 / tháng   (không đổi theo kích thước)

a) Mỗi object 1 MB  (tổng 1.000 GB, ở Standard là $23.00/tháng)
   Tiết kiệm: 800 GB × ($0.023 − $0.0125) = $8.40
   Lãi ròng : $8.40 − $2.50 = +$5.90 / tháng        → đáng dùng, và lãi hơn nữa khi xuống Archive Instant

b) Mỗi object 200 KB (tổng 200 GB, ở Standard là $4.60/tháng)
   Tiết kiệm: 160 GB × $0.0105 = $1.68
   Lãi ròng : $1.68 − $2.50 = −$0.82 / tháng        → phí giám sát lớn hơn tiền tiết kiệm

c) Mỗi object 50 KB  (tổng 50 GB)
   Không giám sát, không phí, không chuyển tầng     → vẫn $1.15/tháng như Standard
```

Điểm hoà vốn nằm ở khoảng **240 KB/object** nếu object chỉ xuống tới tầng Infrequent ($0.0000025 ÷ $0.0105 mỗi GB), và khoảng 130 KB nếu nó xuống tới Archive Instant. Vùng lỗ thật sự là các object **chỉ nhỉnh hơn 128 KB một chút**: đủ lớn để bị thu phí, quá nhỏ để tiền tiết kiệm bù lại.

> Khi nào dùng: access pattern không dự đoán được hoặc thay đổi theo thời gian, object phần lớn từ vài trăm KB trở lên. Không cần tối ưu thủ công.

> Khi nào KHÔNG dùng: (1) đã biết chắc pattern — lifecycle theo tuổi rẻ hơn vì không mất phí giám sát; (2) bucket phần lớn là object nhỏ — dưới 128 KB thì không tiết kiệm được gì, còn loại chỉ hơi lớn hơn 128 KB thì phí giám sát cao hơn tiền tiết kiệm.

---

## 5. S3 storage analytics

Khi chưa biết nên đặt mốc lifecycle ở bao nhiêu ngày, đừng đoán — để S3 đo hộ.

- Bật **Storage Class Analysis** trên bucket (hoặc một prefix/tag). S3 quan sát xem object ở từng độ tuổi còn được đọc nhiều hay ít.
- Sau khoảng 30 ngày quan sát trở lên, nó cho thấy dữ liệu từ độ tuổi nào thì gần như không còn ai đọc, tức là mốc hợp lý để chuyển **từ Standard sang Standard-IA**. Công cụ này chỉ phân tích cho cặp Standard / Standard-IA, không gợi ý mốc cho Glacier.
- Chi phí: khoảng $0.10 cho mỗi 1 triệu object được theo dõi mỗi tháng.
- Use case: thiết kế lifecycle dựa trên dữ liệu thay vì đoán. Khác với Intelligent-Tiering ở chỗ nó **chỉ báo cáo**, không tự chuyển object.

---

## 6. S3 cost saving tactics

### 6.1 Versioning cost trap
- Mỗi version là một object tính tiền **đủ kích thước**. File 1 GB bị ghi đè 10 lần trong bucket bật versioning chiếm 11 GB tính tiền, dù bạn chỉ nhìn thấy một file.
- Xoá object trong bucket bật versioning cũng không giải phóng gì: S3 chỉ đặt một *delete marker* lên trên, mọi bản cũ vẫn nằm đó.
- Non-current versions vì vậy tích tụ âm thầm và bill tăng dần.
- **Lifecycle rule cho non-current**: khai báo riêng việc chuyển tầng hoặc xoá bản cũ (ví dụ giữ 3 bản gần nhất, xoá bản cũ hơn 90 ngày).

### 6.2 Replication cost
*Replication* là tính năng S3 tự sao chép object sang bucket khác: **CRR** (Cross-Region Replication) sao sang Region khác, thường để DR hoặc đưa dữ liệu gần người dùng; **SRR** (Same-Region Replication) sao trong cùng Region, thường để gom log hoặc tách tài khoản.

- Bạn trả ba khoản: tiền lưu trữ ở bucket đích (tức là lưu hai lần), phí request PUT cho mỗi object được sao, và với CRR thêm phí truyền dữ liệu giữa hai Region (~$0.02/GB từ us-east-1).
- **Replication Time Control (RTC)**: tuỳ chọn có SLA để phần lớn object được sao xong trong vòng 15 phút. Tính thêm phí theo GB; chỉ bật khi có yêu cầu RPO cụ thể.
- Bản sao được phép nằm ở storage class khác bản gốc. Nếu bản sao chỉ để DR và không phục vụ traffic thật, đặt nó ở One Zone-IA hoặc một tầng Glacier để không trả giá Standard hai lần.

### 6.3 Multipart upload cleanup
- Upload hỏng giữa chừng thì các phần đã tải lên vẫn bị tính tiền (§3.2). Đặt lifecycle abort sau 7 ngày.

### 6.4 Empty bucket vẫn có cost
- Bucket trống hoặc gần trống nhưng bật nhiều lifecycle/inventory vẫn phát sinh một khoản phí nhỏ.

### 6.5 Request cost
- PUT/COPY/POST/LIST: $0.005 / 1000 (Standard).
- GET: $0.0004 / 1000.
- Rất nhiều object tí hon thì request cost vượt storage cost. Ví dụ app ghi 1 triệu file 5 KB mỗi ngày:

  ```
  Request : 1.000.000 PUT ÷ 1.000 × $0.005 = $5 / ngày  ≈ $150 / tháng
  Storage : 5 GB/ngày → sau 30 ngày là 150 GB × $0.023  ≈ $3.45 / tháng

  Gom 1.000 file thành 1 object trước khi ghi:
            1.000 PUT/ngày ÷ 1.000 × $0.005 × 30        ≈ $0.15 / tháng
  ```

  Cách xử lý vì vậy là **giảm số request**: gom lô (batch) nhiều bản ghi vào một object, nén, hoặc đẩy qua Data Firehose để nó gom hộ.

---

## 7. EBS cost optimization

**EBS** là ổ đĩa mạng gắn vào EC2. Khác S3 ở một điểm quyết định mọi thứ trong phần này: S3 tính tiền theo dung lượng **đang dùng**, còn EBS tính theo dung lượng **đã cấp** (provisioned). Volume 500 GB chỉ chứa 50 GB dữ liệu vẫn trả đủ 500 GB, kể cả khi instance đã tắt.

Hai thuật ngữ dùng suốt phần này: **IOPS** là số thao tác đọc/ghi đĩa mỗi giây (database giao dịch cần nhiều IOPS); **throughput** là số MB đọc/ghi mỗi giây (xử lý file lớn cần throughput). Các loại volume SSD hay gặp:

| Loại | Là gì | Giá |
|------|-------|-----|
| **gp2** | SSD đa dụng thế hệ cũ. IOPS **gắn với dung lượng**: 3 IOPS mỗi GB, muốn thêm IOPS phải mua thêm GB | ~$0.10/GB-tháng |
| **gp3** | SSD đa dụng thế hệ hiện tại. Luôn có sẵn 3.000 IOPS và 125 MiB/s bất kể dung lượng; cần hơn thì mua thêm riêng | ~$0.08/GB-tháng, +$0.005 mỗi IOPS vượt 3.000 |
| **io2** (Block Express) | SSD cho workload cần IOPS rất cao và độ trễ dưới 1 mili-giây ổn định; trả tiền cho từng IOPS đã cấp | ~$0.125/GB-tháng + ~$0.065 mỗi IOPS |

### 7.1 Right-size volume
- Cấp nhiều hơn dùng? EBS **chỉ cho tăng dung lượng, không cho giảm**. Muốn thu nhỏ phải tạo volume mới nhỏ hơn, copy dữ liệu sang (hoặc snapshot rồi dựng lại ở mức file), sau đó đổi volume cho instance.
- Chuyển gp2 → gp3: rẻ hơn 20% trên mỗi GB ($0.10 → $0.08) và thường còn nhanh hơn. Volume gp2 500 GB chỉ có 1.500 IOPS (3 × 500) với giá $50/tháng; đổi sang gp3 được 3.000 IOPS với giá $40/tháng. Đổi loại volume làm được trực tiếp khi instance đang chạy, không downtime.

### 7.2 Snapshot cleanup

**Snapshot** là bản chụp một volume EBS tại một thời điểm, AWS lưu trên S3 và tính ~$0.05 cho mỗi GB-tháng dữ liệu snapshot thực chiếm.

**Incremental nghĩa là gì.** Snapshot đầu tiên của một volume là bản **đầy đủ**: chứa mọi block đã có dữ liệu. Các snapshot sau chỉ lưu **những block đã thay đổi** kể từ snapshot trước; phần không đổi thì nó *tham chiếu* tới block đã nằm trong snapshot cũ. Ví dụ theo tài liệu AWS:

```
Snap A (đầu tiên)                : volume có 10 GiB dữ liệu  → lưu 10 GiB
Snap B (4 GiB đã bị sửa)         : chỉ lưu 4 GiB mới, tham chiếu 6 GiB còn lại của A
Snap C (thêm 2 GiB dữ liệu mới)  : chỉ lưu 2 GiB, tham chiếu phần còn lại của A và B
Tổng tính tiền: 10 + 4 + 2 = 16 GiB   (không phải 10 + 10 + 12 = 32 GiB)
```

**Vậy sao bill vẫn "dồn" vượt cả dung lượng volume?** Vì mỗi lần một block bị ghi đè, **phiên bản cũ của block đó vẫn được giữ lại** chừng nào còn snapshot cần tới nó. Giữ càng nhiều snapshot thì càng nhiều phiên bản cũ phải giữ. Volume 1 TB, mỗi ngày thay đổi khoảng 2% (20 GB), giữ 100 snapshot hằng ngày:

```
1.000 GB (bản đầu) + 99 × 20 GB (phần thay đổi mỗi ngày) = 2.980 GB
2.980 GB × $0.05 = $149 / tháng        (volume gp3 gốc chỉ $80 / tháng)
```

**Xoá một snapshot ở giữa chuỗi có làm hỏng các snapshot sau không?** Không. Khi xoá, EBS chỉ bỏ những block **không còn snapshot nào khác tham chiếu**; block nào snapshot sau còn cần thì được giữ lại. Mỗi snapshot còn tồn tại luôn đủ để dựng lại nguyên vẹn volume. Hệ quả ngược lại là xoá một snapshot cũ nhiều khi chỉ giải phóng rất ít dung lượng, vì phần lớn block của nó vẫn đang được snapshot mới dùng. Muốn giảm bill thật sự thì phải **giảm số snapshot đang giữ**, tức là rút ngắn retention.

Công cụ để làm việc đó:
- **Data Lifecycle Manager (DLM)**: dịch vụ đặt lịch chụp snapshot tự động theo tag và **tự xoá** snapshot quá hạn theo retention bạn khai báo (ví dụ giữ 7 bản hằng ngày, 4 bản hằng tuần). Thay cho script tự viết rồi quên dọn.
- **Recycle Bin**: thùng rác cho snapshot và AMI. Bạn đặt *retention rule*; snapshot bị xoá sẽ nằm lại trong thùng rác đủ số ngày đó và khôi phục được nếu xoá nhầm. Lưu ý về chi phí: snapshot nằm trong Recycle Bin **vẫn bị tính tiền** như bình thường cho tới khi hết hạn giữ.
- **AWS Backup vault**: *vault* là "két" chứa các bản backup (recovery point) do AWS Backup tạo ra. Thời hạn giữ được khai trong backup plan, hết hạn thì AWS Backup tự xoá khỏi vault. Dùng khi muốn quản lý retention chung một chỗ cho EBS, RDS, EFS… thay vì cấu hình riêng từng dịch vụ (§11).

### 7.3 Snapshot archive tier (2022+)
- Snapshot hiếm khi cần tới có thể chuyển sang **archive tier**: ~$0.0125/GB-tháng so với $0.05 của tier thường, tức rẻ hơn 75%.
- Đổi lại: muốn dùng phải restore về tier thường trước, mất 24–72 giờ và tốn ~$0.03 cho mỗi GB restore; thời gian lưu tối thiểu là 90 ngày.
- Điểm dễ sai: khi archive, snapshot incremental bị **chuyển thành bản đầy đủ** (vì nó không còn tham chiếu được block của snapshot khác). Nên archive một snapshot incremental nhỏ có thể làm **tăng** chi phí:

  ```
  Snapshot incremental chỉ chiếm 20 GB ở tier thường : 20 GB × $0.05      = $1.00 / tháng
  Archive nó (thành bản đầy đủ 1.000 GB)             : 1.000 GB × $0.0125 = $12.50 / tháng  ← đắt hơn
  Snapshot duy nhất của một volume 1.000 GB          : $50.00 → $12.50 / tháng              ← đúng chỗ
  ```

- Use case: snapshot cuối cùng của một volume đã ngừng dùng, hoặc bản snapshot hằng tháng/hằng năm phải giữ 7 năm vì compliance.

### 7.4 Detached volume cleanup
- Volume đã detach khỏi instance (hoặc còn sót lại sau khi terminate instance) vẫn bị tính đủ tiền theo dung lượng đã cấp.
- Trusted Advisor và Cost Anomaly Detection sẽ cảnh báo các volume không gắn vào đâu. Cách dọn an toàn: chụp một snapshot (rẻ hơn volume) rồi xoá volume.

### 7.5 Right io2 vs gp3
- gp3 đủ cho khoảng 90% workload.
- io2 chỉ đáng tiền khi cần IOPS vượt trần của gp3, hoặc cần độ trễ dưới 1 mili-giây ổn định (io2 Block Express: trung bình dưới 0,5 ms, tối đa 256.000 IOPS, độ bền volume 99,999% so với 99,8–99,9% của gp3).

  > Trần của gp3: đề thi và phần lớn tài liệu dùng **16.000 IOPS và 1.000 MiB/s**. Docs hiện tại đã nâng lên **80.000 IOPS và 2.000 MiB/s** (volume tới 64 TiB). Gặp câu hỏi có con số "trên 16.000 IOPS" thì đáp án đề mong đợi vẫn là io2; ngoài thực tế hãy thử gp3 trước.

- Chuyển io2 → gp3 khi workload không cần tới mức đó. Mức tiết kiệm phụ thuộc số IOPS, vì io2 tính tiền từng IOPS đắt gấp 13 lần gp3:

  ```
  Volume 500 GB, cần 10.000 IOPS

  gp3 : 500 × $0.08  + (10.000 − 3.000) × $0.005 = $40 + $35     = $75.00 / tháng
  io2 : 500 × $0.125 + 10.000 × $0.065           = $62.50 + $650 = $712.50 / tháng
  ```

  Ở ví dụ này gp3 rẻ hơn gần 90%. Với volume cần ít IOPS, chênh lệch thu hẹp về mức vài chục phần trăm.

---

## 8. EFS cost optimization

**EFS** (Elastic File System) là hệ thống file dùng chung qua giao thức NFS: nhiều EC2, container hay Lambda cùng mount một thư mục và đọc/ghi đồng thời. Nó tự co giãn và tính tiền theo dung lượng **đang dùng** như S3, nhưng giá mỗi GB ở tầng nóng cao gấp khoảng 13 lần S3 Standard. Vì vậy với EFS, chuyển file nguội xuống tầng rẻ là việc tiết kiệm nhiều nhất.

### 8.1 Storage class
- **Standard**: tầng nóng trên SSD, độ trễ khoảng 1 ms. ~$0.30/GB-tháng.
- **Infrequent Access (IA)**: ~$0.016/GB-tháng, cộng ~$0.01 cho mỗi GB đọc ra. Dành cho file đọc vài lần mỗi quý. Độ trễ byte đầu tiên lên cỡ vài chục mili-giây.
- **Archive** (ra mắt 2023): ~$0.008/GB-tháng, cộng ~$0.03 cho mỗi GB đọc ra. Dành cho file đọc vài lần mỗi năm hoặc ít hơn.
- **One Zone**: phiên bản file system chỉ nằm trong một AZ, rẻ hơn khoảng một nửa (~$0.16/GB-tháng ở tầng Standard, ~$0.0133 ở tầng IA). Rủi ro giống S3 One Zone-IA: mất AZ là mất dữ liệu.

Khác với Glacier của S3, file ở tầng IA và Archive của EFS **vẫn mở được ngay**, không có bước restore; ứng dụng không cần biết file đang nằm ở tầng nào, chỉ thấy lần đọc đầu chậm hơn và tốn phí đọc.

### 8.2 Lifecycle
Lifecycle management của EFS hoạt động theo **lần truy cập gần nhất** của từng file (giống Intelligent-Tiering, không theo tuổi như lifecycle của S3). Có ba chính sách cho cả file system:

- **Transition into IA**: file không được đọc N ngày thì chuyển sang IA. Mặc định 30 ngày.
- **Transition into Archive**: file không được đọc N ngày thì chuyển sang Archive. Mặc định 90 ngày.
- **Transition into Standard**: có đưa file về lại Standard khi nó được đọc hay không. **Mặc định là không** — file vẫn nằm ở IA/Archive và mỗi lần đọc tốn phí. Chọn *On first access* nếu muốn file được đọc lại thì quay về Standard.

Tính thử với file system 10 TB mà 95% file đã không ai đụng tới hơn 6 tháng:

```
Tất cả ở Standard          : 10.000 GB × $0.30                    = $3.000 / tháng

Bật lifecycle (5% nóng ở Standard, 95% xuống Archive):
                                500 GB × $0.30 + 9.500 GB × $0.008 = $150 + $76 = $226 / tháng
Nếu chỉ xuống tới IA       :    500 GB × $0.30 + 9.500 GB × $0.016 = $150 + $152 = $302 / tháng
```

Giảm hơn 90% mà không sửa dòng code nào. Chỉ cần lưu ý phí đọc: đọc lại 100 GB từ Archive tốn thêm ~$3.

### 8.3 Throughput mode
*Throughput* ở đây là tốc độ đọc/ghi tổng của cả file system, tính bằng MiB mỗi giây. EFS có ba cách cấp và tính tiền cho nó:

| Mode | Tốc độ có được | Trả tiền thế nào | Hợp khi |
|------|----------------|------------------|---------|
| **Elastic** (mặc định từ 2023) | Tự tăng giảm theo nhu cầu, không cần khai báo | Theo **GB thực đọc/ghi**: ~$0.03/GB đọc, ~$0.06/GB ghi | Tải thất thường, phần lớn thời gian rảnh |
| **Bursting** | Tỷ lệ với dung lượng ở tầng Standard: 50 KiB/s cho mỗi GiB, cộng tín dụng burst | Không thêm gì, đã gồm trong tiền lưu trữ | File system lớn, nhu cầu tốc độ tỷ lệ với lượng dữ liệu |
| **Provisioned** | Con số cố định bạn tự đặt, không phụ thuộc dung lượng | ~$6 mỗi MiB/s mỗi tháng cho phần vượt mức Bursting | Tải đều và cao, biết trước con số |

Cách chọn dựa trên hai phép tính:

```
Bursting — file system 100 GiB: 100 × 50 KiB/s ≈ 5 MiB/s liên tục
           → quá chậm cho app cần 50 MiB/s, dù file system "rẻ". Phải đổi sang Elastic/Provisioned.
           File system 1 TiB thì có sẵn 50 MiB/s mà không tốn thêm đồng nào.

Elastic  — tháng đó đọc 10 TB và ghi 1 TB:
           10.000 GB × $0.03 + 1.000 GB × $0.06 = $360
Provisioned 100 MiB/s cả tháng: 100 × $6 = $600, dùng hay không cũng trả
```

Elastic rẻ khi lượng dữ liệu thực sự đi qua thấp so với đỉnh tải (AWS khuyến nghị Elastic khi mức trung bình không quá 5% mức đỉnh). Nếu app đọc/ghi đều đặn cả ngày ở mức cao thì phí theo GB của Elastic cộng dồn lên vượt Provisioned. Bursting là lựa chọn rẻ nhất **nếu** dung lượng lưu trữ đủ lớn để cho ra tốc độ bạn cần; nó tốn kém theo nghĩa gián tiếp khi người ta phải nhồi thêm dữ liệu giả vào file system nhỏ chỉ để có thêm tốc độ.

---

## 9. FSx cost

**FSx** là họ file system được quản lý sẵn, mỗi loại chạy một phần mềm file server quen thuộc. Chọn loại nào là do ứng dụng cần giao thức gì, không phải do giá:

| Loại | Giao thức / đặc điểm | Dùng khi |
|------|----------------------|----------|
| **FSx for Windows File Server** | SMB, tích hợp Active Directory | Ứng dụng Windows, thư mục dùng chung cho nhân viên |
| **FSx for NetApp ONTAP** | NFS + SMB + iSCSI; có dedupe, nén, tự đẩy dữ liệu nguội xuống tầng rẻ | Chuyển hệ NetApp từ on-premises lên, cần nhiều giao thức |
| **FSx for OpenZFS** | NFS; snapshot và nén của ZFS | Chuyển workload Linux/ZFS lên, cần độ trễ thấp |
| **FSx for Lustre** | File system song song cho HPC, tốc độ hàng trăm MB/s mỗi TiB; liên kết được với S3 | Tính toán hiệu năng cao, huấn luyện ML, xử lý media |

Khác EFS, phần lớn FSx tính tiền theo dung lượng và tốc độ **đã cấp**, nên cấp thừa là trả thừa.

### 9.1 FSx for Windows / NetApp / OpenZFS
- Dung lượng lưu trữ và throughput capacity được cấp và tính tiền **riêng nhau**. Right-size từng thứ: nhiều file system được cấp tốc độ cao từ ngày đầu rồi không bao giờ dùng tới.
- **Dedupe** (khử trùng lặp: các khối dữ liệu giống hệt nhau chỉ lưu một lần) trên NetApp ONTAP, cũng có trên Windows File Server. Mức tiết kiệm tuỳ dữ liệu: thư mục home, ổ đĩa máy ảo, bản sao tài liệu thường trùng lặp nhiều nên giảm được một phần đáng kể dung lượng phải trả; dữ liệu đã nén hoặc đã mã hoá thì gần như không giảm.
- **Compression** (nén) giảm thêm dung lượng, đổi lấy một ít CPU của file server.
- Backup của FSx tính tiền theo GB và không tự hết hạn nếu bạn tạo tay — dọn các bản backup quá hạn giữ.

### 9.2 FSx for Lustre
Lustre có hai kiểu triển khai, khác nhau ở chỗ dữ liệu có được sao chép hay không:

- **Persistent**: dữ liệu được nhân bản trong AZ, file server hỏng thì được tự thay trong vài phút và dữ liệu còn nguyên. Dành cho workload chạy lâu dài.
- **Scratch**: dữ liệu **không được nhân bản**, file server hỏng thì dữ liệu trên server đó mất và không được thay. Dành cho xử lý tạm thời. Tài liệu AWS ước tính một file system Scratch 50 TiB chỉ có khoảng 94% khả năng qua được một tuần mà không mất gì.

Giá niêm yết mỗi GB của hai kiểu gần bằng nhau ở mức thấp nhất (~$0.140 cho Scratch, ~$0.145 cho Persistent SSD loại 125 MB/s mỗi TiB), nhưng Scratch cho sẵn 200 MB/s mỗi TiB, còn Persistent phải trả cao hơn để có tốc độ tương đương. Khoản tiết kiệm lớn hơn nhiều đến từ **cách dùng** mà Scratch cho phép: vì dữ liệu vốn tạm bợ, bạn dựng file system khi job bắt đầu và xoá khi job xong.

```
Lustre 10 TB chạy 24/7           : 10.000 GB × $0.14        = $1.400 / tháng
Chỉ dựng khi chạy job (8 giờ × 20 ngày = 160 trên 730 giờ):
                                   $1.400 × 160 ÷ 730       ≈   $307 / tháng
```

- Dữ liệu nguồn và kết quả để ở S3: liên kết file system với bucket để Lustre nạp dữ liệu từ S3 khi cần và xuất kết quả về S3 trước khi xoá file system.
- Đừng để Lustre chạy 24/7 trừ khi workload thật sự chạy hằng ngày; và đừng dùng Scratch cho dữ liệu không tái tạo được.

---

## 10. Glacier vault & deep archive

Phần này nói về chi phí **lấy dữ liệu ra** khỏi hai tầng phải restore (§2.1). Khi gửi lệnh restore bạn chọn một *retrieval tier* — càng nhanh càng đắt.

### 10.1 Retrieval tiers (Glacier Flexible)
- **Expedited**: 1-5 phút, $0.03/GB (cộng $10 cho mỗi 1.000 request). Dành cho vài object cần gấp.
- **Standard**: 3-5 giờ, $0.01/GB.
- **Bulk**: 5-12 giờ, **miễn phí** theo GB. Dành cho lấy lại lượng lớn mà không gấp.

### 10.2 Deep Archive
- **Standard**: trong vòng 12 giờ, $0.02/GB.
- **Bulk**: trong vòng 48 giờ, $0.0025/GB.
- Không có gói Expedited — Deep Archive không bao giờ lấy được trong vài phút.

### 10.3 Restore cost trap
Restore tốn hai khoản, và khoản thứ hai hay bị quên:

```
Restore 100 TB từ Glacier Flexible, gói Standard, giữ bản sao tạm 7 ngày

Phí lấy dữ liệu : 100.000 GB × $0.01                 = $1.000
Bản sao tạm     : 100.000 GB × $0.023 × (7 ÷ 30)     ≈   $537   (giá Standard, trong 7 ngày)
                                               Tổng  ≈ $1.537

Cùng lượng đó:  gói Bulk (chờ 5–12 giờ)  → phí lấy $0, chỉ còn ~$537
                gói Expedited            → phí lấy $3.000
                từ Deep Archive, Standard → phí lấy $2.000
```

- Retrieval fee tính trên **toàn bộ dung lượng restore**, không phải phần bạn thực sự đọc.
- Bản sao tạm bị tính giá Standard trong đúng số ngày bạn ghi trong lệnh restore, **cộng thêm** tiền Glacier của object gốc vẫn đang tính. Đặt số ngày vừa đủ dùng.
- Đừng restore khi không cần; và nếu không gấp, Bulk là lựa chọn mặc định hợp lý.

---

## 11. Backup cost

**AWS Backup** là dịch vụ quản lý backup tập trung: thay vì cấu hình snapshot riêng trong EBS, RDS, EFS, DynamoDB, FSx…, bạn viết một **backup plan** (chụp khi nào, giữ bao lâu, có copy sang Region khác không) và gán tài nguyên vào theo tag. Các bản backup nằm trong **vault** (§7.2).

- **Tập trung hoá** giúp tiết kiệm theo cách gián tiếp: mọi bản backup đều có hạn giữ rõ ràng và tự xoá khi hết hạn, không còn snapshot mồ côi do script cũ để lại.
- **Cold storage**: backup plan có thể chuyển bản backup cũ sang tầng lạnh rẻ hơn sau N ngày, tương tự snapshot archive ở §7.3. Chỉ một số loại tài nguyên hỗ trợ, trong đó có EBS, EFS và DynamoDB (khi bật advanced features). Backup của **RDS, Aurora và FSx không chuyển sang cold storage được** — với chúng chỉ có thể rút ngắn retention.
- **Cross-region copy** nhân đôi tiền lưu trữ (một bản ở mỗi Region) và thêm phí truyền dữ liệu giữa hai Region. Chỉ copy những bản thật sự cần cho DR, ví dụ bản hằng tháng thay vì mọi bản hằng ngày.
- **Audit**: định kỳ liệt kê các bản backup của tài nguyên đã xoá hoặc không còn ai cần, cho hết hạn.

---

## 12. Data transfer cost (storage-related)

Tiền lưu trữ chưa phải toàn bộ hoá đơn; đưa dữ liệu **ra khỏi** nơi lưu cũng tốn. *Egress* là dữ liệu đi ra khỏi AWS hoặc ra khỏi Region. Dữ liệu đi **vào** S3 từ internet thì miễn phí.

- **Egress ra internet**: ~$0.09/GB cho 10 TB đầu mỗi tháng (100 GB đầu miễn phí). Tải xuống 10 TB/tháng là ~$900, có thể lớn hơn cả tiền lưu chính 10 TB đó ($230). App thiên về download thì đây là khoản chính.
- **CloudFront trước S3**: dữ liệu đi từ S3 sang CloudFront không tính phí, và nội dung đã cache ở edge không phải lấy lại từ S3. Tuỳ tỷ lệ cache hit, lượng dữ liệu phải lấy từ origin giảm 50–90%.
- **VPC Gateway endpoint cho S3**: miễn phí. Nếu EC2 trong private subnet đọc S3 qua NAT Gateway thì mỗi GB chịu thêm phí xử lý của NAT (~$0.045/GB); gateway endpoint cho traffic đó đi thẳng tới S3 trong mạng AWS và bỏ được khoản này.
- **S3 Transfer Acceleration**: tăng tốc upload từ xa bằng cách đi qua edge của CloudFront. Tính **thêm** phí theo GB — nó mua tốc độ, không giảm chi phí. Chỉ bật khi thật sự cần.
- **Giữa các Region** (ví dụ CRR): từ us-east-1 là ~$0.02/GB tới hầu hết Region khác (~$0.01/GB tới us-east-2). Mức giá phụ thuộc Region nguồn, một số Region ngoài Mỹ và châu Âu cao hơn đáng kể.

---

## 13. Patterns cost saving cho 3 use case

### 13.1 Log archive 5 năm
- 90 ngày đầu ở Standard (đang được query), sau đó Standard-IA, tròn 1 năm tuổi chuyển sang Glacier Flexible, cuối cùng xuống Deep Archive và giữ tới hết 5 năm.
- Nén và đổi sang định dạng cột (Parquet + Snappy) trước khi upload: dung lượng giảm 70–90%, tức mọi con số giá ở trên cũng giảm theo tỷ lệ đó.
- Athena tính tiền theo lượng dữ liệu quét; query trên Parquet chỉ đọc các cột cần thiết nên quét ít hơn và rẻ hơn.

### 13.2 Backup database daily, retention 30 ngày + monthly retention 1 năm
- AWS Backup plan:
  - Daily snapshot, giữ 30 ngày ở warm storage.
  - Monthly snapshot, giữ 1 năm ở cold storage (với loại tài nguyên hỗ trợ — §11).
  - Cross-region copy chỉ cho bản hằng tháng.
- DLM làm được việc tương tự cho riêng EBS snapshot.

### 13.3 User-generated content (photo upload)
- Standard trong 90 ngày đầu (người dùng còn xem nhiều).
- Sau đó Intelligent-Tiering, hoặc lifecycle xuống Standard-IA rồi Glacier Instant — cả hai đều giữ khả năng đọc ngay, vì ảnh cũ vẫn có thể được mở bất cứ lúc nào.
- CloudFront cache nội dung phổ biến để giảm egress và request tới S3.
- Khử trùng lặp ở tầng ứng dụng (so hash của file) để không lưu hai lần cùng một ảnh.

---

## 14. Cạm bẫy đề thi (SAA)

1. **"Standard-IA luôn rẻ hơn Standard"** → **Sai** nếu đọc nhiều — retrieval fee ($0.01/GB) và thời gian lưu tối thiểu 30 ngày đẩy cost lên; đọc lại dữ liệu hơn ~1 lần/tháng là IA đắt hơn (§2.1).
2. **"Glacier Deep Archive instant retrieval"** → **Sai**, phải restore, 12-48h. Cần đọc ngay thì là Glacier Instant Retrieval.
3. **"Intelligent-Tiering cho mọi object nhỏ"** → **Sai**. Object < 128 KB không được giám sát nên không bao giờ chuyển tầng: không mất phí monitor nhưng cũng không tiết kiệm được gì. Object chỉ hơi lớn hơn 128 KB thì phí monitor lớn hơn tiền tiết kiệm (§4).
4. **"Lifecycle expire object xóa version"** → **Cần rule riêng** cho versioned bucket; rule thường chỉ tác động lên current version (§3.2).
5. **"EBS snapshot không xóa volume = free"** → **Sai**, snapshot tính tiền độc lập với volume, và vẫn tính sau khi volume đã bị xoá.
6. **"gp3 luôn rẻ hơn gp2"** → **Đúng** ở mức cơ bản (rẻ hơn 20% mỗi GB, có sẵn 3.000 IOPS). Khi mua thêm nhiều IOPS/throughput thì chi phí có thể ngang gp2.
7. **"S3 Transfer Acceleration giảm cost"** → **Sai**, tính thêm phí, chỉ tăng tốc độ.
8. **"Bucket trong region rẻ nhất luôn tiết kiệm"** → **Sai**, phí truyền dữ liệu giữa các Region và việc dịch vụ cần dùng có mặt ở Region đó hay không quan trọng hơn chênh lệch giá lưu.

---

## 15. Tóm tắt 1 dòng

> Storage cost = **tier × volume × movement**. Lifecycle policy là tool then-chốt. **Intelligent-Tiering** khi không biết pattern, **explicit lifecycle** khi biết. Cleanup non-current version, multipart, detached EBS, snapshot orphan.

---

## 16. Bài tập tự kiểm tra

1. Bucket 100TB Standard, $2300/tháng. 80% object > 30 ngày không touch. Plan migration & expected saving?
2. Lifecycle rule transition object < 128 KB sang IA tier — vấn đề gì xảy ra?
3. EBS snapshot 100TB volume, 7 daily + 4 weekly + 12 monthly. Bill snapshot quá cao. Optimization?
4. App ghi 1M file 5KB/ngày vào S3. Storage bill thấp nhưng request bill cao. Action?
5. Backup cross-region cho compliance. Cost = 3x storage. Cách giảm?
6. EFS 10TB, 95% file không truy cập 6 tháng+. Setup gì để cost giảm tự động?

> Gợi ý chỗ tìm cách tính: bài 1 làm như §1 (nhân dung lượng từng phần với giá tầng của nó); bài 2 xem §2.1 và §3.2; bài 3 xem §7.2–7.3; bài 4 xem §6.5; bài 5 xem §6.2 và §11; bài 6 xem §8.2.

---

## 17. Đọc thêm

- AWS Whitepaper — *Cost Optimization Pillar*.
- AWS docs — *S3 storage classes*, *Lifecycle*, *EBS snapshot pricing*.
- *S3 Cost Optimization Best Practices*.

---

**Bài tiếp theo**: [[ch4-03-db-network-cost]] — Aurora/DynamoDB cost, data transfer, egress optimization.
