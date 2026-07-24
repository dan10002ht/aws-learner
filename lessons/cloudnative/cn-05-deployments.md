# Bài 5 — Deployment, ReplicaSet, rolling update & rollback

## 1. Mục tiêu
Sau bài này bạn có thể:
- Vẽ được **phân cấp** Deployment → ReplicaSet → Pod và giải thích **mỗi tầng lo việc gì**.
- Hiểu **desired replicas** và cơ chế **self-healing**: Pod chết được tự tạo lại, không cần bạn can thiệp.
- Chạy **rolling update** zero-downtime: hiểu `maxSurge`/`maxUnavailable` điều khiển tốc độ & rủi ro thế nào.
- Dùng thành thạo `kubectl rollout status/history/undo` để theo dõi và **rollback**.
- **Scale** thủ công bằng `kubectl scale` và giải thích vì sao **KHÔNG bao giờ tạo Pod trần** trong production.

---

## 2. Lý thuyết

### 2.1 Vì sao không tạo Pod trần (naked Pod)?

Pod là đơn vị chạy nhỏ nhất, nhưng bản thân Pod **không tự chữa lành**. Một Pod trần (bạn `kubectl apply` một object `kind: Pod`) giống như thuê **một** nhân viên hợp đồng: anh ta nghỉ việc là *ghế trống vĩnh viễn* — không ai tự tuyển người thay.

Cụ thể, nếu Pod trần chết vì:
- Process bên trong crash → `restartPolicy` có thể restart **container** *trong cùng Pod* (nếu Pod còn sống).
- **Node** đỡ Pod đó chết/bị drain → Pod biến mất **vĩnh viễn**. Không có ai tạo Pod mới ở node khác. Ứng dụng của bạn mất một bản chạy mà không ai hay.

Bạn cần một **controller** đứng canh: liên tục so sánh "đang có mấy Pod sống" với "muốn có mấy Pod", thiếu thì tạo bù. Đó chính là **ReplicaSet**. Và bạn hầu như không bao giờ tạo ReplicaSet trực tiếp — bạn tạo **Deployment**, nó quản lý ReplicaSet giúp bạn.

> Quy tắc vàng: **production chỉ tạo workload qua controller** (Deployment/StatefulSet/DaemonSet/Job), không bao giờ `kind: Pod` trần trừ khi debug tạm.

### 2.2 Phân cấp Deployment → ReplicaSet → Pod

Ba tầng, mỗi tầng một trách nhiệm rạch ròi:

<svg viewBox="0 0 640 300" role="img" aria-labelledby="hi-t hi-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="hi-t">Phân cấp Deployment, ReplicaSet, Pod</title>
<desc id="hi-d">Deployment quản lý nhiều ReplicaSet theo phiên bản, mỗi ReplicaSet đảm bảo số Pod mong muốn</desc>
<rect x="230" y="15" width="180" height="52" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="37" text-anchor="middle" font-size="13" fill="currentColor">Deployment: web</text>
<text x="320" y="55" text-anchor="middle" font-size="10" fill="currentColor">quản lý rollout &amp; lịch sử</text>
<rect x="70" y="120" width="180" height="50" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="160" y="141" text-anchor="middle" font-size="12" fill="currentColor">ReplicaSet web-v1</text>
<text x="160" y="158" text-anchor="middle" font-size="10" fill="currentColor">replicas desired = 0 (cũ)</text>
<rect x="390" y="120" width="180" height="50" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="480" y="141" text-anchor="middle" font-size="12" fill="currentColor">ReplicaSet web-v2</text>
<text x="480" y="158" text-anchor="middle" font-size="10" fill="currentColor">replicas desired = 3 (mới)</text>
<rect x="400" y="220" width="50" height="50" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="425" y="249" text-anchor="middle" font-size="10" fill="currentColor">Pod</text>
<rect x="465" y="220" width="50" height="50" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="490" y="249" text-anchor="middle" font-size="10" fill="currentColor">Pod</text>
<rect x="530" y="220" width="50" height="50" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="555" y="249" text-anchor="middle" font-size="10" fill="currentColor">Pod</text>
<line x1="290" y1="67" x2="160" y2="120" stroke="currentColor" stroke-width="1"/>
<line x1="350" y1="67" x2="480" y2="120" stroke="currentColor" stroke-width="1"/>
<line x1="450" y1="170" x2="425" y2="220" stroke="currentColor" stroke-width="1"/>
<line x1="480" y1="170" x2="490" y2="220" stroke="currentColor" stroke-width="1"/>
<line x1="510" y1="170" x2="555" y2="220" stroke="currentColor" stroke-width="1"/>
<text x="160" y="200" text-anchor="middle" font-size="10" fill="currentColor">(0 Pod — đã thu về)</text>
</svg>

| Tầng | Trách nhiệm chính | Cái nó KHÔNG lo |
|------|-------------------|-----------------|
| **Deployment** | Quản lý *rollout*: tạo ReplicaSet mới khi đổi template, chuyển dần Pod cũ → mới, lưu **lịch sử** để rollback | Không trực tiếp đếm/tạo Pod |
| **ReplicaSet** | Giữ đúng **số replica** cho **một** phiên bản pod-template cố định; thiếu thì tạo, dư thì xoá | Không biết gì về "phiên bản mới", không rollout |
| **Pod** | Chạy container thật | Không tự sinh lại khi node chết |

Mấu chốt: **một Deployment sinh ra nhiều ReplicaSet theo thời gian** — mỗi lần bạn đổi image (hoặc bất kỳ field nào trong `spec.template`), Deployment tạo **một ReplicaSet mới** và co ReplicaSet cũ về 0. ReplicaSet cũ **không bị xoá** (mặc định giữ 10 bản) → đó là cách rollback hoạt động.

### 2.3 Desired replicas & self-healing

ReplicaSet chạy đúng vòng lặp **reconciliation** đã học ở Bài 1: `desired = 3`, đếm Pod sống có nhãn khớp `selector`, nếu `actual < desired` thì tạo bù, `actual > desired` thì xoá bớt.

<svg viewBox="0 0 620 180" role="img" aria-labelledby="sh-t sh-d" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto">
<title id="sh-t">Self-healing khi một Pod chết</title>
<desc id="sh-d">Một Pod chết làm actual còn 2 so với desired 3, ReplicaSet tạo Pod mới để khớp lại</desc>
<rect x="30" y="60" width="150" height="52" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="82" text-anchor="middle" font-size="12" fill="currentColor">desired = 3</text>
<text x="105" y="100" text-anchor="middle" font-size="10" fill="currentColor">(ReplicaSet spec)</text>
<rect x="235" y="55" width="150" height="62" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="80" text-anchor="middle" font-size="12" fill="currentColor">RS controller</text>
<text x="310" y="98" text-anchor="middle" font-size="10" fill="currentColor">Pod chết → actual=2</text>
<rect x="440" y="60" width="150" height="52" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="515" y="82" text-anchor="middle" font-size="12" fill="currentColor">tạo Pod mới</text>
<text x="515" y="100" text-anchor="middle" font-size="10" fill="currentColor">actual → 3, khớp</text>
<line x1="180" y1="86" x2="233" y2="86" stroke="currentColor" stroke-width="1.3" marker-end="url(#a5)"/>
<line x1="385" y1="86" x2="438" y2="86" stroke="currentColor" stroke-width="1.3" marker-end="url(#a5)"/>
<text x="310" y="150" text-anchor="middle" font-size="10" fill="currentColor">Vòng lặp chạy mãi — bạn không viết dòng code "nếu chết thì tạo lại" nào</text>
<defs><marker id="a5" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Lưu ý self-healing **không** khôi phục dữ liệu trong Pod cũ (Pod là *cattle, not pets*) — nó tạo một Pod **mới toanh** từ template. Vì vậy Pod phải **stateless** hoặc lưu trạng thái ra ngoài (volume/DB). Đây là lý do ứng dụng chạy tốt trên k8s phải thiết kế theo 12-factor.

---

## 3. Deployment YAML — mổ xẻ từng field

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels:
    app: web
spec:
  replicas: 3                 # desired: luôn muốn 3 Pod chạy
  revisionHistoryLimit: 10    # giữ 10 ReplicaSet cũ để rollback (mặc định 10)
  selector:
    matchLabels:
      app: web                # Deployment quản Pod nào? Pod có nhãn app=web
  strategy:
    type: RollingUpdate       # mặc định; thay bằng Recreate nếu muốn tắt hết rồi bật
    rollingUpdate:
      maxSurge: 1             # được tạo THÊM tối đa 1 Pod trên mức desired
      maxUnavailable: 0       # KHÔNG cho phép tụt dưới desired → zero-downtime
  template:                   # "khuôn" để đúc mỗi Pod
    metadata:
      labels:
        app: web              # PHẢI khớp selector.matchLabels ở trên
    spec:
      containers:
        - name: web
          image: nginx:1.25   # <- đổi field này sẽ kích hoạt rollout
          ports:
            - containerPort: 80
          readinessProbe:     # RẤT quan trọng cho rolling update an toàn
            httpGet:
              path: /healthz
              port: 80
            initialDelaySeconds: 3
            periodSeconds: 5
          resources:
            requests: { cpu: "100m", memory: "128Mi" }
            limits:   { cpu: "500m", memory: "256Mi" }
```

Hai điểm dễ sai và cực quan trọng:

- **`selector` phải khớp `template.labels`.** Nếu lệch, apply sẽ bị từ chối. `selector` là *bất biến* — không sửa được sau khi tạo; muốn đổi phải xoá tạo lại.
- **`readinessProbe` là linh hồn của zero-downtime.** Rolling update chỉ coi một Pod mới là "available" khi readiness = pass. Không có probe, k8s tưởng Pod sẵn sàng ngay khi container start → nó tắt Pod cũ trong khi Pod mới còn đang khởi động app → **rớt request**. Có probe, traffic chỉ đổ vào Pod thật sự phục vụ được.

Áp dụng và quan sát phân cấp:

```bash
kubectl apply -f web.yaml
kubectl get deploy web                 # READY 3/3   UP-TO-DATE 3   AVAILABLE 3
kubectl get rs -l app=web              # 1 ReplicaSet, DESIRED 3 CURRENT 3 READY 3
kubectl get pods -l app=web            # 3 Pod, tên dạng web-<rs-hash>-<random>
```

Tên Pod `web-6d8f9c7b5-x2k4p`: `6d8f9c7b5` là **hash của pod-template** (pod-template-hash) — đây là cách ReplicaSet mới/cũ được phân biệt.

---

## 4. Rolling update — cập nhật không downtime

### 4.1 Cơ chế

Khi bạn đổi `image: nginx:1.25` → `nginx:1.27`, Deployment **không** sửa Pod tại chỗ. Nó:
1. Tạo **ReplicaSet mới** (desired ban đầu 0).
2. Từ từ **tăng** desired của RS mới và **giảm** desired của RS cũ, tôn trọng `maxSurge`/`maxUnavailable`.
3. Chờ Pod mới **Ready** (qua readinessProbe) rồi mới hạ tiếp Pod cũ.
4. Lặp đến khi RS mới = 3, RS cũ = 0.

<svg viewBox="0 0 640 260" role="img" aria-labelledby="ru-t ru-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="ru-t">Rolling update chuyển dần từ v1 sang v2</title>
<desc id="ru-d">Ba bước rolling update với maxSurge 1 maxUnavailable 0, số Pod v1 giảm dần trong khi v2 tăng dần</desc>
<text x="60" y="30" font-size="11" fill="currentColor">Bước 1</text>
<rect x="120" y="15" width="34" height="30" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="137" y="35" text-anchor="middle" font-size="9" fill="currentColor">v1</text>
<rect x="160" y="15" width="34" height="30" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="177" y="35" text-anchor="middle" font-size="9" fill="currentColor">v1</text>
<rect x="200" y="15" width="34" height="30" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="217" y="35" text-anchor="middle" font-size="9" fill="currentColor">v1</text>
<rect x="248" y="15" width="34" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-dasharray="3 2"/><text x="265" y="35" text-anchor="middle" font-size="9" fill="currentColor">v2</text>
<text x="330" y="35" font-size="10" fill="currentColor">+1 Pod v2 (surge), v1 vẫn đủ 3 → không mất phục vụ</text>
<text x="60" y="115" font-size="11" fill="currentColor">Bước 2</text>
<rect x="120" y="100" width="34" height="30" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="137" y="120" text-anchor="middle" font-size="9" fill="currentColor">v1</text>
<rect x="160" y="100" width="34" height="30" rx="5" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/><text x="177" y="120" text-anchor="middle" font-size="9" fill="currentColor">v1</text>
<rect x="208" y="100" width="34" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="225" y="120" text-anchor="middle" font-size="9" fill="currentColor">v2</text>
<rect x="248" y="100" width="34" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="265" y="120" text-anchor="middle" font-size="9" fill="currentColor">v2</text>
<text x="330" y="120" font-size="10" fill="currentColor">v2 mới Ready → hạ 1 v1. Luôn có 3 Pod Ready</text>
<text x="60" y="200" font-size="11" fill="currentColor">Bước 3</text>
<rect x="128" y="185" width="34" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="145" y="205" text-anchor="middle" font-size="9" fill="currentColor">v2</text>
<rect x="168" y="185" width="34" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="185" y="205" text-anchor="middle" font-size="9" fill="currentColor">v2</text>
<rect x="208" y="185" width="34" height="30" rx="5" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/><text x="225" y="205" text-anchor="middle" font-size="9" fill="currentColor">v2</text>
<text x="330" y="205" font-size="10" fill="currentColor">Xong. RS v1 desired=0 (giữ lại để rollback)</text>
</svg>

### 4.2 maxSurge & maxUnavailable — hai nút vặn

Với `replicas: 3`:

| Cấu hình | Ý nghĩa | Đánh đổi |
|----------|---------|----------|
| `maxSurge: 1, maxUnavailable: 0` | Tạo dư 1 trước rồi mới hạ cũ; luôn ≥3 Ready | **Zero-downtime**, cần dư 1 slot tài nguyên. *Khuyên dùng.* |
| `maxSurge: 0, maxUnavailable: 1` | Hạ 1 cũ rồi mới lên 1 mới; có lúc chỉ 2 Ready | Không tốn tài nguyên dư nhưng **giảm capacity** lúc rollout |
| `maxSurge: 25%, maxUnavailable: 25%` | Mặc định của k8s | Nhanh hơn nhưng có thể tụt capacity |

- **Con số hay %**: `%` làm tròn — surge làm tròn **lên**, unavailable làm tròn **xuống**. Với replica lớn, `%` giúp rollout song song nhiều Pod (nhanh hơn).
- **Không được đặt cả hai = 0** (không có cách nào tiến). k8s sẽ từ chối.
- Muốn **thật sự** không rớt request thì cần thêm: readinessProbe + `preStop` hook (drain connection) + `terminationGracePeriodSeconds` đủ dài.

### 4.3 Trigger & theo dõi rollout

```bash
# Cách 1: sửa image nhanh (ghi lại được lịch sử)
kubectl set image deployment/web web=nginx:1.27

# Cách 2 (khuyên dùng, GitOps): sửa YAML rồi apply
kubectl apply -f web.yaml

# Theo dõi tiến trình — LỆNH KHÓA cho tới khi rollout xong hoặc lỗi
kubectl rollout status deployment/web
# Waiting for deployment "web" rollout to finish: 1 out of 3 new replicas...
# deployment "web" successfully rolled out

# Thấy 2 ReplicaSet cùng lúc trong lúc rollout
kubectl get rs -l app=web
# web-6d8f9c7b5   3   3   3   (v1 cũ, đang co về 0)
# web-79cf4bd8f   1   1   1   (v2 mới, đang lên 3)

# Tạm dừng / tiếp tục (canary thủ công: đổi image, pause, quan sát, resume)
kubectl rollout pause deployment/web
kubectl rollout resume deployment/web
```

`Recreate` vs `RollingUpdate`: `strategy.type: Recreate` **tắt hết Pod cũ** rồi mới tạo mới → **có downtime**, dùng khi app không cho phép 2 phiên bản chạy song song (ví dụ migration schema không tương thích ngược).

---

## 5. Rollout history & rollback

Deployment lưu **lịch sử revision** (chính là các ReplicaSet cũ desired=0). Đây là "nút undo" của bạn khi bản mới hỏng.

```bash
# Xem lịch sử các revision
kubectl rollout history deployment/web
# REVISION  CHANGE-CAUSE
# 1         <none>
# 2         kubectl set image deployment/web web=nginx:1.27

# Xem chi tiết một revision (template lúc đó)
kubectl rollout history deployment/web --revision=1

# ROLLBACK về revision ngay trước đó — nhanh, không cần nhớ image cũ
kubectl rollout undo deployment/web

# Rollback về revision cụ thể
kubectl rollout undo deployment/web --to-revision=1
```

Về bản chất, `undo` **không** tạo ReplicaSet mới — nó **tăng lại desired** của ReplicaSet cũ (đang là 0) và co RS hiện tại về 0. Vì Pod cũ chỉ cần "đúc lại từ template đã lưu", rollback thường **nhanh hơn** update xuôi.

Mẹo cho `CHANGE-CAUSE` có nghĩa (thay vì `<none>`): thêm annotation khi đổi, hoặc bật `--record` (đã deprecated):

```bash
kubectl annotate deployment/web \
  kubernetes.io/change-cause="upgrade nginx 1.25 -> 1.27 for CVE fix" --overwrite
```

> Rollback chỉ hoàn tác **spec của Deployment** (image, env, replicas trong template...). Nó **KHÔNG** hoàn tác dữ liệu đã ghi, migration DB đã chạy, hay message đã gửi. Bản mới đổi schema không tương thích ngược thì rollback code vẫn có thể vỡ dữ liệu — phải thiết kế **expand/contract** migration.

---

## 6. Scaling thủ công

Số replica là *desired state*, đổi nó là scale:

```bash
# Scale nhanh
kubectl scale deployment/web --replicas=10

# Scale có điều kiện (chỉ scale nếu hiện đang đúng con số kỳ vọng — tránh race)
kubectl scale deployment/web --current-replicas=3 --replicas=10

# Hoặc sửa field replicas trong YAML rồi apply (GitOps-friendly)
```

Khi scale lên 10, ReplicaSet hiện tại nâng desired lên 10 → tạo thêm 7 Pod. Scale xuống thì k8s **chọn Pod để xoá** (ưu tiên Pod chưa Ready, Pod trên node nhiều bản...).

**Lưu ý phối hợp với HPA:** nếu bạn bật **HorizontalPodAutoscaler**, thì HPA làm chủ field `replicas`. Đừng vừa `kubectl scale` vừa để HPA chạy — chúng sẽ "đánh nhau". Trong GitOps, khi có HPA nên **bỏ `replicas`** khỏi YAML Deployment để không ghi đè con số HPA đang giữ.

---

## 7. Tổng hợp lệnh vận hành

| Việc | Lệnh |
|------|------|
| Đổi image (rollout) | `kubectl set image deploy/web web=nginx:1.27` |
| Theo dõi rollout | `kubectl rollout status deploy/web` |
| Xem lịch sử | `kubectl rollout history deploy/web` |
| Rollback bản trước | `kubectl rollout undo deploy/web` |
| Rollback bản cụ thể | `kubectl rollout undo deploy/web --to-revision=N` |
| Tạm dừng / tiếp tục | `kubectl rollout pause deploy/web` / `kubectl rollout resume deploy/web` |
| Scale tay | `kubectl scale deploy/web --replicas=10` |
| Xem RS đang có | `kubectl get rs -l app=web` |
| Vì sao Pod chưa lên | `kubectl describe pod <pod>` / `kubectl get events` |

---

## 8. Tóm tắt
- **Đừng tạo Pod trần**: Pod không tự sinh lại khi node chết. Luôn dùng controller — thường là **Deployment**.
- Phân cấp: **Deployment** lo rollout & lịch sử → sinh nhiều **ReplicaSet** theo phiên bản → mỗi ReplicaSet giữ đúng **số replica** của **Pod**.
- **Self-healing** = vòng lặp reconciliation của ReplicaSet: thiếu Pod thì tạo bù (Pod mới toanh, nên app phải stateless).
- **Rolling update** tạo RS mới, chuyển Pod dần theo `maxSurge`/`maxUnavailable`; `maxUnavailable: 0` + `readinessProbe` cho **zero-downtime**.
- **Rollback** rẻ và nhanh vì ReplicaSet cũ được giữ lại (desired=0): `kubectl rollout undo`. Nhưng rollback **không** hoàn tác dữ liệu/migration.
- **Scale** = đổi `replicas`; nếu dùng **HPA** thì để HPA làm chủ, đừng scale tay đè lên.

> **Bài tiếp theo (Bài 6):** khi Pod thay đổi IP liên tục sau mỗi rollout, làm sao client gọi ổn định? — **Service & load balancing** (ClusterIP, NodePort, LoadBalancer) và cách selector nối Service tới Pod.
