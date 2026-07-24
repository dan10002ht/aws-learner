# Bài 15 — Operators & CRD: mở rộng Kubernetes

## 1. Mục tiêu
Sau bài này bạn có thể:
- Hiểu Kubernetes **có thể mở rộng chính API của nó**: dùng **CustomResourceDefinition (CRD)** để tạo ra một `kind` mới (ví dụ `PostgresCluster`) như thể nó là resource gốc.
- Định nghĩa **Operator** = CRD + **custom controller** chạy **reconcile loop**, đóng gói **tri thức vận hành** (backup, failover, scale) của một app phức tạp vào phần mềm.
- Phân biệt **operator pattern** và các **maturity levels** (từ install cơ bản tới auto-pilot).
- Quyết định đúng: **khi nào NÊN** viết operator (stateful app phức tạp) và **khi nào KHÔNG** (app thường — Deployment + Helm là đủ).
- Biết đường viết operator thật với **Operator SDK / Kubebuilder**.

---

## 2. Lý thuyết

### 2.1 Analogy: từ "công thức nấu ăn" tới "đầu bếp trong nhà"

Helm (Bài 14) giống như **một hộp nguyên liệu kèm công thức**: bạn `helm install`, nó rải ra một mớ YAML đã điền sẵn tham số. Nhưng công thức chỉ **dựng bàn tiệc lúc đầu** — nó không biết nấu lại khi món nguội, không biết cứu chữa khi cháy nồi. Sau khi cài xong, Helm rời đi; mọi việc **vận hành liên tục** (backup định kỳ, promote replica khi primary chết, mở rộng cluster) lại rơi vào tay con người trực đêm.

**Operator** là bước nhảy về chất: thay vì đưa bạn công thức, nó thuê hẳn **một đầu bếp thường trực trong bếp**. Đầu bếp này (custom controller) **không ngủ**, liên tục nhìn nồi (actual state) so với thực đơn bạn đặt (desired state trong Custom Resource) và **tự tay xử lý** — đúng như một SRE lành nghề sẽ làm, nhưng bằng code chạy 24/7.

Nói cách khác: Helm đóng gói **cấu trúc triển khai**; Operator đóng gói **tri thức vận hành** — thứ vốn nằm trong đầu kỹ sư và trong runbook.

### 2.2 Nhắc lại linh hồn của Kubernetes: controller + reconcile loop

Ở Bài 1 bạn đã gặp tư tưởng cốt lõi: **declarative + desired state + reconciliation**. Mọi thứ "tự chữa lành" trong K8s đều đến từ một mẫu lặp lại: một **controller** liên tục so sánh *mong muốn* với *thực tế* rồi hành động để kéo chúng khớp nhau.

- Bạn khai báo `Deployment replicas: 3` → **Deployment controller** thấy chỉ có 2 Pod → tạo thêm 1.
- Bạn khai báo `Service` → **endpoint controller** cập nhật danh sách Pod đích.

Những controller đó là **built-in**, do Kubernetes viết sẵn cho các resource gốc. Câu hỏi đắt giá là: *nếu tôi có một app riêng cũng cần vòng lặp thông minh như vậy thì sao?* Ví dụ "muốn một PostgreSQL cluster 3 node, primary + 2 replica, backup mỗi 6 giờ, primary chết thì promote replica". Không có controller gốc nào hiểu "PostgreSQL cluster" cả.

**Operator pattern chính là câu trả lời:** dạy Kubernetes hiểu app của bạn, bằng cách (1) định nghĩa một *kind* mới và (2) viết controller riêng cho nó — tái sử dụng đúng cơ chế reconcile đã làm nên Kubernetes.

### 2.3 CRD — thêm một "kind" mới vào API server

**CustomResourceDefinition (CRD)** là cách khai báo với API server: "*từ giờ hãy hiểu và lưu trữ một loại resource mới tên là `PostgresCluster`*". Sau khi apply CRD, API server lập tức mở ra một REST endpoint mới; bạn có thể `kubectl get postgresclusters` y như `kubectl get pods`, dữ liệu được lưu vào **etcd**, được RBAC bảo vệ, được `kubectl` và mọi client hiểu — **miễn phí**, không sửa source code Kubernetes.

Điểm mấu chốt cần thấm: **CRD chỉ tạo ra "danh từ" (dữ liệu), tự nó KHÔNG làm gì cả.** Apply một CRD rồi tạo một `PostgresCluster` object — bạn chỉ có một bản ghi nằm im trong etcd, chưa có Pod PostgreSQL nào mọc lên. Cần một **controller** đọc object đó và biến nó thành hiện thực. Đó là lý do:

> **Operator = CRD (danh từ mới) + Custom Controller (động từ — reconcile loop cho danh từ đó).**

<svg viewBox="0 0 680 250" role="img" aria-labelledby="op-t op-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="op-t">Cấu trúc một Operator: CRD định nghĩa kind, Custom Resource là instance, Controller reconcile</title>
<desc id="op-d">CRD đăng ký kind PostgresCluster vào API server; người dùng tạo một Custom Resource; controller watch và tạo StatefulSet, Service, backup Job để hiện thực hoá</desc>
<rect x="30" y="20" width="180" height="60" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="44" text-anchor="middle" font-size="12" fill="currentColor">CRD</text>
<text x="120" y="62" text-anchor="middle" font-size="10" fill="currentColor">đăng ký kind mới</text>
<rect x="30" y="110" width="180" height="72" rx="9" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="120" y="134" text-anchor="middle" font-size="12" fill="currentColor">Custom Resource</text>
<text x="120" y="151" text-anchor="middle" font-size="10" fill="currentColor">kind: PostgresCluster</text>
<text x="120" y="167" text-anchor="middle" font-size="10" fill="currentColor">replicas: 3 (desired)</text>
<rect x="270" y="55" width="150" height="92" rx="9" fill="#326ce5" fill-opacity="0.16" stroke="currentColor"/>
<text x="345" y="82" text-anchor="middle" font-size="12" fill="currentColor">Controller</text>
<text x="345" y="100" text-anchor="middle" font-size="10" fill="currentColor">watch + so sánh</text>
<text x="345" y="116" text-anchor="middle" font-size="10" fill="currentColor">reconcile loop</text>
<text x="345" y="132" text-anchor="middle" font-size="10" fill="currentColor">(tri thức vận hành)</text>
<rect x="490" y="20" width="160" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="44" text-anchor="middle" font-size="11" fill="currentColor">StatefulSet + Pods</text>
<rect x="490" y="75" width="160" height="40" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="99" text-anchor="middle" font-size="11" fill="currentColor">Service (primary/replica)</text>
<rect x="490" y="130" width="160" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="570" y="154" text-anchor="middle" font-size="11" fill="currentColor">Backup CronJob</text>
<line x1="210" y1="146" x2="270" y2="120" stroke="currentColor" stroke-width="1.2" marker-end="url(#ar2)"/>
<line x1="420" y1="80" x2="490" y2="45" stroke="currentColor" stroke-width="1.2" marker-end="url(#ar2)"/>
<line x1="420" y1="98" x2="490" y2="95" stroke="currentColor" stroke-width="1.2" marker-end="url(#ar2)"/>
<line x1="420" y1="120" x2="490" y2="148" stroke="currentColor" stroke-width="1.2" marker-end="url(#ar2)"/>
<text x="345" y="210" text-anchor="middle" font-size="11" fill="currentColor">CRD = danh từ (dữ liệu trong etcd). Controller = động từ (biến dữ liệu thành thực tế).</text>
<defs><marker id="ar2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.4 CRD và Custom Resource bằng YAML thật

**Bước 1 — Định nghĩa kind mới (CRD).** File này chỉ cần apply **một lần** cho cả cluster (nó là cluster-scoped). `spec.versions[].schema` dùng **OpenAPI v3** để API server *validate* mọi CR bạn tạo — trường sai kiểu sẽ bị từ chối ngay.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  # tên PHẢI là <plural>.<group>
  name: postgresclusters.db.example.com
spec:
  group: db.example.com
  scope: Namespaced          # CR sống trong namespace (thường gặp); hoặc Cluster
  names:
    kind: PostgresCluster    # tên dùng trong field `kind:` của CR
    plural: postgresclusters # dùng cho `kubectl get postgresclusters`
    singular: postgrescluster
    shortNames: [pgc]        # `kubectl get pgc`
  versions:
    - name: v1alpha1
      served: true           # API server phục vụ version này
      storage: true          # version được lưu trong etcd (đúng 1 version = true)
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required: [replicas, version]
              properties:
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 9
                version:
                  type: string   # ví dụ "16.2"
                storageGB:
                  type: integer
                  default: 20
                backup:
                  type: object
                  properties:
                    schedule: { type: string }   # cron, ví dụ "0 */6 * * *"
                    retentionDays: { type: integer, default: 7 }
            status:            # controller ghi trạng thái quan sát được vào đây
              type: object
              properties:
                phase: { type: string }          # Pending / Running / Failing
                primary: { type: string }        # Pod đang là primary
      subresources:
        status: {}            # tách /status: controller cập nhật status không đụng spec
      additionalPrinterColumns: # cột hiển thị khi `kubectl get pgc`
        - { name: Replicas, type: integer, jsonPath: .spec.replicas }
        - { name: Phase, type: string, jsonPath: .status.phase }
```

**Bước 2 — Tạo một instance (Custom Resource).** Đây là "đơn đặt hàng" của bạn — desired state. Nhìn nó y như một Deployment, nhưng ở tầng khái niệm cao hơn: bạn nói "*muốn một cụm Postgres*", không phải "*muốn các Pod, Service, PVC này*".

```yaml
apiVersion: db.example.com/v1alpha1
kind: PostgresCluster
metadata:
  name: orders-db
  namespace: production
spec:
  replicas: 3          # 1 primary + 2 replica
  version: "16.2"
  storageGB: 50
  backup:
    schedule: "0 */6 * * *"   # backup mỗi 6 giờ
    retentionDays: 14
```

```bash
kubectl apply -f postgrescluster-crd.yaml      # 1 lần cho cluster
kubectl apply -f orders-db.yaml                # tạo đơn đặt hàng
kubectl get pgc -n production
# NAME        REPLICAS   PHASE
# orders-db   3          Running   <- cột này do controller ghi vào .status
```

Nếu **chưa cài operator** (controller), lệnh trên vẫn chạy: object được lưu, nhưng `PHASE` mãi trống và **không Pod Postgres nào xuất hiện**. Bằng chứng sống động rằng CRD chỉ là dữ liệu.

### 2.5 Reconcile loop — ý niệm cốt lõi của controller

Custom controller là một chương trình (thường viết bằng Go) chạy trong cluster, **watch** thay đổi trên `PostgresCluster` và trên các resource con nó tạo ra. Trái tim của nó là hàm `Reconcile(request)` — được gọi mỗi khi có gì đó thay đổi (hoặc định kỳ). Đây là mã giả diễn tả **tri thức vận hành** được đóng gói:

```go
// Reconcile được gọi cho MỖI PostgresCluster khi có sự kiện.
// Nguyên tắc vàng: hàm phải IDEMPOTENT — gọi 100 lần cùng input
// phải cho cùng kết quả, và luôn "tiến về" desired state.
func (r *Reconciler) Reconcile(ctx context.Context, req Request) (Result, error) {
    // 1. ĐỌC desired state
    var pgc PostgresCluster
    if err := r.Get(ctx, req.NamespacedName, &pgc); err != nil {
        return Result{}, client.IgnoreNotFound(err) // CR đã bị xoá -> bỏ qua
    }

    // 2. QUAN SÁT actual state (những gì đang thực sự chạy)
    sts := r.getStatefulSet(ctx, pgc)          // StatefulSet Postgres hiện có?
    svc := r.getServices(ctx, pgc)

    // 3. SO SÁNH desired vs actual rồi HÀNH ĐỘNG để khớp
    if sts == nil {
        r.Create(ctx, buildStatefulSet(&pgc))   // chưa có -> tạo mới
        return Result{Requeue: true}, nil
    }
    if *sts.Spec.Replicas != int32(pgc.Spec.Replicas) {
        sts.Spec.Replicas = &pgc.Spec.Replicas  // scale khớp mong muốn
        r.Update(ctx, sts)
    }

    // 4. TRI THỨC VẬN HÀNH: những việc mà controller built-in không biết làm
    if r.primaryIsDown(ctx, &pgc) {
        r.promoteHealthiestReplica(ctx, &pgc)    // FAILOVER
    }
    r.ensureBackupCronJob(ctx, &pgc)             // BACKUP theo schedule
    r.runPendingMajorVersionUpgrade(ctx, &pgc)   // UPGRADE có trật tự

    // 5. GHI status quan sát được để người dùng thấy
    pgc.Status.Phase = "Running"
    pgc.Status.Primary = r.currentPrimary(ctx, &pgc)
    r.Status().Update(ctx, &pgc)

    // requeue định kỳ để tự kiểm tra, không chỉ chờ sự kiện
    return Result{RequeueAfter: 30 * time.Second}, nil
}
```

Hãy để ý ba tính chất khiến reconcile loop mạnh mẽ:
- **Level-triggered, không edge-triggered:** controller không phản ứng theo "sự kiện đã xảy ra gì" mà luôn nhìn **trạng thái hiện tại** rồi sửa. Nếu nó bị crash và bỏ lỡ 10 sự kiện, khi sống lại nó vẫn hội tụ đúng — vì nó đọc lại toàn cảnh, không dựa vào lịch sử.
- **Idempotent:** mỗi lần chạy chỉ làm phần còn thiếu để tiến về desired. Chạy dư lần cũng vô hại.
- **Đóng gói tri thức:** bước 4 chính là thứ SRE từng làm tay lúc 3h sáng — nay là code, chạy nhất quán, không mệt mỏi.

<svg viewBox="0 0 620 200" role="img" aria-labelledby="rl-t rl-d" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto">
<title id="rl-t">Reconcile loop của custom controller</title>
<desc id="rl-d">Controller lặp: đọc desired từ CR, quan sát actual, so sánh, hành động gồm cả backup failover scale, ghi status, rồi lặp lại</desc>
<rect x="40" y="70" width="130" height="56" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="94" text-anchor="middle" font-size="11" fill="currentColor">Đọc desired</text>
<text x="105" y="111" text-anchor="middle" font-size="10" fill="currentColor">(Custom Resource)</text>
<rect x="230" y="70" width="130" height="56" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="295" y="94" text-anchor="middle" font-size="11" fill="currentColor">Quan sát actual</text>
<text x="295" y="111" text-anchor="middle" font-size="10" fill="currentColor">(Pods, backup...)</text>
<rect x="420" y="70" width="150" height="56" rx="8" fill="#326ce5" fill-opacity="0.16" stroke="currentColor"/>
<text x="495" y="90" text-anchor="middle" font-size="11" fill="currentColor">Hành động để khớp</text>
<text x="495" y="106" text-anchor="middle" font-size="10" fill="currentColor">scale / failover</text>
<text x="495" y="120" text-anchor="middle" font-size="10" fill="currentColor">backup / upgrade</text>
<line x1="170" y1="98" x2="228" y2="98" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar3)"/>
<line x1="360" y1="98" x2="418" y2="98" stroke="currentColor" stroke-width="1.3" marker-end="url(#ar3)"/>
<path d="M495,126 C495,175 105,175 105,128" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ar3)"/>
<text x="300" y="168" text-anchor="middle" font-size="10" fill="currentColor">lặp lại mãi (watch + requeue định kỳ)</text>
<defs><marker id="ar3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.6 Operator Maturity Model — 5 nấc trưởng thành

Không phải operator nào cũng "thông minh" như nhau. Cộng đồng (OperatorHub / Operator Framework) chia **5 cấp độ**, mỗi cấp đóng gói thêm tri thức vận hành:

| Cấp | Tên | Operator biết làm gì |
|-----|-----|----------------------|
| 1 | **Basic Install** | Cài đặt, cấu hình tự động app từ CR (thay Helm install) |
| 2 | **Seamless Upgrades** | Nâng cấp phiên bản app & chính operator một cách có trật tự |
| 3 | **Full Lifecycle** | Backup, restore, failover — quản trọn vòng đời dữ liệu |
| 4 | **Deep Insights** | Xuất metrics, alert, log, health tuỳ app |
| 5 | **Auto Pilot** | Tự scale theo tải, tự tuning, tự chữa lành, tự nhận diện bất thường |

Càng lên cao càng "**thay được kỹ sư vận hành**". Một operator Postgres chín muồi (như CloudNativePG, Zalando, Crunchy) đạt cấp 4–5: bạn khai báo một CR, phần còn lại — HA, failover, backup lên S3, point-in-time recovery — chạy tự động.

### 2.7 Khi nào NÊN và KHÔNG NÊN viết operator

Đây là quyết định kỹ thuật quan trọng nhất của bài. Viết operator là **viết phần mềm phân tán** — tốn công, dễ sai, phải bảo trì. Đừng làm vì "nghe ngầu".

<svg viewBox="0 0 660 210" role="img" aria-labelledby="dc-t dc-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="dc-t">So sánh: dùng Deployment + Helm hay viết Operator</title>
<desc id="dc-d">Bên trái app thường stateless nên dùng Deployment và Helm; bên phải app stateful phức tạp cần tri thức vận hành nên viết operator</desc>
<rect x="20" y="20" width="300" height="170" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="170" y="46" text-anchor="middle" font-size="13" fill="currentColor">Deployment + Helm là ĐỦ</text>
<text x="40" y="76" font-size="11" fill="currentColor">- App stateless (web, API, worker)</text>
<text x="40" y="100" font-size="11" fill="currentColor">- Vận hành = rolling update đơn giản</text>
<text x="40" y="124" font-size="11" fill="currentColor">- Không có failover/backup đặc thù</text>
<text x="40" y="148" font-size="11" fill="currentColor">- Restart lại là xong, không mất data</text>
<text x="40" y="172" font-size="11" fill="currentColor">→ đừng viết operator</text>
<rect x="340" y="20" width="300" height="170" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="490" y="46" text-anchor="middle" font-size="13" fill="currentColor">NÊN viết Operator</text>
<text x="360" y="76" font-size="11" fill="currentColor">- Stateful phức tạp (DB, Kafka, etcd)</text>
<text x="360" y="100" font-size="11" fill="currentColor">- Có tri thức vận hành đặc thù:</text>
<text x="372" y="122" font-size="11" fill="currentColor">failover, backup, promote, reshard</text>
<text x="360" y="146" font-size="11" fill="currentColor">- Restart sai thứ tự = mất/hỏng data</text>
<text x="360" y="170" font-size="11" fill="currentColor">→ đóng gói SRE thành code</text>
</svg>

**NÊN** viết (hoặc dùng) operator khi:
- App **stateful phức tạp**, thứ tự thao tác quan trọng: databases (Postgres, MySQL), message brokers (Kafka), key-value (etcd, Redis Cluster), search (Elasticsearch).
- Tồn tại **runbook vận hành đặc thù** không diễn tả nổi bằng YAML tĩnh: "primary chết thì fence nó, promote replica có WAL mới nhất, reroute traffic, rồi rebuild node cũ".
- Bạn muốn **self-service**: dev chỉ apply một CR nhỏ, không cần hiểu nội tại.

**KHÔNG NÊN** viết operator khi:
- App **stateless** hoặc trạng thái đơn giản → **Deployment + Service + HPA + Helm/Kustomize** đã giải quyết trọn (self-healing, scale, rollout đều built-in). Viết operator chỉ thêm một service phải bảo trì mà không thêm giá trị.
- Việc chỉ là "điền tham số vào template" → đó đúng địa hạt của **Helm**, không cần controller.
- **Đã có operator chín muồi** trên OperatorHub → **dùng lại**, đừng viết lại. Vận hành một database đúng cách là bài toán khó bậc nhất; hàng nghìn giờ kỹ sư đã nằm trong CloudNativePG hay Strimzi (Kafka).

> **Quy tắc:** Helm đóng gói *cách dựng*. Operator đóng gói *cách vận hành liên tục*. Chỉ trả giá cho operator khi bạn thật sự có **tri thức vận hành động** cần chạy 24/7.

### 2.8 Viết operator thật: Kubebuilder / Operator SDK

Bạn gần như **không bao giờ** tự viết reconcile loop từ số 0 (phải tự lo watch, cache, work-queue, leader election, retry/backoff...). Hai bộ scaffold chuẩn lo phần khung:

- **Kubebuilder** — nền tảng do SIG API Machinery duy trì, dựa trên thư viện `controller-runtime`. Sinh sẵn project Go, CRD từ Go struct (dùng comment marker), và khung `Reconcile`.
- **Operator SDK** (Red Hat) — bọc quanh Kubebuilder, **thêm** đường Helm-based và Ansible-based operator (không cần Go), cộng tích hợp **OLM** (Operator Lifecycle Manager) để phân phối/nâng cấp operator.

```bash
# Khởi tạo project + sinh API (CRD + controller skeleton)
kubebuilder init --domain example.com --repo github.com/acme/pg-operator
kubebuilder create api --group db --version v1alpha1 --kind PostgresCluster
# -> sinh api/v1alpha1/postgrescluster_types.go  (định nghĩa Spec/Status = CRD)
# -> sinh internal/controller/postgrescluster_controller.go  (hàm Reconcile trống)

make manifests   # sinh file CRD YAML từ Go struct (single source of truth)
make install     # apply CRD vào cluster
make run          # chạy controller cục bộ để dev (hoặc `make deploy` vào cluster)
```

Bạn khai báo schema **một lần** trong Go struct; `make manifests` sinh ra CRD YAML tự động — tránh lệch giữa code và manifest. Việc còn lại của bạn: **điền tri thức vận hành vào hàm `Reconcile`** ở mục 2.5. Đó mới là phần giá trị — phần còn lại đã được scaffold lo.

---

## 3. Một tình huống thực tế & con số

Giả sử vận hành 40 cụm PostgreSQL cho 40 team nội bộ. **Không operator:** mỗi lần primary chết là một sự cố thủ công — trung bình 15–30 phút downtime, phải có người trực on-call, và mỗi team lại làm backup một kiểu (kiểu nào cũng có team quên). Nhân 40 cụm, đó là gánh nặng khổng lồ và rủi ro mất dữ liệu thường trực.

**Có operator** (ví dụ CloudNativePG): failover tự động thường **dưới 30 giây**, không cần con người; backup lên object storage + WAL archiving bật mặc định cho **mọi** cụm qua cùng một CR; thêm một team mới = apply một CR ~15 dòng thay vì một tuần thiết lập. Tri thức vận hành được **chuẩn hoá một lần, áp dụng đồng nhất** cho cả 40 cụm — đó chính là ROI của operator pattern.

---

## 4. Tóm tắt
- Kubernetes cho phép **mở rộng chính API** của nó: **CRD** đăng ký một `kind` mới (ví dụ `PostgresCluster`), lập tức có endpoint REST, lưu etcd, được kubectl/RBAC hiểu — nhưng **CRD chỉ là dữ liệu, tự nó không làm gì**.
- **Operator = CRD + custom controller**. Controller chạy **reconcile loop** (level-triggered, idempotent) giống controller built-in, nhưng cho **app của bạn** — và trong đó **đóng gói tri thức vận hành**: backup, failover, scale, upgrade.
- **Operator Maturity Model** 5 cấp, từ *Basic Install* tới *Auto Pilot* — càng cao càng thay được kỹ sư vận hành.
- **Quyết định đúng:** stateless/đơn giản → **Deployment + Helm là đủ**, đừng viết operator; stateful phức tạp có runbook vận hành động → operator xứng đáng; và **luôn ưu tiên dùng lại** operator chín muồi trên OperatorHub thay vì viết lại.
- Viết thật thì dùng **Kubebuilder / Operator SDK** để scaffold; công sức thật của bạn nằm ở việc điền **tri thức vận hành** vào hàm `Reconcile`.

> **Bài tiếp theo (Bài 16):** GitOps — biến Git thành **nguồn chân lý duy nhất** cho cả cluster: Argo CD / Flux liên tục reconcile trạng thái cluster về đúng những gì khai báo trong repo, khép lại vòng tròn declarative mà toàn course đã xây.
