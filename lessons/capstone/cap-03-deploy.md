# Deploy, CI/CD & hoàn thiện

Bài 1 (`cap-01-plan`) đã chốt kiến trúc, bài 2 (`cap-02-build`) đã dựng **TaskShare** chạy thông trên local: React + TypeScript + Vite (FE) gọi Node/Express + TypeScript (BE), dữ liệu nằm trong PostgreSQL qua Prisma, đăng nhập bằng JWT, monorepo `apps/web` + `apps/api` + `packages/shared`, error format chốt `{ error: { code, message } }`. "Definition of Done" của MVP — *hai tài khoản cùng sửa task trong một project được chia sẻ* — đã đạt **trên máy bạn**. Bài này biến nó thành **sản phẩm thật trên internet**: có domain, có HTTPS, tự động test + deploy mỗi lần push, có log để debug khi 3 giờ sáng có người báo "app sập".

Đây cũng là phần nhà tuyển dụng nhìn vào nhiều nhất — vì nó chứng minh bạn hiểu cả **vòng đời** sản phẩm, không chỉ viết được `function`.

> 💡 Ghi nhớ: mục tiêu bài này không phải "dùng được nhiều dịch vụ AWS nhất". Mục tiêu là **một pipeline đáng tin cậy mà bạn hiểu từng mắt xích** — đủ để giải thích cho người phỏng vấn vì sao chọn Fargate chứ không phải Lambda, vì sao secret nằm ở Secrets Manager chứ không phải trong repo.

## 1. Sơ đồ kiến trúc deploy: thứ gì chạy ở đâu

Trước khi gõ lệnh, vẽ ra sơ đồ. Nếu không vẽ được, bạn chưa hiểu hệ thống của mình. Đây chính là kiến trúc 3-tier ở bài 1, nay được "đổ" vào hạ tầng thật:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 560" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc deploy production của TaskShare</title>
  <desc>Browser gọi tới taskshare.app phục vụ bởi Vercel CDN, và api.taskshare.app đi qua ALB cổng 443 với chứng chỉ ACM vào ECS Fargate chạy ít nhất 2 task trong VPC; Fargate kết nối RDS PostgreSQL ở private subnet, đọc secret từ Secrets Manager lúc start và ghi log/metric vào CloudWatch. Ranh giới VPC và private subnet được tô nổi.</desc>
  <defs>
    <marker id="archArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="278" y="20" width="164" height="46" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="40" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Người dùng (Browser)</text>
  <text x="360" y="57" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">HTTPS</text>
  <line x1="220" y1="66" x2="160" y2="98" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#archArr)"/>
  <line x1="500" y1="66" x2="560" y2="98" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#archArr)"/>
  <rect x="40" y="100" width="220" height="64" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="150" y="120" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">taskshare.app — Vercel CDN</text>
  <text x="150" y="137" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">React+TS (Vite) · static</text>
  <text x="150" y="153" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">build-time env (VITE_API_URL)</text>
  <line x1="262" y1="132" x2="556" y2="132" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="5 4" marker-end="url(#archArr)"/>
  <text x="410" y="124" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">fetch JSON + Bearer JWT (CORS)</text>
  <rect x="468" y="100" width="216" height="64" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="576" y="121" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">api.taskshare.app — ALB</text>
  <text x="576" y="138" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">:443 listener · ACM cert</text>
  <text x="576" y="154" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">health check /health</text>
  <rect x="296" y="196" width="408" height="344" rx="14" fill="#8b5cf6" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="7 4"/>
  <text x="312" y="216" font-size="11.5" font-weight="700" fill="currentColor" opacity="0.85">VPC</text>
  <rect x="316" y="228" width="368" height="92" rx="11" fill="#8b5cf6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 3"/>
  <text x="332" y="247" font-size="11" font-weight="700" fill="currentColor" opacity="0.85">Private subnet</text>
  <rect x="430" y="256" width="240" height="52" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="550" y="277" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">ECS Fargate Service</text>
  <text x="550" y="294" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Express container · ≥2 task (autoscale)</text>
  <line x1="576" y1="164" x2="566" y2="254" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#archArr)"/>
  <text x="592" y="212" font-size="10" fill="currentColor" opacity="0.7">private</text>
  <rect x="316" y="396" width="368" height="128" rx="11" fill="#8b5cf6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 3"/>
  <text x="332" y="415" font-size="11" font-weight="700" fill="currentColor" opacity="0.85">Private subnet (data + quan sát)</text>
  <rect x="330" y="426" width="150" height="78" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="405" y="450" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">RDS PostgreSQL</text>
  <text x="405" y="467" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">private · SG cho ECS</text>
  <text x="405" y="483" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">SQL :5432 (sslmode)</text>
  <rect x="496" y="426" width="86" height="78" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="539" y="450" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Secrets</text>
  <text x="539" y="465" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Manager</text>
  <text x="539" y="484" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">inject lúc start</text>
  <text x="539" y="496" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">DATABASE_URL/JWT</text>
  <rect x="598" y="426" width="76" height="78" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="636" y="450" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Cloud</text>
  <text x="636" y="465" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Watch</text>
  <text x="636" y="486" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">Logs +</text>
  <text x="636" y="497" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">Metrics</text>
  <line x1="500" y1="308" x2="420" y2="424" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#archArr)"/>
  <text x="430" y="360" font-size="9.5" fill="currentColor" opacity="0.7">SQL trong VPC</text>
  <line x1="545" y1="308" x2="540" y2="424" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#archArr)"/>
  <line x1="585" y1="308" x2="630" y2="424" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#archArr)"/>
  <text x="650" y="360" font-size="9.5" text-anchor="end" fill="currentColor" opacity="0.7">log/metric</text>
</svg>

Vì sao tách FE (Vercel) và BE (AWS) — đã giải thích ở bài 1: FE là static asset → CDN phục vụ cực nhanh, free, preview deploy mỗi PR; BE là process long-running cần ở gần DB trong VPC. Cái giá phải trả là **CORS** giữa hai origin — ta xử lý ở mục 8.

> ⚠️ Bẫy: đừng để DB (RDS) ở public subnet rồi mở `0.0.0.0/0` cho "cho nhanh". DB nằm **private subnet**, chỉ ECS task trong VPC mới chạm tới được. Đây là trust boundary quan trọng nhất của hệ thống.

## 2. Dockerize Express API (multi-stage, non-root, healthcheck)

Container hoá BE để chạy chỗ nào cũng giống nhau ("chạy trên máy tôi" hết là lý do). Dùng **multi-stage build**: stage `build` có toàn bộ devDependencies để compile TS + generate Prisma client; stage `runner` chỉ giữ artifact + production deps → image nhỏ, ít bề mặt tấn công.

```dockerfile
# apps/api/Dockerfile
# ---- stage 1: build (TS -> JS, prisma generate) ----
FROM node:20-slim AS build
WORKDIR /app
# monorepo: cần cả root manifest + workspace để cài đúng (xem bẫy bên dưới)
COPY package.json package-lock.json ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json ./apps/api/
RUN npm ci
COPY apps/api ./apps/api
RUN npx -w apps/api prisma generate \
 && npm -w apps/api run build          # tsc -> apps/api/dist

# ---- stage 2: runtime (gọn, non-root) ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
 && rm -rf /var/lib/apt/lists/*       # openssl: prisma cần; curl: cho healthcheck
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --omit=dev -w apps/api
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY apps/api/prisma ./apps/api/prisma

# chạy bằng user không phải root (image node có sẵn user `node`)
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -fsS http://localhost:4000/health || exit 1
CMD ["node", "apps/api/dist/server.js"]
```

`/health` đã có từ bài 2 (`app.get("/health", …)`). Một `.dockerignore` để không copy rác vào context:

```
# apps/api/.dockerignore  (đặt ở root build context)
node_modules
**/dist
**/.env
.git
```

> 💡 Ghi nhớ: ba điều khiến image "production-grade" — (1) **multi-stage** để image runtime không chứa toolchain build; (2) **non-root** (`USER node`) để nếu container bị chiếm thì thiệt hại bị giới hạn; (3) **HEALTHCHECK** để orchestrator (ECS/compose) biết container *sống* hay *sẵn sàng nhận traffic*.

> ⚠️ Bẫy Prisma trong Docker: image `-slim`/`alpine` thiếu `openssl` → Prisma báo lỗi binary engine. Cài `openssl`, hoặc khai báo `binaryTargets` trong `schema.prisma` (vd `["native", "linux-musl-openssl-3.0.x"]` cho alpine). Test image bằng `docker run` trước khi đẩy lên cloud.

### Prisma migrate khi deploy

Local bài 2 dùng `prisma migrate dev` (sinh migration mới). Trên production **tuyệt đối không** dùng `dev` — nó có thể reset DB. Production dùng `prisma migrate deploy`: chỉ *áp dụng* các migration đã commit, idempotent, không sinh mới.

```bash
# Chạy migrate như một bước RIÊNG, TRƯỚC khi rollout container mới
npx prisma migrate deploy        # áp các migration trong prisma/migrations
```

Hai cách phổ biến đặt bước này: (a) một bước riêng trong pipeline (ECS one-off task hoặc job trong GitHub Actions) chạy trước khi update service — **khuyến nghị**; (b) trong entrypoint container. Cách (b) đơn giản nhưng nguy hiểm khi chạy ≥2 task: nhiều container cùng migrate một lúc. Nếu dùng (b), bọc bằng advisory lock của Prisma (mặc định đã có) và chấp nhận một task migrate, các task khác chờ.

> ⚠️ Bẫy: **không bao giờ** đưa `migrate dev`, `db push`, hay `migrate reset` vào đường deploy. Chỉ `migrate deploy`. Và nhớ: migration phải **backward-compatible** với code đang chạy (deploy DB trước, code sau — vd thêm cột nullable trước, dùng sau), nếu không sẽ downtime giữa lúc rollout.

## 3. Deploy Database: Amazon RDS PostgreSQL

DB là tài sản quý nhất (mất code build lại được, mất data thì không). Dùng managed service để khỏi tự lo backup/patch/failover.

Cấu hình tối thiểu cho capstone (free-tier-friendly):

| Mục | Giá trị capstone | Vì sao |
|---|---|---|
| Engine | PostgreSQL 16 | Khớp Prisma schema bài 1 |
| Instance | `db.t4g.micro` | Trong/sát free tier; đủ cho vài trăm user |
| Storage | 20 GB gp3, autoscaling on | Rẻ, tự tăng khi cần |
| Public access | **No** | DB chỉ chạm được từ trong VPC |
| Multi-AZ | Off (capstone) | HA tốn x2; bài 1 đã chấp nhận trade-off này |
| Backup | 7 ngày retention | Bật mặc định, gần như miễn phí |

Security group là chốt chặn mạng — chỉ cho **SG của ECS task** kết nối cổng 5432, không mở theo IP:

```bash
# SG của RDS chỉ cho phép inbound 5432 TỪ SG của ECS (không phải từ 0.0.0.0/0)
aws ec2 authorize-security-group-ingress \
  --group-id sg-rds-xxxx \
  --protocol tcp --port 5432 \
  --source-group sg-ecs-task-yyyy
```

Connection string Prisma (đặt trong Secrets Manager, mục 7) — nhớ `sslmode=require`:

```
DATABASE_URL="postgresql://taskshare:<pass>@taskshare-db.xxxx.ap-southeast-1.rds.amazonaws.com:5432/taskshare?sslmode=require&connection_limit=5"
```

> 💡 Ghi nhớ phương án thay thế: nếu thấy VPC/subnet/SG quá nặng cho capstone, **Neon** hoặc **Railway Postgres** (managed, serverless, có free tier, connection string dán-là-chạy) hoàn toàn ổn. Trade-off: đơn giản hơn rất nhiều, nhưng DB nằm ngoài VPC AWS của bạn → kết nối qua public internet (vẫn TLS) và không "kể chuyện" được về VPC khi phỏng vấn. Với capstone, **chọn cái giúp bạn ship được** — có thể nâng cấp sau.

> ⚠️ Bẫy connection pool: serverless/Fargate scale ra nhiều task, mỗi task mở pool riêng → dễ vượt `max_connections` của Postgres nhỏ. Giới hạn `connection_limit` trong DATABASE_URL, hoặc đặt **PgBouncer / RDS Proxy** ở giữa. Đừng để 10 task × 17 connection = sập DB.

## 4. Deploy Backend: ECS Fargate

Fargate = chạy container mà **không quản EC2** (không vá OS, không lo server). Bạn chỉ khai báo *task definition* (chạy image nào, cần bao nhiêu CPU/RAM, env ở đâu), ECS lo phần còn lại. Vì sao Fargate chứ không Lambda cho Express? Express là server long-running giữ kết nối DB; Lambda hợp request ngắn, stateless, và cần adapter — thêm phức tạp không đáng cho capstone này.

### 4.1 Đẩy image lên ECR

```bash
# tạo repo một lần
aws ecr create-repository --repository-name taskshare-api

# login + build + push (tag = git SHA để truy vết được, KHÔNG dùng :latest)
ACCOUNT=123456789012; REGION=ap-southeast-1
aws ecr get-login-password --region $REGION \
  | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com
SHA=$(git rev-parse --short HEAD)
docker build -f apps/api/Dockerfile -t taskshare-api:$SHA .
docker tag taskshare-api:$SHA $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/taskshare-api:$SHA
docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/taskshare-api:$SHA
```

### 4.2 Task definition (execution role vs task role)

Hai role dễ lẫn nhưng khác nhau bản chất:

- **executionRole**: quyền cho *ECS agent* để **kéo image từ ECR**, **đọc secret từ Secrets Manager lúc start**, ghi log vào CloudWatch. Đây là quyền "dựng container".
- **taskRole**: quyền cho *code của bạn lúc runtime* (vd gọi S3, SES…). TaskShare MVP gần như không cần — để tối thiểu.

```json
{
  "family": "taskshare-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/taskshareEcsExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/taskshareApiTaskRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/taskshare-api:PLACEHOLDER_SHA",
      "portMappings": [{ "containerPort": 4000, "protocol": "tcp" }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "4000" },
        { "name": "CORS_ORIGIN", "value": "https://taskshare.app" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:123456789012:secret:taskshare/DATABASE_URL" },
        { "name": "JWT_SECRET",   "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:123456789012:secret:taskshare/JWT_SECRET" }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -fsS http://localhost:4000/health || exit 1"],
        "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 10
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/taskshare-api",
          "awslogs-region": "ap-southeast-1",
          "awslogs-stream-prefix": "api"
        }
      }
    }
  ]
}
```

`secrets` (khác `environment`) khiến ECS **inject giá trị từ Secrets Manager lúc start** — secret không bao giờ nằm trong task def hay log. Đây là lý do `env.ts` bài 2 chỉ đọc `process.env`: nó không cần biết secret đến từ đâu.

### 4.3 Service + ALB + autoscaling

ECS Service giữ cho *N* task luôn chạy và đăng ký chúng vào ALB target group. ALB nhận HTTPS (cert ACM, mục 9), health check vào `/health`, phân tải qua các task.

```bash
# Autoscaling: chạy 2–6 task, scale theo CPU trung bình
aws application-autoscaling register-scalable-target \
  --service-namespace ecs --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/taskshare/taskshare-api --min-capacity 2 --max-capacity 6

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/taskshare/taskshare-api \
  --policy-name cpu-target --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration \
    '{"TargetValue":60.0,"PredefinedMetricSpecification":{"PredefinedMetricType":"ECSServiceAverageCPUUtilization"}}'
```

> 💡 Ghi nhớ: chạy **≥2 task ở ≥2 AZ** không phải để scale mà để **không single point of failure** — một task chết, ALB tự đẩy traffic sang task còn lại trong lúc ECS dựng task mới. Đây là khác biệt giữa "demo được" và "đáng tin cậy".

### Phương án đơn giản hơn: Railway / Render

ECS Fargate có nhiều mảnh (ECR, task def, role, ALB, SG, autoscaling) — học rất tốt nhưng tốn thời gian. Nếu mục tiêu là **ship nhanh để có portfolio**, Railway/Render deploy thẳng từ Dockerfile, tự cấp HTTPS + domain, tự inject env, có DB Postgres kèm theo.

| Tiêu chí | ECS Fargate (AWS) | Railway / Render |
|---|---|---|
| Thời gian setup | Nhiều giờ | Vài phút |
| Học được gì | VPC, IAM role, ALB, ECR, autoscaling — "kể chuyện" AWS tốt | Ít sâu, nhưng đủ deploy thật |
| Kiểm soát hạ tầng | Toàn quyền | Hạn chế |
| Hợp khi | Bạn đang luyện AWS / muốn job AWS | Bạn muốn sản phẩm chạy ngay |

> 💡 Ghi nhớ: không có "đúng" tuyệt đối — có **trade-off phù hợp mục tiêu**. Nếu capstone này để xin job AWS, làm ECS và viết được lý do từng quyết định là điểm cộng lớn. Nếu để có sản phẩm demo, Railway/Render rồi *viết một mục README giải thích "nếu lên AWS tôi sẽ làm thế này"* cũng rất thuyết phục.

## 5. Deploy Frontend: Vercel

FE Vite build ra static asset → Vercel phục vụ qua CDN, free, preview deploy mỗi PR. Cấu hình (đa số auto-detect):

| Setting | Giá trị | Lý do |
|---|---|---|
| Root Directory | `apps/web` | Monorepo — bẫy bài 1: phải trỏ đúng |
| Build Command | `npm run build` | Vite build |
| Output Directory | `dist` | Mặc định Vite |
| Env (Production) | `VITE_API_URL=https://api.taskshare.app` | **Build-time**, không phải runtime |

Điểm cốt lõi: `VITE_API_URL` là **build-time**. Vite "nướng" giá trị thẳng vào bundle JS lúc build (`import.meta.env.VITE_API_URL` ở bài 2). Đổi nó **phải rebuild** — không như BE đọc env lúc chạy.

> ⚠️ Bẫy: FE chỉ trỏ được tới `api.taskshare.app` *sau khi* BE đã có domain + HTTPS. Thứ tự deploy lần đầu: (1) RDS → (2) ECS + ALB + domain BE → (3) set `VITE_API_URL` ở Vercel → (4) build FE. Set sai/thiếu `VITE_API_URL` → FE gọi `undefined/projects` → lỗi mạng khó hiểu.

### Phương án thay thế: S3 + CloudFront (SPA)

Nếu muốn tất cả trong AWS: upload `dist/` lên **S3**, đặt **CloudFront** trước (CDN + HTTPS qua ACM). Bẫy đặc trưng của SPA: client-side routing. Người dùng F5 ở `/projects/abc-123` → S3 tìm file `projects/abc-123` → 404. Phải cấu hình **fallback về `index.html`**:

```bash
aws s3 sync apps/web/dist s3://taskshare-web --delete
# CloudFront: custom error response 403/404 -> trả /index.html với code 200
#   (để React Router xử lý đường dẫn phía client)
aws cloudfront create-invalidation --distribution-id E123ABC --paths "/*"   # xoá cache sau deploy
```

> 💡 Ghi nhớ SPA routing: server không biết route phía client → mọi 404 phải rơi về `index.html` để router của React xử lý. Vercel làm tự động; S3+CloudFront phải tự khai "custom error response". Và đừng quên **invalidation** sau mỗi deploy, nếu không user thấy bản cũ vì CDN cache.

## 6. CI/CD: GitHub Actions

Pipeline đáng tin = mỗi push lên `main` tự chạy lint + test + build, rồi đóng image, đẩy ECR (tag = git SHA), update ECS — và deploy FE. Không SSH tay, không `docker push` thủ công.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Pipeline CI/CD GitHub Actions của TaskShare</title>
  <desc>Khi git push lên main, job test chạy lint, test và build; chỉ khi test pass (needs:test) thì hai job song song mới chạy: deploy-api gồm docker build, push ECR tag SHA, prisma migrate deploy one-off, render taskdef rồi ECS deploy chờ stability; và deploy-web deploy Vercel prod. Xác thực bằng OIDC thay cho access key tĩnh.</desc>
  <defs>
    <marker id="ciArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="16" y="150" width="120" height="60" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="76" y="176" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">git push</text>
  <text x="76" y="194" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">main</text>
  <line x1="136" y1="180" x2="170" y2="180" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ciArr)"/>
  <rect x="174" y="146" width="146" height="68" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="247" y="170" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">job: test</text>
  <text x="247" y="187" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">lint + test + build</text>
  <text x="247" y="203" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">fail → chặn deploy</text>
  <line x1="320" y1="170" x2="372" y2="92" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ciArr)"/>
  <line x1="320" y1="192" x2="372" y2="300" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ciArr)"/>
  <text x="350" y="120" font-size="9.5" fill="#10b981" opacity="0.95" font-weight="700">needs:test</text>
  <text x="350" y="276" font-size="9.5" fill="#10b981" opacity="0.95" font-weight="700">needs:test</text>
  <rect x="376" y="36" width="328" height="116" rx="11" fill="#10b981" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="392" y="56" font-size="11.5" font-weight="700" fill="currentColor">job: deploy-api  (OIDC, không access key)</text>
  <text x="392" y="78" font-size="10" fill="currentColor" opacity="0.78">1 · docker build → push ECR (tag = SHA)</text>
  <text x="392" y="96" font-size="10" fill="currentColor" opacity="0.78">2 · prisma migrate deploy (one-off task)</text>
  <text x="392" y="114" font-size="10" fill="currentColor" opacity="0.78">3 · render taskdef (image mới)</text>
  <text x="392" y="132" font-size="10" fill="currentColor" opacity="0.78">4 · ECS deploy → chờ stability (auto-rollback)</text>
  <rect x="376" y="278" width="328" height="64" rx="11" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="392" y="302" font-size="11.5" font-weight="700" fill="currentColor">job: deploy-web</text>
  <text x="392" y="322" font-size="10.5" fill="currentColor" opacity="0.78">vercel deploy --prod (Vercel prod)</text>
  <rect x="16" y="252" width="146" height="60" rx="9" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="89" y="276" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">OIDC → AWS STS</text>
  <text x="89" y="294" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">token ngắn hạn, không key</text>
  <line x1="89" y1="252" x2="89" y2="214" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3"/>
  <line x1="162" y1="278" x2="372" y2="120" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3" marker-end="url(#ciArr)"/>
</svg>

```yaml
# .github/workflows/deploy.yml
name: CI/CD
on:
  push:
    branches: [main]

permissions:
  id-token: write          # BẮT BUỘC cho OIDC (không dùng access key)
  contents: read

env:
  AWS_REGION: ap-southeast-1
  ECR_REPO: taskshare-api
  ECS_CLUSTER: taskshare
  ECS_SERVICE: taskshare-api

jobs:
  # ---------- 1. Kiểm thử (chặn deploy nếu fail) ----------
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build            # build cả web + api + shared

  # ---------- 2. Build image, push ECR, update ECS ----------
  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS via OIDC          # KHÔNG hardcode key
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/taskshareGithubDeploy
          aws-region: ${{ env.AWS_REGION }}
      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr
      - name: Build & push image (tag = git SHA)
        env:
          REGISTRY: ${{ steps.ecr.outputs.registry }}
          SHA: ${{ github.sha }}
        run: |
          docker build -f apps/api/Dockerfile -t $REGISTRY/$ECR_REPO:$SHA .
          docker push $REGISTRY/$ECR_REPO:$SHA
      - name: Prisma migrate deploy (one-off task)
        run: |
          aws ecs run-task --cluster $ECS_CLUSTER \
            --task-definition taskshare-migrate \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[subnet-priv],securityGroups=[sg-ecs-task],assignPublicIp=DISABLED}"
      - name: Render task def với image mới
        id: taskdef
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: apps/api/taskdef.json
          container-name: api
          image: ${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPO }}:${{ github.sha }}
      - name: Deploy lên ECS (chờ ổn định)
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ steps.taskdef.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true     # rollback ngầm nếu task mới không healthy

  # ---------- 3. Deploy Frontend lên Vercel ----------
  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Vercel (prod)
        run: npx vercel deploy --prod --cwd apps/web --token=$VERCEL_TOKEN --yes
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

**OIDC (không hardcode key)**: GitHub Actions xin một token ngắn hạn từ AWS STS qua OpenID Connect, AWS đổi lấy quyền tạm thời theo role `taskshareGithubDeploy`. Không có access key tĩnh nào nằm trong repo hay GitHub secrets → không có gì để lộ. Trust policy của role giới hạn đúng repo + branch:

```json
{
  "Effect": "Allow",
  "Principal": { "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
    "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:my-org/taskshare:ref:refs/heads/main" }
  }
}
```

> 💡 Ghi nhớ: **tag image bằng git SHA**, không bao giờ chỉ `:latest`. SHA cho biết chính xác commit nào đang chạy production → rollback = deploy lại SHA cũ; debug = `git checkout` đúng commit. `:latest` là mơ hồ, không truy vết được, và gây race khi nhiều deploy cùng lúc.

> ⚠️ Bẫy: để job `deploy-api`/`deploy-web` phụ thuộc (`needs: test`) vào job test — nếu không, code lỗi vẫn lên production. `wait-for-service-stability: true` để pipeline *thất bại* khi task mới không healthy (ECS giữ task cũ chạy → tự rollback). Không có dòng này, pipeline báo xanh trong khi production sập.

## 7. Env & secrets

Quy tắc một câu: **secret không bao giờ nằm trong git**. Phân loại rõ "config" (lộ được) vs "secret" (không):

| Biến | Loại | Nơi lưu (production) |
|---|---|---|
| `VITE_API_URL` | config build-time (lộ được, nằm trong bundle FE) | Vercel env (Production) |
| `CORS_ORIGIN`, `PORT`, `NODE_ENV` | config runtime | `environment` trong task def |
| `DATABASE_URL` | **secret** (chứa password DB) | AWS Secrets Manager → inject qua `secrets` |
| `JWT_SECRET` | **secret** (lộ = giả mạo được token) | AWS Secrets Manager |

```bash
# Tạo secret một lần (CLI/Console); ECS đọc qua valueFrom (mục 4.2)
aws secretsmanager create-secret --name taskshare/JWT_SECRET \
  --secret-string "$(openssl rand -base64 48)"        # 48 byte ngẫu nhiên, > 32 ký tự env.ts yêu cầu
```

`env.ts` ở bài 2 đã validate (`JWT_SECRET: z.string().min(32)`) — production fail nhanh nếu secret thiếu, đúng triết lý "chết sớm còn hơn lỗi mơ hồ".

> ⚠️ Bẫy: `.env` của BE **phải** nằm trong `.gitignore` (đã ghi từ bài 2) và trong `.dockerignore` (mục 2). Một lần commit nhầm `.env` lên GitHub public = lộ JWT_SECRET vĩnh viễn (git history giữ lại) → phải **rotate** secret ngay. Đừng tin "xoá file rồi commit lại" — history vẫn còn.

## 8. CORS giữa Vercel domain và API

Bài 2 đã bật `cors({ origin: env.CORS_ORIGIN })` đọc từ env. Production chỉ là **đổi giá trị** chứ không đổi code:

```text
local:       CORS_ORIGIN = http://localhost:5173
production:  CORS_ORIGIN = https://taskshare.app   (đặt ở task def, mục 4.2)
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng CORS giữa Vercel domain và API</title>
  <desc>Sequence diagram giữa Browser ở taskshare.app và api.taskshare.app (ALB tới ECS). Browser gửi preflight OPTIONS, API trả các header Allow-Origin, Allow-Methods, Allow-Headers; sau đó Browser gửi request thật kèm Authorization Bearer JWT và nhận response. Ghi chú vấn đề domain preview đuôi vercel.app.</desc>
  <defs>
    <marker id="corsArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="40" y="20" width="200" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="140" y="40" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Browser</text>
  <text x="140" y="56" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">origin: taskshare.app</text>
  <line x1="140" y1="64" x2="140" y2="300" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
  <rect x="480" y="20" width="200" height="44" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="580" y="40" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">api.taskshare.app</text>
  <text x="580" y="56" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">ALB → ECS</text>
  <line x1="580" y1="64" x2="580" y2="300" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
  <line x1="140" y1="98" x2="576" y2="98" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#corsArr)"/>
  <text x="358" y="92" font-size="10.5" text-anchor="middle" fill="currentColor">preflight OPTIONS (Origin, Access-Control-Request-*)</text>
  <line x1="580" y1="138" x2="144" y2="138" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#corsArr)"/>
  <text x="358" y="132" font-size="10.5" text-anchor="middle" fill="currentColor">Allow-Origin: https://taskshare.app</text>
  <line x1="580" y1="166" x2="144" y2="166" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#corsArr)"/>
  <text x="358" y="160" font-size="10.5" text-anchor="middle" fill="currentColor">Allow-Methods / Allow-Headers: Authorization</text>
  <line x1="140" y1="206" x2="576" y2="206" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#corsArr)"/>
  <text x="358" y="200" font-size="10.5" text-anchor="middle" fill="currentColor" font-weight="700">request thật (Authorization: Bearer JWT)</text>
  <line x1="580" y1="236" x2="144" y2="236" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#corsArr)"/>
  <text x="358" y="230" font-size="10.5" text-anchor="middle" fill="currentColor">response JSON (kèm Allow-Origin)</text>
  <rect x="40" y="266" width="640" height="48" rx="9" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="56" y="286" font-size="10.5" font-weight="700" fill="currentColor">Bẫy preview domain:</text>
  <text x="56" y="303" font-size="10" fill="currentColor" opacity="0.8">mỗi PR một subdomain *.vercel.app ≠ taskshare.app → bị chặn nếu chỉ whitelist domain prod.</text>
</svg>

> ⚠️ Bẫy CORS production hay gặp nhất: **domain Vercel preview** khác với domain production (mỗi PR một subdomain `*.vercel.app`). Nếu chỉ whitelist `taskshare.app`, preview deploy gọi API sẽ bị chặn. Hoặc whitelist một danh sách origin (regex cho `*.vercel.app`), hoặc dùng API riêng cho preview. Và tuyệt đối **không** `origin: "*"` cùng `credentials` — đã cảnh báo từ bài 2.

## 9. Custom domain & HTTPS

| Thành phần | Domain | Chứng chỉ |
|---|---|---|
| FE | `taskshare.app` | Vercel tự cấp + tự gia hạn (chỉ trỏ DNS) |
| BE | `api.taskshare.app` | **ACM** cert gắn vào ALB :443 |

```text
# DNS (Route 53 hoặc nhà cung cấp domain)
taskshare.app          CNAME → cname.vercel-dns.com        (Vercel)
api.taskshare.app      A/ALIAS → taskshare-alb-....elb.amazonaws.com   (ALB)
```

ACM cert phải **validate qua DNS** (thêm CNAME record ACM yêu cầu) và nằm **cùng region** với ALB. Sau khi cert "Issued", gắn vào listener :443 của ALB, và thêm listener :80 redirect 301 → :443.

> 💡 Ghi nhớ: HTTPS không phải "nice-to-have" — không có nó, JWT (bài 1 cấm để token trong URL nhưng nó vẫn nằm trong header) đi qua mạng dưới dạng plaintext, ai chặn được gói tin là chiếm được phiên. Force redirect HTTP→HTTPS ở cả hai phía. Vercel làm tự động; ALB cần listener redirect.

## 10. Monitoring & logging

"Deploy xong" không phải hết — phải **thấy được** chuyện gì xảy ra trong production. Nâng cấp `console.error` của bài 2 thành **structured log** (JSON) để CloudWatch query được:

```typescript
// apps/api/src/log.ts  — log JSON một dòng, CloudWatch Insights filter được
export const log = (level: "info" | "error", msg: string, extra: object = {}) =>
  console.log(JSON.stringify({ level, msg, ts: new Date().toISOString(), ...extra }));

// dùng trong errorHandler (thay console.error của bài 2):
log("error", "unhandled", { code: err.code, status: err.status, path: req.path });
```

| Tín hiệu | Công cụ | Cảnh báo nên đặt |
|---|---|---|
| Log ứng dụng | CloudWatch Logs (`/ecs/taskshare-api`) | Filter `level=error` tăng đột biến |
| CPU/RAM task | CloudWatch Metrics (ECS) | CPU > 80% kéo dài → autoscale/điều tra |
| Lỗi HTTP | ALB metrics: `HTTPCode_Target_5XX` | 5XX > ngưỡng → alarm SNS/email |
| DB | RDS metrics: connections, CPU | Connections sát `max` → pool vấn đề |
| Sống/chết | Health check ALB + ECS | Task unhealthy → ECS thay tự động |

> ⚠️ Bẫy log: **không bao giờ log password, token, hay PII**. Bài 2 đã cẩn thận không trả `passwordHash`; log cũng vậy — đừng `log("info", "login", { body: req.body })` vì sẽ ghi cả password vào CloudWatch (lưu lâu, nhiều người đọc được). Log `userId`, `path`, `code` — đủ để debug, không lộ bí mật.

## 11. Checklist performance + security trước khi "ship"

Hai checklist đối chiếu thẳng với non-functional requirement ở bài 1 (p95 < 300ms, password hash, HTTPS, CORS chặt).

**Performance**

- [ ] Index DB cho cột hay query: `project_members(userId)`, `tasks(projectId)` — tránh full scan khi list
- [ ] `connection_limit` hợp lý + cân nhắc RDS Proxy/PgBouncer (mục 3)
- [ ] FE: code-split route, Vite đã minify + tree-shake; ảnh tối ưu; cache-control trên CDN
- [ ] ≥2 task ECS, autoscaling theo CPU (mục 4.3); đo p95 thật bằng ALB metrics
- [ ] Gzip/brotli (Vercel/CloudFront tự bật)

**Security**

- [ ] HTTPS everywhere, HTTP→HTTPS redirect (mục 9)
- [ ] Secret trong Secrets Manager, không trong git/image/log; `.env` đã ignore
- [ ] CORS whitelist origin cụ thể, không `*` (mục 8)
- [ ] DB private subnet, SG chỉ cho ECS (mục 3); IAM role least-privilege (execution ≠ task)
- [ ] Password bcrypt, JWT TTL ngắn, IDOR đã chặn (→ 404) — đã làm ở bài 2, xác nhận còn nguyên trên prod
- [ ] Rate limit `/auth/login` (chống brute-force); validate input bằng zod (bài 2)
- [ ] Không leak stack trace ra response production (errorHandler bài 2)

> 💡 Ghi nhớ: security của capstone không phải "thêm WAF cho oai". Nó là **đóng đúng các cửa đã mở trong lúc dev**: secret hardcode, CORS `*`, DB public, log lộ token. Đi qua checklist này một lần trước khi đưa link cho người khác.

## 12. README + demo + biến thành portfolio

Sản phẩm chạy được mà README sơ sài thì nhà tuyển dụng không hiểu bạn đã làm gì. README là nơi bạn **kể câu chuyện kỹ thuật** — tận dụng tài liệu kế hoạch bài 1.

```markdown
# TaskShare
Quản lý task có auth & chia sẻ project để cộng tác.
🔗 Live: https://taskshare.app  ·  📺 Demo: <link video 90s>  ·  Tài khoản thử: demo@taskshare.app / demo1234

## Stack
React+TS (Vite) · Node/Express+TS · PostgreSQL+Prisma · JWT · monorepo · Docker · ECS Fargate · Vercel · GitHub Actions (OIDC)

## Architecture
<dán sơ đồ ASCII mục 1>

## Chạy local
docker compose up -d        # postgres
cp .env.example .env        # điền DATABASE_URL, JWT_SECRET
npm ci && npm run dev       # web :5173, api :4000

## Quyết định kỹ thuật (vì sao)
- Monorepo + shared types: 1 nguồn type cho FE/BE, đổi field là đỏ đèn compile cả hai bên.
- JWT stateless: đơn giản để deploy FE/BE khác domain; trade-off không revoke → TTL ngắn.
- ECS Fargate: container long-running gần DB; vì sao không Lambda — đã giải thích.
- Error format { error: { code, message } }: FE chỉ parse 1 shape.

## Roadmap (next steps)
- [ ] Refresh token + httpOnly cookie (thay localStorage)
- [ ] Realtime qua WebSocket (hiện polling)
- [ ] Email thật mời thành viên (SES)
- [ ] E2E test (Playwright) trong CI
```

Kịch bản **demo 90 giây** chính là Definition of Done bài 1: mở 2 trình duyệt → 2 tài khoản đăng nhập → owner tạo project + mời member qua email → cả hai cùng thấy/sửa task realtime-ish → tất cả trên domain production thật.

> 💡 Ghi nhớ biến capstone thành portfolio: nhà tuyển dụng không đọc hết code — họ đọc **README + xem demo + hỏi "vì sao"**. Ba thứ ăn điểm nhất: (1) link **live chạy được** với tài khoản demo sẵn; (2) sơ đồ kiến trúc + mục "quyết định kỹ thuật" giải thích trade-off (bạn đã có từ bài 1!); (3) CI/CD xanh trên GitHub. Đó là bằng chứng bạn ship được sản phẩm thật, không chỉ làm bài tập.

## Checklist hoàn thành bài này (và cả capstone)

- [ ] `Dockerfile` multi-stage, non-root, healthcheck; image chạy được bằng `docker run`
- [ ] `prisma migrate deploy` chạy như bước riêng trước rollout; không `migrate dev` trên prod
- [ ] RDS PostgreSQL private subnet, SG chỉ cho ECS; DATABASE_URL có `sslmode=require` (hoặc Neon/Railway + ghi trade-off)
- [ ] ECR repo + image tag = git SHA; task def có execution role (pull/secret) + task role tối thiểu
- [ ] ECS Service ≥2 task, ALB + health check `/health`, autoscaling theo CPU
- [ ] FE trên Vercel, Root Directory `apps/web`, `VITE_API_URL` build-time đúng (hoặc S3+CloudFront + fallback index.html)
- [ ] GitHub Actions: lint+test+build → build/push ECR → migrate → deploy ECS; FE deploy Vercel; OIDC, không hardcode key
- [ ] Secret trong Secrets Manager (DATABASE_URL, JWT_SECRET); config trong env/Vercel; `.env` đã ignore
- [ ] CORS production whitelist domain Vercel (kể cả preview); không `*`
- [ ] Custom domain + HTTPS cả hai phía (ACM cho ALB, Vercel tự cấp); redirect HTTP→HTTPS
- [ ] CloudWatch structured log + alarm 5XX/CPU; không log token/password
- [ ] Checklist performance + security đã đi qua
- [ ] README đầy đủ (live link, demo, architecture, quyết định, roadmap); demo 90s chạy mượt

Đến đây vòng tròn khép lại: từ một trang kế hoạch ở bài 1, qua code chạy local ở bài 2, tới một **sản phẩm thật trên internet** có domain, HTTPS, CI/CD và monitoring. Bạn không chỉ "biết React/Node/AWS" rời rạc nữa — bạn đã **ghép chúng thành một thứ chạy được và giải thích được từng quyết định**. Đó chính xác là điều phân biệt người viết code với người **ship sản phẩm**. Mang TaskShare đi phỏng vấn, và bắt đầu next-step đầu tiên trong roadmap để biến nó thành portfolio sống.
