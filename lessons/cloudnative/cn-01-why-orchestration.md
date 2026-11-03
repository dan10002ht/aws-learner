# Bài 1 — Vì sao cần orchestration? Kubernetes là gì

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao chạy container thủ công không đủ** khi lên tới hàng chục–trăm container.
- Kể tên các bài toán mà **orchestrator** giải: scheduling, self-healing, scaling, service discovery, rollout.
- Định nghĩa **Kubernetes** và hiểu tư tưởng cốt lõi: **declarative + desired state + reconciliation**.
- Biết **khi nào KHÔNG nên** dùng Kubernetes (để không "dùng dao mổ trâu giết gà").

---

## 2. Lý thuyết

### 2.1 Từ một container tới một "rừng" container

Bạn đã biết Docker (xem [[eng-05-docker]]): đóng gói app thành image, chạy thành container. Với **một** app nhỏ trên **một** máy, `docker run` là đủ.

Nhưng sản phẩm thật cần:
- **Nhiều bản sao** của mỗi service (chịu tải, không gián đoạn).
- **Nhiều service** (frontend, backend, worker, cache...) trên **nhiều máy**.
- Chạy **24/7**: container chết phải tự sống lại; máy chết phải chuyển tải sang máy khác.

Khi đó, làm thủ công sụp đổ nhanh chóng. Hãy thử liệt kê những việc bạn phải tự tay lo:

| Việc phải làm tay | Khi có 3 máy × 20 container |
|-------------------|-----------------------------|
| Container nên chạy ở **máy nào**? (còn RAM/CPU không?) | Tính toán thủ công, dễ lệch tải |
| Container **chết** lúc 3h sáng → ai khởi động lại? | Bạn thức dậy, hoặc dịch vụ chết |
| **Scale** từ 3 lên 10 bản khi flash sale | Chạy tay 7 lệnh, sửa load balancer |
| Bản mới lỗi → **rollback** | Thủ công, căng thẳng, dễ sai |
| Container A tìm địa chỉ container B (IP đổi liên tục) | Tự quản lý danh bạ IP |

→ Đây chính là **bài toán orchestration**: *tự động hoá việc triển khai, mở rộng, và vận hành container trên một cụm nhiều máy.*

### 2.2 Orchestrator giải những gì?

<svg viewBox="0 0 660 220" role="img" aria-labelledby="or-t or-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="or-t">Các trách nhiệm của một container orchestrator</title>
<desc id="or-d">Orchestrator nằm giữa, bao quanh là các nhiệm vụ scheduling, self-healing, scaling, service discovery, rollout, config</desc>
<rect x="255" y="85" width="150" height="52" rx="10" fill="#326ce5" fill-opacity="0.16" stroke="currentColor"/>
<text x="330" y="107" text-anchor="middle" font-size="13" fill="currentColor">Orchestrator</text>
<text x="330" y="124" text-anchor="middle" font-size="11" fill="currentColor">(Kubernetes)</text>
<rect x="30" y="20" width="130" height="38" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="44" text-anchor="middle" font-size="11" fill="currentColor">Scheduling</text>
<rect x="500" y="20" width="130" height="38" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="44" text-anchor="middle" font-size="11" fill="currentColor">Self-healing</text>
<rect x="30" y="90" width="130" height="38" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="114" text-anchor="middle" font-size="11" fill="currentColor">Auto-scaling</text>
<rect x="500" y="90" width="130" height="38" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="114" text-anchor="middle" font-size="11" fill="currentColor">Service discovery</text>
<rect x="30" y="160" width="130" height="38" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="95" y="184" text-anchor="middle" font-size="11" fill="currentColor">Rollout/Rollback</text>
<rect x="500" y="160" width="130" height="38" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="565" y="184" text-anchor="middle" font-size="11" fill="currentColor">Config &amp; Secret</text>
<line x1="160" y1="39" x2="255" y2="95" stroke="currentColor" stroke-width="1"/>
<line x1="500" y1="39" x2="405" y2="95" stroke="currentColor" stroke-width="1"/>
<line x1="160" y1="109" x2="255" y2="111" stroke="currentColor" stroke-width="1"/>
<line x1="500" y1="109" x2="405" y2="111" stroke="currentColor" stroke-width="1"/>
<line x1="160" y1="179" x2="255" y2="127" stroke="currentColor" stroke-width="1"/>
<line x1="500" y1="179" x2="405" y2="127" stroke="currentColor" stroke-width="1"/>
</svg>

- **Scheduling**: quyết định container chạy ở node nào dựa trên tài nguyên còn trống & ràng buộc.
- **Self-healing**: container/node chết → tự tạo lại ở nơi khác để giữ đúng số bản mong muốn.
- **Auto-scaling**: tăng/giảm số bản theo tải (CPU, request...).
- **Service discovery & load balancing**: cho các service tìm & gọi nhau qua tên ổn định dù IP đổi.
- **Rollout/Rollback**: cập nhật phiên bản dần dần, lỗi thì quay lui.
- **Config & Secret**: tiêm cấu hình/bí mật vào container mà không nướng cứng vào image.

Kubernetes (viết tắt **K8s** — "K" + 8 chữ + "s") là orchestrator phổ biến nhất, khởi nguồn từ hệ thống Borg của Google, nay là chuẩn de-facto của ngành.

### 2.3 Tư tưởng cốt lõi: Declarative + Desired State

Đây là ý tưởng quan trọng nhất để "thấm" Kubernetes.

| | Imperative (ra lệnh từng bước) | **Declarative (khai báo kết quả)** |
|--|-------------------------------|-----------------------------------|
| Bạn nói | "Chạy container này, rồi cái kia, nếu chết thì..." | "Tôi **muốn** luôn có 3 bản đang chạy" |
| Ai lo duy trì | Bạn | **Kubernetes** |
| Tương tự | Chỉ đường từng ngã rẽ | Nhập điểm đến vào GPS |

Bạn mô tả **desired state** (trạng thái mong muốn) trong file YAML — ví dụ "Deployment `web` gồm 3 replica image `web:v2`". Kubernetes liên tục chạy vòng lặp **reconciliation**: so sánh *thực tế* với *mong muốn*, và tự hành động để kéo thực tế về đúng mong muốn.

<auto-anim data-dur="8">
<svg viewBox="0 0 520 270" role="img" aria-labelledby="cn01-vis-loop-t cn01-vis-loop-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="cn01-vis-loop-t">Reconciliation liên tục</title>
<desc id="cn01-vis-loop-d">Hai Pod luôn còn; Pod thứ ba xuất hiện rồi mất. Desired cố định là ba, controller luôn đối chiếu actual.</desc>
<text x="25" y="25" font-size="13" text-anchor="start" fill="currentColor">Desired: 3 Pod</text>
<text x="300" y="25" font-size="13" text-anchor="start" fill="currentColor">Actual</text>
<rect x="25" y="60" width="140" height="48" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6" />
<text x="95" y="89" font-size="13" text-anchor="middle" fill="currentColor">Controller</text>
<line x1="165" y1="84" x2="290" y2="84" stroke="currentColor" stroke-width="2"/>
<text x="185" y="73" font-size="13" text-anchor="start" fill="currentColor">tạo Pod</text>
<rect x="300" y="57" width="55" height="55" rx="4" fill="#10b981" fill-opacity="0.14" stroke="#10b981" />
<rect x="370" y="57" width="55" height="55" rx="4" fill="#10b981" fill-opacity="0.14" stroke="#10b981" />
<text x="327" y="89" font-size="13" text-anchor="middle" fill="currentColor">Pod</text>
<text x="397" y="89" font-size="13" text-anchor="middle" fill="currentColor">Pod</text>
<g opacity="0"><rect x="440" y="57" width="55" height="55" rx="4" fill="#10b981" fill-opacity="0.14" stroke="#10b981" /><text x="467" y="89" font-size="13" text-anchor="middle" fill="currentColor">Pod</text><animate attributeName="opacity" dur="8s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.35;0.7;1" values="0;1;0;0"/></g>
<text x="25" y="153" font-size="13" text-anchor="start" fill="currentColor">Actual 2 → tạo 1 → đủ 3 → mất 1 → lặp lại</text>
<line x1="35" y1="197" x2="485" y2="197" stroke="currentColor" />
<text x="35" y="221" font-size="13" text-anchor="start" fill="currentColor">0 s</text>
<text x="260" y="221" font-size="13" text-anchor="middle" fill="currentColor">4 s</text>
<text x="485" y="221" font-size="13" text-anchor="end" fill="currentColor">8 s</text>
<circle cx="35" cy="197" r="6" fill="#3b82f6"><animate attributeName="cx" dur="8s" repeatCount="indefinite" keyTimes="0;1" values="35;485"/></circle>
<text x="25" y="251" font-size="13" text-anchor="start" fill="currentColor">Thời gian minh hoạ; không phải chu kỳ controller</text>
</svg>
</auto-anim>

Chính vòng lặp này tạo ra **self-healing**: một Pod chết → actual còn 2, desired là 3 → controller tạo Pod mới. Bạn không viết logic "nếu chết thì khởi động lại" — bạn chỉ khai báo "muốn 3", K8s lo phần còn lại.

---

## 3. Khi nào KHÔNG nên dùng Kubernetes

Kubernetes mạnh nhưng **phức tạp** — có cái giá học tập & vận hành lớn. Cân nhắc **không** dùng khi:
- App nhỏ, một vài container, tải ổn định → một VM + `docker compose`, hoặc PaaS (Render, Fly.io, App Runner) đủ và rẻ hơn.
- Đội chưa có người hiểu k8s để vận hành (nâng cấp, bảo mật, debug) → gánh nặng lớn hơn lợi ích.
- Serverless (Lambda/Cloud Run) hợp hơn cho workload event-driven, ít trạng thái.

> **Quy tắc:** chọn k8s khi bạn thật sự cần **nhiều service, scale động, self-healing, và triển khai thường xuyên** trên nhiều máy — không phải vì "ai cũng xài".

---

## 4. Bức tranh toàn course

Course này đưa bạn từ đây tới **deploy production-ready**:
- **Ch.1** kiến trúc & cách nói chuyện với cluster (bài này → architecture → kubectl/YAML)
- **Ch.2** chạy workload (Pod, Deployment, StatefulSet)
- **Ch.3** networking & config (Service, Ingress, ConfigMap/Secret)
- **Ch.4** storage & scheduling (PV/PVC, autoscaling)
- **Ch.5** security & troubleshooting
- **Ch.6** hệ sinh thái production (Helm, Operator, GitOps, Service Mesh)
- **Ch.7** capstone deploy app đầy đủ

---

## 5. Tóm tắt
- Chạy container thủ công **không mở rộng nổi** khi có nhiều container trên nhiều máy: scheduling, self-healing, scaling, discovery, rollout đều thành gánh nặng.
- **Orchestrator** tự động hoá các việc đó; **Kubernetes** là chuẩn de-facto (gốc từ Google Borg).
- Tư tưởng cốt lõi: **declarative** — bạn khai báo **desired state**, K8s chạy vòng lặp **reconciliation** để giữ actual = desired → sinh ra self-healing "miễn phí".
- **Đừng lạm dụng**: app nhỏ/đội chưa sẵn sàng thì compose/PaaS/serverless có khi hợp hơn.

> **Bài tiếp theo (Bài 2):** mở nắp capo — **kiến trúc Kubernetes**: control plane (api-server, etcd, scheduler, controller-manager) và node (kubelet, kube-proxy), và một request tạo Pod thực sự đi qua đâu.
