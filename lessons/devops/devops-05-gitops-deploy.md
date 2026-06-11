# GitOps & Deployment Strategies

Bạn đã biết `kubectl apply` và rollout/rollback thủ công ở bài trước. Bài này trả lời câu hỏi vận hành thật: **làm sao để trạng thái cluster luôn khớp với những gì đã review và merge?** Và khi deploy một version mới, **làm sao đổi traffic mà không gây downtime hay sự cố lan rộng?**

Hai chủ đề ghép lại: **GitOps** (Git là source of truth, có máy tự đồng bộ) và **deployment strategies** (cách đưa version mới vào production an toàn).

## GitOps: Git là source of truth

Ý tưởng cốt lõi: **trạng thái mong muốn (desired state) của hệ thống được khai báo trong Git**, và một agent chạy trong cluster liên tục so sánh trạng thái thật với Git rồi tự sửa cho khớp. Đây là **reconcile loop**.

```
observe   → đọc trạng thái thật trong cluster
diff      → so với manifest trong Git (desired state)
act       → apply phần khác biệt để hội tụ về desired
(lặp lại liên tục)
```

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

```
app-repo:    code → build → image:abc1234 → registry
                                     │
                              CI mở PR / commit
                                     ▼
config-repo: deployment.yaml: image: registry/payment:abc1234
                                     │
                              Argo CD reconcile
                                     ▼
                                 cluster
```

> 💡 Ghi nhớ: **Không bao giờ dùng tag `:latest` trong GitOps.** Desired state phải bất biến — image phải pin theo digest hoặc commit SHA, nếu không reconcile loop mất nghĩa (Git không đổi nhưng image lại đổi).

## Deployment strategies

Khi version mới sẵn sàng, có nhiều cách đưa nó thay version cũ. Đánh đổi giữa **downtime, chi phí (số replica chạy song song), tốc độ rollback, và bán kính ảnh hưởng (blast radius)**.

| Strategy | Downtime | 2 version chạy cùng lúc? | Chi phí | Rollback |
|---|---|---|---|---|
| Recreate | Có (vài giây–phút) | Không | Thấp | Deploy lại bản cũ |
| Rolling | Không | Có (tạm thời) | Thấp | Rollout undo (chậm dần) |
| Blue-Green | Không | Có (full 2 bộ) | Cao (2x) | Đổi switch tức thì |
| Canary | Không | Có (vài %) | Trung bình | Cắt traffic canary |

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
