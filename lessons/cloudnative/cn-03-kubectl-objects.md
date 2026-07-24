# Bài 3 — kubectl, YAML declarative & object model

## 1. Mục tiêu
Sau bài này bạn có thể:
- Dùng thành thạo **kubectl** với các lệnh cốt lõi: `apply`, `get`, `describe`, `logs`, `exec`, `delete`, `edit`.
- Đọc & viết **manifest YAML** đúng cấu trúc `apiVersion / kind / metadata / spec / status` — hiểu ý nghĩa từng khối.
- Hiểu bản chất **namespace** (cô lập logic), **label & selector** (cơ chế liên kết object, vd Service chọn Pod), và **annotation**.
- Phân biệt phong cách **imperative** (`kubectl run/create`) và **declarative** (`kubectl apply -f`) — và vì sao production luôn chọn declarative.
- Nắm cặp khái niệm **desired state vs actual state** (`spec` vs `status`) như xương sống của mọi object.

---

## 2. Lý thuyết

### 2.1 kubectl — cây cầu duy nhất tới cluster

Ở [[cn-01-why-orchestration]] ta thấy Kubernetes chạy vòng lặp **reconciliation** để kéo thực tế về đúng mong muốn. Nhưng bạn *nói* mong muốn đó cho cluster bằng cách nào? Câu trả lời là **kubectl** — client dòng lệnh gọi **REST API** của **api-server**.

Hãy nhớ một ý cực kỳ quan trọng: **kubectl không tự làm gì cả**. Nó chỉ dịch lệnh của bạn thành một request HTTP (thường là JSON) gửi tới api-server. api-server xác thực, kiểm tra, rồi ghi/đọc trạng thái trong **etcd**. Mọi thứ sau đó (scheduler, controller, kubelet) đều làm việc trên dữ liệu trong etcd. Vì vậy `kubectl` chỉ là **giao diện**, còn "nguồn sự thật" là **object lưu trong api-server/etcd**.

<svg viewBox="0 0 660 150" role="img" aria-labelledby="kc-t kc-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="kc-t">kubectl gọi api-server, api-server ghi vào etcd</title>
<desc id="kc-d">Luồng từ người dùng qua kubectl tới api-server rồi etcd, các controller đọc từ api-server</desc>
<rect x="20" y="55" width="110" height="44" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="80" text-anchor="middle" font-size="12" fill="currentColor">kubectl</text>
<rect x="200" y="45" width="150" height="64" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="72" text-anchor="middle" font-size="12" fill="currentColor">api-server</text>
<text x="275" y="90" text-anchor="middle" font-size="10" fill="currentColor">xác thực + validate</text>
<rect x="430" y="55" width="110" height="44" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="485" y="80" text-anchor="middle" font-size="12" fill="currentColor">etcd</text>
<rect x="580" y="55" width="60" height="44" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="610" y="76" text-anchor="middle" font-size="10" fill="currentColor">controller</text>
<text x="610" y="90" text-anchor="middle" font-size="10" fill="currentColor">scheduler</text>
<line x1="130" y1="77" x2="198" y2="77" stroke="currentColor" stroke-width="1.3" marker-end="url(#a3)"/>
<text x="164" y="70" text-anchor="middle" font-size="9" fill="currentColor">REST</text>
<line x1="350" y1="77" x2="428" y2="77" stroke="currentColor" stroke-width="1.3" marker-end="url(#a3)"/>
<text x="389" y="70" text-anchor="middle" font-size="9" fill="currentColor">lưu</text>
<line x1="580" y1="77" x2="352" y2="77" stroke="currentColor" stroke-width="1.1" stroke-dasharray="4 3" marker-end="url(#a3)"/>
<text x="466" y="120" text-anchor="middle" font-size="9" fill="currentColor">controller/scheduler watch qua api-server</text>
<defs><marker id="a3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

kubectl biết gọi cluster nào nhờ file **kubeconfig** (mặc định `~/.kube/config`) — chứa địa chỉ api-server, chứng chỉ và **context** (cặp cluster + user + namespace). Vài lệnh nền tảng:

```bash
kubectl version                  # phiên bản client & server (flag --short đã bị gỡ từ v1.28)
kubectl config get-contexts      # liệt kê các context (cluster) đã cấu hình
kubectl config use-context prod  # đổi sang cluster "prod"
kubectl cluster-info             # địa chỉ control plane
```

### 2.2 Object model — mọi thứ là một "object"

Trong Kubernetes, **mọi tài nguyên đều là object**: Pod, Deployment, Service, ConfigMap, Namespace... Mỗi object là một **bản ghi khai báo mong muốn** được lưu trong api-server. Bạn tạo/sửa/xoá object, và các controller sẽ "biến mong muốn thành hiện thực".

Mọi object đều theo **cùng một khung 5 khối**:

| Khối | Vai trò | Ai điền |
|------|---------|---------|
| `apiVersion` | Nhóm + phiên bản của schema (vd `apps/v1`, `v1`) | Bạn |
| `kind` | Loại object (Pod, Deployment, Service...) | Bạn |
| `metadata` | Danh tính: `name`, `namespace`, `labels`, `annotations` | Bạn |
| `spec` | **Desired state** — bạn *muốn* nó ra sao | Bạn |
| `status` | **Actual state** — nó *đang* ra sao (K8s tự ghi) | Kubernetes |

Đây là điểm mấu chốt: **`spec` là mong muốn, `status` là thực tế**. Bạn chỉ viết `spec`; `status` do controller cập nhật liên tục. Toàn bộ Kubernetes chỉ là một cỗ máy khổng lồ cố gắng làm `status` tiến về khớp với `spec`.

<svg viewBox="0 0 620 170" role="img" aria-labelledby="ss-t ss-d" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto">
<title id="ss-t">spec là desired, status là actual</title>
<desc id="ss-d">Object gồm spec do người dùng viết và status do Kubernetes ghi, controller kéo status về khớp spec</desc>
<rect x="40" y="45" width="170" height="80" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="125" y="70" text-anchor="middle" font-size="12" fill="currentColor">spec (desired)</text>
<text x="125" y="90" text-anchor="middle" font-size="10" fill="currentColor">replicas: 3</text>
<text x="125" y="106" text-anchor="middle" font-size="10" fill="currentColor">"bạn viết"</text>
<rect x="410" y="45" width="170" height="80" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="495" y="70" text-anchor="middle" font-size="12" fill="currentColor">status (actual)</text>
<text x="495" y="90" text-anchor="middle" font-size="10" fill="currentColor">readyReplicas: 2</text>
<text x="495" y="106" text-anchor="middle" font-size="10" fill="currentColor">"K8s ghi"</text>
<rect x="245" y="55" width="130" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="82" text-anchor="middle" font-size="11" fill="currentColor">controller</text>
<text x="310" y="99" text-anchor="middle" font-size="9" fill="currentColor">reconcile</text>
<line x1="210" y1="85" x2="243" y2="85" stroke="currentColor" stroke-width="1.2" marker-end="url(#a4)"/>
<line x1="410" y1="85" x2="377" y2="85" stroke="currentColor" stroke-width="1.2" marker-end="url(#a4)"/>
<text x="310" y="145" text-anchor="middle" font-size="10" fill="currentColor">lệch → tạo thêm 1 Pod → status tiến về spec</text>
<defs><marker id="a4" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Một manifest Pod tối giản để thấy rõ 4 khối bạn viết:

```yaml
apiVersion: v1          # Pod thuộc core group → chỉ có version, không có group
kind: Pod
metadata:
  name: nginx
  namespace: default
  labels:
    app: web
spec:
  containers:
    - name: nginx
      image: nginx:1.27
      ports:
        - containerPort: 80
```

Khi `kubectl get pod nginx -o yaml`, bạn sẽ thấy Kubernetes đã **thêm** một khối `status:` khổng lồ (phase, podIP, conditions, containerStatuses...) mà bạn chưa từng viết — đó chính là actual state.

> Mẹo tra cứu tại chỗ: `kubectl explain pod.spec.containers` in ra tài liệu từng field ngay trong terminal — không cần mở web.

### 2.3 apiVersion & kind — vì sao lúc `v1`, lúc `apps/v1`?

`apiVersion` gồm **group** + **version**. Nhóm *core* (Pod, Service, ConfigMap, Namespace) không có tên group nên viết gọn là `v1`. Các nhóm khác có tên riêng:

| kind | apiVersion | Ghi chú |
|------|-----------|---------|
| Pod, Service, ConfigMap, Secret, Namespace | `v1` | core group |
| Deployment, ReplicaSet, StatefulSet, DaemonSet | `apps/v1` | nhóm workload |
| Job, CronJob | `batch/v1` | nhóm batch |
| Ingress, NetworkPolicy | `networking.k8s.io/v1` | |
| HorizontalPodAutoscaler | `autoscaling/v2` | |

Ghép sai `apiVersion`/`kind` là lỗi phổ biến nhất khi mới học (vd viết `apiVersion: v1` cho một Deployment). Nếu quên, hỏi cluster: `kubectl api-resources` liệt kê mọi kind kèm apiVersion và tên viết tắt (Pod=po, Deployment=deploy, Service=svc...).

### 2.4 Namespace — cô lập *logic*, không phải cô lập vật lý

**Namespace** chia cluster thành các "khoang" ảo để nhóm và cô lập object. Hãy hình dung như các **thư mục** trên cùng một ổ đĩa: hai file cùng tên `config` sống yên ổn trong hai thư mục khác nhau. Tương tự, bạn có thể có Deployment `api` trong namespace `team-a` và một `api` khác trong `team-b`.

Điểm bản chất cần nhớ:
- Namespace **chỉ cô lập tên & phạm vi quản lý** (đặt tên, phân quyền RBAC, hạn mức tài nguyên `ResourceQuota`). Nó **không** cô lập mạng — mặc định Pod ở namespace này *vẫn gọi được* Pod namespace khác (muốn chặn phải dùng `NetworkPolicy`).
- Tên object chỉ cần **duy nhất trong một namespace + một kind**, không cần duy nhất toàn cluster.
- Có object **không thuộc namespace nào** (cluster-scoped): Node, PersistentVolume, Namespace, ClusterRole... Xem bằng `kubectl api-resources --namespaced=false`.

DNS nội bộ dựa trên namespace: một Service `db` trong namespace `prod` có tên đầy đủ `db.prod.svc.cluster.local`. Gọi từ trong cùng namespace chỉ cần `db`; gọi xuyên namespace phải ghi `db.prod`.

```bash
kubectl get namespaces
kubectl create namespace team-a
kubectl get pods -n team-a          # -n chỉ định namespace
kubectl get pods -A                 # -A = --all-namespaces (mọi namespace)
kubectl config set-context --current --namespace=team-a   # đặt namespace mặc định
```

### 2.5 Label & selector — chất keo liên kết object

Đây là cơ chế **đẹp và quan trọng nhất** của object model. **Label** là các cặp `key: value` gắn vào `metadata.labels`, còn **selector** là điều kiện lọc theo label. Nhờ đó các object **không cần biết tên nhau** — chúng tìm nhau qua label.

Ví dụ kinh điển: **Service tìm Pod của nó không bằng tên, mà bằng selector**. Service nói "hãy route tới mọi Pod có label `app=web`". Bất kỳ Pod nào mang label đó — kể cả Pod mới sinh ra khi scale — tự động lọt vào tập đích. Đây là lý do self-healing và scaling hoạt động mượt: Pod chết/đẻ liên tục, Service không quan tâm danh sách tên, chỉ quan tâm label.

<svg viewBox="0 0 640 220" role="img" aria-labelledby="lb-t lb-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="lb-t">Service chọn Pod qua selector label app=web</title>
<desc id="lb-d">Service với selector app=web route tới ba Pod mang label app=web, bỏ qua Pod app=db</desc>
<rect x="230" y="15" width="180" height="52" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="38" text-anchor="middle" font-size="12" fill="currentColor">Service web</text>
<text x="320" y="55" text-anchor="middle" font-size="10" fill="currentColor">selector: app=web</text>
<rect x="40" y="140" width="120" height="52" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="163" text-anchor="middle" font-size="11" fill="currentColor">Pod</text>
<text x="100" y="180" text-anchor="middle" font-size="9" fill="currentColor">app=web</text>
<rect x="185" y="140" width="120" height="52" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="245" y="163" text-anchor="middle" font-size="11" fill="currentColor">Pod</text>
<text x="245" y="180" text-anchor="middle" font-size="9" fill="currentColor">app=web</text>
<rect x="330" y="140" width="120" height="52" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="390" y="163" text-anchor="middle" font-size="11" fill="currentColor">Pod</text>
<text x="390" y="180" text-anchor="middle" font-size="9" fill="currentColor">app=web</text>
<rect x="490" y="140" width="120" height="52" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="163" text-anchor="middle" font-size="11" fill="currentColor">Pod</text>
<text x="550" y="180" text-anchor="middle" font-size="9" fill="currentColor">app=db (bỏ qua)</text>
<line x1="300" y1="67" x2="100" y2="138" stroke="currentColor" stroke-width="1.2" marker-end="url(#a5)"/>
<line x1="320" y1="67" x2="245" y2="138" stroke="currentColor" stroke-width="1.2" marker-end="url(#a5)"/>
<line x1="340" y1="67" x2="390" y2="138" stroke="currentColor" stroke-width="1.2" marker-end="url(#a5)"/>
<line x1="380" y1="67" x2="545" y2="138" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<defs><marker id="a5" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Cơ chế này lặp lại khắp nơi: Deployment quản Pod của nó qua selector, ReplicaSet đếm Pod qua selector, `NetworkPolicy` chọn Pod đích qua selector. Selector có hai dạng:

```yaml
# 1) equality-based (đơn giản, dùng ở Service)
selector:
  app: web
  tier: frontend        # ngầm định AND: app=web VÀ tier=frontend

# 2) set-based (mạnh hơn, dùng ở Deployment/ReplicaSet)
selector:
  matchLabels:
    app: web
  matchExpressions:
    - { key: tier, operator: In, values: [frontend, edge] }
    - { key: track, operator: NotIn, values: [canary] }
```

Truy vấn từ CLI cũng dùng chính selector đó — cực hữu ích khi vận hành:

```bash
kubectl get pods -l app=web                    # lọc theo label
kubectl get pods -l 'tier in (frontend,edge)'  # set-based
kubectl label pod nginx env=prod               # gắn thêm label
kubectl label pod nginx env-                   # gỡ label (hậu tố -)
kubectl get pods --show-labels                 # xem mọi label
```

**Quy ước label chuẩn** (khuyến nghị của Kubernetes) giúp công cụ hiểu chung: `app.kubernetes.io/name`, `app.kubernetes.io/instance`, `app.kubernetes.io/version`, `app.kubernetes.io/component`, `app.kubernetes.io/managed-by`.

### 2.6 Annotation — metadata *không dùng để chọn*

**Annotation** cũng là cặp key-value trong `metadata`, nhưng khác label ở **mục đích**:

| | Label | Annotation |
|--|-------|-----------|
| Dùng để **selector chọn object**? | Có | **Không** |
| Ràng buộc ký tự / độ dài | Chặt (ngắn, hạn chế ký tự) | Lỏng, chứa được chuỗi dài |
| Ai đọc | K8s core (scheduling, routing) | Con người & **công cụ ngoài** |
| Ví dụ | `app=web`, `env=prod` | mô tả, git commit, cấu hình Ingress controller, `kubectl.kubernetes.io/last-applied-configuration` |

Nói gọn: **label để máy lọc, annotation để lưu thông tin phụ**. Rất nhiều controller ngoài (Ingress-NGINX, cert-manager, Prometheus) nhận cấu hình qua annotation, ví dụ:

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    prometheus.io/scrape: "true"
    kubernetes.io/change-cause: "cập nhật image lên v2"   # hiện trong lịch sử rollout
```

### 2.7 Imperative vs Declarative — và vì sao production chọn declarative

Có hai phong cách ra lệnh cho cluster:

**Imperative** — bạn ra lệnh *hành động cụ thể*, mỗi lệnh làm một việc ngay:

```bash
kubectl run nginx --image=nginx:1.27               # tạo 1 Pod ngay
kubectl create deployment web --image=nginx:1.27   # tạo Deployment
kubectl scale deployment web --replicas=5          # đổi số bản
kubectl set image deployment/web nginx=nginx:1.28  # đổi image
kubectl expose deployment web --port=80            # tạo Service
```

Nhanh, hợp để thử nghiệm hay debug. **Nhược điểm chí mạng**: trạng thái mong muốn nằm trong *đầu bạn* và *lịch sử gõ phím*, không đâu ghi lại. Không review được, không tái lập được, không biết ai đổi gì.

**Declarative** — bạn mô tả *kết quả mong muốn* trong file YAML rồi bảo cluster "làm cho khớp":

```bash
kubectl apply -f deployment.yaml     # tạo hoặc cập nhật cho khớp file
kubectl apply -f ./manifests/        # áp cả thư mục
kubectl diff -f deployment.yaml      # xem trước thay đổi so với cluster
```

Điểm tinh tế: `apply` **không phải** "tạo mới". Nó tính **diff** giữa file bạn đưa và trạng thái hiện tại rồi chỉ **vá phần khác biệt** (three-way merge, dựa trên annotation `last-applied-configuration`). Chạy `apply` cùng một file mười lần cho ra cùng một kết quả — đây là tính **idempotent**, nền tảng của mọi quy trình tự động (CI/CD, GitOps).

| | Imperative (`run`/`create`) | **Declarative (`apply -f`)** |
|--|----------------------------|------------------------------|
| Bạn mô tả | *hành động* từng bước | *trạng thái* mong muốn |
| Nguồn sự thật | lịch sử lệnh (không lưu) | **file YAML** (đưa vào Git được) |
| Chạy lại nhiều lần | có thể lỗi "đã tồn tại" | **idempotent**, an toàn |
| Review / audit | khó | dễ (diff Git, PR) |
| Hợp cho | thử nhanh, debug | **production, CI/CD, GitOps** |

**Khuyến nghị vàng:** production dùng **declarative**, YAML nằm trong Git, mọi thay đổi qua Pull Request. Imperative chỉ để thử nghiệm hoặc chữa cháy. Một mẹo lai rất hay là dùng imperative để **sinh** YAML rồi chỉnh và commit:

```bash
kubectl create deployment web --image=nginx:1.27 \
  --dry-run=client -o yaml > deployment.yaml
# --dry-run=client: chỉ dựng object phía client, KHÔNG gửi lên cluster
```

### 2.8 Bộ lệnh vận hành cốt lõi

Đây là những lệnh bạn sẽ gõ hàng ngày. Hãy nắm chắc *khi nào* dùng cái nào:

```bash
# apply  — áp desired state từ file (declarative, idempotent)
kubectl apply -f deployment.yaml

# get    — liệt kê nhanh, xem trạng thái hiện tại
kubectl get pods                          # danh sách Pod
kubectl get pods -o wide                  # thêm node & IP
kubectl get pod nginx -o yaml             # xem toàn bộ object (cả status)
kubectl get deploy,svc -n prod            # nhiều kind cùng lúc
kubectl get pods -w                       # -w = watch, cập nhật realtime

# describe — chi tiết + EVENTS (vàng để chẩn đoán vì sao Pod không chạy)
kubectl describe pod nginx

# logs   — đọc log stdout/stderr của container
kubectl logs nginx                        # log hiện tại
kubectl logs nginx -f                     # -f = follow (tail realtime)
kubectl logs nginx --previous            # log của lần chạy TRƯỚC khi crash
kubectl logs deploy/web -c sidecar        # chọn container trong Pod nhiều container

# exec   — chạy lệnh / mở shell BÊN TRONG container
kubectl exec nginx -- nproc               # chạy 1 lệnh
kubectl exec -it nginx -- sh              # -it: shell tương tác

# edit   — sửa object đang chạy bằng editor (mở YAML live, lưu là apply)
kubectl edit deployment web

# delete — xoá object
kubectl delete -f deployment.yaml         # xoá đúng thứ file mô tả
kubectl delete pod nginx                  # xoá theo tên
kubectl delete pods -l app=web            # xoá theo selector
```

Vài lưu ý bản chất, đúng-sai nằm ở đây:
- **`describe` xem `Events` ở cuối** — 80% ca "Pod Pending/CrashLoopBackOff" lộ nguyên nhân ở đó (thiếu tài nguyên, kéo image lỗi, mount sai).
- **`logs --previous`** cứu bạn khi container vừa crash và đã bị restart — log hiện tại thường trống, log cần xem là của *lần chết trước*.
- **`edit` là con dao hai lưỡi**: sửa trực tiếp trên cluster nghĩa là file YAML trong Git *lệch* với thực tế (config drift). Dùng để debug thì được, sửa lâu dài phải quay lại `apply` từ file.
- **`delete -f file`** an toàn hơn xoá theo tên vì nó xoá đúng tập object mà file định nghĩa.

### 2.9 Ghép mọi thứ lại: một manifest Deployment + Service hoàn chỉnh

Đoạn dưới cho thấy **label/selector nối Deployment → Pod → Service** như thế nào — chú ý ba chỗ `app: web` phải khớp nhau:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: default
  labels:
    app.kubernetes.io/name: web
spec:
  replicas: 3                 # desired state: muốn 3 bản
  selector:
    matchLabels:
      app: web                # (A) Deployment quản Pod có label app=web
  template:                   # khuôn để đẻ Pod
    metadata:
      labels:
        app: web              # (B) Pod sinh ra mang label app=web → khớp (A)
    spec:
      containers:
        - name: nginx
          image: nginx:1.27
          ports:
            - containerPort: 80
          resources:
            requests: { cpu: "100m", memory: "128Mi" }
            limits:   { cpu: "500m", memory: "256Mi" }
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web                  # (C) Service route tới Pod có label app=web → khớp (B)
  ports:
    - port: 80
      targetPort: 80
```

Áp và quan sát reconciliation diễn ra thật:

```bash
kubectl apply -f web.yaml
kubectl get deploy web            # READY 3/3 nghĩa là status đã khớp spec
kubectl get pods -l app=web       # 3 Pod, tên hậu tố ngẫu nhiên
kubectl get endpoints web         # thấy đúng 3 IP:port — bằng chứng selector đã "nối" Service với Pod
kubectl scale deployment web --replicas=5   # đổi desired → K8s tự đẻ thêm 2
```

`kubectl get endpoints web` là bài kiểm tra đắt giá: nếu Endpoints **trống**, gần như chắc chắn selector của Service **không khớp** label Pod — lỗi kết nối kinh điển của người mới.

---

## 3. Tóm tắt
- **kubectl** chỉ là client gọi **REST API của api-server**; nguồn sự thật là **object lưu trong etcd**. Cluster nào là do **kubeconfig/context** quyết định.
- Mọi tài nguyên là **object** theo khung 5 khối: `apiVersion / kind / metadata / spec / status`. Bạn viết **`spec` (desired)**; Kubernetes ghi **`status` (actual)** — toàn hệ thống chỉ cố kéo status về khớp spec.
- **Namespace** cô lập *logic* (tên, RBAC, quota) chứ không cô lập mạng; có object cluster-scoped không thuộc namespace nào.
- **Label + selector** là chất keo nối object mà không cần biết tên nhau — Service chọn Pod, Deployment quản Pod đều qua selector; **annotation** để lưu metadata phụ cho người/công cụ, không dùng để chọn.
- **Declarative (`apply -f`)** là chuẩn production: idempotent, YAML trong Git, review qua PR. **Imperative (`run/create`)** chỉ để thử nhanh — hoặc để `--dry-run` sinh YAML.
- Nắm bộ lệnh vận hành: `get`/`describe` (chẩn đoán, nhớ xem **Events**), `logs -f/--previous`, `exec -it`, `edit` (cẩn thận drift), `delete -f`.

> **Bài tiếp theo (Bài 4):** đi sâu vào workload đầu tiên — **Pod**: multi-container, init container, lifecycle & health probe (liveness/readiness/startup), vì sao ta hầu như không bao giờ tạo Pod trần mà luôn qua Deployment.
