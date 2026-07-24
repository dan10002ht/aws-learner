# Bài 14 — Helm: đóng gói & quản lý ứng dụng k8s

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao** quản lý app bằng manifest thô nhân bản cho từng môi trường (dev/staging/prod) sinh ra trùng lặp và lệch cấu hình.
- Hiểu **Helm** là *package manager cho Kubernetes*: **chart**, **template**, **values**, **release**, **revision**.
- Viết được một **chart** đầy đủ (cấu trúc thư mục, `Chart.yaml`, `templates/`, `values.yaml`) với template Go: `{{ .Values.x }}`, helper `_helpers.tpl`, `range`/`if`.
- Vận hành: `helm install/upgrade/rollback/list`, **override values theo môi trường**, khai báo **dependency (subchart)**, publish lên **chart repository**.
- So sánh Helm với **Kustomize** để chọn đúng công cụ.

---

## 2. Lý thuyết

### 2.1 Vấn đề: một app = chục manifest × nhiều môi trường

Một app "thật" hiếm khi chỉ có một file YAML. Điển hình bạn có: `Deployment`, `Service`, `Ingress`, `ConfigMap`, `Secret`, `HorizontalPodAutoscaler`, `ServiceAccount`, `PodDisruptionBudget`... — dễ cả chục manifest cho **một** service.

Rồi bạn cần chạy ở **ba** môi trường, khác nhau ở vài chỗ nhỏ:

| Khác nhau ở đâu | dev | staging | prod |
|-----------------|-----|---------|------|
| `replicas` | 1 | 2 | 6 |
| image tag | `latest` | `v2.3.0-rc1` | `v2.2.4` |
| CPU/mem limit | nhỏ | vừa | lớn |
| Ingress host | `dev.app.local` | `stg.app.io` | `app.io` |
| bật autoscaling? | không | có | có |

Cách "sao chép cả thư mục YAML rồi sửa tay" cho mỗi môi trường dẫn tới:

- **Trùng lặp**: 90% nội dung giống nhau, chỉ 10% khác — nhưng bạn duy trì 3 bản.
- **Lệch cấu hình (drift)**: sửa một field ở prod, quên đồng bộ về staging → sự cố khó tái hiện.
- **Không có "đơn vị" cài/gỡ**: cài 12 file rồi muốn xoá sạch phải nhớ đúng 12 file; sót một `Secret` là rác treo lại.
- **Không có lịch sử & rollback ở cấp app**: `kubectl apply` chỉ biết từng object, không biết "phiên bản 5 của cả app này gồm những gì".

Helm sinh ra để giải đúng bốn nỗi đau này: **template hoá** phần chung, **tham số hoá** phần khác biệt, gom mọi object thành **một release có phiên bản** để cài/nâng/lui/gỡ trong một lệnh.

### 2.2 Helm là package manager cho Kubernetes

Nghĩ theo analogy quen thuộc: trên Ubuntu bạn có `apt`, trên macOS có `brew`. Bạn không tự tay chép từng file nhị phân — bạn `apt install nginx` và nó lo phần còn lại. **Helm** đóng vai trò tương tự cho k8s, với ba khái niệm hạt nhân:

<svg viewBox="0 0 680 250" role="img" aria-labelledby="hm-t hm-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="hm-t">Chart, Values và Release trong Helm</title>
<desc id="hm-d">Chart (template) kết hợp với Values (tham số theo môi trường) qua bước render, sinh ra manifest và cài thành một Release có phiên bản trong cluster</desc>
<rect x="20" y="70" width="150" height="110" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="98" text-anchor="middle" font-size="13" fill="currentColor">Chart</text>
<text x="95" y="118" text-anchor="middle" font-size="10" fill="currentColor">templates/*.yaml</text>
<text x="95" y="134" text-anchor="middle" font-size="10" fill="currentColor">Chart.yaml</text>
<text x="95" y="150" text-anchor="middle" font-size="10" fill="currentColor">values.yaml</text>
<text x="95" y="166" text-anchor="middle" font-size="10" fill="currentColor">(khuôn + mặc định)</text>
<rect x="20" y="195" width="150" height="44" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="214" text-anchor="middle" font-size="12" fill="currentColor">Values override</text>
<text x="95" y="230" text-anchor="middle" font-size="10" fill="currentColor">values-prod.yaml</text>
<rect x="280" y="95" width="130" height="60" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="345" y="120" text-anchor="middle" font-size="12" fill="currentColor">helm render</text>
<text x="345" y="138" text-anchor="middle" font-size="10" fill="currentColor">template + values</text>
<rect x="500" y="60" width="160" height="60" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="85" text-anchor="middle" font-size="12" fill="currentColor">Manifest thật</text>
<text x="580" y="103" text-anchor="middle" font-size="10" fill="currentColor">YAML đã điền giá trị</text>
<rect x="500" y="140" width="160" height="76" rx="10" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="580" y="166" text-anchor="middle" font-size="12" fill="currentColor">Release</text>
<text x="580" y="184" text-anchor="middle" font-size="10" fill="currentColor">app đã cài trong cluster</text>
<text x="580" y="200" text-anchor="middle" font-size="10" fill="currentColor">revision 1, 2, 3...</text>
<line x1="170" y1="125" x2="278" y2="125" stroke="currentColor" stroke-width="1.3" marker-end="url(#ha)"/>
<line x1="170" y1="217" x2="240" y2="217" stroke="currentColor" stroke-width="1.3"/>
<line x1="240" y1="217" x2="240" y2="150" stroke="currentColor" stroke-width="1.3"/>
<line x1="240" y1="150" x2="278" y2="140" stroke="currentColor" stroke-width="1.3" marker-end="url(#ha)"/>
<line x1="410" y1="115" x2="498" y2="95" stroke="currentColor" stroke-width="1.3" marker-end="url(#ha)"/>
<line x1="580" y1="120" x2="580" y2="138" stroke="currentColor" stroke-width="1.3" marker-end="url(#ha)"/>
<defs><marker id="ha" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Chart**: gói phần mềm k8s — thư mục chứa template + giá trị mặc định. Tương đương "cái package `.deb`".
- **Values**: bảng tham số điền vào template. `values.yaml` trong chart là mặc định; bạn **override** cho từng môi trường.
- **Release**: **một lần cài** một chart vào một namespace, mang tên riêng (vd `web-prod`). Cài chart hai lần = hai release độc lập. Mỗi lần `upgrade` sinh một **revision** mới, giữ lịch sử để **rollback**.

Điểm mấu chốt: **Helm render ở phía client** thành manifest thuần rồi mới gửi cho API server. Cluster không "chạy Helm"; nó chỉ nhận YAML đã hoàn chỉnh. Helm lưu trạng thái mỗi release vào một `Secret` trong chính namespace đó (Helm 3 bỏ Tiller — không còn component server-side).

### 2.3 Cấu trúc một chart

Sinh khung bằng `helm create web` rồi tinh gọn. Bố cục tối thiểu:

```
web/
├── Chart.yaml          # metadata: tên, version, appVersion, dependencies
├── values.yaml         # giá trị mặc định (dev-friendly)
├── charts/             # subchart (dependency) được kéo về đây
├── templates/
│   ├── _helpers.tpl    # hàm/định nghĩa dùng lại (named templates)
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   └── NOTES.txt       # thông điệp in ra sau khi cài
└── .helmignore
```

`Chart.yaml` — "danh thiếp" của chart:

```yaml
apiVersion: v2
name: web
description: Web frontend cho hệ thống bán hàng
type: application
version: 1.4.0          # phiên bản CỦA CHART (theo semver) — đổi khi sửa template
appVersion: "2.2.4"     # phiên bản CỦA APP bên trong (chỉ để hiển thị)
dependencies:
  - name: redis
    version: "18.6.1"
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled   # chỉ cài subchart khi bật cờ này
```

Phân biệt rõ: **`version`** là phiên bản của *gói chart* (bump khi bạn sửa template/logic); **`appVersion`** chỉ ghi chú *app* đóng trong đó là bản mấy — hai thứ tiến hoá độc lập.

### 2.4 Template Go: biến app cứng thành khuôn

Template Helm dùng **Go template** kèm thư viện **Sprig**. Ví dụ `templates/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "web.fullname" . }}
  labels:
    {{- include "web.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "web.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "web.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.targetPort }}
          {{- with .Values.resources }}
          resources:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          env:
            {{- range $k, $v := .Values.env }}
            - name: {{ $k }}
              value: {{ $v | quote }}
            {{- end }}
```

Đọc kỹ vài idiom cốt lõi — đây là chỗ 80% người mới vấp:

- **`.Values.x`**: đọc giá trị từ `values.yaml` (đã merge với override). `.Chart.Name`, `.Release.Name`, `.Release.Namespace` là các object dựng sẵn.
- **`{{- ... }}` và `... -}}`**: dấu `-` *cắt khoảng trắng* phía đó. YAML nhạy cảm với thụt lề nên cắt whitespace là bắt buộc, nếu không render ra YAML vỡ.
- **`nindent N`**: xuống dòng rồi thụt `N` khoảng trắng cho *cả khối* — dùng khi chèn block con vào đúng cấp. `indent` thì không thêm newline đầu.
- **`toYaml .`**: biến một nhánh values (object/list) thành YAML nguyên vẹn — tránh phải liệt kê từng field.
- **`| default X`**: nếu giá trị rỗng thì lấy `X`. Ở trên: thiếu `image.tag` thì rơi về `appVersion`.
- **`| quote`**: bọc nháy — bắt buộc cho env value vì `"true"`/`"8080"` phải là string, không phải bool/number.
- **`range $k, $v := .Values.env`**: lặp qua map để sinh danh sách env động.
- **`if` / `with`**: `if` rẽ nhánh (ở trên: chỉ đặt `replicas` khi *không* bật autoscaling — nếu bật thì HPA quản lý số bản, đặt cứng `replicas` sẽ đánh nhau với HPA). `with` vừa kiểm tra tồn tại vừa đổi ngữ cảnh `.` vào nhánh đó.

**Helper** trong `templates/_helpers.tpl` — gom logic dùng lại, tránh lặp:

```
{{- define "web.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "web.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "web.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
```

`include "web.fullname" .` gọi named template và truyền toàn bộ ngữ cảnh `.`. Lưu ý `trunc 63`: tên tài nguyên k8s tối đa 63 ký tự nên helper chủ động cắt cho an toàn.

### 2.5 Values theo môi trường

`values.yaml` mặc định (nghiêng về dev cho dễ chạy local):

```yaml
replicaCount: 1
image:
  repository: registry.io/shop/web
  tag: ""                 # rỗng → dùng appVersion
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 80
  targetPort: 8080
ingress:
  enabled: false
autoscaling:
  enabled: false
resources: {}
env:
  LOG_LEVEL: debug
redis:
  enabled: false
```

Chỉ khai báo **phần khác biệt** cho prod trong `values-prod.yaml`:

```yaml
replicaCount: 6
image:
  tag: "2.2.4"
ingress:
  enabled: true
  hosts:
    - host: app.io
      paths: [{ path: /, pathType: Prefix }]
autoscaling:
  enabled: true
  minReplicas: 4
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
resources:
  requests: { cpu: 250m, memory: 256Mi }
  limits:   { cpu: "1",  memory: 512Mi }
env:
  LOG_LEVEL: info
redis:
  enabled: true
```

Helm **merge sâu** (deep-merge): file override chỉ cần chứa field muốn đổi, phần còn lại kế thừa từ `values.yaml`. Đây chính là thứ giết trùng lặp — một khuôn, nhiều bảng tham số mỏng.

Thứ tự ưu tiên (sau đè trước): `values.yaml` của chart → của subchart cha đè con → `-f values-prod.yaml` → `--set key=value` trên dòng lệnh.

### 2.6 Vòng đời release: install → upgrade → rollback

<svg viewBox="0 0 660 180" role="img" aria-labelledby="rv-t rv-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="rv-t">Vòng đời revision của một Helm release</title>
<desc id="rv-d">install tạo revision 1, mỗi upgrade tạo revision kế tiếp, rollback tạo revision mới sao chép lại một revision cũ</desc>
<rect x="20" y="60" width="120" height="52" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="80" y="82" text-anchor="middle" font-size="12" fill="currentColor">rev 1</text>
<text x="80" y="100" text-anchor="middle" font-size="10" fill="currentColor">install</text>
<rect x="180" y="60" width="120" height="52" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="240" y="82" text-anchor="middle" font-size="12" fill="currentColor">rev 2</text>
<text x="240" y="100" text-anchor="middle" font-size="10" fill="currentColor">upgrade v2.3</text>
<rect x="340" y="60" width="120" height="52" rx="9" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="400" y="82" text-anchor="middle" font-size="12" fill="currentColor">rev 3</text>
<text x="400" y="100" text-anchor="middle" font-size="10" fill="currentColor">upgrade LỖI</text>
<rect x="500" y="60" width="140" height="52" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="82" text-anchor="middle" font-size="12" fill="currentColor">rev 4</text>
<text x="570" y="100" text-anchor="middle" font-size="10" fill="currentColor">rollback về rev 2</text>
<line x1="140" y1="86" x2="178" y2="86" stroke="currentColor" stroke-width="1.3" marker-end="url(#rva)"/>
<line x1="300" y1="86" x2="338" y2="86" stroke="currentColor" stroke-width="1.3" marker-end="url(#rva)"/>
<line x1="460" y1="86" x2="498" y2="86" stroke="currentColor" stroke-width="1.3" marker-end="url(#rva)"/>
<path d="M240,60 C240,25 400,25 400,25 C500,25 560,40 570,58" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="405" y="18" text-anchor="middle" font-size="10" fill="currentColor">rev 4 = bản sao nội dung của rev 2</text>
<defs><marker id="rva" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Các lệnh vận hành hằng ngày:

```bash
# Xem trước YAML render ra mà KHÔNG cài (bắt lỗi template sớm)
helm template web-prod ./web -f values-prod.yaml

# Cài lần đầu → tạo release "web-prod", revision 1
helm install web-prod ./web -n shop --create-namespace -f values-prod.yaml

# Nâng cấp: đổi tag lên 2.3.0 → revision 2
helm upgrade web-prod ./web -n shop -f values-prod.yaml --set image.tag=2.3.0

# install-hoặc-upgrade trong một lệnh (idempotent, hợp cho CI/CD)
helm upgrade --install web-prod ./web -n shop -f values-prod.yaml --atomic --wait

# Liệt kê release & xem lịch sử revision
helm list -n shop
helm history web-prod -n shop

# Có sự cố → quay lui về revision 2 (tạo revision mới sao chép rev 2)
helm rollback web-prod 2 -n shop

# Xem values thực tế đang chạy của release
helm get values web-prod -n shop

# Gỡ sạch toàn bộ object của release
helm uninstall web-prod -n shop
```

Hai cờ đáng thuộc lòng cho production:
- **`--atomic`**: nếu upgrade thất bại (timeout, Pod không sẵn sàng), Helm **tự rollback** về revision trước, không để release kẹt nửa vời.
- **`--wait`**: chờ tới khi mọi resource sẵn sàng (Deployment đủ replica ready) mới báo thành công — biến "apply xong" thành "thật sự chạy được".

### 2.7 Dependency (subchart)

App thật thường cần thành phần đi kèm: Redis, PostgreSQL, RabbitMQ... Thay vì tự viết template, khai báo chúng làm **dependency** trong `Chart.yaml` (mục 2.3). Rồi:

```bash
helm dependency update ./web   # kéo subchart về thư mục charts/, ghi Chart.lock
```

Cấu hình subchart bằng cách lồng values dưới **tên subchart**:

```yaml
# values-prod.yaml — điều khiển subchart redis
redis:
  enabled: true          # khớp condition trong Chart.yaml
  architecture: standalone
  auth:
    password: "s3cr3t"
```

`condition: redis.enabled` cho phép bật/tắt subchart theo môi trường: dev tắt Redis dùng in-memory, prod bật cluster Redis — cùng một chart cha. `Chart.lock` ghim đúng version subchart để build lặp lại được (reproducible), giống `package-lock.json`.

### 2.8 Chart repository

Chart được chia sẻ qua **repository** — một HTTP server phục vụ các `.tgz` đã đóng gói kèm file chỉ mục `index.yaml`:

```bash
# Thêm repo công khai rồi cài chart có sẵn
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm search repo bitnami/redis
helm install cache bitnami/redis -n shop

# Đóng gói & publish chart của bạn
helm package ./web                       # sinh web-1.4.0.tgz
helm repo index . --url https://charts.shop.io   # cập nhật index.yaml
# rồi đẩy .tgz + index.yaml lên web server / S3 / GitHub Pages
```

Xu hướng hiện đại: đẩy chart vào **OCI registry** (cùng nơi chứa image) thay vì HTTP repo:

```bash
helm push web-1.4.0.tgz oci://registry.io/charts
helm install web-prod oci://registry.io/charts/web --version 1.4.0 -n shop
```

### 2.9 Helm vs Kustomize

Cả hai giải bài toán "một base, nhiều môi trường" nhưng theo hai triết lý trái ngược: Helm **template** (chèn biến vào khuôn), Kustomize **patch overlay** (đắp bản vá lên YAML thật).

| Tiêu chí | **Helm** | **Kustomize** |
|----------|----------|---------------|
| Cách biến đổi | Template Go + values | Patch/overlay lên YAML nguyên gốc |
| YAML gốc | Là *template*, có `{{ }}` — không apply thẳng được | Là YAML k8s hợp lệ, apply được luôn |
| Tham số hoá | `.Values.x` tuỳ ý ở bất cứ đâu | Chỉ đổi field qua patch/replacements |
| Đóng gói & chia sẻ | Có: chart repo, versioning, dependency | Không có khái niệm package/version sẵn |
| Vòng đời release | Có: install/upgrade/rollback, lịch sử | Không — chỉ sinh YAML, `kubectl apply` lo phần còn |
| Cài sẵn trong kubectl | Không (cài riêng) | Có: `kubectl apply -k` |
| Điểm yếu | Template lồng nhau khó đọc, dễ vỡ thụt lề | Khó biểu diễn logic điều kiện phức tạp |

Nguyên tắc chọn: **Kustomize** hợp khi bạn *sở hữu* YAML và chỉ cần vá vài khác biệt giữa các môi trường, muốn giữ mọi thứ là YAML k8s thuần. **Helm** hợp khi bạn cần **đóng gói để phân phối** (chia sẻ app cho người khác cài), cần **logic điều kiện** (`if`/`range`), hay cần **quản lý release có phiên bản + rollback**. Trong thực tế nhiều đội dùng cả hai: cài chart bên thứ ba bằng Helm, rồi `helm template` xuất YAML và dùng Kustomize overlay để tinh chỉnh lần cuối.

---

## 3. Tình huống thực tế & con số

- **Trước Helm**: repo chứa `k8s/dev/`, `k8s/staging/`, `k8s/prod/`, mỗi thư mục 12 file gần như trùng nhau → ~36 file phải đồng bộ tay. Một lần sửa `resources.limits` ở prod quên chép về staging khiến bug OOM chỉ tái hiện trên prod.
- **Sau Helm**: 1 chart (12 template) + 3 file values mỏng (mỗi file ~15 dòng). Đổi `image.tag` deploy prod chỉ là `helm upgrade --install ... --set image.tag=2.3.1 --atomic`.
- **Sự cố & rollback**: bản v2.3.0 rò rỉ bộ nhớ, phát hiện sau 4 phút. `helm rollback web-prod 2` đưa cả app (Deployment + ConfigMap + HPA) về đúng trạng thái revision 2 trong một lệnh, không cần nhớ đã đổi những object nào.

---

## 4. Tóm tắt
- Quản lý app k8s bằng manifest thô nhân bản cho từng môi trường gây **trùng lặp, drift, không có đơn vị cài/gỡ và rollback ở cấp app**.
- **Helm** là *package manager* cho k8s: **chart** (khuôn: `Chart.yaml` + `templates/` + `values.yaml`), **template Go** (`{{ .Values.x }}`, helper `include`, `range`/`if`/`with`, `nindent`/`toYaml`), **release** (một lần cài) và **revision** (lịch sử để rollback).
- Một khuôn + nhiều **values override** mỏng (deep-merge) diệt trùng lặp giữa dev/staging/prod. Vận hành bằng `install/upgrade/rollback/list`; dùng `--atomic --wait` cho production.
- **Dependency (subchart)** kéo thành phần đi kèm (Redis/DB) và bật/tắt theo `condition`; **chart repository** (HTTP hoặc OCI) để chia sẻ.
- **Kustomize** patch overlay trên YAML thật, gọn và có sẵn trong kubectl; **Helm** template hoá + đóng gói + quản lý release — chọn theo nhu cầu phân phối và logic điều kiện.

> **Bài tiếp theo (Bài 15):** từ "gói app" lên "vận hành app có trạng thái phức tạp" — **Operator & CRD**: mở rộng chính Kubernetes bằng controller tự viết để tự động hoá các tác vụ mà Deployment không lo nổi.
