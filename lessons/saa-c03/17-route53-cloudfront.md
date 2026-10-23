# Bài 17 — Route 53 + CloudFront + Global Accelerator

**Foundation:** [[foundations-04-latency-vs-consistency]] — vì sao multi-region khó.

## 1. Mục tiêu
- Thiết kế **edge layer** — lớp nằm giữa người dùng và server của bạn, đặt ở hàng trăm điểm trên thế giới để người dùng ở đâu cũng kết nối tới một điểm gần mình.
- Route 53: 8 routing policy (tài liệu cũ ghi 7, xem §2.3) và pattern health check + failover.
- CloudFront: cache hoạt động thế nào (cache key, TTL), signed URL, OAC.
- Global Accelerator: nó khác CloudFront ở đâu và khi nào dùng.

Ba dịch vụ này trả lời ba câu hỏi khác nhau, và đề thi chủ yếu hỏi bạn phân biệt chúng:

| Dịch vụ | Câu hỏi nó trả lời | Làm việc ở tầng nào |
|---------|--------------------|---------------------|
| **Route 53** | "Tên miền này ứng với **địa chỉ nào**?" | DNS — chỉ trả lời câu hỏi rồi đứng ngoài, traffic không đi qua nó |
| **CloudFront** | "Nội dung này có **bản sao gần người dùng** không?" | HTTP/HTTPS (Layer 7) — traffic đi qua nó, nó đọc được URL, header, cookie |
| **Global Accelerator** | "Làm sao gói tin tới region **nhanh và ổn định** hơn Internet công cộng?" | TCP/UDP (Layer 4) — traffic đi qua nó, nhưng nó không hiểu HTTP |

---

## 2. Route 53

**Route 53** là dịch vụ DNS của AWS. DNS là "danh bạ" của Internet: trình duyệt hỏi `shop.example.com` ở đâu, DNS trả về một địa chỉ IP, rồi trình duyệt tự kết nối tới IP đó. Điểm cần nhớ suốt bài: **Route 53 chỉ trả lời câu hỏi, không chuyển tiếp traffic**. Mọi "routing" của Route 53 thực chất là *chọn trả về IP nào*.

Hệ quả quan trọng nhất: câu trả lời DNS được **cache** lại ở nhiều nơi (trình duyệt, hệ điều hành, DNS của nhà mạng) trong một khoảng thời gian gọi là **TTL** (time to live, tính bằng giây). Trong lúc TTL chưa hết, client vẫn dùng IP cũ — kể cả khi bạn đã đổi record. Đây là lý do failover bằng DNS không bao giờ tức thì (tính cụ thể ở §2.6).

### 2.1 Hosted Zones

**Hosted zone** là "cuốn sổ" chứa mọi record của một tên miền (ví dụ `example.com` và các tên con của nó).

- **Public hosted zone** — trả lời câu hỏi từ Internet. Dùng cho website, API công khai.
- **Private hosted zone (PHZ)** — chỉ trả lời câu hỏi đến từ bên trong một hoặc nhiều VPC mà bạn gắn vào. Dùng cho tên nội bộ như `db.internal.example.com`; người ngoài Internet hỏi sẽ không nhận được gì.
- **Reusable Delegation Set** — mỗi hosted zone được AWS cấp 4 name server (máy chủ trả lời DNS cho zone đó). Bình thường mỗi zone một bộ khác nhau. Reusable delegation set cho phép nhiều zone **dùng chung một bộ 4 name server cố định**, tiện khi bạn quản lý hàng trăm tên miền và không muốn khai báo name server riêng cho từng cái ở nhà đăng ký tên miền.

### 2.2 Records

Các loại record chuẩn của DNS mà Route 53 hỗ trợ: A (tên → IPv4), AAAA (tên → IPv6), CNAME (tên → một tên khác), MX (mail server), NS (name server của zone), SOA, TXT, SRV, CAA, PTR.

**Alias** là loại record riêng của AWS, sinh ra để vá một giới hạn của CNAME.

Giới hạn đó là: chuẩn DNS **cấm đặt CNAME ở apex** — tức tên gốc của zone như `example.com` (không có `www` hay tiền tố nào). Lý do là apex bắt buộc phải có record NS và SOA, mà CNAME lại không được đứng chung với bất kỳ record nào khác cùng tên. Trong khi đó các tài nguyên AWS như ALB hay CloudFront chỉ cho bạn một **tên** (`my-alb-123.us-east-1.elb.amazonaws.com`), không cho IP cố định — nên bạn không thể dùng A record, cũng không thể dùng CNAME ở apex.

Alias giải quyết bằng cách để Route 53 **tự phân giải tên đích ở phía server** rồi trả thẳng IP cho client, y như một A record bình thường. Client không hề biết có bước trung gian.

| | **CNAME** | **Alias** |
|--|-----------|-----------|
| Đặt ở apex (`example.com`) | Không — chuẩn DNS cấm | Được |
| Trỏ tới đâu | Bất kỳ tên miền nào | Chỉ tài nguyên AWS (danh sách dưới) hoặc record khác trong cùng zone |
| Phí query | Tính như query thường: ~$0,40 / 1 triệu query | **Miễn phí** khi trỏ tới tài nguyên AWS |
| TTL | Bạn tự đặt | Không đặt được — Route 53 dùng TTL của đích |

Đích hợp lệ của Alias: CloudFront, ALB/NLB, S3 website endpoint, API Gateway, Elastic Beanstalk environment, VPC interface endpoint, Global Accelerator, và một record khác trong cùng hosted zone.

> Bẫy thi: *"trỏ `example.com` (không có www) vào ALB/CloudFront"* → **Alias**. Đáp án CNAME sai ngay vì apex. Alias cũng **không** trỏ được tới tên DNS của một EC2 instance.

### 2.3 Routing Policies — 8 loại

Một **routing policy** quy định Route 53 chọn câu trả lời nào khi cùng một tên có nhiều record. Docs hiện tại liệt kê **8** policy; nhiều tài liệu ôn thi vẫn ghi "7" vì IP-based mới thêm năm 2022.

Hầu hết policy đi kèm **health check** (§2.5): record nào có health check đang báo unhealthy thì Route 53 loại khỏi danh sách ứng viên trước khi chọn.

**Simple.** Một tên, một record. Nếu record chứa nhiều IP thì Route 53 trả **tất cả** theo thứ tự ngẫu nhiên và client tự chọn một. Không gắn được health check, nên IP chết vẫn bị trả về.

**Weighted.** Mỗi record mang một trọng số; tỉ lệ traffic của record = trọng số của nó ÷ tổng trọng số.

```
Record A (bản cũ):  weight 90
Record B (bản mới): weight 10
→ B nhận 10 ÷ (90 + 10) = 10% số câu trả lời DNS
```

Dùng cho canary deploy hoặc A/B test. Đặt weight 0 thì record đó ngừng nhận traffic mà không cần xoá. Lưu ý tỉ lệ này tính trên *số lượt phân giải DNS*, không phải số request — một resolver của nhà mạng lớn cache một câu trả lời có thể kéo theo hàng nghìn người dùng.

**Latency.** Bạn tạo một record cho mỗi region có triển khai. Route 53 trả record của region có **độ trễ mạng thấp nhất** tính từ vị trí người hỏi. Số liệu độ trễ này do AWS đo sẵn giữa các vùng mạng trên thế giới và các region, không phải đo trực tiếp người dùng đó tại thời điểm đó. Chi tiết so với Geolocation ở §2.4.

**Failover.** Hai record: **primary** và **secondary**. Bình thường luôn trả primary; khi health check của primary báo unhealthy thì trả secondary. Đây là mô hình active-passive dùng cho DR (§2.6).

**Geolocation.** Chọn theo **vị trí địa lý của người hỏi** (châu lục, quốc gia, hoặc bang của Mỹ), suy ra từ IP. Bạn nên tạo thêm một record "Default" cho những IP không xác định được vị trí; thiếu nó thì những người đó nhận về "không có câu trả lời".

**Geoproximity.** Chọn theo **khoảng cách địa lý** giữa người dùng và tài nguyên, kèm một núm chỉnh gọi là **bias**. Bias là số từ −99 tới +99: số dương **nới rộng** vùng địa lý mà một tài nguyên phục vụ, số âm thu hẹp lại. Route 53 tính bằng cách "kéo gần" khoảng cách:

```
Khoảng cách sau bias = khoảng cách thật × (1 − bias/100)

Người dùng cách server A 150 km, cách server B 100 km.
Không bias:        B gần hơn (100 < 150)            → trả B
A đặt bias +50:    150 × (1 − 50/100) = 75 km < 100 → trả A
```

Nhờ đó bạn dịch dần traffic từ region này sang region khác mà không phải vẽ lại ranh giới theo từng quốc gia. Geoproximity gắn liền với **Traffic Flow** — trình soạn policy dạng sơ đồ kéo-thả của Route 53, có bản đồ hiển thị vùng phủ của từng tài nguyên, tính phí ~$50 mỗi policy record mỗi tháng. Đề thi quen dùng "geoproximity = phải qua Traffic Flow"; docs hiện tại cho tạo geoproximity như record thường, chỉ riêng bản đồ là cần Traffic Flow.

**Multivalue answer.** Giống Simple trả nhiều IP, nhưng **mỗi record có health check riêng** và Route 53 chỉ trả tối đa **8 record đang healthy**, chọn ngẫu nhiên. Client nhận được vài IP, cái nào chết thì thử cái khác. Người ta gọi nó là "load balancer của người nghèo" vì nó chia tải thô sơ ở phía client, và docs nói rõ nó **không thay được load balancer** — DNS không biết server nào đang quá tải, và câu trả lời còn bị cache theo TTL.

**IP-based.** Bạn tự khai báo "dải IP (CIDR) này → trả record kia". Dùng khi bạn biết rõ người dùng đến từ dải IP nào, ví dụ khách của một nhà mạng cụ thể phải đi vào endpoint có đường truyền riêng với nhà mạng đó.

| Policy | Chọn câu trả lời theo | Use case | Health check? |
|--------|-----------------------|----------|---------------|
| **Simple** | Không chọn — trả hết, thứ tự ngẫu nhiên | 1 endpoint | Không |
| **Weighted** | Tỉ lệ trọng số | A/B test, canary deploy | ✓ |
| **Latency** | Độ trễ mạng tới region | Multi-region, đưa user tới region nhanh nhất | ✓ |
| **Failover** | Primary còn sống hay không | Primary + secondary (DR) | ✓ |
| **Geolocation** | Quốc gia/châu lục của user | Data residency, nội dung theo nước | ✓ |
| **Geoproximity** | Khoảng cách địa lý + bias | Dịch dần traffic giữa các region (Traffic Flow) | ✓ |
| **Multivalue** | Ngẫu nhiên, tối đa 8 record healthy | Chia tải thô phía client khi không có LB | ✓ |
| **IP-based** (2022) | Dải CIDR của user | Route theo nhà mạng / dải IP biết trước | ✓ |

Về phí: query thường ~$0,40 / 1 triệu, Latency ~$0,60, Geolocation và Geoproximity ~$0,70 (us-east-1, 1 tỷ query đầu mỗi tháng). Với 100 triệu query/tháng đó là $40, $60 hoặc $70 — DNS hiếm khi là khoản đáng kể trong hoá đơn.

> Bẫy thi: Simple và Multivalue đều trả nhiều IP; khác nhau ở chỗ **Multivalue có health check**. Đề nói *"trả nhiều IP nhưng chỉ IP còn sống"* → Multivalue. Đề nói *"chuyển 10% traffic sang bản mới"* → Weighted.

### 2.4 Latency vs Geolocation
- **Latency** = AWS đo network latency từ user → region, route best. **Network reality**.
- **Geolocation** = lookup IP → quốc gia → route. **Compliance** (data GDPR Germany phải vào `eu-central-1`).

→ Đa số app dùng latency. Compliance dùng geolocation.

Hai cái này có thể cho kết quả khác nhau với cùng một người dùng: đường mạng nhanh nhất không phải lúc nào cũng dẫn tới region gần nhất trên bản đồ, nên Latency có thể đưa một người ở Đức sang region ngoài EU nếu đường đó nhanh hơn. Khi luật yêu cầu dữ liệu ở lại trong một nước, chỉ Geolocation mới **đảm bảo** điều đó.

### 2.5 Health Checks

**Health check** là việc Route 53 định kỳ "gõ cửa" endpoint của bạn để biết nó còn sống không; kết quả được dùng để loại record chết khỏi câu trả lời DNS.

**Cơ chế.** Route 53 có một đội **health checker** đặt ở nhiều nơi trên thế giới (8 region), nằm ngoài VPC của bạn và đi qua Internet công cộng. Mỗi checker tự gửi request theo chu kỳ bạn chọn:

- **Chu kỳ:** 30 giây (standard) hoặc 10 giây (fast). Vì có nhiều checker gửi độc lập, với chu kỳ 30 giây endpoint của bạn thực tế nhận khoảng **một request mỗi 2 giây**.
- **Giao thức:** HTTP, HTTPS hoặc TCP. Với HTTP/HTTPS, checker phải mở được kết nối TCP trong 4 giây và nhận về status 2xx/3xx trong 2 giây tiếp theo. Có thể bật thêm *string matching*: tìm một chuỗi trong 5.120 byte đầu của response body.
- **Failure threshold:** số lần liên tiếp phải fail (hoặc pass) thì một checker mới đổi nhận định. Mặc định **3**, chỉnh được từ 1 tới 10.
- **Tổng hợp:** Route 53 coi endpoint là healthy khi **hơn 18%** số checker báo healthy. Ngưỡng thấp như vậy là có chủ đích: một sự cố mạng cục bộ làm vài checker không tới được endpoint thì không được phép kéo sập cả hệ thống.

**Ba kiểu health check:**

- **Endpoint** — kiểu vừa mô tả, trỏ vào IP hoặc domain. Nếu trỏ vào domain thì mỗi lần check Route 53 phải phân giải DNS trước, nên đừng trỏ health check vào chính cái tên mà nó đang bảo vệ — kết quả sẽ khó đoán.
- **Calculated** — không tự kiểm tra gì, chỉ gộp kết quả của các health check con (tới 255 cái) bằng logic AND, OR, hoặc "ít nhất X trong Y cái healthy". Dùng khi "khoẻ" nghĩa là cả web lẫn API lẫn database đều ổn.
- **CloudWatch alarm** — healthy hay không dựa theo trạng thái một alarm. Đây là cách duy nhất để theo dõi **tài nguyên private**: health checker nằm ngoài Internet nên không gõ được vào IP private trong VPC, nhưng bạn có thể cho CloudWatch đo metric bên trong rồi để health check đọc alarm đó.

**Giá** (us-east-1, mỗi health check mỗi tháng): $0,50 nếu endpoint thuộc AWS, $0,75 nếu ngoài AWS. Mỗi tính năng tuỳ chọn — HTTPS, string matching, fast interval, đo latency — cộng thêm $1,00 (endpoint AWS) hoặc $2,00 (ngoài AWS).

```
Check thường, endpoint AWS:           $0,50
+ fast interval (10 giây):            $0,50 + $1,00 = $1,50   (gấp 3 lần)
+ fast interval + HTTPS:              $0,50 + $2,00 = $2,50
Endpoint ngoài AWS + fast interval:   $0,75 + $2,00 = $2,75
```

> Bẫy thi: *"health check cho database / instance trong private subnet"* → không trỏ thẳng được; dùng **CloudWatch alarm + health check kiểu CloudWatch**. Và nhớ mở security group cho dải IP của Route 53 health checker khi check endpoint public.

### 2.6 Failover pattern
```
Primary record  → ALB region us-east-1 (health check ON)
Secondary record → ALB region us-west-2 (health check ON)
```
Khi primary fail → DNS trả secondary.

**Mất bao lâu thì người dùng thật sự sang được secondary?** Có hai khoảng chờ cộng lại: thời gian Route 53 *phát hiện* primary chết, và thời gian câu trả lời cũ còn nằm trong cache của client.

```
Phát hiện  = chu kỳ × failure threshold
Chờ cache  = TTL của record

Standard: 30 giây × 3 + TTL 60 giây = 150 giây  (~2,5 phút)
Fast:     10 giây × 3 + TTL 60 giây =  90 giây  (~1,5 phút)
```

Đó là trường hợp tốt. Một số client và resolver giữ câu trả lời lâu hơn TTL, nên luôn có một phần người dùng bị kẹt ở IP cũ lâu hơn con số trên. Muốn failover nhanh hơn thì hạ TTL (đổi lại client hỏi DNS nhiều hơn), hoặc dùng thứ không phụ thuộc DNS cache — xem Global Accelerator ở §4.

Secondary không nhất thiết phải là một hệ thống đầy đủ. Một pattern rẻ là trỏ secondary vào một trang tĩnh "đang bảo trì" trên S3 + CloudFront.

### 2.7 DNSSEC

**Bài toán.** DNS nguyên thuỷ không có cách nào chứng minh câu trả lời là thật. Kẻ tấn công có thể nhét câu trả lời giả vào cache của một DNS resolver (**cache poisoning**), khiến mọi người dùng của resolver đó bị dẫn tới IP của kẻ tấn công dù gõ đúng tên miền.

**Cách giải.** **DNSSEC** thêm **chữ ký số** vào câu trả lời DNS. Zone của bạn ký từng nhóm record bằng khoá bí mật; resolver dùng khoá công khai để kiểm tra chữ ký. Câu trả lời bị sửa hoặc giả mạo thì chữ ký không khớp và resolver bỏ đi. DNSSEC chỉ chống **giả mạo**; nó không mã hoá, ai nghe lén vẫn đọc được bạn đang hỏi tên miền gì.

Có hai khoá, mỗi khoá một việc:

- **ZSK (zone-signing key)** — ký các record trong zone. Dùng liên tục nên được xoay thường xuyên. **Route 53 tự quản lý ZSK.**
- **KSK (key-signing key)** — chỉ ký một thứ: chính cái ZSK. **Bạn sở hữu KSK**, và nó dựa trên một **KMS key bất đối xứng** (customer managed, key spec `ECC_NIST_P256`) bắt buộc nằm ở **us-east-1**.

Còn một câu hỏi: resolver lấy gì để tin KSK của bạn? Câu trả lời là **DS record** (delegation signer) — một bản tóm tắt (hash) của KSK, đặt ở **zone cha**. Với `example.com`, zone cha là `.com`, và DS record được chính `.com` ký. Tới lượt `.com` lại có DS record nằm ở root. Resolver đi ngược lên từng tầng như vậy tới root — nơi khoá đã được cài sẵn trong phần mềm resolver. Chuỗi này gọi là **chain of trust**.

```
root  ──ký──▶  DS của .com
.com  ──ký──▶  DS của example.com  (= hash của KSK)
KSK   ──ký──▶  ZSK
ZSK   ──ký──▶  các record A, AAAA, MX… của example.com
```

Trên Route 53 có hai bước, thiếu bước nào cũng chưa xong:

1. **Bật DNSSEC signing** ở hosted zone và tạo KSK (chọn hoặc tạo KMS key).
2. **Thêm DS record vào zone cha** — làm ở nhà đăng ký tên miền (hoặc mục Registered domains nếu đăng ký ở Route 53).

Chỉ làm bước 1 thì zone có ký nhưng không resolver nào kiểm tra, vì chuỗi tin cậy bị đứt ở tầng cha.

> Bẫy thi: DNSSEC signing chỉ áp dụng cho **public hosted zone**. KMS key phải là **asymmetric** và ở **us-east-1** — đáp án ghi symmetric key hoặc region khác là sai. Bản thân tính năng không tính phí, chỉ trả tiền KMS key.

---

## 3. CloudFront

**CloudFront** là CDN (content delivery network) của AWS: một mạng máy chủ đặt ở hàng trăm thành phố, giữ **bản sao** nội dung của bạn để trả cho người dùng từ điểm gần họ, thay vì mọi request phải đi tới server gốc.

Vì sao điều đó quan trọng: một người dùng ở Hà Nội gọi tới server ở Virginia mất cỡ vài trăm mili giây cho **mỗi lượt đi-về**, và một kết nối HTTPS mới cần vài lượt như vậy trước khi nhận byte dữ liệu đầu tiên. Nếu file nằm sẵn ở một điểm tại Hà Nội hay Singapore thì mỗi lượt chỉ còn vài chục mili giây, và server gốc không phải làm gì cả.

### 3.1 Components

**Đường đi của một request.** Lấy ví dụ người dùng ở Hà Nội mở `https://shop.example.com/img/logo.png`, server gốc ở us-east-1:

1. DNS đưa người dùng tới **edge location** gần nhất về độ trễ (một điểm ở Hà Nội).
2. Edge tìm file trong cache của nó. Có và còn hạn → trả ngay. Đây gọi là **cache hit**; request dừng ở đây, origin không biết gì.
3. Không có (**cache miss**) → edge hỏi **regional edge cache** gần nhất.
4. Regional edge cache có → trả về cho edge. Không có → nó mới đi tới **origin**.
5. Trên đường về, file được lưu lại ở cả regional edge cache lẫn edge, để người kế tiếp được cache hit.

Các thành phần tham gia:

- **Distribution** — một "bản cấu hình CDN" cho một website hay ứng dụng. Tạo xong bạn nhận một tên miền dạng `d111111abcdef8.cloudfront.net`; mọi thứ bên dưới (origin, behavior, chứng chỉ TLS, WAF…) đều thuộc về distribution đó. Bạn trỏ tên miền của mình vào nó bằng Alias record (§2.2).
- **Origin** — nơi giữ bản gốc, CloudFront đến lấy khi cache miss. Có thể là S3 bucket, ALB/NLB, EC2, MediaPackage, Lambda Function URL, hoặc bất kỳ HTTP server nào kể cả ngoài AWS (gọi là *custom origin*).
- **Origin Group** — một cặp origin primary + secondary. Khi primary trả mã lỗi bạn chọn sẵn (ví dụ 500, 502, 503, 504) hoặc không kết nối được, CloudFront **thử lại chính request đó** ở secondary. Chỉ áp dụng cho `GET`, `HEAD`, `OPTIONS`. Mặc định CloudFront thử kết nối primary 3 lần, mỗi lần chờ 10 giây, tức tối đa 30 giây trước khi chuyển; hai số này chỉnh nhỏ được.
- **Behavior** — quy tắc "đường dẫn kiểu này thì xử lý thế nào". Mỗi behavior gắn một *path pattern* với một origin và các policy cache. Ví dụ: `/static/*` → S3, cache dài; `/api/*` → ALB, không cache; còn lại (`*`, default behavior) → ALB, cache ngắn.
- **Edge Location** (còn gọi POP — point of presence) — điểm đứng gần người dùng, nhận request và giữ cache. Hiện có hơn 750 POP ở hơn 100 thành phố; tài liệu cũ ghi 400+ hoặc 600+, con số cụ thể không phải thứ đề thi hỏi.
- **Regional Edge Cache** — tầng cache ở giữa, ít điểm hơn nhiều (15 điểm) nhưng mỗi điểm có bộ nhớ cache lớn hơn một edge. Vì edge có chỗ hạn chế nên file ít người xem sẽ sớm bị đẩy ra để nhường chỗ; regional edge cache giữ chúng lâu hơn, nhờ đó nhiều edge trong cùng khu vực dùng chung một bản thay vì mỗi edge tự đi hỏi origin.

Không phải request nào cũng qua regional edge cache: các method ghi (`PUT`, `POST`, `PATCH`, `DELETE`) và request động đi thẳng từ edge tới origin.

### 3.2 Cache strategy

Đây là phần quyết định CloudFront có ích hay không. Một distribution cấu hình cache sai vẫn chạy, nhưng gần như mọi request đều rơi xuống origin — bạn trả tiền CDN mà không được gì.

#### Cache key — CloudFront nhận ra "cùng một nội dung" bằng cách nào

**Cache key** là cái nhãn định danh một object trong cache. Khi request tới, CloudFront tính cache key của nó rồi tìm trong cache: trùng nhãn với một object còn hạn thì là cache hit.

Mặc định cache key chỉ gồm **tên miền của distribution + đường dẫn URL**. Query string, header, cookie đều **không** nằm trong key. Xem hai request sau:

```
Request 1:  GET /products/42?ref=facebook
            User-Agent: Firefox…      Cookie: session_id=aaa

Request 2:  GET /products/42?ref=email
            User-Agent: Chrome…       Cookie: session_id=bbb
```

Với key mặc định, cả hai có cùng key `/products/42`. Request 1 là cache miss (lần đầu), request 2 là cache hit — dù khác query string, khác trình duyệt, khác cookie.

Điều đó chỉ đúng khi origin trả **cùng một nội dung** cho cả hai. Nếu origin trả trang tiếng Việt hay tiếng Anh tuỳ theo header `Accept-Language`, thì với key mặc định, người Anh sẽ nhận trang tiếng Việt mà người trước đó để lại trong cache. Khi ấy bạn buộc phải đưa `Accept-Language` **vào cache key** để mỗi ngôn ngữ có một bản riêng.

Quy tắc là: **giá trị nào làm origin trả nội dung khác thì phải nằm trong cache key; giá trị nào không ảnh hưởng thì phải nằm ngoài.**

#### Vì sao thêm thứ vào cache key làm tụt hit ratio

**Cache hit ratio** là tỉ lệ request được trả từ cache. Mỗi giá trị khác nhau của một thành phần trong key tạo ra một bản cache riêng, và mỗi bản riêng phải chịu một lần miss trước khi có hit.

Giả sử trang `/products/42` nhận 10.000 request trong lúc object còn hạn, tại một edge:

```
Cache key chỉ có path:                1 bản      → 1 miss     → hit ratio 99,99%
+ Accept-Language (4 biến thể):       4 bản      → 4 miss     → hit ratio 99,96%
+ User-Agent (~2.000 biến thể):       2.000 bản  → 2.000 miss → hit ratio 80%
+ cookie session_id (mỗi user 1 cái): 10.000 bản → 10.000 miss → hit ratio 0%
```

Dòng cuối là lỗi kinh điển: chọn "forward all cookies" cho tiện, và từ đó mỗi người dùng có một bản cache riêng mà không ai khác dùng được. CloudFront vẫn chạy, nhưng chỉ còn là một proxy đắt tiền.

Ngay cả 4 biến thể `Accept-Language` cũng có thể phình ra: `en-US,en`, `en,en-US`, `en-US, en` cùng nghĩa nhưng là ba chuỗi khác nhau, tức ba bản cache. Vì vậy mới có khái niệm **chuẩn hoá cache key** (viết thường, bỏ tham số tracking như `utm_source`, quy `Accept-Language` về vài giá trị) bằng CloudFront Functions — xem §3.4 và §9.

#### TTL — một bản cache sống bao lâu

Mỗi object trong cache có một **TTL**; hết TTL thì request kế tiếp khiến CloudFront hỏi lại origin. TTL được quyết định bởi hai bên: header `Cache-Control: max-age=…` mà origin gửi kèm, và ba con số trong cache policy.

- **Default TTL** — dùng khi origin **không** gửi `Cache-Control`/`Expires`.
- **Minimum TTL** và **Maximum TTL** — sàn và trần. Origin gửi `max-age` nằm ngoài khoảng này thì bị kéo về sàn hoặc trần.

Lấy policy có sẵn `CachingOptimized` (min 1 giây, default 86.400 giây, max 31.536.000 giây):

```
Origin không gửi Cache-Control       → dùng default: 86.400 giây = 24 giờ
Origin gửi max-age=60                → 60 giây (nằm giữa sàn và trần)
Origin gửi max-age=63072000 (2 năm)  → bị kéo về trần: 31.536.000 giây = 365 ngày
Origin gửi no-cache                  → vẫn cache 1 giây, vì sàn là 1
```

Dòng cuối là một cái bẫy thật: minimum TTL lớn hơn 0 khiến CloudFront cache cả những response mà origin đã bảo đừng cache. Ngược lại, đặt cả ba số bằng 0 là tắt cache hoàn toàn.

Muốn xoá một object trước khi hết TTL thì tạo **invalidation** cho đường dẫn đó. Cách bền hơn là đặt tên file theo phiên bản (`app.3f9a1c.js`): file mới có URL mới nên không cần xoá gì.

#### Ba loại policy gắn vào behavior

Trước đây mọi thứ gộp chung một chỗ, nên muốn origin nhận được một header thì header đó cũng tự động rơi vào cache key. Nay tách làm ba để bạn điều khiển riêng từng việc:

- **Cache Policy** — quyết định **cache key** (header, query string, cookie nào được tính) và **TTL** (min/default/max). Thứ gì nằm trong cache key thì cũng tự động được gửi tới origin.
- **Origin Request Policy** — quyết định gửi **thêm** header/query string/cookie nào tới origin **mà không đưa vào cache key**. Ví dụ origin cần `User-Agent` để ghi log thống kê nhưng nội dung trả về không đổi theo nó: forward bằng origin request policy, cache key vẫn gọn.
- **Response Headers Policy** — thêm hoặc sửa header trên đường **trả về** người dùng: HSTS, CORS, các security header. Không liên quan tới cache key.
- **Managed Policies** — các policy AWS làm sẵn cho trường hợp thường gặp. `CachingOptimized` (key tối thiểu, TTL dài — cho nội dung tĩnh), `CachingDisabled` (cả ba TTL bằng 0 — cho API động), `AllViewerExceptHostHeader` (một origin request policy forward mọi thứ trừ header `Host` — cho origin như API Gateway vốn từ chối `Host` lạ).

> Bẫy thi: *"hit ratio thấp, origin quá tải dù đã có CloudFront"* → cache key đang chứa thứ không cần (cookie, mọi query string, `User-Agent`). Sửa bằng cách **thu hẹp cache policy**. *"origin cần đọc một header nhưng không muốn ảnh hưởng cache"* → **origin request policy**, không phải cache policy.

### 3.3 OAC (Origin Access Control) — replace OAI

**Bài toán.** Bạn để file trong S3 và phát qua CloudFront. Nếu bucket public thì ai biết URL của S3 cũng tải thẳng được, bỏ qua CloudFront — tức bỏ qua luôn WAF, signed URL, giới hạn địa lý và mọi thứ bạn cấu hình ở đó. Bạn muốn: **bucket private, và chỉ distribution của bạn được đọc**.

**Cách OAC giải.** Bucket private nghĩa là S3 từ chối mọi request không chứng minh được danh tính. OAC cho CloudFront một danh tính: mỗi khi đi lấy file, CloudFront **ký request** bằng **SigV4** (Signature Version 4 — cơ chế ký chuẩn của mọi API AWS: bên gửi tính một chữ ký từ nội dung request và khoá bí mật, đặt vào header `Authorization`; bên nhận tính lại để biết ai gửi và request có bị sửa giữa đường không). S3 nhận request đã ký, thấy nó đến từ dịch vụ CloudFront, rồi đối chiếu bucket policy xem có cho phép không.

Bucket policy cho phép **service principal** `cloudfront.amazonaws.com`, kèm điều kiện request phải thay mặt cho **đúng distribution của bạn**:

```json
{
  "Effect": "Allow",
  "Principal": { "Service": "cloudfront.amazonaws.com" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::my-bucket/*",
  "Condition": {
    "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::111122223333:distribution/EDFDVBD6EXAMPLE"
    }
  }
}
```

Điều kiện `AWS:SourceArn` là phần không được bỏ. Thiếu nó, **bất kỳ distribution nào của bất kỳ tài khoản AWS nào** trỏ origin vào bucket của bạn cũng đọc được, vì tất cả đều là "dịch vụ CloudFront".

**Vì sao thay OAI.** OAI (Origin Access Identity) là cách cũ: CloudFront đóng vai một "user đặc biệt" và bucket policy cấp quyền cho user đó. Docs hiện gọi OAI là *legacy, not recommended* và khuyên dùng OAC, vì OAI không hỗ trợ hoặc phải đi đường vòng trong ba trường hợp:

| | **OAI** (cũ) | **OAC** (hiện tại) |
|--|--------------|--------------------|
| Object mã hoá **SSE-KMS** | Không | Được — thêm quyền cho `cloudfront.amazonaws.com` trong KMS key policy, cũng kèm điều kiện `AWS:SourceArn` |
| Request ghi (`PUT`, `DELETE`) tới S3 | Không | Được |
| Bucket ở mọi region, kể cả region opt-in mới | Không đủ | Được |
| Principal trong bucket policy | Một IAM user đặc biệt của CloudFront | Service principal + điều kiện distribution ARN |

Một giới hạn chung của cả hai: chỉ dùng được với S3 bucket thường (REST endpoint). Nếu bucket bật **static website hosting** và bạn trỏ origin vào website endpoint thì CloudFront coi đó là custom origin và không dùng được OAC lẫn OAI.

> Bẫy thi: *"CloudFront + S3 private, object mã hoá bằng KMS"* → **OAC**. Thấy OAI trong đáp án cho một hệ thống mới thì đó là đáp án cũ.

### 3.4 Lambda@Edge vs CloudFront Functions

Cả hai cho bạn chạy code của mình **ngay tại CloudFront**, chen vào đường đi của request. Có 4 điểm chen: *viewer request* (vừa nhận từ người dùng, trước khi tra cache), *origin request* (sau cache miss, trước khi gửi tới origin), *origin response* (origin vừa trả về, trước khi lưu cache), *viewer response* (trước khi trả cho người dùng). Hai điểm "viewer" chạy trên **mọi** request; hai điểm "origin" chỉ chạy khi cache miss.

| | Lambda@Edge | CloudFront Functions |
|--|-------------|----------------------|
| Triggers | Viewer req/resp, Origin req/resp (4) | Viewer req/resp only (2) |
| Runtime | Node.js, Python | JavaScript (runtime riêng của CloudFront, không phải Node.js) |
| Duration | Đề thi: tới 5s viewer, 30s origin. Docs hiện tại: tới 30s cho cả hai | < 1 ms |
| Memory | 128 MB (viewer), tới 10 GB (origin) | 2 MB |
| Gọi mạng / đọc request body | Được | Không |
| Scale | Tới 10.000 request/giây mỗi region | Hàng triệu request/giây |
| Region | Edge (replicated regional) | Edge in-process |
| Cost | $0.60/M req + GB-s | **$0.10/M req** |
| Use case | URL rewrite phức tạp, header manipulation, A/B test, auth | Simple URL rewrite, header, redirect, cache key normalize |

Nguyên nhân gốc của mọi khác biệt trên: CloudFront Functions chạy **ngay trong tiến trình của edge location**, nên cực nhanh và rẻ nhưng bị bó trong 2 MB, không gọi được mạng. Lambda@Edge là một Lambda function thật, chạy ở regional edge cache, nên làm được mọi thứ Lambda làm (gọi DynamoDB, dùng thư viện ngoài) nhưng chậm hơn và đắt hơn.

Tính thử với 100 triệu request/tháng, hàm chạy ở viewer request:

```
CloudFront Functions:  100 × $0,10                      = $10
Lambda@Edge:           100 × $0,60                      = $60
                     + 100 triệu × 5 ms × 128 MB
                       = 62.500 GB-giây × $0,00005001   ≈ $3,13
                                                  Tổng  ≈ $63
```

→ Thử **CloudFront Functions** trước (rẻ + nhanh), fallback Lambda@Edge khi cần.

### 3.5 Signed URL / Signed Cookie
- **Signed URL** — 1 user, 1 file.
- **Signed Cookie** — 1 user, multiple file (toàn site private).
- Trusted signer: key pair từ CloudFront (legacy) hoặc **CloudFront Key Group** (new).
- Use case: paid content, video streaming, premium download.

OAC (§3.3) và signed URL khoá hai cánh cửa khác nhau và thường đi cùng nhau: OAC chặn người ta **đi vòng qua CloudFront** để vào thẳng S3; signed URL/cookie quyết định **ai được đi qua CloudFront**.

### 3.6 Field-Level Encryption
- Encrypt sensitive field (credit card, SSN) tại CloudFront trước khi forward origin.
- Public key encrypt, only app server có private key decrypt.

HTTPS đã mã hoá cả request trên đường truyền, nhưng tới origin thì mọi tầng (load balancer, web server, log) đều thấy dữ liệu dạng rõ. Field-level encryption mã hoá **riêng vài trường** trong form `POST` ngay tại edge, nên những tầng trung gian chỉ thấy chuỗi đã mã hoá; chỉ service nắm private key (ví dụ service thanh toán) đọc được.

### 3.7 Real-time Logs + Standard Logs
- **Standard logs (access logs)** — mỗi request một dòng, gom thành file và ghi định kỳ vào S3 (bản v2 ghi được thêm ra đích khác). Giao kiểu *best-effort*: có độ trễ, đôi khi một dòng tới rất muộn hoặc không tới. Dùng cho phân tích về sau và audit, không dùng để cảnh báo tức thời.
- **Real-time logs** — đẩy vào **Kinesis Data Streams** trong vòng vài giây kể từ lúc nhận request. Chọn được tỉ lệ lấy mẫu và các trường cần lấy. Tính phí ~$0,01 mỗi 1 triệu dòng log, cộng tiền Kinesis. Dùng cho dashboard trực tiếp và phát hiện tấn công.

### 3.8 Price Class

CloudFront tính tiền truyền dữ liệu **khác nhau theo vị trí edge**: gửi 1 GB từ edge ở Mỹ/châu Âu ~$0,085, từ edge ở Đông Nam Á ~$0,120 (đắt hơn ~41%). **Price class** cho bạn giới hạn distribution chỉ dùng edge ở những vùng rẻ hơn.

- **PriceClass_All** — mọi edge trên thế giới.
- **PriceClass_200** — bỏ **Nam Mỹ** và **Úc/New Zealand**; vẫn gồm Bắc Mỹ, châu Âu, châu Á, Trung Đông và châu Phi.
- **PriceClass_100** — chỉ Bắc Mỹ (Mỹ, Mexico, Canada) và châu Âu (kèm Israel, Thổ Nhĩ Kỳ).

→ Giảm cost nếu user vùng hẹp.

Price class **không chặn** người dùng ở vùng bị loại. Họ vẫn truy cập được, chỉ là được phục vụ từ một edge xa hơn thuộc vùng còn lại, nên chậm hơn. Muốn chặn theo quốc gia thì dùng tính năng geo restriction, không phải price class.

### 3.9 Origin Shield

**Bài toán.** Regional edge cache (§3.1) đã gom nhiều edge về một mối, nhưng có nhiều regional edge cache trên thế giới và chúng không chia sẻ cache với nhau. Một file mới được người dùng ở ba châu lục cùng mở sẽ khiến ba regional edge cache cùng miss và cùng đi hỏi origin — ba request cho cùng một file.

**Cách giải.** **Origin Shield** là **thêm một tầng cache nữa**, đặt ở **một region duy nhất bạn chọn**, nằm ngay trước origin. Mọi regional edge cache phải đi qua nó. File chỉ cần được lấy từ origin **một lần**, các nơi khác lấy lại từ Origin Shield.

```
Không có Origin Shield:   edge → regional edge cache (nhiều cái) ─────────────▶ origin
Có Origin Shield:         edge → regional edge cache (nhiều cái) → Origin Shield (1 cái) → origin
```

Được hai thứ: **hit ratio cao hơn** (thêm một tầng có cơ hội hit) và **origin nhẹ tải hơn** (các request trùng nhau được gộp lại). Đáng dùng khi origin đắt hoặc yếu: origin on-premises băng thông hẹp, server phải đóng gói video hay xử lý ảnh cho mỗi lần miss, hoặc người xem rải khắp thế giới. Không đáng với nội dung động không cache được.

Chọn region cho Origin Shield là region **gần origin nhất về độ trễ** — origin ở region nào thì bật ở chính region đó nếu có hỗ trợ. Tính phí thêm theo số request đi qua nó (~$0,0075 mỗi 10.000 request ở Mỹ).

---

## 4. Global Accelerator

### 4.1 Đặc điểm

**Bài toán.** Người dùng ở xa kết nối tới region của bạn qua Internet công cộng: gói tin nhảy qua nhiều nhà mạng, mỗi chặng do một bên khác quyết định đường đi, nên độ trễ dao động và hay mất gói. CloudFront giải việc này cho HTTP bằng cache. Nhưng game dùng UDP, thiết bị IoT dùng giao thức riêng trên TCP, hay một API mà đối tác đòi IP cố định để mở firewall thì CloudFront không giúp được.

**Global Accelerator (GA)** giải bằng cách khác: không cache gì cả, chỉ **rút ngắn đoạn đường đi trên Internet công cộng**. Nó cho bạn:

- **2 static anycast IP.** *Static* là hai IP này thuộc về accelerator của bạn và không đổi suốt đời nó. **Anycast** là kỹ thuật cho **cùng một IP được quảng bá từ nhiều nơi cùng lúc** — ở đây là từ các edge location của AWS khắp thế giới — và hệ thống định tuyến của Internet tự đưa gói tin tới nơi quảng bá **gần nhất**. Người dùng ở Hà Nội và người ở Paris gõ cùng một IP nhưng gói tin của mỗi người vào mạng AWS ở edge gần họ. (Accelerator dual-stack có thêm 2 IPv6.)
- **Đi tiếp trên AWS backbone.** Từ edge đó, gói tin chạy trên mạng riêng của AWS tới region đích thay vì tiếp tục qua Internet. AWS công bố mức cải thiện tới 60% thông lượng TCP ở nhóm kết nối tệ nhất; mức thực tế tuỳ vị trí người dùng.
- **Layer 4 (TCP/UDP).** GA chuyển tiếp kết nối mà không đọc nội dung, nên không quan tâm bên trên là HTTP, giao thức game hay VoIP.
- **Endpoint:** ALB, NLB, EC2 instance, Elastic IP — ở một hoặc nhiều region. Các endpoint trong cùng region gộp thành một *endpoint group*.
- **Health check + failover giữa các region.** GA liên tục kiểm tra endpoint; khi một endpoint hỏng nó ngừng đưa traffic tới đó và chuyển sang endpoint khoẻ ở region khác **trong vòng dưới 1 phút**.
- **Traffic Dial** + **Endpoint Weight** cho A/B test và chuyển tải. *Traffic dial* là phần trăm traffic bạn cho phép vào **một endpoint group** (vặn về 0 để rút cả region ra bảo trì); *endpoint weight* chia tỉ lệ giữa các endpoint **trong cùng một group**.

**Vì sao failover của GA nhanh hơn DNS.** Với Route 53 failover (§2.6), client phải nhận được **IP mới**, tức phải chờ DNS cache hết hạn. Với GA, client **giữ nguyên hai IP** suốt đời; việc đổi đích xảy ra ở phía AWS, không có cache nào ở phía client cần hết hạn.

| | Route 53 failover | Global Accelerator |
|--|-------------------|--------------------|
| Thứ thay đổi khi failover | IP mà DNS trả về | Đích phía sau IP (IP không đổi) |
| Phụ thuộc DNS cache của client | Có | Không |
| Thời gian điển hình | ~1,5–2,5 phút với TTL 60 giây (§2.6), một số client lâu hơn | Dưới 1 phút |

**Giá:** ~$0,025 mỗi giờ cho mỗi accelerator (0,025 × 730 giờ ≈ **$18/tháng**, kể cả khi không có traffic), cộng phí *Data Transfer-Premium* theo GB (~$0,015–0,035/GB tuỳ cặp vùng) vì dữ liệu đi trên backbone của AWS.

### 4.2 CloudFront vs Global Accelerator

Cả hai đều dùng mạng edge của AWS và đều giúp người dùng ở xa nhanh hơn, nên hay bị nhầm. Khác biệt gốc: **CloudFront hiểu HTTP nên trả lời thay origin được** (cache, chạy code, lọc bằng WAF); **GA chỉ chuyển tiếp gói tin nên chạy được với mọi giao thức** nhưng request nào cũng tới origin.

| Feature | CloudFront | Global Accelerator |
|---------|-----------|---------------------|
| Layer | 7 (HTTP) | 4 (TCP/UDP) |
| Static IP | ✗ mặc định (IP đổi theo thời gian; có tính năng Anycast static IP riêng, phải yêu cầu) | ✓ 2 IP có sẵn |
| Cache | ✓ | ✗ |
| WAF | ✓ gắn thẳng vào distribution | ✗ (gắn WAF ở ALB phía sau) |
| Edge compute | ✓ (Functions, Lambda@Edge) | ✗ |
| Failover | Origin group: thử lại **từng request** ở origin phụ, chỉ `GET`/`HEAD`/`OPTIONS` | Chuyển **cả luồng** sang region khác, **dưới 1 phút**, không phụ thuộc DNS |
| Use case | Web static + dynamic | TCP/UDP game, IoT, VoIP, legacy app static IP |

> Bẫy thi: thấy **UDP**, **static IP để whitelist**, hoặc **non-HTTP** → Global Accelerator. Thấy **cache**, **nội dung tĩnh**, **giảm tải origin** → CloudFront. Thấy *"failover nhanh giữa các region, không phụ thuộc DNS caching"* → Global Accelerator, không phải Route 53.

### 4.3 Khi dùng cả 2

Hai dịch vụ chạy **song song, mỗi cái một loại traffic** — không nối tiếp nhau. CloudFront không phải là endpoint hợp lệ của Global Accelerator (endpoint chỉ gồm ALB, NLB, EC2, Elastic IP), nên không có kiến trúc "GA → CloudFront".

```
                ┌─ HTTP/HTTPS (web, API, tải asset) ─▶ CloudFront ─────────▶ ALB / S3
Client game ────┤
                └─ UDP (voice, trạng thái trận đấu) ─▶ Global Accelerator ─▶ NLB ─▶ game server
```

Game with HTTP API + UDP voice → CloudFront cho HTTP, GA cho UDP.

Client dùng hai tên miền khác nhau cho hai đường: một tên trỏ vào distribution, một tên trỏ vào hai IP của accelerator.

---

## 5. Pattern thiết kế global app

### 5.1 Standard global web app

<svg viewBox="0 0 520 456" role="img" aria-labelledby="s17a-t s17a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="s17a-t">Kiến trúc web app global chuẩn: Route 53, CloudFront, ALB, ASG, S3</title>
<desc id="s17a-d">User hỏi Route 53 (latency routing) để lấy địa chỉ, rồi gửi request HTTPS tới CloudFront ở edge gần nhất. CloudFront chia theo behavior: đường dẫn /static/* lấy từ S3 origin (bucket private, chỉ CloudFront đọc qua OAC); còn lại (default *) đi tới ALB trong region, ALB chia tải cho các EC2 trong Auto Scaling Group.</desc>
<defs><marker id="s17a-arr" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<use href="#aws-res-user" x="40" y="30" width="48" height="48"/><text x="64" y="96" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">User</text>
<path d="M94 54 H224" fill="none" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.6" marker-end="url(#s17a-arr)" stroke-dasharray="5 4"/><text x="159" y="46" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.85">1. DNS</text>
<use href="#aws-route-53" x="232" y="30" width="48" height="48"/><text x="256" y="96" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Route 53</text><text x="256" y="113" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">latency routing</text>
<path d="M64 106 V176" fill="none" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.6" marker-end="url(#s17a-arr)"/><text x="72" y="146" text-anchor="start" font-size="13" fill="currentColor" opacity="0.85">2. HTTPS</text>
<rect x="14" y="174" width="100" height="108" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="none"/>
<use href="#aws-cloudfront" x="40" y="182" width="48" height="48"/><text x="64" y="248" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">CloudFront</text><text x="64" y="265" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">edge gần user</text>
<rect x="176" y="156" width="332" height="140" rx="10" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="6 4"/>
<use href="#aws-group-region" x="176" y="156" width="22" height="22"/><text x="204" y="172" text-anchor="start" font-size="13" fill="currentColor" opacity="0.8">AWS Region</text>
<path d="M116 206 H218" fill="none" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.6" marker-end="url(#s17a-arr)"/><text x="142" y="198" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.85">*</text>
<text x="142" y="226" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.85">default</text>
<use href="#aws-alb" x="226" y="184" width="48" height="48"/><text x="250" y="250" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">ALB</text>
<rect x="336" y="178" width="152" height="96" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5" stroke-dasharray="4 3"/>
<path d="M278 206 H382" fill="none" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.6" marker-end="url(#s17a-arr)"/>
<use href="#aws-ec2-auto-scaling" x="390" y="184" width="48" height="48"/><text x="414" y="250" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">ASG</text><text x="414" y="266" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">(EC2)</text>
<path d="M64 284 V378 H218" fill="none" stroke="currentColor" stroke-opacity="0.65" stroke-width="1.6" marker-end="url(#s17a-arr)"/><text x="72" y="334" text-anchor="start" font-size="13" fill="currentColor" opacity="0.85">/static/*</text>
<use href="#aws-s3" x="226" y="354" width="48" height="48"/><text x="250" y="420" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">S3 origin</text><text x="250" y="437" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">static</text>
<text x="300" y="374" text-anchor="start" font-size="13" fill="currentColor" opacity="0.8">bucket private,</text><text x="300" y="392" text-anchor="start" font-size="13" fill="currentColor" opacity="0.8">chỉ CloudFront đọc</text><text x="300" y="410" text-anchor="start" font-size="13" fill="currentColor" opacity="0.8">(OAC, §3.3)</text>
</svg>

Route 53 chỉ trả lời DNS (bước 1), không nằm trên đường đi của dữ liệu; mọi request HTTPS vào CloudFront, rồi CloudFront chọn origin theo behavior (§3.1): `/static/*` sang S3, còn lại sang ALB của region, ALB chia tải cho ASG.

### 5.2 Multi-region active-active
```
User → Route 53 (latency + health) → ┬→ ap-southeast-1: ALB → ECS → Aurora Global (reader)
                                      └→ us-east-1: ALB → ECS → Aurora Global (writer)
```

### 5.3 DR Pilot Light
```
User → Route 53 (failover) → Primary: us-east-1 (ALB + ASG + RDS Multi-AZ)
                            → Secondary: ap-southeast-1 (RDS Read Replica, ASG stopped)
                              Khi primary fail: promote replica, scale ASG, R53 failover.
```

### 5.4 Global TCP game
```
Player → Global Accelerator (2 anycast IP) → Region gần nhất
          ↓
        NLB region X → ECS Fargate game server
```

---

## 6. Tự kiểm tra

1. App cần global low-latency cho REST API + WebSocket. Edge layer?
   <details><summary>Đáp án</summary>**CloudFront** L7. WebSocket hỗ trợ. Nếu đề thêm yêu cầu static IP thì chuyển sang **Global Accelerator** đặt trước ALB (GA không đứng trước CloudFront được — §4.3).</details>

2. Game UDP global, player whitelist IP. Service?
   <details><summary>Đáp án</summary>**Global Accelerator** — UDP, 2 static anycast IP cho whitelist.</details>

3. CloudFront serve S3 private. Pattern đúng?
   <details><summary>Đáp án</summary>**OAC** (KHÔNG OAI cũ) + bucket policy condition `AWS:SourceArn`.</details>

4. Latency vs Geolocation routing — khi nào dùng cái nào?
   <details><summary>Đáp án</summary>**Latency** — đa số app, route gần user network. **Geolocation** — compliance (data residency GDPR), language/content theo nước.</details>

5. CloudFront edge JS rewrite URL đơn giản. Function nào?
   <details><summary>Đáp án</summary>**CloudFront Functions** — rẻ ($0.10/M), nhanh < 1ms. Lambda@Edge chỉ khi cần Node/Python hoặc full SDK.</details>

6. Premium video streaming, mỗi user view link riêng có hạn 1h?
   <details><summary>Đáp án</summary>**CloudFront Signed URL** với expires 1h.</details>

7. Toàn site private cho subscriber. Signed URL hay Cookie?
   <details><summary>Đáp án</summary>**Signed Cookie** — 1 lần authorize, mọi resource accessible. Signed URL phải sign mỗi file.</details>

8. Multi-region active-active web. DNS failover hay GA?
   <details><summary>Đáp án</summary>Active-active = traffic both region cùng lúc → **Route 53 latency** routing. Failover = primary/standby. GA = sub-minute failover L4, không cache.</details>

9. CloudFront origin ALB ở region đắt (US). User chủ yếu Asia. Cost saving?
   <details><summary>Đáp án</summary>Đáp án đề thi nhắm tới là **Price Class** (§3.8): chọn class chỉ gồm các vùng có user để không trả giá của vùng đắt mà mình không cần. Với user ở châu Á thì **PriceClass_200** (bỏ Nam Mỹ và Úc/NZ) là mức thấp nhất còn phủ châu Á; PriceClass_100 sẽ đẩy user châu Á sang edge ở Mỹ/Âu, rẻ hơn nhưng chậm. Khoản tiết kiệm lớn hơn thường đến từ **tăng cache hit ratio** (§3.2). Chuyển origin sang region châu Á giúp giảm độ trễ khi cache miss, nhưng không giảm tiền truyền dữ liệu origin → CloudFront vì khoản đó vốn miễn phí với origin trên AWS.</details>

10. Cần encrypt credit card field tại edge trước khi origin thấy. Service?
    <details><summary>Đáp án</summary>**CloudFront Field-Level Encryption** — public key encrypt tại edge, app server decrypt với private key.</details>

11. Route 53 failover, health check standard (30 giây, threshold 3), record TTL 60 giây. Primary sập thì khoảng bao lâu user sang được secondary?
    <details><summary>Đáp án</summary>Phát hiện 30 × 3 = 90 giây, cộng TTL 60 giây ≈ **150 giây** (§2.6). Cần nhanh hơn và không phụ thuộc DNS cache → Global Accelerator.</details>

12. Distribution cache trang sản phẩm nhưng hit ratio gần 0%. Cache policy đang forward toàn bộ cookie. Vì sao, sửa thế nào?
    <details><summary>Đáp án</summary>Cookie nằm trong **cache key**, mà cookie session mỗi user một giá trị → mỗi user một bản cache riêng (§3.2). Bỏ cookie khỏi cache policy; nếu origin vẫn cần đọc cookie thì forward bằng **origin request policy**.</details>

---

## 7. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| Route 53 | Cloud DNS |
| Route 53 routing policies | DNS routing policies (geo, weighted, failover) |
| Route 53 health check | (qua LB health check) |
| CloudFront | Cloud CDN (gắn HTTPS LB) |
| OAC | Signed URL with private bucket |
| Lambda@Edge | (gần như không có) — chỉ Cloud Run service workers |
| CloudFront Functions | Cloud CDN không có edge compute native — dùng **Cloud Run on edge** |
| Global Accelerator | **Global LB anycast** (built-in) |
| Field-Level Encryption | (không có native) |
| Signed Cookie | Signed Cookie (GCS) |
| Edge Location | GCP PoP |

**Bẫy:**
1. **GCP Global LB anycast built-in** — không cần thêm service. AWS phải **CloudFront** (L7) + **GA** (L4) tách biệt.
2. **CloudFront Functions vs Lambda@Edge** không có equivalent ở GCP. Edge compute GCP yếu hơn.
3. **GCP Cloud CDN** gắn LB, không standalone.

---

## 8. Lưu ý SAA

- **Alias record** free, hỗ trợ apex. CNAME tính phí + không apex.
- **Latency routing** — network. **Geolocation** — IP country.
- **Failover** primary/secondary. **Multi-value** poor LB up to 8.
- **Health check** $0.50-0.75/check/tháng.
- **Health check không tới được IP private** → dùng kiểu CloudWatch alarm.
- **DNS failover chậm vì TTL**: phát hiện (chu kỳ × threshold) + TTL.
- **DNSSEC**: KSK trên KMS asymmetric ở us-east-1, DS record ở zone cha, chỉ public hosted zone.
- **Cache key** càng ít thành phần thì hit ratio càng cao; cần forward mà không cache theo → origin request policy.
- **CloudFront OAC** thay OAI.
- **Functions** < 1ms JS, **Lambda@Edge** Node/Python full SDK.
- **Signed URL** 1 file. **Signed Cookie** site.
- **Global Accelerator** L4 anycast, static IP, sub-minute failover.
- **CloudFront + GA** combo cho mixed L7 + L4 (chạy song song, không nối tiếp).
- **PriceClass** giảm cost cho region hẹp.

## 9. Lưu ý đi làm

### Best practice
- **HTTPS-only**: redirect HTTP → HTTPS in CloudFront.
- **HSTS header** via Response Headers Policy.
- **WAF** trước ALB và CloudFront.
- **Cache key normalization** (lowercase, strip tracking params) qua Functions.
- **Origin Shield** giảm cache miss tăng hit ratio (§3.9).
- **Real-time Logs** + Kinesis cho threat detection.
- **Route 53 PHZ + Resolver** cho hybrid DNS.
- **Multi-region** với Aurora Global + Route 53 latency failover.

### Anti-pattern
- ✗ CNAME apex → không hợp lệ DNS, dùng Alias.
- ✗ OAI cho S3 mới (legacy, AWS khuyên dùng OAC).
- ✗ CloudFront origin EC2 IP cứng → dùng ALB.
- ✗ Cache GET với cookies/headers không cần → cache key explode, low hit ratio.
- ✗ Origin EC2 public không có SG chỉ accept CloudFront → bypass cache.
- ✗ Lambda@Edge dùng cho 1 line JS → Functions rẻ hơn 6x.

## 10. Foundations
- [[foundations-04-latency-vs-consistency]] — multi-region tradeoff. Edge cache reduce latency nhưng staleness là consistency loss.

## 11. Flashcard

- **Route 53** — DNS + 8 routing policy (tài liệu cũ: 7) + domain registrar.
- **Alias** free + apex support.
- **Latency** network distance. **Geolocation** IP country.
- **Geoproximity** khoảng cách + bias (−99…+99), gắn với Traffic Flow.
- **Failover** primary/secondary. **Multi-value** 8 records.
- **Health check** $0.50+/check; mặc định 30 giây × 3 lần fail.
- **DNSSEC** cache poisoning prevention; KSK (bạn, KMS us-east-1) ký ZSK (Route 53), DS record ở zone cha.
- **CloudFront** CDN edge cache.
- **Cache key** mặc định = domain + path; thêm header/cookie/query → nhiều bản cache hơn → hit ratio giảm.
- **TTL** min / default / max; origin `Cache-Control` bị kẹp giữa min và max.
- **OAC** > OAI (KMS, SigV4, cross-account).
- **CloudFront Functions** < 1ms, JS, viewer.
- **Lambda@Edge** 4 trigger, Node/Python.
- **Signed URL** 1 file. **Signed Cookie** site.
- **Field-Level Encryption** at edge.
- **Origin Shield** cache mid-tier.
- **Price Class** All/200/100.
- **Global Accelerator** L4 anycast 2 static IP.
- **CloudFront vs GA**: L7 cache vs L4 static IP.
- **PHZ** + **Resolver** = hybrid DNS.
