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

> 💡 Ghi nhớ: Kubernetes là một **vòng lặp điều chỉnh (control loop)**, không phải bộ script chạy một lần. Bạn khai báo desired state, K8s lo phần còn lại — mãi mãi.

---

## 2. Kiến trúc cluster

Một cluster gồm 2 nhóm máy: **control plane** (bộ não, ra quyết định) và **worker node** (cơ bắp, chạy workload thật).

```
        CONTROL PLANE                          WORKER NODE
 ┌─────────────────────────┐         ┌──────────────────────────┐
 │  kube-apiserver  ◄───────┼─ kubectl│  kubelet                 │
 │       │                  │         │    │                     │
 │     etcd (state store)   │         │  container runtime       │
 │  scheduler               │         │    (containerd)          │
 │  controller-manager      │         │  kube-proxy              │
 └─────────────────────────┘         │  [ Pod ] [ Pod ] [ Pod ] │
                                      └──────────────────────────┘
```

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
