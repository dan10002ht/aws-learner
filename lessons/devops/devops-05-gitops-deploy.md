# GitOps & Deployment Strategies

Bạn đã biết `kubectl apply` và rollout/rollback thủ công ở bài trước. Bài này trả lời câu hỏi vận hành thật: **làm sao để trạng thái cluster luôn khớp với những gì đã review và merge?** Và khi deploy một version mới, **làm sao đổi traffic mà không gây downtime hay sự cố lan rộng?**

Hai chủ đề ghép lại: **GitOps** (Git là source of truth, có máy tự đồng bộ) và **deployment strategies** (cách đưa version mới vào production an toàn).

## GitOps: Git là source of truth

Ý tưởng cốt lõi: **trạng thái mong muốn (desired state) của hệ thống được khai báo trong Git**, và một agent chạy trong cluster liên tục so sánh trạng thái thật với Git rồi tự sửa cho khớp. Đây là **reconcile loop**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Reconcile loop của GitOps theo mô hình pull</title>
  <desc>Git giữ desired state; agent trong cluster pull về rồi lặp observe, diff, act để hội tụ cluster về đúng Git. Credential không rời cluster vì agent chủ động kéo, không ai push vào cluster.</desc>
  <defs>
    <marker id="ar1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 Z" fill="currentColor"/></marker>
  </defs>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Reconcile loop — pull model</text>

  <!-- Git: desired state -->
  <rect x="16" y="48" width="190" height="84" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="111" y="76" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Git repo</text>
  <text x="111" y="96" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.72">desired state (YAML)</text>
  <text x="111" y="114" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.72">source of truth</text>

  <!-- pull arrow from cluster to git -->
  <path d="M300 70 C 250 70 250 70 210 80" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar1)"/>
  <text x="252" y="58" font-size="11" text-anchor="middle" fill="currentColor" font-weight="700">pull ↤</text>

  <!-- Cluster boundary -->
  <rect x="296" y="44" width="408" height="296" rx="12" fill="#3b82f6" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.22" stroke-dasharray="5 4"/>
  <text x="500" y="64" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.85">Cluster (credential ở lại trong đây)</text>

  <!-- Agent box -->
  <rect x="316" y="76" width="150" height="52" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="391" y="98" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Agent</text>
  <text x="391" y="115" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Argo CD / Flux</text>

  <!-- cycle: observe -> diff -> act -->
  <rect x="332" y="156" width="120" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="392" y="178" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">observe</text>
  <text x="392" y="194" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">đọc trạng thái thật</text>

  <rect x="548" y="156" width="120" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="608" y="178" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">diff</text>
  <text x="608" y="194" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">so với Git</text>

  <rect x="548" y="252" width="120" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="608" y="274" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">act</text>
  <text x="608" y="290" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">apply phần khác biệt</text>

  <!-- cluster state box -->
  <rect x="332" y="252" width="120" height="48" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="392" y="274" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">cluster</text>
  <text x="392" y="290" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">hội tụ về desired</text>

  <!-- loop arrows -->
  <path d="M452 180 L 548 180" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar1)"/>
  <path d="M608 204 L 608 252" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar1)"/>
  <path d="M548 276 L 452 276" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar1)"/>
  <path d="M392 252 L 392 204" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar1)"/>
  <text x="500" y="332" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">lặp lại liên tục → tự sửa drift</text>
</svg>

So với cách làm cũ (chạy `kubectl apply` từ máy CI hoặc laptop), GitOps có 4 đặc tính:

| Đặc tính | Ý nghĩa thực tế |
|---|---|
| Declarative | Mô tả "muốn gì" (YAML), không phải "chạy lệnh nào" |
| Versioned & immutable | Mọi thay đổi là một commit — có lịch sử, có người duyệt, rollback = `git revert` |
| Pulled automatically | Agent trong cluster **pull** từ Git, không ai push vào cluster |
| Continuously reconciled | Sửa tay trên cluster (drift) sẽ bị agent ghi đè lại |

### Pull vs Push

Đây là điểm phân biệt quan trọng nhất khi đi phỏng vấn hoặc thiết kế:

| | Push (CI truyền thống) | Pull (GitOps) |
|---|---|---|
| Ai khởi động deploy | CI pipeline chạy `kubectl/helm apply` | Agent trong cluster tự kéo về |
| Credential cluster nằm ở | Trong CI runner (ngoài cluster) | Chỉ trong cluster |
| Drift detection | Không có sẵn | Tự phát hiện & tự sửa |
| Bề mặt tấn công | CI có quyền admin vào prod | Cluster không mở cổng vào cho ai |
| Multi-cluster | Phải cấu hình credential từng cluster | Mỗi cluster tự kéo, dễ scale |

> 💡 Ghi nhớ: Pull model an toàn hơn vì **không credential production nào rời khỏi cluster**. CI chỉ có quyền ghi vào Git repo, không có quyền vào cluster.

### Hai tool chính: Argo CD & Flux

Cả hai đều là agent reconcile chạy trong cluster. Ví dụ một `Application` của **Argo CD**:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-api
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/acme/k8s-manifests.git
    targetRevision: main        # branch/tag/commit theo dõi
    path: apps/payment-api/prod  # thư mục chứa manifest
  destination:
    server: https://kubernetes.default.svc
    namespace: payment
  syncPolicy:
    automated:
      prune: true     # xoá resource đã bị xoá khỏi Git
      selfHeal: true  # ghi đè drift do sửa tay
    syncOptions:
      - CreateNamespace=true
```

Tương đương bên **Flux** dùng 2 CRD `GitRepository` + `Kustomization`:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: k8s-manifests
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/acme/k8s-manifests.git
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: payment-api
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/payment-api/prod
  prune: true
  sourceRef:
    kind: GitRepository
    name: k8s-manifests
  targetNamespace: payment
```

| | Argo CD | Flux |
|---|---|---|
| Giao diện | Web UI mạnh, xem topology trực quan | CLI-first, không UI mặc định |
| Mô hình | App-centric (`Application` CRD) | Toolkit nhiều controller nhỏ |
| Phù hợp | Đội cần dashboard, nhiều app, RBAC UI | Đội thích GitOps "thuần", tự động hoá sâu |
| Progressive delivery | Argo Rollouts (cùng hệ) | Flagger (cùng hệ) |

> ⚠️ Bẫy production: Bật `selfHeal: true` rồi vẫn `kubectl edit` hotfix trực tiếp trên prod — agent sẽ revert thay đổi của bạn sau vài giây, gây sự cố "sửa hoài không ăn". Mọi hotfix phải đi qua Git, kể cả lúc khẩn cấp.

### Tách config khỏi code: hai repo

Pattern chuẩn là **app repo** (code, Dockerfile) tách khỏi **config repo** (manifest K8s). Lý do:

- App repo build image → push lên registry với tag là digest/commit SHA.
- CI cập nhật tag image trong **config repo** (một commit nhỏ).
- Argo CD/Flux thấy config repo đổi → deploy.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Pattern hai repo: app-repo, config-repo và reconcile vào cluster</title>
  <desc>App-repo build image gắn tag SHA rồi push lên registry. CI commit cập nhật tag image vào config-repo. Argo CD hoặc Flux reconcile config-repo và deploy vào cluster.</desc>
  <defs>
    <marker id="ar2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 Z" fill="currentColor"/></marker>
  </defs>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Hai repo: tách code khỏi config</text>

  <!-- Row 1: app-repo flow -->
  <rect x="16" y="48" width="150" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="91" y="72" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">app-repo</text>
  <text x="91" y="90" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">code · Dockerfile</text>

  <path d="M166 76 L 214 76" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar2)"/>
  <text x="190" y="68" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">build</text>

  <rect x="216" y="48" width="170" height="56" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="301" y="72" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">image:abc1234</text>
  <text x="301" y="90" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">tag = commit SHA</text>

  <path d="M386 76 L 434 76" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar2)"/>
  <text x="410" y="68" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">push</text>

  <rect x="436" y="48" width="150" height="56" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="511" y="72" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">registry</text>
  <text x="511" y="90" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">ECR / Docker Hub</text>

  <!-- CI commits to config-repo -->
  <path d="M91 104 L 91 168" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar2)"/>
  <rect x="120" y="118" width="200" height="34" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="220" y="140" font-size="11" text-anchor="middle" fill="currentColor" font-weight="700">CI commit: cập nhật tag</text>

  <!-- Row 2: config-repo -->
  <rect x="16" y="172" width="688" height="62" rx="10" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="40" y="198" font-size="12.5" font-weight="700" fill="currentColor">config-repo</text>
  <text x="40" y="218" font-size="11" fill="currentColor" opacity="0.78">deployment.yaml → image: registry/payment:abc1234</text>

  <!-- reconcile to cluster -->
  <path d="M360 234 L 360 274" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar2)"/>
  <text x="360" y="259" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.78" font-weight="700">Argo CD / Flux reconcile</text>

  <rect x="260" y="278" width="200" height="48" rx="10" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="307" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">cluster</text>
</svg>

> 💡 Ghi nhớ: **Không bao giờ dùng tag `:latest` trong GitOps.** Desired state phải bất biến — image phải pin theo digest hoặc commit SHA, nếu không reconcile loop mất nghĩa (Git không đổi nhưng image lại đổi).

## Deployment strategies

Khi version mới sẵn sàng, có nhiều cách đưa nó thay version cũ. Đánh đổi giữa **downtime, chi phí (số replica chạy song song), tốc độ rollback, và bán kính ảnh hưởng (blast radius)**.

| Strategy | Downtime | 2 version chạy cùng lúc? | Chi phí | Rollback |
|---|---|---|---|---|
| Recreate | Có (vài giây–phút) | Không | Thấp | Deploy lại bản cũ |
| Rolling | Không | Có (tạm thời) | Thấp | Rollout undo (chậm dần) |
| Blue-Green | Không | Có (full 2 bộ) | Cao (2x) | Đổi switch tức thì |
| Canary | Không | Có (vài %) | Trung bình | Cắt traffic canary |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Bốn deployment strategy đặt cạnh nhau</title>
  <desc>So sánh Recreate, Rolling, Blue-Green và Canary qua phân bố replica và traffic. Recreate tắt hết rồi bật lại có downtime. Rolling thay dần từng pod. Blue-Green chạy hai bộ đầy đủ rồi đổi switch. Canary đẩy vài phần trăm traffic sang version mới nên blast radius nhỏ nhất.</desc>
  <!-- legend -->
  <rect x="16" y="14" width="14" height="14" rx="3" fill="#3b82f6" fill-opacity="0.55"/>
  <text x="36" y="26" font-size="11" fill="currentColor">version cũ (stable)</text>
  <rect x="186" y="14" width="14" height="14" rx="3" fill="#10b981" fill-opacity="0.7"/>
  <text x="206" y="26" font-size="11" fill="currentColor">version mới</text>
  <rect x="320" y="14" width="14" height="14" rx="3" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="340" y="26" font-size="11" fill="currentColor">đang tắt (downtime)</text>

  <!-- ===== Recreate ===== -->
  <text x="92" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Recreate</text>
  <text x="92" y="74" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">tắt hết → bật mới</text>
  <rect x="34" y="84" width="116" height="180" rx="9" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18"/>
  <!-- empty / down -->
  <rect x="46" y="158" width="92" height="36" rx="6" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 3"/>
  <text x="92" y="181" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">cũ DOWN</text>
  <rect x="46" y="200" width="92" height="0" />
  <text x="92" y="222" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">↓ rồi mới UP</text>
  <text x="92" y="282" font-size="10" text-anchor="middle" fill="#f59e0b">có downtime</text>

  <!-- ===== Rolling ===== -->
  <text x="246" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Rolling</text>
  <text x="246" y="74" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">thay dần từng pod</text>
  <rect x="188" y="84" width="116" height="180" rx="9" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18"/>
  <rect x="200" y="96"  width="92" height="20" rx="4" fill="#10b981" fill-opacity="0.7"/>
  <rect x="200" y="120" width="92" height="20" rx="4" fill="#10b981" fill-opacity="0.7"/>
  <rect x="200" y="144" width="92" height="20" rx="4" fill="#3b82f6" fill-opacity="0.55"/>
  <rect x="200" y="168" width="92" height="20" rx="4" fill="#3b82f6" fill-opacity="0.55"/>
  <rect x="200" y="192" width="92" height="20" rx="4" fill="#3b82f6" fill-opacity="0.55"/>
  <text x="246" y="234" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">1 bộ, đổi từ từ</text>
  <text x="246" y="282" font-size="10" text-anchor="middle" fill="#10b981">không downtime</text>

  <!-- ===== Blue-Green ===== -->
  <text x="416" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Blue-Green</text>
  <text x="416" y="74" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">2 bộ đầy đủ + switch</text>
  <rect x="358" y="84" width="116" height="180" rx="9" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="385" y="104" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">blue</text>
  <rect x="368" y="108" width="38" height="100" rx="5" fill="#3b82f6" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="447" y="104" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">green</text>
  <rect x="428" y="108" width="38" height="100" rx="5" fill="#10b981" fill-opacity="0.6" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="416" y="230" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">switch → green</text>
  <text x="416" y="282" font-size="10" text-anchor="middle" fill="#f59e0b">chi phí 2x</text>

  <!-- ===== Canary ===== -->
  <text x="586" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Canary</text>
  <text x="586" y="74" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">vài % traffic</text>
  <rect x="528" y="84" width="116" height="180" rx="9" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18"/>
  <!-- traffic split bar -->
  <rect x="540" y="100" width="92" height="108" rx="6" fill="#3b82f6" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="540" y="100" width="92" height="14" rx="6" fill="#10b981" fill-opacity="0.7"/>
  <text x="586" y="111" font-size="9" text-anchor="middle" fill="#fff">~10%</text>
  <text x="586" y="165" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">90% stable</text>
  <text x="586" y="230" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">tăng dần nếu OK</text>
  <text x="586" y="282" font-size="10" text-anchor="middle" fill="#10b981">blast radius nhỏ nhất</text>
</svg>

### Recreate

Tắt hết pod cũ rồi mới bật pod mới. Đơn giản, nhưng **có downtime**. Chỉ dùng khi app không cho phép 2 version chạy song song (ví dụ schema migration không tương thích ngược).

```yaml
spec:
  strategy:
    type: Recreate
```

### Rolling update (mặc định của K8s)

Thay pod từ từ, vài pod một, vừa giữ service vừa đổi version.

```yaml
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1   # tối đa 1 pod down trong lúc rollout
      maxSurge: 2         # tạo thêm tối đa 2 pod mới
```

> ⚠️ Bẫy production: Rolling update mặc định chạy ngay cả khi pod mới bị crashloop — readiness probe sai cấu hình khiến pod "Ready" giả, và rollout đẩy hết 10 pod lỗi ra production. **Readiness probe đúng là phanh an toàn của rolling update.** Không có probe = không có phanh.

### Blue-Green

Chạy **hai môi trường đầy đủ**: blue (đang live) và green (version mới). Test green xong thì đổi Service trỏ sang green. Lỗi thì trỏ ngược về blue tức thì.

```yaml
# Service chỉ cần đổi selector từ version: blue sang version: green
apiVersion: v1
kind: Service
metadata:
  name: payment
spec:
  selector:
    app: payment
    version: green   # đổi 1 dòng này = chuyển toàn bộ traffic
  ports:
    - port: 80
      targetPort: 8080
```

Ưu: rollback tức thì, test green như thật trước khi nhận traffic. Nhược: tốn gấp đôi tài nguyên; cần lo database/migration tương thích cả hai version trong lúc chuyển.

### Canary

Đẩy version mới cho **một phần nhỏ traffic** (5% → 25% → 50% → 100%), quan sát metric ở mỗi bước. Lỗi thì cắt sớm, chỉ vài % user bị ảnh hưởng — **blast radius nhỏ nhất**.

Làm tay với 2 Deployment + tỉ lệ replica là cách thô sơ. Cách đúng là dùng **progressive delivery controller**.

## Progressive delivery: tự động hoá canary theo metric

Canary thủ công có vấn đề: ai ngồi canh metric, ai bấm "tăng 25%", ai bấm rollback lúc 2h sáng? **Progressive delivery** tự động hoá việc này: controller tự tăng traffic theo từng bước và **tự rollback nếu metric vượt ngưỡng**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Canary progressive delivery với auto-rollback theo metric</title>
  <desc>Controller tăng traffic canary theo bước 10%, 50%, 100%. Sau mỗi bước có analysis truy vấn metric error rate, latency và business metric. Nếu vượt ngưỡng thì tự cắt traffic canary về 100% stable và đánh dấu rollout thất bại.</desc>
  <defs>
    <marker id="ar4" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 Z" fill="currentColor"/></marker>
    <marker id="ar4r" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 Z" fill="#ef4444"/></marker>
  </defs>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Progressive delivery + auto-rollback</text>
  <text x="16" y="44" font-size="11" fill="currentColor" opacity="0.65">thời gian →</text>

  <!-- baseline track -->
  <line x1="16" y1="118" x2="704" y2="118" stroke="currentColor" stroke-opacity="0.25" stroke-width="1"/>

  <!-- Step 10% -->
  <rect x="28" y="78" width="110" height="56" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="83" y="102" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">10%</text>
  <text x="83" y="120" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">traffic canary</text>

  <path d="M138 106 L 176 106" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar4)"/>

  <!-- Analysis gate 1 -->
  <rect x="178" y="80" width="96" height="52" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="226" y="101" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">analysis</text>
  <text x="226" y="118" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">đo metric</text>

  <path d="M274 106 L 312 106" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar4)"/>
  <text x="293" y="98" font-size="9.5" text-anchor="middle" fill="#10b981">OK</text>

  <!-- Step 50% -->
  <rect x="314" y="78" width="110" height="56" rx="9" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="369" y="102" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">50%</text>
  <text x="369" y="120" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">traffic canary</text>

  <path d="M424 106 L 462 106" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar4)"/>

  <!-- Analysis gate 2 -->
  <rect x="464" y="80" width="96" height="52" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="512" y="101" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">analysis</text>
  <text x="512" y="118" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">đo metric</text>

  <path d="M560 106 L 598 106" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar4)"/>
  <text x="579" y="98" font-size="9.5" text-anchor="middle" fill="#10b981">OK</text>

  <!-- Step 100% -->
  <rect x="600" y="78" width="104" height="56" rx="9" fill="#10b981" fill-opacity="0.28" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="652" y="102" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">100%</text>
  <text x="652" y="120" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">promote</text>

  <!-- metric legend under analysis -->
  <text x="16" y="170" font-size="11.5" font-weight="700" fill="currentColor">Mỗi analysis truy vấn:</text>
  <rect x="160" y="158" width="150" height="22" rx="11" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="235" y="173" font-size="10.5" text-anchor="middle" fill="currentColor">error rate (5xx)</text>
  <rect x="322" y="158" width="150" height="22" rx="11" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="397" y="173" font-size="10.5" text-anchor="middle" fill="currentColor">latency p95/p99</text>
  <rect x="484" y="158" width="170" height="22" rx="11" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="569" y="173" font-size="10.5" text-anchor="middle" fill="currentColor">business metric</text>

  <!-- rollback branch -->
  <path d="M226 132 L 226 232" fill="none" stroke="#ef4444" stroke-width="1.8" marker-end="url(#ar4r)"/>
  <path d="M512 132 L 512 200 L 360 200 L 360 232" fill="none" stroke="#ef4444" stroke-width="1.8" marker-end="url(#ar4r)"/>
  <text x="250" y="216" font-size="10.5" fill="#ef4444" font-weight="700">vượt ngưỡng</text>

  <!-- rollback box -->
  <rect x="120" y="236" width="480" height="64" rx="10" fill="#ef4444" fill-opacity="0.1" stroke="#ef4444" stroke-opacity="0.5"/>
  <text x="360" y="262" font-size="13" font-weight="700" text-anchor="middle" fill="#ef4444">Auto-rollback</text>
  <text x="360" y="284" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.82">cắt traffic canary → 100% về stable, đánh dấu rollout failed</text>
</svg>

### Argo Rollouts

Thay `Deployment` bằng CRD `Rollout`. Ví dụ canary có analysis:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: payment-api
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 10          # 10% traffic sang canary
        - pause: { duration: 5m }
        - analysis:              # kiểm tra metric, fail = rollback
            templates:
              - templateName: error-rate
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 100
  selector:
    matchLabels: { app: payment-api }
  template:
    metadata:
      labels: { app: payment-api }
    spec:
      containers:
        - name: api
          image: registry/payment:abc1234
```

`AnalysisTemplate` định nghĩa điều kiện pass/fail dựa trên Prometheus:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: error-rate
spec:
  metrics:
    - name: error-rate
      interval: 1m
      successCondition: result < 0.01   # lỗi < 1%
      failureLimit: 3                    # fail 3 lần liên tiếp = rollback
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{job="payment-api",status=~"5.."}[2m]))
            /
            sum(rate(http_requests_total{job="payment-api"}[2m]))
```

### Flagger (hệ Flux)

Flagger làm điều tương tự nhưng bọc quanh một `Deployment` thường, dùng `Canary` CRD:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: payment-api
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-api
  analysis:
    interval: 1m
    threshold: 5            # 5 lần đo fail = rollback
    maxWeight: 50
    stepWeight: 10          # mỗi bước +10% traffic
    metrics:
      - name: request-success-rate
        thresholdRange: { min: 99 }   # tỉ lệ thành công >= 99%
        interval: 1m
      - name: request-duration
        thresholdRange: { max: 500 }  # p99 latency <= 500ms
        interval: 1m
```

| | Argo Rollouts | Flagger |
|---|---|---|
| Object | `Rollout` thay `Deployment` | Bọc quanh `Deployment` có sẵn |
| Hệ sinh thái | Argo CD | Flux |
| Traffic shaping | Cần service mesh / ingress (SMI, Istio, NGINX) | Cần service mesh / ingress tương tự |
| Điều khiển bước | Khai báo `steps` chi tiết | `stepWeight` đều đặn |

> 💡 Ghi nhớ: Progressive delivery cần **traffic splitting** ở tầng mạng (service mesh như Istio/Linkerd, hoặc ingress hỗ trợ weight). Nếu không có, controller chỉ chia traffic theo tỉ lệ số pod — kém chính xác.

## Automated rollback theo metric

Đây là giá trị thật của progressive delivery: **rollback không phụ thuộc con người**. Cơ chế:

1. Controller đẩy x% traffic sang canary.
2. Mỗi `interval`, query metric (error rate, latency p99, hoặc custom business metric).
3. So với `successCondition` / `thresholdRange`.
4. Quá số lần fail cho phép → **tự động cắt traffic canary, trả 100% về stable**, đánh dấu rollout failed.

Chọn metric đúng quan trọng hơn cơ chế:

- **Error rate** (tỉ lệ 5xx): bắt lỗi lộ liễu.
- **Latency p95/p99**: bắt regression hiệu năng mà error rate không thấy.
- **Business metric** (tỉ lệ thanh toán thành công, tỉ lệ thêm giỏ hàng): bắt lỗi logic mà HTTP vẫn 200.

> ⚠️ Bẫy production: Chỉ canh error rate, không canh business metric. Một bug khiến nút "Mua" lặng lẽ không gọi API — HTTP vẫn 200, error rate vẫn 0%, canary pass và lên 100%. Doanh thu rớt mới phát hiện. **Luôn có ít nhất một business metric trong analysis.**

## Feature flags vs deploy

Một phân biệt then chốt mà nhiều người gộp nhầm:

- **Deploy** = đưa code mới lên server (thay đổi binary đang chạy).
- **Release** = bật tính năng cho user thấy.

**Feature flag** tách hai việc này. Bạn deploy code mới với tính năng **tắt sẵn**, rồi bật dần bằng cấu hình runtime — không cần deploy lại.

```python
if flags.is_enabled("new-checkout-flow", user=current_user):
    return new_checkout()
return old_checkout()
```

| | Deployment strategy (canary...) | Feature flag |
|---|---|---|
| Tách traffic theo | Hạ tầng (network/mesh) | Logic ứng dụng (theo user, region, %...) |
| Bật/tắt tính năng | Cần deploy version mới | Đổi cấu hình runtime, tức thì |
| Rollback | Rollout/switch | Tắt flag (mili-giây) |
| Hợp với | Đổi toàn bộ version, infra | Bật từng tính năng, A/B test, kill switch |

Hai thứ này **bổ sung** nhau: dùng canary để đảm bảo binary mới ổn định, dùng feature flag để release tính năng cho từng nhóm user và làm **kill switch** khi sự cố.

> 💡 Ghi nhớ: Có feature flag thì **rollback một tính năng lỗi không cần rollback cả deploy** — chỉ cần tắt flag, các tính năng khác trong cùng release vẫn chạy. Đây là lý do trunk-based development + feature flag rất phổ biến.

> ⚠️ Bẫy production: Flag để mãi không dọn ("flag debt") khiến code đầy nhánh `if` chết, logic rối, khó test mọi tổ hợp. Đặt ngày hết hạn cho mỗi flag và xoá khi tính năng đã ổn định 100%.

## Liên hệ sang AWS

Các khái niệm trên ánh xạ trực tiếp sang dịch vụ AWS:

| Khái niệm | Trên AWS |
|---|---|
| GitOps controller (Argo CD/Flux) | Chạy Argo CD/Flux trên **EKS**; AWS có **Flux add-on** cho EKS; **CodePipeline + EKS** cho push model |
| Cluster Kubernetes | **Amazon EKS** (hoặc **ECS** nếu không cần K8s) |
| Pipeline CI/CD | **CodePipeline** + **CodeBuild**; cập nhật config repo trong **CodeCommit**/GitHub |
| Registry image (pin digest) | **Amazon ECR** — tham chiếu image theo digest `@sha256:...` |
| Blue-Green / Canary có sẵn | **AWS CodeDeploy** hỗ trợ blue-green và canary native cho **ECS**, **Lambda**, EC2 |
| Canary cho Lambda | **Lambda alias** + **weighted alias** (dịch chuyển % traffic) + **CodeDeploy** |
| Traffic shifting & rollback theo metric | CodeDeploy gắn **CloudWatch alarm** → vượt ngưỡng tự rollback |
| Feature flags | **AWS AppConfig** (feature flags + validation + rollout có alarm rollback) |
| Service mesh cho canary trên EKS | **App Mesh** hoặc Istio/Linkerd tự cài |

Ví dụ tương đương "rollback tự động theo metric" của Argo Rollouts trên ECS: **CodeDeploy** triển khai canary (`Canary10Percent5Minutes`), gắn **CloudWatch alarm** lên error rate; alarm kêu trong cửa sổ bake → CodeDeploy tự đảo về task set cũ. Cùng triết lý, khác công cụ.

> 💡 Ghi nhớ: Trên AWS, nếu dùng **ECS/Lambda** thì blue-green/canary + auto-rollback có sẵn qua **CodeDeploy + CloudWatch alarm** — không cần tự dựng Argo Rollouts. Nếu dùng **EKS** và muốn GitOps thuần, cài Argo CD + Argo Rollouts (hoặc Flux + Flagger) như trên cluster bất kỳ.
