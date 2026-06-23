# 12-Factor App & Configuration hiện đại

12-Factor App ra đời năm 2011 từ đội Heroku — trước cả Docker và Kubernetes. Đáng kinh ngạc là 14 năm sau, nó vẫn là khung tư duy chuẩn để trả lời câu hỏi: **"Vì sao app của tôi chạy ngon trên laptop nhưng chết trên production?"**. Bài này không bắt bạn thuộc lòng 12 mục — mục tiêu là hiểu *vì sao* từng nguyên tắc tồn tại, mục nào đã lỗi thời theo chuẩn 2025-2026, và mục nào cần "vá" lại (đặc biệt: secrets KHÔNG còn nên ở env var).

## 1. Vì sao 12-Factor vẫn sống sau 14 năm?

Tất cả 12 nguyên tắc đều phục vụ một mục tiêu duy nhất: **app của bạn phải là hàng hoá thay thế được (disposable, fungible)** — chạy ở đâu cũng được, nhân bản bao nhiêu cũng được, giết lúc nào cũng được.

Khi app đạt được điều đó, bạn "mua được" các năng lực sau gần như miễn phí:

- **Horizontal scaling**: thêm instance là xong, không cần "warm up" hay sync state.
- **Zero-downtime deploy**: rolling update — instance mới lên, instance cũ chết, không ai mất session.
- **Self-healing**: orchestrator (ECS, Kubernetes) giết instance lỗi và thay bằng instance mới mà không cần con người.
- **Spot/preemptible instances**: chạy trên hạ tầng rẻ hơn 70% vì app chịu được việc bị tắt đột ngột.

> 💡 **Ghi nhớ**: 12-Factor không phải checklist tôn giáo. Nó là *tập hợp các điều kiện cần* để orchestrator có thể quản lý app thay bạn. Vi phạm factor nào, bạn mất năng lực tương ứng.

## 2. Các factor quan trọng nhất — diễn giải 2025-2026

Không đi đều 12 mục — ta đào sâu những mục hay bị làm sai ở production.

### 2.1. Config qua environment — và giới hạn của nó

Nguyên tắc gốc: **config là thứ thay đổi giữa các môi trường** (DB host, API endpoint, log level), và phải tách khỏi code. Cách kiểm tra nhanh: *"Có thể open-source repo này ngay bây giờ mà không lộ credential nào không?"*

```typescript
// ❌ Config trong code — đổi môi trường là phải rebuild
const dbHost = env === "prod" ? "prod-db.internal" : "localhost";

// ✅ Config từ môi trường — cùng một image chạy mọi nơi
const dbHost = process.env.DB_HOST;
```

Vì sao là env var mà không phải file config? Vì env var là **giao diện chung nhỏ nhất** mọi ngôn ngữ, mọi OS, mọi platform đều hỗ trợ — không cần thư viện parse, không có nguy cơ commit nhầm file `config.prod.json` vào Git.

**Nhưng 2025 đã khác 2011.** Env var có những điểm yếu thực tế:

| Vấn đề | Hệ quả |
|---|---|
| Env var bị in ra khi crash dump, `docker inspect`, `/proc/PID/environ` | Lộ secret cho bất kỳ ai có quyền đọc process |
| Process con kế thừa toàn bộ env | Thư viện bên thứ ba, child process thấy hết secret |
| Không xoay (rotate) được khi process đang chạy | Đổi DB password = restart toàn bộ fleet |
| Không có audit log | Không biết ai đọc secret lúc nào |

Kết luận hiện đại: **env var cho config thường (không nhạy cảm), secret manager cho credential**. Chi tiết ở mục 3.

### 2.2. Stateless process — factor đắt giá nhất

App KHÔNG được giữ bất kỳ state nào mà request sau cần đến: session, file upload, cache cục bộ "quan trọng", in-memory queue. Mọi state bền phải nằm ở **backing service** (database, Redis, S3, queue).

Vì sao? Hãy theo dấu một bug kinh điển:

```text
1. App lưu session vào RAM (dict/map trong process).
2. Chạy 1 instance: mọi thứ hoạt động hoàn hảo. Test pass. Ship.
3. Traffic tăng → scale lên 3 instances sau load balancer.
4. User login vào instance A. Request kế tiếp rơi vào instance B.
5. Instance B không có session → user bị đá ra. Bug "ngẫu nhiên", khó tái hiện.
6. Đội ơi-cứu-tôi bật sticky session trên LB → deploy mới giết instance A → toàn bộ user trên A văng.
```

> ⚠️ **Bẫy production**: sticky session là thuốc giảm đau, không phải thuốc chữa. Nó phá luôn khả năng rolling deploy và autoscaling — instance "dính" nhiều user không thể giết để thay thế. Chuyển session sang Redis/DynamoDB (hoặc dùng JWT stateless) rồi tắt sticky session đi.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bug stateless: session trong RAM một instance so với session dùng chung qua Redis/DynamoDB</title>
  <desc>Bên trái: session lưu trong RAM của một instance, scale lên 3 instance sau load balancer khiến request rơi vào instance khác không có session nên user bị đá. Bên phải: session đẩy ra Redis/DynamoDB dùng chung nên instance nào cũng đọc được.</desc>
  <text x="180" y="24" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">❌ Session trong RAM (vỡ khi scale)</text>
  <text x="540" y="24" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">✅ Session dùng chung</text>
  <line x1="360" y1="36" x2="360" y2="344" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/>
  <g>
    <rect x="150" y="44" width="60" height="30" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="180" y="63" font-size="11" text-anchor="middle" fill="currentColor">LB</text>
    <line x1="180" y1="74" x2="92" y2="104" stroke="currentColor" stroke-opacity="0.45"/>
    <line x1="180" y1="74" x2="196" y2="104" stroke="currentColor" stroke-opacity="0.45"/>
    <line x1="180" y1="74" x2="300" y2="104" stroke="currentColor" stroke-opacity="0.45"/>
    <rect x="44" y="104" width="96" height="58" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="92" y="122" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Instance A</text>
    <text x="92" y="139" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">RAM: ✓ session</text>
    <text x="92" y="153" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">(login ở đây)</text>
    <rect x="148" y="104" width="96" height="58" rx="9" fill="#ef4444" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="196" y="122" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Instance B</text>
    <text x="196" y="139" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">RAM: ✗ trống</text>
    <text x="196" y="153" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">← request kế</text>
    <rect x="252" y="104" width="96" height="58" rx="9" fill="#ef4444" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="300" y="122" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Instance C</text>
    <text x="300" y="139" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">RAM: ✗ trống</text>
    <rect x="44" y="180" width="304" height="34" rx="8" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="196" y="201" font-size="11" text-anchor="middle" fill="currentColor">B không có session → user bị đá ra (401)</text>
  </g>
  <g>
    <rect x="510" y="44" width="60" height="30" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="540" y="63" font-size="11" text-anchor="middle" fill="currentColor">LB</text>
    <line x1="540" y1="74" x2="452" y2="104" stroke="currentColor" stroke-opacity="0.45"/>
    <line x1="540" y1="74" x2="540" y2="104" stroke="currentColor" stroke-opacity="0.45"/>
    <line x1="540" y1="74" x2="628" y2="104" stroke="currentColor" stroke-opacity="0.45"/>
    <rect x="404" y="104" width="96" height="48" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="452" y="123" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Instance A</text>
    <text x="452" y="140" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">stateless</text>
    <rect x="508" y="104" width="96" height="48" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="556" y="123" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Instance B</text>
    <text x="556" y="140" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">stateless</text>
    <rect x="612" y="104" width="96" height="48" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="660" y="123" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Instance C</text>
    <text x="660" y="140" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">stateless</text>
    <line x1="452" y1="152" x2="540" y2="186" stroke="currentColor" stroke-opacity="0.45"/>
    <line x1="556" y1="152" x2="540" y2="186" stroke="currentColor" stroke-opacity="0.45"/>
    <line x1="660" y1="152" x2="540" y2="186" stroke="currentColor" stroke-opacity="0.45"/>
    <rect x="446" y="186" width="188" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="540" y="205" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Redis / DynamoDB</text>
    <text x="540" y="221" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">session dùng chung — instance nào cũng đọc</text>
  </g>
  <text x="180" y="252" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Bug "ngẫu nhiên": chỉ lộ sau khi scale lên nhiều instance</text>
  <text x="540" y="252" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Giết/thêm instance tùy ý, không sticky session</text>
</svg>

Lưu ý sắc thái: cache trong RAM **được phép** — miễn là mất nó chỉ làm chậm chứ không làm sai. Tiêu chí: *"Nếu instance này bốc hơi ngay bây giờ, có dữ liệu nào mất vĩnh viễn / user nào bị lỗi logic không?"* Nếu có → vi phạm stateless.

### 2.3. Port binding & Backing services — app là thứ tự đứng

App tự bind vào một port và phục vụ HTTP, không "được host" bên trong Apache/Tomcat như thời 2005. Điều này nghe hiển nhiên năm 2025 (Express, FastAPI, Spring Boot đều thế) — nhưng hệ quả mới là điểm hay: **app của bạn cũng có thể là backing service của app khác**. Microservices chính là factor này đẩy đến tận cùng.

Backing service (DB, cache, queue, SMTP, thậm chí service nội bộ khác) phải là **tài nguyên gắn-tháo được qua config**. Đổi từ Postgres local sang RDS chỉ là đổi một URL — code không biết, không quan tâm.

### 2.4. Disposability — khởi động nhanh, chết sạch sẽ

Hai vế của factor này:

1. **Fast startup**: instance mới phải sẵn sàng trong vài giây. Startup 5 phút nghĩa là autoscaling vô dụng (traffic spike đã qua trước khi instance kịp lên) và deploy 50 instances mất cả tiếng.
2. **Graceful shutdown**: nhận SIGTERM → ngừng nhận request mới → xử lý nốt request đang dở → đóng connection → thoát. Chi tiết ở mục 5 vì đây là chỗ sai nhiều nhất.

### 2.5. Dev/prod parity — "works on my machine" là triệu chứng

Khoảng cách giữa dev và prod càng lớn, bug "chỉ xảy ra trên prod" càng nhiều. Ba khoảng cách cần thu hẹp:

- **Time gap**: code viết hôm nay nên lên prod trong vài ngày, không phải vài tháng (deploy nhỏ, thường xuyên).
- **Personnel gap**: người viết code tham gia deploy và vận hành nó ("you build it, you run it").
- **Tools gap**: dev dùng SQLite, prod dùng Postgres? Khác biệt về locking, transaction isolation, kiểu dữ liệu sẽ cắn bạn. Năm 2025, Docker Compose + testcontainers khiến việc chạy đúng Postgres/Redis/Kafka thật ở local gần như miễn phí — không còn lý do để dùng đồ giả.

> ⚠️ **Bẫy production**: mock backing service trong integration test (vd: mock S3 bằng dict) là dạng tools gap tinh vi. Bug về pagination, eventual consistency, hay size limit của service thật sẽ không bao giờ lộ ra ở CI. Dùng testcontainers/LocalStack cho integration test.

### 2.6. Logs là event stream — đừng tự quản lý file log

App **ghi log ra stdout/stderr, không ghi ra file, không tự xoay file, không tự gửi đi đâu**. Việc thu gom, lưu trữ, đánh index là của platform (Docker log driver → CloudWatch/Loki/Datadog).

Vì sao? Vì app không biết và không nên biết nó đang chạy ở đâu. Hôm nay log đi CloudWatch, mai đổi sang Datadog — nếu app ghi stdout thì đổi ở tầng platform, không sửa một dòng code nào.

Chuẩn 2025: **structured logging (JSON)** + correlation ID để trace request xuyên service:

```python
logger.info("order_created", extra={
    "order_id": order.id,
    "user_id": user.id,
    "trace_id": request.trace_id,   # truyền xuyên suốt các service
    "duration_ms": elapsed,
})
# → {"level":"info","msg":"order_created","order_id":"o_123",...}
```

> 💡 **Ghi nhớ**: log dạng text cho người đọc, log dạng JSON cho máy query. Ở production có hàng triệu dòng/giờ — không ai "đọc" log nữa, người ta *query* log. Hãy ghi cho máy.

### 2.7. Build, release, run — một artifact, nhiều môi trường

Pipeline đúng: **build một lần** ra một image bất biến (immutable, có version) → **release** = image + config của môi trường → **run**. Cùng một image đi từ staging lên prod; chỉ config thay đổi.

Anti-pattern: build riêng `app:staging` và `app:prod` (vd: `npm run build:prod` nướng API URL vào bundle). Hệ quả: thứ bạn test ở staging **không phải** là thứ chạy ở prod — mọi lời hứa của QA vô nghĩa. Đây chính là chủ đề "cấu hình theo môi trường không cần rebuild" ở mục 6.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 290" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Build, release, run: một image bất biến kết hợp config từng môi trường thành release rồi run</title>
  <desc>Build một lần ra một image bất biến có version. Image đó kết hợp với config riêng của staging và của prod tạo thành hai release, rồi run. Cùng một artifact đi từ staging lên prod, không build lại.</desc>
  <defs>
    <marker id="bf-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">Build → Release → Run</text>
  <rect x="16" y="40" width="160" height="84" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="96" y="62" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">BUILD (1 lần)</text>
  <text x="96" y="82" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">image bất biến</text>
  <text x="96" y="99" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">app:v1.4.2 (digest)</text>
  <text x="96" y="114" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">không chứa config</text>
  <path d="M176 82 L208 70" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#bf-arrow)"/>
  <path d="M176 96 L208 182" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#bf-arrow)"/>
  <rect x="216" y="40" width="44" height="44" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="238" y="58" font-size="10" text-anchor="middle" fill="currentColor">config</text>
  <text x="238" y="72" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">staging</text>
  <text x="262" y="65" font-size="14" fill="currentColor">+</text>
  <rect x="216" y="160" width="44" height="44" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="238" y="178" font-size="10" text-anchor="middle" fill="currentColor">config</text>
  <text x="238" y="192" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">prod</text>
  <text x="262" y="185" font-size="14" fill="currentColor">+</text>
  <rect x="284" y="36" width="150" height="56" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="359" y="58" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">RELEASE staging</text>
  <text x="359" y="76" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">image v1.4.2 + cfg</text>
  <rect x="284" y="156" width="150" height="56" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="359" y="178" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">RELEASE prod</text>
  <text x="359" y="196" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">image v1.4.2 + cfg</text>
  <path d="M434 64 L470 64" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#bf-arrow)"/>
  <path d="M434 184 L470 184" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#bf-arrow)"/>
  <rect x="478" y="36" width="120" height="56" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="538" y="62" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">RUN staging</text>
  <text x="538" y="80" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">QA test ở đây</text>
  <rect x="478" y="156" width="120" height="56" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="538" y="182" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">RUN prod</text>
  <text x="538" y="200" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">cùng artifact</text>
  <path d="M538 92 L538 156" stroke="currentColor" stroke-opacity="0.55" stroke-dasharray="5 4" fill="none" marker-end="url(#bf-arrow)"/>
  <text x="616" y="120" font-size="10.5" fill="currentColor" opacity="0.85">cùng một</text>
  <text x="616" y="135" font-size="10.5" fill="currentColor" opacity="0.85">digest đi</text>
  <text x="616" y="150" font-size="10.5" fill="currentColor" opacity="0.85">lên prod</text>
  <rect x="16" y="234" width="688" height="40" rx="9" fill="#ef4444" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="30" y="251" font-size="11" font-weight="700" fill="currentColor">Anti-pattern:</text>
  <text x="30" y="267" font-size="10.5" fill="currentColor" opacity="0.85">build riêng app:staging và app:prod → thứ test ở staging KHÁC thứ chạy ở prod, QA vô nghĩa.</text>
</svg>

## 3. Secrets: KHÔNG ở env var khi đã có secret manager

Đây là chỗ 12-Factor gốc (2011) đã lỗi thời rõ nhất. Phân loại lại:

| Loại | Ví dụ | Để ở đâu |
|---|---|---|
| Config thường | `LOG_LEVEL`, `PORT`, feature flag mặc định | Env var — đơn giản, đủ tốt |
| Config theo môi trường | DB **host**, endpoint service nội bộ | Env var hoặc Parameter Store |
| **Secret** | DB **password**, API key, signing key | **Secret manager** — app fetch lúc runtime |

Pattern đúng năm 2025: env var chỉ chứa **tên/ARN của secret**, app dùng IAM role (không phải một secret khác!) để fetch giá trị thật lúc khởi động, và cache có TTL để hỗ trợ rotation:

```python
# Env var chỉ chứa con trỏ, không chứa giá trị
secret_arn = os.environ["DB_SECRET_ARN"]

# Fetch bằng IAM role của task/pod — không cần credential nào trong env
secret = secrets_client.get_secret_value(SecretId=secret_arn)
db_password = json.loads(secret["SecretString"])["password"]
```

Lợi ích so với nhét password vào env:

- **Rotation không restart**: secret manager xoay password, app fetch lại khi cache hết TTL hoặc khi gặp auth error (pattern: retry-with-refresh).
- **Audit**: mọi lần đọc secret có log — ai, lúc nào, từ đâu.
- **Blast radius nhỏ**: `docker inspect`, crash dump, `/proc/environ` không còn lộ gì ngoài một cái ARN vô hại.

> ⚠️ **Bẫy production**: rotate DB password trong khi connection pool đang giữ password cũ → fleet đồng loạt auth fail. Hai cách né: (1) rotation kiểu **two-user** (xoay xen kẽ 2 user, luôn có 1 user còn hiệu lực); (2) bắt auth error → refresh secret → reconnect, thay vì crash.

## 4. Feature flags — config thay đổi *trong lúc app đang chạy*

12-Factor gốc coi config là thứ đặt một lần lúc khởi động. Hiện đại hơn: có một lớp config cần đổi **theo thời gian thực, không deploy, không restart** — đó là feature flags.

Tách hai khái niệm hay bị trộn:

- **Release** = đưa code lên server (deploy).
- **Launch** = bật tính năng cho user (flip flag).

Tách được hai thứ này, bạn có: **dark launch** (code lên prod nhưng tắt), **canary theo %** (bật cho 5% user, nhìn metric, tăng dần), và quan trọng nhất — **kill switch**: tính năng mới gây lỗi? Tắt flag trong 5 giây thay vì rollback deploy trong 15 phút.

```typescript
// Flag được đánh giá mỗi request, theo ngữ cảnh user
if (await flags.isEnabled("new-checkout", { userId, country })) {
  return newCheckoutFlow(cart);
}
return legacyCheckoutFlow(cart);
```

> ⚠️ **Bẫy production**: flag là **nợ kỹ thuật có lãi suất**. Mỗi flag nhân đôi số đường chạy của code; 10 flag chồng nhau = 1024 tổ hợp không ai test hết. Quy ước bắt buộc: mỗi flag có owner + ngày hết hạn; flag đã bật 100% quá 2 sprint thì xoá code nhánh cũ. Sự cố Knight Capital 2012 (mất 440 triệu USD trong 45 phút) có nguyên nhân gốc là code chết bị flag cũ kích hoạt lại.

## 5. Graceful shutdown — SIGTERM và nghệ thuật chết tử tế

Đây là phần lý thuyết-thì-ai-cũng-gật, làm-thì-đa-số-sai. Chuỗi sự kiện khi orchestrator tắt một instance:

```text
1. Orchestrator quyết định tắt instance (deploy mới / scale-in / node drain).
2. Báo LB ngừng đẩy request mới vào instance (deregister).
3. Gửi SIGTERM cho process.
4. Chờ tối đa N giây (grace period).
5. Hết N giây mà process chưa thoát → SIGKILL (không đỡ được).
```

App phải hợp tác ở bước 3-4:

```typescript
const server = app.listen(PORT);

process.on("SIGTERM", async () => {
  log.info("SIGTERM received, draining...");
  healthz.setReady(false);          // 1. Báo readiness = fail → LB ngừng gửi request
  server.close(async () => {        // 2. Ngừng nhận connection MỚI,
    await jobQueue.drain();         //    chờ request/job đang chạy xong
    await db.end();                 // 3. Đóng pool, connection sạch sẽ
    process.exit(0);                // 4. Thoát chủ động, trước khi bị SIGKILL
  });
});
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Chuỗi graceful shutdown 3 bên theo timeline: orchestrator, load balancer và app</title>
  <desc>Sequence diagram ba cột (orchestrator, load balancer, app) với thời gian đi xuống. Orchestrator quyết định tắt, deregister khỏi LB, gửi SIGTERM. App set readiness false, drain request đang chạy, đóng pool, exit 0. Nếu quá grace period thì orchestrator gửi SIGKILL.</desc>
  <defs>
    <marker id="gs-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="110" y="26" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Orchestrator</text>
  <text x="110" y="42" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">ECS / K8s</text>
  <text x="360" y="26" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Load Balancer</text>
  <text x="610" y="26" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">App (process)</text>
  <line x1="110" y1="52" x2="110" y2="400" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 4"/>
  <line x1="360" y1="52" x2="360" y2="400" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 4"/>
  <line x1="610" y1="52" x2="610" y2="400" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 4"/>
  <text x="22" y="86" font-size="13" fill="currentColor" opacity="0.4" text-anchor="middle">▼</text>
  <text x="22" y="100" font-size="9" fill="currentColor" opacity="0.4" text-anchor="middle">thời</text>
  <text x="22" y="110" font-size="9" fill="currentColor" opacity="0.4" text-anchor="middle">gian</text>
  <rect x="72" y="62" width="76" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="110" y="78" font-size="10" text-anchor="middle" fill="currentColor">quyết định</text>
  <text x="110" y="90" font-size="10" text-anchor="middle" fill="currentColor">tắt instance</text>
  <path d="M110 100 L356 112" stroke="currentColor" stroke-opacity="0.6" fill="none" marker-end="url(#gs-arrow)"/>
  <text x="232" y="107" font-size="10.5" text-anchor="middle" fill="currentColor">deregister</text>
  <rect x="300" y="118" width="120" height="28" rx="7" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="136" font-size="10" text-anchor="middle" fill="currentColor">ngừng đẩy request mới</text>
  <path d="M110 162 L606 178" stroke="currentColor" stroke-opacity="0.6" fill="none" marker-end="url(#gs-arrow)"/>
  <text x="300" y="160" font-size="10.5" text-anchor="middle" fill="currentColor">SIGTERM</text>
  <rect x="510" y="184" width="200" height="116" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="610" y="202" font-size="10.5" text-anchor="middle" fill="currentColor">1. readiness = false</text>
  <text x="610" y="220" font-size="10.5" text-anchor="middle" fill="currentColor">2. drain request đang chạy</text>
  <text x="610" y="238" font-size="10.5" text-anchor="middle" fill="currentColor">3. đóng connection pool</text>
  <text x="610" y="256" font-size="10.5" text-anchor="middle" fill="currentColor" font-weight="700">4. exit 0 (chủ động)</text>
  <text x="610" y="280" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">app chết sạch sẽ,</text>
  <text x="610" y="292" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">không request nào trả lỗi</text>
  <line x1="110" y1="162" x2="110" y2="348" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="2 3"/>
  <text x="120" y="324" font-size="10" fill="currentColor" opacity="0.75">⏱ chờ grace period (ECS stopTimeout)</text>
  <path d="M606 310 L114 338" stroke="#10b981" stroke-opacity="0.8" fill="none" marker-end="url(#gs-arrow)"/>
  <text x="362" y="306" font-size="10.5" text-anchor="middle" fill="currentColor">exit 0 trước hạn → orchestrator thay instance</text>
  <line x1="40" y1="360" x2="700" y2="360" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="72" y="370" width="120" height="30" rx="7" fill="#ef4444" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="132" y="384" font-size="10" text-anchor="middle" fill="currentColor">nếu QUÁ grace period</text>
  <text x="132" y="396" font-size="10" text-anchor="middle" fill="currentColor">và app chưa thoát</text>
  <path d="M192 392 L606 414" stroke="#ef4444" stroke-opacity="0.85" fill="none" marker-end="url(#gs-arrow)"/>
  <text x="400" y="409" font-size="10.5" text-anchor="middle" fill="currentColor" font-weight="700">SIGKILL (không đỡ được — request dở dang đứt)</text>
</svg>

Ba lỗi kinh điển:

1. **Không bắt SIGTERM** → process chết giữa chừng, request đang xử lý trả lỗi 502/đứt kết nối, transaction dở dang. Triệu chứng: *cứ mỗi lần deploy là có một nhịp error rate*.
2. **PID 1 problem trong Docker**: viết `CMD npm start` → PID 1 là `npm`/`sh`, nó **không forward SIGTERM** cho node. App không bao giờ nhận được tín hiệu, đứng đợi đủ grace period rồi ăn SIGKILL. Fix: dùng exec form `CMD ["node", "server.js"]` hoặc init nhỏ như `tini`.
3. **Race giữa LB và app**: deregistration là eventual — vài giây sau SIGTERM, LB *vẫn có thể* đẩy request tới. Best practice: nhận SIGTERM xong **đợi vài giây** (sleep 5-10s) rồi mới đóng listener, để chắc chắn LB đã ngừng gửi.

> 💡 **Ghi nhớ**: graceful shutdown là hợp đồng 3 bên — LB ngừng gửi, app drain xong việc, orchestrator chờ đủ lâu. Sai một bên là user thấy lỗi. Grace period phải > thời gian request dài nhất + deregistration delay.

## 6. Health endpoint — liveness ≠ readiness

Hai câu hỏi khác nhau, hai endpoint khác nhau, hai hành động xử lý khác nhau:

| | Liveness | Readiness |
|---|---|---|
| Câu hỏi | "Process còn sống/không deadlock chứ?" | "Có nên gửi traffic cho tôi lúc này không?" |
| Khi fail | **Restart** container | **Rút khỏi LB** (không restart) |
| Nên kiểm tra | Điều tối thiểu: event loop trả lời được | Dependency thiết yếu: DB pool, cache, đã warm-up xong |
| Khi shutdown | Vẫn pass | Chủ động fail để drain |

Lỗi chết người: **nhét check DB vào liveness**. Kịch bản thảm hoạ:

```text
1. DB quá tải trong 30 giây.
2. Liveness của TOÀN BỘ instances fail (vì cùng check DB).
3. Orchestrator restart cả fleet cùng lúc.
4. Fleet khởi động lại → mất cache, connection storm dồn vào DB đang yếu.
5. DB gục hẳn. Sự cố 30 giây thành outage 30 phút. (Cascading failure tự gây)
```

Quy tắc: liveness chỉ kiểm tra *bản thân process*; sự cố dependency là việc của readiness (rút khỏi LB, chờ dependency hồi phục) và của circuit breaker — không phải lý do để tự sát.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Liveness so với readiness: hai probe khác nhau dẫn tới hai hành động khác nhau, và cảnh báo nhét DB-check vào liveness gây cascading restart</title>
  <desc>Liveness fail dẫn tới restart container. Readiness fail dẫn tới rút khỏi load balancer mà không restart. Cảnh báo: nhét check DB vào liveness khiến cả fleet cùng restart khi DB quá tải, gây cascading failure.</desc>
  <defs>
    <marker id="lr-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="16" y="36" width="190" height="40" rx="9" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="111" y="55" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Liveness probe</text>
  <text x="111" y="70" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">"Process còn sống chứ?"</text>
  <text x="111" y="100" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">kiểm tra: chỉ bản thân process</text>
  <text x="111" y="115" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">(event loop trả lời được)</text>
  <path d="M111 124 L111 156" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#lr-arrow)"/>
  <text x="150" y="144" font-size="10" fill="currentColor" opacity="0.7">fail →</text>
  <rect x="16" y="160" width="190" height="46" rx="9" fill="#ef4444" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="111" y="181" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">RESTART container</text>
  <text x="111" y="197" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">giết và tạo lại</text>
  <rect x="514" y="36" width="190" height="40" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="609" y="55" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Readiness probe</text>
  <text x="609" y="70" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">"Có nên gửi traffic không?"</text>
  <text x="609" y="100" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">kiểm tra: dependency thiết yếu</text>
  <text x="609" y="115" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.85">(DB pool, cache, warm-up)</text>
  <path d="M609 124 L609 156" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#lr-arrow)"/>
  <text x="648" y="144" font-size="10" fill="currentColor" opacity="0.7">fail →</text>
  <rect x="514" y="160" width="190" height="46" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="609" y="181" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">RÚT khỏi LB</text>
  <text x="609" y="197" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.8">KHÔNG restart — chờ hồi phục</text>
  <text x="360" y="125" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.6">≠</text>
  <line x1="16" y1="226" x2="704" y2="226" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="20" y="248" font-size="12" font-weight="700" fill="currentColor">⚠ Cảnh báo: nhét DB-check vào liveness → cascading restart</text>
  <rect x="20" y="258" width="118" height="80" rx="8" fill="#ef4444" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="79" y="277" font-size="10" text-anchor="middle" fill="currentColor">DB quá tải 30s</text>
  <text x="79" y="295" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">liveness check DB</text>
  <text x="79" y="309" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">→ fail cùng lúc</text>
  <text x="79" y="326" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">trên CẢ fleet</text>
  <path d="M138 298 L168 298" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#lr-arrow)"/>
  <rect x="172" y="258" width="118" height="80" rx="8" fill="#ef4444" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="231" y="284" font-size="10" text-anchor="middle" fill="currentColor">orchestrator</text>
  <text x="231" y="300" font-size="10" text-anchor="middle" fill="currentColor">restart cả fleet</text>
  <text x="231" y="320" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">cùng một lúc</text>
  <path d="M290 298 L320 298" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#lr-arrow)"/>
  <rect x="324" y="258" width="118" height="80" rx="8" fill="#ef4444" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="383" y="284" font-size="10" text-anchor="middle" fill="currentColor">mất cache +</text>
  <text x="383" y="300" font-size="10" text-anchor="middle" fill="currentColor">connection storm</text>
  <text x="383" y="320" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">dồn vào DB yếu</text>
  <path d="M442 298 L472 298" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#lr-arrow)"/>
  <rect x="476" y="258" width="118" height="80" rx="8" fill="#ef4444" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.28"/>
  <text x="535" y="284" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">DB gục hẳn</text>
  <text x="535" y="304" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.85">sự cố 30 giây</text>
  <text x="535" y="319" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.85">→ outage 30 phút</text>
  <rect x="606" y="258" width="98" height="80" rx="8" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="655" y="280" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor">Đúng:</text>
  <text x="655" y="297" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.85">DB-check ở</text>
  <text x="655" y="311" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.85">readiness,</text>
  <text x="655" y="326" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.85">liveness sạch</text>
</svg>

```python
@app.get("/livez")
def livez():                 # còn trả lời được = còn sống
    return {"ok": True}

@app.get("/readyz")
def readyz():
    if shutting_down or not db_pool.healthy():
        return Response(status_code=503)   # rút khỏi LB, KHÔNG restart
    return {"ok": True}
```

## 7. Cấu hình theo môi trường, không rebuild

Hệ quả tổng hợp của factor "build-release-run" + "config": **một artifact duy nhất, config tiêm vào lúc chạy**.

- **Backend**: hiển nhiên — image đọc env var/secret manager lúc khởi động.
- **Frontend SPA** (chỗ hay bị sai): `VITE_API_URL`/`NEXT_PUBLIC_*` bị nướng vào bundle **lúc build** → mỗi môi trường một bundle khác nhau. Cách sửa: serve một file `/config.json` (hoặc inject `window.__CONFIG__` lúc container khởi động) để cùng một bundle chạy mọi môi trường.
- **Config động sau khi khởi động**: dùng dịch vụ config chuyên dụng (AWS AppConfig, LaunchDarkly...) có poll/push + validation + rollout dần — không bao giờ tự chế kiểu "app poll file trên S3 rồi tự parse" thiếu validation: một lần đẩy config sai cú pháp là cả fleet ăn config hỏng cùng lúc.

> 💡 **Ghi nhớ**: câu hỏi kiểm tra nhanh độ trưởng thành của hệ thống: *"Đổi log level trên production mất bao lâu và có cần deploy không?"* Câu trả lời tốt: vài giây, không deploy, có rollout dần và rollback tự động.

## 8. Những factor còn lại — điểm nhanh

- **Codebase**: một codebase, nhiều deploy. Một repo cho mỗi app (monorepo nhiều app vẫn hợp lệ — mỗi app vẫn là một deployable riêng).
- **Dependencies**: khai báo tường minh + lockfile, không phụ thuộc gói cài sẵn trên máy. Docker đã giải quyết gần triệt để.
- **Concurrency**: scale bằng cách thêm process (scale out), không phải nuôi một process khổng lồ (scale up). Tách loại workload thành các process type riêng: `web`, `worker`, `scheduler` — scale độc lập.
- **Admin processes**: migration, backfill chạy như one-off process **dùng cùng image, cùng config** với app — không SSH vào server gõ tay (không lặp lại được, không audit được).

## 9. Tự kiểm tra — app của bạn 12-Factor đến đâu?

Chấm nhanh hệ thống hiện tại bằng các câu hỏi tình huống (mỗi câu "không" là một rủi ro cụ thể):

1. **Giết một instance bất kỳ ngay bây giờ** — có user nào mất dữ liệu hoặc bị lỗi logic không? (stateless)
2. **Deploy lúc 10 giờ sáng thứ Ba** — error rate có nhấp nháy không? (graceful shutdown + health check)
3. **Đổi DB password** — cần restart bao nhiêu service, mất bao lâu? (secret manager + rotation)
4. **Open-source repo ngay bây giờ** — có credential nào lộ không? (config tách khỏi code)
5. **Image đang chạy ở prod có đúng là image đã test ở staging không** — so sánh bằng digest, không phải bằng niềm tin? (build-release-run)
6. **Tính năng mới gây lỗi** — tắt nó mất 5 giây hay 15 phút? (feature flag / kill switch)
7. **DB chậm 30 giây** — fleet có tự restart hàng loạt không? (liveness ≠ readiness)
8. **Scale từ 3 lên 30 instances** — có bước thủ công nào không, instance mới mất bao lâu để nhận traffic? (disposability)

Trả lời tốt 6/8 trở lên: hệ thống đã sẵn sàng cho autoscaling, spot instances và deploy nhiều lần mỗi ngày. Dưới mức đó, hãy sửa theo thứ tự ưu tiên: **graceful shutdown → readiness → secrets → stateless** — đây là bốn thứ trực tiếp gây lỗi cho user thật.

## Liên hệ sang AWS

| Khái niệm trong bài | Service / cấu hình AWS |
|---|---|
| Config thường, không nhạy cảm | **SSM Parameter Store** (String) — rẻ, đơn giản; ECS/Lambda inject thẳng vào env |
| Secrets + rotation + audit | **Secrets Manager** — rotation tự động cho RDS/Aurora (two-user), audit qua CloudTrail; hoặc Parameter Store SecureString nếu không cần rotation tự động |
| App fetch secret không cần credential | **IAM Role** (ECS task role / Lambda execution role / IRSA trên EKS) — đây là cách diệt secret-để-lấy-secret |
| Feature flags, config động có validation + rollout dần + rollback | **AWS AppConfig** — deploy config theo %, tự rollback khi CloudWatch alarm nổ; agent/Lambda extension cache sẵn |
| Graceful shutdown — grace period | **ECS `stopTimeout`** (default 30s, max 120s trên Fargate): khoảng thời gian giữa SIGTERM và SIGKILL — phải dài hơn thời gian drain của app |
| LB ngừng gửi request trước khi tắt instance | **ALB deregistration delay** (default 300s — thường chỉnh xuống 30-60s cho API): target chuyển sang `draining`, không nhận request mới, chờ request đang chạy xong |
| Liveness / readiness | **ALB health check** (đóng vai readiness — fail thì rút khỏi target group) + **ECS container health check** (đóng vai liveness — fail thì thay task) |
| Logs là stream | **awslogs / FireLens** driver → CloudWatch Logs; query JSON bằng **Logs Insights**; correlation bằng **X-Ray / ADOT** |
| Stateless — state đẩy ra backing service | Session → **ElastiCache (Redis/Valkey)** hoặc **DynamoDB**; file → **S3**; queue → **SQS** |
| Backing service gắn-tháo qua config | **RDS/Aurora** endpoint, **SQS** queue URL, **ElastiCache** endpoint — tất cả chỉ là chuỗi trong Parameter Store |
| Build một lần, chạy mọi môi trường | **ECR** image bất biến (tag theo digest/version) + ECS task definition mỗi môi trường chỉ khác phần env/secrets |
| Admin process dùng cùng image | **ECS one-off task** (`run-task`) chạy migration với cùng image + task role |

Chuỗi sự kiện deploy chuẩn trên ECS + ALB, ghép tất cả lại: task mới lên → pass ALB health check → nhận traffic → task cũ bị deregister (drain trong `deregistration delay`) → nhận SIGTERM → app drain connection → exit 0 trước `stopTimeout`. Nếu bạn cấu hình đúng cả 4 mắt xích, deploy giữa giờ cao điểm mà error rate không nhúc nhích — đó chính là phần thưởng của 12-Factor.
