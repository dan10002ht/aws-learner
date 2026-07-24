# Bài 13 — Observability & troubleshooting cluster thực chiến

## 1. Mục tiêu
Sau bài này bạn có thể:
- Dùng thành thạo **bộ công cụ chẩn đoán**: `kubectl get/describe`, `logs`, `exec`, `debug`, `top` — biết mỗi lệnh soi được gì.
- Đọc **Events** trong `describe` — nơi Kubernetes "kể" chuyện gì đang xảy ra với Pod.
- Nhận diện và **sửa các lỗi kinh điển**: `CrashLoopBackOff`, `ImagePullBackOff`, `OOMKilled`, `Pending`, `Evicted`, readiness probe fail.
- Hiểu vì sao **logs `-p` (previous)** là vũ khí số một khi Pod cứ restart.
- Nắm vai trò của **Prometheus + Grafana** trong observability lâu dài (metrics/alert), khác gì với debug tức thời.

---

## 2. Lý thuyết

### 2.1 Ba trụ cột và "vòng chẩn đoán"

Khi một Pod "không chạy", bạn không đoán — bạn **hỏi cluster**. Ví như bác sĩ khám bệnh: đo dấu hiệu sinh tồn (`get`), khám lâm sàng + hỏi bệnh sử (`describe` → Events), rồi nghe tim phổi (`logs`). Ba nguồn thông tin cốt lõi:

- **State** — Pod đang ở phase/trạng thái nào? → `kubectl get`, `describe`.
- **Events** — Kubernetes đã *cố làm gì* và *thất bại ra sao*? → phần Events của `describe`.
- **Logs** — app *tự nói gì* trước khi chết? → `kubectl logs` (nhất là `-p`).

Ba trụ cột observability kinh điển là **metrics** (con số theo thời gian: CPU, RAM, request/s), **logs** (dòng sự kiện text), và **traces** (đường đi một request qua nhiều service). Debug tức thời chủ yếu dùng logs + state; giám sát dài hạn dùng metrics (Prometheus/Grafana).

<svg viewBox="0 0 660 210" role="img" aria-labelledby="dx-t dx-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="dx-t">Vòng chẩn đoán một Pod hỏng</title>
<desc id="dx-d">Từ get sang describe xem Events sang logs, nếu cần thì exec hoặc debug vào bên trong</desc>
<rect x="20" y="80" width="120" height="48" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="100" text-anchor="middle" font-size="12" fill="currentColor">get</text>
<text x="80" y="117" text-anchor="middle" font-size="10" fill="currentColor">phase là gì?</text>
<rect x="180" y="80" width="130" height="48" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="245" y="100" text-anchor="middle" font-size="12" fill="currentColor">describe</text>
<text x="245" y="117" text-anchor="middle" font-size="10" fill="currentColor">Events kể gì?</text>
<rect x="350" y="80" width="130" height="48" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="415" y="100" text-anchor="middle" font-size="12" fill="currentColor">logs -p</text>
<text x="415" y="117" text-anchor="middle" font-size="10" fill="currentColor">app nói gì?</text>
<rect x="520" y="80" width="120" height="48" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="100" text-anchor="middle" font-size="12" fill="currentColor">exec/debug</text>
<text x="580" y="117" text-anchor="middle" font-size="10" fill="currentColor">soi bên trong</text>
<line x1="140" y1="104" x2="178" y2="104" stroke="currentColor" stroke-width="1.3" marker-end="url(#dax)"/>
<line x1="310" y1="104" x2="348" y2="104" stroke="currentColor" stroke-width="1.3" marker-end="url(#dax)"/>
<line x1="480" y1="104" x2="518" y2="104" stroke="currentColor" stroke-width="1.3" marker-end="url(#dax)"/>
<text x="330" y="170" text-anchor="middle" font-size="11" fill="currentColor">80% ca sửa được ngay ở describe + logs — hiếm khi phải exec.</text>
<defs><marker id="dax" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.2 `kubectl get` — dấu hiệu sinh tồn

Bắt đầu bằng cái nhìn tổng quan. Cột `STATUS` và `RESTARTS` là hai thứ cần liếc đầu tiên.

```bash
# Liệt kê Pod + node đang chạy, IP, số lần restart
kubectl get pods -o wide

# Theo dõi trực tiếp (watch) khi đang rollout / debug
kubectl get pods -w

# Xem mọi namespace, sắp theo thời gian tạo
kubectl get pods -A --sort-by=.metadata.creationTimestamp

# Dump toàn bộ manifest thực tế (đã được K8s điền default)
kubectl get pod web-xyz -o yaml
```

`RESTARTS` cao (và tăng dần) là dấu hiệu kinh điển của `CrashLoopBackOff`. `STATUS` cho biết ngay lỗi thuộc nhóm nào: `Pending`, `ImagePullBackOff`, `CrashLoopBackOff`, `OOMKilled`, `Evicted`...

### 2.3 `kubectl describe` — đọc **Events** (quan trọng nhất!)

Nếu chỉ được dùng **một** lệnh để debug, đó là `describe`. Phần **Events** ở cuối kể lại chuỗi hành động scheduler/kubelet đã làm: kéo image, gắn volume, chạy probe, và **lý do thất bại**.

```bash
kubectl describe pod web-xyz
```

Đọc từ dưới lên (Events mới nhất ở dưới). Vài dòng Events điển hình và ý nghĩa:

| Event message | Nghĩa là |
|---------------|----------|
| `Failed to pull image "...": not found` | Sai tên image/tag → ImagePullBackOff |
| `Back-off restarting failed container` | Container chạy rồi chết ngay → CrashLoopBackOff |
| `0/3 nodes are available: Insufficient cpu` | Không node nào đủ CPU → Pending |
| `Readiness probe failed: HTTP 500` | Probe fail → Pod chạy nhưng không nhận traffic |
| `The node was low on resource: memory` | Node hết RAM → Pod bị Evicted |

Ngoài Events, `describe` còn cho biết `Last State: Terminated, Reason: OOMKilled, Exit Code: 137` — bằng chứng vàng cho lỗi tràn memory.

```bash
# Xem Events toàn namespace theo thời gian (nhìn bức tranh lớn)
kubectl get events --sort-by=.lastTimestamp
```

### 2.4 `kubectl logs` — nghe app tự nói

```bash
kubectl logs web-xyz                 # log container hiện tại
kubectl logs web-xyz -f              # -f = follow (stream realtime)
kubectl logs web-xyz -p              # -p = PREVIOUS: log của container ĐÃ CHẾT
kubectl logs web-xyz -c sidecar      # chọn container trong Pod nhiều container
kubectl logs web-xyz --since=10m --tail=100
kubectl logs -l app=web --all-containers   # gộp log theo label (nhiều Pod)
```

⚠️ **`-p` (previous) là chìa khoá của CrashLoopBackOff.** Khi container crash, kubelet giết nó và tạo container **mới**. `kubectl logs` mặc định soi container *mới* (chưa kịp lỗi hoặc đang chờ restart) → thường **rỗng**. Log lý do chết nằm ở container *trước đó* → phải `-p`.

### 2.5 `exec`, `debug`, `top`

```bash
# Chui vào container đang chạy để soi filesystem, env, network
kubectl exec -it web-xyz -- sh
kubectl exec web-xyz -- env         # xem biến môi trường thực tế
kubectl exec web-xyz -- cat /etc/config/app.conf

# Ephemeral debug container: cho image distroless/scratch KHÔNG có shell
kubectl debug -it web-xyz --image=busybox --target=web -- sh

# Nhân bản Pod lỗi thành 1 Pod debug (đổi command sang sleep để không crash)
kubectl debug web-xyz -it --copy-to=web-dbg --container=web -- sh

# Metrics tài nguyên (CẦN metrics-server cài trong cluster)
kubectl top pods
kubectl top nodes
kubectl top pod web-xyz --containers
```

`kubectl debug` với **ephemeral container** là cứu tinh khi image production tối giản (distroless, `FROM scratch`) — không có `sh`, `curl`, `ps`. Nó gắn thêm một container tạm *dùng chung network + process namespace* với container đích (`--target`) mà không phải rebuild image.

`kubectl top` cần **metrics-server** — cùng nguồn dữ liệu mà Horizontal Pod Autoscaler dùng. Không có nó, `top` báo `Metrics API not available`.

---

## 3. Lỗi kinh điển: triệu chứng → nguyên nhân → cách sửa

Đây là "sổ tay cấp cứu". Học thuộc bảng này bạn xử lý được ~90% ca thường gặp.

| STATUS / triệu chứng | Nguyên nhân gốc thường gặp | Lệnh soi | Cách sửa |
|----------------------|----------------------------|----------|----------|
| **CrashLoopBackOff** | App khởi động rồi crash (config sai, thiếu env/secret, migration lỗi, exception lúc boot) | `logs -p` | Sửa lỗi app/config; kiểm tra env, DB connection, file config mount |
| **ImagePullBackOff / ErrImagePull** | Sai tên/tag image; registry private thiếu credential; typo | `describe` (Events) | Sửa tên image; tạo `imagePullSecrets`; kiểm tra registry sống |
| **OOMKilled** (Exit 137) | Dùng RAM vượt `memory limit` → kernel giết | `describe` (Last State) | Tăng `limits.memory`; sửa memory leak; giảm heap/cache |
| **Pending** | Không node đủ CPU/RAM; không match nodeSelector/taint; PVC chưa bound | `describe` (Events) | Thêm node/giảm request; sửa affinity/toleration; sửa StorageClass |
| **Evicted** | Node hết tài nguyên (memory/disk pressure) → kubelet đuổi Pod | `describe node` | Đặt request hợp lý; dọn disk; thêm capacity; đặt priorityClass |
| **Running nhưng không nhận traffic** | Readiness probe fail → Pod bị gỡ khỏi Endpoints của Service | `describe` (Events) | Sửa probe path/port/timeout; đảm bảo app thật sự sẵn sàng |
| **Completed rồi restart** (Job/lệnh) | Command kết thúc, nhưng `restartPolicy: Always` | `logs` | Dùng Job/CronJob; hoặc để process chạy foreground |
| **CreateContainerConfigError** | ConfigMap/Secret tham chiếu không tồn tại | `describe` (Events) | Tạo đúng ConfigMap/Secret; sửa tên key |

### 3.1 CrashLoopBackOff — "chạy rồi chết, lặp mãi"

`BackOff` = kubelet **giãn dần** thời gian chờ giữa các lần restart (10s → 20s → 40s → ... tối đa 5 phút) để tránh nướng CPU. Nó là *triệu chứng*, không phải bệnh — bệnh nằm trong log.

```bash
kubectl get pod web-xyz            # RESTARTS tăng đều, STATUS CrashLoopBackOff
kubectl logs web-xyz -p            # <-- ĐÂY: xem exception/panic lúc boot
kubectl describe pod web-xyz       # Last State: Terminated, Exit Code, Reason
```

Exit code gợi ý: `1` lỗi app chung, `137` = 128+9 → bị SIGKILL (thường OOM), `139` = segfault, `143` = SIGTERM. Nguyên nhân hay gặp: thiếu biến môi trường/secret, không kết nối được DB (mà app fail-fast), migration lỗi, sai đường dẫn config, hoặc **liveness probe quá gắt** giết app đang khởi động chậm → tăng `initialDelaySeconds`/`failureThreshold`.

### 3.2 ImagePullBackOff — kéo image không được

```bash
kubectl describe pod web-xyz | grep -A5 Events
# Failed to pull image "myco/web:v1.2.3": ... not found / unauthorized
```

Ba nguyên nhân: (1) **typo** tên/tag; (2) registry **private** thiếu credential; (3) registry/tag đã bị xoá. Với registry private:

```bash
kubectl create secret docker-registry regcred \
  --docker-server=registry.myco.com \
  --docker-username=ci --docker-password='***' \
  --docker-email=ci@myco.com

# Rồi tham chiếu trong Pod/Deployment spec:
#   spec:
#     imagePullSecrets:
#       - name: regcred
```

Mẹo: đặt `imagePullPolicy: IfNotPresent` cho tag cố định để đỡ kéo lại; nhưng tag `:latest` mặc định `Always` — dễ dính lỗi khi registry chập chờn.

### 3.3 OOMKilled — vượt memory limit

Kernel cgroup theo dõi RSS của container; vượt `limits.memory` → **OOM killer** giết ngay (không cảnh báo), exit code **137**.

```bash
kubectl describe pod web-xyz
#   Last State:  Terminated
#   Reason:      OOMKilled
#   Exit Code:   137
kubectl top pod web-xyz --containers   # xem RAM thực dùng vs limit
```

Sửa: tăng `limits.memory` **và** đặt `requests.memory` sát thực tế; hoặc chữa gốc (leak, cache vô hạn, JVM `-Xmx` chưa set theo container). Đặt request/limit hợp lý còn giúp scheduler bố trí đúng và tránh Evicted.

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"   # vượt mức này -> OOMKilled 137
    cpu: "500m"
```

### 3.4 Pending — không được xếp lịch

Pod ở `Pending` nghĩa là **scheduler chưa tìm được node**. `describe` nói lý do rõ ràng:

```bash
kubectl describe pod web-xyz
# 0/5 nodes are available: 3 Insufficient cpu, 2 node(s) had untolerated taint...
```

Ba nhóm nguyên nhân và hướng sửa:

- **Thiếu tài nguyên**: `Insufficient cpu/memory` → giảm `requests`, thêm node, hoặc bật Cluster Autoscaler.
- **Không match node**: `nodeSelector`/`affinity`/`taint` không khớp → sửa selector hoặc thêm `tolerations`.
- **PVC chưa bound**: Pod chờ volume → `kubectl get pvc`; StorageClass sai/thiếu provisioner thì PVC kẹt `Pending` và Pod kẹt theo.

### 3.5 Evicted & readiness probe fail

**Evicted**: khi node bị **memory/disk pressure**, kubelet đuổi bớt Pod (ưu tiên đuổi Pod `BestEffort`, tức không đặt request/limit). Pod cũ để lại xác `Evicted`, controller tạo Pod mới nơi khác.

```bash
kubectl get pods | grep Evicted
kubectl describe node node-2 | grep -i pressure   # MemoryPressure / DiskPressure
kubectl delete pods --field-selector=status.phase=Failed   # dọn xác Evicted
```

**Readiness probe fail**: Pod vẫn `Running` (không restart) nhưng **cột READY là `0/1`** và Service **ngừng gửi traffic** vì Pod bị gỡ khỏi Endpoints — khác hẳn liveness (fail thì *restart*).

```bash
kubectl get endpoints web-svc      # Pod không sẵn sàng -> biến mất ở đây
kubectl describe pod web-xyz       # Readiness probe failed: ...
```

Sửa: kiểm tra probe trỏ đúng path/port app phục vụ; nới `timeoutSeconds`/`periodSeconds` nếu app phản hồi chậm; đảm bảo endpoint healthcheck thật sự phản ánh "sẵn sàng nhận request".

```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 2
  failureThreshold: 3
```

---

## 4. Observability dài hạn: Prometheus + Grafana

`kubectl` giỏi cho **debug tức thời "ngay bây giờ"**, nhưng không trả lời được "3h sáng qua RAM tăng đột biến từ đâu?" hay "p99 latency có vượt ngưỡng không?". Đó là việc của **metrics theo thời gian**.

<svg viewBox="0 0 660 220" role="img" aria-labelledby="pm-t pm-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="pm-t">Kiến trúc thu thập metrics với Prometheus và Grafana</title>
<desc id="pm-d">Prometheus scrape metrics từ các Pod và node exporter, lưu chuỗi thời gian, Grafana vẽ dashboard, Alertmanager gửi cảnh báo</desc>
<rect x="20" y="30" width="120" height="42" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="50" text-anchor="middle" font-size="11" fill="currentColor">Pod /metrics</text>
<text x="80" y="65" text-anchor="middle" font-size="10" fill="currentColor">(app exporter)</text>
<rect x="20" y="90" width="120" height="42" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="110" text-anchor="middle" font-size="11" fill="currentColor">node-exporter</text>
<text x="80" y="125" text-anchor="middle" font-size="10" fill="currentColor">CPU/RAM/disk</text>
<rect x="20" y="150" width="120" height="42" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="170" text-anchor="middle" font-size="11" fill="currentColor">kube-state</text>
<text x="80" y="185" text-anchor="middle" font-size="10" fill="currentColor">metrics</text>
<rect x="260" y="88" width="140" height="52" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="110" text-anchor="middle" font-size="12" fill="currentColor">Prometheus</text>
<text x="330" y="127" text-anchor="middle" font-size="10" fill="currentColor">scrape + TSDB</text>
<rect x="500" y="40" width="140" height="46" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="62" text-anchor="middle" font-size="12" fill="currentColor">Grafana</text>
<text x="570" y="78" text-anchor="middle" font-size="10" fill="currentColor">dashboard</text>
<rect x="500" y="142" width="140" height="46" rx="9" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="164" text-anchor="middle" font-size="12" fill="currentColor">Alertmanager</text>
<text x="570" y="180" text-anchor="middle" font-size="10" fill="currentColor">Slack/PagerDuty</text>
<line x1="140" y1="51" x2="258" y2="105" stroke="currentColor" stroke-width="1.2" marker-end="url(#pmx)"/>
<line x1="140" y1="111" x2="258" y2="113" stroke="currentColor" stroke-width="1.2" marker-end="url(#pmx)"/>
<line x1="140" y1="171" x2="258" y2="122" stroke="currentColor" stroke-width="1.2" marker-end="url(#pmx)"/>
<line x1="400" y1="105" x2="498" y2="70" stroke="currentColor" stroke-width="1.2" marker-end="url(#pmx)"/>
<line x1="400" y1="120" x2="498" y2="160" stroke="currentColor" stroke-width="1.2" marker-end="url(#pmx)"/>
<text x="200" y="205" text-anchor="middle" font-size="10" fill="currentColor">Prometheus PULL (scrape) chứ không đợi app push.</text>
<defs><marker id="pmx" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

**Cách hoạt động** — Prometheus theo mô hình **pull**: định kỳ *scrape* endpoint `/metrics` (định dạng text) của mỗi target, lưu vào TSDB dạng chuỗi thời gian có label. Trong K8s, các thành phần chuẩn:

- **node-exporter**: metrics phần cứng của node (CPU, RAM, disk, network).
- **kube-state-metrics**: trạng thái object K8s (số Pod theo phase, replica desired/ready...).
- **app exporter**: app tự expose `/metrics` (thư viện client Prometheus).
- **Grafana**: vẽ dashboard, truy vấn bằng **PromQL**; **Alertmanager**: gửi cảnh báo.

Cách nhanh nhất để dựng cả bộ là **kube-prometheus-stack** (Helm):

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kps prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Mở Grafana cục bộ
kubectl -n monitoring port-forward svc/kps-grafana 3000:80
```

Vài truy vấn **PromQL** hay dùng khi điều tra:

```promql
# RAM working set theo Pod (đối chiếu OOMKilled)
sum(container_memory_working_set_bytes{namespace="prod"}) by (pod)

# CPU cores thực dùng theo Pod (dựng cùng kube_pod_container_resource_limits để ra tỷ lệ so với limit)
sum(rate(container_cpu_usage_seconds_total{namespace="prod"}[5m])) by (pod)

# Số lần container restart trong 1h (bắt CrashLoopBackOff)
increase(kube_pod_container_status_restarts_total[1h]) > 0

# Pod không Ready
kube_pod_status_ready{condition="true"} == 0
```

Để app được scrape tự động, khai báo `ServiceMonitor` (CRD của Prometheus Operator) hoặc annotation `prometheus.io/scrape: "true"`. Nguyên tắc **golden signals** cần dashboard/alert: **latency, traffic, errors, saturation**.

---

## 5. Tóm tắt
- Debug theo **vòng**: `get` (phase) → `describe` (**Events** — quan trọng nhất) → `logs -p` (app nói gì) → `exec`/`debug` khi cần soi bên trong.
- **`logs -p`** là chìa khoá của **CrashLoopBackOff**: log lý do chết ở container *trước*, không phải container mới.
- Thuộc bảng lỗi kinh điển: **CrashLoopBackOff** (xem logs), **ImagePullBackOff** (sai tên/credential), **OOMKilled** (137, tăng limit/chữa leak), **Pending** (thiếu tài nguyên/không match/PVC chưa bound), **Evicted** (node hết tài nguyên), **readiness fail** (Running nhưng `0/1`, bị gỡ khỏi Endpoints).
- `kubectl top` và HPA cần **metrics-server**; `kubectl debug` (ephemeral container) cứu image distroless không có shell.
- **Prometheus (pull/scrape + TSDB) + Grafana + Alertmanager** lo observability dài hạn — metrics theo thời gian, dashboard, cảnh báo — bổ sung cho `kubectl` vốn chỉ soi hiện tại.

> **Bài tiếp theo (Bài 14):** đóng gói & phân phối ứng dụng với **Helm** — chart, values, template, release, rollback — để không còn copy-paste hàng chục file YAML mỗi môi trường.
