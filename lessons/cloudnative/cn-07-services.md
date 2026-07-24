# Bài 7 — Service: ClusterIP, NodePort, LoadBalancer & DNS

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao không được gọi Pod trực tiếp qua IP** và Service giải quyết điều đó thế nào.
- Phân biệt 4 kiểu Service: **ClusterIP**, **NodePort**, **LoadBalancer**, **Headless** — dùng cái nào khi nào.
- Hiểu bản chất Service = **selector → EndpointSlice → kube-proxy (iptables/IPVS)**; Service KHÔNG phải một tiến trình proxy.
- Dùng **cluster DNS (CoreDNS)** để service discovery qua tên `svc.namespace.svc.cluster.local`.
- Viết đúng YAML cho từng loại, đọc được `kubectl get endpointslices`, và debug khi "gọi service không tới".

---

## 2. Lý thuyết

### 2.1 Vấn đề: Pod IP là thứ phù du

Mỗi Pod khi sinh ra được cấp một IP trong mạng cluster. Nhưng Pod là **cattle, không phải pet**: nó bị xoá và tạo lại liên tục — khi rollout, khi node chết, khi scale, khi crash. Mỗi lần tạo lại, Pod nhận **IP mới**.

Nếu frontend nướng cứng IP của backend Pod `10.244.3.7` vào config, thì chỉ cần backend restart một lần là frontend gọi vào hư không. Với một Deployment 5 replica, bạn còn phải **tự load-balance** giữa 5 IP luôn thay đổi — bất khả thi bằng tay.

→ Ta cần một **abstraction ổn định** đứng trước một nhóm Pod: một tên và một IP **không đổi trong suốt vòng đời Service**, tự động trỏ tới tập Pod đang sống. Đó là **Service**.

<svg viewBox="0 0 640 250" role="img" aria-labelledby="svc-t svc-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="svc-t">Service làm lớp trung gian ổn định trước các Pod hay đổi IP</title>
<desc id="svc-d">Client gọi vào Service có IP cố định, Service phân phối request tới các Pod backend được chọn qua selector dù IP Pod thay đổi</desc>
<rect x="30" y="95" width="120" height="52" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="118" text-anchor="middle" font-size="12" fill="currentColor">Client Pod</text>
<text x="90" y="135" text-anchor="middle" font-size="10" fill="currentColor">gọi "backend"</text>
<rect x="240" y="90" width="140" height="62" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="310" y="114" text-anchor="middle" font-size="12" fill="currentColor">Service backend</text>
<text x="310" y="132" text-anchor="middle" font-size="10" fill="currentColor">ClusterIP 10.96.0.10</text>
<rect x="500" y="20" width="120" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="38" text-anchor="middle" font-size="11" fill="currentColor">Pod 10.244.3.7</text>
<text x="560" y="52" text-anchor="middle" font-size="9" fill="currentColor">app=backend</text>
<rect x="500" y="100" width="120" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="118" text-anchor="middle" font-size="11" fill="currentColor">Pod 10.244.5.2</text>
<text x="560" y="132" text-anchor="middle" font-size="9" fill="currentColor">app=backend</text>
<rect x="500" y="180" width="120" height="40" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="198" text-anchor="middle" font-size="11" fill="currentColor">Pod 10.244.1.9</text>
<text x="560" y="212" text-anchor="middle" font-size="9" fill="currentColor">app=backend</text>
<line x1="150" y1="121" x2="238" y2="121" stroke="currentColor" stroke-width="1.3" marker-end="url(#a7)"/>
<line x1="380" y1="115" x2="498" y2="42" stroke="currentColor" stroke-width="1" marker-end="url(#a7)"/>
<line x1="380" y1="121" x2="498" y2="120" stroke="currentColor" stroke-width="1" marker-end="url(#a7)"/>
<line x1="380" y1="128" x2="498" y2="198" stroke="currentColor" stroke-width="1" marker-end="url(#a7)"/>
<defs><marker id="a7" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Điểm mấu chốt: Service **không chọn Pod theo IP**, mà theo **label selector**. Pod nào mang đúng label thì được đưa vào "danh sách bàn giao" (endpoints). Pod chết → rớt khỏi danh sách; Pod mới sinh với đúng label → tự thêm vào. Client chỉ cần biết một cái tên.

### 2.2 Service không phải là một con proxy — nó là "một luật NAT"

Đây là hiểu lầm phổ biến nhất. ClusterIP `10.96.0.10` **không thuộc về máy nào cả** — không có process nào lắng nghe trên IP đó. Nó là một địa chỉ ảo (VIP) tồn tại chỉ trong **bảng luật của kernel** trên mỗi node.

Cơ chế thật gồm ba mảnh:

1. **Service object** (bạn khai báo): định nghĩa VIP, port, selector.
2. **EndpointSlice** (K8s tự sinh): danh sách `IP:port` của các Pod khớp selector **và** đang Ready.
3. **kube-proxy** (chạy trên mọi node): theo dõi Service + EndpointSlice qua api-server, rồi **lập trình bảng iptables/IPVS của kernel** sao cho: gói tin gửi tới `10.96.0.10:80` sẽ bị **DNAT** sang một trong các Pod IP thật.

Vì thế load-balancing xảy ra **ngay trong kernel của node gọi**, không cần đi qua một node trung tâm. Khi Pod đổi, api-server cập nhật EndpointSlice, kube-proxy nghe được và viết lại luật — VIP giữ nguyên.

<svg viewBox="0 0 660 260" role="img" aria-labelledby="kp-t kp-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="kp-t">Cách kube-proxy hiện thực Service bằng luật iptables trong kernel</title>
<desc id="kp-d">api-server cung cấp Service và EndpointSlice cho kube-proxy trên mỗi node, kube-proxy lập trình luật DNAT trong kernel để chuyển gói từ ClusterIP sang Pod IP thật</desc>
<rect x="250" y="15" width="160" height="46" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="35" text-anchor="middle" font-size="12" fill="currentColor">kube-apiserver</text>
<text x="330" y="51" text-anchor="middle" font-size="9" fill="currentColor">Service + EndpointSlice</text>
<rect x="40" y="110" width="270" height="130" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="175" y="130" text-anchor="middle" font-size="11" fill="currentColor">Node A</text>
<rect x="60" y="145" width="110" height="38" rx="7" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="165" text-anchor="middle" font-size="10" fill="currentColor">kube-proxy</text>
<text x="115" y="177" text-anchor="middle" font-size="8" fill="currentColor">watch + viết luật</text>
<rect x="185" y="145" width="110" height="38" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="240" y="162" text-anchor="middle" font-size="9" fill="currentColor">kernel iptables</text>
<text x="240" y="175" text-anchor="middle" font-size="8" fill="currentColor">DNAT VIP to Pod</text>
<rect x="60" y="195" width="235" height="34" rx="7" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="177" y="216" text-anchor="middle" font-size="9" fill="currentColor">Client Pod gọi 10.96.0.10:80</text>
<rect x="350" y="110" width="270" height="130" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="485" y="130" text-anchor="middle" font-size="11" fill="currentColor">Node B</text>
<rect x="370" y="150" width="110" height="34" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="425" y="171" text-anchor="middle" font-size="9" fill="currentColor">Pod 10.244.5.2</text>
<rect x="500" y="150" width="100" height="34" rx="7" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="171" text-anchor="middle" font-size="9" fill="currentColor">Pod 10.244.1.9</text>
<line x1="300" y1="55" x2="130" y2="143" stroke="currentColor" stroke-width="1" marker-end="url(#a7b)"/>
<line x1="360" y1="55" x2="470" y2="105" stroke="currentColor" stroke-width="1" marker-end="url(#a7b)"/>
<line x1="240" y1="183" x2="240" y2="196" stroke="currentColor" stroke-width="1"/>
<line x1="295" y1="205" x2="420" y2="184" stroke="currentColor" stroke-width="1.3" marker-end="url(#a7b)"/>
<defs><marker id="a7b" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.3 Bốn kiểu Service

| Kiểu | Truy cập được từ đâu | Cơ chế | Dùng khi |
|------|----------------------|--------|----------|
| **ClusterIP** (mặc định) | Chỉ **trong** cluster | VIP ảo + kube-proxy | Giao tiếp service-to-service nội bộ |
| **NodePort** | Ngoài, qua `IP-của-node:port` | Mở 1 port (30000–32767) trên **mọi** node | Test/on-prem không có cloud LB |
| **LoadBalancer** | Ngoài, qua IP public của LB | Xin cloud cấp một LB đứng trước NodePort | Phơi service ra Internet trên cloud |
| **Headless** (`clusterIP: None`) | Trong cluster, **không LB** | DNS trả thẳng danh sách Pod IP | StatefulSet, client tự chọn peer |

Điểm quan trọng: **NodePort được xây trên ClusterIP, LoadBalancer được xây trên NodePort**. Chúng là các lớp bọc chồng lên nhau, không phải bốn thứ tách rời:

<svg viewBox="0 0 520 200" role="img" aria-labelledby="ly-t ly-d" style="width:100%;max-width:480px;height:auto;display:block;margin:1.25rem auto">
<title id="ly-t">LoadBalancer bọc NodePort bọc ClusterIP</title>
<desc id="ly-d">Ba lớp lồng nhau: ClusterIP ở lõi, NodePort bọc ngoài, LoadBalancer bọc ngoài cùng</desc>
<rect x="20" y="20" width="480" height="160" rx="12" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="40" text-anchor="middle" font-size="11" fill="currentColor">LoadBalancer (cloud LB, IP public)</text>
<rect x="70" y="55" width="380" height="110" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="75" text-anchor="middle" font-size="11" fill="currentColor">NodePort (mở port trên mọi node)</text>
<rect x="130" y="90" width="260" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="116" text-anchor="middle" font-size="11" fill="currentColor">ClusterIP (VIP nội bộ)</text>
<text x="260" y="134" text-anchor="middle" font-size="9" fill="currentColor">selector to EndpointSlice to Pod</text>
</svg>

### 2.4 Cluster DNS: gọi nhau bằng tên

VIP ổn định nhưng vẫn là con số. Điều bạn thực sự muốn là gọi `http://backend/`. **CoreDNS** — một Pod DNS chạy trong `kube-system` — làm việc đó. Mỗi Service tự động có một bản ghi DNS:

```
<service>.<namespace>.svc.cluster.local  →  ClusterIP
```

Ví dụ Service `backend` trong namespace `shop`: FQDN là `backend.shop.svc.cluster.local`. Nhờ `/etc/resolv.conf` được kubelet tiêm vào Pod với `search shop.svc.cluster.local svc.cluster.local ...`, bạn có thể gọi ngắn gọn:

- `backend` — nếu client **cùng namespace** `shop`.
- `backend.shop` — từ namespace khác.
- `backend.shop.svc.cluster.local` — FQDN đầy đủ, luôn đúng.

Với **Headless Service**, CoreDNS không trả một VIP mà trả **nhiều bản ghi A** — mỗi Pod một IP. Ngoài ra mỗi Pod của StatefulSet có tên DNS ổn định riêng: `pod-0.<svc>.<ns>.svc.cluster.local`.

---

## 3. Thực hành: YAML từng loại

### 3.1 Deployment backend (đối tượng để Service trỏ tới)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: shop
spec:
  replicas: 3
  selector:
    matchLabels: { app: backend }
  template:
    metadata:
      labels: { app: backend }        # label này là "địa chỉ" mà Service sẽ chọn
    spec:
      containers:
        - name: web
          image: hashicorp/http-echo
          args: ["-text=hello", "-listen=:8080"]
          ports:
            - containerPort: 8080     # cổng process lắng nghe (targetPort)
          readinessProbe:             # QUAN TRỌNG: chưa Ready thì KHÔNG vào endpoints
            httpGet: { path: /, port: 8080 }
            initialDelaySeconds: 2
```

### 3.2 ClusterIP — mặc định, nội bộ

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: shop
spec:
  type: ClusterIP            # có thể bỏ, đây là mặc định
  selector:
    app: backend            # chọn mọi Pod có label app=backend
  ports:
    - name: http
      port: 80              # cổng của Service (client gọi vào)
      targetPort: 8080      # cổng trên Pod (khớp containerPort)
```

Client trong cluster gọi `curl http://backend.shop.svc.cluster.local` hoặc ngắn `http://backend` (nếu cùng namespace). kube-proxy sẽ round-robin qua 3 Pod.

### 3.3 NodePort — phơi ra ngoài qua port của node

```yaml
apiVersion: v1
kind: Service
metadata: { name: backend-np, namespace: shop }
spec:
  type: NodePort
  selector: { app: backend }
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080      # 30000-32767; bỏ trống để K8s tự cấp
```

Giờ `curl http://<IP-bất-kỳ-node>:30080` đều tới — kể cả node không chạy Pod nào (gói sẽ được chuyển tiếp nội bộ tới node có Pod).

### 3.4 LoadBalancer — xin cloud một LB public

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-lb
  namespace: shop
  annotations:
    # ví dụ AWS: dùng Network Load Balancer thay Classic
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector: { app: backend }
  ports:
    - port: 80
      targetPort: 8080
  externalTrafficPolicy: Local   # giữ client source IP, chỉ route tới Pod tại node nhận
```

Trên cloud, một **cloud-controller-manager** thấy Service kiểu này sẽ gọi API cloud tạo LB thật, rồi điền IP/hostname vào `status.loadBalancer.ingress`. Xem bằng `kubectl get svc backend-lb` — cột `EXTERNAL-IP`.

> `externalTrafficPolicy: Cluster` (mặc định) phân tải đều mọi node nhưng **mất source IP** (SNAT). `Local` giữ source IP thật của client và bớt một hop, nhưng node không có Pod sẽ fail health-check của LB — LB do đó chỉ gửi tới node có Pod.

### 3.5 Headless — trả thẳng Pod IP (cho StatefulSet)

```yaml
apiVersion: v1
kind: Service
metadata: { name: db, namespace: shop }
spec:
  clusterIP: None          # <-- điểm mấu chốt: KHÔNG cấp VIP
  selector: { app: db }
  ports:
    - port: 5432
      targetPort: 5432
```

Với `clusterIP: None`, không có VIP, không có kube-proxy load-balance. `nslookup db.shop.svc.cluster.local` trả về **tất cả** Pod IP. Kết hợp StatefulSet, mỗi replica có tên ổn định `db-0.db.shop.svc.cluster.local` — thứ bắt buộc cho hệ có trạng thái (Postgres primary/replica, Kafka broker) nơi client cần địa chỉ **một peer cụ thể**, không phải "một Pod bất kỳ".

---

## 4. Quan sát & debug

```bash
# Xem Service và VIP
kubectl -n shop get svc backend
# NAME      TYPE        CLUSTER-IP     PORT(S)   AGE
# backend   ClusterIP   10.96.0.10     80/TCP    1m

# Ai đang thực sự nằm sau Service? (EndpointSlice mới, thay cho Endpoints cũ)
kubectl -n shop get endpointslices -l kubernetes.io/service-name=backend -o wide
# nếu RỖNG -> selector không khớp label Pod, HOẶC Pod chưa Ready (readinessProbe fail)

# Test DNS từ trong cluster
kubectl -n shop run tmp --image=busybox --rm -it --restart=Never -- \
  nslookup backend.shop.svc.cluster.local

# Test kết nối thật
kubectl -n shop run tmp --image=curlimages/curl --rm -it --restart=Never -- \
  curl -s http://backend/
```

**Checklist khi "gọi service không tới":**

| Triệu chứng | Nguyên nhân hay gặp |
|-------------|---------------------|
| `endpointslices` rỗng | `selector` của Service không khớp `labels` của Pod |
| Pod có nhưng không vào endpoints | `readinessProbe` fail → Pod chưa Ready → cố tình bị loại |
| Kết nối treo/refused | `targetPort` sai (không khớp `containerPort` process lắng nghe) |
| DNS không phân giải | gọi sai FQDN, hoặc CoreDNS trong `kube-system` đang lỗi |
| Ngoài cluster không vào được ClusterIP | đúng thiết kế — ClusterIP chỉ nội bộ, cần NodePort/LB/Ingress |

Một điều tinh tế đáng nhớ: readinessProbe chính là công tắc bật/tắt việc Pod nhận traffic. Rollout an toàn dựa vào đây — Pod mới chỉ vào EndpointSlice khi đã Ready, và Pod đang bị xoá sẽ rớt khỏi EndpointSlice **trước** khi bị kill (kèm `terminationGracePeriod`) để không rơi request.

---

## 5. Tóm tắt
- Pod IP là phù du; **Service** cho một tên + VIP **ổn định** đứng trước nhóm Pod chọn theo **label selector**.
- Service không phải proxy tập trung: nó là **Service object + EndpointSlice + kube-proxy** lập trình **iptables/IPVS** trong kernel mỗi node để DNAT VIP → Pod IP. Load-balance xảy ra tại node gọi.
- **ClusterIP** nội bộ; **NodePort** mở port trên mọi node (bọc ClusterIP); **LoadBalancer** xin cloud LB đứng trước (bọc NodePort); **Headless** (`clusterIP: None`) bỏ VIP, DNS trả thẳng Pod IP cho StatefulSet.
- **CoreDNS** cho discovery bằng tên: `service.namespace.svc.cluster.local`; cùng namespace gọi ngắn chỉ `service`.
- Debug bằng `get endpointslices`: rỗng nghĩa là **selector sai** hoặc **Pod chưa Ready**. `readinessProbe` điều khiển việc Pod có nhận traffic hay không.

> **Bài tiếp theo (Bài 8):** ra tới rìa cluster — **Ingress & Gateway API**: một điểm vào HTTP/HTTPS duy nhất, định tuyến theo host/path và kết thúc TLS, thay vì mỗi service một LoadBalancer đắt đỏ.
