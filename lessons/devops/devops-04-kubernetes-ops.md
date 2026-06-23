# Kubernetes vận hành

Ở bài trước bạn đã dựng được Pod, Deployment, Service. Bài này nói về **vận hành thật** — cấu hình tách khỏi code, để traffic vào cluster, giữ Pod sống đúng nghĩa, chia tài nguyên công bằng, tự co giãn, deploy không downtime và debug khi mọi thứ cháy. Đây là phần phân biệt người "biết YAML" với người "trực on-call".

## ConfigMap & Secret — tách cấu hình khỏi image

Nguyên tắc 12-factor: image bất biến, cấu hình bơm vào lúc runtime. Đừng bao giờ build URL database hay password vào image.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: "info"
  FEATURE_FLAGS: "checkout_v2,new_search"
  app.properties: |
    pool.size=20
    timeout.ms=3000
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:                 # stringData: plaintext, k8s tự base64; data: phải tự base64
  DB_PASSWORD: "s3cr3t-from-vault"
  API_KEY: "ak_live_xxx"
```

Tiêu thụ trong Pod theo hai cách — env var hoặc volume mount:

```yaml
spec:
  containers:
    - name: app
      image: myapp:1.4.2
      envFrom:
        - configMapRef: { name: app-config }   # nạp toàn bộ key thành env
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef: { name: app-secrets, key: DB_PASSWORD }
      volumeMounts:
        - name: cfg
          mountPath: /etc/app          # mount file app.properties vào đây
          readOnly: true
  volumes:
    - name: cfg
      configMap: { name: app-config }
```

> 💡 **Ghi nhớ**: Env var được nạp **một lần lúc Pod khởi động** — sửa ConfigMap không tự reload env. Mount dạng volume thì file **được cập nhật** (trễ ~60s do kubelet sync cache), nhưng app phải tự đọc lại file. Muốn rolling khi config đổi: thêm checksum config vào annotation của Pod template để Deployment thấy "thay đổi" và rollout.

> ⚠️ **Bẫy production**: `Secret` mặc định chỉ là **base64, KHÔNG mã hoá** — ai đọc được etcd hoặc có quyền `get secret` là thấy plaintext. Bật `EncryptionConfiguration` ở etcd, dùng RBAC chặt, và cân nhắc External Secrets Operator kéo từ Vault/AWS Secrets Manager. Đừng commit Secret vào Git.

## Ingress & Ingress Controller

`Service type=LoadBalancer` tạo một LB cho mỗi service — tốn kém và không route theo path/host. **Ingress** là lớp L7 routing dùng chung một entrypoint.

Quan trọng: **Ingress object chỉ là cấu hình, vô dụng nếu không có Ingress Controller** (ingress-nginx, Traefik, hoặc AWS Load Balancer Controller) đang chạy để đọc và thực thi nó.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh: một LoadBalancer mỗi Service vs Ingress L7 dùng chung một entrypoint</title>
  <desc>Bên trái: mỗi Service có một LoadBalancer riêng nên nhiều LB tốn kém. Bên phải: một Ingress Controller (ALB) làm entrypoint duy nhất, route theo host/path — /api tới api-svc, / tới web-svc.</desc>
  <text x="180" y="24" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Service type=LoadBalancer</text>
  <text x="180" y="42" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">1 LB / mỗi service — tốn kém, không route L7</text>
  <line x1="360" y1="16" x2="360" y2="344" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 4"/>
  <text x="540" y="24" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Ingress (L7)</text>
  <text x="540" y="42" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">1 entrypoint chung, route theo host/path</text>
  <g font-size="11.5">
    <rect x="36" y="60" width="120" height="34" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="96" y="81" text-anchor="middle" fill="currentColor">LB #1</text>
    <rect x="204" y="60" width="120" height="34" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="264" y="81" text-anchor="middle" fill="currentColor">LB #2</text>
    <rect x="36" y="150" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="96" y="166" text-anchor="middle" fill="currentColor">api-svc</text>
    <text x="96" y="182" text-anchor="middle" fill="currentColor" opacity="0.6" font-size="10">Service</text>
    <rect x="204" y="150" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="264" y="166" text-anchor="middle" fill="currentColor">web-svc</text>
    <text x="264" y="182" text-anchor="middle" fill="currentColor" opacity="0.6" font-size="10">Service</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M96 94 V150" marker-end="url(#aH)"/>
    <path d="M264 94 V150" marker-end="url(#aH)"/>
  </g>
  <g font-size="11.5">
    <rect x="450" y="60" width="180" height="40" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="540" y="78" text-anchor="middle" fill="currentColor" font-weight="700">Ingress Controller</text>
    <text x="540" y="93" text-anchor="middle" fill="currentColor" opacity="0.7" font-size="10">ALB / nginx — 1 LB duy nhất</text>
    <rect x="430" y="150" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="490" y="166" text-anchor="middle" fill="currentColor">api-svc</text>
    <text x="490" y="182" text-anchor="middle" fill="currentColor" opacity="0.6" font-size="10">Service</text>
    <rect x="566" y="150" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="626" y="166" text-anchor="middle" fill="currentColor">web-svc</text>
    <text x="626" y="182" text-anchor="middle" fill="currentColor" opacity="0.6" font-size="10">Service</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M512 100 L490 150" marker-end="url(#aH)"/>
    <path d="M568 100 L626 150" marker-end="url(#aH)"/>
  </g>
  <g font-size="10.5" fill="currentColor" opacity="0.85">
    <text x="448" y="128" text-anchor="middle">path /api</text>
    <text x="630" y="128" text-anchor="middle">path /</text>
  </g>
  <text x="540" y="218" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">phân luồng theo host shop.example.com + path</text>
  <defs>
    <marker id="aH" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor" fill-opacity="0.5"/>
    </marker>
  </defs>
</svg>

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx          # trỏ tới controller nào (thay vì annotation cũ kubernetes.io/ingress.class)
  tls:
    - hosts: [shop.example.com]
      secretName: shop-tls
  rules:
    - host: shop.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service: { name: api-svc, port: { number: 80 } }
          - path: /
            pathType: Prefix
            backend:
              service: { name: web-svc, port: { number: 80 } }
```

| | Service LoadBalancer | Ingress | Gateway API |
|---|---|---|---|
| Lớp | L4 | L7 (HTTP/S) | L7, chuẩn mới |
| Route theo host/path | Không | Có | Có, mạnh hơn |
| Số LB | 1 LB / service | 1 LB / nhiều service | 1 / nhiều |
| Trạng thái 2025 | Vẫn dùng cho TCP/UDP | Phổ biến nhất | Đang thay thế Ingress dần |

> 💡 **Ghi nhớ**: Gateway API (`HTTPRoute`, `Gateway`) là hướng tương lai — tách vai trò infra (Gateway) khỏi app (HTTPRoute), hỗ trợ traffic splitting/canary native. Học Ingress để vận hành hệ thống hiện tại, học Gateway API cho hệ thống mới.

## Probes — liveness / readiness / startup

Ba probe trả lời ba câu hỏi khác nhau. Nhầm lẫn chúng là nguyên nhân số 1 gây restart loop và outage.

```yaml
containers:
  - name: app
    readinessProbe:           # "Sẵn sàng nhận traffic chưa?" → fail = gỡ khỏi Service endpoints
      httpGet: { path: /ready, port: 8080 }
      periodSeconds: 5
      failureThreshold: 3
    livenessProbe:            # "Còn sống không?" → fail = KILL & restart container
      httpGet: { path: /healthz, port: 8080 }
      periodSeconds: 10
      failureThreshold: 3
    startupProbe:             # "Khởi động xong chưa?" → chặn liveness/readiness cho tới khi pass
      httpGet: { path: /healthz, port: 8080 }
      failureThreshold: 30
      periodSeconds: 10       # cho phép tối đa 300s để boot, sau đó liveness mới chạy
```

| Probe | Fail thì làm gì | Dùng cho |
|---|---|---|
| readiness | Gỡ Pod khỏi load balancing (không kill) | Chờ DB/cache nóng, hết kết nối |
| liveness | Kill và restart container | Deadlock, treo không tự thoát |
| startup | Hoãn 2 probe kia | App boot chậm (JVM, migrate DB) |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ba probe: startup chặn readiness và liveness, hậu quả khi mỗi probe fail</title>
  <desc>startupProbe chạy trước và hoãn hai probe kia tới khi pass. Sau đó readinessProbe fail thì gỡ Pod khỏi Service endpoints, livenessProbe fail thì kill và restart container.</desc>
  <g font-size="12">
    <rect x="24" y="120" width="150" height="70" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="99" y="150" text-anchor="middle" fill="currentColor" font-weight="700">startupProbe</text>
    <text x="99" y="169" text-anchor="middle" fill="currentColor" opacity="0.7" font-size="10.5">App boot xong chưa?</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M174 145 C230 145 230 100 280 100" marker-end="url(#pH)"/>
    <path d="M174 165 C230 165 230 210 280 210" marker-end="url(#pH)"/>
  </g>
  <text x="208" y="92" font-size="10.5" fill="currentColor" opacity="0.75">pass → mở khoá</text>
  <text x="208" y="248" font-size="10" fill="currentColor" opacity="0.6">(chặn cho tới khi pass)</text>
  <g font-size="12">
    <rect x="280" y="68" width="170" height="64" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="365" y="94" text-anchor="middle" fill="currentColor" font-weight="700">readinessProbe</text>
    <text x="365" y="112" text-anchor="middle" fill="currentColor" opacity="0.7" font-size="10.5">Sẵn sàng nhận traffic?</text>
    <rect x="280" y="178" width="170" height="64" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="365" y="204" text-anchor="middle" fill="currentColor" font-weight="700">livenessProbe</text>
    <text x="365" y="222" text-anchor="middle" fill="currentColor" opacity="0.7" font-size="10.5">Process còn sống?</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M450 100 H560" marker-end="url(#pH)"/>
    <path d="M450 210 H560" marker-end="url(#pH)"/>
  </g>
  <g font-size="11">
    <rect x="560" y="74" width="148" height="52" rx="9" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="634" y="95" text-anchor="middle" fill="currentColor">fail → gỡ khỏi</text>
    <text x="634" y="112" text-anchor="middle" fill="currentColor">Service endpoints</text>
    <rect x="560" y="184" width="148" height="52" rx="9" fill="#8b5cf6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="634" y="205" text-anchor="middle" fill="currentColor">fail → KILL &amp;</text>
    <text x="634" y="222" text-anchor="middle" fill="currentColor">restart container</text>
  </g>
  <text x="475" y="64" font-size="10" fill="currentColor" opacity="0.6">không kill</text>
  <text x="475" y="174" font-size="10" fill="currentColor" opacity="0.6">khắc nghiệt nhất</text>
  <defs>
    <marker id="pH" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor" fill-opacity="0.5"/>
    </marker>
  </defs>
</svg>

> ⚠️ **Bẫy production**: **liveness probe gọi tới dependency** (database, downstream) là thảm hoạ — DB chậm một nhịp → liveness fail → toàn bộ Pod bị restart đồng loạt → cascading outage. Liveness chỉ kiểm tra **chính process còn phản hồi không**. Việc "phụ thuộc còn khoẻ không" để cho readiness. Và nếu app boot chậm, dùng `startupProbe` thay vì nới `initialDelaySeconds` của liveness (nới quá tay thì lúc treo thật cũng chậm phát hiện).

## Resource requests / limits & QoS

`requests` = scheduler dùng để đặt Pod (đảm bảo tối thiểu). `limits` = trần cứng lúc runtime.

```yaml
resources:
  requests:
    cpu: "250m"        # 0.25 core — dùng để schedule
    memory: "256Mi"
  limits:
    cpu: "500m"        # vượt CPU → bị throttle (chậm lại, không chết)
    memory: "512Mi"    # vượt memory → bị OOMKilled (chết hẳn)
```

CPU và memory hành xử **khác nhau** khi chạm limit, đây là điểm hay nhầm:

| Tài nguyên | Vượt limit | Hậu quả |
|---|---|---|
| CPU | Throttle (CFS) | Latency tăng, không bị kill |
| Memory | Không nén được | **OOMKilled**, exit 137 |

Tổ hợp requests/limits quyết định **QoS class** — yếu tố quyết Pod nào bị evict trước khi node thiếu tài nguyên:

| QoS | Điều kiện | Thứ tự bị evict |
|---|---|---|
| **Guaranteed** | requests == limits cho mọi container | Evict cuối cùng |
| **Burstable** | có requests, nhưng != limits | Evict giữa |
| **BestEffort** | không set gì | **Evict đầu tiên** |

> 💡 **Ghi nhớ**: Workload quan trọng (payment, DB) → đặt **Guaranteed** (requests = limits) để khỏi bị evict. Đặt `requests` sát thực tế dùng — đặt thấp quá thì node bị overcommit và Pod đói tài nguyên; đặt cao quá thì lãng phí và Pod không schedule được (`Pending`).

> ⚠️ **Bẫy production**: Bỏ trống `memory limit` cho app rò rỉ bộ nhớ → Pod ăn hết RAM node → kéo theo cả node và các Pod khác chết. Luôn set memory limit. Với CPU, xu hướng 2025 là **bỏ CPU limit** (chỉ giữ request) để cho phép burst, tránh throttle oan — nhưng phải hiểu rõ hệ quả trước khi làm.

## HorizontalPodAutoscaler (HPA)

HPA tự tăng/giảm số replica theo metric. Cần `metrics-server` cài sẵn, và Pod **phải có resource requests** thì HPA mới tính được % CPU.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
    - type: Resource
      resource:
        name: memory
        target: { type: Utilization, averageUtilization: 80 }
  behavior:                          # kiểm soát tốc độ co giãn (tránh flapping)
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - { type: Percent, value: 50, periodSeconds: 60 }
```

Công thức cốt lõi: `desiredReplicas = ceil(currentReplicas × currentMetric / targetMetric)`.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng điều khiển HPA và phân biệt HPA, Cluster Autoscaler, VPA</title>
  <desc>metrics-server cấp số liệu cho HPA, HPA so currentMetric với target rồi điều chỉnh số replica của Deployment trong khoảng min-max; vòng lặp lặp lại. HPA scale Pod theo chiều ngang, Cluster Autoscaler scale node, VPA scale request/limit theo chiều dọc.</desc>
  <g font-size="11.5">
    <rect x="40" y="40" width="150" height="50" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="115" y="62" text-anchor="middle" fill="currentColor" font-weight="700">metrics-server</text>
    <text x="115" y="79" text-anchor="middle" fill="currentColor" opacity="0.7" font-size="10">CPU/mem mỗi Pod</text>
    <rect x="285" y="40" width="170" height="50" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="370" y="62" text-anchor="middle" fill="currentColor" font-weight="700">HPA</text>
    <text x="370" y="79" text-anchor="middle" fill="currentColor" opacity="0.7" font-size="10">so currentMetric vs target 70%</text>
    <rect x="540" y="40" width="150" height="50" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="615" y="58" text-anchor="middle" fill="currentColor" font-weight="700">Deployment</text>
    <text x="615" y="76" text-anchor="middle" fill="currentColor" opacity="0.7" font-size="10">replicas (min 3 — max 20)</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M190 65 H285" marker-end="url(#hH)"/>
    <path d="M455 65 H540" marker-end="url(#hH)"/>
    <path d="M615 90 C615 150 115 150 115 90" marker-end="url(#hH)"/>
  </g>
  <text x="237" y="56" font-size="10" fill="currentColor" opacity="0.7" text-anchor="middle">metrics</text>
  <text x="497" y="56" font-size="10" fill="currentColor" opacity="0.7" text-anchor="middle">scale ±</text>
  <text x="365" y="166" font-size="10" fill="currentColor" opacity="0.7" text-anchor="middle">Pod mới phát số liệu → lặp lại vòng</text>
  <line x1="40" y1="196" x2="690" y2="196" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="40" y="222" font-size="12" font-weight="700" fill="currentColor">Ba kiểu autoscale — đừng nhầm</text>
  <g font-size="11">
    <rect x="40" y="236" width="206" height="120" rx="9" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="143" y="258" text-anchor="middle" fill="currentColor" font-weight="700">HPA</text>
    <text x="143" y="278" text-anchor="middle" fill="currentColor" opacity="0.8">scale NGANG</text>
    <text x="143" y="296" text-anchor="middle" fill="currentColor" opacity="0.7" font-size="10">thêm/bớt số Pod</text>
    <text x="143" y="330" text-anchor="middle" fill="currentColor" font-size="14">▢ ▢ ▢ → ▢ ▢ ▢ ▢ ▢</text>
    <rect x="258" y="236" width="206" height="120" rx="9" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="361" y="258" text-anchor="middle" fill="currentColor" font-weight="700">Cluster Autoscaler</text>
    <text x="361" y="278" text-anchor="middle" fill="currentColor" opacity="0.8">scale NODE</text>
    <text x="361" y="296" text-anchor="middle" fill="currentColor" opacity="0.7" font-size="10">thêm/bớt máy (EC2)</text>
    <text x="361" y="330" text-anchor="middle" fill="currentColor" font-size="14">▣ → ▣ ▣</text>
    <rect x="476" y="236" width="214" height="120" rx="9" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="583" y="258" text-anchor="middle" fill="currentColor" font-weight="700">VPA</text>
    <text x="583" y="278" text-anchor="middle" fill="currentColor" opacity="0.8">scale DỌC</text>
    <text x="583" y="296" text-anchor="middle" fill="currentColor" opacity="0.7" font-size="10">đổi request/limit 1 Pod</text>
    <text x="583" y="330" text-anchor="middle" fill="currentColor" font-size="14">▯ → ▮</text>
  </g>
  <defs>
    <marker id="hH" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor" fill-opacity="0.5"/>
    </marker>
  </defs>
</svg>

> 💡 **Ghi nhớ**: HPA scale **số Pod ngang**, Cluster Autoscaler/Karpenter scale **số node**, VPA scale **request/limit dọc**. Đừng dùng HPA và VPA cùng trên CPU/memory cho một workload — chúng đánh nhau. Muốn scale theo queue depth/RPS, dùng **KEDA** (event-driven, scale-to-zero).

> ⚠️ **Bẫy production**: HPA flapping (lên xuống liên tục) thường do thiếu `stabilizationWindowSeconds` hoặc target quá sát baseline. Và HPA vô dụng nếu cluster không còn chỗ — Pod mới sẽ `Pending`; cần Cluster Autoscaler đi kèm.

## Rolling update & rollback

Deployment mặc định dùng chiến lược `RollingUpdate` — thay Pod dần để không downtime.

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1            # tạo thêm tối đa 1 Pod so với replicas mong muốn
      maxUnavailable: 0      # không cho phép Pod nào thiếu trong lúc update → zero downtime
  minReadySeconds: 10        # Pod mới phải Ready 10s mới tính là ổn
  revisionHistoryLimit: 10
```

```bash
# Trigger rollout (đổi image)
kubectl set image deployment/api api=myapp:1.5.0
kubectl rollout status deployment/api          # theo dõi tới khi xong
kubectl rollout history deployment/api         # xem các revision

# Rollback khi version mới lỗi
kubectl rollout undo deployment/api                       # về revision trước
kubectl rollout undo deployment/api --to-revision=7       # về revision cụ thể
kubectl rollout pause deployment/api                      # tạm dừng giữa chừng (canary thủ công)
kubectl rollout resume deployment/api
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Timeline rolling update với maxSurge=1, maxUnavailable=0 — zero downtime</title>
  <desc>Deployment 3 replica thay từng Pod v1 bằng v2: mỗi bước tạo thêm 1 Pod v2 (maxSurge=1), chờ Ready rồi mới xoá 1 Pod v1 (maxUnavailable=0), nên luôn còn đủ Pod phục vụ traffic không downtime.</desc>
  <text x="16" y="24" font-size="13" font-weight="700" fill="currentColor">Rolling update 3 replica — maxSurge 1, maxUnavailable 0</text>
  <g font-size="10.5" fill="currentColor" opacity="0.7">
    <text x="80" y="262" text-anchor="middle">Bắt đầu</text>
    <text x="240" y="262" text-anchor="middle">+1 Pod v2</text>
    <text x="400" y="262" text-anchor="middle">v2 Ready → xoá 1 v1</text>
    <text x="560" y="262" text-anchor="middle">lặp lại...</text>
    <text x="660" y="262" text-anchor="middle">Xong</text>
  </g>
  <line x1="40" y1="240" x2="700" y2="240" stroke="currentColor" stroke-opacity="0.4"/>
  <g stroke="currentColor" stroke-opacity="0.4">
    <line x1="80" y1="236" x2="80" y2="244"/>
    <line x1="240" y1="236" x2="240" y2="244"/>
    <line x1="400" y1="236" x2="400" y2="244"/>
    <line x1="560" y1="236" x2="560" y2="244"/>
    <line x1="660" y1="236" x2="660" y2="244"/>
  </g>
  <path d="M695 240 l-8 -4 v8 z" fill="currentColor" fill-opacity="0.4"/>
  <text x="40" y="100" font-size="11" fill="currentColor" opacity="0.7" text-anchor="middle" transform="rotate(-90 40 130)">Pods</text>
  <g font-size="10" text-anchor="middle">
    <g>
      <rect x="60" y="60" width="40" height="26" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="80" y="77" fill="currentColor">v1</text>
      <rect x="60" y="92" width="40" height="26" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="80" y="109" fill="currentColor">v1</text>
      <rect x="60" y="124" width="40" height="26" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="80" y="141" fill="currentColor">v1</text>
    </g>
    <g>
      <rect x="220" y="60" width="40" height="26" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="240" y="77" fill="currentColor">v1</text>
      <rect x="220" y="92" width="40" height="26" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="240" y="109" fill="currentColor">v1</text>
      <rect x="220" y="124" width="40" height="26" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="240" y="141" fill="currentColor">v1</text>
      <rect x="220" y="156" width="40" height="26" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="3 2"/><text x="240" y="173" fill="currentColor">v2*</text>
    </g>
    <g>
      <rect x="380" y="60" width="40" height="26" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="400" y="77" fill="currentColor">v1</text>
      <rect x="380" y="92" width="40" height="26" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="400" y="109" fill="currentColor">v1</text>
      <rect x="380" y="124" width="40" height="26" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4"/><text x="400" y="141" fill="currentColor">v2</text>
    </g>
    <g>
      <rect x="540" y="60" width="40" height="26" rx="5" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="560" y="77" fill="currentColor">v1</text>
      <rect x="540" y="92" width="40" height="26" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4"/><text x="560" y="109" fill="currentColor">v2</text>
      <rect x="540" y="124" width="40" height="26" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4"/><text x="560" y="141" fill="currentColor">v2</text>
    </g>
    <g>
      <rect x="640" y="60" width="40" height="26" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4"/><text x="660" y="77" fill="currentColor">v2</text>
      <rect x="640" y="92" width="40" height="26" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4"/><text x="660" y="109" fill="currentColor">v2</text>
      <rect x="640" y="124" width="40" height="26" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.4"/><text x="660" y="141" fill="currentColor">v2</text>
    </g>
  </g>
  <text x="16" y="216" font-size="10.5" fill="currentColor" opacity="0.7">v2* = Pod mới đang chờ Ready · luôn ≥ 3 Pod phục vụ → không downtime</text>
</svg>

> 💡 **Ghi nhớ**: `maxUnavailable: 0` + `maxSurge: 1` = zero-downtime nhưng rollout chậm hơn. Để rollback hoạt động đúng, **readiness probe phải chuẩn** — nếu không, K8s tưởng Pod lỗi đã "Ready" và đẩy traffic vào, rolling update vẫn "thành công" trên giấy nhưng user gặp lỗi.

> ⚠️ **Bẫy production**: Rolling update **không tự rollback** khi Pod mới crash — nó chỉ dừng (`progressDeadlineSeconds` hết hạn → `Progressing=False`). Bạn phải `rollout undo` thủ công, hoặc dùng Argo Rollouts/Flagger để auto-rollback theo metric. Chạy DB migration **không tương thích ngược** trong rolling update sẽ làm Pod cũ (chưa update) chết — luôn migrate theo kiểu expand/contract.

## Label & selector

Label là cặp key-value gắn lên object; selector là cách nhóm chúng. Đây là cơ chế **kết nối** Service↔Pod, Deployment↔ReplicaSet, NetworkPolicy↔Pod.

```yaml
metadata:
  labels:
    app: api
    tier: backend
    version: v1.5.0
    env: prod
---
# Service tìm Pod qua selector
spec:
  selector:
    app: api
    tier: backend
```

```bash
kubectl get pods -l 'app=api,env=prod'              # equality
kubectl get pods -l 'version in (v1.4.0,v1.5.0)'    # set-based
kubectl get pods -l 'tier!=frontend'
kubectl label pod api-xxx canary=true               # gắn label runtime
```

> ⚠️ **Bẫy production**: `spec.selector` của Deployment là **immutable** — sửa sau khi tạo sẽ bị từ chối. Và nếu hai Deployment dùng selector trùng nhau, chúng sẽ tranh nhau "nhận" cùng Pod → hành vi hỗn loạn. Đặt label đủ riêng (`app` + `version`).

## Taints & tolerations (ý tưởng)

**Taint** đặt lên node để "đẩy" Pod ra; **toleration** đặt lên Pod để "chịu được" taint đó và vẫn lên được node. Đây là cơ chế dành riêng node cho loại workload nhất định (GPU, node spot...).

```bash
# Taint node: Pod KHÔNG có toleration tương ứng sẽ không được schedule lên đây
kubectl taint nodes gpu-node-1 workload=gpu:NoSchedule
```

```yaml
# Pod chịu được taint trên → mới lên được node gpu
tolerations:
  - key: "workload"
    operator: "Equal"
    value: "gpu"
    effect: "NoSchedule"
```

Ba `effect`: `NoSchedule` (không xếp Pod mới), `PreferNoSchedule` (cố tránh), `NoExecute` (đuổi cả Pod đang chạy).

> 💡 **Ghi nhớ**: Taint/toleration là cơ chế **"đẩy ra"** (repel) — chỉ cho phép, không bắt buộc Pod lên node đó. Muốn **"kéo vào"** (attract) một loại node cụ thể, dùng **nodeSelector** hoặc **nodeAffinity**. Thường kết hợp cả hai: taint để dành riêng node + toleration + nodeAffinity để buộc Pod đúng vào đó.

## Debug Pod — quy trình thực chiến

Khi Pod không chạy đúng, đi theo thứ tự: `describe` → `events` → `logs` → `exec`.

```bash
# 1. describe: xem State, Reason, Last State, probe fail, scheduling
kubectl describe pod api-xxx

# 2. events: thứ tự thời gian (lý do Pending, OOMKilled, FailedScheduling, image pull)
kubectl get events --sort-by=.lastTimestamp -n prod
kubectl get events --field-selector involvedObject.name=api-xxx

# 3. logs
kubectl logs api-xxx                       # container hiện tại
kubectl logs api-xxx --previous            # container ĐÃ CRASH (vàng quan trọng nhất)
kubectl logs api-xxx -c sidecar -f         # container cụ thể, follow
kubectl logs -l app=api --tail=100         # gộp log nhiều Pod theo label

# 4. exec: vào trong container chẩn đoán
kubectl exec -it api-xxx -- sh
kubectl exec api-xxx -- env                # xem env thực tế Pod nhận
kubectl exec api-xxx -- nslookup db-svc    # test DNS/network nội bộ

# debug container không có shell (distroless) → ephemeral container
kubectl debug -it api-xxx --image=busybox --target=app
```

Bảng triệu chứng → nguyên nhân:

| STATUS | Nguyên nhân thường gặp | Kiểm tra |
|---|---|---|
| `Pending` | Thiếu tài nguyên / taint / PVC chưa bind | `describe` → Events: `FailedScheduling` |
| `ImagePullBackOff` | Sai tên image / thiếu imagePullSecret | `describe` → Events |
| `CrashLoopBackOff` | App chết ngay khi start | `logs --previous` |
| `OOMKilled` (exit 137) | Vượt memory limit | `describe` → Last State; tăng limit/sửa leak |
| `0/1 Running` (not Ready) | readiness probe fail | `describe` → probe; test endpoint `/ready` |
| `Terminating` mãi | finalizer treo / SIGTERM bị bỏ qua | `describe`; kiểm tra graceful shutdown |

> 💡 **Ghi nhớ**: `kubectl logs --previous` là lệnh cứu mạng cho `CrashLoopBackOff` — log của container hiện tại trống vì nó chưa kịp chạy; bí mật nằm trong container **đã chết trước đó**. Còn `CrashLoopBackOff` không phải lỗi, nó là **trạng thái chờ** (back-off tăng dần tới 5 phút) sau khi container liên tục chết.

## Liên hệ sang AWS

| Khái niệm K8s | Trên AWS |
|---|---|
| Managed control plane | **Amazon EKS** — AWS quản control plane (HA, vá lỗi), bạn quản workload |
| Node (EC2) | **Managed Node Groups** hoặc **Karpenter** (autoscale node thông minh, thay Cluster Autoscaler) |
| Node serverless | **EKS Fargate** — mỗi Pod = một micro-VM, không quản node; **không hỗ trợ DaemonSet, GPU, privileged**, và HPA chạy nhưng node tự "hiện ra" theo Pod |
| Ingress Controller | **AWS Load Balancer Controller** — Ingress → ALB, Service `type=LoadBalancer` → NLB |
| Secret | **External Secrets Operator** kéo từ **AWS Secrets Manager**; **EKS Pod Identity / IRSA** cấp quyền IAM cho Pod thay vì static key |
| ConfigMap mã hoá etcd | EKS bật **envelope encryption** với **KMS** cho Secret trong etcd |
| HPA theo metric AWS | Metric từ **CloudWatch Container Insights**; KEDA scale theo SQS/Kinesis |
| Persistent storage | **EBS CSI** (block, 1 AZ) / **EFS CSI** (shared, multi-AZ) driver |

> 💡 **Ghi nhớ**: Trên EKS, ưu tiên **IRSA/Pod Identity** thay vì nhét AWS access key vào Secret — Pod nhận quyền IAM tạm thời, tự xoay vòng. Đây là khác biệt vận hành lớn nhất so với cluster tự dựng.

> ⚠️ **Bẫy production**: EKS Fargate hợp cho workload nhẹ, cách ly mạnh, nhưng **đắt hơn EC2 khi tải cao và ổn định**, lạnh khởi động chậm (~60s), không gắn được EBS, không chạy DaemonSet (nên agent log/monitoring phải chạy dạng sidecar). Mô hình thực dụng 2025: workload nền dùng Managed Node Group + Karpenter (rẻ, dùng Spot), tác vụ bursty/batch ngắn dùng Fargate.
