# Bài 11 — Scheduling & Autoscaling: requests/limits, affinity, HPA

## 1. Mục tiêu
Sau bài này bạn có thể:
- Phân biệt rạch ròi **requests** (đảm bảo, dùng để schedule) và **limits** (trần cứng), và hiểu **vượt CPU bị throttle** còn **vượt memory bị OOMKill**.
- Đọc được **QoS class** (Guaranteed / Burstable / BestEffort) của Pod và biết nó quyết định **thứ tự bị evict** khi node cạn tài nguyên.
- Điều khiển **scheduler**: `nodeSelector`, **node affinity/anti-affinity**, **pod affinity/anti-affinity** (spread), **taints & tolerations** (node dành riêng).
- Chọn đúng công cụ **autoscaling**: **HPA** (scale số pod), **VPA** (chỉnh request), **Cluster Autoscaler** (thêm/bớt node) — và biết chúng phối hợp thế nào.

---

## 2. Lý thuyết

### 2.1 Requests vs Limits — hai con số, hai vai trò khác nhau

Hãy tưởng tượng bạn **đặt bàn nhà hàng**. **Request** là số ghế bạn *đặt trước* — nhà hàng **giữ chắc** cho bạn, và dùng con số này để tính "còn chỗ cho khách khác không". **Limit** là *sức chứa tối đa* của khu vực bạn ngồi — bạn có thể kê thêm ghế phụ khi đông, nhưng không được vượt trần.

Trong Kubernetes, mỗi container khai báo hai con số cho mỗi tài nguyên (CPU, memory):

```yaml
resources:
  requests:            # ĐẢM BẢO — scheduler dùng để đặt Pod
    cpu: "250m"        # 250 milicore = 0.25 core
    memory: "256Mi"
  limits:              # TRẦN — runtime ép buộc
    cpu: "500m"
    memory: "512Mi"
```

Hai con số này phục vụ **hai giai đoạn khác nhau**:

| | requests | limits |
|--|----------|--------|
| Ai dùng | **kube-scheduler** (lúc đặt Pod) | **kubelet + cgroup** (lúc chạy) |
| Ý nghĩa | Tối thiểu được **bảo đảm** | Tối đa được phép **tiêu thụ** |
| Ảnh hưởng | Chọn node đủ chỗ; tính "node đầy chưa" | Cắt/giết khi Pod vượt trần |
| Bỏ trống thì | Coi như 0 → dễ nhồi quá tải | Không trần → 1 Pod có thể ăn hết node |

**Điểm mấu chốt:** scheduler **chỉ nhìn requests**, không nhìn mức dùng thực. Một node 4 core được xem là "đầy CPU" khi **tổng requests** của các Pod = 4 core, dù thực tế chúng chỉ dùng 10%. Đặt request quá cao → lãng phí, ít Pod xếp được. Đặt quá thấp → node bị **oversubscribe**, các Pod tranh nhau lúc cao điểm.

### 2.2 Vượt trần: CPU bị throttle, Memory bị OOMKill

Đây là điểm **nhiều người hiểu sai** và gây incident thật. CPU và memory bị ép trần theo hai cơ chế **hoàn toàn khác nhau**, vì bản chất tài nguyên khác nhau:

- **CPU là tài nguyên *nén được* (compressible).** Vượt limit → cgroup **throttle**: kernel không cấp thêm slice CPU trong chu kỳ đó, tiến trình bị *làm chậm* nhưng **không chết**. Hậu quả: latency tăng vọt (p99 xấu) mà log không báo lỗi gì — rất khó chẩn đoán.
- **Memory là tài nguyên *không nén được* (incompressible).** Đã cấp byte thì không "đòi lại" nhẹ nhàng được. Vượt memory limit → kernel **OOMKiller giết** container ngay (exit code **137** = 128 + tín hiệu SIGKILL 9). Pod restart, bạn thấy `OOMKilled` trong `kubectl describe`.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="lim-t lim-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="lim-t">CPU vượt limit bị throttle, Memory vượt limit bị OOMKill</title>
<desc id="lim-d">So sánh hai cơ chế: CPU nén được nên chỉ bị làm chậm, Memory không nén được nên container bị giết</desc>
<rect x="30" y="30" width="280" height="190" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="170" y="55" text-anchor="middle" font-size="13" fill="currentColor">CPU — nén được</text>
<line x1="60" y1="150" x2="280" y2="150" stroke="currentColor" stroke-width="1"/>
<line x1="60" y1="80" x2="280" y2="80" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="170" y="74" text-anchor="middle" font-size="10" fill="currentColor">limit</text>
<path d="M60,140 L100,140 L100,80 L150,80 L150,80 L200,80 L200,120 L250,120 L280,120" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="170" y="180" text-anchor="middle" font-size="11" fill="currentColor">Chạm trần → THROTTLE</text>
<text x="170" y="198" text-anchor="middle" font-size="11" fill="currentColor">chậm lại, KHÔNG chết</text>
<rect x="350" y="30" width="280" height="190" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="490" y="55" text-anchor="middle" font-size="13" fill="currentColor">Memory — không nén được</text>
<line x1="380" y1="160" x2="600" y2="160" stroke="currentColor" stroke-width="1"/>
<line x1="380" y1="90" x2="600" y2="90" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="490" y="84" text-anchor="middle" font-size="10" fill="currentColor">limit</text>
<path d="M380,160 L420,150 L460,130 L500,105 L525,92" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="530" y="88" text-anchor="middle" font-size="16" fill="currentColor">✕</text>
<text x="490" y="188" text-anchor="middle" font-size="11" fill="currentColor">Chạm trần → OOMKilled</text>
<text x="490" y="206" text-anchor="middle" font-size="11" fill="currentColor">giết ngay, exit 137</text>
</svg>

Hệ quả thực tế khi đặt sai:
- **Memory limit quá thấp** cho một JVM/Node app → app chạy vài phút rồi `OOMKilled` lặp lại → `CrashLoopBackOff`. Cách chữa: đo mức memory thực (RSS) lúc tải đỉnh rồi đặt limit có biên an toàn.
- **CPU limit quá thấp** cho service latency-sensitive → throttle âm thầm, p99 nhảy từ 20ms lên 300ms mà không lỗi. Nhiều team **bỏ CPU limit** (chỉ đặt request) cho các service như vậy để tránh throttle, chấp nhận Pod có thể "mượn" CPU rảnh của node.

> Quy tắc thực chiến: **memory** thường đặt `requests = limits` (không nén được, muốn chắc chắn). **CPU** thường đặt `request` đủ dùng, còn `limit` cao hơn hoặc bỏ hẳn để tận dụng CPU nhàn rỗi.

### 2.3 QoS class — ai bị hy sinh trước khi node ngộp

Khi một node **cạn memory thật** (không chỉ 1 Pod vượt limit, mà cả node hết RAM), kubelet phải **evict** (đuổi) bớt Pod để cứu node. Nó chọn nạn nhân theo **QoS class** — một nhãn Kubernetes **tự suy ra** từ cách bạn đặt requests/limits:

| QoS class | Điều kiện | Bị evict |
|-----------|-----------|----------|
| **Guaranteed** | Mọi container có requests **=** limits cho **cả** CPU lẫn memory | **Cuối cùng** — được ưu ái nhất |
| **Burstable** | Có ít nhất 1 request nhưng **không** thoả điều kiện Guaranteed | Ở giữa; ưu tiên giết Pod vượt request nhiều nhất |
| **BestEffort** | **Không** đặt request/limit nào | **Đầu tiên** — hy sinh trước |

<svg viewBox="0 0 560 210" role="img" aria-labelledby="qos-t qos-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="qos-t">Thứ tự evict theo QoS class</title>
<desc id="qos-d">Khi node cạn memory, BestEffort bị đuổi trước, rồi Burstable, Guaranteed được giữ lâu nhất</desc>
<rect x="40" y="40" width="150" height="130" rx="10" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="66" text-anchor="middle" font-size="12" fill="currentColor">BestEffort</text>
<text x="115" y="90" text-anchor="middle" font-size="10" fill="currentColor">không request</text>
<text x="115" y="140" text-anchor="middle" font-size="11" fill="currentColor">đuổi #1</text>
<rect x="205" y="40" width="150" height="130" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="280" y="66" text-anchor="middle" font-size="12" fill="currentColor">Burstable</text>
<text x="280" y="90" text-anchor="middle" font-size="10" fill="currentColor">request &lt; limit</text>
<text x="280" y="140" text-anchor="middle" font-size="11" fill="currentColor">đuổi #2</text>
<rect x="370" y="40" width="150" height="130" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="445" y="66" text-anchor="middle" font-size="12" fill="currentColor">Guaranteed</text>
<text x="445" y="90" text-anchor="middle" font-size="10" fill="currentColor">request = limit</text>
<text x="445" y="140" text-anchor="middle" font-size="11" fill="currentColor">giữ lâu nhất</text>
<line x1="40" y1="190" x2="520" y2="190" stroke="currentColor" stroke-width="1.3" marker-end="url(#qar)"/>
<text x="280" y="205" text-anchor="middle" font-size="10" fill="currentColor">node càng ngộp → càng đuổi sang phải</text>
<defs><marker id="qar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Vì thế các workload **quan trọng** (database, payment) nên đặt để đạt **Guaranteed**; các job phụ, batch có thể để **Burstable/BestEffort** để chúng "nhường ghế" khi cần. Đây là công cụ quản lý rủi ro rất mạnh mà nhiều người bỏ qua.

### 2.4 Scheduler quyết định thế nào — và cách bạn can thiệp

`kube-scheduler` chọn node cho mỗi Pod chưa gán qua hai pha: **Filter** (loại các node không đủ điều kiện: thiếu request, không hợp affinity, không tolerate taint) rồi **Score** (chấm điểm các node còn lại, chọn cao nhất). Bạn có nhiều "cần gạt" để lái quyết định này.

**a) `nodeSelector` — ràng buộc cứng, đơn giản nhất.** Pod chỉ chạy trên node có đúng label:

```yaml
spec:
  nodeSelector:
    disktype: ssd          # chỉ node gắn label disktype=ssd
```

**b) Node affinity — biểu cảm hơn `nodeSelector`**, có cả cứng (`required`) và mềm (`preferred`):

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:   # BẮT BUỘC
        nodeSelectorTerms:
        - matchExpressions:
          - key: topology.kubernetes.io/zone
            operator: In
            values: ["ap-southeast-1a", "ap-southeast-1b"]
      preferredDuringSchedulingIgnoredDuringExecution:  # ƯU TIÊN (mềm)
      - weight: 100
        preference:
          matchExpressions:
          - key: node.kubernetes.io/instance-type
            operator: In
            values: ["m5.xlarge"]
```

Lưu ý `IgnoredDuringExecution`: ràng buộc chỉ áp dụng **lúc schedule**; nếu node đổi label sau đó, Pod đang chạy **không** bị đuổi.

**c) Pod affinity / anti-affinity — đặt Pod *theo Pod khác*, không phải theo node.** Đây là công cụ chính để **spread** (rải) và **colocate** (gom):

```yaml
spec:
  affinity:
    podAntiAffinity:        # SPREAD: đừng để 2 replica cùng 1 node
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: web
        topologyKey: kubernetes.io/hostname   # "cùng node" = cùng hostname
    podAffinity:            # COLOCATE: xếp cạnh cache để giảm latency
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 80
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: redis
          topologyKey: kubernetes.io/hostname
```

`topologyKey` là chìa khoá: `kubernetes.io/hostname` nghĩa là "cùng node", còn `topology.kubernetes.io/zone` nghĩa là "cùng AZ". Dùng anti-affinity với `topologyKey=zone` để rải replica **qua nhiều vùng khả dụng** → chịu được cả khi mất một AZ.

> Với nhu cầu rải đều phổ biến, `topologySpreadConstraints` (thế hệ mới, có `maxSkew`) thường gọn và mượt hơn pod anti-affinity cứng — nhưng ý tưởng "rải theo topologyKey" thì giống nhau.

**d) Taints & tolerations — node *đẩy* Pod ra, trừ khi Pod có "giấy phép".** Ngược logic với affinity: affinity là Pod *hút* về node; taint là node *đẩy* Pod đi.

```bash
# Đánh taint lên node: chỉ Pod nào "chịu được" mới lên được
kubectl taint nodes gpu-node-1 dedicated=gpu:NoSchedule
```

```yaml
# Pod cần chạy trên node GPU phải khai toleration khớp
spec:
  tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "gpu"
    effect: "NoSchedule"
```

Ba `effect` cần nhớ: **`NoSchedule`** (không xếp Pod mới không tolerate), **`PreferNoSchedule`** (cố tránh, mềm), **`NoExecute`** (đuổi cả Pod *đang chạy* không tolerate — chính là cơ chế node "not-ready" tự đuổi Pod sau `tolerationSeconds`). Cặp taint+toleration là cách chuẩn để **dành riêng** node (GPU, node licence đắt) cho đúng loại workload.

### 2.5 Autoscaling — ba trục độc lập

Khi tải thay đổi, có **ba** thứ có thể co giãn, và chúng giải quyết ba câu hỏi khác nhau. Đừng lẫn lộn:

<svg viewBox="0 0 680 230" role="img" aria-labelledby="as-t as-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="as-t">Ba loại autoscaler và trục chúng điều chỉnh</title>
<desc id="as-d">HPA tăng số pod theo chiều ngang, VPA tăng request từng pod theo chiều dọc, Cluster Autoscaler thêm node</desc>
<rect x="30" y="30" width="200" height="170" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="130" y="54" text-anchor="middle" font-size="12" fill="currentColor">HPA — ngang</text>
<rect x="55" y="120" width="30" height="40" rx="4" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor"/>
<rect x="95" y="120" width="30" height="40" rx="4" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor"/>
<rect x="135" y="120" width="30" height="40" rx="4" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor"/>
<rect x="175" y="120" width="30" height="40" rx="4" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor" stroke-dasharray="3 2"/>
<text x="130" y="185" text-anchor="middle" font-size="10" fill="currentColor">thêm số POD</text>
<rect x="245" y="30" width="200" height="170" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="54" text-anchor="middle" font-size="12" fill="currentColor">VPA — dọc</text>
<rect x="315" y="130" width="60" height="30" rx="4" fill="#10b981" fill-opacity="0.2" stroke="currentColor"/>
<rect x="315" y="90" width="60" height="70" rx="4" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-dasharray="3 2"/>
<text x="345" y="185" text-anchor="middle" font-size="10" fill="currentColor">tăng REQUEST/pod</text>
<rect x="460" y="30" width="200" height="170" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="54" text-anchor="middle" font-size="12" fill="currentColor">Cluster Autoscaler</text>
<rect x="485" y="110" width="70" height="50" rx="6" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor"/>
<rect x="565" y="110" width="70" height="50" rx="6" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor" stroke-dasharray="3 2"/>
<text x="560" y="185" text-anchor="middle" font-size="10" fill="currentColor">thêm NODE (máy)</text>
</svg>

| | Điều chỉnh | Trả lời câu hỏi | Đơn vị |
|--|-----------|-----------------|--------|
| **HPA** | Số **replica** của Deployment | "Cần bao nhiêu *bản* để chịu tải?" | pod |
| **VPA** | **requests/limits** của từng Pod | "Mỗi bản cần bao nhiêu *tài nguyên*?" | CPU/mem |
| **Cluster Autoscaler** | Số **node** trong cluster | "Có đủ *máy* để chứa các pod không?" | node (VM) |

Chúng phối hợp: HPA tạo thêm pod → nếu không node nào đủ request để chứa, pod ở trạng thái `Pending` → **Cluster Autoscaler** thấy pod Pending không xếp được → gọi cloud provider **thêm node** → pod được schedule. Khi tải giảm, HPA bớt pod, CA gom tải rồi **xoá node rỗng** để tiết kiệm tiền.

### 2.6 HPA — cấu hình chi tiết

HPA là loại dùng nhiều nhất. Nó là một control loop chạy mỗi ~15s: đọc metric hiện tại, so với target, rồi tính số replica mong muốn theo công thức:

```
desiredReplicas = ceil( currentReplicas × ( currentMetric / targetMetric ) )
```

Ví dụ đang 4 pod, CPU trung bình 90%, target 50% → `ceil(4 × 90/50) = ceil(7.2) = 8` pod. **Quan trọng:** HPA đo *utilization* theo **% của request** — nên HPA **phụ thuộc vào việc bạn đặt request đúng**. Request sai → HPA scale sai. (Đây là lý do requests/limits ở đầu bài và HPA gắn chặt nhau.)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource            # metric tài nguyên có sẵn (cần metrics-server)
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60   # giữ CPU trung bình quanh 60% của request
  - type: Pods                # custom metric: ví dụ số request/giây mỗi pod
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:                   # chống "giật cục" (flapping)
    scaleUp:
      stabilizationWindowSeconds: 0     # scale lên nhanh
      policies:
      - type: Percent
        value: 100            # tối đa gấp đôi mỗi 15s
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300   # scale xuống thận trọng, chờ 5 phút
      policies:
      - type: Pods
        value: 1              # mỗi lần chỉ bớt 1 pod
        periodSeconds: 60
```

Vài điểm tinh:
- HPA có thể dùng **nhiều metric** cùng lúc → nó tính desired cho từng metric rồi **lấy giá trị lớn nhất** (an toàn: đủ cho mọi ràng buộc).
- Cần **metrics-server** cho metric CPU/mem; cần adapter (Prometheus Adapter, KEDA) cho **custom/external metric** như độ dài queue, số message Kafka.
- `behavior` bất đối xứng là best practice: **lên nhanh** (chịu spike ngay) nhưng **xuống chậm** (tránh scale xuống rồi tải lại tăng, gây flapping tốn tài nguyên).
- **KEDA** mở rộng HPA để scale theo event (queue rỗng → scale về **0**), thứ HPA gốc không làm được.

Kiểm tra nhanh khi vận hành:

```bash
kubectl get hpa web-hpa                 # xem TARGETS: 72%/60%, REPLICAS 3->8
kubectl describe hpa web-hpa            # xem lý do & sự kiện scale
kubectl top pods -l app=web             # mức dùng thực (cần metrics-server)
```

### 2.7 VPA & Cluster Autoscaler — bổ trợ

**VPA (Vertical Pod Autoscaler)** quan sát mức dùng lịch sử rồi **đề xuất/áp** request hợp lý — cực hữu ích khi bạn *không biết* nên đặt request bao nhiêu. Chế độ:
- `Off`: chỉ khuyến nghị (bạn xem rồi tự chỉnh) — an toàn nhất để bắt đầu.
- `Auto`/`Recreate`: tự cập nhật request, nhưng phải **restart Pod** (request là bất biến khi Pod đang chạy — cho tới in-place resize còn mới). Vì vậy VPA hợp workload chịu được restart.
- ⚠️ **Không dùng VPA và HPA cùng trên một metric (CPU/mem)** — chúng "đánh nhau". Mẫu an toàn: HPA theo custom metric (RPS) + VPA chỉnh CPU/mem.

**Cluster Autoscaler (CA)** điều chỉnh **số node**. Nó nhìn hai tín hiệu: (1) có pod `Pending` vì không node nào đủ chỗ → **scale up** (thêm node vào node group / ASG); (2) node dùng thấp và mọi pod trên đó dời được đi nơi khác → **scale down** (drain rồi xoá) để cắt chi phí. CA tôn trọng `PodDisruptionBudget` để không đuổi quá nhiều bản cùng lúc. Trên cloud hiện đại, **Karpenter** (AWS) là biến thể mạnh hơn: chọn *đúng loại/kích cỡ* instance theo nhu cầu pod thay vì bó buộc vào node group cố định.

---

## 3. Tóm tắt
- **requests** = phần **đảm bảo**, là con số **duy nhất scheduler nhìn** để đặt Pod; **limits** = **trần cứng** do runtime ép. Đặt sai request → node oversubscribe hoặc lãng phí; HPA cũng scale sai.
- Vượt trần khác nhau theo bản chất tài nguyên: **CPU → throttle** (chậm, không chết); **memory → OOMKill** (chết ngay, exit 137). Memory thường đặt `request = limit`; CPU thường nới hoặc bỏ limit.
- **QoS class** (Guaranteed / Burstable / BestEffort) suy ra từ requests/limits và quyết định **thứ tự bị evict** khi node cạn RAM — dùng nó để bảo vệ workload trọng yếu.
- Lái **scheduler** bằng: `nodeSelector` (cứng, đơn giản), **node affinity** (biểu cảm, cứng+mềm), **pod (anti-)affinity** + `topologyKey` để **spread/colocate**, và **taints + tolerations** để **dành riêng** node.
- Ba trục **autoscaling**: **HPA** (số pod, theo CPU/custom metric, công thức tỷ lệ, `behavior` chống flapping), **VPA** (chỉnh request/pod — đừng chồng lên HPA cùng metric), **Cluster Autoscaler/Karpenter** (số node). Chúng nối chuỗi: HPA → pod Pending → CA thêm node.

> **Bài tiếp theo (Bài 12):** đảm bảo sức khoẻ workload — **probes** (liveness/readiness/startup), rolling update an toàn, `PodDisruptionBudget` và graceful shutdown để không rớt request khi scale/upgrade.
