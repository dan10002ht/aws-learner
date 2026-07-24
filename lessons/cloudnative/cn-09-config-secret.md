# Bài 9 — ConfigMap, Secret & cấu hình ứng dụng

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao phải tách config khỏi image** theo triết lý **12-factor**: một image build một lần, chạy được ở mọi môi trường (dev/staging/prod).
- Dùng **ConfigMap** để lưu cấu hình dạng key-value và tiêm vào Pod bằng **env var** hoặc **mount thành file**.
- Dùng **Secret** cho dữ liệu nhạy cảm, và hiểu **sự thật phũ phàng**: Secret mặc định chỉ **base64**, **KHÔNG mã hoá** — cần **encryption-at-rest** cho etcd và/hoặc **external secret manager** (Vault, External Secrets Operator).
- Dùng **Downward API** để Pod tự đọc metadata của chính nó.
- Hiểu **vấn đề reload**: mount file thì tự cập nhật, còn env var thì **không** — và cách xử lý.

---

## 2. Lý thuyết

### 2.1 Vì sao tách config khỏi image? (12-factor, Factor III)

Hãy tưởng tượng image như một **quyển sách đã in**. Nếu bạn in thẳng địa chỉ database, mật khẩu, feature-flag vào từng trang, thì mỗi khi đổi môi trường (dev → prod) bạn phải **in lại cả quyển sách**. Cách đúng là để những chỗ đó **trống**, rồi **kẹp một tờ giấy note** (config) vào lúc phát cho từng người đọc.

Nguyên lý **12-factor Factor III — Config** nói: **cấu hình là thứ thay đổi giữa các môi trường, phải nằm NGOÀI code/image**, tiêm vào lúc chạy. Phép thử đơn giản: *"Có thể open-source image này ngay lúc này mà không lộ bí mật nào không?"* — nếu không, tức là bạn đã nướng config vào image.

Lợi ích cụ thể:

| Nướng config vào image | Tách config ra (12-factor) |
|------------------------|----------------------------|
| Mỗi môi trường một image riêng → build nhiều lần | **Một image** chạy mọi nơi (build 1 lần) |
| Image `prod` khác image `staging` → thứ test không phải thứ deploy | Đúng cái đã test là cái chạy prod |
| Đổi mật khẩu = rebuild + redeploy | Đổi Secret + restart Pod, không rebuild |
| Bí mật nằm trong layer image (ai pull cũng thấy) | Bí mật nằm ở nơi có kiểm soát truy cập |

Kubernetes cung cấp hai đối tượng cho việc này: **ConfigMap** (config thường) và **Secret** (config nhạy cảm).

<svg viewBox="0 0 640 250" role="img" aria-labelledby="tf-t tf-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="tf-t">Một image chạy mọi môi trường nhờ tách config</title>
<desc id="tf-d">Cùng một image app v2 kết hợp với ConfigMap và Secret khác nhau tạo ra runtime cho dev, staging và prod</desc>
<rect x="245" y="20" width="150" height="46" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="40" text-anchor="middle" font-size="12" fill="currentColor">Image app:v2</text>
<text x="320" y="57" text-anchor="middle" font-size="10" fill="currentColor">(build 1 lần)</text>
<rect x="30" y="150" width="170" height="72" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="174" text-anchor="middle" font-size="12" fill="currentColor">DEV</text>
<text x="115" y="193" text-anchor="middle" font-size="10" fill="currentColor">ConfigMap-dev</text>
<text x="115" y="209" text-anchor="middle" font-size="10" fill="currentColor">Secret-dev</text>
<rect x="235" y="150" width="170" height="72" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="174" text-anchor="middle" font-size="12" fill="currentColor">STAGING</text>
<text x="320" y="193" text-anchor="middle" font-size="10" fill="currentColor">ConfigMap-stg</text>
<text x="320" y="209" text-anchor="middle" font-size="10" fill="currentColor">Secret-stg</text>
<rect x="440" y="150" width="170" height="72" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="174" text-anchor="middle" font-size="12" fill="currentColor">PROD</text>
<text x="525" y="193" text-anchor="middle" font-size="10" fill="currentColor">ConfigMap-prod</text>
<text x="525" y="209" text-anchor="middle" font-size="10" fill="currentColor">Secret-prod</text>
<line x1="290" y1="66" x2="115" y2="150" stroke="currentColor" stroke-width="1"/>
<line x1="320" y1="66" x2="320" y2="150" stroke="currentColor" stroke-width="1"/>
<line x1="350" y1="66" x2="525" y2="150" stroke="currentColor" stroke-width="1"/>
<text x="320" y="120" text-anchor="middle" font-size="10" fill="currentColor">cùng binary + config khác nhau = runtime khác nhau</text>
</svg>

### 2.2 ConfigMap — kho key-value không nhạy cảm

**ConfigMap** lưu cấu hình dạng cặp key-value (hoặc cả file cấu hình). Nó **không mã hoá**, không dành cho bí mật — chỉ là "tờ note" chứa URL, số port, feature-flag, log level, hay nguyên một file `application.yaml`.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: shop
data:
  # 1) Các key-value đơn giản
  LOG_LEVEL: "info"
  MAX_CONNECTIONS: "50"
  FEATURE_NEW_CHECKOUT: "true"
  # 2) Cả một file cấu hình (key = tên file, value = nội dung)
  application.properties: |
    server.port=8080
    cache.ttl=300
    db.pool.size=20
```

Có hai cách tiêm ConfigMap vào Pod:

**Cách A — inject thành biến môi trường (env var):**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web
spec:
  containers:
    - name: web
      image: shop/web:v2
      env:
        # lấy ĐÚNG một key ra một biến (đổi tên tuỳ ý)
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: LOG_LEVEL
      envFrom:
        # đổ TẤT CẢ key thành env var (tên biến = tên key)
        - configMapRef:
            name: app-config
```

**Cách B — mount thành file trong container:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web
spec:
  containers:
    - name: web
      image: shop/web:v2
      volumeMounts:
        - name: cfg
          mountPath: /etc/app        # mỗi key thành 1 file trong thư mục này
          readOnly: true
  volumes:
    - name: cfg
      configMap:
        name: app-config
        # (tuỳ chọn) chỉ chọn vài key và đổi đường dẫn
        items:
          - key: application.properties
            path: application.properties
```

Kết quả cách B: trong container có file `/etc/app/application.properties` với đúng nội dung đã khai báo. Đây là cách gọn để cấp **file cấu hình nguyên khối** cho app (nginx.conf, application.yaml...) mà không nướng vào image.

> **Khi nào env, khi nào mount?** Env hợp với vài giá trị lẻ, đơn giản. Mount hợp với file cấu hình lớn, hoặc khi cần **auto-reload** (mục 2.6). Env var còn có rủi ro lộ khi app in ra `env` hoặc gửi crash-dump.

### 2.3 Secret — giống ConfigMap nhưng cho dữ liệu nhạy cảm

**Secret** có cấu trúc gần như y hệt ConfigMap, dùng cho mật khẩu, token, khoá API, chứng chỉ TLS. Cách tiêm (env / mount) cũng giống hệt. Điểm khác chỉ là value được lưu **base64**:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
  namespace: shop
type: Opaque          # loại chung; còn có kubernetes.io/tls, dockerconfigjson...
data:
  # value phải base64: echo -n 's3cr3t!' | base64  ->  czNjcjN0IQ==
  DB_PASSWORD: czNjcjN0IQ==
stringData:
  # stringData: bạn ghi plaintext, k8s tự base64 khi lưu (tiện hơn)
  DB_USER: shop_app
```

Tiêm y hệt ConfigMap, chỉ đổi `configMapKeyRef` → `secretKeyRef`, `configMap:` → `secret:`:

```yaml
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: DB_PASSWORD
      volumeMounts:
        - name: certs
          mountPath: /etc/tls
          readOnly: true
  volumes:
    - name: certs
      secret:
        secretName: tls-secret
        defaultMode: 0400     # chỉ owner đọc được
```

### 2.4 ⚠️ Sự thật phũ phàng: Secret KHÔNG được mã hoá

Đây là **hiểu lầm nguy hiểm nhất** với người mới. `base64` **không phải là mã hoá** — nó chỉ là cách encode, ai cũng decode ngược được trong 1 giây:

```bash
kubectl get secret db-secret -o jsonpath='{.data.DB_PASSWORD}' | base64 -d
# -> s3cr3t!    (lộ nguyên văn, không cần mật khẩu gì cả)
```

Mặc định, Secret được lưu **plaintext trong etcd** (cơ sở dữ liệu của control plane). Ai đọc được etcd, hoặc có quyền `get secret`, là thấy hết. Vậy Secret "an toàn hơn ConfigMap" ở điểm nào? Chỉ vài lớp mỏng: không bị in ra trong `kubectl describe`, được RBAC quản riêng, có thể giữ trong tmpfs (RAM) khi mount. **Chưa đủ cho production.** Ba lớp phòng thủ thật sự:

<svg viewBox="0 0 640 260" role="img" aria-labelledby="se-t se-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="se-t">Ba lớp bảo vệ Secret trong Kubernetes</title>
<desc id="se-d">Từ base64 mặc định không an toàn, thêm encryption at rest cho etcd, rồi external secret manager và RBAC</desc>
<rect x="180" y="18" width="280" height="46" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="38" text-anchor="middle" font-size="12" fill="currentColor">Mặc định: chỉ base64 trong etcd</text>
<text x="320" y="55" text-anchor="middle" font-size="10" fill="currentColor">KHÔNG an toàn — decode được ngay</text>
<rect x="120" y="92" width="400" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="112" text-anchor="middle" font-size="12" fill="currentColor">Lớp 1 — Encryption at rest cho etcd</text>
<text x="320" y="129" text-anchor="middle" font-size="10" fill="currentColor">EncryptionConfiguration + KMS (aescbc/kms v2)</text>
<rect x="120" y="152" width="400" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="172" text-anchor="middle" font-size="12" fill="currentColor">Lớp 2 — RBAC + audit chặt quyền get secret</text>
<text x="320" y="189" text-anchor="middle" font-size="10" fill="currentColor">least-privilege, không cho Pod đọc bừa</text>
<rect x="120" y="212" width="400" height="42" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="231" text-anchor="middle" font-size="12" fill="currentColor">Lớp 3 — External secret manager</text>
<text x="320" y="247" text-anchor="middle" font-size="10" fill="currentColor">Vault, External Secrets Operator, CSI driver</text>
</svg>

**Lớp 1 — Encryption at rest cho etcd.** Cấu hình `EncryptionConfiguration` trên api-server để mã hoá Secret trước khi ghi xuống etcd. Khuyến nghị dùng provider **kms v2** (nối tới KMS ngoài như AWS KMS/GCP KMS) thay vì tự giữ khoá:

```yaml
# EncryptionConfiguration (truyền cho kube-apiserver qua --encryption-provider-config)
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: ["secrets"]
    providers:
      - kms:                    # ưu tiên KMS: khoá gốc nằm ngoài cluster
          apiVersion: v2
          name: aws-kms
          endpoint: unix:///var/run/kmsplugin/socket.sock
      - identity: {}            # fallback đọc bản cũ chưa mã hoá
```

**Lớp 3 — External secret manager.** Thay vì lưu bí mật thật trong etcd, giữ chúng ở **Vault / AWS Secrets Manager / GCP Secret Manager**, rồi đồng bộ vào cluster khi cần. Phổ biến nhất là **External Secrets Operator (ESO)**: bạn khai báo một `ExternalSecret` trỏ tới kho ngoài, operator tự tạo/đồng bộ Secret k8s tương ứng và xoay vòng (rotate) định kỳ.

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-secret
  namespace: shop
spec:
  refreshInterval: 1h                 # đồng bộ lại mỗi giờ (tự rotate)
  secretStoreRef:
    name: aws-secretsmanager          # đã cấu hình trỏ tới AWS Secrets Manager
    kind: SecretStore
  target:
    name: db-secret                   # tên Secret k8s sẽ được sinh ra
  data:
    - secretKey: DB_PASSWORD          # key trong Secret k8s
      remoteRef:
        key: prod/shop/db             # đường dẫn bí mật trong kho ngoài
        property: password
```

Ưu điểm: bí mật thật **không nằm trong Git**, không nằm cứng trong etcd; nguồn sự thật là kho ngoài có audit + rotation; Git chỉ chứa "con trỏ" (`ExternalSecret`) hoàn toàn an toàn để commit.

### 2.5 Downward API — Pod tự đọc metadata của chính nó

Đôi khi app cần biết **về chính nó**: tên Pod, namespace, node đang chạy, IP, nhãn, hay giới hạn tài nguyên — những thứ này **không** phải config bạn viết, mà do Kubernetes gán lúc chạy. **Downward API** "đổ xuống" các thông tin đó vào container qua env var hoặc file, không cần gọi API-server.

```yaml
    env:
      - name: POD_NAME
        valueFrom:
          fieldRef:
            fieldPath: metadata.name
      - name: POD_NAMESPACE
        valueFrom:
          fieldRef:
            fieldPath: metadata.namespace
      - name: NODE_NAME
        valueFrom:
          fieldRef:
            fieldPath: spec.nodeName
      - name: POD_IP
        valueFrom:
          fieldRef:
            fieldPath: status.podIP
      - name: MEM_LIMIT           # đọc resource limit của chính container
        valueFrom:
          resourceFieldRef:
            containerName: web
            resource: limits.memory
```

Ứng dụng thực tế: gắn `POD_NAME`/`NODE_NAME` vào **log & tracing** để biết log đến từ instance nào; dùng `POD_NAMESPACE` để đặt tên service discovery; đọc `limits.memory` để tự chỉnh heap-size của JVM/Go runtime cho khớp cgroup. Có thể mount cả `metadata.labels` và `metadata.annotations` thành file qua `downwardAPI` volume.

### 2.6 Cập nhật config & vấn đề reload

Câu hỏi vận hành cốt lõi: **sửa ConfigMap/Secret rồi thì Pod có thấy giá trị mới không?** Câu trả lời phụ thuộc bạn tiêm bằng **mount** hay **env var** — và đây là chỗ nhiều người mắc lỗi.

| | Mount thành file (volume) | Env var (`env`/`envFrom`) |
|--|---------------------------|---------------------------|
| Sau khi sửa ConfigMap/Secret | File trong Pod **tự cập nhật** (kubelet sync, thường trong ~1 phút) | **Không đổi** — env chỉ set một lần lúc container khởi động |
| Muốn app dùng giá trị mới | App phải **watch file & reload**, hoặc restart | **Bắt buộc restart Pod** |
| `subPath` mount | **Không** tự cập nhật (ngoại lệ cần nhớ) | — |

<svg viewBox="0 0 640 210" role="img" aria-labelledby="rl-t rl-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="rl-t">Reload config: mount tự cập nhật, env thì không</title>
<desc id="rl-d">Sửa ConfigMap: nhánh mount thì file trong Pod tự đổi và app reload, nhánh env thì giá trị đứng yên tới khi restart Pod</desc>
<rect x="235" y="16" width="170" height="42" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="35" text-anchor="middle" font-size="12" fill="currentColor">Sửa ConfigMap</text>
<text x="320" y="51" text-anchor="middle" font-size="10" fill="currentColor">kubectl apply</text>
<rect x="40" y="100" width="250" height="52" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="165" y="122" text-anchor="middle" font-size="12" fill="currentColor">Mount (volume)</text>
<text x="165" y="140" text-anchor="middle" font-size="10" fill="currentColor">file tự đổi -> app watch/reload</text>
<rect x="350" y="100" width="250" height="52" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="475" y="122" text-anchor="middle" font-size="12" fill="currentColor">Env var</text>
<text x="475" y="140" text-anchor="middle" font-size="10" fill="currentColor">đứng yên -> phải restart Pod</text>
<line x1="290" y1="58" x2="165" y2="100" stroke="currentColor" stroke-width="1"/>
<line x1="350" y1="58" x2="475" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="320" y="185" text-anchor="middle" font-size="10" fill="currentColor">Env var chỉ đọc một lần lúc container khởi động</text>
</svg>

**Hai kỹ thuật production để reload sạch:**

1. **Rollout restart** thủ công khi cần đổi env:
```bash
kubectl rollout restart deployment/web -n shop   # tạo Pod mới, đọc lại config
```

2. **Config-hash annotation** — buộc Deployment tự lăn bản mới **mỗi khi ConfigMap đổi**. Ghi hash nội dung config vào annotation của Pod template; hash đổi → template đổi → Deployment tự rollout:
```yaml
spec:
  template:
    metadata:
      annotations:
        # cập nhật giá trị này (bằng CI, Helm, hoặc Reloader) khi config đổi
        checksum/config: "8f3b2c...e91"
```
Công cụ như **Stakater Reloader** tự động hoá bước này: nó watch ConfigMap/Secret và tự `rollout restart` Deployment tham chiếu tới chúng.

> **Bẫy thường gặp:** đổi Secret DB password bằng env var rồi tưởng app đã dùng password mới — thực tế Pod cũ vẫn giữ password cũ tới khi bị thay. Luôn nhớ: **env = phải restart**.

---

## 3. Thực hành nhanh (tạo bằng lệnh)

Không phải lúc nào cũng viết YAML tay — `kubectl create` sinh nhanh ConfigMap/Secret:

```bash
# ConfigMap từ literal và từ file
kubectl create configmap app-config \
  --from-literal=LOG_LEVEL=info \
  --from-file=application.properties=./app.properties -n shop

# Secret từ literal (k8s tự base64) và từ file chứng chỉ
kubectl create secret generic db-secret \
  --from-literal=DB_PASSWORD='s3cr3t!' -n shop
kubectl create secret tls tls-secret \
  --cert=tls.crt --key=tls.key -n shop

# Kiểm tra (nhớ: get secret -o yaml chỉ hiện base64, không phải mã hoá)
kubectl get configmap app-config -o yaml -n shop
kubectl get secret db-secret -o jsonpath='{.data.DB_PASSWORD}' -n shop | base64 -d
```

> **Quy tắc vàng:** ConfigMap được commit thoải mái vào Git; **Secret thô thì KHÔNG** — hoặc dùng ExternalSecret (chỉ con trỏ), hoặc mã hoá bằng **Sealed Secrets**/SOPS trước khi commit.

---

## 4. Tóm tắt
- **Tách config khỏi image** (12-factor Factor III): build **một image**, tiêm config lúc chạy → cùng binary chạy dev/staging/prod, đổi cấu hình không cần rebuild.
- **ConfigMap** = kho key-value/file **không nhạy cảm**; tiêm vào Pod bằng **env var** (`configMapKeyRef`/`envFrom`) hoặc **mount thành file** (volume).
- **Secret** cấu trúc y hệt ConfigMap nhưng cho dữ liệu nhạy cảm — **CHỈ base64, KHÔNG mã hoá**. Production cần: **encryption-at-rest cho etcd** (KMS), **RBAC chặt**, và **external secret manager** (Vault / External Secrets Operator) để bí mật thật không nằm trong etcd/Git.
- **Downward API** cho Pod tự đọc metadata (tên, namespace, node, IP, resource limit) — hữu ích cho log/tracing và tự tinh chỉnh runtime.
- **Reload:** mount **tự cập nhật** (trừ `subPath`); **env var thì không** — muốn env mới phải **restart Pod** (`rollout restart`, config-hash annotation, hoặc Reloader).

> **Bài tiếp theo (Bài 10):** đưa app ra ngoài cluster — **Ingress & quản lý traffic HTTP**: routing theo host/path, TLS termination, và vì sao cần Ingress Controller đứng sau Service.
