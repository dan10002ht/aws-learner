# Bài 4 — Pod: đơn vị chạy nhỏ nhất & health probes

## 1. Mục tiêu
Sau bài này bạn có thể:
- Hiểu **Pod là gì** và vì sao Kubernetes không chạy container "trần" mà bọc trong Pod.
- Giải thích Pod = **1+ container chia sẻ network namespace (cùng `localhost`) + volume**, và các mẫu **sidecar** và **init container**.
- Nắm **pod lifecycle** (Pending/Running/Succeeded/Failed) và `restartPolicy`.
- Cấu hình **3 loại health probe** đúng chỗ: **liveness** (chết thì restart), **readiness** (chưa sẵn sàng thì gỡ khỏi Service), **startup** (app khởi động chậm).
- Hiểu **vì sao thiếu probe gây lỗi ngầm** — traffic chảy vào Pod chưa sẵn sàng hoặc đã treo.

---

## 2. Lý thuyết

### 2.1 Pod là gì — và vì sao không phải là container

Ở [[cn-01-why-orchestration]] ta nói K8s điều phối container. Nhưng đơn vị nhỏ nhất mà K8s **lên lịch (schedule) và quản lý không phải container, mà là Pod**.

**Analogy:** container giống một **người thợ** làm một việc. Pod giống một **buồng làm việc chung** — có thể chứa một thợ (thường gặp), hoặc vài thợ ngồi cùng bàn, dùng chung **một số điện thoại nội bộ** (network) và **một tủ hồ sơ** (volume). K8s không thuê từng thợ lẻ; nó cấp/thu hồi cả cái buồng.

Bản chất kỹ thuật: mọi container trong **cùng một Pod**:
- Chia sẻ **network namespace** → cùng một địa chỉ IP, cùng dải cổng, **gọi nhau qua `localhost`**. Hai container trong Pod **không được** nghe cùng một cổng (đụng độ).
- Chia sẻ được **volume** → cùng đọc/ghi một thư mục nếu cùng mount.
- Chia sẻ **IPC** và **lifecycle** → K8s đặt/lấy cả Pod về một node duy nhất; không thể "một nửa Pod ở node A, nửa kia ở node B".

<svg viewBox="0 0 620 250" role="img" aria-labelledby="pd-t pd-d" style="width:100%;max-width:580px;height:auto;display:block;margin:1.25rem auto">
<title id="pd-t">Cấu trúc một Pod chia sẻ network và volume</title>
<desc id="pd-d">Một Pod bao gồm nhiều container chia sẻ chung một địa chỉ IP gọi nhau qua localhost và một volume dùng chung</desc>
<rect x="30" y="20" width="560" height="210" rx="14" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="55" y="46" font-size="13" fill="currentColor">Pod — IP 10.1.4.7 (1 network namespace)</text>
<rect x="60" y="66" width="180" height="70" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="150" y="94" text-anchor="middle" font-size="12" fill="currentColor">Container chính</text>
<text x="150" y="113" text-anchor="middle" font-size="10" fill="currentColor">app :8080</text>
<rect x="380" y="66" width="180" height="70" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="470" y="94" text-anchor="middle" font-size="12" fill="currentColor">Sidecar</text>
<text x="470" y="113" text-anchor="middle" font-size="10" fill="currentColor">log-shipper :2020</text>
<line x1="240" y1="101" x2="380" y2="101" stroke="currentColor" stroke-width="1.3" marker-end="url(#pa)"/>
<text x="310" y="93" text-anchor="middle" font-size="10" fill="currentColor">localhost</text>
<rect x="60" y="160" width="500" height="52" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="190" text-anchor="middle" font-size="11" fill="currentColor">Volume dùng chung  /var/log/app  (cả hai cùng mount)</text>
<line x1="150" y1="136" x2="150" y2="160" stroke="currentColor" stroke-width="1"/>
<line x1="470" y1="136" x2="470" y2="160" stroke="currentColor" stroke-width="1"/>
<defs><marker id="pa" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Vì sao K8s cần lớp Pod thay vì lên lịch container thẳng? Vì nhiều tác vụ phụ trợ (thu log, proxy, đồng bộ file) muốn chạy **cạnh** app, **cùng vòng đời**, **chung mạng/đĩa** — nhưng vẫn là **process/container tách biệt** để đóng gói và nâng cấp độc lập. Pod là "keo dán" gom chúng thành một đơn vị lên lịch.

### 2.2 Một Pod nên có bao nhiêu container?

Mặc định và phổ biến nhất: **một container chính cho mỗi Pod**. Muốn thêm bản sao thì thêm Pod (qua Deployment), **không** nhồi nhiều bản app vào một Pod. Chỉ gộp thêm container khi nó thật sự cần **chung mạng/đĩa/vòng đời** với app chính:

| Mẫu | Vai trò | Chạy khi nào | Ví dụ |
|-----|---------|--------------|-------|
| **Container chính** | Nghiệp vụ chính | Suốt đời Pod | web app, API server |
| **Sidecar** | Hỗ trợ app chính | Song song, suốt đời Pod | thu/đẩy log, proxy mesh (Envoy), làm mới config, TLS |
| **Init container** | Chuẩn bị trước | **Chạy xong rồi thoát**, trước container chính | migrate DB, tải asset, chờ dependency sẵn sàng |

**Init container** khác biệt ở chỗ chúng chạy **tuần tự tới khi thành công** rồi mới tới lượt container chính khởi động. Nếu init thất bại, K8s **restart cả Pod** (theo `restartPolicy`) — app chính **chưa bao giờ** chạy khi môi trường chưa sẵn sàng. Đây là cách đảm bảo "chỉ chạy app khi DB đã migrate xong / secret đã tải xong".

**Sidecar** thì chạy **đồng thời** với app suốt đời Pod. Ví dụ kinh điển: app ghi log ra file trong volume chung, sidecar `fluent-bit` đọc file đó và đẩy về hệ thống log tập trung — app **không cần biết** gì về hạ tầng log.

### 2.3 Pod lifecycle & restartPolicy

Pod có một trường **`phase`** tóm tắt vòng đời (đây là góc nhìn ở mức Pod, không phải trạng thái từng container):

<svg viewBox="0 0 660 210" role="img" aria-labelledby="lc-t lc-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="lc-t">Các phase trong vòng đời của một Pod</title>
<desc id="lc-d">Pod đi từ Pending sang Running rồi tuỳ loại workload kết thúc ở Succeeded hoặc Failed</desc>
<rect x="30" y="80" width="130" height="50" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="102" text-anchor="middle" font-size="12" fill="currentColor">Pending</text>
<text x="95" y="119" text-anchor="middle" font-size="9" fill="currentColor">đang xếp lịch / kéo image</text>
<rect x="240" y="80" width="130" height="50" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="305" y="102" text-anchor="middle" font-size="12" fill="currentColor">Running</text>
<text x="305" y="119" text-anchor="middle" font-size="9" fill="currentColor">container đã chạy</text>
<rect x="470" y="20" width="150" height="50" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="42" text-anchor="middle" font-size="12" fill="currentColor">Succeeded</text>
<text x="545" y="59" text-anchor="middle" font-size="9" fill="currentColor">thoát code 0 (Job)</text>
<rect x="470" y="140" width="150" height="50" rx="9" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="162" text-anchor="middle" font-size="12" fill="currentColor">Failed</text>
<text x="545" y="179" text-anchor="middle" font-size="9" fill="currentColor">thoát code khác 0</text>
<line x1="160" y1="105" x2="238" y2="105" stroke="currentColor" stroke-width="1.3" marker-end="url(#la)"/>
<line x1="370" y1="95" x2="468" y2="55" stroke="currentColor" stroke-width="1.3" marker-end="url(#la)"/>
<line x1="370" y1="115" x2="468" y2="155" stroke="currentColor" stroke-width="1.3" marker-end="url(#la)"/>
<defs><marker id="la" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Pending**: Pod đã được chấp nhận nhưng **chưa** chạy — đang chờ scheduler chọn node, hoặc đang **kéo image**, hoặc chờ init container.
- **Running**: Pod đã bám vào node, **tất cả** container đã tạo, ít nhất một cái đang chạy hoặc đang start/restart.
- **Succeeded**: **mọi** container đã thoát với **code 0** và **không** restart. Chỉ gặp với workload có điểm dừng (Job).
- **Failed**: **mọi** container đã dừng và **ít nhất một** thoát lỗi (code ≠ 0) hoặc bị hệ thống kill.

Cách K8s xử lý container **chết** phụ thuộc **`restartPolicy`** (đặt ở mức Pod, áp cho mọi container trong Pod):

| `restartPolicy` | Ý nghĩa | Dùng cho |
|-----------------|---------|----------|
| **`Always`** (mặc định) | Container thoát (dù code 0) → luôn restart | Service chạy hoài (web, API) — Deployment |
| **`OnFailure`** | Chỉ restart khi thoát lỗi (≠ 0) | Job/batch nên chạy tới khi xong |
| **`Never`** | Không bao giờ restart | Job chỉ chạy một lần |

Lưu ý: một Pod do Deployment quản lý luôn là `Always`; khi container chết nhiều lần liên tiếp, K8s áp **backoff luỹ thừa** (10s, 20s, 40s... tối đa 5 phút) và trạng thái container hiện `CrashLoopBackOff`. Đó là **triệu chứng**, không phải nguyên nhân — luôn xem log/`describe` để tìm gốc.

### 2.4 Health probes — trái tim của self-healing đúng nghĩa

K8s biết container **có process đang sống** hay không (PID còn không). Nhưng "process còn sống" **không** đồng nghĩa với "app khoẻ và sẵn sàng phục vụ": app có thể **treo deadlock**, kẹt vòng lặp, mất kết nối DB — process vẫn chạy nhưng **vô dụng**. K8s không tự đoán được điều đó, nên **bạn phải dạy nó cách kiểm tra** thông qua probe.

Có **3 loại probe**, mỗi loại trả lời một câu hỏi khác nhau và có hậu quả khác nhau:

<svg viewBox="0 0 680 260" role="img" aria-labelledby="pr-t pr-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="pr-t">Ba loại probe và hành động tương ứng</title>
<desc id="pr-d">Startup probe bảo vệ lúc khởi động, liveness restart container khi treo, readiness gỡ Pod khỏi Service khi chưa sẵn sàng</desc>
<rect x="20" y="30" width="200" height="200" rx="11" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="58" text-anchor="middle" font-size="13" fill="currentColor">startup</text>
<text x="120" y="90" text-anchor="middle" font-size="10" fill="currentColor">"App khởi động</text>
<text x="120" y="106" text-anchor="middle" font-size="10" fill="currentColor">xong chưa?"</text>
<text x="120" y="150" text-anchor="middle" font-size="10" fill="currentColor">Chưa xong → hoãn</text>
<text x="120" y="166" text-anchor="middle" font-size="10" fill="currentColor">liveness/readiness</text>
<text x="120" y="200" text-anchor="middle" font-size="10" fill="currentColor">Quá hạn → kill</text>
<rect x="240" y="30" width="200" height="200" rx="11" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="340" y="58" text-anchor="middle" font-size="13" fill="currentColor">liveness</text>
<text x="340" y="90" text-anchor="middle" font-size="10" fill="currentColor">"App còn khoẻ</text>
<text x="340" y="106" text-anchor="middle" font-size="10" fill="currentColor">hay treo?"</text>
<text x="340" y="150" text-anchor="middle" font-size="10" fill="currentColor">Fail → RESTART</text>
<text x="340" y="166" text-anchor="middle" font-size="10" fill="currentColor">container</text>
<rect x="460" y="30" width="200" height="200" rx="11" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="58" text-anchor="middle" font-size="13" fill="currentColor">readiness</text>
<text x="560" y="90" text-anchor="middle" font-size="10" fill="currentColor">"Nhận traffic</text>
<text x="560" y="106" text-anchor="middle" font-size="10" fill="currentColor">được chưa?"</text>
<text x="560" y="150" text-anchor="middle" font-size="10" fill="currentColor">Fail → GỠ khỏi</text>
<text x="560" y="166" text-anchor="middle" font-size="10" fill="currentColor">Service endpoints</text>
<text x="560" y="200" text-anchor="middle" font-size="10" fill="currentColor">(KHÔNG restart)</text>
</svg>

- **liveness probe** — "App còn khoẻ không?" Fail đủ số lần → K8s **kill và restart container** (theo `restartPolicy`). Dùng để thoát khỏi **treo/deadlock** mà process vẫn sống. **Đừng** để liveness kiểm tra dependency ngoài (DB, API bên thứ ba) — DB chập chờn sẽ khiến K8s restart app vô ích, khuếch đại sự cố.
- **readiness probe** — "Sẵn sàng nhận traffic chưa?" Fail → K8s **gỡ Pod khỏi endpoints của Service** nên load balancer **ngừng gửi request** tới nó, **nhưng KHÔNG restart**. Dùng khi app tạm bận (đang warm-up cache, mất kết nối DB tạm thời) — chỉ cần **ngừng nhận traffic** rồi tự hồi. Đây là probe **quan trọng nhất với zero-downtime**.
- **startup probe** — "App khởi động xong chưa?" Dành cho app **khởi động chậm** (JVM cũ, nạp model, migrate). Khi startup **chưa** pass, K8s **tạm hoãn** liveness và readiness. Điều này tránh bi kịch kinh điển: app cần 60s để boot nhưng liveness bắn sau 10s và fail → K8s giết app **trước khi** nó kịp sống → `CrashLoopBackOff` vĩnh viễn.

**Vì sao thiếu probe gây lỗi ngầm?** Nếu **không** khai `readiness`, K8s coi Pod "sẵn sàng" **ngay khi container start** — dù app còn đang nạp cache 30s. Service lập tức route traffic vào → user nhận `502/connection refused` **âm thầm**, không crash, không log rõ, rất khó truy. Trong rolling update, thiếu readiness còn tệ hơn: K8s tưởng Pod mới đã sẵn sàng nên **gỡ Pod cũ** → có khoảng **downtime** dù bạn nghĩ đã "zero-downtime". Thiếu `liveness` thì app **treo im lặng** mãi mà không được cứu, chiếm slot nhưng không phục vụ.

---

## 3. Thực hành: YAML Pod đầy đủ với 3 probe

Pod đơn giản nhất — một container:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web
  labels:
    app: web
spec:
  restartPolicy: Always        # mặc định; container chết là restart
  containers:
    - name: app
      image: nginx:1.27
      ports:
        - containerPort: 80
```

Áp dụng và quan sát vòng đời:

```bash
kubectl apply -f web.yaml
kubectl get pod web -w              # xem chuyển Pending -> Running
kubectl describe pod web           # xem Events: schedule, pull image, start
kubectl logs web                   # log container chính
kubectl exec -it web -- sh         # vào trong container
```

Giờ là Pod "đúng chuẩn production": **init container** chuẩn bị, **container chính** với **đủ 3 probe**, và một **sidecar** đẩy log qua volume chung:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
  labels:
    app: api
spec:
  restartPolicy: Always
  volumes:
    - name: logs
      emptyDir: {}                       # volume tạm chia sẻ giữa các container
  initContainers:
    - name: wait-for-db                  # chạy TRƯỚC, xong mới tới app
      image: busybox:1.36
      command: ['sh', '-c',
        'until nc -z db 5432; do echo "cho DB..."; sleep 2; done']
  containers:
    - name: app                          # CONTAINER CHÍNH
      image: myorg/api:1.4.0
      ports:
        - containerPort: 8080
      volumeMounts:
        - name: logs
          mountPath: /var/log/app        # app ghi log ra đây
      # 1) STARTUP: bảo vệ app khởi động chậm (tối đa 30 x 5s = 150s)
      startupProbe:
        httpGet:
          path: /healthz
          port: 8080
        periodSeconds: 5
        failureThreshold: 30             # cho phép tới 150s để boot
      # 2) LIVENESS: treo/deadlock -> restart container
      livenessProbe:
        httpGet:
          path: /healthz                 # CHỈ kiểm tra chính app, KHÔNG chạm DB
          port: 8080
        periodSeconds: 10
        timeoutSeconds: 2
        failureThreshold: 3              # fail 3 lần liên tiếp -> restart
      # 3) READINESS: chưa sẵn sàng -> gỡ khỏi Service, KHÔNG restart
      readinessProbe:
        httpGet:
          path: /ready                   # /ready CÓ thể kiểm tra DB/cache
          port: 8080
        periodSeconds: 5
        failureThreshold: 3
      resources:
        requests: { cpu: "100m", memory: "128Mi" }
        limits:   { cpu: "500m", memory: "256Mi" }
    - name: log-shipper                  # SIDECAR: chạy song song suốt đời Pod
      image: fluent/fluent-bit:3.1
      volumeMounts:
        - name: logs
          mountPath: /var/log/app        # đọc chung file log của app
          readOnly: true
```

Vài điểm cốt tử để không "cấu hình cho có":

- **Tách endpoint `/healthz` và `/ready`.** `/healthz` (liveness) chỉ nên trả 200 khi **bản thân process** còn xử lý được — **không** gọi DB. `/ready` (readiness) mới được phép kiểm tra dependency (DB, cache) vì mất DB thì nên **ngừng nhận traffic**, chứ không phải **restart**.
- **`failureThreshold` × `periodSeconds` = thời gian chịu đựng.** Liveness ở trên chịu được 3×10 = 30s treo trước khi restart — đủ để bỏ qua GC pause ngắn, không quá dài để app treo lâu.
- **Có `startupProbe` thì đặt liveness/readiness `periodSeconds` ngắn** cũng an toàn, vì chúng chỉ bắt đầu **sau khi** startup pass. Không còn phải nống `initialDelaySeconds` to đùng.
- **`resources.requests`** giúp scheduler đặt Pod đúng chỗ; **`limits`** chặn Pod ngốn tài nguyên hàng xóm (memory vượt limit → container bị **OOMKilled** rồi restart).

Ba kiểu handler cho probe (chọn cái phản ánh đúng "khoẻ"):

```yaml
# a) HTTP GET: coi 200-399 là khoẻ (phổ biến nhất cho web/API)
livenessProbe:
  httpGet: { path: /healthz, port: 8080 }

# b) TCP socket: chỉ cần mở được cổng (cho service không có HTTP, vd DB)
readinessProbe:
  tcpSocket: { port: 5432 }

# c) Exec: chạy lệnh trong container, exit code 0 = khoẻ
livenessProbe:
  exec:
    command: ['cat', '/tmp/healthy']
```

Kiểm tra probe hoạt động:

```bash
kubectl get pod api                    # cột READY: 1/2 nghĩa là readiness CHƯA pass
kubectl describe pod api               # Events: "Readiness probe failed: ..."
kubectl get endpoints                  # Pod chỉ xuất hiện khi readiness PASS
```

> Mẹo debug quan trọng: cột **`READY 0/1`** kéo dài = readiness đang fail → Pod **không nhận traffic** dù `STATUS` là `Running`. Còn **`RESTARTS`** tăng đều = liveness đang giết container (hoặc OOM). Hai triệu chứng, hai loại probe — đọc đúng cột mới sửa đúng chỗ.

---

## 4. Tình huống thực tế

**Sự cố "504 sau mỗi lần deploy".** Một team deploy API 8 replica, mỗi lần rollout lại có ~15 giây khách nhận 504. Nguyên nhân: **không có readiness probe**. App cần ~8s nạp cache lúc boot; K8s thấy container `Running` là route traffic ngay, 8 giây đầu mỗi Pod mới trả lỗi. Thêm `readinessProbe` trỏ `/ready` (chỉ trả 200 sau khi cache nạp xong) → downtime về **0**: K8s chỉ đưa Pod vào Service **sau khi** `/ready` pass, và trong rolling update chỉ gỡ Pod cũ khi Pod mới đã ready.

**Sự cố "CrashLoopBackOff lúc scale up".** App Java boot mất ~45s (JIT + nạp config). Liveness đặt `initialDelaySeconds: 20` → tới giây 20 liveness fail (app chưa boot xong) → K8s kill → lặp mãi. Sửa: thêm **`startupProbe`** với `failureThreshold: 30, periodSeconds: 5` (cho tối đa 150s boot); liveness chỉ chạy **sau** khi startup pass → hết crash loop.

---

## 5. Tóm tắt
- **Pod** là đơn vị lên lịch nhỏ nhất của K8s: 1+ container **chia sẻ network namespace (cùng `localhost`) + volume + vòng đời**, luôn nằm trọn trên **một** node.
- Thường **1 container chính**; thêm **sidecar** (log/proxy/config, chạy song song) hoặc **init container** (chạy trước, chuẩn bị xong mới tới app) khi thật sự cần chung mạng/đĩa/vòng đời.
- **Lifecycle**: Pending → Running → (Succeeded | Failed); **`restartPolicy`** (`Always`/`OnFailure`/`Never`) quyết định cách xử lý container chết; crash liên tục → `CrashLoopBackOff` (triệu chứng).
- **3 probe**: **liveness** (treo → restart), **readiness** (chưa sẵn sàng → gỡ khỏi Service, không restart), **startup** (che liveness/readiness cho app boot chậm). Tách `/healthz` (không chạm DB) và `/ready` (được chạm DB).
- **Thiếu probe = lỗi ngầm**: thiếu readiness → traffic vào Pod chưa sẵn sàng và downtime khi rollout; thiếu liveness → app treo im lặng không được cứu.

> **Bài tiếp theo (Bài 5):** từ Pod đơn lẻ lên **Deployment** — quản lý nhiều bản sao, rolling update và rollback tự động, để không phải tạo Pod bằng tay.
