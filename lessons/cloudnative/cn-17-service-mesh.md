# Bài 17 — Service Mesh (Istio/Linkerd): mTLS, traffic, observability

## 1. Mục tiêu
Sau bài này bạn có thể:
- Giải thích **bài toán giao tiếp service-to-service** và vì sao nhét nó vào code lại **lặp ở mọi service, mọi ngôn ngữ**.
- Hiểu **kiến trúc service mesh**: **data plane** (sidecar proxy Envoy) và **control plane**.
- Bật **auto mTLS** (mã hoá + xác thực giữa các service) mà không sửa một dòng code app.
- Dùng **VirtualService / DestinationRule** để làm **canary/traffic split theo %**, retry, timeout.
- Cân nhắc **cái giá**: độ phức tạp, latency và tài nguyên sidecar; và hướng đi mới **ambient mesh** (bỏ sidecar).

---

## 2. Lý thuyết

### 2.1 Bài toán: giao tiếp service-to-service là *xương sống* của microservices

Trong monolith, hai module gọi nhau bằng một lời gọi hàm trong cùng process — an toàn, nhanh, không cần nghĩ. Khi tách thành **microservices**, mỗi lời gọi hàm biến thành một **network call** qua dây mạng thật. Mà mạng thì *không đáng tin*: gói tin rớt, service đích quá tải, độ trễ tăng đột biến, kẻ xấu nghe lén trong cùng cluster.

Vậy để hai service nói chuyện với nhau cho **đàng hoàng** trong production, mỗi lời gọi cần một loạt thứ:

| Nhu cầu | Nếu không có thì sao |
|---------|----------------------|
| **Mã hoá (encryption)** đường truyền | Traffic nội bộ đi plaintext, ai vào được network là đọc/sửa được |
| **Xác thực (authentication)** hai chiều | Service không biết bên kia có đúng là `payments` hay là kẻ mạo danh |
| **Retry** khi lỗi tạm thời | Một lần rớt gói → user thấy lỗi 500 dù chỉ cần thử lại |
| **Timeout** | Một service treo kéo theo caller treo → **cascading failure** |
| **Circuit breaking** | Service hỏng bị dội request → chết hẳn, kéo sập cả chuỗi |
| **Traffic split / canary** | Không thể đẩy 5% traffic sang bản mới để thử |
| **Telemetry, tracing** | Không biết request đi qua đâu, chậm ở khâu nào |

### 2.2 Vì sao KHÔNG nên nhét vào code

Cách "truyền thống" là dùng **thư viện** (Netflix Hystrix, Resilience4j, gRPC interceptor...) nhúng các logic trên vào từng service. Vấn đề cốt lõi:

- **Lặp lại ở mọi service**: 40 service = 40 lần cấu hình retry/timeout/mTLS, dễ lệch nhau.
- **Lặp ở mọi ngôn ngữ**: team Go, Java, Python, Node... mỗi ngôn ngữ một thư viện, hành vi *không giống nhau*, nâng cấp không đồng bộ.
- **Trộn concern**: dev nghiệp vụ phải hiểu cả TLS handshake, retry budget — logic hạ tầng lẫn vào logic business.
- **Đổi policy = build & deploy lại**: muốn siết timeout toàn hệ thống phải sửa code, test, release hàng chục service.

Đây chính là kiểu bài toán **"cross-cutting concern"**: nó cắt ngang mọi service. Giải pháp kiến trúc đúng là **tách nó ra khỏi code, đẩy xuống hạ tầng**. Đó là **Service Mesh**.

### 2.3 Ý tưởng cốt lõi: chặn traffic ở một proxy cạnh mỗi Pod

Thay vì để app tự mở kết nối mạng, ta **tiêm (inject)** một **proxy** vào cạnh mỗi Pod (thường là container **Envoy**). Nhờ cơ chế của Kubernetes, mọi traffic vào/ra Pod bị **iptables/eBPF chuyển hướng** qua proxy này. App vẫn tưởng nó gọi thẳng service kia, nhưng thực ra:

`app → (localhost) → Envoy của tôi → mạng → Envoy của đích → app đích`

Vì **mọi byte** đều đi qua Envoy, proxy trở thành nơi lý tưởng để cắm mọi thứ: mã hoá mTLS, retry, timeout, đếm metric, gắn trace header — **mà app không hề hay biết**. App chỉ viết logic nghiệp vụ.

Proxy này gọi là **sidecar** (thùng xe gắn cạnh xe máy): cùng vòng đời với Pod, cùng lên cùng xuống.

<svg viewBox="0 0 640 250" role="img" aria-labelledby="sc-t sc-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="sc-t">Sidecar proxy chặn mọi traffic giữa hai Pod</title>
<desc id="sc-d">App container gọi ra qua Envoy sidecar cùng Pod, đi qua mạng tới Envoy sidecar của Pod đích rồi mới tới app đích, mọi hop đều qua proxy</desc>
<rect x="20" y="50" width="250" height="150" rx="12" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor"/>
<text x="145" y="42" text-anchor="middle" font-size="12" fill="currentColor">Pod A (frontend)</text>
<rect x="45" y="90" width="90" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="90" y="120" text-anchor="middle" font-size="11" fill="currentColor">App</text>
<text x="90" y="136" text-anchor="middle" font-size="10" fill="currentColor">business</text>
<rect x="160" y="90" width="90" height="70" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="205" y="120" text-anchor="middle" font-size="11" fill="currentColor">Envoy</text>
<text x="205" y="136" text-anchor="middle" font-size="10" fill="currentColor">sidecar</text>
<line x1="135" y1="125" x2="158" y2="125" stroke="currentColor" stroke-width="1.3" marker-end="url(#a2)"/>
<rect x="370" y="50" width="250" height="150" rx="12" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor"/>
<text x="495" y="42" text-anchor="middle" font-size="12" fill="currentColor">Pod B (payments)</text>
<rect x="390" y="90" width="90" height="70" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="435" y="120" text-anchor="middle" font-size="11" fill="currentColor">Envoy</text>
<text x="435" y="136" text-anchor="middle" font-size="10" fill="currentColor">sidecar</text>
<rect x="505" y="90" width="90" height="70" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="120" text-anchor="middle" font-size="11" fill="currentColor">App</text>
<text x="550" y="136" text-anchor="middle" font-size="10" fill="currentColor">business</text>
<line x1="480" y1="125" x2="503" y2="125" stroke="currentColor" stroke-width="1.3" marker-end="url(#a2)"/>
<line x1="250" y1="115" x2="390" y2="115" stroke="currentColor" stroke-width="1.6" marker-end="url(#a2)"/>
<text x="320" y="106" text-anchor="middle" font-size="10" fill="currentColor">mTLS</text>
<text x="320" y="140" text-anchor="middle" font-size="9" fill="currentColor">encrypted + authenticated</text>
<defs><marker id="a2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

### 2.4 Data plane vs Control plane

Tập hợp tất cả sidecar Envoy làm nhiệm vụ *chuyển & xử lý traffic thật* — gọi là **data plane**. Nhưng ai bảo Envoy phải mã hoá thế nào, retry mấy lần, chia traffic ra sao? Đó là việc của **control plane**: một hệ thống trung tâm (Istio là `istiod`) nhận **cấu hình khai báo** của bạn (YAML), dịch ra và **đẩy xuống** cho từng Envoy, đồng thời phát **chứng chỉ (certificate)** cho mTLS.

<svg viewBox="0 0 640 260" role="img" aria-labelledby="cp-t cp-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="cp-t">Control plane cấu hình cho data plane</title>
<desc id="cp-d">istiod ở control plane đẩy cấu hình và chứng chỉ xuống các Envoy sidecar ở data plane, còn traffic thật đi ngang giữa các sidecar</desc>
<rect x="220" y="20" width="200" height="60" rx="10" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<text x="320" y="45" text-anchor="middle" font-size="12" fill="currentColor">Control plane — istiod</text>
<text x="320" y="64" text-anchor="middle" font-size="10" fill="currentColor">config + cấp certificate</text>
<rect x="40" y="170" width="150" height="60" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="196" text-anchor="middle" font-size="11" fill="currentColor">Envoy (Pod A)</text>
<text x="115" y="213" text-anchor="middle" font-size="10" fill="currentColor">data plane</text>
<rect x="250" y="170" width="150" height="60" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="325" y="196" text-anchor="middle" font-size="11" fill="currentColor">Envoy (Pod B)</text>
<text x="325" y="213" text-anchor="middle" font-size="10" fill="currentColor">data plane</text>
<rect x="460" y="170" width="150" height="60" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="535" y="196" text-anchor="middle" font-size="11" fill="currentColor">Envoy (Pod C)</text>
<text x="535" y="213" text-anchor="middle" font-size="10" fill="currentColor">data plane</text>
<line x1="300" y1="80" x2="140" y2="168" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#a3)"/>
<line x1="320" y1="80" x2="322" y2="168" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#a3)"/>
<line x1="340" y1="80" x2="510" y2="168" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#a3)"/>
<text x="235" y="120" text-anchor="middle" font-size="9" fill="currentColor">push config + cert</text>
<line x1="190" y1="205" x2="248" y2="205" stroke="currentColor" stroke-width="1.6" marker-end="url(#a3)"/>
<line x1="400" y1="205" x2="458" y2="205" stroke="currentColor" stroke-width="1.6" marker-end="url(#a3)"/>
<text x="325" y="250" text-anchor="middle" font-size="10" fill="currentColor">traffic thật (mTLS) đi ngang trong data plane</text>
<defs><marker id="a3" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

Ghi nhớ nguyên tắc: **control plane không nằm trên đường đi của request**. Nếu `istiod` chết, các Envoy vẫn giữ cấu hình cũ và tiếp tục chuyển traffic — bạn chỉ mất khả năng *thay đổi* cấu hình, không mất luồng dữ liệu. Đây là thiết kế chịu lỗi quan trọng.

### 2.5 Istio vs Linkerd

Hai mesh phổ biến nhất, triết lý khác nhau:

| Tiêu chí | **Istio** | **Linkerd** |
|----------|-----------|-------------|
| Proxy data plane | Envoy (C++, cực giàu tính năng) | `linkerd2-proxy` (viết bằng **Rust**, siêu nhẹ) |
| Triết lý | Nhiều tính năng, cấu hình sâu | Tối giản, "chạy là chạy", ít nút vặn |
| mTLS | Có, auto | Có, auto (bật mặc định) |
| Traffic mgmt | Rất mạnh (VirtualService, fault injection, mirroring) | Cơ bản (traffic split qua SMI/HTTPRoute) |
| Tài nguyên/latency sidecar | Cao hơn | Rất thấp (thường vài mili-core, <1ms) |
| Độ dốc học tập | Dốc | Thoải |
| Khi chọn | Cần L7 phức tạp, multi-cluster, policy sâu | Muốn mTLS + observability nhanh, gọn, ít gánh nặng |

Nguyên tắc chọn: **cần nhiều tính năng L7 và sẵn sàng trả giá phức tạp → Istio; muốn an toàn + quan sát nhanh gọn nhẹ → Linkerd.** Đừng chọn Istio chỉ vì nó "xịn hơn" nếu bạn chỉ cần mTLS.

---

## 3. Thực hành với Istio

### 3.1 Cài đặt và bật auto-injection

```bash
# Cài Istio (profile demo cho học tập)
istioctl install --set profile=demo -y

# Bật auto sidecar injection cho namespace: mọi Pod mới sẽ được tiêm Envoy
kubectl label namespace default istio-injection=enabled

# Deploy lại app -> Pod giờ có 2/2 container (app + istio-proxy)
kubectl rollout restart deployment/frontend
kubectl get pod
# NAME                        READY   STATUS
# frontend-xxx                2/2     Running   <- 2/2 = app + sidecar
```

Bạn **không sửa image, không sửa code**. Istio dùng một **MutatingWebhook** để, ngay lúc Pod được tạo, chèn thêm container `istio-proxy` và cấu hình iptables chuyển hướng traffic. Đó là ý nghĩa của "tách ra hạ tầng".

### 3.2 Auto mTLS — mã hoá & xác thực toàn cluster, 0 dòng code

```yaml
# peer-auth.yaml — ép mọi traffic service-to-service phải là mTLS
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT   # từ chối mọi kết nối plaintext; chỉ nhận mTLS
```

```bash
kubectl apply -f peer-auth.yaml
```

Với `STRICT`, hai Envoy tự **handshake mTLS**: mỗi bên trình **certificate** do `istiod` cấp (dựa trên **SPIFFE identity** gắn với ServiceAccount của Pod), xác minh danh tính lẫn nhau **hai chiều**, rồi mã hoá kênh. App tưởng nó gọi HTTP thường; Envoy nâng cấp thành mTLS phía dưới. Certificate được **tự động xoay vòng (rotate)** vài giờ một lần — không ai phải quản lý thủ công.

> Muốn siết chặt hơn ai được gọi ai, dùng **AuthorizationPolicy** (ví dụ chỉ `frontend` được gọi `payments`) — cũng là YAML, không đụng code.

### 3.3 Traffic management: DestinationRule + VirtualService (canary theo %)

Đây là phần đắt giá nhất. Giả sử `reviews` có 2 phiên bản (`v1`, `v2`) và bạn muốn đẩy **10% traffic** sang `v2` để thử (canary).

Trước hết định nghĩa các **subset** (nhóm bản theo label) bằng **DestinationRule**:

```yaml
# destinationrule.yaml — khai báo subset và policy phía đích
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews          # tên Service trong cluster
  subsets:
    - name: v1
      labels: { version: v1 }
    - name: v2
      labels: { version: v2 }
  trafficPolicy:
    connectionPool:
      http: { http2MaxRequests: 100 }
    outlierDetection:     # circuit breaking: loại instance lỗi ra khỏi pool
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

Rồi **VirtualService** định tuyến theo %:

```yaml
# virtualservice.yaml — 90% v1, 10% v2 + retry + timeout
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts: [ reviews ]
  http:
    - route:
        - destination: { host: reviews, subset: v1 }
          weight: 90
        - destination: { host: reviews, subset: v2 }
          weight: 10
      timeout: 2s               # cắt request treo quá 2s
      retries:
        attempts: 3             # thử tối đa 3 lần
        perTryTimeout: 1s
        retryOn: 5xx,connect-failure,reset
```

```bash
kubectl apply -f destinationrule.yaml -f virtualservice.yaml
```

Từ giờ, Envoy chia dòng: **cứ 100 request thì ~10 sang v2**. Ưng thì đổi `weight` thành `50/50`, rồi `0/100` để cắt hẳn sang v2 — **không deploy lại**, chỉ `kubectl apply`. Nếu v2 lỗi, đổi ngược về `100/0` trong vài giây. Đây là **progressive delivery** ở tầng hạ tầng.

> Retry/timeout/circuit-breaking ở trên trước đây phải viết trong *mỗi service, mỗi ngôn ngữ*. Giờ nằm gọn trong YAML, áp cho mọi caller như nhau.

### 3.4 Observability tự động

Vì mọi traffic đi qua Envoy, mesh **tự sinh telemetry** mà app không phải thêm code:
- **Metrics** (Prometheus): request rate, error rate, latency p50/p90/p99 cho *từng cặp* service → dựng **service graph** (Kiali).
- **Distributed tracing** (Jaeger/Tempo): Envoy tự tạo & lan truyền trace header, dựng lại đường đi của một request qua nhiều service.
- **Access logs** đồng nhất.

```bash
# Ví dụ metric Envoy expose sẵn (Prometheus format)
istio_requests_total{source_app="frontend",destination_app="reviews",
                     destination_version="v2",response_code="200"}  1287

istio_request_duration_milliseconds_bucket{destination_app="payments",le="100"} 9345
```

*Lưu ý*: app **vẫn nên tự truyền tiếp trace header** (`traceparent`) qua các lời gọi nội bộ để trace nối liền; mesh lo phần lan truyền ở tầng mạng, nhưng không nhìn thấy được quan hệ nhân-quả bên trong process app.

---

## 4. Cái giá của service mesh

Mesh không miễn phí. Phải cân nhắc thật:

- **Độ phức tạp vận hành**: thêm một control plane phải nâng cấp, giám sát, debug. CRD mới (VirtualService, DestinationRule...) là một "ngôn ngữ" phải học. Sai một PeerAuthentication `STRICT` có thể *cắt đứt* cả cluster.
- **Latency**: mỗi request giờ qua **2 hop proxy** (Envoy gửi + Envoy nhận). Thường thêm **~0.5–2ms mỗi hop** — nhỏ với web app, nhưng đáng kể với chuỗi gọi sâu hoặc dịch vụ latency cực thấp.
- **Tài nguyên**: mỗi Pod cõng thêm một container Envoy (CPU + vài chục MB RAM). Cluster 1000 Pod = 1000 Envoy — tốn kém rõ rệt.
- **Khó debug hơn**: khi có sự cố, phải phân biệt lỗi ở app hay ở sidecar; header, retry, timeout của mesh có thể che giấu hành vi thật.

**Nguyên tắc**: chỉ đưa mesh vào khi bạn thật sự cần **mTLS toàn cụm, traffic management tinh vi, hoặc observability đồng nhất** trên *nhiều* service. Vài service thì NetworkPolicy + thư viện retry + Ingress đủ và rẻ hơn nhiều.

### 4.1 Ambient mesh — bỏ sidecar

Để cắt cái giá "mỗi Pod một Envoy", Istio giới thiệu **ambient mesh** (sidecar-less):
- **ztunnel**: một agent **mỗi node** (không phải mỗi Pod) lo **L4 + mTLS** cho toàn bộ Pod trên node đó.
- **waypoint proxy**: chỉ triển khai Envoy *khi cần xử lý L7* (traffic split, retry L7), theo namespace/service — không cắm vào mọi Pod.

Kết quả: chi phí tài nguyên & latency giảm mạnh cho các workload chỉ cần mTLS, còn tính năng L7 vẫn có khi cần. Linkerd cũng đi hướng cực nhẹ nhờ proxy Rust. Đây là xu hướng làm mesh "vô hình và rẻ" hơn.

<svg viewBox="0 0 640 200" role="img" aria-labelledby="am-t am-d" style="width:100%;max-width:600px;height:auto;display:block;margin:1.25rem auto">
<title id="am-t">Sidecar mesh so với ambient mesh</title>
<desc id="am-d">Bên trái mỗi Pod có một Envoy riêng, bên phải các Pod dùng chung một ztunnel trên mỗi node cho lớp L4 và mTLS</desc>
<text x="160" y="30" text-anchor="middle" font-size="12" fill="currentColor">Sidecar: mỗi Pod 1 Envoy</text>
<rect x="40" y="45" width="110" height="60" rx="8" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor"/>
<text x="80" y="70" text-anchor="middle" font-size="10" fill="currentColor">App</text>
<rect x="95" y="52" width="48" height="46" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="119" y="79" text-anchor="middle" font-size="9" fill="currentColor">Envoy</text>
<rect x="40" y="120" width="110" height="60" rx="8" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor"/>
<text x="80" y="145" text-anchor="middle" font-size="10" fill="currentColor">App</text>
<rect x="95" y="127" width="48" height="46" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="119" y="154" text-anchor="middle" font-size="9" fill="currentColor">Envoy</text>
<text x="470" y="30" text-anchor="middle" font-size="12" fill="currentColor">Ambient: 1 ztunnel / node</text>
<rect x="370" y="45" width="90" height="55" rx="8" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor"/>
<text x="415" y="76" text-anchor="middle" font-size="10" fill="currentColor">App</text>
<rect x="370" y="115" width="90" height="55" rx="8" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor"/>
<text x="415" y="146" text-anchor="middle" font-size="10" fill="currentColor">App</text>
<rect x="500" y="70" width="100" height="75" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<text x="550" y="100" text-anchor="middle" font-size="10" fill="currentColor">ztunnel</text>
<text x="550" y="116" text-anchor="middle" font-size="9" fill="currentColor">L4 + mTLS</text>
<text x="550" y="131" text-anchor="middle" font-size="9" fill="currentColor">(cả node)</text>
<line x1="460" y1="72" x2="500" y2="95" stroke="currentColor" stroke-width="1.2" marker-end="url(#a4)"/>
<line x1="460" y1="142" x2="500" y2="120" stroke="currentColor" stroke-width="1.2" marker-end="url(#a4)"/>
<defs><marker id="a4" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>

---

## 5. Tóm tắt
- Giao tiếp service-to-service cần mã hoá, xác thực, retry, timeout, circuit breaking, canary, telemetry — nhét vào code thì **lặp ở mọi service và mọi ngôn ngữ**, trộn concern, đổi policy phải deploy lại.
- **Service Mesh** tách các concern đó xuống hạ tầng: **data plane** là các **sidecar Envoy** tiêm cạnh mỗi Pod, chặn mọi traffic; **control plane** (`istiod`) cấu hình và cấp certificate, **không nằm trên đường đi của request**.
- **Istio** giàu tính năng (Envoy) nhưng phức tạp; **Linkerd** nhẹ, đơn giản (proxy Rust) — chọn theo nhu cầu, đừng chọn theo "xịn hơn".
- **Auto mTLS** (`PeerAuthentication STRICT`) mã hoá + xác thực hai chiều, 0 dòng code; **VirtualService + DestinationRule** làm **canary theo %**, retry, timeout, circuit breaking chỉ bằng `kubectl apply`; observability (metrics, tracing) sinh tự động.
- **Cái giá**: độ phức tạp, +latency mỗi hop proxy, +tài nguyên mỗi sidecar. **Ambient mesh** (ztunnel/node + waypoint khi cần L7) và proxy siêu nhẹ là hướng giảm giá đó. Chỉ dùng mesh khi thật sự cần trên quy mô nhiều service.

> **Bài tiếp theo (Bài 18):** GitOps với Argo CD/Flux — coi Git là **single source of truth**, cluster tự đồng bộ về đúng trạng thái khai báo trong repo.
