# Bài 6 — StatefulSet, DaemonSet, Job & CronJob

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao Deployment không đủ** cho stateful app (DB, Kafka, Zookeeper) và **StatefulSet** giải quyết gì: stable identity, stable network id, stable storage, thứ tự khởi động/scale.
- Dùng **DaemonSet** để chạy **đúng 1 pod trên MỖI node** (log agent, node exporter, CNI).
- Dùng **Job** cho tác vụ **chạy tới hoàn thành** (batch) với `completions`/`parallelism`, và **CronJob** để chạy Job theo lịch cron.
- Chọn **đúng workload controller** cho từng bài toán.

---

## 2. Lý thuyết

### 2.1 Vì sao Deployment không đủ?

Ở bài trước bạn học **Deployment** (xem [[cn-05-deployment-replicaset]]): tạo N pod **giống hệt và ẩn danh**. Pod của Deployment như **công nhân thời vụ** — ai cũng như ai, chết thì thuê người mới, tên ngẫu nhiên (`web-7d9f-xk2p9`), không có ổ đĩa riêng cố định. Điều đó **hoàn hảo cho stateless** (web, API) nhưng **sụp đổ với stateful**.

Hãy thử triển khai một cluster database (3 node replica) bằng Deployment:

| Nhu cầu của DB cluster | Deployment cho gì |
|------------------------|-------------------|
| Mỗi node có **danh tính cố định** (node-0 là primary, node-1/2 là replica) | Tên pod ngẫu nhiên, đổi mỗi lần restart → không biết ai là ai |
| Mỗi node giữ **đúng ổ đĩa dữ liệu của nó** sau khi restart | Volume dùng chung hoặc random → replica cắm nhầm data của node khác |
| Các node **gọi nhau qua địa chỉ ổn định** để replicate | Service load-balance ngẫu nhiên → không địa chỉ hoá từng peer được |
| Khởi động **có thứ tự** (primary trước, replica sau) | Tạo song song, thứ tự bất định |

→ Đây chính là lý do có **StatefulSet**: một workload controller cho pod cần **danh tính bền vững (sticky identity)**.

### 2.2 StatefulSet — pod có "căn cước"

StatefulSet cấp cho mỗi pod **ba thứ ổn định, gắn liền suốt vòng đời** kể cả khi pod bị xoá và tạo lại:

<svg viewBox="0 0 640 250" role="img" aria-labelledby="ss-t ss-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="ss-t">Ba đảm bảo ổn định của StatefulSet</title>
<desc id="ss-d">Mỗi pod trong StatefulSet có ordinal cố định, tên DNS ổn định qua headless Service, và PersistentVolume riêng gắn theo ordinal</desc>
<rect x="20" y="20" width="600" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="45" text-anchor="middle" font-size="13" fill="currentColor">StatefulSet "db" (replicas=3) + Headless Service "db"</text>
<rect x="40" y="90" width="150" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="112" text-anchor="middle" font-size="12" fill="currentColor">db-0</text>
<text x="115" y="128" text-anchor="middle" font-size="10" fill="currentColor">db-0.db (DNS)</text>
<rect x="245" y="90" width="150" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="112" text-anchor="middle" font-size="12" fill="currentColor">db-1</text>
<text x="320" y="128" text-anchor="middle" font-size="10" fill="currentColor">db-1.db (DNS)</text>
<rect x="450" y="90" width="150" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="112" text-anchor="middle" font-size="12" fill="currentColor">db-2</text>
<text x="525" y="128" text-anchor="middle" font-size="10" fill="currentColor">db-2.db (DNS)</text>
<rect x="40" y="170" width="150" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="192" text-anchor="middle" font-size="11" fill="currentColor">PVC data-db-0</text>
<text x="115" y="208" text-anchor="middle" font-size="10" fill="currentColor">10Gi (riêng)</text>
<rect x="245" y="170" width="150" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="192" text-anchor="middle" font-size="11" fill="currentColor">PVC data-db-1</text>
<text x="320" y="208" text-anchor="middle" font-size="10" fill="currentColor">10Gi (riêng)</text>
<rect x="450" y="170" width="150" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="525" y="192" text-anchor="middle" font-size="11" fill="currentColor">PVC data-db-2</text>
<text x="525" y="208" text-anchor="middle" font-size="10" fill="currentColor">10Gi (riêng)</text>
<line x1="115" y1="136" x2="115" y2="170" stroke="currentColor" stroke-width="1.3"/>
<line x1="320" y1="136" x2="320" y2="170" stroke="currentColor" stroke-width="1.3"/>
<line x1="525" y1="136" x2="525" y2="170" stroke="currentColor" stroke-width="1.3"/>
</svg>

1. **Stable identity (ordinal)**: pod được đặt tên `<statefulset>-<index>`: `db-0`, `db-1`, `db-2` — không ngẫu nhiên. `db-0` xoá đi, tạo lại vẫn là `db-0`. Đây là "căn cước" để app tự phân vai (ví dụ ordinal 0 = primary).
2. **Stable network id**: kết hợp với một **Headless Service** (`clusterIP: None`), mỗi pod có một tên DNS bền: `db-0.db.namespace.svc.cluster.local`. Peer gọi thẳng `db-0.db` là luôn trúng đúng pod đó — không bị load-balance ngẫu nhiên.
3. **Stable storage**: qua `volumeClaimTemplates`, K8s tạo **một PVC riêng cho mỗi pod** (`data-db-0`, `data-db-1`...). Pod `db-1` restart luôn được gắn lại **đúng** volume `data-db-1` — dữ liệu không lẫn lộn.

**Thứ tự có kiểm soát (ordered):**
- **Scale up / khởi động**: tạo **tuần tự** từ ordinal thấp: `db-0` chạy & Ready → mới tạo `db-1` → rồi `db-2`. (Đảm bảo primary sẵn sàng trước replica.)
- **Scale down / xoá**: theo **thứ tự ngược**: `db-2` trước, rồi `db-1`... (Không bao giờ hạ primary trước replica.)
- Muốn tạo song song để nhanh hơn (khi app tự lo thứ tự): đặt `podManagementPolicy: Parallel`.

> Điểm mấu chốt: StatefulSet **không tự làm app của bạn thành cluster**. Nó chỉ cấp *danh tính + mạng + đĩa ổn định*; **logic replicate/bầu primary vẫn là của app** (Postgres, MySQL, Kafka...). StatefulSet chỉ tạo mảnh đất ổn định để app đó dựng cluster.

### 2.3 YAML StatefulSet đầy đủ

```yaml
# Headless Service: BẮT BUỘC cho DNS per-pod. clusterIP: None
apiVersion: v1
kind: Service
metadata:
  name: db            # tên này thành hậu tố DNS: <pod>.db
  labels: { app: db }
spec:
  clusterIP: None     # <-- headless: không có VIP, DNS trả về IP từng pod
  selector: { app: db }
  ports:
    - port: 5432
      name: pg
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
spec:
  serviceName: db          # <-- phải trỏ tới headless Service ở trên
  replicas: 3
  selector:
    matchLabels: { app: db }
  podManagementPolicy: OrderedReady   # mặc định; hoặc Parallel
  updateStrategy:
    type: RollingUpdate      # cập nhật từ ordinal cao xuống thấp
  template:
    metadata:
      labels: { app: db }
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
              name: pg
          volumeMounts:
            - name: data          # tên khớp volumeClaimTemplates
              mountPath: /var/lib/postgresql/data
  # Mỗi pod được cấp 1 PVC riêng theo template này:
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard
        resources:
          requests:
            storage: 10Gi
```

Kiểm chứng nhanh sau khi apply:

```bash
kubectl apply -f db.yaml
kubectl get pods -l app=db            # db-0, db-1, db-2 (tên có thứ tự)
kubectl get pvc                       # data-db-0, data-db-1, data-db-2

# DNS per-pod: từ 1 pod khác, resolve tên bền của db-0
kubectl run t --rm -it --image=busybox -- nslookup db-0.db.default.svc.cluster.local

# Xoá db-1 -> controller tạo lại đúng "db-1", cắm lại đúng PVC data-db-1
kubectl delete pod db-1
```

> ⚠️ Xoá StatefulSet **không** tự xoá PVC (an toàn cho dữ liệu). Muốn dọn sạch phải `kubectl delete pvc -l app=db` thủ công.

### 2.4 DaemonSet — đúng 1 pod trên MỖI node

Một số việc cần chạy **trên từng máy**, không phải "N bản đâu đó":
- Thu **log** của mọi container trên node (Fluent Bit, Filebeat).
- Xuất **metric** của node (Prometheus **node-exporter**: CPU/RAM/disk của chính máy).
- **Networking/CNI** (Calico, Cilium), storage plugin, security agent.

DaemonSet đảm bảo: **mỗi node đủ điều kiện đúng 1 pod**. Thêm node mới vào cluster → DaemonSet **tự đẻ** 1 pod lên node đó. Bỏ node đi → pod biến mất theo. Bạn **không khai báo `replicas`** — số bản = số node phù hợp.

<svg viewBox="0 0 640 200" role="img" aria-labelledby="ds-t ds-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="ds-t">DaemonSet chạy một pod trên mỗi node</title>
<desc id="ds-d">Ba node, mỗi node có đúng một pod của DaemonSet log-agent; thêm node thứ tư thì tự sinh thêm pod</desc>
<rect x="20" y="40" width="140" height="110" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="62" text-anchor="middle" font-size="12" fill="currentColor">node-1</text>
<rect x="40" y="80" width="100" height="30" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="100" text-anchor="middle" font-size="10" fill="currentColor">log-agent</text>
<text x="90" y="135" text-anchor="middle" font-size="9" fill="currentColor">+ app pods</text>
<rect x="180" y="40" width="140" height="110" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="250" y="62" text-anchor="middle" font-size="12" fill="currentColor">node-2</text>
<rect x="200" y="80" width="100" height="30" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="250" y="100" text-anchor="middle" font-size="10" fill="currentColor">log-agent</text>
<text x="250" y="135" text-anchor="middle" font-size="9" fill="currentColor">+ app pods</text>
<rect x="340" y="40" width="140" height="110" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="410" y="62" text-anchor="middle" font-size="12" fill="currentColor">node-3</text>
<rect x="360" y="80" width="100" height="30" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="410" y="100" text-anchor="middle" font-size="10" fill="currentColor">log-agent</text>
<text x="410" y="135" text-anchor="middle" font-size="9" fill="currentColor">+ app pods</text>
<rect x="500" y="40" width="120" height="110" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="560" y="62" text-anchor="middle" font-size="12" fill="currentColor">node-4 (mới)</text>
<rect x="515" y="80" width="90" height="30" rx="6" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="560" y="100" text-anchor="middle" font-size="10" fill="currentColor">log-agent</text>
<text x="560" y="135" text-anchor="middle" font-size="9" fill="currentColor">tự sinh ra</text>
</svg>

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels: { app: node-exporter }
  template:
    metadata:
      labels: { app: node-exporter }
    spec:
      hostNetwork: true          # dùng network của node để cào metric máy
      hostPID: true
      # tolerations: cho phép chạy CẢ trên control-plane node (thường bị taint)
      tolerations:
        - operator: Exists       # tolerate mọi taint -> phủ mọi node
      containers:
        - name: node-exporter
          image: prom/node-exporter:v1.8.2
          args: ["--path.rootfs=/host"]
          ports:
            - containerPort: 9100
              hostPort: 9100
          volumeMounts:
            - name: rootfs
              mountPath: /host
              readOnly: true
      volumes:
        - name: rootfs
          hostPath: { path: / }   # đọc filesystem của node
```

Mấu chốt DaemonSet:
- **`tolerations`** rất hay cần: nhiều node (nhất là control-plane) bị **taint** để đẩy pod thường ra; agent hệ thống phải `tolerate` mới phủ được hết node.
- Muốn giới hạn chỉ một nhóm node (ví dụ chỉ node có GPU): thêm `spec.template.spec.nodeSelector` hoặc `affinity`.
- `hostPath`/`hostNetwork`/`hostPID` thường xuất hiện vì agent cần "nhìn" vào node — đây là quyền cao, hãy dùng có ý thức bảo mật.

### 2.5 Job — chạy tới hoàn thành

Deployment/StatefulSet/DaemonSet đều **chạy mãi** (long-running, luôn restart). Nhưng nhiều tác vụ có **điểm kết thúc**: migrate database, xử lý một batch dữ liệu, gửi 100k email, train một mẻ. Cho những việc đó dùng **Job**: chạy pod **tới khi thành công (exit 0)** rồi **dừng** — không restart vô hạn.

Hai tham số định hình Job:
- **`completions`**: cần **bao nhiêu lần chạy thành công** thì Job coi là xong.
- **`parallelism`**: **bao nhiêu pod chạy song song** cùng lúc.

<svg viewBox="0 0 620 200" role="img" aria-labelledby="jb-t jb-d" style="width:100%;max-width:580px;height:auto;display:block;margin:1.25rem auto">
<title id="jb-t">Job với completions=6 và parallelism=2</title>
<desc id="jb-d">Sáu work item chạy hai pod song song trong ba đợt cho tới khi đủ sáu lần thành công</desc>
<text x="310" y="24" text-anchor="middle" font-size="12" fill="currentColor">Job: completions=6, parallelism=2 — chạy 2 pod cùng lúc, 3 đợt</text>
<rect x="40" y="50" width="150" height="120" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="70" text-anchor="middle" font-size="11" fill="currentColor">Đợt 1</text>
<rect x="55" y="82" width="120" height="26" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="99" text-anchor="middle" font-size="10" fill="currentColor">pod 1 → ok</text>
<rect x="55" y="120" width="120" height="26" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="137" text-anchor="middle" font-size="10" fill="currentColor">pod 2 → ok</text>
<rect x="235" y="50" width="150" height="120" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="70" text-anchor="middle" font-size="11" fill="currentColor">Đợt 2</text>
<rect x="250" y="82" width="120" height="26" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="99" text-anchor="middle" font-size="10" fill="currentColor">pod 3 → ok</text>
<rect x="250" y="120" width="120" height="26" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="137" text-anchor="middle" font-size="10" fill="currentColor">pod 4 → ok</text>
<rect x="430" y="50" width="150" height="120" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="505" y="70" text-anchor="middle" font-size="11" fill="currentColor">Đợt 3</text>
<rect x="445" y="82" width="120" height="26" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="505" y="99" text-anchor="middle" font-size="10" fill="currentColor">pod 5 → ok</text>
<rect x="445" y="120" width="120" height="26" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="505" y="137" text-anchor="middle" font-size="10" fill="currentColor">pod 6 → xong</text>
</svg>

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
spec:
  completions: 6        # cần 6 lần thành công
  parallelism: 2        # chạy 2 pod cùng lúc
  backoffLimit: 4       # retry tối đa 4 lần trước khi coi Job Failed
  activeDeadlineSeconds: 600   # trần thời gian: quá 10 phút -> kill
  ttlSecondsAfterFinished: 3600  # tự dọn Job (và pod) sau 1h kể từ khi xong
  template:
    spec:
      restartPolicy: Never    # BẮT BUỘC Never hoặc OnFailure (không Always)
      containers:
        - name: worker
          image: myapp:1.4
          command: ["python", "process_batch.py"]
```

Các mẫu dùng Job (patterns):
- **Non-parallel** (`completions` không đặt hoặc =1, `parallelism`=1): chạy **1 lần**, ví dụ migrate DB.
- **Fixed completion count** (`completions=N`, `parallelism=P`): xử lý **N work item** với tối đa P song song (như hình).
- **Work queue** (`parallelism=P`, **không** đặt `completions`): P pod cùng rút việc từ một queue (Redis, SQS); pod nào cũng exit 0 khi queue rỗng thì Job xong.

Điểm kỹ thuật quan trọng:
- `restartPolicy` của pod trong Job **phải** là `Never` hoặc `OnFailure` — không được `Always` (Job không phải để chạy mãi).
- `backoffLimit`: số lần retry trước khi Job bị đánh dấu **Failed** — tránh retry vô tận khi code lỗi.
- `ttlSecondsAfterFinished`: rất nên đặt để pod/Job xong **tự dọn**, khỏi rác cluster.

### 2.6 CronJob — Job theo lịch

**CronJob** = "cái máy đẻ Job theo lịch cron". Cứ tới giờ, nó **tạo một Job mới** (Job đó lại tạo pod). Dùng cho: backup hằng đêm, gửi report định kỳ, dọn dữ liệu cũ, đồng bộ theo giờ.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-backup
spec:
  schedule: "0 2 * * *"          # 02:00 mỗi ngày (phút giờ ngày tháng thứ)
  timeZone: "Asia/Ho_Chi_Minh"   # k8s >=1.27; mặc định là UTC
  concurrencyPolicy: Forbid      # Allow | Forbid | Replace
  startingDeadlineSeconds: 300   # trễ quá 5 phút thì bỏ lượt đó
  successfulJobsHistoryLimit: 3  # giữ log 3 Job thành công gần nhất
  failedJobsHistoryLimit: 1
  jobTemplate:                   # <-- y hệt spec của một Job
    spec:
      backoffLimit: 2
      ttlSecondsAfterFinished: 86400
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: postgres:16
              command: ["/bin/sh","-c"]
              args:
                - pg_dump -h db-0.db -U app appdb | gzip > /backup/$(date +%F).sql.gz
```

Cú pháp cron 5 trường: `phút(0-59) giờ(0-23) ngày-tháng(1-31) tháng(1-12) thứ(0-6, 0=CN)`. Vài ví dụ:

| Lịch | Ý nghĩa |
|------|---------|
| `*/15 * * * *` | mỗi 15 phút |
| `0 * * * *` | đầu mỗi giờ |
| `0 2 * * *` | 02:00 hằng ngày |
| `0 3 * * 0` | 03:00 mỗi Chủ nhật |
| `0 9 1 * *` | 09:00 ngày 1 mỗi tháng |

**`concurrencyPolicy`** — chuyện dễ sai: nếu Job chạy lâu hơn chu kỳ (backup 40 phút mà lịch mỗi 30 phút) thì lượt sau đè lên lượt trước:
- `Allow` (mặc định): cho chạy chồng — dễ tranh tài nguyên/lock DB.
- `Forbid`: bỏ qua lượt mới nếu lượt cũ chưa xong — hợp cho backup.
- `Replace`: giết Job cũ, chạy Job mới.

```bash
kubectl get cronjob nightly-backup       # xem LAST SCHEDULE
kubectl get jobs                          # các Job cronjob đã đẻ ra
kubectl create job --from=cronjob/nightly-backup manual-run   # chạy tay 1 lượt để test
```

### 2.7 Chọn đúng controller

<svg viewBox="0 0 640 240" role="img" aria-labelledby="pk-t pk-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="pk-t">Cây quyết định chọn workload controller</title>
<desc id="pk-d">Phân nhánh theo tác vụ chạy mãi hay có điểm kết thúc, cần danh tính bền hay không, cần mỗi node một pod hay không</desc>
<rect x="230" y="12" width="180" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="33" text-anchor="middle" font-size="11" fill="currentColor">Workload của bạn?</text>
<rect x="30" y="80" width="150" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="100" text-anchor="middle" font-size="10" fill="currentColor">Chạy mãi, stateless,</text>
<text x="105" y="115" text-anchor="middle" font-size="10" fill="currentColor">ẩn danh → Deployment</text>
<rect x="200" y="80" width="150" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="100" text-anchor="middle" font-size="10" fill="currentColor">Chạy mãi, cần danh</text>
<text x="275" y="115" text-anchor="middle" font-size="10" fill="currentColor">tính/đĩa → StatefulSet</text>
<rect x="370" y="80" width="150" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="445" y="100" text-anchor="middle" font-size="10" fill="currentColor">1 pod mỗi node</text>
<text x="445" y="115" text-anchor="middle" font-size="10" fill="currentColor">→ DaemonSet</text>
<rect x="200" y="160" width="150" height="46" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="275" y="180" text-anchor="middle" font-size="10" fill="currentColor">Chạy tới xong,</text>
<text x="275" y="195" text-anchor="middle" font-size="10" fill="currentColor">1 lần → Job</text>
<rect x="370" y="160" width="150" height="46" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor"/>
<text x="445" y="180" text-anchor="middle" font-size="10" fill="currentColor">Chạy tới xong,</text>
<text x="445" y="195" text-anchor="middle" font-size="10" fill="currentColor">theo lịch → CronJob</text>
<line x1="320" y1="46" x2="105" y2="80" stroke="currentColor" stroke-width="1"/>
<line x1="320" y1="46" x2="275" y2="80" stroke="currentColor" stroke-width="1"/>
<line x1="320" y1="46" x2="445" y2="80" stroke="currentColor" stroke-width="1"/>
<line x1="320" y1="46" x2="275" y2="160" stroke="currentColor" stroke-width="1"/>
<line x1="320" y1="46" x2="445" y2="160" stroke="currentColor" stroke-width="1"/>
</svg>

| Controller | Số pod | Danh tính | Storage | Vòng đời | Dùng cho |
|------------|--------|-----------|---------|----------|----------|
| **Deployment** | `replicas` N | ẩn danh, ngẫu nhiên | dùng chung/không | chạy mãi | web, API, worker stateless |
| **StatefulSet** | `replicas` N, có thứ tự | ổn định (`-0`,`-1`), DNS bền | PVC riêng/pod | chạy mãi | DB, Kafka, Zookeeper, Elasticsearch |
| **DaemonSet** | = số node phù hợp | theo node | hostPath thường | chạy mãi | log agent, node-exporter, CNI |
| **Job** | tới `completions` | ẩn danh | tuỳ | tới hoàn thành | migrate, batch, import |
| **CronJob** | đẻ Job theo lịch | — | tuỳ | định kỳ | backup, report, dọn rác |

Con số thực tế đáng nhớ: một Kafka cluster 3 broker chạy bằng StatefulSet (`kafka-0/1/2`, mỗi broker giữ đúng partition data trên PVC của nó); Fluent Bit gom log chạy DaemonSet (1 pod/node, node 200 hay 5 đều tự phủ); backup Postgres chạy CronJob `0 2 * * *`; còn API front chạy Deployment scale 3→30 theo tải.

---

## 3. Sai lầm thường gặp
- **Dùng Deployment cho DB rồi mount cùng một PVC cho nhiều replica** → data corruption (nhiều process ghi 1 volume RWO). Stateful phải StatefulSet + `volumeClaimTemplates`.
- **Quên headless Service** (hoặc đặt `clusterIP` thường) → mất DNS per-pod, peer không địa chỉ hoá được nhau.
- **Job đặt `restartPolicy: Always`** → API từ chối; phải `Never`/`OnFailure`.
- **CronJob để `Allow` mặc định với Job chạy lâu** → chồng lượt, khoá DB, cạn tài nguyên. Backup nên `Forbid`.
- **Quên `ttlSecondsAfterFinished`** → hàng trăm pod `Completed` tồn đọng làm rối cluster.

---

## 4. Tóm tắt
- **StatefulSet** cấp cho pod **danh tính bền** (ordinal `-0`,`-1`), **DNS ổn định** (qua headless Service), **PVC riêng mỗi pod** (`volumeClaimTemplates`), và **thứ tự** khởi động/scale — nền tảng cho DB/Kafka/Zookeeper. Nó cấp đất ổn định, còn logic cluster là của app.
- **DaemonSet** đảm bảo **đúng 1 pod trên mỗi node** (không `replicas`); thêm node → tự sinh pod. Dùng cho log agent, node-exporter, CNI; hay cần `tolerations` để phủ cả node bị taint.
- **Job** chạy pod **tới hoàn thành**; `completions` = số lần cần thành công, `parallelism` = số pod song song; `restartPolicy` phải `Never`/`OnFailure`, đặt `backoffLimit` và `ttlSecondsAfterFinished`.
- **CronJob** đẻ Job theo **lịch cron**; chú ý `concurrencyPolicy` (Allow/Forbid/Replace) khi Job chạy lâu hơn chu kỳ.
- Chọn đúng: chạy-mãi + ẩn danh → **Deployment**; chạy-mãi + danh tính → **StatefulSet**; mỗi-node-1-pod → **DaemonSet**; chạy-tới-xong → **Job**; theo-lịch → **CronJob**.

> **Bài tiếp theo (Bài 7):** cho các pod nói chuyện với thế giới — **Service & networking**: ClusterIP, NodePort, LoadBalancer, và Ingress định tuyến HTTP theo host/path.
