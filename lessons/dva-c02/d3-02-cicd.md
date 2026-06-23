# CI/CD Pipeline (CodePipeline, CodeBuild, CodeDeploy, CodeArtifact)

Domain 3 (Deployment) chiếm ~24% đề DVA-C02, và đây là nhóm dịch vụ bị hỏi nhiều nhất. Đề thi không bắt bạn viết pipeline từ đầu, mà bắt phân biệt **dịch vụ nào làm gì**, **file config nào của ai**, và **hook chạy ở đâu**. Học bài này theo tư duy: một commit đi từ Git tới production thì đi qua những trạm nào.

## Bức tranh tổng thể: một commit chạy qua đâu

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng CodePipeline: Source → Build → Deploy với artifact lưu ở S3</title>
  <desc>CodePipeline điều phối ba stage trái sang phải. Source dùng CodeConnections kéo từ Git, xuất SourceArtifact. Build dùng CodeBuild đọc buildspec.yml và kéo package từ CodeArtifact, xuất BuildArtifact. Deploy dùng CodeDeploy đọc appspec.yml triển khai lên EC2, Lambda hoặc ECS. Artifact giữa các stage lưu trong S3 artifact store.</desc>
  <defs>
    <marker id="cpArr" markerWidth="11" markerHeight="11" refX="8" refY="3.5" orient="auto"><path d="M0 0 L8 3.5 L0 7 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">CodePipeline — nhạc trưởng điều phối các stage</text>

  <rect x="16" y="40" width="688" height="120" rx="11" fill="#8b5cf6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="5 4"/>
  <text x="30" y="58" font-size="11" font-weight="700" fill="currentColor" opacity="0.75">CodePipeline</text>

  <g>
    <rect x="34" y="68" width="190" height="80" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="48" y="88" font-size="12.5" font-weight="700" fill="currentColor">Source</text>
    <text x="48" y="106" font-size="10.5" fill="currentColor" opacity="0.72">CodeConnections → Git</text>
    <text x="48" y="121" font-size="10.5" fill="currentColor" opacity="0.72">(GitHub/Bitbucket/S3)</text>
    <text x="48" y="138" font-size="10" fill="currentColor" opacity="0.55">webhook khi push</text>
  </g>

  <g>
    <rect x="265" y="68" width="190" height="80" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="279" y="88" font-size="12.5" font-weight="700" fill="currentColor">Build</text>
    <text x="279" y="106" font-size="10.5" fill="currentColor" opacity="0.72">CodeBuild · buildspec.yml</text>
    <text x="279" y="121" font-size="10.5" fill="currentColor" opacity="0.72">compile + test</text>
    <text x="279" y="138" font-size="10" fill="currentColor" opacity="0.55">kéo package ← CodeArtifact</text>
  </g>

  <g>
    <rect x="496" y="68" width="190" height="80" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="510" y="88" font-size="12.5" font-weight="700" fill="currentColor">Deploy</text>
    <text x="510" y="106" font-size="10.5" fill="currentColor" opacity="0.72">CodeDeploy · appspec.yml</text>
    <text x="510" y="123" font-size="10.5" fill="currentColor" opacity="0.72">→ EC2 / Lambda / ECS</text>
  </g>

  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M224 108 H263" marker-end="url(#cpArr)"/>
    <path d="M455 108 H494" marker-end="url(#cpArr)"/>
  </g>
  <text x="243" y="100" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">Source</text>
  <text x="243" y="123" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">Artifact</text>
  <text x="474" y="100" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">Build</text>
  <text x="474" y="123" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8">Artifact</text>

  <g stroke="currentColor" stroke-opacity="0.4" fill="none" stroke-dasharray="4 3">
    <path d="M129 148 V216" marker-end="url(#cpArr)"/>
    <path d="M360 148 V216" marker-end="url(#cpArr)"/>
  </g>
  <rect x="34" y="222" width="440" height="56" rx="9" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="254" y="244" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">S3 artifact store</text>
  <text x="254" y="262" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">artifact giữa các stage lưu/đọc ở đây (mã hoá KMS nếu cross-account)</text>

  <rect x="496" y="222" width="190" height="56" rx="9" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="591" y="244" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">CodeArtifact</text>
  <text x="591" y="262" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">kho package (npm/pip/maven)</text>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none" stroke-dasharray="4 3">
    <path d="M600 220 C 600 175, 520 150, 456 132" marker-end="url(#cpArr)"/>
  </g>
  <text x="612" y="200" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">pull</text>

  <text x="16" y="308" font-size="10.5" fill="currentColor" opacity="0.6">Artifact store (S3) ≠ CodeArtifact: S3 giữ build output của pipeline; CodeArtifact giữ dependency package.</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 470" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh lifecycle hook của CodeDeploy: EC2/on-prem vs Lambda vs ECS</title>
  <desc>Ba cột song song theo thứ tự thời gian đi xuống. Cột EC2/on-prem có chuỗi hook đầy đủ gồm copy file: ApplicationStop, BeforeInstall, Install, AfterInstall, ApplicationStart, ValidateService. Cột Lambda chỉ có BeforeAllowTraffic và AfterAllowTraffic. Cột ECS có BeforeInstall, AfterInstall, AfterAllowTestTraffic, BeforeAllowTraffic, AfterAllowTraffic. Điểm nhấn: Lambda và ECS KHÔNG có bước Install/copy file như EC2.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Hook lifecycle theo nền tảng — đọc từ trên xuống (thứ tự thời gian)</text>

  <text x="120" y="48" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2 / on-prem</text>
  <text x="120" y="64" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">script trên host</text>
  <text x="360" y="48" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Lambda</text>
  <text x="360" y="64" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">hook = Lambda validate</text>
  <text x="600" y="48" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">ECS</text>
  <text x="600" y="64" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">hook = Lambda validate</text>

  <defs>
    <marker id="hkArr" markerWidth="9" markerHeight="9" refX="4.5" refY="7" orient="auto"><path d="M0 0 L4.5 7 L9 0" fill="none" stroke="currentColor" stroke-opacity="0.5"/></marker>
  </defs>

  <g font-size="10.5">
    <rect x="30" y="78" width="180" height="30" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="120" y="97" text-anchor="middle" fill="currentColor">ApplicationStop</text>
    <rect x="30" y="116" width="180" height="30" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="120" y="135" text-anchor="middle" fill="currentColor">BeforeInstall</text>
    <rect x="30" y="154" width="180" height="30" rx="7" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="120" y="173" text-anchor="middle" font-weight="700" fill="currentColor">Install (copy file)*</text>
    <rect x="30" y="192" width="180" height="30" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="120" y="211" text-anchor="middle" fill="currentColor">AfterInstall</text>
    <rect x="30" y="230" width="180" height="30" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="120" y="249" text-anchor="middle" fill="currentColor">ApplicationStart</text>
    <rect x="30" y="268" width="180" height="30" rx="7" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="120" y="287" text-anchor="middle" font-weight="700" fill="currentColor">ValidateService</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M120 108 V114" marker-end="url(#hkArr)"/>
    <path d="M120 146 V152" marker-end="url(#hkArr)"/>
    <path d="M120 184 V190" marker-end="url(#hkArr)"/>
    <path d="M120 222 V228" marker-end="url(#hkArr)"/>
    <path d="M120 260 V266" marker-end="url(#hkArr)"/>
  </g>

  <g font-size="10.5">
    <rect x="270" y="116" width="180" height="30" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="360" y="135" text-anchor="middle" fill="currentColor">BeforeAllowTraffic</text>
    <rect x="270" y="192" width="180" height="30" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="360" y="211" text-anchor="middle" fill="currentColor">AfterAllowTraffic</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.35" fill="none" stroke-dasharray="3 3">
    <path d="M360 146 V190" marker-end="url(#hkArr)"/>
  </g>
  <text x="360" y="170" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">↓ chuyển traffic</text>

  <g font-size="10.5">
    <rect x="510" y="78" width="180" height="30" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="600" y="97" text-anchor="middle" fill="currentColor">BeforeInstall</text>
    <rect x="510" y="116" width="180" height="30" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="600" y="135" text-anchor="middle" fill="currentColor">AfterInstall</text>
    <rect x="510" y="154" width="180" height="30" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="600" y="173" text-anchor="middle" fill="currentColor">AfterAllowTestTraffic</text>
    <rect x="510" y="192" width="180" height="30" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="600" y="211" text-anchor="middle" fill="currentColor">BeforeAllowTraffic</text>
    <rect x="510" y="230" width="180" height="30" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="600" y="249" text-anchor="middle" fill="currentColor">AfterAllowTraffic</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none">
    <path d="M600 108 V114" marker-end="url(#hkArr)"/>
    <path d="M600 146 V152" marker-end="url(#hkArr)"/>
    <path d="M600 184 V190" marker-end="url(#hkArr)"/>
    <path d="M600 222 V228" marker-end="url(#hkArr)"/>
  </g>

  <rect x="30" y="320" width="660" height="56" rx="9" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="46" y="343" font-size="11.5" font-weight="700" fill="currentColor">Khác biệt then chốt</text>
  <text x="46" y="362" font-size="10.5" fill="currentColor" opacity="0.78">Chỉ EC2/on-prem có bước Install + copy file (ô hổ phách). Lambda/ECS KHÔNG có Install — chỉ xoay quanh *AllowTraffic.</text>

  <text x="30" y="398" font-size="10" fill="currentColor" opacity="0.6">* Install và DownloadBundle do CodeDeploy agent tự làm — không gắn script được.</text>
  <text x="30" y="416" font-size="10" fill="currentColor" opacity="0.6">EC2/on-prem: hook = shell script trên host. Lambda/ECS: hook = một Lambda function để validate.</text>
</svg>

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
