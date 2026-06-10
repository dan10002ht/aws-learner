# CI/CD Pipeline (CodePipeline, CodeBuild, CodeDeploy, CodeArtifact)

Domain 3 (Deployment) chiếm ~24% đề DVA-C02, và đây là nhóm dịch vụ bị hỏi nhiều nhất. Đề thi không bắt bạn viết pipeline từ đầu, mà bắt phân biệt **dịch vụ nào làm gì**, **file config nào của ai**, và **hook chạy ở đâu**. Học bài này theo tư duy: một commit đi từ Git tới production thì đi qua những trạm nào.

## Bức tranh tổng thể: một commit chạy qua đâu

```
Developer push code
   │
   ▼
[Source]  CodeConnections → GitHub/Bitbucket  (hoặc S3, CodeCommit)
   │  (output artifact: SourceOutput)
   ▼
[Build]   CodeBuild  ← đọc buildspec.yml, build + test, kéo package từ CodeArtifact
   │  (output artifact: BuildOutput)
   ▼
[Deploy]  CodeDeploy ← đọc appspec.yml, deploy lên EC2 / Lambda / ECS
```

CodePipeline là **nhạc trưởng** (orchestrator) nối các trạm. CodeBuild/CodeDeploy là **công nhân** thực thi. CodeArtifact là **kho package** (npm/pip/maven). Đừng nhầm vai trò — đề rất hay đánh tráo.

| Dịch vụ | Vai trò | File config | Tương đương ngoài AWS |
|---|---|---|---|
| CodePipeline | Orchestrate các stage | (không có file riêng) | toàn bộ Jenkins pipeline |
| CodeBuild | Compile, test, đóng gói | `buildspec.yml` | build agent / `Jenkinsfile` build stage |
| CodeDeploy | Triển khai artifact lên hạ tầng | `appspec.yml` | Ansible / deploy script |
| CodeArtifact | Lưu trữ package dependency | (không có) | Nexus / Artifactory / private npm |
| CodeConnections | Kết nối tới Git provider | (không có) | OAuth integration |

> ⚠️ Bẫy kinh điển nhất: **`buildspec.yml` là của CodeBuild**, **`appspec.yml` là của CodeDeploy**. Đề sẽ cho câu "where do you define build commands?" với đáp án appspec.yml để gài bạn. Ghi nhớ: **build → buildspec, deploy → appspec**.

---

## CodePipeline: stages, actions, artifacts

### Cấu trúc

- **Pipeline** gồm nhiều **stage** chạy tuần tự (Source → Build → Test → Deploy...).
- Mỗi stage gồm nhiều **action**. Action trong cùng stage có thể **chạy song song** (parallel) hoặc tuần tự theo `runOrder`.
- Action có các loại: `Source`, `Build`, `Test`, `Deploy`, `Approval`, `Invoke` (Lambda).
- Stage chỉ chuyển sang stage sau khi **tất cả action của nó thành công**.

### Artifact đi giữa các stage (điểm thi nặng)

Mỗi action có thể có **input artifacts** và **output artifacts**. CodePipeline lưu artifact trong một **S3 bucket** (artifact store) và truyền giữa các stage bằng tên.

- Source action xuất `SourceArtifact` → Build action nhận nó làm **input**, xuất `BuildArtifact` → Deploy action nhận `BuildArtifact`.
- Tên output của action này phải khớp tên input của action kia, nếu không pipeline lỗi.

```json
{
  "name": "Build",
  "actions": [{
    "name": "BuildAction",
    "inputArtifacts":  [{ "name": "SourceOutput" }],
    "outputArtifacts": [{ "name": "BuildOutput"  }],
    "configuration": { "ProjectName": "my-codebuild-project" }
  }]
}
```

> ⚠️ Bẫy: Artifact **không** tự động chảy xuyên suốt. Nếu Deploy stage cần file từ Source mà bạn chỉ khai báo `BuildOutput` làm input, file đó sẽ không có. Phải khai báo đúng input artifact mà action cần.

> 💡 Mẹo thi: Artifact store là **S3**, và nếu dùng **CMK** thì bucket phải được mã hóa bằng KMS key đó; mọi action cross-account đều cần KMS key + bucket policy. Câu hỏi "pipeline failed accessing artifacts cross-account" → nghĩ ngay tới **KMS key policy + S3 bucket policy**.

### Manual approval

Chèn action `Approval` để chặn pipeline chờ người duyệt (thường trước Deploy production). Có thể gắn SNS topic để gửi thông báo.

```json
{ "name": "Approve", "actionTypeId": { "category": "Approval", "owner": "AWS", "provider": "Manual", "version": "1" } }
```

> 💡 Mẹo thi: "Cần con người duyệt trước khi deploy prod" → **Manual approval action**, không phải Lambda, không phải SNS đơn thuần.

### Trigger pipeline khi có commit

- Với CodeConnections (GitHub) → trigger bằng **webhook** tự động.
- Với CodeCommit / S3 source → mặc định dùng **Amazon EventBridge** (khuyến nghị) hoặc periodic polling. EventBridge nhanh hơn polling.

> ⚠️ Bẫy: Polling chậm và bị deprecated dần. Đáp án "trigger pipeline tức thì khi push" → **EventBridge rule** (CodeCommit) hoặc **webhook** (CodeConnections), KHÔNG phải polling.

---

## CodeConnections cho source

CodeConnections (tên cũ: **CodeStar Connections**) là cách AWS kết nối tới **GitHub, GitHub Enterprise, Bitbucket, GitLab** một cách an toàn (OAuth-based), không cần lưu personal access token thủ công.

- Dùng cho Source action khi code nằm trên Git provider bên ngoài.
- Tạo connection ở trạng thái `PENDING` → phải vào console **authorize** thì mới `AVAILABLE`.

> 💡 Mẹo thi: Thấy "GitHub" + "CodePipeline source" + "không muốn lưu token thủ công" → **CodeConnections**. Đây là cách hiện đại; câu cũ có thể nhắc "GitHub webhook + OAuth token" nhưng AWS đang đẩy về CodeConnections.

---

## CodeBuild: buildspec.yml

CodeBuild chạy build trong container quản lý sẵn (managed) hoặc custom image. Nó đọc **`buildspec.yml`** đặt ở **root của source** (hoặc trỏ inline trong project config).

### Cấu trúc buildspec — 4 phase

```yaml
version: 0.2

env:
  variables:
    NODE_ENV: production
  parameter-store:
    DB_HOST: /myapp/db/host          # lấy từ SSM Parameter Store
  secrets-manager:
    DB_PASS: myapp/db:password        # lấy từ Secrets Manager

phases:
  install:        # cài runtime / tool
    runtime-versions:
      nodejs: 18
    commands:
      - npm ci
  pre_build:      # đăng nhập registry, chạy test chuẩn bị
    commands:
      - npm run lint
  build:          # lệnh build chính
    commands:
      - npm run build
  post_build:     # đóng gói, push image, notify
    commands:
      - echo Build done on `date`

artifacts:        # file nào được xuất ra cho stage sau
  files:
    - '**/*'
  base-directory: dist

cache:
  paths:
    - 'node_modules/**/*'
```

### Thứ tự và ý nghĩa các phase

| Phase | Dùng để làm gì | Ví dụ |
|---|---|---|
| `install` | Cài tool/runtime của môi trường build | cài Node, set runtime-versions |
| `pre_build` | Việc chuẩn bị trước build | `docker login` ECR, cài dependency, lint |
| `build` | Lệnh build/compile/test chính | `mvn package`, `npm run build` |
| `post_build` | Việc sau build | push Docker image, tạo file imagedefinitions |

> ⚠️ Bẫy: Nếu một lệnh trong phase **thất bại (exit non-zero)**, phase đó dừng, nhưng `post_build` **vẫn chạy** (vì nó dọn dẹp). Nếu bạn `docker push` ở post_build mà không kiểm tra build có pass không, có thể push image lỗi. Đề hay hỏi "tại sao image lỗi vẫn được push".

### Environment variables — thứ tự ưu tiên & bảo mật

| Cách khai báo | Nơi lưu | Khi nào dùng |
|---|---|---|
| `env.variables` | plaintext trong buildspec | giá trị không nhạy cảm |
| `env.parameter-store` | SSM Parameter Store | config, secret nhẹ |
| `env.secrets-manager` | Secrets Manager | mật khẩu, API key |

> ⚠️ Bẫy: **Không** để mật khẩu trong `env.variables` (plaintext, lộ trong log). Dùng `secrets-manager` hoặc `parameter-store` (SecureString). Đề hỏi "cách an toàn để truyền DB password vào build" → Secrets Manager / Parameter Store, KHÔNG phải plaintext env var.

### Artifacts & Caching

- `artifacts` định nghĩa file xuất ra. Trong CodePipeline, output này thành **output artifact** của Build action.
- `cache` (local hoặc **S3**) giúp tái dùng `node_modules`, `.m2`... → build nhanh hơn. Local cache nhanh nhưng không chia sẻ giữa các build host; S3 cache chia sẻ được.

> 💡 Mẹo thi: "Build chậm vì cài lại dependency mỗi lần" → bật **caching** (`cache.paths`), thường là **S3 cache** để dùng lại giữa các lần build.

> 💡 Mẹo thi: Container muốn push image lên ECR thì CodeBuild project cần **privileged mode = true** (Docker-in-Docker) và IAM role có quyền ECR.

---

## CodeDeploy: appspec.yml, deployment groups, hooks

CodeDeploy triển khai artifact lên hạ tầng. Đọc **`appspec.yml`** (EC2/on-prem) hoặc **`appspec.yaml/json`** (ECS/Lambda).

### Khái niệm

- **Application**: nhóm logic của deployment.
- **Deployment group**: tập target (EC2 theo tag, Auto Scaling group, Lambda function, ECS service) + cấu hình.
- **Deployment configuration**: chiến lược rollout (vd `OneAtATime`, `HalfAtATime`, `AllAtOnce`, hoặc canary/linear cho Lambda/ECS).

### Kiểu deployment theo nền tảng

| Compute | appspec mô tả gì | Kiểu deploy |
|---|---|---|
| **EC2 / on-prem** | hooks chạy script + `files` copy lên server | In-place hoặc Blue/Green |
| **Lambda** | version & alias dịch chuyển traffic | Canary / Linear / AllAtOnce (chỉ Blue/Green về traffic) |
| **ECS** | task definition mới + listener | Blue/Green qua ALB |

### Hooks — điểm thi nặng nhất của CodeDeploy

Hooks là các script chạy ở từng giai đoạn lifecycle. **Bộ hook khác nhau theo nền tảng.**

**EC2/on-prem lifecycle hooks (theo thứ tự):**

```
ApplicationStop → DownloadBundle* → BeforeInstall → Install* →
AfterInstall → ApplicationStart → ValidateService
```
(* = bước do CodeDeploy agent tự làm, không gắn script được)

**appspec.yml cho EC2:**

```yaml
version: 0.0
os: linux
files:
  - source: /
    destination: /var/www/html
hooks:
  BeforeInstall:
    - location: scripts/install_deps.sh
      timeout: 300
      runas: root
  AfterInstall:
    - location: scripts/configure.sh
  ApplicationStart:
    - location: scripts/start_server.sh
  ValidateService:
    - location: scripts/healthcheck.sh
```

**Lambda / ECS hooks (KHÁC EC2 — không có Install/file copy):**

| Lambda | ECS |
|---|---|
| `BeforeAllowTraffic` | `BeforeInstall` |
| `AfterAllowTraffic` | `AfterInstall` |
| | `AfterAllowTestTraffic` |
| | `BeforeAllowTraffic` |
| | `AfterAllowTraffic` |

Với Lambda/ECS, hook trỏ tới **một Lambda function** (để validate), không phải shell script.

> ⚠️ Bẫy CỰC HAY GẶP: Hook EC2 (`ApplicationStop`, `BeforeInstall`, `ApplicationStart`, `ValidateService`) **khác hoàn toàn** hook Lambda (`BeforeAllowTraffic`, `AfterAllowTraffic`). Đề cho 1 đáp án trộn lẫn để gài. Lambda/ECS chỉ có *AllowTraffic* hooks, KHÔNG có Install hook.

> 💡 Mẹo thi: "Chạy smoke test trước khi route traffic sang version Lambda mới" → **BeforeAllowTraffic** hook. "Kiểm tra sau khi đã route" → **AfterAllowTraffic**.

> 💡 Mẹo thi: "Kiểm tra app khỏe trên EC2 sau khi start" → **ValidateService** (hook cuối cùng của EC2).

### Blue/Green & Rollback

- **Blue/Green**: tạo môi trường mới (green), test, rồi chuyển traffic. EC2 cần ASG mới; ECS cần ALB. An toàn, rollback nhanh (chỉ chuyển traffic ngược).
- **In-place**: deploy đè lên instance cũ — rẻ nhưng có downtime, rollback chậm (phải deploy lại bản cũ).
- Rollback tự động khi CloudWatch alarm kích hoạt hoặc deployment fail.

> 💡 Mẹo thi: "Zero downtime + rollback tức thì" → **Blue/Green**. "Lambda canary 10% trong 5 phút" → deployment config `Canary10Percent5Minutes`.

### appspec.yml cho ECS (nhớ cấu trúc khác EC2)

```yaml
version: 0.0
Resources:
  - TargetService:
      Type: AWS::ECS::Service
      Properties:
        TaskDefinition: <TASK_DEFINITION_ARN>
        LoadBalancerInfo:
          ContainerName: "app"
          ContainerPort: 8080
Hooks:
  - AfterAllowTestTraffic: "LambdaFunctionToValidate"
```

> ⚠️ Bẫy: EC2 appspec dùng `files` + `hooks` (script). ECS appspec dùng `Resources` + `TaskDefinition` (không có `files`). Đề trộn cấu trúc để bẫy.

---

## CodeArtifact: package repository

CodeArtifact là **kho package riêng tư** cho npm, pip, Maven/Gradle, NuGet. Thay private Nexus/Artifactory.

- **Domain** chứa nhiều **repository**. Repository có thể có **upstream** (vd public npm) — package public được cache lại lần đầu kéo về.
- Auth bằng **token tạm** qua AWS CLI:

```bash
aws codeartifact login --tool npm \
  --domain my-domain --repository my-repo

# hoặc lấy token thủ công cho CI
export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain my-domain --query authorizationToken --output text)
```

- Token mặc định hết hạn **12 giờ** (tối đa cấu hình được).

> 💡 Mẹo thi: "Lưu trữ package nội bộ + proxy public npm + kiểm soát version dependency" → **CodeArtifact**. Trong CodeBuild, chạy `aws codeartifact login` ở phase **`pre_build`** hoặc `install` để cấu hình npm/pip trước khi `npm ci`.

> ⚠️ Bẫy: CodeArtifact KHÔNG phải nơi lưu build output/artifact của pipeline (đó là S3 artifact store). Nó lưu **dependency package**. Đừng nhầm "artifact" của pipeline với "package" của CodeArtifact.

---

## Ráp toàn bộ: ví dụ commit → deploy ECS

1. **Source** (CodeConnections → GitHub): push lên `main` trigger webhook → xuất `SourceOutput`.
2. **Build** (CodeBuild, `buildspec.yml`):
   - `install`: set runtime, `aws codeartifact login`
   - `pre_build`: `docker login` ECR
   - `build`: `docker build`
   - `post_build`: `docker push`, tạo `imagedefinitions.json` / appspec → `BuildOutput`.
3. **Deploy** (CodeDeploy ECS Blue/Green, `appspec.yml`): tạo task set mới, `AfterAllowTestTraffic` gọi Lambda validate, chuyển traffic qua ALB.

> 💡 Mẹo thi: File `imagedefinitions.json` (ECS standard deploy qua CodePipeline ECS action) hay `appspec.yaml + taskdef.json` (ECS Blue/Green qua CodeDeploy) phải nằm trong **output artifact của Build** thì Deploy mới dùng được.

---

## Bảng tổng kết phân biệt (học thuộc trước khi thi)

| Câu hỏi đề thường gặp | Đáp án |
|---|---|
| File chứa lệnh build? | **buildspec.yml** (CodeBuild) |
| File chứa hook/deploy instruction? | **appspec.yml** (CodeDeploy) |
| Truyền secret vào build an toàn? | Secrets Manager / Parameter Store, KHÔNG plaintext |
| Build chậm do cài lại deps? | bật **cache** (S3) |
| Kết nối GitHub source an toàn? | **CodeConnections** |
| Validate trước khi route traffic (Lambda)? | **BeforeAllowTraffic** hook |
| Health check sau khi start (EC2)? | **ValidateService** hook |
| Zero-downtime + rollback nhanh? | **Blue/Green** |
| Cần người duyệt trước prod? | **Manual approval** action |
| Trigger pipeline tức thì khi push CodeCommit? | **EventBridge** (không polling) |
| Kho package npm/pip nội bộ? | **CodeArtifact** |
| Artifact giữa các stage lưu ở đâu? | **S3** artifact store |
| Cross-account artifact lỗi? | **KMS key policy + S3 bucket policy** |
| Push Docker image trong CodeBuild? | **privileged mode = true** + IAM ECR |

## Checklist nhớ nhanh

- buildspec = build (CodeBuild); appspec = deploy (CodeDeploy). **Không bao giờ nhầm.**
- 4 phase buildspec: install → pre_build → build → post_build. post_build chạy cả khi build fail.
- EC2 hook: ApplicationStop → BeforeInstall → AfterInstall → ApplicationStart → ValidateService.
- Lambda/ECS hook: chỉ *AllowTraffic* + (ECS thêm test traffic), trỏ tới Lambda, không có Install.
- Secret build → Secrets Manager / Parameter Store.
- Source GitHub → CodeConnections. Trigger → webhook/EventBridge, không polling.
- Artifact pipeline ở S3; package dependency ở CodeArtifact. Hai thứ khác nhau.
- Blue/Green cho zero downtime; canary/linear cho Lambda/ECS từ từ.
