# Kubernetes cơ bản

Bạn đã chạy được container với Docker. Câu hỏi tiếp theo của vận hành: làm sao chạy 200 container trên 30 máy, tự khởi động lại khi chết, tự cân tải, tự thay máy hỏng mà không ai phải thức dậy lúc 3 giờ sáng? Đó là việc của một **orchestrator**, và chuẩn de-facto năm 2025-2026 vẫn là **Kubernetes (K8s)**.

Bài này không dạy lý thuyết suông. Bạn sẽ viết manifest YAML chạy được, gõ `kubectl` thật, và gặp đúng những lỗi mà người mới luôn dính.

---

## 1. Vì sao cần orchestration?

`docker run` một container thì dễ. Nhưng production cần nhiều hơn:

| Nhu cầu vận hành | Nếu chỉ dùng `docker run` | Kubernetes làm thay |
|---|---|---|
| Container chết lúc 3h sáng | Bạn phải SSH vào restart tay | `restartPolicy` + controller tự khởi động lại |
| Tăng từ 3 lên 10 bản sao | Chạy `docker run` 7 lần, sửa script | `kubectl scale --replicas=10` |
| Một máy (node) hỏng | App trên máy đó chết, mất dịch vụ | Scheduler dời Pod sang node khác |
| Deploy version mới không downtime | Tự viết script blue-green | Rolling update sẵn có |
| Service A tìm service B | Hardcode IP, IP đổi là hỏng | DNS nội bộ + Service ổn định |
| Cấu hình theo môi trường | Sửa Dockerfile / env tay | ConfigMap / Secret |

K8s đặt ra một **trạng thái mong muốn (desired state)** dạng khai báo (declarative): "tôi muốn 5 bản sao của app này luôn chạy". K8s liên tục **reconcile** — so trạng thái thực với mong muốn, và tự sửa cho khớp. Đây là tư duy cốt lõi: bạn mô tả *cái muốn có*, không phải *các bước để làm*.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng lặp điều chỉnh (control loop) của Kubernetes</title>
  <desc>Controller liên tục so sánh desired state (spec bạn khai báo) với actual state (status thực tế). Nếu lệch, controller hành động để kéo actual về khớp desired, rồi lặp lại mãi mãi.</desc>
  <rect x="40" y="110" width="200" height="80" rx="12" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="140" y="142" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">DESIRED (spec)</text>
  <text x="140" y="164" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.75">bạn khai báo: replicas=5</text>

  <rect x="480" y="110" width="200" height="80" rx="12" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="580" y="142" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">ACTUAL (status)</text>
  <text x="580" y="164" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.75">thực tế: đang có 4 Pod</text>

  <rect x="290" y="20" width="140" height="46" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="360" y="42" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">controller</text>
  <text x="360" y="58" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">so sánh + hành động</text>

  <defs>
    <marker id="ar4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.6">
    <path d="M240 130 C280 90 270 70 290 55" marker-end="url(#ar4)"/>
    <path d="M480 130 C440 90 450 70 430 55" marker-end="url(#ar4)"/>
    <path d="M360 66 C360 110 430 150 478 150" marker-end="url(#ar4)"/>
  </g>
  <text x="240" y="90" font-size="10.5" fill="currentColor" opacity="0.7">đọc spec</text>
  <text x="420" y="90" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.7">đọc status</text>
  <text x="360" y="240" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">lệch? → tạo thêm 1 Pod để khớp</text>
  <text x="360" y="262" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">rồi lặp lại — mãi mãi</text>
  <path d="M360 200 v30" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.6" fill="none" stroke-dasharray="4 3"/>
</svg>

> 💡 Ghi nhớ: Kubernetes là một **vòng lặp điều chỉnh (control loop)**, không phải bộ script chạy một lần. Bạn khai báo desired state, K8s lo phần còn lại — mãi mãi.

---

## 2. Kiến trúc cluster

Một cluster gồm 2 nhóm máy: **control plane** (bộ não, ra quyết định) và **worker node** (cơ bắp, chạy workload thật).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc cluster Kubernetes — control plane và worker node</title>
  <desc>kubectl gọi vào kube-apiserver. Control plane gồm kube-apiserver, etcd, scheduler, controller-manager. Worker node gồm kubelet, container runtime, kube-proxy và các Pod. apiserver điều khiển kubelet trên worker node.</desc>
  <rect x="14" y="50" width="320" height="300" rx="12" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="174" y="74" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">CONTROL PLANE (bộ não)</text>
  <rect x="386" y="50" width="320" height="300" rx="12" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="546" y="74" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">WORKER NODE (cơ bắp)</text>

  <rect x="300" y="14" width="120" height="30" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="360" y="34" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">kubectl</text>

  <rect x="44" y="92" width="260" height="40" rx="9" fill="#3b82f6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="174" y="117" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">kube-apiserver — cửa ngõ duy nhất</text>
  <rect x="44" y="148" width="260" height="38" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="174" y="172" font-size="12.5" text-anchor="middle" fill="currentColor">etcd — kho state (nguồn sự thật)</text>
  <rect x="44" y="200" width="260" height="38" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="174" y="224" font-size="12.5" text-anchor="middle" fill="currentColor">kube-scheduler — chọn node cho Pod</text>
  <rect x="44" y="252" width="260" height="38" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="174" y="276" font-size="12.5" text-anchor="middle" fill="currentColor">controller-manager — control loop</text>

  <rect x="416" y="92" width="260" height="36" rx="9" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="546" y="115" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">kubelet — agent của node</text>
  <rect x="416" y="138" width="260" height="36" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="546" y="161" font-size="12.5" text-anchor="middle" fill="currentColor">container runtime (containerd)</text>
  <rect x="416" y="184" width="260" height="36" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="546" y="207" font-size="12.5" text-anchor="middle" fill="currentColor">kube-proxy — định tuyến mạng</text>
  <rect x="416" y="234" width="260" height="56" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <rect x="430" y="248" width="68" height="28" rx="6" fill="#f59e0b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="464" y="267" font-size="11.5" text-anchor="middle" fill="currentColor">Pod</text>
  <rect x="512" y="248" width="68" height="28" rx="6" fill="#f59e0b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="546" y="267" font-size="11.5" text-anchor="middle" fill="currentColor">Pod</text>
  <rect x="594" y="248" width="68" height="28" rx="6" fill="#f59e0b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="628" y="267" font-size="11.5" text-anchor="middle" fill="currentColor">Pod</text>

  <defs>
    <marker id="ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.6">
    <path d="M340 38 C300 48 230 70 200 90" marker-end="url(#ar1)"/>
    <path d="M304 112 C350 112 372 110 414 110" marker-end="url(#ar1)"/>
  </g>
  <text x="358" y="100" font-size="10.5" fill="currentColor" opacity="0.7">qua REST API</text>
</svg>

### 2.1 Control plane

| Thành phần | Vai trò | Ví dụ thực tế |
|---|---|---|
| **kube-apiserver** | Cửa ngõ duy nhất của cluster. Mọi thứ (kubectl, controller, kubelet) đều nói chuyện qua đây qua REST API | Bạn `kubectl apply` → request bay tới apiserver |
| **etcd** | Database key-value lưu **toàn bộ** state cluster. Đây là "nguồn sự thật" | Mất etcd = mất cluster. Phải backup! |
| **kube-scheduler** | Quyết định Pod mới chạy trên **node nào** (xét CPU/RAM trống, affinity, taint) | Pod cần 2 CPU → scheduler tìm node còn 2 CPU |
| **controller-manager** | Chạy các control loop: phát hiện lệch desired state và sửa | Deployment muốn 5 Pod, đang có 4 → tạo thêm 1 |

### 2.2 Worker node

| Thành phần | Vai trò |
|---|---|
| **kubelet** | Agent trên mỗi node. Nhận lệnh từ apiserver, bảo container runtime chạy Pod, báo cáo sức khỏe ngược lên |
| **container runtime** | Phần mềm chạy container thật. Năm 2025 là **containerd** (Docker shim `dockershim` đã bị gỡ từ K8s 1.24) |
| **kube-proxy** | Lo network: chuyển traffic tới đúng Pod đứng sau một Service (qua iptables/IPVS) |

> ⚠️ Bẫy production: **etcd là điểm chết người**. Không backup etcd định kỳ = một sự cố lưu trữ là mất sạch state cluster (Deployment, Secret, mọi thứ). Trên self-managed cluster, lập lịch `etcdctl snapshot save` hằng ngày và test restore. Trên managed (EKS), AWS lo việc này — đây là một lý do lớn để dùng managed.

---

## 3. Pod — đơn vị nhỏ nhất

K8s **không** chạy container trực tiếp. Đơn vị nhỏ nhất là **Pod** — bọc 1 (hoặc nhiều) container dùng chung network và storage.

- Các container trong cùng Pod chia sẻ **một IP** và `localhost`, có thể dùng chung volume.
- 99% trường hợp: **1 Pod = 1 container chính**. Container phụ chỉ dùng cho pattern **sidecar** (ví dụ: log shipper, service-mesh proxy).
- Pod là **ephemeral** (phù du): nó chết là chết hẳn, không "hồi sinh". Cái thay thế là một Pod **mới** với IP mới.

```yaml
# pod.yaml — chạy thử, KHÔNG dùng kiểu này cho production
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app: web
spec:
  containers:
    - name: nginx
      image: nginx:1.27
      ports:
        - containerPort: 80
```

```bash
kubectl apply -f pod.yaml
kubectl get pod nginx -o wide   # xem IP + node nó nằm
```

> 💡 Ghi nhớ: Đừng bao giờ deploy Pod "trần" cho production. Pod trần chết là không ai dựng lại. Luôn để một **controller** (Deployment) quản lý Pod giúp bạn.

---

## 4. ReplicaSet & Deployment

### 4.1 ReplicaSet
Đảm bảo luôn có **đúng N bản sao** của một Pod. Pod chết → tạo Pod mới. Nhưng bạn hiếm khi viết ReplicaSet trực tiếp.

### 4.2 Deployment
Là thứ bạn dùng thật. **Deployment quản lý ReplicaSet, ReplicaSet quản lý Pod.** Deployment thêm khả năng **rolling update** và **rollback** — nâng cấp version dần dần, không downtime.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phân cấp Deployment, ReplicaSet, Pod và rolling update</title>
  <desc>Deployment quản lý ReplicaSet, ReplicaSet quản lý N Pod replica. Khi rolling update, Deployment tạo một ReplicaSet mới (version mới) bên cạnh ReplicaSet cũ, chuyển dần Pod sang.</desc>
  <defs>
    <marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="270" y="14" width="180" height="46" rx="10" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="360" y="36" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Deployment: web</text>
  <text x="360" y="52" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">replicas: 3 + rolling update</text>

  <rect x="70" y="116" width="220" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.32"/>
  <text x="180" y="137" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">ReplicaSet (cũ)</text>
  <text x="180" y="153" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">nginx:1.27 — đang co lại</text>

  <rect x="430" y="116" width="220" height="44" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="540" y="137" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">ReplicaSet (mới)</text>
  <text x="540" y="153" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">nginx:1.28 — đang dâng lên</text>

  <g>
    <rect x="78" y="210" width="62" height="40" rx="7" fill="#8b5cf6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="109" y="234" font-size="11" text-anchor="middle" fill="currentColor">Pod</text>
    <rect x="150" y="210" width="62" height="40" rx="7" fill="#8b5cf6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="181" y="234" font-size="11" text-anchor="middle" fill="currentColor">Pod</text>
  </g>
  <g>
    <rect x="438" y="210" width="62" height="40" rx="7" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="469" y="234" font-size="11" text-anchor="middle" fill="currentColor">Pod</text>
    <rect x="510" y="210" width="62" height="40" rx="7" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="541" y="234" font-size="11" text-anchor="middle" fill="currentColor">Pod</text>
    <rect x="582" y="210" width="62" height="40" rx="7" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="613" y="234" font-size="11" text-anchor="middle" fill="currentColor">Pod</text>
  </g>

  <g stroke="currentColor" stroke-opacity="0.5" fill="none" stroke-width="1.5">
    <path d="M330 60 C260 80 200 95 180 114" marker-end="url(#ar2)"/>
    <path d="M390 60 C460 80 520 95 540 114" marker-end="url(#ar2)"/>
    <path d="M180 160 L109 208" marker-end="url(#ar2)"/>
    <path d="M180 160 L181 208" marker-end="url(#ar2)"/>
    <path d="M540 160 L469 208" marker-end="url(#ar2)"/>
    <path d="M540 160 L541 208" marker-end="url(#ar2)"/>
    <path d="M540 160 L613 208" marker-end="url(#ar2)"/>
  </g>

  <text x="360" y="300" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Rolling update: tạo ReplicaSet mới, dời Pod dần — không downtime</text>
  <text x="360" y="322" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">rollback = quay lại ReplicaSet cũ</text>
</svg>

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web          # phải khớp với template.labels bên dưới
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: nginx
          image: nginx:1.27
          ports:
            - containerPort: 80
          resources:
            requests:           # tối thiểu cần để được schedule
              cpu: "100m"
              memory: "128Mi"
            limits:             # trần, vượt RAM sẽ bị OOMKilled
              cpu: "500m"
              memory: "256Mi"
```

```bash
kubectl apply -f deployment.yaml
kubectl get deploy web                        # READY 3/3?
kubectl scale deploy web --replicas=5         # tăng bản sao
kubectl set image deploy/web nginx=nginx:1.28 # rolling update
kubectl rollout status deploy/web             # theo dõi update
kubectl rollout undo deploy/web               # rollback version trước
```

> ⚠️ Bẫy production: **`selector.matchLabels` không khớp `template.labels`** là lỗi kinh điển. K8s sẽ báo `selector does not match template labels` và từ chối. Selector là cách Deployment "nhận con" của mình — sai label thì nó không quản được Pod nào.

> ⚠️ Bẫy production: Không đặt `resources.requests/limits` → scheduler không biết Pod cần bao nhiêu, dồn quá tải lên một node, hoặc một Pod ăn hết RAM làm chết Pod khác (noisy neighbor). Luôn đặt request/limit.

---

## 5. Service — địa chỉ ổn định cho Pod

Pod có IP nhưng IP **đổi mỗi lần Pod tái tạo**. Không thể hardcode. **Service** cho một IP ảo + tên DNS **ổn định**, tự load-balance tới các Pod khớp `selector`.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Service làm địa chỉ ổn định đứng trước nhiều Pod phù du</title>
  <desc>Client gọi Service qua tên DNS và ClusterIP ổn định. Service load-balance tới các Pod khớp selector app=web. Pod là phù du, IP đổi mỗi lần tái tạo, nhưng ClusterIP và DNS của Service không đổi.</desc>
  <defs>
    <marker id="ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="20" y="120" width="150" height="70" rx="11" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="95" y="150" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Client / Pod khác</text>
  <text x="95" y="170" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">gọi http://web</text>

  <rect x="250" y="110" width="190" height="90" rx="12" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.38"/>
  <text x="345" y="138" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Service: web</text>
  <text x="345" y="160" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">ClusterIP ổn định</text>
  <text x="345" y="178" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">DNS: web.default.svc</text>
  <text x="345" y="194" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">selector: app=web</text>

  <g>
    <rect x="540" y="30" width="160" height="58" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="620" y="54" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Pod (app=web)</text>
    <text x="620" y="72" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">IP 10.1.0.7 — phù du</text>
    <rect x="540" y="126" width="160" height="58" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="620" y="150" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Pod (app=web)</text>
    <text x="620" y="168" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">IP 10.1.0.9 — phù du</text>
    <rect x="540" y="222" width="160" height="58" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="620" y="246" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Pod (app=web)</text>
    <text x="620" y="264" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">IP đổi khi tái tạo</text>
  </g>

  <g stroke="currentColor" stroke-opacity="0.55" fill="none" stroke-width="1.6">
    <path d="M170 155 L246 155" marker-end="url(#ar3)"/>
    <path d="M440 140 C490 110 500 80 538 62" marker-end="url(#ar3)"/>
    <path d="M440 155 L536 155" marker-end="url(#ar3)"/>
    <path d="M440 170 C490 200 500 230 538 248" marker-end="url(#ar3)"/>
  </g>
  <text x="470" y="120" font-size="10" fill="currentColor" opacity="0.7">load-balance</text>
  <text x="345" y="300" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">IP Pod đổi liên tục — ClusterIP &amp; DNS của Service không đổi</text>
</svg>

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  type: ClusterIP        # mặc định
  selector:
    app: web             # gửi traffic tới mọi Pod có label app=web
  ports:
    - port: 80           # cổng Service
      targetPort: 80     # cổng container
```

Ba loại Service hay dùng:

| Type | Phạm vi truy cập | Khi nào dùng |
|---|---|---|
| **ClusterIP** | Chỉ trong cluster | Service nội bộ (backend gọi database). Mặc định |
| **NodePort** | Mở 1 port (30000-32767) trên **mọi node** | Test nhanh, hoặc đứng sau load balancer ngoài. Hiếm dùng trực tiếp ở prod |
| **LoadBalancer** | Cấp một load balancer **bên ngoài** (cloud) | Expose service ra Internet. Trên cloud sẽ tạo LB thật |

```bash
kubectl get svc web
# Trong cluster, Pod khác gọi qua DNS: http://web hoặc http://web.default.svc.cluster.local
kubectl run tmp --rm -it --image=busybox -- wget -qO- http://web
```

> 💡 Ghi nhớ: **DNS nội bộ** là `<service>.<namespace>.svc.cluster.local`. Cùng namespace thì chỉ cần `<service>`. Đây là cách microservice tìm nhau — đừng bao giờ hardcode Pod IP.

> ⚠️ Bẫy production: Service không route được tới Pod thường là do **selector lệch label** hoặc **`targetPort` sai**. Debug bằng `kubectl get endpoints web` — nếu danh sách endpoint **rỗng**, Service không tìm thấy Pod nào → kiểm tra label.

---

## 6. Namespace — chia ngăn cluster

Namespace là "thư mục" logic chia tách tài nguyên trong cùng cluster: tách `dev` / `staging` / `prod`, hoặc tách theo team. Cho phép đặt **quota** và **RBAC** riêng.

```bash
kubectl create namespace staging
kubectl apply -f deployment.yaml -n staging
kubectl get pods -n staging
kubectl get pods --all-namespaces        # xem mọi namespace

# Đặt namespace mặc định cho context hiện tại, đỡ gõ -n
kubectl config set-context --current --namespace=staging
```

Các namespace hệ thống có sẵn: `kube-system` (control plane components), `default`, `kube-public`.

> ⚠️ Bẫy production: "Pod biến mất" — thực ra bạn đang nhìn nhầm namespace. `kubectl get pods` chỉ xem namespace mặc định. Khi hoảng, luôn thêm `--all-namespaces` (viết tắt `-A`).

---

## 7. kubectl — những lệnh phải thuộc

```bash
# XEM
kubectl get pods                     # liệt kê (thêm -o wide để có IP/node)
kubectl get all                      # mọi resource trong namespace
kubectl describe pod web-xxxx        # chi tiết + Events (vàng cho debug)
kubectl logs web-xxxx                # log container
kubectl logs web-xxxx -f --previous  # follow + log của lần crash trước

# CHẠY / SỬA
kubectl apply -f manifest.yaml       # áp dụng (declarative — nên dùng)
kubectl exec -it web-xxxx -- sh      # vào shell trong container
kubectl port-forward svc/web 8080:80 # tunnel localhost:8080 → service

# CHẨN ĐOÁN
kubectl get events --sort-by=.lastTimestamp   # chuyện gì vừa xảy ra
kubectl get endpoints web                     # Service có route tới Pod không
kubectl top pods                              # CPU/RAM thực tế (cần metrics-server)
kubectl rollout status deploy/web             # update xong chưa
```

> 💡 Ghi nhớ: Khi một Pod lỗi, ba lệnh vàng theo thứ tự: `kubectl describe pod` (xem Events: tại sao không schedule/start được), `kubectl logs` (app nói gì), `kubectl get events` (toàn cảnh). 90% sự cố lộ ra ở đây.

### Bảng lỗi STATUS hay gặp

| STATUS | Nghĩa | Hướng xử lý |
|---|---|---|
| `ImagePullBackOff` / `ErrImagePull` | Không kéo được image | Sai tên/tag image, hoặc thiếu credential registry private |
| `CrashLoopBackOff` | Container start rồi chết liên tục | `kubectl logs --previous` xem app lỗi gì (thường thiếu env/config) |
| `Pending` | Chưa được schedule | Hết CPU/RAM trên node, hoặc đợi PersistentVolume |
| `OOMKilled` | Vượt `memory limit` | Tăng limit, hoặc sửa rò rỉ bộ nhớ |
| `0/1 Running` | Đang chạy nhưng readiness probe fail | Service sẽ chưa route tới — kiểm tra probe & app |

---

## 8. Anatomy của một manifest YAML

Mọi object K8s đều có 4 trường gốc:

```yaml
apiVersion: apps/v1     # nhóm + version API (v1, apps/v1, networking.k8s.io/v1...)
kind: Deployment        # loại object
metadata:               # tên, namespace, labels, annotations
  name: web
spec:                   # desired state — bạn KHAI BÁO cái muốn
  replicas: 3
# status: ... (do K8s GHI, không bao giờ tự viết phần này)
```

Mẹo thực hành: gói nhiều manifest vào một file ngăn bằng `---`, hoặc để chung thư mục rồi `kubectl apply -f ./manifests/`. Dùng `kubectl apply --dry-run=server -f x.yaml` để validate trước khi áp thật.

> 💡 Ghi nhớ: `spec` là *bạn viết* (mong muốn), `status` là *K8s viết* (thực tế). Toàn bộ công việc của control loop là kéo `status` về khớp `spec`.

---

## 9. Liên hệ sang AWS

Self-host control plane (apiserver, etcd, scheduler) rất mệt và dễ sai. AWS cho bạn **EKS (Elastic Kubernetes Service)** — Kubernetes managed.

| Khái niệm thuần K8s | Trên AWS EKS |
|---|---|
| Control plane bạn tự dựng + backup etcd | AWS quản lý control plane đa-AZ, tự backup etcd, vá lỗi. Bạn trả ~$0.10/giờ/cluster |
| Worker node bạn tự thêm/bớt | **Managed Node Groups** (EC2 do AWS quản vòng đời) hoặc **Fargate** (serverless, không quản node) |
| `Service type: LoadBalancer` | AWS **Load Balancer Controller** tự tạo **NLB/ALB** thật |
| Gắn quyền AWS cho Pod | **IRSA** / **EKS Pod Identity** — map ServiceAccount K8s → IAM Role, không cần nhét access key |
| Lưu Secret | Tích hợp **AWS Secrets Manager** qua CSI driver |
| Autoscale node | **Karpenter** (chuẩn 2025) hoặc Cluster Autoscaler |
| Container registry | **Amazon ECR** thay cho Docker Hub |

```bash
# Dựng cluster nhanh bằng eksctl
eksctl create cluster --name demo --region ap-southeast-1 --nodes 2 --node-type t3.medium

# eksctl tự ghi kubeconfig; sau đó kubectl chạy như thường
kubectl get nodes
```

**Nếu không cần Kubernetes đầy đủ**: AWS còn **ECS** (orchestrator riêng của AWS, đơn giản hơn, không có K8s API) — chạy container trên **Fargate** hoặc EC2. ECS hợp với team nhỏ, ít workload, không muốn gánh độ phức tạp của K8s. Chọn EKS khi cần hệ sinh thái K8s (Helm, ArgoCD, operator) hoặc đa-cloud; chọn ECS khi muốn đơn giản và gắn chặt AWS.

Phần CI/CD deploy lên cluster (build image → push ECR → cập nhật manifest) thường dùng **CodePipeline + CodeBuild**, hoặc GitOps với **ArgoCD** — đó là nội dung các bài sau.

> 💡 Ghi nhớ: Trên cloud, đừng tự dựng control plane trừ khi có lý do rất cụ thể. EKS lo phần khó nhất (control plane + etcd); bạn tập trung vào workload, networking và bảo mật Pod.
