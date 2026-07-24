# Bài 10 — Storage: Volume, PV/PVC, StorageClass & CSI

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao container là ephemeral** và dữ liệu trong nó biến mất khi container restart.
- Phân biệt **Volume trong Pod** (`emptyDir`, `hostPath`) và **lưu trữ bền vững ngoài vòng đời Pod**.
- Hiểu mô hình tách **cung/cầu**: **PersistentVolume (PV)** là tài nguyên, **PersistentVolumeClaim (PVC)** là yêu cầu — và cách chúng **bind** với nhau.
- Dùng **StorageClass** để **dynamic provisioning**: tự tạo PV khi có PVC, không cần admin cấp tay.
- Chọn đúng **access mode** (RWO/ROX/RWX) và **reclaim policy** (Retain/Delete).
- Biết **CSI** là gì và vì sao nó là chuẩn cắm driver lưu trữ.
- Cấp cho mỗi Pod của **StatefulSet** một volume riêng qua **volumeClaimTemplate**.

---

## 2. Lý thuyết

### 2.1 Container là ephemeral — và vì sao điều đó là vấn đề

Filesystem của một container sống trong **writable layer** nằm trên các layer read-only của image. Khi container bị xoá và tạo lại — điều xảy ra **liên tục** trong Kubernetes (crash → restart, rollout → thay Pod, reschedule → chuyển node) — writable layer bị **vứt đi**. Toàn bộ file ghi lúc runtime biến mất.

Ví dụ: một Postgres chạy trong Pod ghi data vào `/var/lib/postgresql/data`. Node reboot, kubelet tạo lại container → **mất sạch database**. Đây không phải bug, đây là **thiết kế**: container được sinh ra để **stateless và thay-thế-được**.

> Analogy: container như **phòng khách sạn**. Bạn ở, bày đồ đạc lên bàn — nhưng khi trả phòng, dọn phòng xoá sạch dấu vết. Muốn giữ đồ qua nhiều lần thuê, bạn cần **két sắt/kho gửi đồ riêng** (volume) độc lập với căn phòng.

Kubernetes tách bài toán này thành nhiều lớp trừu tượng, mỗi lớp giải một mức "bền" khác nhau.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="st-t st-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="st-t">Các lớp lưu trữ trong Kubernetes theo mức độ bền vững</title>
<desc id="st-d">Từ trên xuống dưới, mức độ bền tăng dần: container writable layer mất khi restart, emptyDir sống theo Pod, hostPath gắn với node, PV/PVC độc lập với Pod và node</desc>
<rect x="40" y="20" width="580" height="42" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="60" y="40" font-size="12" fill="currentColor">Writable layer của container</text>
<text x="60" y="56" font-size="10" fill="currentColor">Mất khi container restart — KHÔNG bao giờ để data quan trọng ở đây</text>
<rect x="40" y="76" width="580" height="42" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="60" y="96" font-size="12" fill="currentColor">emptyDir — Volume sống theo vòng đời Pod</text>
<text x="60" y="112" font-size="10" fill="currentColor">Còn khi container restart trong cùng Pod; mất khi Pod bị xoá</text>
<rect x="40" y="132" width="580" height="42" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="60" y="152" font-size="12" fill="currentColor">hostPath — gắn với thư mục trên node</text>
<text x="60" y="168" font-size="10" fill="currentColor">Còn khi Pod xoá; mất khi Pod chuyển sang node khác — dính chặt 1 node</text>
<rect x="40" y="188" width="580" height="44" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="60" y="209" font-size="12" fill="currentColor">PersistentVolume (PVC) — độc lập Pod và node</text>
<text x="60" y="225" font-size="10" fill="currentColor">Data theo Pod tới bất kỳ node nào; sống qua reschedule — nơi để database, upload...</text>
</svg>

### 2.2 Volume trong Pod: `emptyDir` và `hostPath`

**Volume** trong Kubernetes là thư mục truy cập được bởi các container trong Pod, có **vòng đời riêng** so với container. Kiểu đơn giản nhất:

**`emptyDir`** — tạo một thư mục rỗng khi Pod được gán vào node, **sống cùng vòng đời Pod**. Container restart vẫn còn; **Pod bị xoá thì mất**. Dùng cho: scratch space, cache, chia sẻ file giữa các container trong cùng Pod (sidecar pattern).

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cache-demo
spec:
  containers:
    - name: app
      image: nginx:1.27
      volumeMounts:
        - name: scratch          # khớp với volumes[].name bên dưới
          mountPath: /var/cache   # đường dẫn bên trong container
  volumes:
    - name: scratch
      emptyDir:
        medium: Memory           # tuỳ chọn: dùng tmpfs (RAM) thay vì đĩa
        sizeLimit: 256Mi
```

**`hostPath`** — mount một thư mục/file **từ chính node** vào Pod. Data còn khi Pod xoá, nhưng **dính chặt vào một node cụ thể**: Pod reschedule sang node khác sẽ thấy thư mục khác (hoặc rỗng). Ngoài ra `hostPath` là **rủi ro bảo mật** (Pod chạm được filesystem host). Chỉ dùng cho node-level agent (log collector, monitoring như node-exporter), **không** cho data ứng dụng.

```yaml
  volumes:
    - name: varlog
      hostPath:
        path: /var/log
        type: Directory
```

→ Cả hai đều **không đủ** cho stateful app thật (database, message queue, file upload). Ta cần lưu trữ **tách rời cả Pod lẫn node** — đó là PV/PVC.

### 2.3 PV & PVC — tách cung và cầu

Đây là ý tưởng thiết kế cốt lõi. Kubernetes **tách người cung cấp lưu trữ khỏi người tiêu thụ**:

| | **PersistentVolume (PV)** | **PersistentVolumeClaim (PVC)** |
|--|---------------------------|---------------------------------|
| Là gì | **Miếng lưu trữ** thật trong cluster (một disk EBS, một share NFS...) | **Yêu cầu** lưu trữ của ứng dụng |
| Ai tạo/quản | Admin cluster (hoặc auto qua StorageClass) | Developer / app |
| Scope | Cluster-wide (không namespace) | Thuộc một **namespace** |
| Analogy | Chỗ trống trong bãi giữ xe | Vé "tôi cần 1 chỗ cho xe 4 bánh" |

Pod **không** tham chiếu PV trực tiếp; Pod tham chiếu **PVC**. Kubernetes lo việc **bind** PVC vào một PV phù hợp (đủ dung lượng, đúng access mode, đúng StorageClass). Nhờ tách lớp này, developer chỉ cần nói *"tôi cần 20Gi RWO"* mà **không cần biết** phía dưới là EBS, GCE PD, NFS hay Ceph.

<svg viewBox="0 0 660 240" role="img" aria-labelledby="bind-t bind-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="bind-t">Quan hệ giữa Pod, PVC và PV</title>
<desc id="bind-d">Pod mount một PVC; PVC được bind tới một PV; PV trỏ tới lưu trữ vật lý phía dưới thông qua CSI driver</desc>
<rect x="30" y="90" width="130" height="60" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="116" text-anchor="middle" font-size="13" fill="currentColor">Pod</text>
<text x="95" y="134" text-anchor="middle" font-size="10" fill="currentColor">volumeMounts</text>
<rect x="220" y="90" width="130" height="60" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="285" y="112" text-anchor="middle" font-size="13" fill="currentColor">PVC</text>
<text x="285" y="130" text-anchor="middle" font-size="10" fill="currentColor">yêu cầu 20Gi RWO</text>
<rect x="410" y="90" width="130" height="60" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="475" y="112" text-anchor="middle" font-size="13" fill="currentColor">PV</text>
<text x="475" y="130" text-anchor="middle" font-size="10" fill="currentColor">20Gi capacity</text>
<rect x="580" y="90" width="60" height="60" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="610" y="116" text-anchor="middle" font-size="10" fill="currentColor">Disk</text>
<text x="610" y="132" text-anchor="middle" font-size="9" fill="currentColor">EBS</text>
<line x1="160" y1="120" x2="218" y2="120" stroke="currentColor" stroke-width="1.3" marker-end="url(#av)"/>
<text x="189" y="112" text-anchor="middle" font-size="9" fill="currentColor">mount</text>
<line x1="350" y1="120" x2="408" y2="120" stroke="currentColor" stroke-width="1.3" marker-end="url(#av)"/>
<text x="379" y="112" text-anchor="middle" font-size="9" fill="currentColor">bind</text>
<line x1="540" y1="120" x2="578" y2="120" stroke="currentColor" stroke-width="1.3" marker-end="url(#av)"/>
<text x="330" y="40" text-anchor="middle" font-size="11" fill="currentColor">Developer sở hữu Pod và PVC (trong namespace)</text>
<text x="490" y="200" text-anchor="middle" font-size="11" fill="currentColor">Admin / CSI sở hữu PV và lưu trữ vật lý</text>
<defs><marker id="av" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**PV tạo tay (static provisioning)** — ví dụ một share NFS admin cấp sẵn:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-nfs-data
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadWriteMany           # NFS cho phép nhiều node ghi
  persistentVolumeReclaimPolicy: Retain
  storageClassName: ""        # rỗng: không thuộc StorageClass nào (static)
  nfs:
    server: 10.0.0.10
    path: /exports/data
```

**PVC yêu cầu lưu trữ** — app khai báo nhu cầu:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-claim
  namespace: shop
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi          # cần ÍT NHẤT 20Gi
  storageClassName: fast-ssd  # chỉ bind PV cùng class này
```

**Pod dùng PVC** — tham chiếu qua tên claim, không bao giờ trực tiếp PV:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web
spec:
  containers:
    - name: app
      image: nginx:1.27
      volumeMounts:
        - name: data
          mountPath: /usr/share/nginx/html
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: data-claim   # trỏ tới PVC ở trên
```

Vòng đời PVC: `Pending` (chưa có PV khớp) → `Bound` (đã ghép PV) → khi xoá thì `Released`. Kiểm tra:

```bash
kubectl get pvc -n shop
# NAME         STATUS   VOLUME        CAPACITY   ACCESS MODES   STORAGECLASS
# data-claim   Bound    pvc-9f3a...   20Gi       RWO            fast-ssd
kubectl get pv
kubectl describe pvc data-claim -n shop   # xem event nếu Pending
```

### 2.4 StorageClass & dynamic provisioning

Cấp PV bằng tay không mở rộng nổi: mỗi PVC mới, admin phải tạo PV mới. **StorageClass** giải bài này bằng **dynamic provisioning** — khi một PVC tham chiếu tới StorageClass, Kubernetes **tự động gọi provisioner tạo PV** vừa đúng kích thước, rồi bind lại. Không admin can thiệp.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com     # CSI driver nào sẽ tạo volume
parameters:
  type: gp3                       # tham số riêng của driver (loại disk)
  iops: "3000"
  encrypted: "true"
reclaimPolicy: Delete             # xoá PVC -> xoá luôn disk thật
allowVolumeExpansion: true        # cho phép nới rộng PVC sau này
volumeBindingMode: WaitForFirstConsumer
```

Hai field tinh tế nhưng quan trọng:

- **`volumeBindingMode: WaitForFirstConsumer`** — hoãn tạo PV **cho tới khi có Pod dùng PVC** được lên lịch. Nhờ đó volume được tạo **đúng ở availability zone của node chạy Pod** (disk như EBS không đi xuyên zone được). Nếu để mặc định `Immediate`, PV có thể bị tạo ở zone A trong khi Pod lại bị xếp ở zone B → Pod kẹt `Pending` mãi.
- **`allowVolumeExpansion: true`** — cho phép sau này chỉ cần sửa `spec.resources.requests.storage` của PVC lên số lớn hơn để nới disk (không thu nhỏ được).

Đặt một StorageClass làm **default** để PVC không ghi `storageClassName` vẫn dùng được:

```bash
kubectl annotate storageclass fast-ssd \
  storageclass.kubernetes.io/is-default-class=true
```

Khi đó PVC gọn còn:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-claim
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 20Gi
  # không ghi storageClassName -> dùng default -> PV được tạo tự động
```

<svg viewBox="0 0 660 210" role="img" aria-labelledby="dp-t dp-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="dp-t">Luồng dynamic provisioning</title>
<desc id="dp-d">Developer tạo PVC tham chiếu StorageClass, provisioner gọi CSI driver tạo disk thật rồi tạo PV và bind vào PVC một cách tự động</desc>
<rect x="20" y="80" width="120" height="54" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="104" text-anchor="middle" font-size="12" fill="currentColor">PVC tạo ra</text>
<text x="80" y="121" text-anchor="middle" font-size="9" fill="currentColor">class=fast-ssd</text>
<rect x="185" y="80" width="130" height="54" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="250" y="104" text-anchor="middle" font-size="12" fill="currentColor">StorageClass</text>
<text x="250" y="121" text-anchor="middle" font-size="9" fill="currentColor">+ provisioner</text>
<rect x="360" y="80" width="130" height="54" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="425" y="104" text-anchor="middle" font-size="12" fill="currentColor">CSI driver</text>
<text x="425" y="121" text-anchor="middle" font-size="9" fill="currentColor">tạo disk thật</text>
<rect x="535" y="80" width="105" height="54" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="587" y="104" text-anchor="middle" font-size="12" fill="currentColor">PV tạo ra</text>
<text x="587" y="121" text-anchor="middle" font-size="9" fill="currentColor">tự bind PVC</text>
<line x1="140" y1="107" x2="183" y2="107" stroke="currentColor" stroke-width="1.3" marker-end="url(#ad)"/>
<line x1="315" y1="107" x2="358" y2="107" stroke="currentColor" stroke-width="1.3" marker-end="url(#ad)"/>
<line x1="490" y1="107" x2="533" y2="107" stroke="currentColor" stroke-width="1.3" marker-end="url(#ad)"/>
<text x="330" y="40" text-anchor="middle" font-size="11" fill="currentColor">Tất cả tự động — admin không cấp PV bằng tay</text>
<defs><marker id="ad" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.5 Access mode & Reclaim policy

**Access mode** — cách volume được mount, quyết định bao nhiêu node ghi/đọc được:

| Mode | Viết tắt | Ý nghĩa | Điển hình |
|------|----------|---------|-----------|
| `ReadWriteOnce` | RWO | Mount **đọc-ghi bởi một node** (nhiều Pod trên node đó vẫn OK) | Block storage: EBS, GCE PD |
| `ReadOnlyMany` | ROX | Nhiều node mount **chỉ-đọc** | Data tĩnh dùng chung |
| `ReadWriteMany` | RWX | **Nhiều node cùng đọc-ghi** | File storage: NFS, EFS, CephFS |
| `ReadWriteOncePod` | RWOP | Chỉ **đúng một Pod** ghi (chặt hơn RWO) | Cần độc quyền tuyệt đối |

Điểm hay nhầm: **RWO gắn với node, không phải Pod**. Block device như EBS **không thể** RWX — một disk chỉ attach vào một máy tại một thời điểm. Muốn nhiều Pod trên **nhiều node** cùng ghi (ví dụ nhiều web server chia sẻ thư mục upload) thì phải dùng **file storage** (NFS/EFS) hỗ trợ RWX. Chọn sai access mode là nguyên nhân kinh điển khiến Pod thứ hai kẹt `ContainerCreating` vì "volume đang được node khác giữ".

**Reclaim policy** — số phận PV **sau khi PVC bị xoá**:

| Policy | Hành vi | Khi dùng |
|--------|---------|----------|
| `Delete` | Xoá luôn **disk vật lý** phía dưới | Mặc định cho dynamic; data tạm/tái tạo được |
| `Retain` | Giữ PV và disk, chuyển sang `Released`; admin dọn tay | Data quý — chống xoá nhầm |
| `Recycle` | (deprecated) xoá nội dung rồi tái dùng | Không dùng nữa |

> Cảnh báo thực chiến: StorageClass dynamic mặc định thường là `Delete`. Xoá nhầm PVC của database production = **bay luôn ổ đĩa và toàn bộ data**. Với volume quan trọng, đặt `reclaimPolicy: Retain` (hoặc patch PV sau khi bind) để xoá PVC không kéo theo xoá disk.

### 2.6 CSI — Container Storage Interface

Trước đây, code tích hợp từng loại lưu trữ (EBS, GCE PD, Cinder...) được nhét **thẳng vào source Kubernetes** ("in-tree volume plugins"). Hệ quả: muốn thêm/sửa driver phải chờ release Kubernetes, và code hãng lưu trữ trộn lẫn vào core. Không mở rộng nổi.

**CSI (Container Storage Interface)** là **chuẩn API** để bất kỳ hệ lưu trữ nào cắm vào Kubernetes (và cả Nomad, Mesos) **mà không cần sửa core**. Nhà cung cấp viết một **CSI driver** (chạy như Pod trong cluster) hiện thực các gRPC method chuẩn: `CreateVolume`, `DeleteVolume`, `ControllerPublishVolume` (attach), `NodeStageVolume`/`NodePublishVolume` (mount)... Kubernetes gọi các method này khi cần cấp/gắn/mount volume.

Nhờ CSI:
- Provisioner trong StorageClass chỉ là **tên driver** (`ebs.csi.aws.com`, `disk.csi.azure.com`, `pd.csi.storage.gke.io`, `csi.trident.netapp.io`...).
- Nhận thêm tính năng chuẩn hoá: **snapshot** (`VolumeSnapshot`), **clone**, **volume expansion**, **topology awareness** (zone).
- In-tree plugin cũ đang được **migrate** dần sang CSI (CSI migration).

Kiểm tra driver có trong cluster:

```bash
kubectl get csidrivers
# NAME              ATTACHREQUIRED   PODINFOONMOUNT   MODES
# ebs.csi.aws.com   true             false            Persistent
kubectl get csinodes    # driver nào sẵn trên mỗi node
```

Snapshot một PVC (cần CSI driver hỗ trợ):

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: data-snap-2026-07-24
  namespace: shop
spec:
  volumeSnapshotClassName: ebs-snap-class
  source:
    persistentVolumeClaimName: data-claim
```

### 2.7 StatefulSet + volumeClaimTemplate

Một Deployment nếu gắn PVC thì **mọi replica chia sẻ chung một PVC** — sai cho database, vì mỗi instance cần **ổ riêng**. **StatefulSet** giải bằng **`volumeClaimTemplate`**: Kubernetes tạo **một PVC riêng cho từng Pod**, đặt tên ổn định theo ordinal, và **giữ nguyên PVC đó qua reschedule/restart**. Pod `db-0` luôn dính PVC của nó, `db-1` dính PVC của nó — data không lẫn.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres        # headless Service cho DNS ổn định
  replicas: 3
  selector:
    matchLabels: {app: postgres}
  template:
    metadata:
      labels: {app: postgres}
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data                    # khớp tên template bên dưới
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:                      # K8s tạo 1 PVC / mỗi Pod
    - metadata:
        name: data
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 50Gi
```

Kết quả: các PVC được sinh ra với tên **`<template>-<statefulset>-<ordinal>`**, ổn định và bám Pod:

```bash
kubectl get pvc -l app=postgres
# NAME               STATUS   VOLUME        CAPACITY   ACCESS MODES   STORAGECLASS
# data-postgres-0    Bound    pvc-a1...     50Gi       RWO            fast-ssd
# data-postgres-1    Bound    pvc-b2...     50Gi       RWO            fast-ssd
# data-postgres-2    Bound    pvc-c3...     50Gi       RWO            fast-ssd
```

Lưu ý vận hành: **xoá StatefulSet KHÔNG xoá các PVC này** (có chủ đích — để không mất data). Muốn dọn phải xoá PVC thủ công. Đây chính là hành vi ta muốn cho stateful workload: scale down rồi scale up, Pod cũ tìm lại đúng data của mình.

---

## 3. Tình huống thực tế

- **Web upload dùng chung**: 5 replica nginx phục vụ ảnh user upload → cần RWX → dùng **EFS/NFS CSI**, KHÔNG dùng EBS (RWO không cho 5 node cùng ghi).
- **Database production**: Postgres qua **StatefulSet + volumeClaimTemplate**, StorageClass `gp3` với `reclaimPolicy: Retain`, `WaitForFirstConsumer` để disk sinh đúng zone của Pod.
- **Cache/scratch**: pipeline xử lý ảnh cần chỗ tạm giữa 2 container → `emptyDir` (thậm chí `medium: Memory` cho nhanh), không cần PV.
- **Nới đĩa khi đầy**: `allowVolumeExpansion: true` + `kubectl edit pvc` tăng `storage` từ 50Gi lên 100Gi, driver online-resize không cần downtime.

---

## 4. Tóm tắt
- Container **ephemeral**: writable layer mất khi restart → không bao giờ để data quan trọng trong container.
- **Volume trong Pod**: `emptyDir` sống theo Pod (scratch/sidecar), `hostPath` gắn với node (chỉ cho node-agent) — đều **không đủ** cho stateful app.
- **PV/PVC tách cung–cầu**: PV là tài nguyên lưu trữ cluster-wide, PVC là yêu cầu trong namespace; Pod tham chiếu **PVC**, K8s **bind** vào PV phù hợp.
- **StorageClass + dynamic provisioning**: PVC trỏ StorageClass → provisioner tự tạo PV vừa vặn; `WaitForFirstConsumer` để đúng zone, `allowVolumeExpansion` để nới sau.
- **Access mode** RWO (một node, block) / ROX (nhiều node chỉ đọc) / RWX (nhiều node ghi, cần file storage); **Reclaim policy** Delete vs Retain — Retain cho data quý.
- **CSI** là chuẩn cắm driver lưu trữ không sửa core, mở khoá snapshot/clone/expansion.
- **StatefulSet + volumeClaimTemplate**: mỗi Pod một PVC riêng, ổn định theo ordinal, giữ qua reschedule — nền tảng cho database trên K8s.

> **Bài tiếp theo (Bài 11):** đưa cấu hình và bí mật vào Pod đúng cách — **ConfigMap & Secret**: tách config khỏi image, tiêm qua env/volume, và vì sao Secret cần được đối xử khác file config thường.
