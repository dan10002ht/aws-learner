# Bài 8 — Ingress, Ingress Controller & Gateway API

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **vì sao Service `LoadBalancer` L4 không đủ** để phơi nhiều HTTP service ra Internet (tốn 1 LB/service, không route theo host/path).
- Hiểu bản chất **Ingress**: định tuyến HTTP **L7** theo **host** và **path**, gom **1 entry point** cho nhiều service, và làm **TLS termination**.
- Phân biệt rạch ròi **Ingress (luật)** với **Ingress Controller (bộ thực thi)** — vì sao tạo Ingress mà không cài controller thì "chẳng có gì xảy ra".
- Viết được **YAML Ingress** đầy đủ: host/path routing, TLS secret, annotation (rewrite, redirect, body-size).
- Biết **Gateway API** — chuẩn mới thay Ingress, tách vai **Gateway** (hạ tầng) và **Route** (ứng dụng), và khi nào nên chuyển sang nó.

---

## 2. Lý thuyết

### 2.1 Vấn đề: Service `LoadBalancer` chỉ hiểu L4

Ở bài Service (cn-07), bạn đã biết muốn phơi một Deployment ra Internet thì dùng `type: LoadBalancer`: cloud provider cấp cho bạn **một Cloud Load Balancer** (AWS ELB/NLB, GCP LB...) với một IP công khai, đẩy traffic về các Pod.

Vấn đề lộ ra ngay khi bạn có **nhiều** service HTTP:

| Bài toán | Với Service `LoadBalancer` thuần |
|----------|----------------------------------|
| 5 microservice cần phơi ra Internet | Cần **5 Cloud LB** → 5 IP, 5 hoá đơn (mỗi LB ~15–25 USD/tháng) |
| `shop.com/api` → svc A, `shop.com/img` → svc B | **Không làm được** — L4 chỉ thấy IP:port, không đọc URL path |
| `api.shop.com` → svc A, `blog.shop.com` → svc B trên **cùng 1 IP** | **Không làm được** — L4 không đọc `Host` header |
| Chứng chỉ TLS (HTTPS) cho tất cả | Mỗi service tự lo cert, khó tập trung |

Gốc rễ: `LoadBalancer` và `NodePort` hoạt động ở **tầng 4 (transport, TCP/UDP)**. Nó chỉ thấy `IP:port` — **không** mở gói tin để đọc `Host` header hay đường dẫn `/api/...`. Mà "route theo tên miền và đường dẫn" là chuyện của **tầng 7 (application, HTTP)**.

Ta cần một thứ **hiểu HTTP**: đọc `Host` và path rồi phân phối tới đúng service — đó là **Ingress**.

### 2.2 Ingress là gì: 1 cửa L7 cho N service

**Ingress** là một API object mô tả **luật định tuyến HTTP/HTTPS từ ngoài vào các Service trong cluster**. Một Ingress có thể:
- Nhận traffic trên **một** entry point (một IP/LB duy nhất).
- Route theo **host** (`api.shop.com` vs `blog.shop.com`) và theo **path** (`/api` vs `/img`).
- **Terminate TLS** (giải mã HTTPS ngay tại cửa), quản lý cert tập trung.

<svg viewBox="0 0 680 300" role="img" aria-labelledby="ig-t ig-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="ig-t">Ingress gom một entry point route tới nhiều service</title>
<desc id="ig-d">Client gửi HTTPS tới một IP duy nhất, Ingress đọc host và path rồi phân phối tới các Service khác nhau bên trong cluster</desc>
<rect x="20" y="120" width="110" height="46" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="75" y="140" text-anchor="middle" font-size="12" fill="currentColor">Client</text>
<text x="75" y="156" text-anchor="middle" font-size="10" fill="currentColor">HTTPS</text>
<rect x="180" y="105" width="150" height="76" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="255" y="130" text-anchor="middle" font-size="13" fill="currentColor">Ingress</text>
<text x="255" y="148" text-anchor="middle" font-size="10" fill="currentColor">1 IP + TLS</text>
<text x="255" y="164" text-anchor="middle" font-size="10" fill="currentColor">đọc host và path</text>
<rect x="470" y="20" width="180" height="52" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="42" text-anchor="middle" font-size="11" fill="currentColor">svc-api</text>
<text x="560" y="58" text-anchor="middle" font-size="9" fill="currentColor">api.shop.com/*</text>
<rect x="470" y="120" width="180" height="52" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="142" text-anchor="middle" font-size="11" fill="currentColor">svc-web</text>
<text x="560" y="158" text-anchor="middle" font-size="9" fill="currentColor">shop.com/</text>
<rect x="470" y="220" width="180" height="52" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="560" y="242" text-anchor="middle" font-size="11" fill="currentColor">svc-img</text>
<text x="560" y="258" text-anchor="middle" font-size="9" fill="currentColor">shop.com/img</text>
<line x1="130" y1="143" x2="178" y2="143" stroke="currentColor" stroke-width="1.3" marker-end="url(#a8)"/>
<line x1="330" y1="130" x2="468" y2="46" stroke="currentColor" stroke-width="1.1" marker-end="url(#a8)"/>
<line x1="330" y1="143" x2="468" y2="146" stroke="currentColor" stroke-width="1.1" marker-end="url(#a8)"/>
<line x1="330" y1="156" x2="468" y2="246" stroke="currentColor" stroke-width="1.1" marker-end="url(#a8)"/>
<defs><marker id="a8" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Kết quả: thay vì 5 Cloud LB, bạn dùng **một** LB đứng trước Ingress, còn Ingress phân luồng bên trong. Rẻ hơn và mạnh hơn nhiều.

### 2.3 Điểm mấu chốt: Ingress chỉ là "luật", cần Ingress Controller thực thi

Đây là chỗ **hầu hết người mới vấp**. Bạn `kubectl apply` một Ingress, `kubectl get ingress` thấy nó tồn tại — nhưng gõ URL thì **không có gì trả lời**. Vì sao?

> **Ingress object chỉ là một bản mô tả luật (dữ liệu). Bản thân nó KHÔNG xử lý gói tin nào.** Phải có một **Ingress Controller** — một reverse proxy thật (nginx, Traefik, HAProxy, Envoy...) đang chạy trong cluster — **đọc** các Ingress object rồi **tự cấu hình chính nó** để thực thi luật đó.

Nói cách khác: Ingress là **desired state** (bài 1), Ingress Controller là **controller** chạy vòng reconciliation — watch mọi Ingress, sinh ra file cấu hình proxy tương ứng, reload proxy.

<svg viewBox="0 0 660 210" role="img" aria-labelledby="ic-t ic-d" style="width:100%;max-width:620px;height:auto;display:block;margin:1.25rem auto">
<title id="ic-t">Quan hệ giữa Ingress object và Ingress Controller</title>
<desc id="ic-d">Ingress object là luật khai báo, Ingress Controller watch và biến luật thành cấu hình proxy thực thi traffic</desc>
<rect x="30" y="70" width="160" height="66" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="110" y="96" text-anchor="middle" font-size="12" fill="currentColor">Ingress object</text>
<text x="110" y="114" text-anchor="middle" font-size="10" fill="currentColor">(luật, YAML)</text>
<rect x="260" y="60" width="180" height="86" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="350" y="88" text-anchor="middle" font-size="12" fill="currentColor">Ingress Controller</text>
<text x="350" y="106" text-anchor="middle" font-size="10" fill="currentColor">nginx/Traefik Pod</text>
<text x="350" y="122" text-anchor="middle" font-size="10" fill="currentColor">reverse proxy thật</text>
<rect x="510" y="70" width="130" height="66" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="575" y="96" text-anchor="middle" font-size="11" fill="currentColor">Traffic thật</text>
<text x="575" y="114" text-anchor="middle" font-size="10" fill="currentColor">được route</text>
<line x1="190" y1="103" x2="258" y2="103" stroke="currentColor" stroke-width="1.2" marker-end="url(#a9)"/>
<text x="224" y="94" text-anchor="middle" font-size="9" fill="currentColor">watch</text>
<line x1="440" y1="103" x2="508" y2="103" stroke="currentColor" stroke-width="1.2" marker-end="url(#a9)"/>
<text x="474" y="94" text-anchor="middle" font-size="9" fill="currentColor">proxy</text>
<defs><marker id="a9" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Kubernetes **không** cài sẵn Ingress Controller (khác với kube-proxy vốn có sẵn cho Service). Bạn phải tự cài. Phổ biến nhất là **ingress-nginx** (dự án của cộng đồng Kubernetes) và **Traefik**.

```bash
# Cài ingress-nginx (bản manifest cho cloud provider)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/cloud/deploy.yaml

# Controller chạy trong namespace riêng, tự nó là một Service type=LoadBalancer
kubectl get pods    -n ingress-nginx
kubectl get svc     -n ingress-nginx   # EXTERNAL-IP chính là entry point duy nhất
```

Chú ý cấu trúc: controller **tự nó** là một Service `LoadBalancer` (một Cloud LB duy nhất). Toàn bộ traffic vào IP đó, rồi controller mới phân luồng L7 theo Ingress. Vậy là bạn vẫn chỉ trả tiền **một** Cloud LB cho **tất cả** service.

### 2.4 IngressClass — chọn controller nào thực thi

Một cluster có thể chạy **nhiều** Ingress Controller (ví dụ nginx cho public, một cái khác cho internal). Làm sao một Ingress biết controller nào phải xử lý nó? Qua **IngressClass**.

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx
spec:
  controller: k8s.io/ingress-nginx     # định danh controller
```

Ingress trỏ tới class qua `spec.ingressClassName: nginx`. Nếu bỏ trống, class nào được đánh dấu `ingressclass.kubernetes.io/is-default-class: "true"` sẽ nhận. Cài `ingress-nginx` theo manifest trên đã tạo sẵn IngressClass `nginx`.

---

## 3. Viết Ingress trong thực tế (nhiều YAML)

### 3.1 Ingress cơ bản: route theo host và path

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: api.shop.com               # route theo HOST header
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: svc-api            # Service (thường ClusterIP) trong cluster
            port:
              number: 80
  - host: shop.com
    http:
      paths:
      - path: /img                   # route theo PATH
        pathType: Prefix
        backend:
          service:
            name: svc-img
            port:
              number: 80
      - path: /                      # path "bắt còn lại"
        pathType: Prefix
        backend:
          service:
            name: svc-web
            port:
              number: 80
```

Ba điểm bản chất:
- **Backend là Service, không phải Pod.** Ingress route tới Service (thường `ClusterIP` — không cần phơi ra ngoài nữa vì Ingress đã là cửa). Service vẫn lo load balancing xuống các Pod.
- **`pathType`** quyết định cách khớp path:
  - `Prefix` — khớp theo tiền tố phân đoạn (`/img` khớp `/img`, `/img/a`).
  - `Exact` — khớp chính xác tuyệt đối.
  - `ImplementationSpecific` — tuỳ controller (nginx cho phép regex).
- **Thứ tự & độ dài path**: controller thường ưu tiên path **cụ thể/dài hơn**. `/img` được xét trước `/` nên request `/img/logo.png` về `svc-img`, còn lại về `svc-web`.

Kiểm tra:

```bash
kubectl apply -f shop-ingress.yaml
kubectl get ingress shop-ingress          # cột ADDRESS = IP entry point khi controller đã gán
kubectl describe ingress shop-ingress      # xem rules, events, backend đã resolve chưa

# Test không cần DNS thật: giả lập Host header
curl -H "Host: api.shop.com" http://<EXTERNAL-IP>/
curl -H "Host: shop.com"     http://<EXTERNAL-IP>/img/logo.png
```

### 3.2 TLS termination: HTTPS tại cửa

Muốn Ingress nhận HTTPS, cần một **TLS Secret** kiểu `kubernetes.io/tls` chứa cặp cert + private key. Ingress giải mã (terminate) tại đây; traffic đi tiếp xuống Service thường là HTTP thường bên trong cluster.

```bash
# Tạo secret TLS từ file cert và key (thực tế cert do CA/Let's Encrypt cấp)
kubectl create secret tls shop-tls \
  --cert=tls.crt \
  --key=tls.key
```

Tương đương YAML (giá trị là base64 của file):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: shop-tls
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi...       # base64 của cert PEM
  tls.key: LS0tLS1CRUdJTi...       # base64 của private key PEM
```

Gắn vào Ingress qua khối `spec.tls`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop-ingress-tls
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"   # ép HTTP -> HTTPS 308
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - shop.com
    - api.shop.com
    secretName: shop-tls          # cert dùng cho các host trên
  rules:
  - host: api.shop.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: svc-api
            port:
              number: 80
```

`hosts` trong `tls` phải khớp `host` trong `rules` để controller chọn đúng cert theo **SNI** (Server Name Indication — client báo tên miền ngay lúc bắt tay TLS, trước khi mã hoá xong, để server chọn cert).

Trong production, gần như không ai tạo cert thủ công: dùng **cert-manager** để tự xin và **gia hạn** cert Let's Encrypt. Bạn chỉ thêm một annotation, cert-manager lo phần còn lại:

```yaml
metadata:
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
# cert-manager sẽ tự tạo secret shop-tls và tự renew trước khi hết hạn
```

### 3.3 Annotation & rewrite — nơi sức mạnh thật nằm

Spec Ingress cố tình **tối giản** (chỉ host/path/backend/tls). Mọi tính năng nâng cao được cấu hình qua **annotation** riêng của từng controller — đây cũng là **điểm yếu**: annotation của nginx **không** dùng được cho Traefik, cấu hình bị khoá vào một controller.

Vài annotation `ingress-nginx` hay dùng:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    # Rewrite path: bỏ tiền tố /api trước khi chuyển xuống backend
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/use-regex: "true"
    # Giới hạn kích thước body upload
    nginx.ingress.kubernetes.io/proxy-body-size: "20m"
    # Rate limit: tối đa 10 request/giây mỗi IP
    nginx.ingress.kubernetes.io/limit-rps: "10"
spec:
  ingressClassName: nginx
  rules:
  - host: shop.com
    http:
      paths:
      - path: /api(/|$)(.*)          # nhóm regex: $2 là phần sau /api
        pathType: ImplementationSpecific
        backend:
          service:
            name: svc-api
            port:
              number: 80
```

**Vì sao cần rewrite?** Client gọi `shop.com/api/users`, nhưng service backend chỉ biết route `/users` (không có tiền tố `/api`). `rewrite-target: /$2` cắt `/api` đi, backend nhận đúng `/users`. Không có rewrite, backend nhận `/api/users` và trả 404.

---

## 4. Gateway API — chuẩn mới thay Ingress

Ingress đã lộ giới hạn: spec quá nghèo nên mọi thứ nhét vào **annotation** không chuẩn hoá (mỗi controller một kiểu), khó phân quyền, không hỗ trợ tốt TCP/UDP/gRPC hay traffic splitting cho canary. **Gateway API** (GA từ 2023) là API kế nhiệm chính thức của Kubernetes để giải quyết đúng những điều đó.

Ý tưởng cốt lõi: **tách vai trò** thành nhiều object có chủ sở hữu khác nhau, thay vì nhồi tất cả vào một Ingress:

| Object | Ai quản | Vai trò |
|--------|---------|---------|
| **GatewayClass** | Nhà cung cấp/infra | "Loại" gateway (do controller nào cài đặt), như IngressClass |
| **Gateway** | Đội platform/cluster admin | Hạ tầng nghe traffic: IP, cổng, listener, TLS |
| **HTTPRoute** (TCPRoute, GRPCRoute...) | Đội ứng dụng (dev) | Luật route HTTP: host, path, header, weight |

<svg viewBox="0 0 640 250" role="img" aria-labelledby="gw-t gw-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="gw-t">Gateway API tách vai Gateway và Route</title>
<desc id="gw-d">Platform team sở hữu Gateway lo hạ tầng và TLS, các đội ứng dụng sở hữu HTTPRoute gắn vào Gateway và trỏ tới Service</desc>
<rect x="30" y="90" width="150" height="70" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="105" y="116" text-anchor="middle" font-size="12" fill="currentColor">Gateway</text>
<text x="105" y="133" text-anchor="middle" font-size="9" fill="currentColor">IP, port, TLS</text>
<text x="105" y="148" text-anchor="middle" font-size="9" fill="currentColor">(platform team)</text>
<rect x="250" y="30" width="160" height="56" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="54" text-anchor="middle" font-size="11" fill="currentColor">HTTPRoute A</text>
<text x="330" y="70" text-anchor="middle" font-size="9" fill="currentColor">/api (team A)</text>
<rect x="250" y="160" width="160" height="56" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<text x="330" y="184" text-anchor="middle" font-size="11" fill="currentColor">HTTPRoute B</text>
<text x="330" y="200" text-anchor="middle" font-size="9" fill="currentColor">/blog (team B)</text>
<rect x="480" y="30" width="130" height="56" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="62" text-anchor="middle" font-size="11" fill="currentColor">svc-api</text>
<rect x="480" y="160" width="130" height="56" rx="9" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="545" y="192" text-anchor="middle" font-size="11" fill="currentColor">svc-blog</text>
<line x1="180" y1="110" x2="248" y2="66" stroke="currentColor" stroke-width="1.1" marker-end="url(#a10)"/>
<line x1="180" y1="140" x2="248" y2="184" stroke="currentColor" stroke-width="1.1" marker-end="url(#a10)"/>
<line x1="410" y1="58" x2="478" y2="58" stroke="currentColor" stroke-width="1.1" marker-end="url(#a10)"/>
<line x1="410" y1="188" x2="478" y2="188" stroke="currentColor" stroke-width="1.1" marker-end="url(#a10)"/>
<defs><marker id="a10" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Ví dụ tương đương phần 3.1 nhưng bằng Gateway API:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shop-gateway
spec:
  gatewayClassName: nginx            # do controller cài đặt
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: shop-tls               # cùng TLS Secret như Ingress
    allowedRoutes:
      namespaces:
        from: All                    # cho route ở namespace khác gắn vào
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-route
spec:
  parentRefs:
  - name: shop-gateway               # gắn vào Gateway trên
  hostnames:
  - "api.shop.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: svc-api
      port: 80
```

Cái được thêm mà Ingress khó làm sạch sẽ:
- **Traffic splitting/canary chuẩn hoá**: nhiều `backendRefs` kèm `weight` (ví dụ 90% v1, 10% v2) — không cần annotation riêng.
- **Phân quyền rõ**: admin sở hữu Gateway (cổng, cert), dev chỉ được tạo HTTPRoute gắn vào — an toàn hơn.
- **Đa giao thức**: TCPRoute, UDPRoute, GRPCRoute, TLSRoute — không giới hạn HTTP.
- **Match phong phú**: theo header, query param, method — là **field chuẩn**, không phải annotation.

**Khi nào dùng gì?** Ingress vẫn phổ biến, đủ tốt cho route HTTP đơn giản và có mặt ở mọi nơi. Gateway API là hướng đi tương lai — chọn khi bạn cần canary/traffic-split, phân quyền multi-team, đa giao thức, hoặc muốn thoát khỏi rừng annotation. Cả hai cùng tồn tại được; nhiều controller (ingress-nginx, Traefik, Envoy Gateway, Istio) đã hỗ trợ Gateway API.

---

## 5. Tóm tắt
- Service `LoadBalancer`/`NodePort` là **L4**: mỗi service tốn 1 Cloud LB và **không** route được theo host/path vì không đọc HTTP.
- **Ingress** route **L7**: gom **1 entry point** cho nhiều service, phân luồng theo **host** và **path**, và **terminate TLS**. Backend của Ingress là **Service** (thường ClusterIP).
- Ingress chỉ là **luật khai báo**; phải cài một **Ingress Controller** (nginx/Traefik — một reverse proxy thật, tự nó là 1 LoadBalancer) mới thực thi. K8s **không** cài sẵn.
- **TLS** dùng Secret `kubernetes.io/tls` tham chiếu trong `spec.tls`, chọn cert theo **SNI**; production dùng **cert-manager** để tự cấp và renew.
- Tính năng nâng cao (rewrite, redirect, rate-limit, body-size) đi qua **annotation** đặc thù controller → tiện nhưng **khoá vendor**.
- **Gateway API** là chuẩn kế nhiệm: **tách vai** Gateway (hạ tầng, do platform team quản) và HTTPRoute (luật app, do dev quản), hỗ trợ traffic split, đa giao thức, match chuẩn hoá — dùng khi cần vượt giới hạn của Ingress.

> **Bài tiếp theo (Bài 9):** ConfigMap và Secret — tách cấu hình và bí mật khỏi image, tiêm vào Pod qua env và volume, và vì sao Secret "chỉ base64" không phải là mã hoá.
