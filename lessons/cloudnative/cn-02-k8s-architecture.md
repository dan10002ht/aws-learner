# Bài 2 — Kiến trúc Kubernetes: control plane & node

## 1. Mục tiêu
Sau bài này bạn có thể:
- Vẽ được **sơ đồ kiến trúc** một cluster: **control plane** (bộ não) và **worker node** (cơ bắp).
- Giải thích vai trò **bản chất** của từng thành phần: kube-apiserver, etcd, scheduler, controller-manager (control plane); kubelet, kube-proxy, container runtime (node).
- Hiểu vì sao **kube-apiserver là cửa ngõ DUY NHẤT**, và vì sao **etcd là nguồn sự thật** duy nhất.
- Truy được **luồng đầy đủ** của `kubectl apply` tạo một Deployment: request đi qua từng thành phần nào, ai làm gì.

---

## 2. Lý thuyết

### 2.1 Analogy: cluster như một nhà máy

Hãy hình dung Kubernetes cluster là một **nhà máy sản xuất**:

| Trong nhà máy | Trong Kubernetes | Vai trò |
|---------------|------------------|---------|
| Phòng điều hành trung tâm | **Control plane** | Ra quyết định, không trực tiếp làm hàng |
| Lễ tân + cổng bảo vệ (mọi yêu cầu qua đây) | **kube-apiserver** | Cửa ngõ duy nhất, kiểm tra giấy tờ |
| Kho hồ sơ/sổ cái công ty | **etcd** | Nguồn sự thật, lưu mọi trạng thái |
| Điều phối viên xếp việc | **scheduler** | Gán "đơn hàng" cho phân xưởng nào |
| Các quản đốc giám sát | **controller-manager** | Canh cho thực tế khớp kế hoạch |
| Các phân xưởng | **worker node** | Nơi thật sự chạy container |
| Tổ trưởng phân xưởng | **kubelet** | Nhận lệnh, vận hành máy móc tại chỗ |
| Anh giao liên nội bộ | **kube-proxy** | Định tuyến để các tổ tìm được nhau |
| Máy móc trong xưởng | **container runtime** | Thực thi việc: chạy/dừng container |

Ý tưởng lớn: **control plane chỉ QUYẾT ĐỊNH, node mới THỰC THI**. Hai bên không nói chuyện tuỳ tiện — mọi thứ đều đi qua apiserver và được ghi vào etcd.

### 2.2 Bức tranh kiến trúc tổng thể

<svg viewBox="0 0 720 380" role="img" aria-labelledby="ar-t ar-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="ar-t">Kiến trúc cluster Kubernetes: control plane và worker node</title>
<desc id="ar-d">Control plane gồm apiserver, etcd, scheduler, controller-manager; apiserver là trung tâm mọi thành phần kết nối tới. Worker node gồm kubelet, kube-proxy, container runtime chạy các pod, kubelet nói chuyện với apiserver</desc>
<rect x="20" y="20" width="360" height="200" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="40" y="42" font-size="13" fill="currentColor">Control plane (bộ não)</text>
<rect x="130" y="95" width="150" height="56" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="205" y="119" text-anchor="middle" font-size="12" fill="currentColor">kube-apiserver</text>
<text x="205" y="136" text-anchor="middle" font-size="10" fill="currentColor">cửa ngõ REST</text>
<rect x="40" y="60" width="120" height="34" rx="7" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="82" text-anchor="middle" font-size="11" fill="currentColor">etcd (state)</text>
<rect x="40" y="160" width="120" height="34" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="100" y="182" text-anchor="middle" font-size="11" fill="currentColor">scheduler</text>
<rect x="250" y="160" width="120" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="176" text-anchor="middle" font-size="10" fill="currentColor">controller-</text>
<text x="310" y="189" text-anchor="middle" font-size="10" fill="currentColor">manager</text>
<line x1="160" y1="90" x2="180" y2="95" stroke="currentColor" stroke-width="1.2"/>
<line x1="130" y1="140" x2="100" y2="160" stroke="currentColor" stroke-width="1.2"/>
<line x1="280" y1="140" x2="310" y2="160" stroke="currentColor" stroke-width="1.2"/>
<rect x="420" y="20" width="280" height="160" rx="10" fill="#10b981" fill-opacity="0.08" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="440" y="42" font-size="13" fill="currentColor">Worker node A</text>
<rect x="440" y="55" width="110" height="32" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="495" y="75" text-anchor="middle" font-size="11" fill="currentColor">kubelet</text>
<rect x="570" y="55" width="110" height="32" rx="7" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="625" y="75" text-anchor="middle" font-size="11" fill="currentColor">kube-proxy</text>
<rect x="440" y="98" width="240" height="70" rx="7" fill="#8b5cf6" fill-opacity="0.10" stroke="currentColor"/>
<text x="450" y="115" font-size="10" fill="currentColor">container runtime (containerd)</text>
<rect x="455" y="124" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="145" text-anchor="middle" font-size="10" fill="currentColor">Pod</text>
<rect x="560" y="124" width="90" height="34" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="605" y="145" text-anchor="middle" font-size="10" fill="currentColor">Pod</text>
<rect x="420" y="200" width="280" height="40" rx="10" fill="#10b981" fill-opacity="0.08" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="440" y="224" font-size="11" fill="currentColor">Worker node B ... N (tương tự)</text>
<line x1="280" y1="123" x2="440" y2="70" stroke="currentColor" stroke-width="1.4" marker-end="url(#a2)"/>
<text x="360" y="92" text-anchor="middle" font-size="9" fill="currentColor">watch/report</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Điểm mấu chốt trong sơ đồ: **mọi mũi tên đều chạm apiserver**. etcd, scheduler, controller-manager, kubelet — không ai nói trực tiếp với nhau. Đây là thiết kế **hub-and-spoke** có chủ đích: một cửa để xác thực, phân quyền, kiểm định và ghi log tập trung.

### 2.3 Control plane — bộ não

**kube-apiserver — cửa ngõ REST**

Là thành phần trung tâm, expose Kubernetes API dạng RESTful (`/api/v1/pods`, `/apis/apps/v1/deployments`...). Mọi tương tác — `kubectl`, controller, kubelet, dashboard — đều gọi vào đây. Mỗi request đi qua **3 chốt** theo thứ tự:

1. **Authentication (xác thực)**: bạn là ai? Qua certificate, bearer token, hoặc OIDC.
2. **Authorization (phân quyền)**: bạn được phép làm gì? Thường là **RBAC** — vai trò này có được `create deployments` trong namespace này không?
3. **Admission control**: chốt cuối kiểm định/biến đổi object trước khi ghi. *Mutating* webhook có thể sửa (ví dụ tự tiêm sidecar, gán default), *validating* webhook có thể từ chối (ví dụ cấm image `:latest`). Ví dụ built-in: `ResourceQuota`, `LimitRanger`.

Chỉ khi qua cả 3 chốt, object mới được **persist vào etcd**. apiserver là thành phần **stateless** — nó không tự nhớ gì, mọi trạng thái nằm ở etcd. Nhờ đó có thể chạy **nhiều bản apiserver** sau load balancer để HA.

**etcd — nguồn sự thật**

etcd là một **key-value store phân tán, nhất quán mạnh**, dùng thuật toán đồng thuận **Raft**. Toàn bộ trạng thái cluster — mọi Deployment, Pod, Service, ConfigMap, Secret — được lưu ở đây, và **chỉ apiserver được phép đọc/ghi etcd** (thành phần khác không đụng trực tiếp).

Vì sao quan trọng đến vậy:
- Đây là **single source of truth**. Xoá sạch mọi thứ khác, chỉ cần etcd còn nguyên là dựng lại được cluster.
- Chạy Raft nên cần **số node lẻ** (3, 5, 7) để giữ **quorum** (đa số). Cụm 3 node chịu mất 1; cụm 5 chịu mất 2. Mất quorum → cluster chỉ đọc, không ghi được.
- **Backup etcd là việc sống còn.** Mất etcd không backup = mất cluster.

etcd cũng cung cấp cơ chế **watch**: client (như apiserver) có thể "đăng ký theo dõi" một key và nhận thông báo ngay khi nó đổi. Đây là nền tảng cho toàn bộ mô hình event-driven của Kubernetes.

**kube-scheduler — gán pod vào node**

Scheduler chỉ lo một việc: khi có Pod **mới, chưa có node** (trường `spec.nodeName` rỗng), nó quyết định Pod nên chạy ở node nào. Quy trình 2 pha:

1. **Filtering (lọc)**: loại các node không đủ điều kiện — không đủ CPU/RAM, không khớp `nodeSelector`/affinity, dính taint mà Pod không tolerate, port trùng...
2. **Scoring (chấm điểm)**: các node còn lại được cho điểm (ưu tiên node ít tải, trải đều theo topology...). Node điểm cao nhất thắng.

Chú ý: scheduler **không** tự chạy Pod. Nó chỉ **ghi lại quyết định** bằng cách cập nhật `pod.spec.nodeName = "node-A"` qua apiserver. Việc thật để kubelet làm.

**kube-controller-manager — các reconcile loop**

Là một tiến trình gói **nhiều controller**, mỗi controller là một **vòng lặp reconciliation** (nhớ Bài 1): liên tục *quan sát desired state, so với actual, hành động để khớp*. Vài controller tiêu biểu:

| Controller | Canh cái gì | Hành động khi lệch |
|------------|-------------|--------------------|
| Deployment controller | Deployment ↔ ReplicaSet | Tạo/cập nhật ReplicaSet khi bạn đổi image/replicas |
| ReplicaSet controller | Số Pod ↔ `replicas` mong muốn | Thiếu thì tạo Pod, thừa thì xoá |
| Node controller | Sức khoẻ node | Node mất tín hiệu → đánh dấu NotReady, evict Pod |
| Job controller | Job hoàn thành | Chạy Pod tới khi đủ số lần thành công |

Controller **không tự chạy container** — nó chỉ tạo/sửa/xoá **object** qua apiserver. Ví dụ ReplicaSet controller thấy thiếu 1 Pod thì **tạo object Pod** (chưa gán node); phần còn lại do scheduler và kubelet lo. Đây là chuỗi trách nhiệm rất sạch: mỗi thành phần chỉ làm đúng phần của mình rồi ghi kết quả vào apiserver cho thành phần sau tiếp tục.

*(Ghi chú: `cloud-controller-manager` là một tiến trình riêng lo tích hợp với nhà cung cấp cloud — tạo Load Balancer, gắn volume, route — nhưng nguyên lý reconcile giống hệt.)*

### 2.4 Worker node — cơ bắp

**kubelet — quản pod trên node**

Là agent chạy trên **mỗi** node. Nó **watch** apiserver để biết những Pod nào được gán cho node của mình (`nodeName` khớp). Với mỗi Pod đó, kubelet:
- Gọi **container runtime** qua chuẩn **CRI** để kéo image và khởi chạy container.
- Chạy **probe**: `livenessProbe` (chết thì restart container), `readinessProbe` (chưa sẵn sàng thì gỡ khỏi Service), `startupProbe`.
- **Báo cáo trạng thái** Pod/node ngược lại apiserver liên tục (Running, CrashLoopBackOff...).

kubelet **chỉ quản Pod được apiserver giao**; nó không tự quyết định lịch. Nó là cầu nối duy nhất giữa "thế giới quyết định" (control plane) và "thế giới thực thi" (runtime).

**container runtime — người thực thi thật**

Là phần mềm thật sự chạy container: pull image, tạo namespace/cgroup, start/stop process. Kubernetes nói chuyện với runtime qua giao diện chuẩn **CRI (Container Runtime Interface)**, nên runtime có thể thay thế được: **containerd** (phổ biến nhất), **CRI-O**. Docker từng dùng qua shim `dockershim` nhưng đã bị gỡ khỏi k8s v1.24+ — giờ dùng thẳng containerd.

**kube-proxy — network cho Service**

Một Pod có IP riêng nhưng IP đó **phù du**: Pod chết/tái tạo là đổi. Nên client không gọi Pod trực tiếp mà gọi **Service** — một địa chỉ ảo (ClusterIP) ổn định. kube-proxy chạy trên mỗi node, **watch** các Service/Endpoints và lập trình bảng định tuyến của kernel (**iptables** hoặc **IPVS**) để: gói tin gửi tới ClusterIP được **DNAT** và **load-balance** tới một trong các Pod đang sẵn sàng. (Chi tiết Service để dành Chương networking — ở đây chỉ cần biết kube-proxy là thành phần biến "tên Service ổn định" thành "định tuyến tới Pod thật".)

> Lưu ý: worker node **không chạy** etcd/scheduler/controller. Ngược lại, node control plane thường bị **taint** để không nhận workload thường — giữ bộ não sạch tải.

### 2.5 Luồng hoàn chỉnh: `kubectl apply` tạo một Deployment

Đây là phần "ráp" mọi thứ lại. Ta apply file sau:

```yaml
# web-deploy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3                 # desired state: muốn 3 bản
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: web
          image: nginx:1.27
          ports:
            - containerPort: 80
```

```bash
kubectl apply -f web-deploy.yaml
```

Chuyện gì xảy ra bên trong? Theo dõi từng chặng:

<svg viewBox="0 0 700 430" role="img" aria-labelledby="fl-t fl-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="fl-t">Luồng kubectl apply tạo Deployment đi qua các thành phần</title>
<desc id="fl-d">kubectl gửi tới apiserver, apiserver xác thực phân quyền admission rồi ghi vào etcd; deployment controller tạo replicaset, replicaset controller tạo pod, scheduler gán node, kubelet chạy container qua runtime rồi báo lại</desc>
<line x1="70" y1="30" x2="70" y2="410" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
<line x1="250" y1="30" x2="250" y2="410" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
<line x1="410" y1="30" x2="410" y2="410" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
<line x1="560" y1="30" x2="560" y2="410" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
<text x="70" y="22" text-anchor="middle" font-size="10" fill="currentColor">kubectl</text>
<text x="250" y="22" text-anchor="middle" font-size="10" fill="currentColor">apiserver+etcd</text>
<text x="410" y="22" text-anchor="middle" font-size="10" fill="currentColor">controllers</text>
<text x="500" y="22" text-anchor="middle" font-size="10" fill="currentColor">scheduler</text>
<text x="620" y="22" text-anchor="middle" font-size="10" fill="currentColor">kubelet+runtime</text>
<line x1="70" y1="55" x2="250" y2="55" stroke="currentColor" stroke-width="1.3" marker-end="url(#a3)"/>
<text x="160" y="49" text-anchor="middle" font-size="9" fill="currentColor">1. POST Deployment (YAML)</text>
<rect x="200" y="68" width="110" height="40" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="255" y="84" text-anchor="middle" font-size="8.5" fill="currentColor">2. authn/authz</text>
<text x="255" y="98" text-anchor="middle" font-size="8.5" fill="currentColor">admission → etcd</text>
<line x1="250" y1="120" x2="410" y2="120" stroke="currentColor" stroke-width="1.3" marker-end="url(#a3)"/>
<text x="330" y="114" text-anchor="middle" font-size="9" fill="currentColor">3. watch: có Deployment mới</text>
<rect x="360" y="132" width="110" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="415" y="153" text-anchor="middle" font-size="8.5" fill="currentColor">4. tạo ReplicaSet</text>
<line x1="410" y1="180" x2="250" y2="180" stroke="currentColor" stroke-width="1.3" marker-end="url(#a3)"/>
<text x="330" y="174" text-anchor="middle" font-size="9" fill="currentColor">ghi ReplicaSet → etcd</text>
<rect x="360" y="192" width="110" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="415" y="207" text-anchor="middle" font-size="8.5" fill="currentColor">5. tạo 3 Pod</text>
<text x="415" y="219" text-anchor="middle" font-size="8" fill="currentColor">(chưa có node)</text>
<line x1="410" y1="240" x2="250" y2="240" stroke="currentColor" stroke-width="1.3" marker-end="url(#a3)"/>
<text x="330" y="234" text-anchor="middle" font-size="9" fill="currentColor">ghi 3 Pod → etcd</text>
<line x1="250" y1="265" x2="500" y2="265" stroke="currentColor" stroke-width="1.3" marker-end="url(#a3)"/>
<text x="375" y="259" text-anchor="middle" font-size="9" fill="currentColor">6. watch: Pod chưa gán node</text>
<rect x="450" y="277" width="100" height="34" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="500" y="292" text-anchor="middle" font-size="8.5" fill="currentColor">7. filter+score</text>
<text x="500" y="304" text-anchor="middle" font-size="8.5" fill="currentColor">chọn node</text>
<line x1="500" y1="325" x2="250" y2="325" stroke="currentColor" stroke-width="1.3" marker-end="url(#a3)"/>
<text x="375" y="319" text-anchor="middle" font-size="9" fill="currentColor">8. set nodeName → etcd</text>
<line x1="250" y1="350" x2="620" y2="350" stroke="currentColor" stroke-width="1.3" marker-end="url(#a3)"/>
<text x="430" y="344" text-anchor="middle" font-size="9" fill="currentColor">9. watch: Pod gán cho node tôi</text>
<rect x="575" y="362" width="105" height="34" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="627" y="377" text-anchor="middle" font-size="8.5" fill="currentColor">10. pull image</text>
<text x="627" y="389" text-anchor="middle" font-size="8.5" fill="currentColor">start container</text>
<line x1="620" y1="405" x2="250" y2="405" stroke="currentColor" stroke-width="1.3" marker-end="url(#a3)"/>
<text x="430" y="399" text-anchor="middle" font-size="9" fill="currentColor">11. báo status Running → etcd</text>
<defs><marker id="a3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Diễn giải từng bước:

1. **kubectl → apiserver**: `kubectl` biến YAML thành HTTP `POST /apis/apps/v1/.../deployments`.
2. **apiserver kiểm & ghi**: chạy authn → authz (RBAC) → admission, rồi **persist object Deployment vào etcd**. Trả `201 Created` cho bạn. *Lúc này CHƯA có container nào chạy — mới chỉ có "ý định" trong etcd.*
3-4. **Deployment controller** (đang watch) thấy Deployment mới → tạo một **ReplicaSet** (ghi qua apiserver vào etcd).
5. **ReplicaSet controller** thấy ReplicaSet muốn 3 replica nhưng actual = 0 → tạo **3 object Pod**. Các Pod này `nodeName` còn rỗng — **chưa được xếp chỗ**.
6-7. **scheduler** watch thấy 3 Pod chưa có node → với mỗi Pod chạy **filtering + scoring** để chọn node phù hợp.
8. scheduler **ghi `spec.nodeName`** cho từng Pod (binding) qua apiserver → etcd.
9-10. **kubelet** trên node được chọn watch thấy "có Pod dành cho tôi" → gọi **container runtime** qua CRI để pull `nginx:1.27` và start container; thiết lập network (CNI).
11. kubelet **báo status** (Running) ngược về apiserver → etcd. Song song, **kube-proxy** cập nhật iptables nếu có Service trỏ tới các Pod này.

Ba điều đắt giá rút ra từ luồng này:
- **Không thành phần nào gọi trực tiếp thành phần khác.** Chúng chỉ đọc/ghi object qua apiserver và **watch** thay đổi. Đây là **level-triggered / event-driven**, cực kỳ bền: một controller chết rồi sống lại chỉ cần đọc lại state hiện tại từ etcd là tiếp tục đúng — không có "mất message".
- Trách nhiệm **phân tầng rạch ròi**: Deployment→ReplicaSet→Pod→node→container. Mỗi lớp chỉ biết lớp kề. Nhờ vậy thay ReplicaSet bằng StatefulSet, hay đổi scheduler, không đụng phần còn lại.
- **etcd là chốt duy nhất** ghi lại "sự thật". Mọi bước ở trên thực chất chỉ là các thành phần lần lượt cập nhật cùng một cuốn sổ cái.

### 2.6 Vài lệnh nhìn tận mắt kiến trúc

```bash
# Xem các thành phần control plane (khi tự dựng bằng kubeadm)
kubectl get pods -n kube-system
#   kube-apiserver-...        controller-manager-...
#   kube-scheduler-...        etcd-...            kube-proxy-...

# Node nào đang có, trạng thái ra sao
kubectl get nodes -o wide

# Sức khoẻ control plane
kubectl get componentstatuses     # (hoặc kubectl get --raw='/healthz')

# Xem "hồ sơ" một Pod: nó được scheduler gán vào node nào
kubectl get pod <pod> -o jsonpath='{.spec.nodeName}'

# Đọc chuỗi sự kiện thật (chính là luồng ở 2.5) theo thời gian
kubectl get events --sort-by=.lastTimestamp
#   Scheduled   -> scheduler gán node
#   Pulling/Pulled -> kubelet+runtime kéo image
#   Started     -> container chạy
```

> Trên EKS/GKE/AKS bạn **không thấy** Pod control plane vì nhà cung cấp quản lý (managed) và ẩn đi. Nhưng kiến trúc bên dưới **y hệt** — chỉ là bạn không phải tự vá etcd lúc 3h sáng.

---

## 3. Tóm tắt
- Cluster chia hai nửa: **control plane quyết định**, **worker node thực thi**. Chúng liên lạc gián tiếp, tất cả qua apiserver.
- **kube-apiserver**: cửa ngõ REST duy nhất; mọi request qua authn → authz (RBAC) → admission rồi mới ghi. Stateless nên dễ HA.
- **etcd**: key-value store nhất quán mạnh (Raft, cần quorum số lẻ), **nguồn sự thật** duy nhất; chỉ apiserver đụng tới; **phải backup**.
- **scheduler**: gán Pod chưa có node vào node phù hợp (filter → score), chỉ ghi `nodeName` chứ không chạy Pod.
- **controller-manager**: gói nhiều **reconcile loop** (Deployment, ReplicaSet, Node, Job...) kéo actual về desired bằng cách tạo/sửa object.
- **kubelet**: agent mỗi node, watch apiserver, gọi **runtime** qua CRI chạy Pod, chạy probe, báo status.
- **container runtime** (containerd/CRI-O): thật sự chạy container. **kube-proxy**: định tuyến Service tới Pod bằng iptables/IPVS.
- Luồng `kubectl apply`: apiserver ghi Deployment → controller tạo ReplicaSet → tạo Pod → scheduler gán node → kubelet+runtime chạy → báo Running. Mọi bước chỉ là đọc/ghi/watch object qua apiserver — event-driven, không "mất message".

> **Bài tiếp theo (Bài 3):** cách bạn *nói chuyện* với apiserver hằng ngày — **kubectl & YAML**: cấu trúc object, `apply` vs `create`, và cách đọc `describe`/`logs` để debug.
