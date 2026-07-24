# Bài 12 — Security: RBAC, ServiceAccount, Network Policy, Pod Security

## 1. Mục tiêu
Sau bài này bạn có thể:
- Thiết kế phân quyền theo **least privilege** bằng **RBAC**: phân biệt Role/ClusterRole (tập quyền) và RoleBinding/ClusterRoleBinding (gán quyền).
- Hiểu **ServiceAccount** là *danh tính* của Pod khi gọi API server, và cách gắn quyền cho nó.
- Cứng hoá Pod bằng **security context**: `runAsNonRoot`, `readOnlyRootFilesystem`, drop capabilities, seccomp.
- Áp **Pod Security Standards** (privileged / baseline / restricted) — thứ thay thế PodSecurityPolicy đã bị gỡ.
- Chặn traffic đông–tây bằng **NetworkPolicy** (mặc định mọi Pod nói chuyện tự do → whitelist).
- Biết cách quản lý **Secret** an toàn hơn base64 mặc định.

---

## 2. Lý thuyết

### 2.1 Bốn tầng phòng thủ — mỗi thứ chặn một hướng tấn công

Đừng nhét mọi thứ vào một khái niệm "bảo mật". Kubernetes có **bốn câu hỏi** tách bạch, mỗi câu là một cơ chế riêng. Ví như một toà nhà: RBAC là *ai được cầm chìa khoá phòng nào*; ServiceAccount là *thẻ nhân viên* dán trên áo mỗi tiến trình; security context là *nội quy trong phòng* (không được leo lên bàn, không mang dao); NetworkPolicy là *tường ngăn giữa các phòng*.

| Câu hỏi | Cơ chế | Ai là chủ thể |
|---|---|---|
| Ai được gọi API server, làm gì? | **RBAC** (Role + Binding) | user, group, ServiceAccount |
| Pod của tôi *là ai* khi gọi API? | **ServiceAccount** | tiến trình trong Pod |
| Container được phép làm gì với kernel/OS? | **SecurityContext** + **Pod Security Standards** | process trong container |
| Pod nào được nói chuyện với Pod nào? | **NetworkPolicy** | luồng mạng L3/L4 |

RBAC và NetworkPolicy dễ bị lẫn: RBAC gác **control plane** (lệnh `kubectl`, API), NetworkPolicy gác **data plane** (gói tin giữa Pod). Một attacker chiếm được token RBAC mạnh có thể tạo Pod tuỳ ý; chiếm được Pod nhưng bị NetworkPolicy nhốt thì khó lan ngang.

---

### 2.2 RBAC — Role là "tập quyền", Binding là "phép gán"

RBAC (Role-Based Access Control) tách làm hai nửa và **bắt buộc phải có cả hai** thì quyền mới có hiệu lực:

<svg viewBox="0 0 660 250" role="img" aria-labelledby="rbac-t rbac-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="rbac-t">Cấu trúc RBAC: subject, binding, role, resource</title>
<desc id="rbac-d">RoleBinding nối một subject (user, group hoặc ServiceAccount) tới một Role định nghĩa các verb được phép trên resource</desc>
<rect x="20" y="95" width="140" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="118" text-anchor="middle" font-size="12" fill="currentColor">Subject</text>
<text x="90" y="135" text-anchor="middle" font-size="10" fill="currentColor">user / group /</text>
<text x="90" y="148" text-anchor="middle" font-size="10" fill="currentColor">ServiceAccount</text>
<rect x="250" y="95" width="150" height="60" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="325" y="120" text-anchor="middle" font-size="12" fill="currentColor">RoleBinding</text>
<text x="325" y="138" text-anchor="middle" font-size="10" fill="currentColor">gán subject → role</text>
<rect x="490" y="40" width="150" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="63" text-anchor="middle" font-size="12" fill="currentColor">Role</text>
<text x="565" y="80" text-anchor="middle" font-size="10" fill="currentColor">tập verb trên</text>
<text x="565" y="93" text-anchor="middle" font-size="10" fill="currentColor">resource</text>
<rect x="490" y="150" width="150" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="175" text-anchor="middle" font-size="11" fill="currentColor">Resource + Verb</text>
<text x="565" y="192" text-anchor="middle" font-size="10" fill="currentColor">pods: get,list,watch</text>
<line x1="160" y1="125" x2="248" y2="125" stroke="currentColor" stroke-width="1.3" marker-end="url(#ra)"/>
<line x1="400" y1="115" x2="488" y2="80" stroke="currentColor" stroke-width="1.3" marker-end="url(#ra)"/>
<line x1="565" y1="100" x2="565" y2="148" stroke="currentColor" stroke-width="1.3" marker-end="url(#ra)"/>
<defs><marker id="ra" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

- **Role / ClusterRole** = *cái gì được làm*. Nó liệt kê `rules`: mỗi rule là bộ ba `apiGroups` × `resources` × `verbs`. Role **không** biết ai được dùng nó — nó chỉ là một "gói quyền" nằm không.
- **RoleBinding / ClusterRoleBinding** = *ai được dùng gói quyền đó*. Nó nối một danh sách **subjects** tới đúng một Role/ClusterRole.

**Namespaced vs cluster-scoped** — điểm hay sai:

| | Phạm vi | Dùng khi |
|---|---|---|
| **Role** | 1 namespace | quyền chỉ trong `team-a` |
| **ClusterRole** | toàn cluster + resource cluster-scoped (nodes, PV, namespaces) + non-resource URL (`/healthz`) | quyền đọc node, hoặc quyền tái dùng ở nhiều ns |
| **RoleBinding** | cấp quyền **trong 1 namespace** | có thể trỏ tới Role *hoặc* ClusterRole |
| **ClusterRoleBinding** | cấp quyền **toàn cluster** | trỏ tới ClusterRole, hiệu lực mọi ns |

Mẹo mạnh: một **RoleBinding trỏ tới ClusterRole** cho phép định nghĩa gói quyền *một lần* (ClusterRole) rồi gán *trong từng namespace* (RoleBinding) — tránh copy Role vào 20 namespace.

RBAC là **thuần additive**: không có `deny`. Hiệu lực cuối = hợp (union) của mọi quyền được gán. Muốn cắt quyền → gỡ binding, không có cách "trừ".

#### Role đọc-chỉ trên Pod trong một namespace

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: team-a
  name: pod-reader
rules:
- apiGroups: [""]            # "" = core group (pods, services, configmaps...)
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
```

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: team-a
  name: read-pods-for-alice
subjects:
- kind: User            # user do lớp authentication cung cấp (cert, OIDC...)
  name: alice           # Kubernetes KHÔNG lưu user; tên do IdP xác thực đưa vào
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

Sau đó `alice` chỉ có thể `kubectl get pods -n team-a`; `kubectl delete pod` hay đụng namespace khác đều bị `Forbidden`.

> **Kiểm tra quyền nhanh** — công cụ vàng để debug RBAC:
> ```bash
> kubectl auth can-i delete pods -n team-a --as alice          # -> no
> kubectl auth can-i list pods   -n team-a --as alice          # -> yes
> kubectl auth can-i '*' '*'                                   # bạn có phải admin?
> # Mạo danh cả ServiceAccount:
> kubectl auth can-i get secrets --as=system:serviceaccount:team-a:ci-bot -n team-a
> ```

#### ClusterRole + RoleBinding tái dùng ở nhiều namespace

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: deployment-manager      # định nghĩa 1 lần, gán ở nhiều ns
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding                # RoleBinding (namespaced) trỏ tới ClusterRole
metadata:
  name: bind-deploy-team-a
  namespace: team-a             # quyền chỉ có hiệu lực trong team-a
subjects:
- kind: Group
  name: team-a-devs             # cả group từ OIDC
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole             # tái dùng gói quyền cluster-scoped
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io
```

**Cạm bẫy least-privilege:** đừng gán ClusterRole dựng sẵn `cluster-admin` cho ServiceAccount ứng dụng. Và cẩn thận quyền `create pods` + quyền đọc `secrets` — kẻ có `create pods` có thể mount bất kỳ secret nào trong namespace vào một Pod rồi đọc, tức là *leo thang* tới mọi secret. Wildcard `verbs: ["*"]` hoặc `resources: ["*"]` gần như luôn là mùi code xấu.

---

### 2.3 ServiceAccount — danh tính của Pod

User (con người) do lớp authentication bên ngoài lo (cert, OIDC). Nhưng **Pod** cũng cần một danh tính để gọi API server — đó là **ServiceAccount (SA)**.

- Mỗi namespace có một SA `default`. Pod không khai `serviceAccountName` sẽ nhận `default`.
- Kubernetes gắn vào Pod một **token JWT** (từ 1.24+ là token có thời hạn, tự xoay qua projected volume) tại `/var/run/secrets/kubernetes.io/serviceaccount/token`. Thư viện client trong Pod tự đọc token này để xác thực.
- Gán quyền cho SA = tạo RoleBinding với `subjects.kind: ServiceAccount`.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-bot
  namespace: team-a
automountServiceAccountToken: false   # MẶC ĐỊNH true; tắt nếu Pod không gọi API
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-bot-can-manage-deploys
  namespace: team-a
subjects:
- kind: ServiceAccount        # subject là SA, không phải User
  name: ci-bot
  namespace: team-a
roleRef:
  kind: ClusterRole
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: deployer
  namespace: team-a
spec:
  serviceAccountName: ci-bot          # Pod chạy dưới danh tính ci-bot
  automountServiceAccountToken: true  # cần token vì Pod này gọi API
  containers:
  - name: kubectl
    image: bitnami/kubectl:latest
    command: ["sleep", "3600"]
```

**Nguyên tắc**: một SA riêng cho mỗi workload (không dùng chung `default`), quyền tối thiểu. Nếu Pod **không** cần gọi API server (đa số app web), đặt `automountServiceAccountToken: false` để không phát token vô ích — token bị lộ là bàn đạp tấn công.

> Tên đầy đủ của một SA trong RBAC là `system:serviceaccount:<namespace>:<name>`. Đây là chuỗi bạn dùng với `--as` để test.

---

### 2.4 SecurityContext — cứng hoá container

Mặc định container chạy như **root** (uid 0) và có một tập Linux capabilities. Nếu app bị RCE, attacker có root *trong container* — và với vài misconfig (hostPath, privileged) có thể thoát ra host. `securityContext` siết lại:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hardened
spec:
  securityContext:                 # cấp Pod: áp cho mọi container
    runAsNonRoot: true             # từ chối khởi động nếu image chạy uid 0
    runAsUser: 10001
    runAsGroup: 10001
    fsGroup: 10001                 # gán group sở hữu volume để ghi được
    seccompProfile:
      type: RuntimeDefault         # bật seccomp lọc syscall nguy hiểm
  containers:
  - name: app
    image: myapp:1.4.2
    securityContext:               # cấp container: đè lên cấp Pod
      allowPrivilegeEscalation: false   # chặn setuid leo quyền (no_new_privs)
      readOnlyRootFilesystem: true      # rootfs chỉ đọc -> chặn ghi mã độc
      privileged: false
      capabilities:
        drop: ["ALL"]              # bỏ SẠCH mọi capability...
        add: ["NET_BIND_SERVICE"]  # ...rồi thêm lại đúng cái cần (bind <1024)
    volumeMounts:
    - name: tmp
      mountPath: /tmp              # readOnlyRootFilesystem -> cần emptyDir cho ghi tạm
  volumes:
  - name: tmp
    emptyDir: {}
```

Giải nghĩa từng khoá — mỗi cái chặn một kiểu tấn công cụ thể:

| Khoá | Chặn điều gì |
|---|---|
| `runAsNonRoot: true` | root trong container = bàn đạp thoát container; ép chạy user thường |
| `allowPrivilegeEscalation: false` | binary setuid không thể nâng quyền (đặt `no_new_privs`) |
| `readOnlyRootFilesystem: true` | attacker không ghi được payload/backdoor vào filesystem |
| `capabilities.drop: ["ALL"]` | bỏ `NET_RAW` (chống spoof/ARP), `SYS_ADMIN`... — chỉ add lại cái thật cần |
| `seccompProfile: RuntimeDefault` | chặn hàng trăm syscall hiếm dùng (ptrace, keyctl...) |
| `privileged: false` | privileged ≈ root trên host, thấy mọi device — gần như không bao giờ cần |

`runAsNonRoot: true` chỉ *kiểm tra*; muốn *đảm bảo* thì trong Dockerfile phải `USER 10001` và build image chạy được với uid tuỳ ý (thư mục ghi được cho group root, tránh hard-code path chỉ root ghi).

---

### 2.5 Pod Security Standards — thay thế PodSecurityPolicy

PodSecurityPolicy (PSP) đã bị **gỡ bỏ ở Kubernetes 1.25**. Thay bằng **Pod Security Admission** — một admission controller built-in áp **Pod Security Standards (PSS)** ở mức **namespace** qua label. Ba mức:

| Mức | Ý nghĩa | Ví dụ ràng buộc |
|---|---|---|
| **privileged** | không hạn chế | cho system/infra workload tin cậy |
| **baseline** | chặn leo thang rõ ràng, dễ áp cho app cũ | cấm `privileged`, hostNetwork, hostPath, hostPID |
| **restricted** | siết mạnh theo best practice hiện hành | thêm: bắt buộc `runAsNonRoot`, drop ALL caps, seccomp `RuntimeDefault`, `allowPrivilegeEscalation:false` |

Ba **chế độ** áp cho mỗi mức, độc lập nhau:
- `enforce` — vi phạm thì **từ chối** tạo Pod.
- `audit` — vẫn cho tạo, ghi vào audit log.
- `warn` — vẫn cho tạo, trả cảnh báo về `kubectl`.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
  labels:
    # enforce mức restricted: Pod vi phạm bị từ chối thẳng
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.30
    # đồng thời warn/audit ở restricted để bắt lỗi khi nâng chuẩn
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

Chiến lược an toàn khi siết dần: đặt `warn`/`audit` = `restricted` trước để *thấy* cái gì sẽ vỡ, sửa manifest, rồi mới bật `enforce: restricted`. Với namespace hệ thống (CNI, CSI) cần `privileged` thì gán riêng mức privileged — PSS áp theo *từng namespace*.

Muốn logic phức tạp hơn (regex image registry, bắt buộc label...) thì dùng **policy engine** ngoài như **Kyverno** hoặc **OPA/Gatekeeper** — chúng là ValidatingAdmissionWebhook, biểu đạt mạnh hơn ba mức PSS cứng.

---

### 2.6 NetworkPolicy — mặc định "mở toang", phải whitelist

Đây là chỗ nhiều người vỡ mộng: **mặc định trong Kubernetes, mọi Pod nói chuyện được với mọi Pod, mọi namespace** — không có tường lửa nội bộ. Một Pod bị chiếm có thể quét và gọi thẳng database ở namespace khác.

**NetworkPolicy** cho phép whitelist luồng L3/L4. Ba điều phải nhớ:

1. **Cần CNI hỗ trợ** (Calico, Cilium, Weave...). CNI như flannel thuần *bỏ qua* NetworkPolicy — bạn tạo policy mà không có gì thực thi, một ảo giác an toàn nguy hiểm.
2. NetworkPolicy **chọn Pod bằng label**, không phải IP. Selector rỗng `{}` = chọn *mọi* Pod trong namespace.
3. Ngay khi một Pod bị **ít nhất một** policy chọn ở hướng nào đó (Ingress/Egress), Pod đó chuyển sang **deny-by-default** hướng đó — chỉ những gì được liệt kê mới qua. Pod *không* bị policy nào chọn thì vẫn mở hoàn toàn.

<svg viewBox="0 0 660 250" role="img" aria-labelledby="np-t np-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="np-t">NetworkPolicy whitelist ingress cho database</title>
<desc id="np-d">Chỉ Pod có label app api được gọi vào Pod database cổng 5432; các Pod khác bị chặn</desc>
<rect x="30" y="40" width="130" height="50" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="62" text-anchor="middle" font-size="12" fill="currentColor">Pod: api</text>
<text x="95" y="79" text-anchor="middle" font-size="10" fill="currentColor">app=api</text>
<rect x="30" y="150" width="130" height="50" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="172" text-anchor="middle" font-size="12" fill="currentColor">Pod: web</text>
<text x="95" y="189" text-anchor="middle" font-size="10" fill="currentColor">app=web</text>
<rect x="470" y="95" width="160" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="120" text-anchor="middle" font-size="12" fill="currentColor">Pod: database</text>
<text x="550" y="138" text-anchor="middle" font-size="10" fill="currentColor">app=db :5432</text>
<line x1="160" y1="65" x2="468" y2="115" stroke="currentColor" stroke-width="1.4" marker-end="url(#np-a)"/>
<text x="310" y="80" text-anchor="middle" font-size="11" fill="currentColor">cho phép (whitelist)</text>
<line x1="160" y1="175" x2="468" y2="135" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<line x1="300" y1="152" x2="330" y2="170" stroke="currentColor" stroke-width="1.6"/>
<line x1="330" y1="152" x2="300" y2="170" stroke="currentColor" stroke-width="1.6"/>
<text x="330" y="200" text-anchor="middle" font-size="11" fill="currentColor">bị chặn (deny-by-default)</text>
<defs><marker id="np-a" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

#### Bước 1 — default-deny toàn namespace (nền tảng zero-trust)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: team-a
spec:
  podSelector: {}                 # {} = chọn MỌI Pod trong namespace
  policyTypes:
  - Ingress
  - Egress                        # chặn cả vào lẫn ra -> từ đây phải mở từng đường
```

Sau policy này, mọi Pod trong `team-a` không nhận và không gửi được gì — kể cả DNS. Đây là *sàn* an toàn; giờ ta khoét lỗ có kiểm soát.

#### Bước 2 — cho `api` gọi vào `database`, và cho DNS ra

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-allow-from-api
  namespace: team-a
spec:
  podSelector:
    matchLabels: { app: db }      # policy này áp cho Pod database
  policyTypes: [Ingress]
  ingress:
  - from:
    - podSelector:
        matchLabels: { app: api } # CHỈ Pod app=api (cùng namespace) được vào
    ports:
    - protocol: TCP
      port: 5432
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: team-a
spec:
  podSelector: {}                 # mọi Pod cần phân giải DNS
  policyTypes: [Egress]
  egress:
  - to:
    - namespaceSelector:
        matchLabels: { kubernetes.io/metadata.name: kube-system }
      podSelector:
        matchLabels: { k8s-app: kube-dns }
    ports:
    - { protocol: UDP, port: 53 }
    - { protocol: TCP, port: 53 }
```

**Bẫy hay gặp:** bật `default-deny` Egress rồi quên mở DNS → app "chạy được nhưng gọi service nào cũng timeout" vì không resolve nổi tên. Luôn nhớ mở cổng 53 tới kube-dns.

**Chú ý ngữ nghĩa selector** — dễ hiểu sai và mở quá rộng:
- Trong một phần tử `from`, `namespaceSelector` + `podSelector` viết **cùng một gạch đầu dòng** = giao (AND): "Pod app=api *trong* namespace X".
- Viết **hai gạch đầu dòng riêng** = hợp (OR): "app=api ở *mọi* ns, HOẶC *mọi* Pod trong ns X". Sai chỗ này là mở toang.
- NetworkPolicy là L3/L4 (IP, cổng). Muốn lọc theo L7 (HTTP path, method, mTLS identity) cần Cilium hoặc service mesh (Istio) — vượt ngoài NetworkPolicy chuẩn.

---

### 2.7 Quản lý Secret an toàn

Secret trong Kubernetes **mặc định chỉ là base64** — *không phải mã hoá*. Ai đọc được object Secret (qua RBAC hoặc etcd) là thấy plaintext. Vài lớp phòng thủ:

```bash
# base64 KHÔNG bảo mật: giải mã trong 1 giây
kubectl get secret db-cred -o jsonpath='{.data.password}' | base64 -d
```

- **Encryption at rest**: bật `EncryptionConfiguration` ở api-server để etcd lưu Secret dạng mã hoá (AES-GCM), tốt hơn dùng KMS provider (AWS KMS, Vault) làm khoá gốc — kể cả kẻ dump được etcd cũng không đọc được.
- **RBAC chặt trên `secrets`**: `get/list secrets` là quyền nhạy cảm bậc nhất; đừng phát cho SA ứng dụng quyền list mọi secret. Nhớ: ai `create pods` cũng gián tiếp đọc được secret trong namespace.
- **External Secrets**: giữ bí mật thật ở Vault / AWS Secrets Manager / GCP Secret Manager, đồng bộ vào cluster qua **External Secrets Operator** — nguồn sự thật nằm ngoài, có rotation và audit.
- **Đừng để lộ qua Git**: không commit Secret plaintext. Dùng **Sealed Secrets** (Bitnami) — mã hoá bằng public key của controller, chỉ controller trong cluster giải được, an toàn để đẩy lên Git (GitOps).
- **Ưu tiên projected token & short-lived credentials** hơn secret tĩnh dài hạn; với cloud, dùng **IRSA/Workload Identity** (federate SA của Pod với IAM role) để Pod lấy credential tạm thời, không cần lưu key.

```yaml
apiVersion: v1
kind: Pod
metadata: { name: app }
spec:
  containers:
  - name: app
    image: myapp:1.4.2
    env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:            # tiêm secret qua env (tiện nhưng dễ lộ qua /proc, log)
          name: db-cred
          key: password
    volumeMounts:
    - name: cred
      mountPath: /etc/cred
      readOnly: true
  volumes:
  - name: cred
    secret:
      secretName: db-cred        # mount dạng file: an toàn hơn env, tự cập nhật khi secret đổi
```

Mount secret **dạng file** thường an toàn hơn `env`: biến môi trường dễ rò qua log, crash dump, hoặc process con kế thừa; file có thể set quyền và tự refresh khi Secret thay đổi.

---

## 3. Checklist cứng hoá tối thiểu cho một workload

- [ ] SA riêng cho workload; `automountServiceAccountToken: false` nếu không gọi API.
- [ ] RBAC least-privilege: không `cluster-admin`, không wildcard verb/resource; kiểm bằng `kubectl auth can-i`.
- [ ] SecurityContext: `runAsNonRoot`, `allowPrivilegeEscalation:false`, `readOnlyRootFilesystem`, drop ALL caps, seccomp `RuntimeDefault`.
- [ ] Namespace gán PSS `enforce: restricted` (hoặc ít nhất `baseline`).
- [ ] NetworkPolicy `default-deny` + whitelist ingress/egress (nhớ mở DNS).
- [ ] Secret: encryption at rest + RBAC chặt; cân nhắc External Secrets / Sealed Secrets.

---

## 4. Tóm tắt
- **RBAC** = **Role/ClusterRole** (tập quyền: apiGroup × resource × verb) + **RoleBinding/ClusterRoleBinding** (gán cho user/group/SA). Additive, không có deny; least privilege và `kubectl auth can-i` là bạn thân.
- **ServiceAccount** là danh tính của Pod khi gọi API server; gán quyền qua RoleBinding, tắt automount token khi không cần.
- **SecurityContext** cứng hoá container: chạy non-root, rootfs read-only, drop ALL capabilities, chặn privilege escalation, bật seccomp.
- **Pod Security Standards** (privileged/baseline/restricted × enforce/audit/warn) áp ở mức namespace — thay cho PSP đã gỡ; muốn mạnh hơn dùng Kyverno/Gatekeeper.
- **NetworkPolicy** biến mạng "mở toang" thành zero-trust: default-deny rồi whitelist theo label; cần CNI hỗ trợ, cẩn thận DNS và ngữ nghĩa AND/OR của selector.
- **Secret** mặc định chỉ base64 → bật encryption at rest, siết RBAC, và cân nhắc External/Sealed Secrets.

> **Bài tiếp theo (Bài 13):** khi có sự cố — **troubleshooting & observability**: đọc `kubectl describe`/`events`/`logs`, gỡ CrashLoopBackOff, ImagePullBackOff, OOMKilled, và dựng logging/metrics/tracing cho cluster.
