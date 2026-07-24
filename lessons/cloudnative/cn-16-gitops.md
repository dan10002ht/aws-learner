# Bài 16 — GitOps (ArgoCD/Flux) & deployment strategies

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **GitOps**: vì sao lấy **Git repo làm nguồn sự thật DUY NHẤT** cho cả cụm, và mô hình **pull-based** an toàn hơn CI push thế nào.
- Hiểu **reconciliation ở tầng cluster**: agent (ArgoCD/Flux) liên tục so Git với live state, phát hiện **drift** và **self-heal**.
- Vận hành **audit & rollback** qua git history (`git revert`).
- Phân biệt 3 **deployment strategy**: **rolling** (mặc định), **blue-green**, **canary/progressive delivery** — và biết khi nào dùng cái nào.
- Viết cấu hình chạy được: ArgoCD `Application`, Argo Rollouts canary với auto-rollback theo metric.

---

## 2. Lý thuyết

### 2.1 Bài toán: "cụm của bạn đang thực sự chạy cái gì?"

Ở Bài 3 bạn đã biết `kubectl apply -f`. Đó là **imperative push từ máy bạn**: bạn (hoặc CI) cầm credential vào cluster và bắn manifest lên. Vấn đề khi đội đông và nhiều môi trường:

- **Drift âm thầm**: ai đó `kubectl edit` sửa replica lúc 2h sáng để chữa cháy, rồi quên. Live state khác hẳn thứ trong repo, không ai biết.
- **Không có nguồn sự thật**: prod đang chạy image `v2.3.1` hay `v2.3.4`? Phải đi hỏi cluster, không tra được từ Git.
- **Credential đi sai chiều**: CI runner (ngoài cluster, trên Internet) giữ **admin kubeconfig**. Runner bị hack = cụm bị hack.
- **Audit rời rạc**: ai đổi gì, lúc nào, vì sao? Nằm rải trong log CI, Slack, trí nhớ.

**GitOps** là kỷ luật giải cả bốn: mọi thứ mô tả cụm (manifest YAML, Helm values, Kustomize) sống trong **Git**, và **chỉ Git**. Muốn đổi cụm ⇒ commit vào Git. Không ai `kubectl apply` tay lên prod nữa.

### 2.2 Bốn nguyên tắc GitOps

| Nguyên tắc | Ý nghĩa |
|-----------|---------|
| **Declarative** | Toàn bộ hệ thống được mô tả bằng khai báo (YAML), không phải script các bước. |
| **Versioned & immutable** | Trạng thái mong muốn nằm trong Git — có version, có history, không sửa ngầm. |
| **Pulled automatically** | Một agent **trong cluster** tự kéo (pull) desired state từ Git. |
| **Continuously reconciled** | Agent liên tục so khớp live ↔ Git, tự kéo về đúng nếu lệch. |

Để ý: đây chính là **vòng reconciliation của Bài 1**, nhưng nâng một tầng. Kubernetes controller giữ *live state = etcd*. GitOps agent giữ *etcd = Git*. Nối lại: **Git là desired state tối thượng**, cả chuỗi tự kéo mọi thứ về đúng Git.

<svg viewBox="0 0 680 250" role="img" aria-labelledby="gf-t gf-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="gf-t">Luồng GitOps pull-based</title>
<desc id="gf-d">Dev commit vào Git repo, agent trong cluster kéo desired state về và reconcile cluster, credential không rời khỏi cluster</desc>
<rect x="20" y="95" width="120" height="56" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="120" text-anchor="middle" font-size="12" fill="currentColor">Developer</text>
<text x="80" y="137" text-anchor="middle" font-size="10" fill="currentColor">git push</text>
<rect x="215" y="90" width="150" height="66" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="290" y="115" text-anchor="middle" font-size="12" fill="currentColor">Git repo</text>
<text x="290" y="132" text-anchor="middle" font-size="10" fill="currentColor">manifest / Helm</text>
<text x="290" y="147" text-anchor="middle" font-size="10" fill="currentColor">= nguồn sự thật</text>
<rect x="470" y="30" width="190" height="190" rx="10" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="52" text-anchor="middle" font-size="12" fill="currentColor">Kubernetes cluster</text>
<rect x="495" y="70" width="140" height="52" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="92" text-anchor="middle" font-size="11" fill="currentColor">GitOps agent</text>
<text x="565" y="108" text-anchor="middle" font-size="10" fill="currentColor">ArgoCD / Flux</text>
<rect x="495" y="150" width="140" height="52" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="172" text-anchor="middle" font-size="11" fill="currentColor">Workloads</text>
<text x="565" y="188" text-anchor="middle" font-size="10" fill="currentColor">Deployment/Svc</text>
<line x1="140" y1="123" x2="213" y2="123" stroke="currentColor" stroke-width="1.3" marker-end="url(#a1)"/>
<line x1="493" y1="96" x2="367" y2="120" stroke="currentColor" stroke-width="1.3" marker-end="url(#a1)"/>
<text x="425" y="96" text-anchor="middle" font-size="10" fill="currentColor">pull</text>
<line x1="565" y1="122" x2="565" y2="148" stroke="currentColor" stroke-width="1.3" marker-end="url(#a1)"/>
<text x="600" y="140" text-anchor="middle" font-size="10" fill="currentColor">apply</text>
<line x1="565" y1="148" x2="565" y2="124" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#a1)"/>
<text x="530" y="140" text-anchor="middle" font-size="9" fill="currentColor">so drift</text>
<defs><marker id="a1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Push vs Pull — điểm cốt lõi về bảo mật

Đây là chỗ nhiều người hiểu lầm, nên nói cho rõ.

| | **CI push (cũ)** | **GitOps pull (mới)** |
|--|------------------|----------------------|
| Ai chạm cluster | CI runner **ngoài** cluster | Agent **trong** cluster |
| Credential cụm | Nằm ở CI runner (Internet) | **Không rời** cluster |
| Chiều kết nối | CI → mở kết nối vào API server (phải expose) | Agent → kéo ra Git (chỉ cần outbound) |
| Bề mặt tấn công | Runner bị chiếm = cụm bị chiếm | Runner chỉ push code lên Git, không có key cụm |

Mấu chốt: với pull-based, **API server không cần lộ cho CI**, và **admin kubeconfig không đi ra ngoài**. Agent nằm sẵn trong cluster, chỉ cần quyền **đọc** Git repo (thường là read-only deploy key). Đây là lý do bảo mật lớn nhất khiến GitOps thắng CI-push cho khâu deploy.

> Phân vai chuẩn: **CI** lo *build + test + push image + cập nhật tag trong Git*. **CD (GitOps agent)** lo *đưa Git vào cluster*. CI không còn cầm chìa khoá cụm.

### 2.4 Drift detection & self-heal

Agent chạy vòng lặp: **fetch Git → so với live state → báo `OutOfSync` nếu lệch → (tuỳ policy) tự sync về Git**.

- **Detect**: ai `kubectl scale` prod từ 3 lên 10 → agent thấy live=10 nhưng Git=3 ⇒ đánh dấu drift.
- **Self-heal**: bật `selfHeal: true` ⇒ agent **tự kéo về 3**. Muốn 10 thật? Sửa Git, commit. Không có "cửa sau".
- Điều này biến `kubectl edit` trên prod thành hành động **vô nghĩa** — cách duy nhất để đổi cụm bền vững là qua Git. Kỷ luật này chính là giá trị.

### 2.5 Audit & rollback = thao tác Git

Vì mọi thay đổi là commit:
- **Audit**: `git log`/`git blame` cho biết *ai, khi nào, đổi gì, PR nào review*. Không cần công cụ riêng.
- **Rollback**: `git revert <sha>` tạo commit đảo ngược → agent thấy Git đổi → tự kéo cụm về bản cũ. Rollback = một PR, có review, có audit — không phải hành động thủ công căng thẳng lúc nửa đêm.

```bash
# Rollback prod về đúng trạng thái trước commit hỏng — không đụng kubectl
git revert a1b2c3d      # tạo commit đảo ngược thay đổi hỏng
git push                # ArgoCD/Flux phát hiện & tự sync cụm về bản cũ
```

### 2.6 ArgoCD vs Flux (chọn công cụ)

| | **ArgoCD** | **Flux** |
|--|-----------|----------|
| Kiểu | Có UI/dashboard mạnh, tập trung | Bộ controller nhẹ, thuần CLI/CRD |
| Đối tượng chính | CRD `Application` | `GitRepository` + `Kustomization`/`HelmRelease` |
| Điểm mạnh | Trực quan hoá cây tài nguyên, sync status | Gọn, hợp GitOps "thuần", tích hợp SOPS tốt |
| Multi-tenant | ApplicationSet, Projects | Cấu trúc thư mục + RBAC |

Cả hai đều là pull-based, self-heal, drift detection. Chọn ArgoCD nếu cần dashboard cho nhiều đội; Flux nếu thích tối giản, khai báo hoàn toàn qua CRD.

### 2.7 Ví dụ: ArgoCD Application (chạy được)

Cài agent, rồi khai báo một `Application` trỏ vào repo:

```yaml
# app-web.yaml — nói cho ArgoCD: "đồng bộ thư mục này của repo vào namespace prod"
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/acme/infra.git   # nguồn sự thật
    targetRevision: main                          # theo dõi nhánh main
    path: apps/web/overlays/prod                  # Kustomize/manifest ở đây
  destination:
    server: https://kubernetes.default.svc        # chính cluster này
    namespace: prod
  syncPolicy:
    automated:
      prune: true       # tài nguyên bị xoá khỏi Git -> xoá khỏi cluster
      selfHeal: true    # live lệch Git -> tự kéo về Git (chống drift tay)
    syncOptions:
      - CreateNamespace=true
```

```bash
kubectl apply -f app-web.yaml          # đăng ký Application
argocd app get web                     # xem trạng thái: Synced / OutOfSync, Healthy
argocd app history web                 # lịch sử các lần sync (map tới git sha)
argocd app rollback web <id>           # hoặc đơn giản: git revert rồi để nó tự sync
```

Từ giờ, muốn nâng image `v2.3.1 → v2.3.2`: **sửa tag trong `apps/web/overlays/prod`, commit, push**. ArgoCD thấy `OutOfSync` → apply → `Synced`. Hết.

---

## 3. Deployment strategies — cách "thay máu" mà không sập

GitOps trả lời *"nguồn sự thật ở đâu"*. Deployment strategy trả lời *"đổi từ v1 sang v2 an toàn ra sao"*. Ba chiến lược chính:

<svg viewBox="0 0 680 300" role="img" aria-labelledby="ds-t ds-d" style="width:100%;max-width:650px;height:auto;display:block;margin:1.25rem auto">
<title id="ds-t">Ba deployment strategy: rolling, blue-green, canary</title>
<desc id="ds-d">Rolling thay dần từng pod, blue-green đổi toàn bộ traffic giữa hai môi trường, canary chuyển traffic tăng dần theo phần trăm</desc>
<text x="110" y="24" text-anchor="middle" font-size="13" fill="currentColor">Rolling</text>
<rect x="30" y="40" width="36" height="30" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="72" y="40" width="36" height="30" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<rect x="114" y="40" width="36" height="30" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="156" y="40" width="36" height="30" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="90" text-anchor="middle" font-size="9" fill="currentColor">thay từng pod v1(lục)->v2(xanh)</text>
<text x="340" y="24" text-anchor="middle" font-size="13" fill="currentColor">Blue-green</text>
<rect x="255" y="40" width="70" height="30" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="290" y="59" text-anchor="middle" font-size="10" fill="currentColor">blue v1</text>
<rect x="355" y="40" width="70" height="30" rx="4" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="390" y="59" text-anchor="middle" font-size="10" fill="currentColor">green v2</text>
<text x="340" y="90" text-anchor="middle" font-size="9" fill="currentColor">đổi switch traffic 100% một phát</text>
<text x="570" y="24" text-anchor="middle" font-size="13" fill="currentColor">Canary</text>
<rect x="490" y="40" width="60" height="30" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="520" y="59" text-anchor="middle" font-size="9" fill="currentColor">v1 95%</text>
<rect x="555" y="40" width="20" height="30" rx="4" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="605" y="59" text-anchor="middle" font-size="9" fill="currentColor">v2 5%</text>
<text x="570" y="90" text-anchor="middle" font-size="9" fill="currentColor">tăng dần 5->25->50->100%</text>
<line x1="30" y1="120" x2="650" y2="120" stroke="currentColor" stroke-width="0.5" stroke-dasharray="4 4"/>
<text x="30" y="150" font-size="11" fill="currentColor">Rolling: rẻ, mặc định, không cần gấp đôi tài nguyên; nhưng v1+v2 chạy lẫn lúc chuyển.</text>
<text x="30" y="185" font-size="11" fill="currentColor">Blue-green: rollback tức thì (đổi lại switch); tốn 2x tài nguyên; test green trước khi cắt.</text>
<text x="30" y="220" font-size="11" fill="currentColor">Canary: soi metric từng bước, blast radius nhỏ; cần công cụ progressive delivery.</text>
<text x="30" y="262" font-size="10" fill="currentColor">Quy tắc: rolling cho hầu hết; blue-green khi cần rollback tức thì; canary cho thay đổi rủi ro cao.</text>
</svg>

### 3.1 Rolling update (mặc định của Deployment)

Đã học ở Bài 5. K8s thay **từng nhóm pod**: tạo pod v2, chờ `Ready`, xoá bớt pod v1, lặp lại. Điều khiển bằng `maxSurge` (được tạo dư bao nhiêu) và `maxUnavailable` (được thiếu bao nhiêu).

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # tạo dư tối đa 1 pod so với replicas
      maxUnavailable: 0    # không được để thiếu pod nào -> zero-downtime
```

- **Ưu**: không tốn tài nguyên gấp đôi, tự động, là mặc định.
- **Nhược**: **v1 và v2 chạy đồng thời** trong lúc chuyển (phải tương thích DB/schema); rollback là một rolling ngược nên **không tức thì**.

### 3.2 Blue-green

Chạy **hai môi trường đầy đủ** song song: **blue** (v1, đang nhận traffic) và **green** (v2, đã deploy nhưng chưa nhận traffic). Test green thoả mãn ⇒ **đổi Service selector** sang green trong một nhịp. Lỗi ⇒ đổi selector về blue → **rollback tức thì**.

```yaml
# Service chỉ cần đổi 1 dòng selector để cắt traffic blue -> green
apiVersion: v1
kind: Service
metadata: { name: web }
spec:
  selector:
    app: web
    version: green      # đổi từ "blue" -> "green" = chuyển 100% traffic tức thì
  ports:
    - port: 80
      targetPort: 8080
```

- **Ưu**: rollback nhanh nhất; test green cô lập trước khi cắt; không có giai đoạn lẫn version ở tầng traffic.
- **Nhược**: tốn **2x** tài nguyên trong lúc chuyển; đổi 100% một phát nên nếu green có lỗi ẩn thì **mọi user** dính cùng lúc.

### 3.3 Canary & progressive delivery

Thay vì cắt 100%, **rót traffic tăng dần**: 5% → 25% → 50% → 100%, và **giữa mỗi bước soi metric** (tỉ lệ lỗi, p99 latency, success rate). Xấu ⇒ **tự rollback** ngay ở bước đó, chỉ một phần nhỏ user bị ảnh hưởng (blast radius nhỏ). Đây gọi là **progressive delivery**, thường làm bằng **Argo Rollouts** hoặc **Flagger**, kết hợp Prometheus để phân tích.

```yaml
# Argo Rollouts thay Deployment: canary có auto-analysis + auto-rollback
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: { name: web }
spec:
  replicas: 10
  selector: { matchLabels: { app: web } }
  template:                      # giống PodTemplate của Deployment
    metadata: { labels: { app: web } }
    spec:
      containers:
        - name: web
          image: acme/web:v2.3.2
  strategy:
    canary:
      steps:
        - setWeight: 5           # rót 5% traffic sang v2
        - pause: { duration: 2m }
        - analysis:              # soi metric; lỗi -> tự abort & rollback
            templates: [{ templateName: success-rate }]
        - setWeight: 25
        - pause: { duration: 5m }
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 100         # thành công -> promote toàn bộ
```

```yaml
# AnalysisTemplate: định nghĩa "khoẻ" = success-rate >= 95%, hỏng -> fail bước canary
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata: { name: success-rate }
spec:
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: "result >= 0.95"
      failureLimit: 2            # 2 lần dưới ngưỡng -> abort -> rollback tự động
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{app="web",code!~"5.."}[2m]))
            / sum(rate(http_requests_total{app="web"}[2m]))
```

- **Ưu**: rủi ro thấp nhất — lỗi lộ ra khi mới 5% user dính; **rollback tự động theo dữ liệu**, không cần người trực.
- **Nhược**: phức tạp nhất — cần traffic splitting (Service Mesh/Ingress), cần metric đáng tin; triển khai chậm hơn (phải chờ mỗi bước).

### 3.4 GitOps + progressive delivery ăn khớp thế nào

Đẹp ở chỗ: `Rollout` và `AnalysisTemplate` **cũng là manifest trong Git**. Bạn commit đổi image tag → ArgoCD sync `Rollout` → Argo Rollouts chạy canary + phân tích metric → hỏng thì tự về v1. Toàn bộ **an toàn, tự động, và có audit trong Git**. GitOps lo *nguồn sự thật*, progressive delivery lo *độ an toàn của mỗi lần đổi* — hai lớp bổ sung nhau.

---

## 4. Bảng chọn nhanh

| Tình huống | Chiến lược |
|-----------|-----------|
| Service thường, thay đổi nhỏ | **Rolling** (mặc định) |
| Cần rollback tức thì, chấp nhận 2x tài nguyên | **Blue-green** |
| Thay đổi rủi ro cao, có metric tốt, muốn tự rollback | **Canary / progressive delivery** |
| Nhiều đội/nhiều cụm, cần nguồn sự thật + audit | **GitOps** (nền tảng, dùng chung với 3 cái trên) |

---

## 5. Tóm tắt
- **GitOps**: Git repo (manifest/Helm) là **nguồn sự thật DUY NHẤT**. Một **agent trong cluster** (ArgoCD/Flux) **pull** desired state, **reconcile** live về đúng Git, phát hiện **drift** và **self-heal**.
- **Pull > push** về bảo mật: credential cụm **không rời** cluster, API server không cần lộ cho CI; CI chỉ build+push+cập nhật Git.
- **Audit** qua `git log`, **rollback** qua `git revert` — mọi thay đổi là commit có review.
- **Deployment strategy**: **rolling** (mặc định, rẻ, v1+v2 lẫn tạm thời) · **blue-green** (2 môi trường, đổi switch, rollback tức thì, 2x tài nguyên) · **canary** (rót traffic từng %, soi metric, **tự rollback** — Argo Rollouts/Flagger).
- GitOps + progressive delivery ăn khớp: `Rollout`/`AnalysisTemplate` cũng nằm trong Git ⇒ deploy vừa **tự động** vừa **an toàn** vừa **truy vết được**.

> **Bài tiếp theo (Bài 17):** Service Mesh — tách logic mạng (mTLS, retry, traffic splitting cho chính canary ở trên) khỏi code app bằng sidecar/eBPF (Istio/Linkerd).
