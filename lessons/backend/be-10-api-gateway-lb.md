# Bài 10 — API Gateway & Load Balancing

Client không nên biết bên trong bạn có bao nhiêu service, chúng nằm ở đâu, cái nào vừa restart. Giữa "thế giới bên ngoài" và "đàn service bên trong" luôn có hai lớp hạ tầng làm việc âm thầm: **API Gateway** quyết định *request nào được vào, xử lý ra sao* ở tầng ứng dụng, và **Load Balancer** quyết định *request đó chạy tới instance nào* ở tầng kết nối. Hai thứ này thường bị gộp làm một, nhưng chúng giải hai bài toán khác nhau. Bài này mổ xẻ bản chất từng lớp, khi nào L4 khi nào L7, client-side vs server-side LB, và vì sao gRPC lại phá vỡ load balancer ngây thơ.

## Mục tiêu

- Hiểu API Gateway là **single entry point** gánh các cross-cutting concern, và ranh giới giữa gateway (north-south) với service mesh (east-west).
- Nắm pattern **BFF (Backend for Frontend)** và khi nào cần nhiều gateway thay vì một.
- Phân biệt **L4 vs L7 load balancing** ở mức bản chất giao thức, không chỉ "L7 xịn hơn".
- Chọn đúng **thuật toán cân bằng** (round-robin, weighted, least-connections, consistent hashing) và cơ chế **health check** chủ động/bị động.
- Hiểu **client-side LB vs server-side LB**, và vì sao gRPC/HTTP2 buộc phải nghĩ lại chuyện cân bằng tải.
- Đọc và viết được config thật (NGINX, Envoy, k8s, gRPC).

## Lý thuyết

### API Gateway là gì — và tại sao không để client gọi thẳng service

Hình dung một toà nhà văn phòng lớn. Không ai để khách vào tự đi tìm từng phòng ban: có một **quầy lễ tân** ở sảnh — kiểm tra thẻ (authn), xem khách có quyền vào tầng nào (authz), phát thẻ tạm, chỉ đường tới đúng phòng (routing), và chặn người lạ mặt vào giờ cao điểm (rate limiting). API Gateway chính là quầy lễ tân đó cho hệ thống.

Nếu để client gọi thẳng từng microservice, mỗi service phải tự làm lại: verify JWT, kiểm tra rate limit, terminate TLS, log, CORS, chuyển đổi giao thức... 30 service là 30 bản copy của cùng một logic bảo mật — và chỉ cần một bản làm sai là thủng. Đây là các **cross-cutting concern**: thứ mọi request đều cần nhưng không thuộc về nghiệp vụ của service nào. Gateway kéo chúng ra một chỗ.

Những việc gateway gánh:

| Concern | Gateway làm gì | Vì sao không để service tự làm |
|---|---|---|
| **AuthN/AuthZ** | Verify JWT/API key, gọi authorizer, gắn identity vào header nội bộ | Tập trung nơi xoay khoá, mọi service tin `X-User-Id` gateway gắn |
| **Rate limiting** | Token bucket theo API key/user/IP, trả 429 | Phải chặn *trước* phần xử lý đắt, state tập trung |
| **TLS termination** | Giải mã HTTPS ở edge, nội bộ dùng mTLS hoặc plaintext trong mesh | Quản lý cert một chỗ thay vì rải cert lên mọi pod |
| **Routing** | `/orders/*` → Order Service, `/pay/*` → Payment | Client chỉ biết một host, backend đổi topology thoải mái |
| **Request aggregation** | Gộp nhiều call nội bộ thành một response | Giảm round-trip cho mobile mạng yếu |
| **Protocol translation** | REST/JSON ngoài ↔ gRPC/Protobuf trong | Client browser không nói được gRPC |
| **Observability** | Gắn `trace_id`, đo latency, log tập trung | Một điểm nhìn toàn bộ traffic vào |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" aria-labelledby="gw-t gw-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="gw-t">API Gateway làm single entry point gánh các cross-cutting concern trước khi route vào service nội bộ</title>
  <desc id="gw-d">Client bên ngoài gọi vào một API Gateway duy nhất; gateway lần lượt terminate TLS, xác thực, rate limit, rồi route theo path tới Order, Payment và Inventory service ở phía trong biên hệ thống.</desc>
  <defs>
    <marker id="gah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11.5" fill="currentColor" stroke="currentColor">
    <rect x="40" y="150" width="140" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="110" y="172" text-anchor="middle" stroke="none" font-weight="700">Client</text>
    <text x="110" y="188" text-anchor="middle" stroke="none" font-size="10" opacity="0.65">browser · mobile · 3rd-party</text>
    <line x1="180" y1="175" x2="252" y2="175" stroke-opacity="0.6" marker-end="url(#gah)"/>
    <text x="216" y="167" text-anchor="middle" stroke="none" font-size="10" opacity="0.75">HTTPS</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="254" y="70" width="180" height="240" rx="11" fill="#10b981" fill-opacity="0.10" stroke-opacity="0.2"/>
    <text x="344" y="92" text-anchor="middle" stroke="none" font-weight="700">API Gateway</text>
    <rect x="270" y="104" width="148" height="26" rx="6" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="344" y="121" text-anchor="middle" stroke="none" font-size="10.5">TLS termination</text>
    <rect x="270" y="136" width="148" height="26" rx="6" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="344" y="153" text-anchor="middle" stroke="none" font-size="10.5">authn / authz</text>
    <rect x="270" y="168" width="148" height="26" rx="6" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="344" y="185" text-anchor="middle" stroke="none" font-size="10.5">rate limit → 429</text>
    <rect x="270" y="200" width="148" height="26" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="344" y="217" text-anchor="middle" stroke="none" font-size="10.5">routing theo path</text>
    <rect x="270" y="232" width="148" height="26" rx="6" fill="#8b5cf6" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="344" y="249" text-anchor="middle" stroke="none" font-size="10.5">protocol translate</text>
    <rect x="270" y="264" width="148" height="26" rx="6" fill="#f59e0b" fill-opacity="0.16" stroke-opacity="0.18"/>
    <text x="344" y="281" text-anchor="middle" stroke="none" font-size="10.5">trace_id · log</text>
  </g>
  <line x1="470" y1="40" x2="470" y2="340" stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="5 5"/>
  <text x="478" y="54" font-size="10" fill="currentColor" opacity="0.5" stroke="none">biên hệ thống</text>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="520" y="86" width="160" height="46" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="600" y="114" text-anchor="middle" stroke="none">Order Service</text>
    <rect x="520" y="164" width="160" height="46" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="600" y="192" text-anchor="middle" stroke="none">Payment Service</text>
    <rect x="520" y="242" width="160" height="46" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="600" y="270" text-anchor="middle" stroke="none">Inventory Service</text>
    <path d="M434 200 L500 109" fill="none" stroke-opacity="0.55" marker-end="url(#gah)"/>
    <path d="M434 210 L500 187" fill="none" stroke-opacity="0.55" marker-end="url(#gah)"/>
    <path d="M434 220 L500 265" fill="none" stroke-opacity="0.55" marker-end="url(#gah)"/>
  </g>
</svg>

> 💡 Ghi nhớ: gateway là nơi hội tụ **policy**, không phải nơi chứa **business logic**. Khi bạn thấy mình viết logic tính giá đơn hàng trong gateway, đó là mùi của "smart gateway" — một cục nghẽn về mặt tổ chức và triển khai. Gateway phải mỏng.

### BFF — Backend for Frontend

Một gateway chung cho tất cả client nghe hợp lý, cho tới khi bạn nhận ra web, mobile và smart TV cần những thứ rất khác nhau. Mobile mạng yếu muốn **một** response gộp sẵn để đỡ round-trip; web desktop muốn dữ liệu nested giàu; TV chỉ cần vài field. Nhét mọi nhu cầu vào một gateway chung sẽ biến nó thành mớ `if client == "mobile"` chằng chịt.

**BFF pattern**: mỗi loại client có một gateway riêng do chính team frontend đó sở hữu. BFF cho mobile gộp 3 call service thành 1, cắt field thừa; BFF cho web giữ nguyên độ chi tiết. Mỗi BFF tối ưu cho trải nghiệm của đúng client đó.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" aria-labelledby="bff-t bff-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="bff-t">BFF pattern: mỗi loại client có một backend-for-frontend riêng gọi xuống các domain service chung</title>
  <desc id="bff-d">Web, mobile và TV mỗi loại nối tới một BFF riêng được tối ưu cho nó; ba BFF cùng gọi xuống các domain service dùng chung là Order, Catalog và User.</desc>
  <defs>
    <marker id="bah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="30" y="20" width="120" height="38" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="90" y="43" text-anchor="middle" stroke="none">Web SPA</text>
    <rect x="300" y="20" width="120" height="38" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="360" y="43" text-anchor="middle" stroke="none">Mobile app</text>
    <rect x="570" y="20" width="120" height="38" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="630" y="43" text-anchor="middle" stroke="none">Smart TV</text>
    <rect x="30" y="110" width="120" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="90" y="130" text-anchor="middle" stroke="none" font-weight="700">Web BFF</text>
    <text x="90" y="145" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.65">nested, giàu field</text>
    <rect x="300" y="110" width="120" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="360" y="130" text-anchor="middle" stroke="none" font-weight="700">Mobile BFF</text>
    <text x="360" y="145" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.65">gộp call, payload gọn</text>
    <rect x="570" y="110" width="120" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="630" y="130" text-anchor="middle" stroke="none" font-weight="700">TV BFF</text>
    <text x="630" y="145" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.65">vài field tối thiểu</text>
    <line x1="90" y1="58" x2="90" y2="108" stroke-opacity="0.6" marker-end="url(#bah)"/>
    <line x1="360" y1="58" x2="360" y2="108" stroke-opacity="0.6" marker-end="url(#bah)"/>
    <line x1="630" y1="58" x2="630" y2="108" stroke-opacity="0.6" marker-end="url(#bah)"/>
  </g>
  <line x1="20" y1="185" x2="700" y2="185" stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="5 5"/>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="80" y="240" width="150" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="155" y="267" text-anchor="middle" stroke="none">Order Service</text>
    <rect x="285" y="240" width="150" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="360" y="267" text-anchor="middle" stroke="none">Catalog Service</text>
    <rect x="490" y="240" width="150" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="565" y="267" text-anchor="middle" stroke="none">User Service</text>
    <path d="M90 154 L150 238" fill="none" stroke-opacity="0.4" marker-end="url(#bah)"/>
    <path d="M360 154 L360 238" fill="none" stroke-opacity="0.4" marker-end="url(#bah)"/>
    <path d="M360 154 L200 238" fill="none" stroke-opacity="0.4" marker-end="url(#bah)"/>
    <path d="M630 154 L560 238" fill="none" stroke-opacity="0.4" marker-end="url(#bah)"/>
  </g>
  <text x="360" y="315" text-anchor="middle" font-size="10.5" fill="currentColor" opacity="0.6" stroke="none">domain service dùng chung — mỗi BFF tự tổng hợp theo nhu cầu client của nó</text>
</svg>

Cái giá của BFF: nhiều codebase hơn, dễ trùng lặp logic giữa các BFF. Đừng lạm dụng — chỉ tách BFF khi nhu cầu client thực sự phân kỳ. Một startup với web + mobile giống nhau thì một gateway chung là đủ. GraphQL cũng là một cách hiện thực BFF (một endpoint, client tự chọn shape) — xem lại Bài 1.

### Gateway vs Service Mesh — north-south vs east-west

Đây là điểm hay nhầm nhất. Hai thứ nghe giống nhau (đều proxy, đều làm routing/observability/security) nhưng phục vụ hai trục traffic khác nhau:

- **North-south**: traffic đi *vào/ra* khỏi hệ thống — client ngoài ↔ service. Đây là địa hạt của **API Gateway**.
- **East-west**: traffic *giữa các service nội bộ* với nhau. Đây là địa hạt của **Service Mesh**.

Service mesh (Istio, Linkerd, Consul) triển khai bằng **sidecar proxy** (thường là Envoy) chạy cạnh mỗi pod. Mọi call service-to-service đi qua sidecar, cho bạn mTLS tự động giữa mọi service, retry/timeout/circuit breaking, traffic shifting (canary), và observability — tất cả *không cần đụng vào code service*.

| | API Gateway | Service Mesh |
|---|---|---|
| Trục traffic | North-south (edge) | East-west (nội bộ) |
| Vị trí | Một cụm ở biên | Sidecar cạnh *mỗi* pod |
| Lo về | Client-facing: authn, rate limit, BFF | Service-to-service: mTLS, retry, canary |
| Ai gọi | Client bên ngoài | Service khác bên trong |
| Ví dụ | Kong, APISIX, AWS API Gateway | Istio, Linkerd, Consul |

Chúng **bổ sung** nhau, không thay thế. Kiến trúc điển hình: gateway ở edge nhận request ngoài → route vào mesh → các service gọi nhau qua sidecar. Một số sản phẩm (Istio Gateway, Envoy Gateway) làm cả hai vai bằng cùng nền Envoy, nhưng vai trò logic vẫn tách bạch.

## Load Balancing — request tới đúng instance nào

Gateway quyết định *request được xử lý ra sao*. Load balancer quyết định *request chạy tới bản sao (replica) nào* của service. Khi bạn scale ngang một service lên 10 pod, phải có ai đó rải request cho đều — đó là load balancer.

### L4 vs L7 — khác nhau ở tầng nào của gói tin

Đây là phân biệt cốt lõi, và nó thuần tuý về **giao thức LB nhìn thấy được tới đâu**:

- **L4 (transport layer — TCP/UDP)**: LB chỉ nhìn thấy IP:port nguồn/đích. Nó **không mở gói TCP ra đọc**, không biết bên trong là HTTP, gRPC hay gì. Nó chỉ chọn một backend rồi *forward nguyên byte stream* qua lại. Cực nhanh (chỉ swap địa chỉ, có thể chạy ở tốc độ line-rate), nhưng **mù nội dung** — không route theo URL/header được, không terminate TLS được (vì không đọc được payload đã mã hoá).
- **L7 (application layer — HTTP)**: LB **thực sự parse HTTP request**. Nó đọc được method, path, header, cookie → route `/api/*` sang cụm A, `Host: admin.x.com` sang cụm B, sticky theo cookie. Nó **terminate TLS** (giải mã, xử lý, có thể mã hoá lại xuống backend), buffer request, retry được ở tầng HTTP, chèn header (`X-Forwarded-For`). Đắt hơn L4 (phải parse + có thể buffer) nhưng **thông minh**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" aria-labelledby="l4l7-t l4l7-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="l4l7-t">L4 load balancer forward nguyên byte stream theo IP port, L7 parse HTTP để route theo path và header</title>
  <desc id="l4l7-d">Bên trái L4 nhìn gói tin chỉ thấy IP và port rồi forward nguyên si tới một backend bất kỳ. Bên phải L7 mở HTTP ra đọc path và header nên route request slash api tới cụm API và slash img tới cụm ảnh.</desc>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="24" y="20" width="316" height="290" rx="12" fill="#f59e0b" fill-opacity="0.08" stroke-opacity="0.18"/>
    <text x="182" y="44" text-anchor="middle" stroke="none" font-weight="700">L4 (TCP) — mù nội dung</text>
    <rect x="60" y="60" width="244" height="46" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke-opacity="0.18"/>
    <text x="182" y="80" text-anchor="middle" stroke="none" font-size="10.5">chỉ thấy: src/dst IP:port</text>
    <text x="182" y="96" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.6">payload là hộp đen (kể cả TLS)</text>
    <rect x="130" y="130" width="104" height="40" rx="8" fill="#f59e0b" fill-opacity="0.18" stroke-opacity="0.2"/>
    <text x="182" y="154" text-anchor="middle" stroke="none">L4 LB</text>
    <rect x="60" y="240" width="70" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="95" y="269" text-anchor="middle" stroke="none" font-size="10">be-1</text>
    <rect x="147" y="240" width="70" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="182" y="269" text-anchor="middle" stroke="none" font-size="10">be-2</text>
    <rect x="234" y="240" width="70" height="50" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="269" y="269" text-anchor="middle" stroke="none" font-size="10">be-3</text>
    <line x1="182" y1="106" x2="182" y2="128" stroke-opacity="0.6"/>
    <line x1="170" y1="170" x2="110" y2="238" stroke-opacity="0.5" stroke-dasharray="4 3"/>
    <line x1="182" y1="170" x2="182" y2="238" stroke-opacity="0.7"/>
    <line x1="194" y1="170" x2="255" y2="238" stroke-opacity="0.5" stroke-dasharray="4 3"/>
    <text x="182" y="212" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.6">chọn 1 backend, forward nguyên si</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="380" y="20" width="316" height="290" rx="12" fill="#10b981" fill-opacity="0.08" stroke-opacity="0.18"/>
    <text x="538" y="44" text-anchor="middle" stroke="none" font-weight="700">L7 (HTTP) — hiểu nội dung</text>
    <rect x="416" y="60" width="244" height="46" rx="8" fill="#10b981" fill-opacity="0.14" stroke-opacity="0.18"/>
    <text x="538" y="80" text-anchor="middle" stroke="none" font-size="10.5">parse: method · path · header · cookie</text>
    <text x="538" y="96" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.6">terminate TLS · retry · chèn header</text>
    <rect x="486" y="130" width="104" height="40" rx="8" fill="#10b981" fill-opacity="0.2" stroke-opacity="0.2"/>
    <text x="538" y="154" text-anchor="middle" stroke="none">L7 LB</text>
    <rect x="404" y="240" width="120" height="50" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="464" y="263" text-anchor="middle" stroke="none" font-size="10">cụm API</text>
    <text x="464" y="278" text-anchor="middle" stroke="none" font-size="9" opacity="0.6">/api/*</text>
    <rect x="552" y="240" width="120" height="50" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="612" y="263" text-anchor="middle" stroke="none" font-size="10">cụm ảnh</text>
    <text x="612" y="278" text-anchor="middle" stroke="none" font-size="9" opacity="0.6">/img/*</text>
    <line x1="538" y1="106" x2="538" y2="128" stroke-opacity="0.6"/>
    <line x1="520" y1="170" x2="464" y2="238" stroke-opacity="0.7" marker-end="url(#l7a)"/>
    <line x1="556" y1="170" x2="612" y2="238" stroke-opacity="0.7" marker-end="url(#l7a)"/>
    <text x="488" y="205" text-anchor="middle" stroke="none" font-size="9" opacity="0.7">route theo path</text>
  </g>
  <defs>
    <marker id="l7a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
</svg>

| | L4 (TCP/UDP) | L7 (HTTP) |
|---|---|---|
| Nhìn thấy | IP:port | Method, path, header, cookie, body |
| Route theo | Chỉ IP:port đích | Path, host, header — nội dung |
| TLS | Passthrough (không giải mã) | Terminate được, re-encrypt được |
| Tốc độ | Rất nhanh, ít CPU | Chậm hơn (parse + buffer) |
| Sticky | Theo IP nguồn | Theo cookie/header — chính xác hơn |
| Ví dụ | AWS NLB, LVS, HAProxy TCP mode | AWS ALB, NGINX, Envoy, HAProxy HTTP |

Thực tế thường xếp chồng: **NLB (L4) ở ngoài cùng** hứng traffic khổng lồ và cho IP tĩnh → **L7 (ALB/Envoy) phía sau** làm routing thông minh. Bạn không phải chọn một.

### Thuật toán cân bằng tải

Chọn backend nào là một quyết định thuật toán, mỗi cái có giả định riêng:

| Thuật toán | Cách hoạt động | Hợp khi | Bẫy |
|---|---|---|---|
| **Round-robin** | Lần lượt be-1, be-2, be-3, quay vòng | Request đồng đều, backend đồng cấu hình | Request nặng nhẹ lệch → tải lệch dù chia đều số lượng |
| **Weighted RR** | Backend mạnh nhận trọng số cao hơn | Máy không đồng cấu hình, canary (95/5) | Trọng số tĩnh, không phản ứng tải thực |
| **Least-connections** | Chọn backend đang ít kết nối active nhất | Request thời lượng lệch nhau nhiều | Cần LB theo dõi state connection |
| **Least-response-time** | Least-conn + ưu tiên backend phản hồi nhanh | Nhạy với backend đang chậm | Phức tạp hơn, cần đo latency |
| **Consistent hashing** | Hash key (user_id, session) → cùng key luôn về cùng backend | Cần sticky, cache locality | Thêm/bớt node chỉ xáo trộn 1/N key |

**Consistent hashing** đáng nói riêng vì nó giải bài toán sticky mà không lưu bảng state. Hash thường (`hash(key) % N`) có tử huyệt: đổi N (thêm/bớt một backend) thì *gần như mọi* key remap → cache miss hàng loạt. Consistent hashing đặt cả backend và key lên một "vòng tròn hash"; mỗi key thuộc về backend kế tiếp theo chiều kim đồng hồ. Khi một backend biến mất, **chỉ các key của riêng nó** dời sang hàng xóm — trung bình chỉ 1/N key bị ảnh hưởng, phần còn lại giữ nguyên. Đây là nền tảng của sticky session ổn định và của sharding cache như trong Bài 3.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-labelledby="ch-t ch-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="ch-t">Consistent hashing: bỏ một node chỉ remap phần key của node đó thay vì toàn bộ như modulo</title>
  <desc id="ch-d">Bên trái modulo N khi mất một node thì hầu hết key phải remap gây cache miss hàng loạt. Bên phải consistent hashing trên vòng tròn chỉ chuyển các key thuộc node bị mất sang node kế tiếp, phần còn lại giữ nguyên.</desc>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <text x="182" y="30" text-anchor="middle" stroke="none" font-weight="700">hash(key) % N — bỏ 1 node</text>
    <rect x="40" y="48" width="284" height="30" rx="6" fill="#f43f5e" fill-opacity="0.14" stroke-opacity="0.18"/>
    <text x="182" y="68" text-anchor="middle" stroke="none" font-size="10">N: 3 → 2, đổi mẫu số</text>
    <g font-size="9" fill="currentColor">
      <rect x="40" y="92" width="52" height="24" rx="4" fill="#f43f5e" fill-opacity="0.13" stroke-opacity="0.15"/>
      <rect x="98" y="92" width="52" height="24" rx="4" fill="#f43f5e" fill-opacity="0.13" stroke-opacity="0.15"/>
      <rect x="156" y="92" width="52" height="24" rx="4" fill="#10b981" fill-opacity="0.16" stroke-opacity="0.15"/>
      <rect x="214" y="92" width="52" height="24" rx="4" fill="#f43f5e" fill-opacity="0.13" stroke-opacity="0.15"/>
      <rect x="272" y="92" width="52" height="24" rx="4" fill="#f43f5e" fill-opacity="0.13" stroke-opacity="0.15"/>
    </g>
    <text x="182" y="140" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">đỏ = phải remap (đa số) → cache miss hàng loạt</text>
  </g>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <text x="538" y="30" text-anchor="middle" stroke="none" font-weight="700">consistent hashing — vòng tròn</text>
    <circle cx="538" cy="165" r="86" fill="none" stroke-opacity="0.3"/>
    <circle cx="538" cy="79" r="9" fill="#3b82f6" fill-opacity="0.5" stroke-opacity="0.3"/>
    <text x="538" y="68" text-anchor="middle" stroke="none" font-size="9">A</text>
    <circle cx="619" cy="200" r="9" fill="#3b82f6" fill-opacity="0.5" stroke-opacity="0.3"/>
    <text x="636" y="204" text-anchor="middle" stroke="none" font-size="9">B</text>
    <circle cx="457" cy="200" r="9" fill="#f43f5e" fill-opacity="0.5" stroke-opacity="0.3"/>
    <text x="440" y="204" text-anchor="middle" stroke="none" font-size="9">C✗</text>
    <circle cx="596" cy="110" r="5" fill="#10b981" fill-opacity="0.7" stroke="none"/>
    <circle cx="490" cy="105" r="5" fill="#10b981" fill-opacity="0.7" stroke="none"/>
    <circle cx="478" cy="240" r="5" fill="#f59e0b" fill-opacity="0.8" stroke="none"/>
    <circle cx="512" cy="248" r="5" fill="#f59e0b" fill-opacity="0.8" stroke="none"/>
    <path d="M478 240 Q560 270 615 210" fill="none" stroke-opacity="0.5" stroke-dasharray="4 3"/>
    <text x="538" y="292" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">chỉ key của C (hổ phách) dời sang B — còn lại yên</text>
  </g>
</svg>

> ⚠️ Bẫy production: round-robin *nghe* công bằng nhưng thường không phải. Nếu một backend vừa restart (cache lạnh, JIT chưa warm) hoặc request có độ nặng rất lệch, round-robin vẫn dội đều lên nó và gây p99 xấu. **Least-connections** hoặc **least-response-time** phản ứng với thực tế tốt hơn cho tải không đồng nhất.

### Health check — chủ động vs bị động

Load balancer chỉ hữu ích nếu nó **ngừng gửi request tới backend chết**. Hai cơ chế bổ sung nhau:

- **Active (chủ động)**: LB tự gọi một endpoint định kỳ (ví dụ `GET /healthz` mỗi 5s). Sau *N lần fail liên tiếp* → đánh dấu unhealthy, ngừng gửi; sau *M lần pass* → đưa lại vào. Phát hiện chủ động, kể cả khi không có traffic, nhưng có độ trễ (tới N×interval) và tốn request nền.
- **Passive (bị động)**: LB quan sát *chính traffic thật* — nếu backend liên tục timeout/trả 5xx thì eject nó tạm thời (outlier detection trong Envoy). Phản ứng tức thì với lỗi thật, nhưng phải có lỗi thật xảy ra mới biết (một số request đã hỏng).

Thực tế dùng **cả hai**: active để bắt node chết khi rảnh, passive để eject nhanh node đang lỗi dưới tải. Và phân biệt **liveness vs readiness**: readiness check phải phản ánh *có sẵn sàng nhận traffic không* (đã kết nối DB, đã warm cache) — một pod vừa start nhưng chưa nối được DB phải trả *không sẵn sàng* để LB chưa gửi request, dù tiến trình vẫn sống.

> 💡 Ghi nhớ: health endpoint phải kiểm thứ *thực sự cần để phục vụ* (nối được DB, downstream sống) nhưng **đừng cascade**: nếu `/healthz` của bạn gọi sang 5 service khác và một cái chậm, cả cụm bạn bị đánh unhealthy dây chuyền → tự gây outage. Health check nên nông và nhanh.

### Session affinity (sticky session)

Nếu server lưu state phiên trong bộ nhớ (session cục bộ), request tiếp theo của cùng user *phải* về đúng backend đó — nếu không thì mất session. **Sticky session** làm điều này: L7 gắn cookie (`SERVERID=be-2`) hoặc hash IP nguồn để ghim user vào một backend.

Nhưng sticky là **mùi của thiết kế stateful**. Nó phá vỡ cân bằng đều (một backend đông user nặng sẽ quá tải), và khi backend đó chết thì mọi session trên nó bay hết. Giải pháp đúng theo tinh thần 12-factor (Bài 6): **stateless backend + state ngoài** (session ở Redis). Khi đó *mọi* backend phục vụ được *mọi* user, LB tự do dùng least-connections, restart pod không mất gì. Chỉ dùng sticky khi bất đắc dĩ (legacy, hoặc cache locality có chủ đích qua consistent hashing).

### Client-side LB vs server-side LB

Câu hỏi cuối: **ai quyết định chọn backend**?

- **Server-side LB (phổ biến nhất)**: client gọi *một địa chỉ* (VIP của LB); một thành phần LB ở giữa chọn backend. Client ngu, chỉ biết một endpoint. Đơn giản, tập trung policy, nhưng LB là một hop thêm và là điểm cần scale/HA riêng.
- **Client-side LB**: client *tự* lấy danh sách instance từ **service registry** (Consul, Eureka, etcd, hoặc DNS/xDS) rồi *tự chọn* backend và gọi thẳng — không hop LB ở giữa. Bớt một chặng mạng, tránh nghẽn ở LB, cực hợp cho gRPC. Đổi lại: logic LB nằm trong mỗi client (thường qua thư viện: gRPC built-in, trước đây là Netflix Ribbon), khó cập nhật policy đồng loạt hơn.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-labelledby="cs-t cs-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="cs-t">Server-side load balancing đi qua một LB trung gian, client-side load balancing tra registry rồi client tự gọi thẳng backend</title>
  <desc id="cs-d">Bên trái client gọi một VIP, LB ở giữa chọn backend rồi forward. Bên phải client hỏi service registry danh sách instance rồi tự chọn và gọi thẳng một backend không qua hop trung gian.</desc>
  <defs>
    <marker id="csa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <text x="182" y="26" text-anchor="middle" stroke="none" font-weight="700">Server-side</text>
    <rect x="40" y="120" width="90" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="85" y="144" text-anchor="middle" stroke="none">Client</text>
    <rect x="160" y="120" width="70" height="40" rx="8" fill="#10b981" fill-opacity="0.18" stroke-opacity="0.2"/>
    <text x="195" y="144" text-anchor="middle" stroke="none" font-size="10">LB</text>
    <rect x="270" y="52" width="66" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="303" y="74" text-anchor="middle" stroke="none" font-size="10">be-1</text>
    <rect x="270" y="122" width="66" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="303" y="144" text-anchor="middle" stroke="none" font-size="10">be-2</text>
    <rect x="270" y="192" width="66" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="303" y="214" text-anchor="middle" stroke="none" font-size="10">be-3</text>
    <line x1="130" y1="140" x2="158" y2="140" stroke-opacity="0.7" marker-end="url(#csa)"/>
    <line x1="230" y1="132" x2="268" y2="72" stroke-opacity="0.5" marker-end="url(#csa)"/>
    <line x1="230" y1="140" x2="268" y2="140" stroke-opacity="0.7" marker-end="url(#csa)"/>
    <line x1="230" y1="148" x2="268" y2="207" stroke-opacity="0.5" marker-end="url(#csa)"/>
    <text x="182" y="252" text-anchor="middle" stroke="none" font-size="10" opacity="0.65">1 hop LB · policy tập trung</text>
  </g>
  <line x1="368" y1="20" x2="368" y2="280" stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="5 5"/>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <text x="540" y="26" text-anchor="middle" stroke="none" font-weight="700">Client-side</text>
    <rect x="400" y="120" width="90" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="445" y="144" text-anchor="middle" stroke="none">Client</text>
    <rect x="430" y="46" width="130" height="34" rx="7" fill="#f59e0b" fill-opacity="0.16" stroke-opacity="0.2"/>
    <text x="495" y="68" text-anchor="middle" stroke="none" font-size="9.5">Service Registry</text>
    <rect x="620" y="52" width="66" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="653" y="74" text-anchor="middle" stroke="none" font-size="10">be-1</text>
    <rect x="620" y="122" width="66" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="653" y="144" text-anchor="middle" stroke="none" font-size="10">be-2</text>
    <rect x="620" y="192" width="66" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="653" y="214" text-anchor="middle" stroke="none" font-size="10">be-3</text>
    <line x1="460" y1="120" x2="480" y2="82" stroke-opacity="0.5" stroke-dasharray="4 3" marker-end="url(#csa)"/>
    <text x="418" y="100" stroke="none" font-size="8.5" opacity="0.6">tra list</text>
    <line x1="490" y1="132" x2="618" y2="72" stroke-opacity="0.5" marker-end="url(#csa)"/>
    <line x1="490" y1="140" x2="618" y2="140" stroke-opacity="0.7" marker-end="url(#csa)"/>
    <line x1="490" y1="148" x2="618" y2="207" stroke-opacity="0.5" marker-end="url(#csa)"/>
    <text x="560" y="252" text-anchor="middle" stroke="none" font-size="10" opacity="0.65">không hop trung gian · LB trong client</text>
  </g>
</svg>

**Vì sao gRPC cần client-side LB.** gRPC chạy trên HTTP/2 với **connection sống lâu, multiplex** nhiều request trên *một* TCP connection. Một L4 LB chọn backend *lúc bắt tay TCP* rồi ghim luôn — nghĩa là *toàn bộ* request của một client dồn về *một* backend suốt đời connection đó, mặc kệ bạn có 10 backend. Tải lệch nghiêm trọng. Ba lối thoát: (1) **client-side LB** — client biết cả 10 backend và rải từng request qua nhiều connection; (2) **L7 proxy hiểu HTTP/2** (Envoy) cân bằng ở tầng *request* chứ không phải connection; (3) ép connection re-balance định kỳ (`MAX_CONNECTION_AGE`). Đây chính là cảnh báo ở cuối Bài 1.

## Code thực chiến

### 1. NGINX — L7 upstream với health check bị động và least-connections

```nginx
upstream orders_backend {
    least_conn;                          # thuật toán: ít connection nhất
    # max_fails/fail_timeout = health check BỊ ĐỘNG: 3 lần fail trong 30s -> eject 30s
    server 10.0.1.10:8080 weight=3 max_fails=3 fail_timeout=30s;  # máy khoẻ, nhận nhiều hơn
    server 10.0.1.11:8080 weight=1 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:8080 backup;        # chỉ dùng khi các server chính chết

    keepalive 32;                        # reuse connection xuống backend
}

server {
    listen 443 ssl http2;
    ssl_certificate     /etc/ssl/api.crt;   # TLS termination tại đây
    ssl_certificate_key /etc/ssl/api.key;

    location /orders/ {
        proxy_pass http://orders_backend;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # retry sang backend khác khi gặp lỗi/timeout (bổ trợ cho max_fails ở trên)
        proxy_next_upstream error timeout http_502 http_503;
        proxy_connect_timeout 2s;
        proxy_read_timeout    10s;
    }
}
```

`max_fails`/`fail_timeout` (khai báo trên dòng `server`) cho passive health check; NGINX Plus mới có active `health_check`. `weight` hiện thực weighted round-robin; đổi `least_conn` thành mặc định là round-robin thuần.

### 2. Envoy — L7 với active health check + outlier detection (passive)

```yaml
clusters:
- name: orders
  connect_timeout: 1s
  type: STRICT_DNS
  lb_policy: LEAST_REQUEST          # ~ least-connections
  load_assignment:
    cluster_name: orders
    endpoints:
    - lb_endpoints:
      - endpoint: { address: { socket_address: { address: orders, port_value: 8080 }}}
  health_checks:                    # ACTIVE: tự gọi /healthz mỗi 5s
  - timeout: 1s
    interval: 5s
    unhealthy_threshold: 3          # 3 fail liên tiếp -> unhealthy
    healthy_threshold: 2            # 2 pass -> đưa lại vào
    http_health_check: { path: "/healthz" }
  outlier_detection:                # PASSIVE: eject backend đang trả 5xx
    consecutive_5xx: 5
    interval: 10s
    base_ejection_time: 30s
    max_ejection_percent: 50        # không bao giờ eject quá nửa cụm
```

Kết hợp cả hai lớp: active bắt node chết khi rảnh, `outlier_detection` eject nhanh node lỗi dưới tải thật — và `max_ejection_percent` chặn kịch bản eject cả cụm gây tự-outage.

### 3. Kubernetes — Service (server-side LB) + readiness probe

```yaml
apiVersion: v1
kind: Service
metadata: { name: orders }
spec:
  selector: { app: orders }
  ports: [{ port: 80, targetPort: 8080 }]
  sessionAffinity: None            # None = rải đều; ClientIP = sticky theo IP
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: orders }
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: orders
        image: orders:1.4.0
        readinessProbe:            # CHƯA ready -> bị gỡ khỏi Endpoints, LB không gửi
          httpGet: { path: /healthz, port: 8080 }
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3
        livenessProbe:             # chết hẳn -> kubelet restart pod
          httpGet: { path: /livez, port: 8080 }
          periodSeconds: 10
```

`kube-proxy` là L4 server-side LB (round-robin qua iptables/IPVS). Chỉ pod **ready** mới nằm trong Endpoints — đây là cơ chế "chưa nối được DB thì đừng nhận traffic" đã nói ở trên. Muốn L7 routing theo path/host thì dùng **Ingress** hoặc **Gateway API** phía trước.

### 4. gRPC — client-side LB với round-robin trên tất cả backend

```go
conn, err := grpc.NewClient(
    "dns:///orders.svc.cluster.local:8080",       // resolver trả NHIỀU IP
    grpc.WithDefaultServiceConfig(
        `{"loadBalancingConfig":[{"round_robin":{}}]}`), // rải qua MỌI backend
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
// Không có dòng round_robin: gRPC chỉ pick 1 IP đầu -> tải dồn 1 backend.
```

Điểm mấu chốt: DNS resolver phải trả *nhiều* A record (headless Service trong k8s: `clusterIP: None`), và `round_robin` bảo gRPC mở subchannel tới *từng* backend rồi rải request — đúng cách chữa vấn đề HTTP/2 dồn tải. Với môi trường mesh, dùng xDS resolver (`xds:///...`) để nhận endpoint + policy động từ control plane.

## Tóm tắt

- **API Gateway** = single entry point ở **north-south**, gánh cross-cutting concern (authn/authz, rate limit, TLS termination, routing, aggregation, protocol translation). Giữ nó **mỏng** — policy, không business logic.
- **BFF**: tách gateway theo loại client khi nhu cầu phân kỳ (mobile gọn, web giàu). Đừng lạm dụng.
- **Service Mesh** lo **east-west** (sidecar, mTLS, retry, canary) — bổ sung chứ không thay gateway.
- **L4** nhanh, mù nội dung, route theo IP:port, TLS passthrough. **L7** parse HTTP, route theo path/header, terminate TLS. Thường xếp chồng NLB→ALB.
- Thuật toán: round-robin (đồng đều), weighted (canary/máy lệch), **least-connections** (tải không đều), **consistent hashing** (sticky/cache locality, chỉ remap 1/N khi đổi node).
- **Health check**: active (chủ động, bắt node chết khi rảnh) + passive (eject nhanh node lỗi). Phân biệt liveness vs readiness; health check phải nông, đừng cascade.
- **Sticky session** là mùi stateful — ưu tiên stateless + session ở Redis.
- **Server-side LB** (một VIP, LB ở giữa) vs **client-side LB** (tra registry, gọi thẳng). gRPC/HTTP2 connection dài buộc dùng client-side LB hoặc L7 proxy để khỏi dồn tải một backend.

> Bài tiếp theo: đi sâu vào Service Discovery & Service Mesh — cách các service tìm nhau và giao tiếp an toàn ở tầng east-west.
