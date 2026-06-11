# Tư duy bảo mật & Threat Modeling

Bảo mật không phải là một feature bạn "gắn thêm" ở cuối sprint, mà là một **thuộc tính của hệ thống** xuất hiện (hoặc biến mất) từ chính những quyết định thiết kế hằng ngày. Là kỹ sư xây hệ thống — không phải pentester — bạn không cần biết viết exploit từ con số 0. Bạn cần một thứ khác và quan trọng hơn: **tư duy của kẻ tấn công** để biết trước hệ thống của mình hỏng ở đâu, rồi đóng cửa trước khi có người đẩy.

Bài này không dạy bạn hack. Nó dạy bạn cách ngồi trước một bản thiết kế và hỏi đúng câu: *"Nếu tôi là kẻ xấu, tôi sẽ vào bằng đường nào, lấy được gì, và ai sẽ ngăn tôi?"* — đó chính là **threat modeling**.

## 1. CIA triad — bạn đang bảo vệ điều gì?

Trước khi phòng thủ, phải biết mình giữ cái gì. Mọi mục tiêu bảo mật quy về ba thuộc tính, gọi tắt là **CIA**:

| Thuộc tính | Nghĩa | Vi phạm trông như thế nào |
|---|---|---|
| **Confidentiality** (Bảo mật) | Chỉ người được phép mới đọc được dữ liệu | Lộ database người dùng, đọc trộm token, lộ secret trong log |
| **Integrity** (Toàn vẹn) | Dữ liệu không bị sửa trái phép, biết được nếu bị sửa | Đổi giá đơn hàng trong request, chèn record giả, sửa số dư |
| **Availability** (Sẵn sàng) | Hệ thống dùng được khi cần | DDoS, ransomware khoá dữ liệu, một query làm sập DB |

Điểm mấu chốt cho kỹ sư: **ba thuộc tính này thường mâu thuẫn nhau**, và bảo mật là nghệ thuật cân bằng. Mã hoá mạnh (Confidentiality) làm chậm hệ thống (ảnh hưởng Availability). Backup nhiều bản (Availability) làm tăng số nơi dữ liệu có thể lộ (giảm Confidentiality). Threat modeling giúp bạn biết với *từng tài sản cụ thể*, thuộc tính nào quan trọng nhất.

> 💡 Nguyên tắc: Đừng hỏi "hệ thống này có an toàn không?" (câu hỏi vô nghĩa, không có hệ thống nào an toàn tuyệt đối). Hãy hỏi "tài sản nào quan trọng nhất, kẻ tấn công nào có động cơ, và tôi chấp nhận rủi ro nào?". Bảo mật là **quản lý rủi ro**, không phải đạt trạng thái hoàn hảo.

## 2. Attack surface — đếm cửa trước khi khoá cửa

**Attack surface** (bề mặt tấn công) là tổng tất cả các điểm mà kẻ tấn công có thể tương tác với hệ thống. Mỗi điểm là một cánh cửa tiềm năng:

- Mọi **endpoint** HTTP/gRPC public — kể cả `/health`, `/debug`, `/metrics` mà bạn quên tắt.
- Mọi **input**: query param, header, cookie, body, file upload, hostname, thậm chí `User-Agent`.
- Mọi **dependency**: thư viện npm/pip, base image Docker, SDK của bên thứ ba.
- Mọi **người**: nhân viên có quyền SSH, CI/CD có quyền deploy, admin panel nội bộ.
- Mọi **kênh phụ**: error message lộ stack trace, response time khác nhau (timing), metadata.

Nguyên tắc số một và rẻ nhất trong toàn bộ bảo mật: **giảm attack surface**. Cánh cửa không tồn tại thì không cần khoá.

```diff
# Trước: endpoint debug để lại trong production
- app.get("/debug/env", (req, res) => res.json(process.env));   // lộ toàn bộ secret!
- app.get("/admin/users", listAllUsers);                         // không auth, "tạm thời"

# Sau: xoá hẳn những gì không cần, gate những gì cần
+ if (process.env.NODE_ENV !== "production") {
+   app.get("/debug/env", debugAuthOnly, sanitizedEnv);          // chỉ tồn tại ở dev
+ }
+ app.get("/admin/users", requireRole("admin"), listAllUsers);
```

## 3. Trust boundary — đường biên giữa "tin" và "không tin"

**Trust boundary** là ranh giới mà tại đó mức độ tin cậy của dữ liệu hoặc lời gọi thay đổi. Vượt qua một trust boundary, bạn **bắt buộc phải validate lại**. Đây là khái niệm bị hiểu sai nhiều nhất.

Ví dụ các trust boundary điển hình:
- Internet công cộng → Load balancer của bạn.
- Frontend (chạy trên máy người dùng — **không tin được**) → Backend API.
- API của bạn → Database.
- Service A → Service B (trong microservices, mạng nội bộ **không** phải vùng tin cậy tuyệt đối).
- Process của bạn → thư viện bên thứ ba xử lý input.

Lỗi kinh điển: tin rằng "validation đã làm ở frontend rồi nên backend khỏi cần". Frontend chạy trên trình duyệt của kẻ tấn công — họ sửa JavaScript, gọi thẳng API bằng `curl`, bỏ qua mọi check phía client.

```bash
# Frontend chặn order số lượng âm. Kẻ tấn công bỏ qua frontend hoàn toàn:
curl -X POST https://api.shop.com/orders \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"productId": 42, "quantity": -5, "price": 0.01}'
# Nếu backend không validate lại → quantity âm có thể thành "hoàn tiền", price=0.01 được chấp nhận.
```

> ⚠️ Lỗ hổng: Mọi dữ liệu **vượt qua một trust boundary** đều phải được kiểm lại như thể đến từ kẻ thù. "Internal service nên tin được" là giả định đã làm sập vô số hệ thống — một service bị chiếm là cả mạng nội bộ thành vùng tấn công. Đây là tư tưởng cốt lõi của **Zero Trust**: không tin vào vị trí mạng, chỉ tin vào danh tính đã xác thực.

## 4. STRIDE — bộ khung 6 loại threat

Ngồi nhìn một thiết kế và "nghĩ xem có thể bị hack thế nào" rất dễ bỏ sót. **STRIDE** (của Microsoft) là checklist 6 loại threat, mỗi loại tấn công vào một thuộc tính bảo mật. Đi qua từng cái cho từng thành phần, bạn sẽ không quên loại nào.

| STRIDE | Threat | Vi phạm thuộc tính | Ví dụ cụ thể | Phòng thủ chính |
|---|---|---|---|---|
| **S**poofing | Giả danh người/hệ thống khác | Authentication | Đoán/đánh cắp token, giả mạo email gửi | Auth mạnh, MFA, **passkeys**, mTLS |
| **T**ampering | Sửa dữ liệu trái phép | Integrity | Sửa `price` trong request, sửa cookie quyền | Validate, ký dữ liệu (HMAC/JWT signature), checksum |
| **R**epudiation | Chối bỏ hành động đã làm | Non-repudiation | "Tôi không hề chuyển tiền đó" mà không có log | Audit log bất biến, ký giao dịch |
| **I**nformation Disclosure | Lộ thông tin | Confidentiality | Stack trace lộ query, IDOR đọc data người khác | Mã hoá, least privilege, error message chung chung |
| **D**enial of Service | Làm hệ thống ngừng phục vụ | Availability | Query không giới hạn, ReDoS, zip bomb | Rate limit, timeout, quota, input size limit |
| **E**levation of Privilege | Chiếm quyền cao hơn | Authorization | User thường gọi được endpoint admin | Authorization check trên server, least privilege |

Cách dùng thực dụng: với **mỗi thành phần** trong sơ đồ (endpoint, queue, database, service), hỏi 6 câu "Threat này áp dụng ở đây thế nào?". Phần lớn sẽ không liên quan — nhưng cái còn lại chính là lỗ hổng bạn suýt bỏ sót.

## 5. Data Flow Diagram — vẽ ra để thấy được threat

Bạn không thể threat-model thứ mình không nhìn thấy. **Data Flow Diagram (DFD)** là bản vẽ tối giản: dữ liệu chảy từ đâu, qua đâu, dừng ở đâu, và **đường biên tin cậy** nằm chỗ nào. Bốn ký hiệu là đủ:

- **External entity** (người dùng, bên thứ ba) — hình chữ nhật.
- **Process** (service, function xử lý) — hình tròn.
- **Data store** (DB, cache, S3) — hai gạch song song.
- **Data flow** (mũi tên) — và quan trọng nhất: **trust boundary** vẽ bằng đường đứt nét cắt ngang các flow.

```
   ┌─────────┐   HTTPS    ╔═══════════╗   SQL    ┌──────────┐
   │ Browser │ ─────────▶ ║  API svc  ║ ───────▶ │ Postgres │
   │ (user)  │ ◀───────── ║ (process) ║ ◀─────── │  (store) │
   └─────────┘            ╚═══════════╝          └──────────┘
        ╎  ◀── trust boundary ──▶  ╎  ◀── trust boundary ──▶
     KHÔNG TIN              VÙNG CỦA TA            DỮ LIỆU NHẠY CẢM
```

Mỗi mũi tên cắt qua một đường đứt nét = một nơi **bắt buộc** có authentication, validation và mã hoá. Cứ chỗ nào flow vượt boundary mà thiếu một trong ba thứ đó, bạn vừa tìm ra một threat.

## 6. Ba nguyên tắc phòng thủ nền tảng

### Defense in Depth — phòng thủ nhiều lớp

Đừng đặt cược toàn bộ vào một lớp bảo vệ. Giả định **mỗi lớp sẽ thủng**, và đảm bảo còn lớp sau đỡ. Một request độc hại lý tưởng phải vượt qua: WAF → rate limiter → authentication → authorization → input validation → parameterized query → least-privilege DB user → mã hoá at-rest.

```
Kẻ tấn công ──▶ [WAF] ──▶ [Auth] ──▶ [AuthZ] ──▶ [Validate] ──▶ [DB user chỉ READ]
                  ✗ thủng?    ✗ thủng?    ✗ thủng?     ✗ thủng?      vẫn không xoá được data
```

Nếu firewall thủng mà DB dùng user có quyền `DROP TABLE`, bạn mất tất cả. Nếu DB user chỉ có `SELECT` trên đúng schema cần thiết, thiệt hại bị chặn lại ngay cả khi mọi lớp trên đã vỡ.

### Least Privilege — quyền tối thiểu

Mỗi thành phần (người, service, token, DB user) chỉ nên có **đúng** quyền nó cần để làm việc, không hơn một chút. Đây là nguyên tắc giới hạn **blast radius** — khi một phần bị chiếm, thiệt hại không lan ra cả hệ thống.

```diff
# Service "đọc báo cáo" nhưng được cấp quyền god-mode
- GRANT ALL PRIVILEGES ON *.* TO 'report_service';

# Chỉ cấp đúng quyền đọc trên đúng bảng
+ GRANT SELECT ON analytics.daily_orders TO 'report_service';
+ GRANT SELECT ON analytics.daily_revenue TO 'report_service';
```

### Fail Securely — hỏng thì hỏng theo hướng an toàn

Khi có lỗi, hệ thống phải **mặc định từ chối**, không mặc định cho qua. Lỗi là lúc kẻ tấn công khai thác nhiều nhất.

```python
# ⚠️ Fail open: lỗi khi check quyền → cho qua. Thảm hoạ.
def can_access(user, resource):
    try:
        return auth_service.check(user, resource)
    except Exception:
        return True   # "để khỏi chặn nhầm user thật" — và mở toang cho kẻ tấn công

# ✅ Fail secure: lỗi → từ chối, và log lại để điều tra
def can_access(user, resource):
    try:
        return auth_service.check(user, resource)
    except Exception as e:
        logger.error("authz check failed", exc_info=e)
        return False  # không chắc thì KHÔNG cho
```

Lưu ý: "fail securely" không phải lúc nào cũng là "fail closed". Với hệ thống *availability* là tối thượng (ví dụ mở cửa thoát hiểm khi cháy), fail **open** mới an toàn. Bảo mật luôn là chọn đúng hướng hỏng theo ngữ cảnh — đó chính là lý do phải threat-model trước.

> 💡 Nguyên tắc: Defense in Depth giả định *các lớp sẽ thủng*. Least Privilege giới hạn *thiệt hại khi thủng*. Fail Securely quyết định *hành vi lúc thủng*. Ba nguyên tắc này phối hợp để biến một sự cố từ "mất sạch" thành "mất một phần, phát hiện được, khôi phục được".

## 7. Bảo mật là quá trình, không phải feature

Một hệ thống "an toàn hôm nay" có thể "thủng ngày mai" mà không cần ai động vào code của bạn:
- Một **CVE** mới được công bố trong dependency bạn đang dùng.
- Một kỹ thuật tấn công mới ra đời (như cách AI thay đổi phishing và tự động dò lỗ hổng).
- Một feature mới của đồng đội mở thêm attack surface.
- Một secret bị commit nhầm lên Git lúc 2 giờ sáng.

Vì vậy bảo mật là **vòng lặp liên tục**, không phải checkbox ký một lần:

```
Threat Model ─▶ Thiết kế phòng thủ ─▶ Triển khai ─▶ Giám sát & phát hiện
      ▲                                                      │
      └──────────────  Học từ sự cố, lặp lại  ◀──────────────┘
```

Threat model nên **sống cùng** thiết kế: làm khi thiết kế feature mới, cập nhật khi kiến trúc đổi, xem lại sau mỗi incident. Một threat model viết một lần rồi cất tủ thì vô dụng.

## 8. Ví dụ thực chiến: threat-model một API đặt hàng

Giả sử `POST /orders` cho phép user đã đăng nhập đặt hàng. Ta đi qua quy trình 4 bước chuẩn.

**Bước 1 — Vẽ DFD & xác định tài sản.** Browser (không tin) → API (vùng ta) → Postgres (tài sản: đơn hàng, thông tin thanh toán). Trust boundary: giữa browser và API, giữa API và DB.

**Bước 2 — Áp STRIDE lên từng phần:**

| Threat (STRIDE) | Kịch bản tấn công cụ thể | Phòng thủ |
|---|---|---|
| **S** Spoofing | Dùng lại token của user khác lấy từ log | Token ngắn hạn, không log token, ràng buộc token với device |
| **T** Tampering | Gửi `{"price": 0.01}` hoặc `quantity: -5` | **Không bao giờ tin giá từ client** — server tự tra giá từ DB; validate range |
| **R** Repudiation | "Tôi không đặt đơn này" | Ghi audit log: ai, khi nào, từ IP nào, kèm request id |
| **I** Info Disclosure | `GET /orders/123` đọc đơn của người khác (IDOR) | Authorization: kiểm `order.userId == currentUser.id` |
| **D** DoS | Đặt 1 triệu đơn/giây, body 50MB | Rate limit per-user, giới hạn body size, idempotency key |
| **E** Elevation | User thường gọi `POST /orders/refund` của admin | Authorization check theo role trên **mọi** endpoint nhạy cảm |

**Bước 3 — Sửa code theo threat tìm được:**

```typescript
// ⚠️ TRƯỚC: tin client, không validate, không authz
app.post("/orders", async (req, res) => {
  const { productId, quantity, price } = req.body;        // tin giá từ client (Tampering)
  const order = await db.orders.create({
    userId: req.body.userId,                              // tin userId từ body (Spoofing)
    productId, quantity, total: quantity * price,
  });
  res.json(order);
});
```

```typescript
// ✅ SAU: phòng thủ theo STRIDE
app.post("/orders",
  rateLimit({ perUser: 20, windowSec: 60 }),             // D: chống DoS
  requireAuth,                                            // S: xác thực thật
  async (req, res) => {
    // T: validate input, KHÔNG tin giá từ client
    const { productId, quantity } = OrderSchema.parse(req.body); // ném lỗi nếu sai schema
    if (quantity < 1 || quantity > 100) {
      return res.status(422).json({ error: "Invalid quantity" });
    }
    // T: server tự tra giá, client không quyết định giá
    const product = await db.products.findById(productId);
    if (!product) return res.status(404).json({ error: "Not found" });

    // userId LẤY TỪ TOKEN, không lấy từ body (S + E)
    const userId = req.auth.userId;

    const order = await db.orders.create({
      userId,
      productId,
      quantity,
      total: product.price * quantity,                   // giá đáng tin từ DB
    });
    // R: audit log để không thể chối bỏ
    audit.log({ event: "order.created", userId, orderId: order.id, ip: req.ip });
    res.status(201).json({ id: order.id, total: order.total }); // I: chỉ trả field cần
  });
```

**Bước 4 — Đánh giá rủi ro còn lại & giám sát.** Không phải threat nào cũng phải xử lý ngay — đánh giá theo *khả năng xảy ra × thiệt hại*. Với threat chấp nhận tạm, thêm **giám sát** (alert khi có quá nhiều 422, hoặc nhiều 403 từ một user → dấu hiệu đang dò IDOR).

## Checklist threat modeling thực dụng

Dán cái này lên mỗi khi review một design mới:

- [ ] Đã vẽ **DFD** và đánh dấu **trust boundary** chưa?
- [ ] Liệt kê **tài sản** quan trọng (theo CIA) và ai có động cơ tấn công?
- [ ] Đi qua **STRIDE** cho từng thành phần — không bỏ loại nào?
- [ ] Mọi input **vượt trust boundary** đều được validate lại ở **server**?
- [ ] **Không bao giờ** tin giá tiền, userId, role, quyền hạn từ client?
- [ ] Mỗi service/token/DB user chỉ có **least privilege**?
- [ ] Có **defense in depth** — không lớp nào là điểm chết duy nhất?
- [ ] Lỗi và edge case **fail securely** (mặc định từ chối)?
- [ ] Có **audit log** cho hành động nhạy cảm (chống repudiation)?
- [ ] Error message **không lộ** stack trace / query / cấu trúc nội bộ?
- [ ] Có **rate limit / quota / size limit** chống DoS?
- [ ] Threat model này có **lịch xem lại** sau incident / đổi kiến trúc?

## Liên hệ sang AWS

Threat modeling không thay đổi khi lên cloud — chỉ là các "lớp phòng thủ" có tên dịch vụ AWS cụ thể. Ánh xạ những khái niệm trong bài sang đồ nghề AWS:

| Khái niệm trong bài | Dịch vụ / cơ chế AWS |
|---|---|
| **Least Privilege**, authorization | **IAM** policy tối thiểu, IAM Roles thay vì access key dài hạn, `Condition` giới hạn theo IP/MFA; **SCP** chặn ở cấp tổ chức |
| **Confidentiality**, mã hoá | **KMS** quản lý khoá, mã hoá at-rest (S3/EBS/RDS), **Secrets Manager** cho secret (chống lộ trong code) |
| **Attack surface**, lọc input độc | **WAF** chặn SQLi/XSS/bad bot ở rìa, **Shield** chống DDoS (DoS) |
| **Trust boundary**, phân vùng mạng | **VPC**, Security Group, NACL, PrivateLink — service nội bộ không phơi ra internet |
| **Repudiation**, audit log bất biến | **CloudTrail** ghi mọi API call, **CloudWatch Logs**, log gửi sang account riêng chỉ-ghi |
| **Phát hiện threat** (giám sát) | **GuardDuty** (phát hiện hành vi bất thường), **Security Hub** (tổng hợp), **Inspector** (quét CVE), **Macie** (phát hiện data nhạy cảm) |
| **Spoofing**, xác thực mạnh | **Cognito** (MFA, passkeys/WebAuthn), IAM Identity Center cho nhân viên |

> 💡 Nguyên tắc: Trên AWS, mỗi mũi tên vượt trust boundary trong DFD của bạn nên ánh xạ thành một control cụ thể — IAM cho authorization, KMS cho confidentiality, CloudTrail cho non-repudiation, GuardDuty cho phát hiện. Threat model là *bản thiết kế*; các dịch vụ này là *vật liệu xây dựng*. Vẽ trước, mua đồ nghề sau.
