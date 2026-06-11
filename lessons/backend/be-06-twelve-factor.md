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
