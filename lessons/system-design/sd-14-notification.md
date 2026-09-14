# Case study: Notification System

Notification System bị đánh giá thấp một cách kinh điển: nhìn từ xa nó chỉ là "nhận event rồi gọi API của APNs/Twilio/SendGrid". Nhưng chính vì thế nó là bài đo **kinh nghiệm vận hành thật** chuẩn nhất trong bộ case study, vì toàn bộ độ khó nằm ở chỗ **bạn không kiểm soát chặng cuối**. Cái quyết định notification có tới tay người dùng là APNs, là nhà mạng, là Gmail — ba hệ thống có quota riêng, chế độ lỗi riêng, chính sách riêng, và không ai trong số đó quan tâm tới SLA của bạn. Hệ thống của bạn vì thế không phải "bên gửi" mà là **một cái đệm thông minh giữa hàng triệu event bùng nổ không đều và ba cái vòi chảy chậm, chảy khác nhau, thỉnh thoảng khoá lại**.

Thêm một tầng khó mà bản vẽ không thể hiện: notification là thứ **người dùng nhìn thấy trực tiếp**. Một cache miss thì không ai biết; một notification gửi trùng ba lần lúc 2 giờ sáng thì ngày mai có người gỡ app — và nếu đó là email thì complaint tăng, và nếu complaint tăng đủ thì **domain gửi mail của công ty chết**, một sự cố không lệnh rollback nào chữa được trong ngày.

> 💡 **Nguyên tắc xuyên suốt**: ở bài này bạn không thiết kế tốc độ — bạn thiết kế **cách xếp hàng, cách thất bại, và cách không làm phiền người dùng**. Throughput là hệ quả, không phải mục tiêu.
---

## 1. Làm rõ yêu cầu

### 1.1 Functional

| # | Yêu cầu | Ghi chú chốt phạm vi |
|---|---|---|
| F1 | **3 kênh**: mobile push (iOS + Android), SMS, email | Web/in-app coi là biến thể của push |
| F2 | Nguồn kích hoạt: service nội bộ, cron/scheduler, campaign do marketing bấm | Ba nguồn có đặc tính tải hoàn toàn khác nhau (§12) |
| F3 | Opt-in/opt-out theo **từng kênh và từng loại** | Yêu cầu pháp lý, không phải tính năng đẹp |
| F4 | Template + personalization + đa ngôn ngữ | Không để service gọi tự ghép chuỗi |
| F5 | Gửi theo lịch và **theo múi giờ người nhận** | Mặc định của mọi hệ thống thật |
| F6 | Theo dõi trạng thái: enqueued / sent / delivered / opened / bounced | Tracking là nửa giá trị của hệ thống |
| F7 | **Ưu tiên**: OTP và cảnh báo bảo mật vượt mặt marketing | Một hàng đợi chung là sai từ gốc (§11) |

### 1.2 Non-functional

| # | Yêu cầu | Con số cụ thể |
|---|---|---|
| N1 | Soft real-time | Giao dịch p99 < 10 giây tới provider; marketing vài chục phút là đủ |
| N2 | **Không mất** | At-least-once. Mất OTP là sự cố; gửi trùng là phiền nhưng chấp nhận được — điều này định hình toàn bộ §7 |
| N3 | Scale | 10M push + 1M SMS + 5M email mỗi ngày; chịu campaign 10 triệu người trong 1 giờ |
| N4 | Availability | Một kênh chết không kéo kênh khác chết theo (bulkhead) |
| N5 | Chi phí | SMS đắt gấp ~100 lần email → thiết kế phải cho phép hạ cấp kênh |

### 1.3 Giả định và ba câu hỏi cần hỏi lại

Giả định chốt: đây là **nền tảng dùng chung nội bộ** (các team khác gọi vào), người dùng đã đăng nhập nên có `user_id` ổn định, và **dùng third-party provider, không tự xây** (không ai tự đấu nối SS7 để gửi SMS).

1. **"Có cần đảm bảo thứ tự không?"** Không cần thì song song hoá thoải mái. Cần thứ tự trong phạm vi một user ("đang giao" phải tới trước "đã giao") thì phải partition theo `user_id` và mất khả năng scale worker tuỳ ý. Phần lớn hệ thống thật **không** cần — nhưng phải hỏi để biết mình được miễn.
2. **"Ai quyết định *có nên gửi* — bên gọi hay chúng ta?"** Câu hỏi kiến trúc quan trọng nhất của bài. Nếu service chỉ là "ống dẫn ngu" thì mỗi team gọi phải tự kiểm tra opt-out, và chắc chắn có team quên. Tôi chọn ngược lại: **service là nơi thực thi chính sách**, bên gọi chỉ nói "có event này với user này".
3. **"Notification có phải bản ghi pháp lý không?"** Hoá đơn, thông báo đổi điều khoản, cảnh báo bảo mật thường phải lưu bằng chứng nhiều năm — quyết định notification log là bảng tạm 30 ngày hay kho archive dài hạn.

> ⚠️ **Bẫy ở bước này**: nhảy thẳng vào "dùng queue rồi có worker" mà chưa chốt hệ thống có được phép gửi trùng không. Không nói rõ at-least-once thì toàn bộ phần dedupe ở §7 trông như tính năng thừa.
---

## 2. Back-of-envelope — con số nào dẫn tới quyết định nào

Ước lượng ở đây không nhằm ra "cần bao nhiêu server", mà trả lời ba câu: **peak bao nhiêu**, **cần bao nhiêu worker**, **log tốn bao nhiêu**.

### 2.1 QPS trung bình và peak

```
Push : 10.000.000 / 86.400 ≈ 116 msg/s        Email: 5.000.000 / 86.400 ≈ 58 msg/s
SMS  :  1.000.000 / 86.400 ≈  12 msg/s        Tổng trung bình        ≈ 186 msg/s
```

Con số trung bình này gần như **vô dụng**, và phải nói rõ vì sao: notification có ba dạng tải chồng lên nhau — nền giao dịch đều đều, đỉnh theo giờ (8–10h và 19–22h), và **campaign**: một cú bấm nút đẩy 10 triệu message vào hệ thống trong vài phút.

```
   msg/s
 16k│                                  ╱╲  ← campaign: 10M trong 10 phút
    │                                 ╱  ╲    ≈ 16.000 msg/s
  1k│        ╭──╮          ╭────╮    │   │
    │   ╭────╯  ╰──────────╯    ╰────╯   ╰────
 100│───╯  nền giao dịch ~200–800 msg/s
    └────────────────────────────────────────── giờ
      0    6     9    12    15    19   21    24
```

Chỉ tính peak giao dịch thì hệ số peak/avg khoảng 3–5× → **~600–900 msg/s**. Campaign đẩy đỉnh lên **hai bậc độ lớn**, và đây là con số dẫn tới quyết định kiến trúc quan trọng nhất của bài:

> 💡 Bạn **không** provision cho 16.000 msg/s. Bạn provision cho ~1.000 msg/s và dùng **queue để trải campaign ra theo thời gian** — nó không cần tới trong 10 phút, nó cần tới trong 1–2 giờ. Queue ở đây không phải khẩu hiệu "decouple"; nó là **bộ chuyển đổi giữa tốc độ sản xuất bùng nổ và tốc độ tiêu thụ bị provider giới hạn**.

### 2.2 Bao nhiêu worker

Little's Law trá hình: mỗi message chủ yếu **chờ mạng**, không tốn CPU.

```
latency gọi provider ≈ 100 ms (APNs HTTP/2) · 300 ms (SMS) · 150 ms (email, batch 50)
throughput 1 luồng đồng bộ = 1/0,1s = 10 msg/s  →  1.000 msg/s ÷ 10 = 100 luồng
```

100 luồng OS chỉ để ngồi chờ socket là lãng phí — đây là lý do worker **phải viết bất đồng bộ**, một process async giữ 500 request đang bay chỉ tốn vài chục MB. Với APNs còn một chi tiết quan trọng: nó dùng **HTTP/2 multiplexing**, một connection giữ được hàng nghìn stream — nên thiết kế đúng là **ít connection, nhiều stream, giữ lâu**. Mở connection TLS mới cho mỗi push là cách chắc chắn nhất để vừa chậm vừa bị APNs phạt.

### 2.3 Storage

```
Device token: 100M user × 1,5 thiết bị × ~300 B  ≈ 45 GB
Notification log: 16M msg/ngày × ~500 B ≈ 8 GB/ngày ≈ 240 GB/tháng ≈ 2,9 TB/năm
```

45 GB là bé — **access pattern** mới quyết định: luôn point lookup theo `user_id`, không bao giờ scan → chân dung kinh điển của **KV/wide-column store**, không phải bảng quan hệ có join.

2,9 TB/năm dẫn tới một quyết định cụ thể: **tách log nóng và log lạnh**. Log nóng (7–30 ngày) phục vụ dedupe, retry, và trả lời "notification của tôi đâu?" — cần point query nhanh, để trong KV store có TTL. Log lạnh phục vụ analytics và audit — chảy sang **object storage dạng cột (Parquet)**, truy vấn bằng SQL on-demand, rẻ hơn một tới hai bậc. Và **tracking event (open/click) nhiều hơn số message gửi đi** — đó là luồng dữ liệu riêng, phải đi qua stream chứ không ghi thẳng vào DB chính.

| Con số | Dẫn tới quyết định |
|---|---|
| Peak campaign 16.000 msg/s vs nền 1.000 msg/s | Queue bắt buộc; provision theo nền, trải campaign theo thời gian |
| Worker I/O-bound, ~10 msg/s mỗi luồng đồng bộ | Worker async, connection giữ lâu, HTTP/2 multiplexing |
| 150M token, luôn point lookup theo user_id | KV/wide-column store |
| Log 2,9 TB/năm | Hot log có TTL + cold log Parquet trên object storage |
| Tracking event > số message | Đường dữ liệu riêng, qua stream |
---

## 3. Ba kênh, ba hệ thống khác nhau — và vì sao không được coi chúng như nhau

Sai lầm phổ biến nhất là trừu tượng hoá ba kênh thành một `send(message)` rồi coi như xong. Chúng khác nhau ở **mọi chiều vận hành quan trọng**: định danh người nhận, chế độ lỗi, độ trễ, giá tiền, và ai có quyền đá bạn ra.

### 3.1 Mobile push

Push không đi thẳng từ server của bạn tới điện thoại. Nó đi qua **một cái cổng do Apple hoặc Google sở hữu**, cổng đó giữ sẵn kết nối bền tới mọi thiết bị, và bạn chỉ được *nhờ* nó đẩy hộ.

```
 ┌──────────────┐  HTTP/2 + JWT(.p8)  ┌────────┐  kết nối bền  ┌──────────┐
 │ Worker (iOS) │────────────────────▶│  APNs  │──────────────▶│ iPhone   │
 └──────────────┘   device token       └────────┘  (Apple giữ)  └──────────┘
 ┌──────────────┐  HTTP v1 + OAuth2   ┌────────┐               ┌──────────┐
 │ Worker (And) │────────────────────▶│  FCM   │──────────────▶│ Android  │
 └──────────────┘  registration token └────────┘               └──────────┘
```

**APNs (iOS).** Xác thực bằng **token-based auth** (khoá `.p8`, JWT ký ES256) — nên dùng thay cho certificate `.p12` vì JWT không hết hạn theo năm và dùng chung cho nhiều app cùng team. Giao thức HTTP/2, mỗi push là một request có response ngay. Ba mã phải xử lý riêng: `410 Unregistered` (token chết — **xoá khỏi DB, không retry**), `429` (đang bị throttle cho device đó), `400 BadDeviceToken` (sai định dạng, hoặc nhầm môi trường sandbox/production — lỗi cấu hình rất phổ biến). Hai header đáng nhớ: `apns-collapse-id` cho phép **ghi đè** notification cũ chưa đọc bằng cái mới (tỉ số trận đấu chỉ cần cái mới nhất), và `apns-priority: 5` cho phép OS gom nhóm để tiết kiệm pin — dùng priority 10 cho mọi thứ là cách nhanh nhất để bị tắt notification.

**FCM (Android).** Xác thực OAuth2 service account (HTTP v1; API key legacy đã bị khai tử). Khác biệt thực tế lớn nhất: FCM phân biệt **notification message** (OS tự hiển thị khi app ở background) và **data message** (app tự xử lý), và hành vi khi app bị kill khác nhau tuỳ hãng máy — trên các ROM Xiaomi/Huawei/Oppo, FCM có thể **không được chạy nền**, nên các thị trường đó cần tích hợp thêm push service của hãng. FCM cũng có **topic**: thiết bị tự subscribe, bạn gửi một request và Google fan-out hộ — rẻ cho broadcast nhưng **mất personalize và mất log per-user** (§12.4).

**Điểm chung của push:** nó **best-effort**. Thiết bị tắt nguồn hay mất mạng → APNs/FCM giữ message một thời gian (`apns-expiration` / `ttl`) rồi vứt. Một `200 OK` chỉ có nghĩa **Apple đã nhận**, không có nghĩa người dùng đã thấy. Nói được câu này là điểm cộng rõ ràng.

### 3.2 SMS

SMS đi qua aggregator (Twilio, Vonage, SNS) rồi qua **nhà mạng** — một thế giới khác hẳn về quy tắc:

- **Đắt**: đơn giá cao hơn email hai bậc độ lớn. Hệ quả thiết kế thật: SMS phải có rate limit theo user cứng hơn mọi kênh khác, và một bug retry vô hạn ở kênh này là bug *tài chính*.
- **Có quy định pháp lý**: nhiều nước bắt đăng ký sender ID/brandname và nội dung mẫu; vi phạm thì bị chặn **ở tầng nhà mạng**, không phải bị trả lỗi API.
- **Throughput bị giới hạn cứng**: aggregator cấp 1–100 tin/giây tuỳ loại số. Vượt thì bị throttle hoặc bị xếp hàng vô thời hạn phía họ — tệ hơn bị từ chối, vì bạn không biết.
- **Trạng thái tới muộn, qua webhook**: `queued → sent → delivered/undelivered` là luồng bất đồng bộ kéo dài hàng chục giây tới vài phút. Kiến trúc vì thế phải có đường **callback đi ngược**, không chỉ đường gửi đi.

### 3.3 Email

Rẻ nhất, dung nạp nhất, và **nguy hiểm nhất về lâu dài** — vì gửi sai làm hỏng một tài sản khó khôi phục: **danh tiếng miền gửi (sender reputation)**.

- **SPF, DKIM, DMARC** là điều kiện cần. Thiếu thì mail vào spam và bạn không biết vì sao.
- Hai loại lỗi khác nhau hoàn toàn: **hard bounce** (địa chỉ không tồn tại → suppression **vĩnh viễn**) và **soft bounce** (hộp thư đầy, lỗi tạm → retry có giới hạn).
- **Complaint** (bấm "báo cáo spam") đi ngược về qua feedback loop; vượt ~0,1% là bị hạn chế, vượt 0,5% có thể bị đình chỉ (§13.4).
- Email **batch được nhiều địa chỉ trong một request** — đòn bẩy throughput duy nhất trong ba kênh, đổi lại phải phân giải được địa chỉ nào trong lô bị lỗi.

### 3.4 Bảng đối chiếu — thứ nên vẽ ra trong interview

| Chiều | Mobile push | SMS | Email |
|---|---|---|---|
| Định danh người nhận | Device token (đổi thường xuyên) | Số điện thoại (ổn định) | Địa chỉ email (ổn định) |
| Số đích/user | **n** (nhiều thiết bị) | 1 | 1–2 |
| Đảm bảo giao | Best-effort, không đảm bảo | Nhà mạng quyết, có DLR | SMTP retry, có bounce |
| Độ trễ điển hình | < 1 giây | 1–30 giây | Vài giây – vài phút |
| Giá tương đối | ~0 | **Cao nhất (≈100×)** | Rất thấp |
| Lỗi vĩnh viễn đặc trưng | `410` → **xoá token** | Số không tồn tại/bị chặn | Hard bounce → **suppress** |
| Cơ chế throttle | Per-device + per-connection | tps theo hợp đồng | Quota/24h + tốc độ/giây |
| Rủi ro dài hạn khi làm sai | User tắt notification | Đốt tiền, vi phạm quy định | **Chết reputation miền** |
| Batch được không | Không (trừ topic) | Không | **Có** |

> 💡 Bảng này chính là lý do kỹ thuật cho §6.3: ba kênh có tốc độ tiêu thụ, cơ chế retry và hạn mức khác nhau nên **không thể chia sẻ một hàng đợi** — chung queue thì đặc tính của kênh chậm nhất áp đặt lên kênh nhanh nhất.
---

## 4. Thu thập và quản lý device token — phần âm thầm làm hỏng hệ thống

Đây là phần bị bỏ qua nhiều nhất và gây nhiều sự cố nhất, vì một lý do: **device token không phải định danh ổn định**. Nó đổi khi cài lại app, khôi phục sang máy mới, xoá dữ liệu app, hoặc khi Apple/Google xoay token. Hệ thống nào coi token như email (gán một lần rồi thôi) sẽ tích tụ một núi token chết và tự bơm tỉ lệ lỗi của mình lên.

### 4.1 Flow đăng ký — và bốn chỗ hay sai

```
 ┌────────┐ ① xin quyền notification → OS → người dùng đồng ý
 │  App   │ ② OS trả device token
 │        │ ③ POST /v1/devices {token, platform, app_version, locale, tz}
 └───┬────┘    + Bearer access_token   ← user_id lấy từ TOKEN, không từ body
     ▼
 ┌──────────────────┐ ④ upsert theo (token) — KHÔNG theo (user_id)
 │  Device Service  │ ⑤ ghi last_seen_at mỗi lần app mở      ──▶ DeviceTable
 └──────────────────┘
```

**(a) `user_id` lấy từ access token, không bao giờ từ body.** Nếu client tự khai, bất kỳ ai cũng đăng ký được thiết bị của mình dưới tên người khác và nhận toàn bộ notification của họ — lỗ hổng chiếm quyền thông tin, không phải lỗi nhỏ.

**(b) Upsert theo `token`, không phải theo `user_id`** — chỗ sai tinh vi nhất. Một máy có thể lần lượt được hai người đăng nhập (máy dùng chung, máy bán lại). Khoá theo `user_id` thì token cũ vẫn trỏ tới user cũ → **người mới nhận notification của người cũ**. Khoá đúng là `token`; khi upsert gặp token đã có chủ khác thì **chuyển chủ sở hữu**, không tạo thêm dòng.

**(c) Đăng ký lại mỗi lần app khởi động**, không chỉ lần đầu; đồng thời cập nhật `last_seen_at`, `app_version`, `locale`, `timezone` — bốn trường này nuôi toàn bộ §9 và §10.

**(d) Logout phải gỡ liên kết token.** Quên bước này là nguyên nhân số một của bug "tôi đã logout mà vẫn nhận thông báo của tài khoản cũ".

### 4.2 Quan hệ user ↔ device là n-n, không phải 1-n

Trực giác nói "một user nhiều thiết bị" → 1-n. Thực tế là **n-n theo thời gian**: một thiết bị lần lượt thuộc nhiều user, một user có nhiều thiết bị, và một thiết bị có thể có **nhiều tài khoản đăng nhập song song** (rất phổ biến ở app tài chính, mạng xã hội).

```
┌───────────┐        ┌──────────────────┐        ┌────────────┐
│  users    │1      n│  user_devices    │n      1│  devices   │
│ user_id PK│────────│ user_id  (PK)    │────────│ token PK   │
│ email     │        │ token    (SK)    │        │ platform   │
│ phone     │        │ linked_at        │        │ locale, tz │
│ locale/tz │        │ active           │        │ last_seen  │
└───────────┘        └──────────────────┘        └────────────┘
```

Trong KV store: một item mỗi cặp, `PK = USER#<user_id>`, `SK = DEVICE#<token>`, cộng **chỉ mục ngược** `TOKEN#<token>` để trả lời "token này đang thuộc về ai" — cần cho việc chuyển chủ ở §4.1(b) và cho xử lý `410` ở §4.3. Cùng dữ liệu, hai đường đọc, vì có hai câu hỏi thật sự khác nhau.

| Mô hình | Ưu | Nhược | Khi nào dùng |
|---|---|---|---|
| Cột `device_token` trên bảng user | Đơn giản nhất | Chỉ 1 thiết bị/user | Không bao giờ, trừ prototype |
| Bảng `devices` có FK `user_id` (1-n) | Dễ hiểu | Không mô tả được đổi chủ / multi-account | App một tài khoản |
| Bảng liên kết n-n + chỉ mục ngược | Đúng ngữ nghĩa | Thêm một đường ghi | **Mặc định nên chọn** |

### 4.3 Token chết — hai kiểu, hai cách dọn

**Chết đột ngột, provider báo ngay**: APNs `410 Unregistered`, FCM `UNREGISTERED`/`INVALID_ARGUMENT`. Tín hiệu chắc chắn → xoá ngay, không retry. Hệ thống không xử lý mã này sẽ thấy tỉ lệ lỗi push tăng đều theo năm mà không hiểu vì sao — thực ra nó đang gửi vào một nghĩa địa token.

**Chết âm thầm**: người dùng gỡ app hoặc tắt notification ở cấp OS, provider vẫn trả 200. Cách phát hiện duy nhất là heuristic theo `last_seen_at`: không mở app 90–180 ngày thì coi là ngủ đông — dừng gửi marketing, vẫn giữ notification giao dịch. Ngưỡng là quyết định sản phẩm, nhưng **phải có một ngưỡng**.

```
 đăng ký ──▶ ACTIVE ──(410/UNREGISTERED)──▶ DELETED
               │
               ├──(không mở app 90 ngày)──▶ DORMANT ──(mở lại)──▶ ACTIVE
               └──(user logout)──▶ UNLINKED (giữ device, bỏ liên kết user)
```

> ⚠️ **Bẫy**: xử lý `410` bằng cách xoá theo `user_id`. User có 3 thiết bị, một cái chết, bạn vừa xoá cả ba. Luôn xoá đúng cặp `(user, token)` — lý do nữa cần chỉ mục ngược.

> 💡 Theo dõi **tỉ lệ token chết trên tổng token** như một metric sức khoẻ: tăng chậm là bình thường, tăng đột ngột nghĩa là luồng đăng ký đang sai (đổi cấu hình sandbox/production, đổi bundle id, hoặc bản app mới quên gọi đăng ký).
---

## 5. API design — tối giản nhưng đúng chỗ

```http
POST /v1/notifications
Authorization: Bearer <service-token>        ← định danh SERVICE gọi, không phải user
Idempotency-Key: order-9f31-shipped-v1       ← bắt buộc, xem §7.2

{
  "user_id": "u_8871",
  "template_id": "order_shipped",            ← KHÔNG gửi nội dung thô
  "params": { "order_id": "A-1029", "eta": "2026-09-16T10:00:00Z" },
  "locale_hint": "vi-VN",
  "category": "transactional.shipping",      ← dùng cho opt-out (§10)
  "priority": "normal",                      ← critical | normal | bulk (§11)
  "channels": ["push", "email"],             ← GỢI Ý, không phải mệnh lệnh
  "send_at": null,
  "send_in_user_timezone": "09:00"           ← tuỳ chọn (§9.3)
}

202 Accepted   { "notification_id": "n_01J9...", "status": "accepted" }
```

Bốn quyết định thiết kế nằm trong payload này:

1. **`template_id` + `params`, không phải `body`.** Cho bên gọi gửi chuỗi ghép sẵn là vĩnh viễn mất i18n tập trung, mất A/B test, mất khả năng sửa lỗi chính tả mà không deploy 12 service, mất kiểm duyệt nội dung. Đây là ranh giới trách nhiệm quan trọng nhất của hệ thống.
2. **`channels` là gợi ý.** Quyết định cuối thuộc về notification service sau khi đối chiếu preference (§10), tính khả dụng của kênh và chính sách chi phí. Bên gọi nói *cái gì xảy ra*, hệ thống quyết *nói với ai bằng đường nào*.
3. **`202 Accepted`, không phải `200 OK`.** API này **không** đồng bộ; 202 là hợp đồng rõ ràng: "tôi đã nhận trách nhiệm, hãy theo dõi bằng `notification_id`". Trả 200 tạo kỳ vọng sai cho mọi team tích hợp.
4. **`Idempotency-Key` bắt buộc ở tầng API** — tuyến phòng thủ đầu tiên chống trùng (§7.2), và ép mọi bên gọi nghĩ về khoá này lúc tích hợp thay vì sau sự cố đầu tiên.

```http
POST   /v1/devices                 đăng ký/cập nhật device token (§4)
DELETE /v1/devices/{token}         gỡ liên kết khi logout
GET|PATCH /v1/users/{id}/preferences   (PATCH kèm audit log — có giá trị pháp lý)
GET    /v1/notifications/{id}      trạng thái một notification
POST   /v1/campaigns               tạo campaign theo segment (§12)
POST   /v1/webhooks/{provider}     callback bounce/complaint/DLR từ provider
```

Endpoint webhook dễ bị quên nhất nhưng quan trọng ngang đường gửi: nó là **đường duy nhất** để biết message có tới nơi không và là đường duy nhất nuôi suppression list. Phải xác thực chữ ký và phải **idempotent**, vì provider sẽ gửi lại khi không nhận được 200.
---

## 6. High-level design: từ bản ngây thơ tới bản dùng được

### 6.1 Bản v1 — mọi người đều vẽ cái này trước

```
┌─────────────┐
│ Service A   │─┐   HTTP     ┌────────────────────────┐
│ Service B   │─┼───────────▶│  Notification Server   │──▶ APNs
│ Cron job    │─┘            │  · validate            │──▶ FCM
└─────────────┘              │  · query user/token DB │──▶ Twilio
                             │  · render template     │──▶ SendGrid
                             │  · GỌI THẲNG provider  │
                             └───────────┬────────────┘
                                    ┌────▼────┐
                                    │   DB    │
                                    └─────────┘
```

Bản này **chạy được** — và đó là lý do nó nguy hiểm: nó sống ổn tới ngày có campaign đầu tiên.

**(1) Provider là điểm nghẽn và nó nằm trên đường đồng bộ.** Server gọi HTTP tới bên thứ ba **trong lúc đang giữ request của service gọi**. Twilio chậm từ 200 ms lên 5 giây → mọi luồng bị giữ chờ → pool cạn → service A timeout → service A retry → tải tăng gấp đôi. Một sự cố của nhà cung cấp SMS vừa lan ngược vào luồng checkout của bạn. Đây là **cascading failure**, và là lý do số một để có queue — không phải "decoupling" chung chung.

**(2) SPOF và không scale độc lập được.** Gọi provider là I/O-bound cần trăm luồng chờ; render template là CPU-bound. Hai nhu cầu trái ngược bị ép chạy chung một process, scale chung một hệ số.

**(3) Không có nơi để chứa công việc dở.** Process chết → message đang xử lý biến mất không dấu vết, không retry được vì không biết cái gì fail, và không có back-pressure: 10 triệu message ập tới thì không có chỗ nào để chúng *đợi*.

> ⚠️ Trong interview đừng chỉ nói "v1 có SPOF" — ai cũng nói được. Hãy nói **cơ chế lan truyền**: "provider chậm → luồng bị giữ → pool cạn → caller timeout → caller retry → tải tăng". Đó là khác biệt giữa nhắc lại thuật ngữ và hiểu nó.

### 6.2 Bản v2 — kiến trúc dùng được

```
┌──────────┐  ┌──────────┐  ┌───────────┐
│Service A │  │  Cron /  │  │ Campaign  │
│Service B │  │Scheduler │  │  Console  │
└────┬─────┘  └────┬─────┘  └─────┬─────┘
     └─────────────┼──────────────┘
                   ▼
        ┌────────────────────────┐      ┌─────────────┐
        │  Notification API      │◀────▶│ Idempotency │
        │  · authn service       │      │ store (TTL) │
        │  · validate + dedupe   │      └─────────────┘
        │  · gán priority        │
        └───────────┬────────────┘  ghi log ACCEPTED
                    ▼
        ┌────────────────────────┐      ┌──────────────────┐
        │  Dispatcher / Router   │◀────▶│ Preference store │ (§10)
        │  · resolve user→đích   │◀────▶│ User + Device DB │ (§4)
        │  · chọn kênh thật sự   │◀────▶│ Template store   │ (§9)
        │  · render nội dung     │      └──────────────────┘
        └───┬────────┬────────┬──┘
   ┌────────▼──┐ ┌───▼─────┐ ┌▼──────────┐  ← TÁCH QUEUE THEO KÊNH (§6.3),
   │ Q: push   │ │ Q: sms  │ │ Q: email  │    mỗi kênh tách tiếp theo
   │ crit/norm │ │crit/norm│ │ norm/bulk │    priority (§11)
   │  /bulk    │ │ /bulk   │ │           │
   └────┬──────┘ └───┬─────┘ └───┬───────┘
   ┌────▼──────┐ ┌───▼─────┐ ┌───▼───────┐  ← pool riêng, autoscale riêng,
   │push worker│ │sms wrkr │ │email wrkr │    rate limiter riêng (§8)
   └──┬─────┬──┘ └───┬─────┘ └───┬───────┘
    APNs   FCM    Twilio/SNS   SES/SendGrid
      └─────┴────────┴───────────┴──▶ ┌──────┐
                (lỗi cạn retry)       │ DLQ  │ (§7.4)
                                      └──────┘
   ┌───────────────┐  webhook: bounce/complaint/DLR/open
   │ Callback API  │◀─────────────────────────────────── providers
   └───────┬───────┘
           ├──▶ Notification log (hot, TTL 30 ngày)
           ├──▶ Suppression list (hard bounce, complaint)   (§13.4)
           └──▶ Stream → object storage → analytics         (§13)
```

Ba đường dữ liệu cần nhận ra: **đường gửi đi** (trái sang phải, bất đồng bộ, có queue), **đường phản hồi** (webhook đi ngược, cập nhật trạng thái và suppression), **đường phân tích** (stream sang kho lạnh). Bản v1 chỉ có đường thứ nhất — đó là lý do nó không biết gì về kết quả việc mình làm.

### 6.3 Vì sao phải tách queue theo kênh

Câu hỏi reviewer hay hỏi nhất, và dễ trả lời hời hợt nhất ("cho sạch sẽ"). Lập luận thật có bốn nhánh, đều quy về một điều: **các kênh có đặc tính vật lý không tương thích**.

**(a) Tốc độ tiêu thụ chênh hàng chục lần.** Email batch 50 địa chỉ/request với quota cao; SMS bị giới hạn cứng 10–100 tin/giây. Chung queue thì một chuỗi 100.000 message SMS **chặn đứng** mọi email và push phía sau, dù chúng thừa sức chạy — **head-of-line blocking**, đúng hiện tượng làm HTTP/1.1 chậm.

**(b) Chế độ lỗi không tương thích.** APNs trả 503 → cần backoff và giảm tốc **chỉ kênh push**. Chung queue thì việc giảm tốc đó áp lên cả email và SMS đang khoẻ mạnh: queue chung phá vỡ **bulkhead**, sự cố một khoang làm chìm cả tàu.

**(c) Rate limit phải áp per-provider.** Không có một hạn mức chung mà có ba hạn mức với ba đơn vị khác nhau (push: connection/stream; SMS: tin/giây; email: tin/giây **và** quota/24h). Thực thi ba hạn mức đó trên một pool tiêu thụ một queue cần một mớ logic điều phối phức tạp hơn chính việc tách queue.

**(d) Nhu cầu scale và chi phí khác nhau.** Push cần nhiều connection giữ lâu; email cần CPU render và batch; SMS gần như không tốn tài nguyên nhưng cần kiểm soát chi tiêu rất chặt. Pool riêng cho phép mỗi loại autoscale theo độ sâu queue của chính nó, thay vì theo một tín hiệu trộn lẫn vô nghĩa.

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| Một queue chung | Hạ tầng ít nhất | Head-of-line blocking; sự cố lan ra tất cả; không áp được rate limit riêng | Chỉ hợp hệ thống rất nhỏ, một kênh |
| **Queue theo kênh** | Cách ly lỗi, scale riêng, rate limit riêng | ~3× số hàng đợi | **Mặc định đúng** |
| Queue theo kênh × priority | Thêm: OTP không xếp sau marketing | 6–9 queue, routing phức tạp hơn | Đúng khi có cả OTP lẫn campaign (§11) |
| × thêm region | Tuân thủ dữ liệu theo vùng | Bùng nổ tổ hợp | Chỉ khi có yêu cầu pháp lý |

> 💡 **Cách phát biểu gọn**: *"Tôi tách queue theo kênh vì ba kênh có tốc độ tiêu thụ, cơ chế retry và hạn mức khác nhau. Chung queue thì một lô SMS chậm chặn đầu hàng của email — head-of-line blocking — và một sự cố Twilio buộc tôi giảm tốc cả kênh push đang khoẻ. Queue riêng chính là bulkhead."*
---

## 7. Deep dive 1 — Reliability: at-least-once và cái giá của nó

### 7.1 Vì sao không thể có exactly-once

Chặng cuối là một lời gọi HTTP tới bên thứ ba. Khi nó **timeout**, bạn ở trạng thái không thể phân giải: có thể provider chưa nhận, có thể đã nhận và đã gửi nhưng response mất trên đường về. Không có transaction nào bao trùm cả bạn và Apple.

| Ngữ nghĩa | Cách làm | Hệ quả | Chấp nhận được? |
|---|---|---|---|
| **At-most-once** | Đánh dấu đã gửi *trước* khi gọi; timeout thì bỏ | Không trùng, nhưng **mất** | Không — mất OTP là sự cố |
| **At-least-once** | Chỉ ack *sau* khi provider xác nhận; timeout thì retry | Không mất, nhưng **có thể trùng** | **Có** — kèm dedupe |

Chọn at-least-once là quyết định có ý thức, và hệ quả phải nói ra: **notification sẽ trùng, đôi khi**. Việc của thiết kế là (a) làm nó hiếm bằng dedupe, (b) làm hậu quả nhẹ bằng nội dung idempotent — "Đơn A-1029 đã giao" đọc hai lần thì vô hại, "Bạn vừa được cộng 50.000đ" đọc hai lần thì gây hiểu lầm. Nội dung nên mô tả **trạng thái**, tránh mô tả **delta**.

### 7.2 Dedupe theo event_id — ba tầng

```
① Tầng API — Idempotency-Key do bên gọi cung cấp
   Bắt: caller retry vì timeout, caller deploy giữa chừng, cron chạy 2 lần
   Cách: SET key NX, TTL 24–48h; đã tồn tại → trả lại notification_id CŨ + 202

② Tầng queue/worker — event_id nội bộ (notification_id)
   Bắt: queue giao message 2 lần (bản chất at-least-once của mọi queue)
   Cách: conditional write "chỉ đặt SENDING nếu đang PENDING"

③ Tầng nghiệp vụ — hash(user, template, params) + cửa sổ thời gian
   Bắt: hai event khác nhau nhưng nội dung giống nhau (3 service cùng báo 1 việc)
```

Tầng ① mạnh nhất vì nó chặn trùng **trước khi** tốn tài nguyên, nhưng phụ thuộc việc caller sinh khoá **ổn định**: `order-9f31-shipped-v1` (dẫn xuất từ dữ liệu nghiệp vụ) là đúng, `uuid4()` sinh mới mỗi lần retry là vô dụng. Phải viết rõ trong tài liệu tích hợp — đây là lỗi tích hợp phổ biến nhất.

Tầng ② không thể bỏ dù đã có ①, vì nó bắt loại trùng khác: queue giao lại message do worker chết **sau khi gửi nhưng trước khi ack**. Cài đặt là conditional write có lease:

```
UPDATE notification_log
   SET status='SENDING', attempt=attempt+1, lease_until=now+60s
 WHERE notification_id=? AND (status='PENDING'
                              OR (status='SENDING' AND lease_until < now))
```

Update trả 0 dòng → worker khác đang giữ → ack và bỏ qua. Lease xử lý luôn trường hợp worker chết khi đang giữ. Đây vẫn **không** phải exactly-once — worker cũ có thể sống lại và gửi — nhưng nó thu hẹp cửa sổ trùng từ "mỗi lần retry" xuống "chỉ khi worker treo đúng lúc".

> ⚠️ **Bẫy**: dedupe bằng cache in-memory của worker. Restart là mất bảng; hai worker không thấy nhau. Dedupe phải ở store dùng chung và **phải có TTL** — không TTL thì bảng dedupe lớn vô hạn, thành vấn đề lưu trữ lớn hơn cả notification log.

### 7.3 Notification log — nguồn sự thật, không phải log gỡ lỗi

Điểm cốt lõi: **ghi log trước khi gửi, không phải sau**. Ghi `ACCEPTED` ngay khi nhận request (trước cả khi enqueue), rồi cập nhật dọc đường. Ghi sau khi gửi thì process chết là mất cả message lẫn dấu vết của nó.

```
ACCEPTED ──▶ QUEUED ──▶ SENDING ──▶ SENT_TO_PROVIDER ──▶ DELIVERED
    │                      │              │                  │
    │                      │              │                  └─▶ OPENED/CLICKED
    │                      │              └─▶ BOUNCED/FAILED_PERMANENT ─▶ suppress
    │                      └─▶ RETRYING ──(cạn attempt)──▶ DEAD_LETTER
    └─▶ SUPPRESSED (opt-out, quiet hours, frequency cap)
```

Phân biệt `SENT_TO_PROVIDER` và `DELIVERED` là chi tiết nhỏ nhưng nói lên nhiều: cái đầu biết ngay (provider trả 200), cái sau chỉ biết **về sau** qua webhook — và với push thì gần như **không bao giờ biết**. Gộp hai trạng thái là tự lừa mình về tỉ lệ giao thành công.

Log phục vụ bốn việc: dedupe, retry, hỗ trợ khách hàng ("thông báo của tôi đâu?"), và nguồn analytics. Hai việc đầu cần point lookup theo `notification_id`, việc thứ ba cần query theo `(user_id, created_at)` — nên khoá chính là `notification_id` cộng một chỉ mục phụ. TTL 30 ngày cho bản nóng, đẩy bản sao sang kho lạnh trước khi hết hạn.

### 7.4 Retry, exponential backoff, và DLQ

Nguyên tắc đầu tiên: **phân loại lỗi trước khi retry**. Retry lỗi vĩnh viễn là lãng phí thuần tuý, và với SMS là đốt tiền thật.

| Loại lỗi | Ví dụ | Hành động đúng |
|---|---|---|
| **Vĩnh viễn** | `410`, `UNREGISTERED`, hard bounce, số không tồn tại, `400 BadDeviceToken` | **Không retry.** Xoá token / suppress / `FAILED_PERMANENT` |
| **Tạm thời** | `429`, `500`, `503`, timeout, connection reset | Retry có backoff + jitter |
| **Mập mờ** | Timeout sau khi đã gửi request | Retry (chấp nhận rủi ro trùng) |
| **Lỗi của ta** | Render fail, thiếu param | **Không retry** — sẽ fail y hệt. Vào DLQ ngay |

```
delay = random(0, min(cap, base * 2^attempt))     base=1s, cap=300s
attempt 0 → random(0,1s)   2 → random(0,4s)   4 → random(0,16s)
attempt 1 → random(0,2s)   3 → random(0,8s)   5 → random(0,32s)
```

Phần `random(0, …)` — **full jitter** — quan trọng hơn phần mũ. Không jitter, toàn bộ message lỗi cùng lúc sẽ retry cùng lúc, tạo **đợt sóng đồng bộ** đập vào provider đúng lúc nó đang yếu, lặp lại với biên độ tăng dần. Đây là cơ chế biến sự cố 30 giây thành sự cố 30 phút.

Số lần thử nên khác nhau theo tính chất message chứ không phải hằng số chung: OTP có vòng đời 5 phút, retry tới phút thứ 10 là **có hại** (người dùng đã xin mã mới) → 2–3 lần trong 60 giây rồi bỏ. Email hoá đơn retry tới 24 giờ thì hoàn toàn hợp lý.

**DLQ** nhận message đã cạn số lần thử. Ba điều làm nó hữu ích thay vì thành bãi rác: **có alarm khi DLQ khác rỗng** (DLQ không alarm là DLQ vô dụng); **giữ đủ ngữ cảnh để replay** (payload gốc, lý do lỗi cuối, số lần đã thử); và **replay có kiểm soát** — lọc theo lý do lỗi, giới hạn tốc độ, và **đi lại qua §10** vì message nằm DLQ 3 ngày có thể đã hết ý nghĩa hoặc user đã opt-out trong khoảng đó. Replay cả DLQ một phát vào giờ cao điểm là cách tự tạo sự cố thứ hai.

> 💡 DLQ còn là **chỉ báo chất lượng tích hợp**: DLQ đầy lỗi render nghĩa là một team đang gửi params sai — bug cần sửa ở nguồn, không phải thứ để replay.
---

## 8. Deep dive 2 — Rate limit của provider và back-pressure

### 8.1 Hạn mức đến từ ba phía

| Nguồn giới hạn | Hình dạng | Vượt thì sao |
|---|---|---|
| **Provider tổng** | Email: quota/24h + tốc độ/giây; SMS: tps theo hợp đồng; FCM: quota project | `429`/throttle; email còn có thể bị **hạ uy tín** |
| **Provider per-recipient** | APNs giới hạn tần suất push tới **một thiết bị** | `429` riêng cho device đó |
| **Chính sách của bạn với user** | "≤5 marketing/tuần, ≤1 SMS/phút" | Không lỗi kỹ thuật, nhưng vi phạm là mất user (§10.3) |

Hai loại đầu là giới hạn về **tài nguyên**, loại thứ ba là giới hạn về **trải nghiệm** — nên chúng được thực thi ở hai chỗ khác nhau: tài nguyên ở worker (ngay trước lời gọi provider), trải nghiệm ở dispatcher (trước khi quyết định có gửi không).

### 8.2 Thực thi phía worker: token bucket chia sẻ

Mỗi pool worker phải tự giới hạn tốc độ bằng **token bucket dùng chung** trong Redis — không phải bộ đếm cục bộ, vì 50 worker mỗi cái giới hạn 10 tps thì tổng là 500 tps chứ không phải 10. Tốc độ nạp đặt ở **80–90% hạn mức hợp đồng**, chừa biên cho sai số đồng hồ và cho việc provider tính theo cửa sổ khác bạn.

Khi không lấy được token, hành động đúng là **không poll message mới khỏi queue** — đây là chỗ nhiều thiết kế làm sai. Nếu worker cứ lấy message rồi ngồi giữ chờ token, message đã rời queue nhưng chưa được xử lý; visibility timeout hết hạn và cùng message đó được giao cho worker khác, nhân đôi công việc. **Back-pressure đúng nghĩa là dừng tiêu thụ, để message nằm yên trong queue.** Queue là nơi chứa hàng đợi; bộ nhớ worker thì không.

### 8.3 Phản ứng với 429

```
nhận 429 / 503
  ├── có header Retry-After → dùng đúng giá trị đó, đừng đoán
  ├── giảm NGAY tốc độ token bucket của kênh đó xuống 50%      ← nhanh
  ├── message hiện tại: trả lại queue với delay (không ack)
  └── sau 60s không lỗi → tăng lại 10% mỗi chu kỳ              ← chậm
```

Mẫu **giảm nhanh, tăng chậm (AIMD)** mượn từ điều khiển tắc nghẽn TCP và đúng ở đây vì cùng lý do: bạn không biết hạn mức thật là bao nhiêu, chỉ biết mình vừa vượt. Tăng lại nhanh bằng tốc độ đã giảm sẽ tạo dao động — hệ thống lúc chạy full, lúc bị chặn hoàn toàn, lặp đi lặp lại.

Kèm theo là một **circuit breaker** cho từng provider: tỉ lệ lỗi vượt ngưỡng (50% trong 30 giây) thì mở mạch, ngừng gọi 30 giây, chỉ cho vài request thăm dò. Gọi vào một provider đang chết chỉ làm message cạn số lần retry vô ích và đẩy chúng vào DLQ khi lẽ ra chỉ cần đợi.

### 8.4 Back-pressure lan ngược tới đâu

| Tầng | Khi quá tải thì làm gì |
|---|---|
| Worker | Dừng poll (§8.2), không buffer trong bộ nhớ |
| Queue | Hấp thụ — đây là việc của nó. Nhưng phải cảnh báo theo **độ sâu và tuổi message** |
| Dispatcher | Queue `bulk` vượt ngưỡng → **ngừng nạp campaign mới**, vẫn cho giao dịch đi |
| API | Toàn hệ thống quá tải → trả `429` cho `priority=bulk`, **luôn nhận** `critical` |

Nguyên tắc: **áp lực phải bị từ chối ở tầng ngoài cùng và phải từ chối đúng loại**. Từ chối đồng đều khi quá tải nghĩa là OTP rớt cùng tỉ lệ với email khuyến mãi — một thất bại thiết kế. Biến thể đáng nhắc: message có **deadline** (OTP hết hạn sau 5 phút) nên bị **loại bỏ chủ động** khi lấy ra khỏi queue mà đã quá hạn. Gửi một OTP đã hết hạn tệ hơn không gửi gì, vì người dùng nhập vào rồi thất bại.

> ⚠️ **Bẫy**: coi độ sâu queue tăng là "chỉ cần thêm worker". Nếu điểm nghẽn là hạn mức provider, thêm worker **không tăng throughput** — nó chỉ tăng tỉ lệ 429 và làm provider siết bạn chặt hơn. Trước khi autoscale phải trả lời: nghẽn ở worker hay ở vòi?
---

## 9. Deep dive 3 — Template, i18n và timezone

### 9.1 Vì sao template phải là dịch vụ riêng

Nếu mỗi service tự ghép nội dung, bạn mất bốn thứ cùng lúc: sửa nội dung mà không deploy, dịch tập trung, A/B test, và kiểm duyệt trước khi gửi. Template store lưu theo khoá ba chiều:

```
template_id "order_shipped"
  └── locale (vi-VN | en-US | …)
        └── channel (push | sms | email)
              ├── title/subject, body có placeholder {{order_id}}, {{eta}}
              ├── ràng buộc: SMS ≤160 ký tự GSM-7, push title ≤40 ký tự
              └── version + trạng thái (draft | active | deprecated)
```

Mỗi kênh phải có **bản riêng**, không phải một bản cắt ngắn tự động: push là một câu ngắn bấm được, SMS là văn bản thuần tính tiền theo segment, email có HTML và nhiều nút. Hai chi tiết kỹ thuật đáng nhớ:

**SMS tính tiền theo segment**: 160 ký tự với GSM-7, nhưng chỉ **70** nếu có một ký tự Unicode — tiếng Việt có dấu rơi vào đúng trường hợp này. Một template tiếng Việt 150 ký tự tốn **3 segment**, gấp ba tiền so với ước tính ngây thơ. Hệ thống phải tính số segment ngay lúc soạn template, không phải phát hiện trên hoá đơn.

**Render phải có sandbox**: template do người không phải kỹ sư sửa, nên engine không được thực thi mã tuỳ ý, phải escape đầu ra, và phải fail rõ ràng khi thiếu param chứ không in `{{order_id}}` cho khách hàng đọc.

### 9.2 i18n — fallback và bẫy định dạng

```
preference của user → locale thiết bị lúc đăng ký token
                    → locale suy từ quốc gia/số điện thoại → mặc định (en-US)
```

Dễ bị bỏ sót hơn cả bản dịch là **định dạng phụ thuộc locale**: ngày (`16/09/2026` vs `09/16/2026` — hiểu nhầm là chuyện có thật), số thập phân, tiền tệ, số nhiều (tiếng Việt không biến đổi, tiếng Anh có, tiếng Ả Rập sáu dạng). Dùng ICU thay vì tự nối chuỗi; ngôn ngữ RTL cần `dir="rtl"` trong email.

Quyết định vận hành: **thiếu bản dịch thì làm gì?** Với giao dịch (OTP, đơn hàng), fallback tiếng Anh còn hơn không gửi. Với marketing, **không gửi** còn hơn gửi email tiếng Anh cho người chỉ đọc tiếng Thái — nó chỉ làm tăng complaint.

### 9.3 Timezone-aware send

"Gửi lúc 9 giờ sáng giờ địa phương" biến một campaign thành **24+ đợt rải suốt một ngày** — và đó thực ra là món quà: nó tự động san phẳng đỉnh tải thay vì dồn vào một khoảnh khắc.

```
 UTC:  22:00  23:00  00:00  01:00  02:00 ... 09:00 ... 16:00
       │ AU  ││ AU  ││ JP  ││CN/SG││ VN  │   │ UK  │   │US-PT│
       │UTC+11││+10 ││ +9  ││ +8  ││ +7  │   │  0  │   │ -7  │
```

Ba cái bẫy thật:

**(a) Lưu timezone dạng IANA (`Asia/Ho_Chi_Minh`), không phải offset (`+07:00`).** Offset sai mỗi khi có DST, và quy tắc DST thay đổi theo quyết định chính trị — lưu offset nghĩa là mỗi mùa xuân bạn gửi sai giờ cho một nửa châu Âu và Bắc Mỹ.

**(b) Không biết timezone thì suy** từ device (có sẵn khi đăng ký token — lý do §4.1 yêu cầu trường này), rồi quốc gia, rồi giờ trụ sở. Nhưng phải có quy tắc an toàn: khi không chắc, **không gửi trong khoảng 21h–8h**. Một notification marketing lúc 3 giờ sáng gây nhiều gỡ app hơn mọi lỗi kỹ thuật khác cộng lại.

**(c) Quiet hours áp theo loại, không áp tất cả.** OTP và cảnh báo bảo mật **phải** vượt qua — chặn chúng là làm hỏng chức năng. Marketing thì tuyệt đối không. Đây là một lý do nữa để `category` và `priority` có mặt trong payload API từ §5.

Cài đặt: scheduler tính `send_at_utc` theo timezone từng user rồi đặt message vào hàng đợi có độ trễ, hoặc vào bảng lịch quét theo phút. Ở quy mô chục triệu user, bảng lịch cần chỉ mục trên bucket phút và phải chống hai instance scheduler cùng quét một bucket (khoá theo bucket, hoặc phân mảnh bucket theo instance).
---

## 10. Deep dive 4 — Notification setting và opt-out

### 10.1 Mô hình preference

Preference không phải một cờ bật/tắt mà là **ma trận ba chiều** `user × category × channel`, cộng các quy tắc phạm vi rộng.

```
user u_8871
├── global: quiet_hours 22:00–07:00 (Asia/Ho_Chi_Minh); max_marketing 3/tuần
├── "transactional.shipping"  push ✓  email ✓  sms ✗
├── "marketing.promo"         push ✗  email ✓  sms ✗
├── "security.alert"          push ✓  email ✓  sms ✓   ← KHÔNG cho tắt
└── "social.mention"          push ✓  email ✗  sms ✗
```

Hai quyết định quan trọng. **Mặc định phải chọn có ý thức**: opt-in mặc định cho giao dịch, opt-**out** mặc định cho marketing ở thị trường yêu cầu đồng ý trước (GDPR và tương đương) — mặc định sai không phải bug giao diện mà là rủi ro pháp lý. **Một số category không được phép tắt** (cảnh báo đăng nhập lạ, đổi điều khoản, OTP); danh sách này phải mã hoá trong hệ thống, không phụ thuộc việc giao diện có hiển thị nút tắt hay không.

Hai cơ chế nữa bắt buộc: **suppression list toàn cục** (hard bounce, complaint, số bị chặn — §13.4) nằm **trên** mọi preference của user; và **unsubscribe một cú bấm** cho email (header `List-Unsubscribe`), nay là yêu cầu bắt buộc của Gmail/Yahoo với người gửi khối lượng lớn.

### 10.2 Vì sao phải kiểm tra ngay trước khi gửi, không phải lúc enqueue

Đây là chi tiết tách bài làm tốt khỏi bài làm đúng-sách. Trực giác nói: lọc sớm để khỏi tốn tài nguyên. Trực giác đó đúng cho **hiệu năng** và sai cho **tính đúng đắn**, vì **khoảng trễ giữa enqueue và gửi**. Với giao dịch, khoảng đó vài giây, không sao. Nhưng với campaign 10 triệu người trải 2 giờ, với message nằm DLQ 3 ngày rồi replay, hoặc với lịch theo timezone đặt trước 18 tiếng, khoảng đó **rất dài**. Trong khoảng đó:

- Người dùng bấm "unsubscribe" ở email trước → nếu chỉ kiểm tra lúc enqueue, họ vẫn nhận 9 triệu message còn lại. Đây **vi phạm pháp luật** ở nhiều nơi, không chỉ gây khó chịu.
- Một hard bounce vừa xảy ra → tiếp tục gửi vào địa chỉ chết làm tụt reputation (§13.4).
- Token chết / user xoá app → gửi vào khoảng không.
- Hạn mức "3 marketing/tuần" của user đã bị một campaign khác dùng hết.

```
   ENQUEUE ────────── t = 0 …………… 2 giờ ………… ▶ GỬI
      │                   │                      │
  check ở đây             │                  check ở ĐÂY (bắt buộc)
  = ảnh chụp cũ    user bấm unsubscribe      = trạng thái hiện tại
                   hard bounce về · token báo 410
```

Nguyên tắc: **kiểm tra tại thời điểm gửi là bắt buộc; kiểm tra lúc enqueue là tối ưu hoá tuỳ chọn**. Làm cả hai là tốt nhất — lọc lúc enqueue giúp không nạp 6 triệu message vô ích vào queue, nhưng lần quyết định luôn là lần cuối.

Chi phí: một lượt đọc preference + suppression cho **mỗi** message ngay trước khi gửi — ở 1.000 msg/s là 1.000 lượt đọc/giây, hoàn toàn khả thi với KV store hoặc cache. Nếu lo, cache với TTL **ngắn** (30–60 giây) và **chủ động invalidate** khi user đổi cài đặt. Đừng cache 10 phút để tiết kiệm vài lượt đọc — đó chính là cách tạo lại đúng vấn đề vừa mô tả ở quy mô nhỏ hơn.

### 10.3 Frequency capping — chống chính mình

Ngay cả khi mọi notification đều hợp lệ và đều được opt-in, **tổng của chúng** vẫn làm người dùng bỏ đi, vì mỗi team gửi một ít và không ai thấy bức tranh toàn cảnh.

| Quy tắc | Ngưỡng ví dụ | Áp cho |
|---|---|---|
| Trần theo ngày/tuần | ≤ 2 push marketing/ngày, ≤ 5/tuần | `bulk` |
| Khoảng cách tối thiểu | ≥ 30 phút giữa hai push cùng loại | bulk + normal |
| Trần chi phí theo user | ≤ 3 SMS/ngày | mọi SMS trừ `critical` |
| Gộp (digest) | 10 lượt like/giờ → 1 notification "10 người đã thích" | social |

Cơ chế gộp đáng nhắc riêng vì nó vừa giảm số message vừa **cải thiện** trải nghiệm — trường hợp hiếm khi tối ưu kỹ thuật và tối ưu sản phẩm trùng nhau. Cài đặt bằng cửa sổ gom: message đầu tiên mở một cửa sổ 5–15 phút, các message cùng `(user, category)` rơi vào đó được gộp, hết cửa sổ gửi một bản tóm tắt. Với push, `apns-collapse-id` / `collapse_key` làm việc tương tự ở phía provider.

> 💡 Cả §10 quy về một câu: **notification service là nơi thực thi chính sách, không phải cái ống**. Nếu bên gọi lách được opt-out bằng cách gọi thẳng provider thì toàn bộ lớp này vô nghĩa — nên về mặt tổ chức, credential của provider phải **chỉ** nằm ở service này.
---

## 11. Priority — OTP không bao giờ được xếp sau khuyến mãi

Một hàng đợi FIFO duy nhất có tính chất chết người: ai đó vừa đẩy 10 triệu email khuyến mãi vào thì OTP của người đang đăng nhập nằm ở vị trí thứ 10.000.001 — với 1.000 msg/s, nó được gửi sau **gần 3 giờ**. Không lỗi nào xảy ra, không alarm nào kêu, và hệ thống đăng nhập coi như đã chết.

| Phương án | Nhược điểm | Đánh giá |
|---|---|---|
| Priority queue thật (heap) trong một queue | Hầu hết queue phân tán **không hỗ trợ**; sắp xếp toàn cục rất đắt; vẫn dùng chung throughput | Không khả thi |
| **Queue riêng theo mức**: `critical`/`normal`/`bulk` | Nhiều hàng đợi hơn, cần định tuyến | **Nên chọn** |
| Chỉ chạy bulk ngoài giờ cao điểm | Không giải quyết xung đột trong ngày | Bổ sung, không thay thế |

Điểm tinh tế là **worker tiêu thụ ba queue đó thế nào**. **(a) Pool riêng biệt**: pool `critical` có worker và hạn mức provider được **giữ chỗ** riêng — dù `bulk` chạy hết công suất, `critical` vẫn có đường đi; đây là bulkhead lần nữa, và là lựa chọn đúng cho OTP. **(b) Pool chung poll theo thứ tự ưu tiên** đơn giản hơn nhưng tạo **starvation** — nếu `critical` luôn có việc thì `bulk` không bao giờ chạy; chữa bằng **weighted round-robin** (8 lượt `critical` : 2 `normal` : 1 `bulk`) để mọi hàng đều tiến, chỉ khác tốc độ. Thực tế nên kết hợp cả hai: pool riêng nhỏ cho `critical`, pool chung weighted cho `normal` + `bulk`.

Ba quy tắc kèm theo:

1. **Priority do hệ thống gán, không do bên gọi khai.** Để caller tự chọn thì mọi team sẽ chọn `critical`. Ánh xạ `category → priority` là cấu hình tập trung, có người duyệt.
2. **SLO riêng cho từng mức**: `critical` p99 < 5 giây, `normal` < 60 giây, `bulk` < 2 giờ. Không có SLO riêng thì không biết mức nào đang hỏng.
3. **Message `critical` có deadline và bị loại khi quá hạn** (§8.4).
---

## 12. Fan-out lớn — gửi cho 10 triệu người

### 12.1 Hai pha: điều phối rồi chạy song song

Campaign "giảm giá cuối tuần cho toàn bộ user Việt Nam" không phải một notification, nó là **một công việc xử lý theo lô**. Nếu `POST /v1/campaigns` tự liệt kê 10 triệu user rồi enqueue từng cái, request đó chạy hàng giờ, không retry được khi đứt, và không ai biết nó đang ở đâu.

```
POST /campaigns ──▶ campaign_id, status = DRAFT
                ┌───────▼────────┐
                │ Segment resolve│ truy vấn kho phân tích, KHÔNG phải DB chính
                │    10M user_id │ ghi ra object storage: 1000 file × 10.000 dòng
                └───────┬────────┘ mỗi file = 1 "shard task" vào queue điều phối
        ┌───────────────┼───────────────┐
   ┌────▼────┐    ┌─────▼───┐     ┌─────▼────┐
   │ shard 1 │    │ shard 2 │ ... │shard 1000│  ← worker song song, idempotent
   └────┬────┘    └─────┬───┘     └─────┬────┘
        │ mỗi user: preference → token → render → enqueue kênh
        └───────────────┴───────────────┴──▶ Q: push/email (priority = bulk)
```

Ba tính chất làm mô hình này dùng được:

- **Shard là đơn vị retry.** Worker chết ở shard 417 → chỉ shard 417 chạy lại, và vì `Idempotency-Key` dẫn xuất từ `(campaign_id, user_id)` nên chạy lại **không** gửi trùng. Không có shard, một lỗi ở phút thứ 50 buộc chạy lại từ đầu.
- **Tiến độ quan sát được**: 417/1000 shard xong là con số thật, ước lượng được thời gian còn lại.
- **Dừng được giữa chừng** — tính năng vận hành bị đánh giá thấp: phát hiện nội dung sai ở phút thứ 5 và bấm "dừng" khi mới 200.000 người nhận là khác biệt giữa sự cố nhỏ và thảm hoạ PR. Worker kiểm tra cờ `campaign.status` trước mỗi lô nhỏ.

### 12.2 Segment resolve không được chạm vào DB giao dịch

"Tất cả user ở Việt Nam, hoạt động 30 ngày, chưa mua premium" là một **full scan phân tích**. Chạy nó trên DB đang phục vụ đăng nhập là cách chắc chắn làm sập sản phẩm bằng chính công cụ marketing. Segment phải resolve trên kho phân tích (warehouse / bản sao đọc / kho cột), và kết quả **vật chất hoá thành file** trên object storage trước khi gửi — để danh sách người nhận là ảnh chụp bất biến, kiểm toán lại được ("ai đã nhận email này?") và retry nhất quán.

### 12.3 Thundering herd — ở cả hai đầu

**Đầu gửi:** 1000 shard worker khởi động cùng lúc, cùng đập vào preference/template/token store. Ba biện pháp: **jitter khi khởi động shard** (rải trong 0–60 giây), **giới hạn số shard song song** (tối đa 50, không phải cả 1000), và **đọc theo lô** (batch get 100 user thay vì 100 lượt gọi).

**Đầu nhận — nguy hiểm hơn:** 10 triệu người nhận push cùng lúc, một phần đáng kể bấm vào, và **tất cả đổ vào landing page trong 60 giây**. Notification system vừa tự tạo một cuộc DDoS vào chính hệ thống của mình. Đây là sự cố campaign kinh điển và là thứ ít người nhắc trong interview.

```
  gửi dồn trong 5 phút          gửi trải trong 2 giờ
   │      ╱╲                     │
   │     ╱  ╲ ← web tier sập     │   ──────────────── ← phẳng, chịu được
   └────╯    ╰───                └──╯
```

Cách chữa nằm ở **phía gửi**: cố ý **trải campaign theo thời gian** (rate limit đầu ra của queue `bulk` ở mức web tier chịu được), gửi theo timezone (§9.3 — tự nhiên trải 24 giờ), và với campaign lớn thì **gửi theo bậc thang**: 1% → quan sát 10 phút cả metric kỹ thuật (lỗi web, latency) lẫn metric sản phẩm (unsubscribe, complaint) → 10% → 100%. Cách này còn bắt được lỗi nội dung trước khi nó đến với 10 triệu người — giá trị lớn hơn nhiều phần kỹ thuật.

### 12.4 Fan-out do provider làm hộ — topic

Với broadcast không cần personalize ("trận đấu đã bắt đầu"), FCM topic hoặc một dịch vụ pub/sub fan-out hộ: bạn gửi **một** request, họ đẩy tới hàng triệu thiết bị.

| | Fan-out tự làm | Fan-out qua topic |
|---|---|---|
| Personalize / log per-user | Có | **Không** |
| Áp opt-out per-user | Có | Không (chỉ subscribe/unsubscribe topic) |
| Chi phí & thời gian | Cao, hàng giờ | Rất thấp, gần tức thì |
| Hợp với | Mọi notification có tên người nhận | Broadcast thuần, tin thời sự, tỉ số |

Vì mất khả năng áp opt-out per-user và mất log, topic **không** dùng được cho marketing ở thị trường có quy định về đồng ý. Nó là công cụ cho broadcast công khai.
---

## 13. Monitoring — đo cái gì và vì sao

### 13.1 Độ sâu queue là chỉ số sức khoẻ số một

Nếu chỉ được chọn **một** metric, chọn cái này. Notification system là hệ sản xuất–tiêu thụ, và độ sâu queue là **tích phân của chênh lệch giữa tốc độ vào và tốc độ ra**: nó tăng nghĩa là vào nhanh hơn ra, bất kể nguyên nhân — provider chậm, worker chết, campaign quá lớn, deploy hỏng. Một tín hiệu bắt được gần như mọi chế độ hỏng.

Nhưng phải đo **hai con số**, không phải một:

- **Độ sâu** (số message đang chờ) — quy mô tồn đọng.
- **Tuổi của message cũ nhất** — **đã trễ bao lâu**, và đây mới là thứ ánh xạ trực tiếp sang SLO. Queue 2 triệu message đang chảy đều với message cũ nhất 30 giây là **khoẻ** (campaign đang chạy). Queue 500 message với message cũ nhất 20 phút là **hỏng** (worker chết hoặc đang bị 429 liên tục). Chỉ nhìn độ sâu, bạn báo động nhầm cái đầu và bỏ sót cái sau.

Alarm đặt trên **tuổi**, ngưỡng theo priority (`critical` > 30 giây là nghiêm trọng; `bulk` > 2 giờ mới đáng quan tâm); dùng **độ sâu** làm tín hiệu autoscale — với điều kiện đã trả lời câu hỏi ở §8.4: nghẽn ở worker hay ở vòi.

### 13.2 Phễu giao hàng

```
   accepted         16.000.000   ← nhận qua API
      │ −opt-out/suppressed −18%
   eligible         13.100.000
      │ −token chết −3%
   sent_to_provider 12.700.000   ← provider trả 200
      │ −bounce/undelivered −2%
   delivered        12.450.000   ← qua webhook (push: hầu như không biết)
      │
   opened            2.490.000   ← 20%
   clicked             374.000   ← 3%
```

Giá trị của phễu là **mỗi bậc tụt bất thường chỉ đúng một nguyên nhân**: `eligible` tụt → preference/suppression sai hoặc một danh mục vừa bị opt-out hàng loạt; `sent_to_provider` tụt → lỗi tích hợp hoặc provider từ chối; `delivered` tụt mà `sent` ổn → vấn đề ở nhà mạng/hòm thư; `opened` tụt mà `delivered` ổn → **vào spam** hoặc nội dung tệ. Đo một tỉ lệ tổng thì biết có vấn đề nhưng không biết ở đâu.

Mọi metric phải gắn nhãn **kênh × template × priority × provider × quốc gia**. Sự cố thật hiếm khi là "hệ thống chậm"; nó thường là "template X ở Brazil qua provider Y đang lỗi 40%", và chỉ thấy được khi có nhãn.

### 13.3 Chỉ số kỹ thuật và chỉ số sản phẩm

| Nhóm | Metric | Ý nghĩa / ngưỡng tham khảo |
|---|---|---|
| Hàng đợi | Độ sâu, **tuổi message cũ nhất**, số message DLQ | DLQ > 0 là phải có người xem |
| Worker | Throughput, tỉ lệ lỗi theo mã, p99 latency gọi provider, số lần circuit mở | p99 provider tăng là tín hiệu sớm nhất |
| Provider | Tỉ lệ 429, tỉ lệ dùng quota, số token bị xoá do 410 | Dùng > 80% quota là lúc xin nâng, không phải lúc đã vượt |
| Giao hàng | Delivery rate, bounce rate, complaint rate | §13.4 |
| Sản phẩm | Open rate, click rate, **unsubscribe rate** | Unsubscribe tăng = nội dung hoặc tần suất sai |
| Chi phí | Chi tiêu SMS/ngày theo quốc gia, số segment SMS trung bình | Alarm chi tiêu là alarm vận hành thật |

`unsubscribe rate` đáng coi trọng ngang metric kỹ thuật: nó là thước đo duy nhất nói cho bạn biết hệ thống đang **tự phá huỷ tệp người nhận của chính nó**. Campaign có open rate cao nhưng unsubscribe 2% là campaign lỗ.

### 13.4 Bounce, complaint, và vì sao domain có thể chết

Nhà cung cấp hòm thư (Gmail, Outlook, Yahoo) chấm điểm **danh tiếng của miền và IP gửi** theo hành vi lịch sử. Hai tín hiệu tệ nhất: **hard bounce cao** (đang gửi vào danh sách bẩn — ngưỡng nguy hiểm quanh **5%**) và **complaint cao** (người dùng bấm "báo cáo spam" — ngưỡng quanh **0,1%**, vượt 0,5% là vùng có thể bị đình chỉ gửi).

Cơ chế gây chết là một **vòng phản hồi dương**, và nó tự gia tốc: điểm danh tiếng tụt → thư vào Spam → **ít người mở hơn** (vì không ai thấy) → tín hiệu tương tác tụt tiếp → điểm tụt tiếp. Cái chết thật sự không phải "bị chặn" mà là: **email giao dịch cũng vào spam** — khách hàng không nhận được xác nhận đơn hàng và OTP, chỉ vì tuần trước marketing gửi một campaign vào danh sách bẩn. Khôi phục mất **hàng tuần tới hàng tháng** gửi sạch đều đặn; không có nút reset.

Ba biện pháp bắt buộc, không phải khuyến nghị:

1. **Suppression list tự động, vĩnh viễn, toàn cục** cho mọi hard bounce và complaint, kiểm tra ngay trước khi gửi (§10.2) — ứng dụng quan trọng nhất của đường webhook ở §5.
2. **Tách miền và IP gửi theo loại thư**: `mail.congty.com` cho giao dịch, `news.congty.com` cho marketing. Marketing làm hỏng danh tiếng của nó thì OTP và hoá đơn vẫn tới nơi — bulkhead ở tầng danh tiếng, và là quyết định có tỉ lệ lợi ích/chi phí cao nhất trong cả bài.
3. **Warm-up IP mới**: IP chưa có lịch sử mà bắn 5 triệu thư ngày đầu bị coi là spam theo mặc định. Tăng dần trong 2–4 tuần.

> ⚠️ **Bẫy nghiêm trọng nhất của cả bài**: coi bounce/complaint là "việc của marketing". Nó là một **ràng buộc kỹ thuật cứng** y như quota API — chỉ khác ở chỗ vượt quota thì bị 429 vài phút, còn vượt ngưỡng complaint thì hỏng trong vài tuần.
---

## 14. Bottleneck & failure mode

**Cái gì nghẽn trước.** Gần như luôn là **hạn mức của provider**, không phải compute của bạn — điều làm bài này khác hầu hết case study khác: bạn không thể mua thêm throughput bằng cách thêm máy. Thứ hai là **preference/token lookup**: một lượt đọc cho mỗi message ngay trước khi gửi, nên ở peak nó là điểm nóng đọc lớn nhất (chữa bằng cache TTL ngắn + batch get). Thứ ba, ít ngờ hơn, là **render email HTML** — phần duy nhất tốn CPU thật, và nó nằm trên đường nóng của campaign.

| Chết | Hậu quả tức thì | Thiết kế giảm nhẹ |
|---|---|---|
| Một worker | Message quay lại queue sau visibility timeout | Xử lý idempotent (§7.2), lease có hạn |
| Cả pool một kênh | Queue kênh đó dài ra, **kênh khác không ảnh hưởng** | Chính là lợi ích của §6.3 |
| Queue của một kênh | Kênh đó ngừng; API vẫn nhận | Log đã ghi `ACCEPTED` → replay sau khi khôi phục |
| Một provider (Twilio) | SMS dừng | Circuit breaker + provider dự phòng (§14.1) |
| Preference store | **Fail-closed** với marketing, **fail-open** với critical | Xem dưới |
| Template store | Không render được | Worker cache local; template hiếm đổi nên TTL dài an toàn |
| Webhook endpoint | Không cập nhật bounce/delivery | Provider retry; nhưng suppression chậm → rủi ro reputation |

Dòng **preference store** đáng dừng lại: đây là chỗ duy nhất mà chế độ hỏng đúng **không** đồng nhất. Không đọc được preference mà vẫn gửi marketing là vi phạm opt-out → marketing **fail-closed** (để message lại queue). Nhưng OTP fail-closed thì người dùng không đăng nhập được, trong khi OTP vốn không thể tắt → `critical` **fail-open**. Nói được sự bất đối xứng này là dấu hiệu đã nghĩ tới tận cùng.

### 14.1 Provider dự phòng — khó hơn vẻ ngoài

Hai nhà cung cấp SMS và tự chuyển khi một bên chết nghe rất hợp lý, nhưng có bốn cái giá: **sender ID khác nhau** (thư đến từ tên lạ, người dùng nghi ngờ), **không chia sẻ trạng thái dedupe** (đã gửi qua A rồi retry qua B là gửi trùng), **giá và chất lượng route khác nhau theo quốc gia**, và **đường dự phòng ít khi được thử** nên thường hỏng đúng lúc cần. Nếu làm, phải cho một phần nhỏ traffic chạy qua đường dự phòng **thường xuyên**. Thất bại phổ biến nhất của failover không phải là không có đường dự phòng, mà là có mà nó cũng hỏng.

### 14.2 Bảo mật

**Xác thực bên gọi** bằng credential của service (app key/secret, mTLS, hoặc IAM role), không phải một API key dùng chung dán khắp repo — rò rỉ thì người ngoài gửi được push dưới tên thương hiệu của bạn. **Không đưa dữ liệu nhạy cảm vào payload push**: nội dung hiện trên màn hình khoá và đi qua hệ thống bên thứ ba — "Mã OTP của bạn là 123456" là sai, "Bạn có một mã xác thực mới" rồi bắt mở app là đúng. **Xác thực chữ ký webhook** và coi payload webhook là dữ liệu không tin cậy: endpoint không kiểm chữ ký cho phép kẻ tấn công tự bơm "hard bounce" cho địa chỉ người khác và đẩy họ vào suppression list vĩnh viễn.
---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Mobile push (APNs/FCM) qua một API chung | **SNS mobile push (platform application + endpoint)** | Trừu tượng hoá APNs/FCM/ADM sau một API; SNS tự quản lý credential và trả về `EndpointArn` thay cho token thô. Đổi lại: ít kiểm soát header chi tiết (`collapse-id`, `priority`) hơn gọi APNs trực tiếp |
| Xử lý token chết tự động | **SNS endpoint attribute `Enabled=false`** | Khi APNs trả `410`, SNS tự vô hiệu hoá endpoint; bạn nhận sự kiện qua **SNS delivery status logs** để dọn bảng device (§4.3) |
| Fan-out một event tới nhiều hệ thống | **SNS topic → nhiều SQS queue** | Mô hình fan-out chuẩn: một lần publish, mỗi kênh có queue riêng — chính là §6.3, kèm **filter policy** để định tuyến theo thuộc tính message (`channel`, `priority`) mà không cần code router |
| Hàng đợi theo kênh × priority | **SQS standard queue** (một queue mỗi tổ hợp) | At-least-once đúng như giả định §7.1; visibility timeout làm lease; `ApproximateAgeOfOldestMessage` chính là metric số một ở §13.1 |
| Đảm bảo không trùng ở mức queue | **SQS FIFO + `MessageDeduplicationId`** | Dedupe trong cửa sổ 5 phút và giữ thứ tự theo `MessageGroupId` — dùng khi cần thứ tự trong phạm vi một user; đổi lại throughput thấp hơn nhiều và mất tính song song tự do |
| DLQ + replay | **SQS redrive policy + DLQ redrive** | `maxReceiveCount` cạn thì message sang DLQ; redrive có sẵn để đẩy lại có kiểm soát (§7.4) |
| Worker gửi notification | **Lambda** (SQS event source) hoặc **ECS/Fargate** | Lambda: autoscale theo queue không cần lo gì, dùng **maximum concurrency trên event source** làm van rate limit thô. ECS: hợp hơn khi cần **giữ connection HTTP/2 lâu tới APNs** và kiểm soát pool — connection dài là điểm yếu của Lambda |
| Kìm tốc độ gọi provider | **Lambda reserved/maximum concurrency** + token bucket trên **ElastiCache Redis** | Concurrency là van thô ở tầng hạ tầng; token bucket chia sẻ mới là thứ thực thi đúng tps hợp đồng (§8.2) |
| Gửi email khối lượng lớn | **SES** (API v2) | Quota gửi/24h + tốc độ/giây rõ ràng; hỗ trợ **configuration set** để tách metric và IP pool theo loại thư (§13.4 mục 2); **dedicated IP pool** cho warm-up |
| Bounce / complaint / delivery của email | **SES event destination → SNS → SQS → Lambda** | Đây là đường phản hồi ở §5: sự kiện `Bounce`/`Complaint`/`Delivery`/`Open`/`Click` đẩy về, Lambda cập nhật notification log và **account-level suppression list** |
| Theo dõi danh tiếng miền gửi | **SES reputation dashboard** + CloudWatch metric bounce/complaint rate | Đúng hai con số ở §13.4; đặt alarm ở ngưỡng thấp hơn ngưỡng của AWS để có thời gian phản ứng |
| Ràng buộc môi trường thử | **SES sandbox** | Tài khoản mới chỉ gửi được tới địa chỉ đã xác minh, quota rất thấp — phải xin thoát sandbox **trước** khi lên production, một đầu việc hay bị quên tới phút chót |
| SMS | **SNS SMS** hoặc **Pinpoint SMS** | Quản lý sender ID/short code, origination number theo quốc gia; **spend limit theo tháng** là van an toàn chi phí quan trọng nhất của kênh này (§3.2) |
| Campaign, segment, A/B test, frequency cap | **Amazon Pinpoint** | Là tầng "campaign console" của §12: import/định nghĩa segment, lịch gửi, **quiet hours**, giới hạn tần suất, journey đa bước — thay vì tự xây toàn bộ §10.3 và §12.1 |
| Lưu device token & liên kết user–device | **DynamoDB** | Đúng access pattern §4.2: `PK=USER#id, SK=DEVICE#token` cộng **GSI theo token** làm chỉ mục ngược; point lookup < 10 ms, không cần join |
| Notification log nóng | **DynamoDB + TTL** | Point lookup theo `notification_id` cho dedupe/retry; **conditional write** thực hiện đúng cơ chế lease ở §7.2; TTL tự dọn sau 30 ngày |
| Dedupe tầng API (Idempotency-Key) | **DynamoDB conditional put** hoặc **ElastiCache `SET NX EX`** | DynamoDB khi cần bền; Redis khi ưu tiên độ trễ. Cả hai đều phải có TTL |
| Lịch gửi & theo timezone | **EventBridge Scheduler** | Hàng triệu lịch một lần (one-time schedule), đặt theo `send_at_utc` từng user, hỗ trợ timezone và cả cron — thay cho việc tự xây bảng quét theo phút (§9.3) |
| Điều phối campaign nhiều pha | **Step Functions** (Distributed Map) | Đúng mô hình §12.1: đọc danh sách shard từ S3, chạy song song có giới hạn concurrency, retry từng shard, có tiến độ và có nút dừng |
| Danh sách người nhận đã vật chất hoá | **S3** (+ **Athena** để resolve segment) | Ảnh chụp bất biến, kiểm toán được; Athena/Redshift chạy truy vấn phân tích **không đụng DB giao dịch** (§12.2) |
| Tracking event (open/click) khối lượng lớn | **Kinesis Data Streams → Firehose → S3 (Parquet) → Athena/QuickSight** | Số event lớn hơn số message gửi (§2.3); Firehose gom theo lô và nén, biến chi phí lưu trữ xuống một bậc so với ghi thẳng vào DB |
| Template có phiên bản | **S3 + DynamoDB metadata** (hoặc Pinpoint message template) | Nội dung ở S3 có versioning, metadata/trạng thái ở DynamoDB; worker cache local vì template hiếm đổi |
| Bí mật của provider | **Secrets Manager** (khoá .p8 APNs, service account FCM, token Twilio) | Xoay vòng tự động, chỉ role của worker đọc được — hiện thực nguyên tắc "credential provider chỉ nằm ở service này" (§10.3) |
| Quan sát & cảnh báo | **CloudWatch** (queue age, DLQ depth, SES reputation) + **X-Ray** | Alarm trên **tuổi message cũ nhất** theo từng priority queue; X-Ray để lần một `notification_id` xuyên qua API → queue → worker → provider |

**Kiến trúc mặc định gọn trên AWS**: API Gateway + Lambda nhận request, ghi `ACCEPTED` vào DynamoDB (conditional put theo `Idempotency-Key`), publish lên **một SNS topic** với message attribute `channel` + `priority`; **filter policy** rẽ vào 6–9 **SQS queue**; mỗi queue có pool worker riêng (Lambda cho email/SMS, Fargate cho push vì cần giữ HTTP/2 tới APNs) với token bucket trên ElastiCache; lỗi cạn retry rơi vào DLQ có alarm. Campaign đi qua Step Functions Distributed Map đọc shard từ S3. Sự kiện bounce/complaint/delivery từ SES và SNS quay về qua SNS → SQS → Lambda để cập nhật log và suppression list; bản sao chảy qua Kinesis Firehose xuống S3 cho Athena. EventBridge Scheduler lo phần gửi theo múi giờ.

---

## Cách trình bày khi phỏng vấn / review

1. **Mở bằng câu định khung, đừng mở bằng bản vẽ.** *"Điểm khó của bài này không phải throughput — là việc chặng cuối do bên thứ ba kiểm soát, mỗi kênh có hạn mức và chế độ lỗi riêng, và sai sót thì người dùng nhìn thấy ngay."* Một câu này định hướng cả 40 phút còn lại theo hướng có lợi cho bạn.
2. **Chốt at-least-once thật sớm**, ngay ở phần requirement: *"mất OTP là sự cố, gửi trùng là phiền — nên tôi chọn at-least-once và sẽ dedupe ở ba tầng."* Không chốt thì mọi thứ về dedupe sau đó trông như tính năng thừa.
3. **Ra số rồi mới vẽ.** "Trung bình 186 msg/s nhưng campaign đẩy đỉnh lên 16.000 msg/s" dẫn tự nhiên tới queue, và tới câu quan trọng: *"tôi provision cho 1.000 msg/s và dùng queue để trải campaign ra 2 giờ."*
4. **Vẽ v1 ngây thơ rồi tự phá nó bằng cơ chế, không bằng tính từ**: "provider chậm → luồng bị giữ → pool cạn → caller timeout → caller retry → tải tăng gấp đôi" thuyết phục hơn từ "SPOF" nhiều lần.
5. **Trả lời "vì sao tách queue theo kênh" bằng head-of-line blocking và bulkhead**, kèm ví dụ: một lô 100.000 SMS chặn đứng email phía sau; một sự cố Twilio buộc giảm tốc cả push. Câu hỏi này gần như chắc chắn được hỏi.
6. **Chủ động nêu chuyện device token**: khoá là `token` chứ không phải `user_id` (vì máy đổi chủ), `410` là xoá chứ không phải retry, quan hệ là n-n. Ít ứng viên nhắc phần này nên nó tạo khác biệt lớn so với công sức bỏ ra.
7. **Nêu chuyện kiểm tra opt-out ngay trước khi gửi**, giải thích bằng khoảng trễ: *"campaign chạy 2 giờ, ai đó bấm unsubscribe ở phút thứ 5 — lọc lúc enqueue thì họ vẫn nhận 9 triệu message còn lại."* Vừa kỹ thuật vừa pháp lý.
8. **Nói về priority bằng một con số**: "10 triệu email khuyến mãi vào trước, OTP đứng thứ 10 triệu lẻ một, ở 1.000 msg/s là gần 3 giờ."
9. **Đừng quên đầu nhận trong fan-out.** Ai cũng nói về việc gửi 10 triệu message; rất ít người nói *"và sau đó 10 triệu người cùng bấm vào, tự tạo DDoS vào web tier của chính mình — nên tôi trải campaign theo thời gian và gửi bậc thang 1% → 10% → 100%."*
10. **Chọn đúng một metric khi được hỏi "anh monitor gì"**: **tuổi message cũ nhất trong mỗi queue**, và giải thích vì sao nó hơn độ sâu (2 triệu message chảy đều thì khoẻ; 500 message đứng im 20 phút thì hỏng).
11. **Kết bằng bounce/complaint**: vòng phản hồi dương làm chết reputation, hệ quả tệ nhất là *email giao dịch cũng vào spam vì campaign tuần trước*, biện pháp là suppression tự động + tách miền + warm-up IP. Đoạn này thể hiện rõ nhất đã vận hành hệ thống thật.
12. **Nếu còn thời gian, nêu bất đối xứng fail-open/fail-closed** khi preference store chết: marketing fail-closed, critical fail-open.

> 💡 **Nguyên tắc cuối**: Notification System được đánh giá không phải bằng số message mỗi giây, mà bằng ba câu trả lời — **message có mất không, có gửi trùng làm phiền không, và khi provider chết thì phần còn lại có sống không**. Cả bài chỉ là ba câu đó, trả lời bằng queue tách theo kênh, dedupe nhiều tầng, và kiểm tra chính sách ngay tại thời điểm gửi.