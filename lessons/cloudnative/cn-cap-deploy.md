# Bài 18 — Capstone: Deploy một app production-ready lên K8s

## 1. Mục tiêu
Đây là bài **tổng kết** cả course. Ta ghép mọi thứ đã học thành **một dự án thật**: đưa một web app 3 tầng (frontend + backend API + Redis cache) lên Kubernetes theo chuẩn **production-ready**. Sau bài này bạn có thể:
- Thiết kế **kiến trúc triển khai** đầy đủ: workload nào là stateless (Deployment), workload nào là stateful (StatefulSet), luồng traffic đi từ Internet vào tận Pod.
- Viết **manifest hoàn chỉnh, copy-chạy**: Deployment với **probe** + **resource requests/limits**, StatefulSet + PVC cho Redis, Service ClusterIP, Ingress + TLS, ConfigMap/Secret, HPA, RBAC + ServiceAccount, NetworkPolicy.
- Đóng gói toàn bộ thành **Helm chart** và triển khai bằng **GitOps (ArgoCD)**.
- Chạy qua **Production Checklist** để biết khi nào một deployment "thật sự" sẵn sàng chịu lửa.

---

## 2. Lý thuyết — bức tranh kiến trúc

### 2.1 Analogy: mở một nhà hàng, không phải một bếp

Suốt course bạn đã học từng "dụng cụ bếp": Pod là nồi, Deployment là "luôn giữ 3 nồi sôi", Service là "số điện thoại nội bộ ổn định", Ingress là "cửa trước có bảo vệ", Secret là "két sắt". Capstone này là lúc bạn **mở cả nhà hàng**: sắp đặt các trạm, đường đi của khách, quy trình khi một đầu bếp ngã bệnh, và bảng kiểm tra trước giờ mở cửa.

Điểm mấu chốt của "production-ready" không phải là "app chạy được" — mà là app **tự sống lại khi hỏng, tự co giãn theo tải, không rò rỉ bí mật, quan sát được, và triển khai lại được mà không sợ hãi**.

### 2.2 Kiến trúc mục tiêu

Ta có 3 tầng, mỗi tầng có **bản chất trạng thái** khác nhau — và đó chính là lý do chọn workload khác nhau:

| Thành phần | Trạng thái | Workload | Vì sao |
|-----------|-----------|----------|--------|
| **frontend** (React/Nginx) | stateless | Deployment | Bản nào cũng như nhau, thay thoải mái |
| **backend API** (Node/Go) | stateless | Deployment + HPA | Scale theo CPU; không giữ state cục bộ |
| **Redis** cache | **stateful** | StatefulSet + PVC | Có danh tính ổn định + dữ liệu trên đĩa |

<svg viewBox="0 0 720 360" role="img" aria-labelledby="arch-t arch-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="arch-t">Kiến trúc triển khai app 3 tầng trên Kubernetes</title>
<desc id="arch-d">Traffic từ Internet qua Ingress TLS tới Service frontend, frontend gọi Service backend, backend gọi Service Redis headless; backend còn đọc ConfigMap và Secret và được HPA co giãn</desc>
<rect x="20" y="20" width="120" height="40" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="45" text-anchor="middle" font-size="12" fill="currentColor">Internet</text>
<rect x="200" y="18" width="180" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="290" y="38" text-anchor="middle" font-size="12" fill="currentColor">Ingress + TLS</text>
<text x="290" y="54" text-anchor="middle" font-size="10" fill="currentColor">app.example.com</text>
<rect x="185" y="110" width="150" height="56" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="132" text-anchor="middle" font-size="12" fill="currentColor">Deployment</text>
<text x="260" y="150" text-anchor="middle" font-size="11" fill="currentColor">frontend x2</text>
<rect x="185" y="215" width="150" height="56" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="237" text-anchor="middle" font-size="12" fill="currentColor">Deployment</text>
<text x="260" y="255" text-anchor="middle" font-size="11" fill="currentColor">backend x3 (HPA)</text>
<rect x="185" y="305" width="150" height="46" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="333" text-anchor="middle" font-size="11" fill="currentColor">StatefulSet Redis + PVC</text>
<rect x="470" y="215" width="140" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="540" y="237" text-anchor="middle" font-size="11" fill="currentColor">ConfigMap</text>
<text x="540" y="252" text-anchor="middle" font-size="11" fill="currentColor">+ Secret</text>
<line x1="140" y1="40" x2="198" y2="40" stroke="currentColor" stroke-width="1.3" marker-end="url(#a2)"/>
<line x1="290" y1="64" x2="262" y2="108" stroke="currentColor" stroke-width="1.3" marker-end="url(#a2)"/>
<line x1="260" y1="166" x2="260" y2="213" stroke="currentColor" stroke-width="1.3" marker-end="url(#a2)"/>
<line x1="260" y1="271" x2="260" y2="303" stroke="currentColor" stroke-width="1.3" marker-end="url(#a2)"/>
<line x1="470" y1="238" x2="337" y2="243" stroke="currentColor" stroke-width="1.1" stroke-dasharray="4 3" marker-end="url(#a2)"/>
<text x="300" y="100" font-size="9" fill="currentColor">Service ClusterIP</text>
<text x="270" y="192" font-size="9" fill="currentColor">Service ClusterIP</text>
<text x="270" y="292" font-size="9" fill="currentColor">Service headless</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Nguyên tắc thiết kế đọc từ hình:
- **Chỉ frontend lộ ra ngoài** qua Ingress. Backend và Redis là **ClusterIP nội bộ** — không ai từ Internet chạm tới trực tiếp.
- Frontend gọi backend qua **DNS tên Service** (`backend`), backend gọi Redis qua `redis-0.redis`. IP đổi liên tục nhưng tên thì ổn định.
- Config "không nhạy cảm" (log level, feature flag) nằm ở **ConfigMap**; thứ nhạy cảm (DB URL có mật khẩu, Redis password) nằm ở **Secret**.

Ta sẽ đặt tất cả vào một **namespace** riêng `shop` để cô lập và dễ áp policy.

```bash
kubectl create namespace shop
kubectl config set-context --current --namespace=shop
```

---

## 3. Manifest đầy đủ, copy-chạy

Thứ tự triển khai hợp lý: **Namespace → Secret/ConfigMap → Redis (stateful) → backend → frontend → Service → Ingress → HPA → RBAC/NetworkPolicy → PDB**. Kubernetes tự reconcile nên thứ tự không bắt buộc tuyệt đối, nhưng theo thứ tự này thì dependency có sẵn khi Pod khởi động.

### 3.1 ConfigMap + Secret

Secret **không phải mã hoá** — chỉ là base64 (encode, ai đọc được cũng giải được). Giá trị của nó là: tách bí mật khỏi image/manifest, kiểm soát truy cập bằng RBAC, và có thể tích hợp encryption-at-rest ở etcd. Trong production thật, dùng **External Secrets Operator** hoặc **Sealed Secrets** thay vì commit Secret thô.

```yaml
# 01-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: shop
data:
  LOG_LEVEL: "info"
  REDIS_HOST: "redis"          # tên Service headless của Redis
  REDIS_PORT: "6379"
  CACHE_TTL_SECONDS: "300"
---
apiVersion: v1
kind: Secret
metadata:
  name: backend-secret
  namespace: shop
type: Opaque
stringData:                     # stringData: nhập chuỗi thô, K8s tự base64
  DATABASE_URL: "postgres://app:S3cretPassw0rd@db.internal:5432/shop"
  REDIS_PASSWORD: "r3dis-pw-change-me"
```

`stringData` tiện hơn `data` vì bạn viết chuỗi thô, không phải tự `base64`. Áp dụng: `kubectl apply -f 01-config.yaml`.

### 3.2 Redis — StatefulSet + PVC + Service headless

Redis là **stateful**: nó có dữ liệu cache trên đĩa và một danh tính (`redis-0`) cần ổn định. Đó là lý do dùng **StatefulSet** chứ không phải Deployment. Điểm khác biệt cốt lõi:
- Pod có tên **ổn định, có thứ tự** (`redis-0`, `redis-1`...) thay vì hash ngẫu nhiên.
- Mỗi Pod gắn **PVC riêng** qua `volumeClaimTemplates` — dữ liệu sống sót khi Pod restart/reschedule.
- Đi kèm **Service headless** (`clusterIP: None`) để mỗi Pod có DNS riêng: `redis-0.redis.shop.svc`.

```yaml
# 02-redis.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: shop
  labels: { app: redis }
spec:
  clusterIP: None               # headless: DNS trỏ thẳng từng Pod
  selector: { app: redis }
  ports:
    - name: redis
      port: 6379
      targetPort: 6379
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: shop
spec:
  serviceName: redis            # PHẢI khớp Service headless ở trên
  replicas: 1
  selector:
    matchLabels: { app: redis }
  template:
    metadata:
      labels: { app: redis }
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 999
        fsGroup: 999            # để volume ghi được bởi user redis
      containers:
        - name: redis
          image: redis:7.2-alpine
          args:
            - "--requirepass"
            - "$(REDIS_PASSWORD)"
            - "--appendonly"
            - "yes"             # bật AOF để bền dữ liệu
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: backend-secret
                  key: REDIS_PASSWORD
          ports:
            - containerPort: 6379
          resources:
            requests: { cpu: "100m", memory: "128Mi" }
            limits:   { cpu: "500m", memory: "256Mi" }
          livenessProbe:
            tcpSocket: { port: 6379 }
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            exec:
              command: ["sh", "-c", "redis-cli -a \"$REDIS_PASSWORD\" ping | grep -q PONG"]
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - name: data
              mountPath: /data
  volumeClaimTemplates:         # mỗi Pod tự có 1 PVC riêng
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 2Gi
```

Chú ý `readinessProbe` gọi `redis-cli ping`: khi chưa PONG, Pod bị đánh **NotReady** và Service **không** route traffic tới nó — tránh gửi request vào Redis chưa sẵn sàng.

### 3.3 Backend API — Deployment với probe + resource + security

Đây là "trái tim" của bài. Backend stateless nên dùng Deployment. Ta cắm đủ **ba loại probe** (mỗi loại một nhiệm vụ khác nhau — xem bảng dưới), resource requests/limits, và securityContext siết chặt.

| Probe | Câu hỏi nó trả lời | Fail thì K8s làm gì |
|-------|-------------------|---------------------|
| **liveness** | "Container còn *sống* không hay treo?" | **Restart** container |
| **readiness** | "Sẵn sàng nhận traffic chưa?" | **Rút khỏi Service** (không giết) |
| **startup** | "App khởi động xong chưa?" (app chậm boot) | Hoãn liveness cho tới khi pass |

Tách readiness khỏi liveness là **cực kỳ quan trọng**: khi Redis/DB tạm sập, ta muốn Pod **rời Service** (readiness fail) nhưng **không bị restart** (liveness vẫn ok) — restart lúc downstream chết chỉ làm mọi thứ tệ hơn.

```yaml
# 03-backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: shop
  labels: { app: backend }
spec:
  replicas: 3
  selector:
    matchLabels: { app: backend }
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0          # rollout không giảm capacity
      maxSurge: 1
  template:
    metadata:
      labels: { app: backend }
    spec:
      serviceAccountName: backend-sa   # định nghĩa ở phần RBAC
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: backend
          image: ghcr.io/acme/shop-backend:1.4.2   # PIN tag, không dùng :latest
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef: { name: backend-config }
            - secretRef:    { name: backend-secret }
          resources:
            requests: { cpu: "250m", memory: "256Mi" }   # để scheduler xếp chỗ + HPA tính %
            limits:   { cpu: "1",    memory: "512Mi" }   # trần chống Pod ngốn cả node
          startupProbe:
            httpGet: { path: /healthz, port: 8080 }
            failureThreshold: 30
            periodSeconds: 2        # cho app tối đa 60s để boot
          livenessProbe:
            httpGet: { path: /healthz, port: 8080 }
            initialDelaySeconds: 0  # startupProbe đã gác cửa
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet: { path: /readyz, port: 8080 }   # /readyz kiểm tra được cả Redis/DB
            periodSeconds: 5
            failureThreshold: 3
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }
          volumeMounts:
            - name: tmp
              mountPath: /tmp       # readOnlyRootFS cần volume ghi tạm
      volumes:
        - name: tmp
          emptyDir: {}
```

Vì sao **requests khác limits** quan trọng: `requests` là "chỗ đặt gạch" scheduler dùng để xếp Pod vào node và cũng là mẫu số để HPA tính `% CPU`. `limits` là trần cứng: vượt CPU thì bị **throttle**, vượt memory thì bị **OOMKilled**. Đặt `requests` sát mức tải thật; đặt `limits` memory = requests (hoặc gần) để Pod thuộc QoS **Guaranteed**, ít bị evict.

### 3.4 Frontend — Deployment + Service

Frontend (Nginx phục vụ static build) đơn giản hơn, không cần Redis/Secret.

```yaml
# 04-frontend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: shop
  labels: { app: frontend }
spec:
  replicas: 2
  selector:
    matchLabels: { app: frontend }
  template:
    metadata:
      labels: { app: frontend }
    spec:
      securityContext: { runAsNonRoot: true, runAsUser: 101 }
      containers:
        - name: frontend
          image: ghcr.io/acme/shop-frontend:1.4.2
          ports: [{ containerPort: 8080 }]
          resources:
            requests: { cpu: "50m",  memory: "64Mi" }
            limits:   { cpu: "200m", memory: "128Mi" }
          readinessProbe:
            httpGet: { path: /, port: 8080 }
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /, port: 8080 }
            periodSeconds: 10
```

### 3.5 Service ClusterIP nội bộ

Mỗi Deployment cần một **Service ClusterIP** để có tên DNS ổn định và load-balance L4 giữa các replica. Đây là "danh bạ nội bộ": frontend gọi `http://backend:8080`, không cần biết Pod IP.

```yaml
# 05-services.yaml
apiVersion: v1
kind: Service
metadata: { name: backend, namespace: shop }
spec:
  selector: { app: backend }
  ports: [{ name: http, port: 8080, targetPort: 8080 }]
  # type mặc định = ClusterIP (chỉ nội bộ cluster)
---
apiVersion: v1
kind: Service
metadata: { name: frontend, namespace: shop }
spec:
  selector: { app: frontend }
  ports: [{ name: http, port: 80, targetPort: 8080 }]
```

### 3.6 Ingress + TLS

Ingress là **cửa trước duy nhất** ra Internet. Nó terminate TLS và route theo host/path. Ở đây dùng ingress-nginx controller và **cert-manager** để tự cấp cert Let's Encrypt.

```yaml
# 06-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop-ingress
  namespace: shop
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"   # cert-manager tự xin cert
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "8m"
spec:
  ingressClassName: nginx
  tls:
    - hosts: ["app.example.com"]
      secretName: shop-tls          # cert-manager tạo & bơm cert vào Secret này
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api               # /api/* -> backend
            pathType: Prefix
            backend:
              service:
                name: backend
                port: { number: 8080 }
          - path: /                   # còn lại -> frontend
            pathType: Prefix
            backend:
              service:
                name: frontend
                port: { number: 80 }
```

Luồng một request thật, đọc theo sequence:

<svg viewBox="0 0 700 260" role="img" aria-labelledby="req-t req-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="req-t">Luồng một HTTPS request từ trình duyệt tới backend và Redis</title>
<desc id="req-d">Trình duyệt gửi HTTPS tới Ingress, Ingress terminate TLS và route tới Service backend, backend đọc cache từ Redis rồi trả kết quả</desc>
<line x1="70" y1="40" x2="70" y2="230" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="230" y1="40" x2="230" y2="230" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="400" y1="40" x2="400" y2="230" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="560" y1="40" x2="560" y2="230" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<rect x="30" y="20" width="80" height="26" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="70" y="37" text-anchor="middle" font-size="10" fill="currentColor">Browser</text>
<rect x="185" y="20" width="90" height="26" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="230" y="37" text-anchor="middle" font-size="10" fill="currentColor">Ingress TLS</text>
<rect x="355" y="20" width="90" height="26" rx="6" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="400" y="37" text-anchor="middle" font-size="10" fill="currentColor">backend</text>
<rect x="520" y="20" width="80" height="26" rx="6" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="37" text-anchor="middle" font-size="10" fill="currentColor">Redis</text>
<line x1="70" y1="70" x2="230" y2="70" stroke="currentColor" stroke-width="1.2" marker-end="url(#a3)"/>
<text x="150" y="63" text-anchor="middle" font-size="9" fill="currentColor">GET /api/x (HTTPS)</text>
<line x1="230" y1="105" x2="400" y2="105" stroke="currentColor" stroke-width="1.2" marker-end="url(#a3)"/>
<text x="315" y="98" text-anchor="middle" font-size="9" fill="currentColor">HTTP (đã bóc TLS)</text>
<line x1="400" y1="140" x2="560" y2="140" stroke="currentColor" stroke-width="1.2" marker-end="url(#a3)"/>
<text x="480" y="133" text-anchor="middle" font-size="9" fill="currentColor">GET cache</text>
<line x1="560" y1="175" x2="400" y2="175" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#a3)"/>
<text x="480" y="168" text-anchor="middle" font-size="9" fill="currentColor">miss -> query DB</text>
<line x1="400" y1="210" x2="70" y2="210" stroke="currentColor" stroke-width="1.2" marker-end="url(#a3)"/>
<text x="235" y="203" text-anchor="middle" font-size="9" fill="currentColor">200 JSON trả về client</text>
<defs><marker id="a3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 3.7 HPA — autoscale theo CPU

HPA (HorizontalPodAutoscaler) đọc metric từ **metrics-server** và điều chỉnh `replicas` để giữ CPU trung bình quanh mục tiêu. Công thức lõi:

```
desiredReplicas = ceil( currentReplicas × (currentMetric / targetMetric) )
```

Ví dụ: 3 replica, CPU trung bình 120% mục tiêu 60% → `ceil(3 × 120/60) = 6` replica. HPA dựa vào **`requests.cpu`** làm mẫu số — đây là lý do backend **bắt buộc** khai `requests.cpu`, không có nó HPA không tính được %.

```yaml
# 07-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend
  namespace: shop
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 12
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60     # giữ CPU ~60% của requests
  behavior:                          # chống "flapping"
    scaleUp:
      stabilizationWindowSeconds: 0
      policies: [{ type: Percent, value: 100, periodSeconds: 30 }]
    scaleDown:
      stabilizationWindowSeconds: 300   # chờ 5 phút mới scale xuống
      policies: [{ type: Percent, value: 50, periodSeconds: 60 }]
```

`behavior.scaleDown.stabilizationWindowSeconds: 300` tránh việc giảm Pod quá nhanh khi tải dao động — scale lên thì nhanh, scale xuống thì thận trọng.

### 3.8 RBAC + ServiceAccount

**Nguyên tắc least-privilege**: mỗi workload chạy dưới một **ServiceAccount riêng**, được cấp đúng quyền tối thiểu — không dùng SA `default` (thường thừa quyền). Giả sử backend cần đọc ConfigMap để hot-reload config: ta cho đúng verb `get/list/watch` trên `configmaps`, không hơn.

```yaml
# 08-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-sa
  namespace: shop
automountServiceAccountToken: true    # backend đọc ConfigMap qua API (hot-reload) -> cần token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role                            # Role = phạm vi namespace (không phải Cluster)
metadata:
  name: backend-config-reader
  namespace: shop
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]   # chỉ đọc, không sửa/xoá
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backend-config-reader-binding
  namespace: shop
subjects:
  - kind: ServiceAccount
    name: backend-sa
    namespace: shop
roleRef:
  kind: Role
  name: backend-config-reader
  apiGroup: rbac.authorization.k8s.io
```

Lưu ý cặp đôi: ta bật `automountServiceAccountToken: true` ở đây **vì** backend thật sự gọi Kubernetes API (đọc ConfigMap để hot-reload) — có Role thì phải có token mới dùng được. Ngược lại, `automountServiceAccountToken: false` là mẹo bảo mật hay bị bỏ qua cho các workload **không** gọi API (như frontend): đừng mount token vào Pod — kẻ tấn công chiếm Pod cũng không có token để quậy cluster.

### 3.9 NetworkPolicy — mặc định từ chối, mở đúng đường

Mặc định K8s cho **mọi Pod nói chuyện với mọi Pod**. Production cần siết: chỉ mở đúng luồng trong sơ đồ. Chiến lược chuẩn là **default-deny** rồi allow theo nhãn.

```yaml
# 09-netpol.yaml
# (1) Chặn hết ingress trong namespace shop
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny-ingress, namespace: shop }
spec:
  podSelector: {}                 # áp cho MỌI Pod
  policyTypes: ["Ingress"]
  # không có ingress rule -> từ chối tất cả
---
# (2) backend chỉ nhận traffic TỪ frontend (và ingress-nginx)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-frontend-to-backend, namespace: shop }
spec:
  podSelector:
    matchLabels: { app: backend }
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - podSelector: { matchLabels: { app: frontend } }
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: ingress-nginx }
      ports: [{ protocol: TCP, port: 8080 }]
---
# (2b) frontend chỉ nhận traffic TỪ ingress-nginx (nếu thiếu, Ingress không tới được frontend)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-ingress-to-frontend, namespace: shop }
spec:
  podSelector:
    matchLabels: { app: frontend }
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: ingress-nginx }
      ports: [{ protocol: TCP, port: 8080 }]
---
# (3) Redis chỉ nhận traffic TỪ backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-backend-to-redis, namespace: shop }
spec:
  podSelector:
    matchLabels: { app: redis }
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - podSelector: { matchLabels: { app: backend } }
      ports: [{ protocol: TCP, port: 6379 }]
```

Kết quả: dù ai đó chiếm được frontend, họ **không** ping thẳng được Redis — phải đi qua backend. NetworkPolicy cần **CNI hỗ trợ** (Calico, Cilium); một số cluster mặc định bỏ qua nó, nên hãy kiểm tra.

### 3.10 PodDisruptionBudget — bảo vệ khi bảo trì

PDB đảm bảo khi node bị **drain** (nâng cấp, autoscaler thu hồi node), K8s không giết quá nhiều Pod cùng lúc làm rớt dịch vụ.

```yaml
# 10-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: backend-pdb, namespace: shop }
spec:
  minAvailable: 2                 # luôn giữ >=2 backend sống khi voluntary disruption
  selector:
    matchLabels: { app: backend }
```

PDB chỉ chặn **voluntary disruption** (drain, rollout do bạn chủ động). Nó không cứu bạn khi node đột tử — đó là việc của replicas + anti-affinity.

---

## 4. Đóng gói thành Helm chart

Áp 10 file YAML bằng tay không lặp lại được cho nhiều môi trường (dev/staging/prod). **Helm** biến chúng thành một **chart** có tham số (`values.yaml`) — cùng một template, khác giá trị theo môi trường.

```
shop-chart/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── configmap.yaml
    ├── secret.yaml
    ├── redis-statefulset.yaml
    ├── backend-deployment.yaml
    ├── frontend-deployment.yaml
    ├── services.yaml
    ├── ingress.yaml
    ├── hpa.yaml
    ├── rbac.yaml
    ├── networkpolicy.yaml
    └── pdb.yaml
```

`Chart.yaml` khai báo metadata; `values.yaml` chứa giá trị mặc định:

```yaml
# shop-chart/Chart.yaml
apiVersion: v2
name: shop
description: App 3 tang production-ready
type: application
version: 0.1.0            # version của CHART
appVersion: "1.4.2"      # version của APP
```

```yaml
# shop-chart/values.yaml
backend:
  image: ghcr.io/acme/shop-backend
  tag: "1.4.2"
  replicas: 3
  resources:
    requests: { cpu: "250m", memory: "256Mi" }
    limits:   { cpu: "1",    memory: "512Mi" }
frontend:
  image: ghcr.io/acme/shop-frontend
  tag: "1.4.2"
  replicas: 2
redis:
  storage: 2Gi
ingress:
  host: app.example.com
hpa:
  minReplicas: 3
  maxReplicas: 12
```

Template dùng `{{ .Values.* }}` để chèn giá trị. Ví dụ trích backend Deployment:

```yaml
# shop-chart/templates/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-backend
  labels: { app: backend }
spec:
  replicas: {{ .Values.backend.replicas }}
  selector:
    matchLabels: { app: backend }
  template:
    metadata:
      labels: { app: backend }
    spec:
      serviceAccountName: {{ .Release.Name }}-backend-sa
      containers:
        - name: backend
          image: "{{ .Values.backend.image }}:{{ .Values.backend.tag }}"
          resources:
            {{- toYaml .Values.backend.resources | nindent 12 }}
          # ... probe, envFrom như phần 3.3
```

Cài đặt và nâng cấp:

```bash
# Kiểm tra template render đúng trước khi apply (không đụng cluster)
helm template shop ./shop-chart -n shop | kubectl apply --dry-run=client -f -

# Cài lần đầu
helm install shop ./shop-chart -n shop --create-namespace

# Nâng cấp app lên tag mới, override qua CLI
helm upgrade shop ./shop-chart -n shop --set backend.tag=1.4.3

# Rollback nếu bản mới lỗi
helm rollback shop 1 -n shop

# Xem lịch sử release
helm history shop -n shop
```

Helm đóng gói **một đơn vị release có version** — bạn upgrade/rollback cả cụm object bằng một lệnh, thay vì `kubectl apply` từng file.

---

## 5. Deploy qua GitOps với ArgoCD

Helm giải quyết "đóng gói". **GitOps** giải quyết "làm sao triển khai an toàn, có audit, tự đồng bộ". Tư tưởng: **Git là nguồn sự thật duy nhất** cho trạng thái mong muốn; một agent trong cluster (ArgoCD) liên tục **so Git với cluster** và tự kéo cluster về khớp Git — chính là vòng lặp reconciliation ở tầng deploy.

<svg viewBox="0 0 700 210" role="img" aria-labelledby="gitops-t gitops-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="gitops-t">Luồng GitOps với ArgoCD</title>
<desc id="gitops-d">Dev push chart vào Git, ArgoCD phát hiện thay đổi và đồng bộ vào cluster, so sánh liên tục desired với actual</desc>
<rect x="20" y="80" width="110" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="100" text-anchor="middle" font-size="11" fill="currentColor">Dev</text>
<text x="75" y="116" text-anchor="middle" font-size="9" fill="currentColor">git push chart</text>
<rect x="200" y="80" width="120" height="46" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="100" text-anchor="middle" font-size="11" fill="currentColor">Git repo</text>
<text x="260" y="116" text-anchor="middle" font-size="9" fill="currentColor">nguồn sự thật</text>
<rect x="390" y="80" width="120" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="450" y="100" text-anchor="middle" font-size="11" fill="currentColor">ArgoCD</text>
<text x="450" y="116" text-anchor="middle" font-size="9" fill="currentColor">so sánh + sync</text>
<rect x="575" y="80" width="105" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="627" y="100" text-anchor="middle" font-size="11" fill="currentColor">Cluster</text>
<text x="627" y="116" text-anchor="middle" font-size="9" fill="currentColor">shop namespace</text>
<line x1="130" y1="103" x2="198" y2="103" stroke="currentColor" stroke-width="1.3" marker-end="url(#a4)"/>
<line x1="390" y1="103" x2="322" y2="103" stroke="currentColor" stroke-width="1.3" marker-end="url(#a4)"/>
<text x="355" y="96" text-anchor="middle" font-size="8" fill="currentColor">watch</text>
<line x1="510" y1="103" x2="573" y2="103" stroke="currentColor" stroke-width="1.3" marker-end="url(#a4)"/>
<text x="542" y="96" text-anchor="middle" font-size="8" fill="currentColor">apply</text>
<path d="M627 126 C627 175, 450 175, 450 128" stroke="currentColor" stroke-width="1.1" fill="none" stroke-dasharray="4 3" marker-end="url(#a4)"/>
<text x="538" y="172" text-anchor="middle" font-size="8" fill="currentColor">actual state phản hồi</text>
<defs><marker id="a4" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Định nghĩa một `Application` — trỏ ArgoCD vào repo/chart. Deploy giờ chỉ là **git commit**:

```yaml
# argocd-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shop
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/acme/shop-deploy.git
    targetRevision: main
    path: shop-chart          # đường dẫn tới Helm chart trong repo
    helm:
      valueFiles: ["values-prod.yaml"]
  destination:
    server: https://kubernetes.default.svc
    namespace: shop
  syncPolicy:
    automated:
      prune: true             # object bị xoá khỏi Git -> xoá khỏi cluster
      selfHeal: true          # ai sửa tay trên cluster -> ArgoCD kéo về khớp Git
    syncOptions:
      - CreateNamespace=true
```

```bash
kubectl apply -f argocd-app.yaml -n argocd
argocd app get shop            # xem trạng thái Synced / Healthy
argocd app sync shop           # sync thủ công (nếu tắt automated)
```

Lợi ích GitOps: **audit** (mọi thay đổi là commit, ai/khi nào/gì đều rõ), **rollback** = `git revert`, **selfHeal** chống drift (ai lỡ sửa tay bị kéo về Git), và không cần cấp credential cluster cho CI — cluster tự pull.

---

## 6. Production Checklist

Đây là bảng kiểm "trước giờ mở cửa". Một deployment chỉ **production-ready** khi qua hết:

| Nhóm | Hạng mục | Đã làm ở đâu |
|------|----------|--------------|
| **Health** | liveness + readiness + startup probe cho mọi container | 3.2, 3.3, 3.4 |
| **Health** | `/readyz` kiểm tra cả downstream (Redis/DB) | 3.3 |
| **Resource** | requests + limits cho mọi container | 3.2–3.4 |
| **Resource** | image PIN tag cụ thể, không `:latest` | 3.3 |
| **Availability** | replicas >= 2, PDB `minAvailable` | 3.3, 3.10 |
| **Availability** | RollingUpdate `maxUnavailable: 0` | 3.3 |
| **Availability** | anti-affinity trải Pod qua nhiều node/zone | (thêm dưới) |
| **Scaling** | HPA + `requests.cpu` làm mẫu số | 3.7 |
| **Security** | `runAsNonRoot`, `readOnlyRootFilesystem`, drop ALL caps | 3.3 |
| **Security** | ServiceAccount riêng + RBAC least-privilege | 3.8 |
| **Security** | NetworkPolicy default-deny | 3.9 |
| **Security** | Secret không commit thô (Sealed/External Secrets) | 3.1 |
| **Networking** | Ingress TLS, ssl-redirect | 3.6 |
| **Observability** | metrics (Prometheus), logs tập trung, tracing | (dưới) |
| **Deploy** | Helm chart có version + GitOps | 4, 5 |

Hai hạng mục nên bổ sung để "đủ lửa":

**Anti-affinity** — trải backend qua nhiều node để một node chết không kéo sập cả service:

```yaml
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels: { app: backend }
                topologyKey: kubernetes.io/hostname   # tránh cùng node
```

**Observability** — cắm `ServiceMonitor` để Prometheus scrape `/metrics`, tối thiểu cần: request rate, error rate, latency p99 (RED metrics) và tài nguyên Pod. Không quan sát được = bay đêm không đèn.

Lệnh xác minh nhanh sau khi deploy:

```bash
kubectl get pods -n shop -o wide          # tất cả Running & Ready?
kubectl get hpa -n shop                   # HPA có đọc được metric (không <unknown>)?
kubectl describe ingress shop-ingress -n shop   # có địa chỉ + TLS?
kubectl rollout status deploy/backend -n shop   # rollout xong?
kubectl get events -n shop --sort-by=.lastTimestamp | tail -20
```

---

## 7. Tóm tắt
- **Production-ready** = tự lành + co giãn + bảo mật + quan sát được + deploy lại không sợ, chứ không chỉ "app chạy".
- Chọn workload theo **bản chất trạng thái**: stateless → **Deployment**, stateful (Redis) → **StatefulSet + PVC + Service headless**.
- Mỗi container cần **3 probe đúng vai** (liveness restart, readiness rút khỏi Service, startup gác app chậm boot) và **requests/limits** — requests còn là mẫu số cho HPA và scheduler.
- Chỉ frontend lộ ra qua **Ingress + TLS**; backend/Redis là **ClusterIP nội bộ**; **NetworkPolicy default-deny** siết luồng đúng sơ đồ; **RBAC + SA riêng** theo least-privilege.
- **HPA** co giãn theo CPU; **PDB** + anti-affinity giữ dịch vụ sống khi bảo trì/node chết.
- Đóng gói bằng **Helm** (một release có version, upgrade/rollback một lệnh), triển khai bằng **GitOps/ArgoCD** (Git là nguồn sự thật, tự đồng bộ, audit + selfHeal).
- Luôn chạy qua **Production Checklist** trước khi công bố "xong".

> Chúc mừng — bạn đã đi hết course và tự tay dựng một triển khai Kubernetes đúng chuẩn production. Bước tiếp theo trong sự nghiệp: đào sâu **service mesh** (mTLS, traffic shaping), **multi-cluster**, và **cost/FinOps** cho cụm lớn.
