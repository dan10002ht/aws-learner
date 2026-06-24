# Docker thực hành cho kỹ sư Cloud

Docker là kỹ năng nền bắt buộc trước khi đụng tới ECS, Fargate, hay Lambda container image. Bài này đi theo lộ trình thực hành: build một image đúng cách, chạy container, debug, rồi ghép nhiều service bằng Compose — đúng những thao tác bạn sẽ lặp lại hàng ngày khi làm việc với AWS.

## 1. Image vs Container — phân biệt cho đúng

| Khái niệm | Là gì | Tương tự |
|---|---|---|
| **Image** | Bản mẫu chỉ-đọc (read-only), gồm nhiều layer chồng lên nhau | Class, file `.iso`, AMI |
| **Container** | Một tiến trình đang chạy từ image + 1 layer ghi (writable layer) | Object, máy đang bật, EC2 instance |
| **Registry** | Nơi lưu trữ và phân phối image | Docker Hub, **Amazon ECR** |

Chạy thử để thấy sự khác biệt:

```bash
docker pull nginx:1.27-alpine        # tải image
docker images                        # liệt kê image
docker run -d --name web nginx:1.27-alpine   # tạo container từ image
docker ps                            # container đang chạy
docker rm -f web                     # xoá container — image vẫn còn
```

> 💡 **Ghi nhớ**: Xoá container không xoá image. Một image có thể sinh ra N container độc lập. Dữ liệu ghi trong writable layer **mất khi xoá container** — muốn giữ thì dùng volume.

## 2. Dockerfile — các chỉ thị cốt lõi

```dockerfile
# Dockerfile cho app Node.js
FROM node:22-alpine

WORKDIR /app

# Copy file khai báo dependency TRƯỚC (tận dụng cache — xem mục 3)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source sau cùng
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
```

Build và chạy:

```bash
docker build -t myapp:1.0 .
docker run -d -p 3000:3000 myapp:1.0
```

### CMD vs ENTRYPOINT — câu hỏi phỏng vấn kinh điển

| | CMD | ENTRYPOINT |
|---|---|---|
| Vai trò | Lệnh **mặc định**, dễ bị ghi đè | Lệnh **cố định** của container |
| Ghi đè khi `docker run` | Chỉ cần thêm argument sau tên image | Phải dùng `--entrypoint` |
| Kết hợp | CMD trở thành **argument mặc định** cho ENTRYPOINT | |

```dockerfile
ENTRYPOINT ["python", "app.py"]
CMD ["--port", "8080"]
```

```bash
docker run myapp                 # chạy: python app.py --port 8080
docker run myapp --port 9090     # chạy: python app.py --port 9090
```

> ⚠️ **Lỗi thường gặp**: Viết `CMD node server.js` (shell form) thay vì `CMD ["node", "server.js"]` (exec form). Shell form bọc lệnh trong `/bin/sh -c`, khiến tiến trình không nhận được tín hiệu `SIGTERM` → container không shutdown gọn, ECS phải chờ hết `stopTimeout` rồi kill cứng. **Luôn dùng exec form (mảng JSON).**

## 3. Layer & cache — thứ tự lệnh quyết định tốc độ build

Mỗi chỉ thị `FROM/COPY/RUN` tạo một **layer**. Docker cache theo nguyên tắc: layer nào thay đổi thì layer đó **và mọi layer phía sau** phải build lại.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Thứ tự lệnh trong Dockerfile và ranh giới cache-hit khi sửa code</title>
  <desc>So sánh thứ tự lệnh tệ và tốt: đặt COPY . . trước npm ci làm hỏng cache, đặt COPY package*.json và npm ci trước rồi COPY . . sau giúp npm ci lấy từ cache khi chỉ sửa code.</desc>
  <text x="180" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Tệ — sửa code build lại hết</text>
  <text x="540" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Tốt — npm ci lấy từ cache</text>
  <g>
    <rect x="24" y="44" width="312" height="44" rx="8" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="40" y="64" font-size="12.5" font-weight="700" fill="currentColor">FROM node:22-alpine</text>
    <text x="40" y="81" font-size="11" fill="currentColor" opacity="0.62">layer nền — ổn định</text>
    <rect x="276" y="54" width="50" height="22" rx="11" fill="#10b981" fill-opacity="0.9"/>
    <text x="301" y="69" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">cache</text>
  </g>
  <g>
    <rect x="24" y="96" width="312" height="44" rx="8" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="40" y="116" font-size="12.5" font-weight="700" fill="currentColor">COPY . .</text>
    <text x="40" y="133" font-size="11" fill="currentColor" opacity="0.62">đổi mỗi khi sửa 1 dòng code</text>
    <rect x="266" y="106" width="60" height="22" rx="11" fill="#ef4444" fill-opacity="0.9"/>
    <text x="296" y="121" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">đổi</text>
  </g>
  <g>
    <rect x="24" y="148" width="312" height="44" rx="8" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="40" y="168" font-size="12.5" font-weight="700" fill="currentColor">RUN npm ci</text>
    <text x="40" y="185" font-size="11" fill="currentColor" opacity="0.62">PHẢI chạy lại — vài phút</text>
    <rect x="236" y="158" width="90" height="22" rx="11" fill="#ef4444" fill-opacity="0.9"/>
    <text x="281" y="173" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">rebuild</text>
  </g>
  <text x="180" y="216" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">COPY . . ở trên → mọi layer sau đều mất cache</text>
  <g>
    <rect x="384" y="44" width="312" height="44" rx="8" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="400" y="64" font-size="12.5" font-weight="700" fill="currentColor">FROM node:22-alpine</text>
    <text x="400" y="81" font-size="11" fill="currentColor" opacity="0.62">layer nền — ổn định</text>
    <rect x="636" y="54" width="50" height="22" rx="11" fill="#10b981" fill-opacity="0.9"/>
    <text x="661" y="69" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">cache</text>
  </g>
  <g>
    <rect x="384" y="96" width="312" height="44" rx="8" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="400" y="116" font-size="12.5" font-weight="700" fill="currentColor">COPY package*.json ./</text>
    <text x="400" y="133" font-size="11" fill="currentColor" opacity="0.62">hiếm đổi</text>
    <rect x="636" y="106" width="50" height="22" rx="11" fill="#10b981" fill-opacity="0.9"/>
    <text x="661" y="121" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">cache</text>
  </g>
  <g>
    <rect x="384" y="148" width="312" height="44" rx="8" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="400" y="168" font-size="12.5" font-weight="700" fill="currentColor">RUN npm ci</text>
    <text x="400" y="185" font-size="11" fill="currentColor" opacity="0.62">CACHED — vài giây</text>
    <rect x="636" y="158" width="50" height="22" rx="11" fill="#10b981" fill-opacity="0.9"/>
    <text x="661" y="173" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">cache</text>
  </g>
  <g stroke="#10b981" stroke-opacity="0.9" stroke-width="2" stroke-dasharray="6 4">
    <line x1="384" y1="201" x2="696" y2="201"/>
  </g>
  <text x="540" y="216" font-size="11" text-anchor="middle" fill="#10b981" font-weight="700">↑ ranh giới cache-hit — sửa code không vượt lên trên</text>
  <g>
    <rect x="384" y="232" width="312" height="44" rx="8" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="400" y="252" font-size="12.5" font-weight="700" fill="currentColor">COPY . .</text>
    <text x="400" y="269" font-size="11" fill="currentColor" opacity="0.62">chỉ layer này chạy lại</text>
    <rect x="636" y="242" width="50" height="22" rx="11" fill="#ef4444" fill-opacity="0.9"/>
    <text x="661" y="257" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">đổi</text>
  </g>
  <text x="540" y="300" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">COPY . . xuống cuối → npm ci nằm trên ranh giới, được cache</text>
</svg>

Với cấu trúc tốt: sửa 1 dòng code → chỉ bước `COPY . .` chạy lại, `npm ci` lấy từ cache, build vài giây thay vì vài phút.

```bash
docker build -t myapp:1.1 .
# => CACHED [2/4] COPY package*.json ./
# => CACHED [3/4] RUN npm ci --omit=dev
# => [4/4] COPY . .
```

> 💡 **Ghi nhớ**: Quy tắc vàng — **ít thay đổi đặt trên, hay thay đổi đặt dưới**. Gộp các lệnh `RUN apt-get update && apt-get install -y ... && rm -rf /var/lib/apt/lists/*` thành một layer để image gọn và tránh cache `apt-get update` cũ.

## 4. Multi-stage build — image nhỏ, bề mặt tấn công nhỏ

Stage build chứa compiler/toolchain; stage runtime chỉ chứa thứ cần để chạy:

```dockerfile
# ----- Stage 1: build -----
FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /bin/app ./cmd/server

# ----- Stage 2: runtime -----
FROM gcr.io/distroless/static-debian12
COPY --from=builder /bin/app /app
USER nonroot
ENTRYPOINT ["/app"]
```

Kết quả thực tế:

```bash
docker images
# golang:1.23-alpine     ~250MB   (toolchain)
# myapp (multi-stage)    ~12MB    (chỉ binary)
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Multi-stage build — chỉ copy binary từ stage builder sang stage runtime nhỏ gọn</title>
  <desc>Stage 1 builder chứa toolchain golang khoảng 250MB build ra binary. Stage 2 runtime distroless khoảng 12MB chỉ COPY binary từ builder. Mũi tên copy artifact giữa hai stage làm rõ chênh lệch kích thước.</desc>
  <g>
    <rect x="20" y="40" width="300" height="220" rx="12" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="40" y="66" font-size="14" font-weight="700" fill="currentColor">Stage 1 — builder</text>
    <text x="40" y="84" font-size="11" fill="currentColor" opacity="0.65">FROM golang:1.23-alpine AS builder</text>
    <rect x="40" y="100" width="260" height="36" rx="7" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="54" y="123" font-size="12" fill="currentColor">compiler · go mod · source · cache</text>
    <rect x="40" y="144" width="260" height="36" rx="7" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="54" y="167" font-size="12" fill="currentColor">RUN go build → /bin/app</text>
    <rect x="40" y="196" width="160" height="40" rx="8" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-opacity="0.7"/>
    <text x="120" y="221" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">binary /bin/app</text>
    <rect x="216" y="210" width="86" height="40" rx="9" fill="#f59e0b" fill-opacity="0.85"/>
    <text x="259" y="227" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">~250MB</text>
    <text x="259" y="242" font-size="9.5" text-anchor="middle" fill="#fff" opacity="0.9">toolchain</text>
  </g>
  <g>
    <rect x="400" y="40" width="300" height="220" rx="12" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="420" y="66" font-size="14" font-weight="700" fill="currentColor">Stage 2 — runtime</text>
    <text x="420" y="84" font-size="11" fill="currentColor" opacity="0.65">FROM distroless/static-debian12</text>
    <rect x="420" y="196" width="160" height="40" rx="8" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-opacity="0.7"/>
    <text x="500" y="221" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">binary /app</text>
    <text x="420" y="124" font-size="11.5" fill="currentColor" opacity="0.75">COPY --from=builder /bin/app /app</text>
    <text x="420" y="144" font-size="11.5" fill="currentColor" opacity="0.75">USER nonroot · ENTRYPOINT</text>
    <text x="420" y="170" font-size="11" fill="currentColor" opacity="0.6">không compiler · không shell</text>
    <rect x="596" y="210" width="86" height="40" rx="9" fill="#10b981" fill-opacity="0.9"/>
    <text x="639" y="227" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">~12MB</text>
    <text x="639" y="242" font-size="9.5" text-anchor="middle" fill="#fff" opacity="0.9">chỉ binary</text>
  </g>
  <defs>
    <marker id="d5arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#10b981"/>
    </marker>
  </defs>
  <line x1="200" y1="216" x2="412" y2="216" stroke="#10b981" stroke-width="2.5" marker-end="url(#d5arrow)"/>
  <text x="306" y="208" font-size="11" font-weight="700" text-anchor="middle" fill="#10b981">COPY --from</text>
  <text x="360" y="288" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.7">Toolchain ở lại stage builder — không vào image cuối. Bỏ ~238MB.</text>
</svg>

Image nhỏ = pull nhanh hơn trên ECS/Fargate, Lambda cold start ngắn hơn, ít CVE hơn khi ECR scan.

## 5. .dockerignore — đừng quên

Không có `.dockerignore`, lệnh `COPY . .` sẽ nhét cả `node_modules`, `.git`, file secret vào build context:

```text
# .dockerignore
node_modules
.git
.env
*.log
dist
coverage
Dockerfile
docker-compose*.yml
```

> ⚠️ **Lỗi thường gặp**: Build context vài GB vì thiếu `.dockerignore` → `docker build` treo ở bước "transferring context". Tệ hơn: file `.env` chứa credential bị nướng vào image và đẩy lên registry.

## 6. Tag & registry — đẩy image lên ECR

Tag là nhãn trỏ tới một image. `latest` chỉ là tag mặc định, **không** tự động là bản mới nhất.

```bash
# 1. Đăng nhập ECR
aws ecr get-login-password --region ap-southeast-1 \
  | docker login --username AWS --password-stdin 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com

# 2. Tạo repository (một lần)
aws ecr create-repository --repository-name myapp

# 3. Tag theo định dạng <registry>/<repo>:<tag>
docker tag myapp:1.0 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/myapp:1.0

# 4. Push
docker push 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/myapp:1.0
```

> 💡 **Ghi nhớ**: Trong production, tag bằng **git SHA hoặc semver** (`myapp:a1b2c3d`), không deploy bằng `:latest` — vì `latest` thay đổi ngầm, rollback và audit đều khó. ECR còn cho bật **tag immutability** để cấm ghi đè tag.

## 7. docker run — port, volume, env

```bash
docker run -d \
  --name api \
  -p 8080:3000 \                      # host:container
  -e DATABASE_URL=postgres://db:5432/app \
  --env-file .env \                   # nạp nhiều biến từ file
  -v pgdata:/var/lib/postgresql/data \  # named volume (dữ liệu bền)
  -v "$(pwd)/config:/app/config:ro" \   # bind mount, chỉ đọc
  --restart unless-stopped \
  myapp:1.0
```

Bảng tra nhanh:

| Flag | Ý nghĩa |
|---|---|
| `-d` | Chạy nền (detached) |
| `-p 8080:3000` | Map port host 8080 → container 3000 |
| `-e KEY=value` | Biến môi trường |
| `-v name:/path` | Named volume — Docker quản lý, dữ liệu sống qua đời container |
| `-v ./dir:/path` | Bind mount — map thư mục host, hợp cho dev hot-reload |
| `--rm` | Tự xoá container khi dừng (tiện cho chạy thử) |
| `-it` | Interactive + TTY (vào shell) |

## 8. Debug: logs, exec, inspect

```bash
docker logs -f --tail 100 api        # theo dõi log
docker exec -it api sh               # vào shell trong container
docker inspect api                   # toàn bộ metadata (JSON)

# Trích thông tin bằng --format
docker inspect -f '{{.State.Status}} {{.RestartCount}}' api
# => running 0
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' api
# => 172.18.0.3

docker stats --no-stream             # CPU/RAM từng container
docker ps -a                         # gồm cả container đã exit (xem exit code)
```

> 💡 **Ghi nhớ**: App trong container nên log ra **stdout/stderr**, không ghi file. Đó chính là cách `awslogs` driver của ECS gom log vào CloudWatch Logs mà không cần agent.

## 9. docker compose — chạy nhiều service, ví dụ LocalStack lab

`compose.yaml` mô phỏng một lab AWS local: app + Postgres + LocalStack (giả lập S3/SQS/DynamoDB):

```yaml
services:
  app:
    build: .
    ports:
      - "8080:3000"
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/appdb
      AWS_ENDPOINT_URL: http://localstack:4566   # SDK trỏ về LocalStack
      AWS_ACCESS_KEY_ID: test
      AWS_SECRET_ACCESS_KEY: test
      AWS_DEFAULT_REGION: ap-southeast-1
    depends_on:
      db:
        condition: service_healthy        # chờ db THẬT SỰ sẵn sàng
      localstack:
        condition: service_started
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 5s
      timeout: 3s
      retries: 5

  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"
    environment:
      SERVICES: s3,sqs,dynamodb

volumes:
  pgdata:
```

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
docker compose down -v        # dừng + xoá volume

# Thử LocalStack như AWS thật:
aws --endpoint-url http://localhost:4566 s3 mb s3://lab-bucket
aws --endpoint-url http://localhost:4566 s3 ls
```

Điểm cần hiểu về **network**: Compose tự tạo một network riêng; các service gọi nhau bằng **tên service** (`db`, `localstack`) nhờ DNS nội bộ — đúng mô hình service discovery bạn gặp lại ở ECS Service Connect / Cloud Map.

> ⚠️ **Lỗi thường gặp**: `depends_on` mặc định chỉ chờ container **start**, không chờ app bên trong sẵn sàng. App connect Postgres ngay khi Postgres còn đang khởi tạo → crash. Khắc phục: `condition: service_healthy` + `healthcheck` như trên, và app vẫn nên có retry logic.

## 10. Healthcheck & resource limits trong Dockerfile

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1
```

```bash
docker run -d --memory 512m --cpus 0.5 myapp:1.0
docker ps   # cột STATUS hiện: Up 30 seconds (healthy)
```

Đây chính là tiền thân của `healthCheck` trong ECS task definition và health check của ALB target group.

## 11. Bảo mật image — non-root & best practices

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Tạo user không đặc quyền và chuyển sang nó
RUN addgroup -S app && adduser -S app -G app
USER app

CMD ["node", "server.js"]
```

Checklist bảo mật:

- **Không chạy root**: thêm `USER` — ECS/EKS có policy chặn container root.
- **Base image nhỏ, có pin version**: `node:22-alpine`, `distroless`, hoặc `cgr.dev/chainguard/*`; tránh `FROM node` trống (nghĩa là `latest`).
- **Không nướng secret vào image**: không `ENV API_KEY=...`, không COPY `.env`. Trên AWS dùng Secrets Manager / SSM Parameter Store inject lúc runtime.
- **Scan image**: `docker scout cves myapp:1.0` local; ECR bật **scan on push** (basic hoặc enhanced với Inspector).
- **Filesystem chỉ đọc** nếu được: `docker run --read-only` ↔ `readonlyRootFilesystem: true` trong ECS.

## 12. Lỗi thường gặp & cách xử lý

### Container exit ngay lập tức

```bash
docker ps -a
# STATUS: Exited (0) 2 seconds ago
```

| Exit code | Nguyên nhân hay gặp |
|---|---|
| 0 | Tiến trình chính chạy xong rồi thoát (không phải tiến trình foreground dài hạn) |
| 1 | App crash — xem `docker logs <name>` |
| 137 | Bị kill vì hết memory (OOM) hoặc `docker stop` quá hạn |
| 126/127 | Lệnh trong CMD không thực thi được / không tồn tại |

> 💡 **Ghi nhớ**: Container sống nhờ tiến trình PID 1 chạy **foreground**. Lệnh kiểu `nginx` daemon-mode hay script chạy xong là container chết. Debug nhanh: `docker run -it --entrypoint sh myapp` để vào trong xem.

### Port conflict

```text
Error: bind: address already in use
```

```bash
lsof -i :8080                 # tìm tiến trình chiếm port (macOS/Linux)
docker run -p 8081:3000 ...   # hoặc đổi port host
```

### Permission denied với volume

```text
EACCES: permission denied, open '/data/app.log'
```

UID của user trong container không khớp quyền thư mục host. Cách xử lý: `chown` thư mục host khớp UID container, hoặc chạy `docker run --user "$(id -u):$(id -g)" ...` khi dev, hoặc dùng named volume thay vì bind mount cho dữ liệu app.

## Liên hệ sang AWS

Mọi thứ vừa học map gần như 1-1 sang hệ sinh thái container của AWS:

| Khái niệm Docker | Trên AWS |
|---|---|
| Registry (Docker Hub) | **Amazon ECR** — private registry, scan on push, lifecycle policy tự xoá image cũ, tag immutability |
| `docker run` + flags | **ECS task definition** — JSON khai báo image, port mappings, environment, mount points |
| `compose.yaml` service | Container definition trong task definition; `depends_on` ↔ `dependsOn` + container health, network của Compose ↔ ECS Service Connect / Cloud Map |
| `--memory`, `--cpus` | `cpu` / `memory` của task & container trong ECS; là tham số **bắt buộc** với Fargate |
| Máy chạy container | **Fargate** — serverless, không quản lý host; hoặc ECS on EC2 / EKS |
| `HEALTHCHECK` | `healthCheck` trong task definition + health check của ALB target group |
| `docker logs` | `awslogs` log driver → CloudWatch Logs |
| Image (≤10GB, từ ECR) | **Lambda container image** — đóng function thành image, dùng base image AWS hoặc tự build kèm Runtime Interface Client |
| Build & deploy từ source/image | **App Runner** — trỏ vào ECR hoặc repo code, AWS lo build, deploy, scale, HTTPS |

Lộ trình gợi ý tiếp theo: push image bài này lên ECR → viết task definition chạy nó trên Fargate sau ALB → so sánh với việc deploy cùng image bằng App Runner để cảm nhận mức trade-off giữa kiểm soát và tiện lợi.
