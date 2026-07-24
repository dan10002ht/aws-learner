# Reverse proxy (nginx/Envoy) & rate limiting

Trước mỗi backend production nghiêm túc gần như luôn có một lớp **reverse proxy**: client không nói chuyện trực tiếp với server ứng dụng, mà nói chuyện với một cái proxy đứng trước nó. Lớp này gánh những thứ *không phải* logic nghiệp vụ — TLS, cache, nén, routing, bảo vệ — để service phía sau chỉ lo một việc. Bài này đi sâu vào bản chất reverse proxy (đối lập forward proxy), hai công cụ thống trị là **nginx** và **Envoy**, và phần khó nhất: **rate limiting** — thuật toán, đặt ở đâu, làm distributed thế nào, và trả lỗi ra sao cho đúng.

## Mục tiêu

- Phân biệt rạch ròi **reverse proxy** vs **forward proxy** — không phải "hai loại proxy", mà là proxy *cho ai*.
- Nắm 6 vai trò cốt lõi của reverse proxy: TLS termination, caching, compression, routing/upstream, buffering, security.
- Viết được config **nginx** (`upstream`, `location`, `proxy_pass`) và hiểu mô hình **Envoy** (dynamic config, xDS, dùng trong mesh) — biết khi nào chọn cái nào.
- Hiểu sâu 4 thuật toán rate limit: **token bucket**, **leaky bucket**, **fixed window**, **sliding window** — chọn đúng cho từng nhu cầu (burst vs làm mượt).
- Làm rate limit **distributed** bằng Redis (liên hệ [[dst-06-redis-patterns]]), trả **429 + Retry-After** đúng chuẩn, và phân biệt **rate limit vs throttle vs quota**.

## 1. Reverse proxy vs forward proxy — proxy *cho ai*?

Cả hai đều là "trung gian chuyển tiếp request", nhưng đứng ở hai đầu đối lập của kết nối và phục vụ hai bên khác nhau.

- **Forward proxy** đứng **trước client**, đại diện cho *client*. Server không biết client thật là ai — nó chỉ thấy proxy. Ví dụ: proxy công ty để lọc web/ghi log nhân viên, VPN egress, corporate firewall, hoặc `HTTP_PROXY` khi máy CI gọi ra internet. Client *biết* mình đang đi qua proxy và cấu hình để dùng nó.
- **Reverse proxy** đứng **trước server**, đại diện cho *server*. Client tưởng nó đang nói chuyện thẳng với backend nhưng thực ra nói với proxy; **client không biết** (và không cần biết) có bao nhiêu server thật phía sau, chúng ở đâu, chạy ngôn ngữ gì. nginx/Envoy/HAProxy/API Gateway/CDN đều là reverse proxy.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-labelledby="fwd-rev-t fwd-rev-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="fwd-rev-t">Forward proxy đứng trước client, reverse proxy đứng trước server</title>
  <desc id="fwd-rev-d">Nửa trên: nhiều client nội bộ đi qua một forward proxy để ra internet tới các server công cộng, proxy đại diện cho client. Nửa dưới: nhiều client internet đi qua một reverse proxy để vào cụm server nội bộ, proxy đại diện cho server và giấu backend.</desc>
  <defs>
    <marker id="rpa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <text x="16" y="20" font-size="12" font-weight="700" stroke="none">FORWARD PROXY — đại diện cho CLIENT (giấu client)</text>
    <rect x="16" y="32" width="120" height="60" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="76" y="58" text-anchor="middle" stroke="none" font-size="10.5">Client nội bộ</text>
    <text x="76" y="74" text-anchor="middle" stroke="none" font-size="10" opacity="0.65">(cấu hình proxy)</text>
    <rect x="290" y="38" width="140" height="48" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="360" y="60" text-anchor="middle" stroke="none">Forward proxy</text>
    <text x="360" y="76" text-anchor="middle" stroke="none" font-size="10" opacity="0.65">egress / filter</text>
    <rect x="584" y="38" width="120" height="48" rx="8" fill="currentColor" fill-opacity="0.06" stroke-opacity="0.18"/>
    <text x="644" y="66" text-anchor="middle" stroke="none">Server công cộng</text>
    <line x1="136" y1="62" x2="288" y2="62" stroke-opacity="0.6" marker-end="url(#rpa)"/>
    <line x1="430" y1="62" x2="582" y2="62" stroke-opacity="0.6" marker-end="url(#rpa)"/>
  </g>
  <line x1="16" y1="118" x2="704" y2="118" stroke="currentColor" stroke-opacity="0.15" stroke-dasharray="5 5"/>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <text x="16" y="146" font-size="12" font-weight="700" stroke="none">REVERSE PROXY — đại diện cho SERVER (giấu backend)</text>
    <rect x="16" y="158" width="120" height="48" rx="8" fill="currentColor" fill-opacity="0.06" stroke-opacity="0.18"/>
    <text x="76" y="186" text-anchor="middle" stroke="none">Client internet</text>
    <rect x="290" y="158" width="140" height="48" rx="8" fill="#10b981" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="360" y="180" text-anchor="middle" stroke="none">Reverse proxy</text>
    <text x="360" y="196" text-anchor="middle" stroke="none" font-size="10" opacity="0.65">nginx / Envoy</text>
    <rect x="560" y="140" width="144" height="30" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="632" y="159" text-anchor="middle" stroke="none" font-size="10.5">app server 1</text>
    <rect x="560" y="176" width="144" height="30" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="632" y="195" text-anchor="middle" stroke="none" font-size="10.5">app server 2</text>
    <rect x="560" y="212" width="144" height="30" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke-opacity="0.2"/>
    <text x="632" y="231" text-anchor="middle" stroke="none" font-size="10.5">app server 3</text>
    <line x1="136" y1="182" x2="288" y2="182" stroke-opacity="0.6" marker-end="url(#rpa)"/>
    <line x1="430" y1="182" x2="558" y2="155" stroke-opacity="0.6" marker-end="url(#rpa)"/>
    <line x1="430" y1="182" x2="558" y2="191" stroke-opacity="0.6" marker-end="url(#rpa)"/>
    <line x1="430" y1="182" x2="558" y2="227" stroke-opacity="0.6" marker-end="url(#rpa)"/>
  </g>
  <text x="360" y="264" text-anchor="middle" font-size="10.5" fill="currentColor" opacity="0.7">Cùng một phần mềm (nginx) làm được cả hai — khác nhau ở CHIỀU nó phục vụ</text>
</svg>

> 💡 Ghi nhớ: mấu chốt không phải kỹ thuật mà là **hướng tin cậy**. Forward proxy bảo vệ/quản lý *client đi ra*; reverse proxy bảo vệ/điều phối *server nhận vào*. Cùng một nginx cấu hình khác đi là ra hai vai trò khác nhau.

## 2. Sáu vai trò của reverse proxy

Reverse proxy tồn tại vì có một loạt "công việc ngang" (cross-cutting) mà mọi service đều cần nhưng không service nào nên tự làm lại. Gom về một chỗ.

| Vai trò | Nó làm gì | Vì sao đặt ở proxy, không ở app |
|---|---|---|
| **TLS termination** | Giải mã HTTPS ở proxy, nói HTTP (hoặc mTLS) với backend | Cert tập trung một chỗ, app không phải quản TLS; CPU mã hoá gom về lớp scale được |
| **Caching** | Lưu response tĩnh/bán tĩnh, trả thẳng không đụng backend | Giảm tải origin cực mạnh; app không cần biết về HTTP cache |
| **Compression** | Nén body bằng gzip/brotli trước khi trả client | Tiết kiệm băng thông; nén một lần ở proxy thay vì mỗi app tự nén |
| **Routing / upstream** | Chọn backend theo path/host/header; load balance; health check | Một entrypoint cho nhiều service; đổi backend không đổi client |
| **Buffering** | Đọc trọn request/response chậm rồi mới chuyển cho backend | Bảo vệ app khỏi slow client (slowloris); worker app không bị treo chờ byte |
| **Security** | Rate limit, WAF, IP allow/deny, chặn method lạ, ẩn header lộ nội bộ | Lớp chắn đầu tiên; chặn rác *trước* khi tốn tài nguyên app |

Vài điểm bản chất dễ bị hiểu sai:

- **TLS termination vs passthrough**: termination = proxy giải mã, thấy được nội dung (cần để cache/route theo path). Passthrough (TLS/TCP mode) = proxy chỉ chuyển byte mã hoá, không đọc được — dùng khi backend phải tự giữ TLS end-to-end. Đa số web dùng termination, rồi **re-encrypt** (TLS lại) tới backend nếu cần bảo mật trong mạng nội bộ (zero-trust).
- **Buffering là con dao hai lưỡi**: buffer request bảo vệ backend khỏi slow client, nhưng làm hỏng **streaming/upload lớn/SSE** (client không nhận được byte đầu tiên tới khi proxy đọc xong). Với những luồng đó phải **tắt buffering** (`proxy_buffering off;`).
- **Nén tốn CPU**: brotli nén tốt hơn gzip ~15-20% nhưng chậm hơn ở mức nén cao. Thực tế: **brotli level ~4-6 cho dynamic content**, level cao chỉ cho asset tĩnh precompress sẵn (`.br` cạnh file gốc). Đừng nén thứ đã nén (jpg/png/mp4/zip) — vô ích, chỉ tốn CPU.

## 3. nginx — config theo mẫu, phổ biến nhất

nginx thống trị vì **cấu hình tĩnh, dễ đọc, chạy như đá**. Mô hình: file config khai báo `server` block (virtual host), bên trong là các `location` (khớp path), trỏ tới `upstream` (nhóm backend). Đây là một config reverse proxy production tương đối đầy đủ:

```nginx
# /etc/nginx/nginx.conf — reverse proxy production

# Nhóm backend: nginx tự load balance round-robin (mặc định)
upstream app_backend {
    least_conn;                       # gửi request tới backend đang ít connection nhất
    server 10.0.1.11:8080 max_fails=3 fail_timeout=15s;
    server 10.0.1.12:8080 max_fails=3 fail_timeout=15s;
    server 10.0.1.13:8080 backup;     # chỉ dùng khi 2 cái trên chết
    keepalive 32;                     # giữ pool connection tới backend, tránh bắt tay TCP mỗi request
}

# Zone rate limit — khai báo ở http{}, dùng ở location (xem mục 6)
limit_req_zone $binary_remote_addr zone=perip:10m rate=10r/s;

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # --- TLS termination ---
    ssl_certificate     /etc/ssl/api.example.com.crt;
    ssl_certificate_key /etc/ssl/api.example.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:SSL:10m;   # tái dùng session, đỡ full handshake

    # --- Compression ---
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1024;                 # đừng nén payload bé, không đáng

    # --- Routing: API đi tới backend ---
    location /api/ {
        limit_req zone=perip burst=20 nodelay;   # rate limit tại edge

        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";           # bật keepalive tới upstream
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;   # app biết client dùng https

        proxy_connect_timeout 2s;
        proxy_read_timeout    30s;
        proxy_next_upstream error timeout http_502 http_503;  # tự thử backend khác
    }

    # --- Static: nginx phục vụ thẳng, có cache ---
    location /static/ {
        root /var/www;
        expires 7d;                           # header Cache-Control cho CDN/browser
        add_header Cache-Control "public, immutable";
    }

    # --- SSE / streaming: PHẢI tắt buffering ---
    location /events {
        proxy_pass http://app_backend;
        proxy_buffering off;                  # đẩy từng byte tới client ngay
        proxy_read_timeout 3600s;             # kết nối dài, đừng cắt sớm
    }
}
```

Vì sao từng dòng có mặt (những thứ hay bị thiếu trong thực tế):

- **`X-Forwarded-For` / `X-Forwarded-Proto`**: sau khi termination, app chỉ thấy IP của proxy và giao thức HTTP. Không set các header này → app log sai IP client, sinh URL `http://` trong redirect, và **rate limit theo IP đếm nhầm** (tất cả gộp vào IP proxy). Đây là lỗi kinh điển.
- **`keepalive` + `proxy_http_version 1.1` + `Connection ""`**: mặc định nginx mở connection mới tới upstream mỗi request → tốn 1 vòng bắt tay TCP. Bật keepalive giảm p99 latency đáng kể ở RPS cao.
- **`proxy_next_upstream`**: cho phép nginx tự thử backend khác khi gặp lỗi — nhưng **cẩn thận với POST không idempotent**, retry có thể double-write. Chỉ retry an toàn với GET/idempotent.
- **`max_fails` / `fail_timeout`**: health check thụ động — sau 3 lần lỗi trong 15s, nginx tạm loại backend đó. Bản open source không có active health check (phải OSS module hoặc nginx Plus).

> ⚠️ Bẫy production: `location` matching có thứ tự ưu tiên phức tạp (exact `=` > prefix `^~` > regex `~` > prefix thường). Cấu hình `location /` bắt hết rồi mới thêm `location /api/` phía dưới vẫn hoạt động vì prefix dài thắng, nhưng thêm một regex `~ \.php$` có thể "cướp" request bạn không ngờ. Luôn kiểm tra bằng `nginx -T` (dump toàn bộ config đã resolve) và test thật.

## 4. Envoy — dynamic config, xDS, sinh ra cho mesh

nginx tuyệt vời khi topology *tĩnh*. Nhưng trong Kubernetes/microservice, backend **sinh và chết liên tục** (pod scale, rolling deploy, IP đổi mỗi lần). Reload nginx config mỗi lần pod đổi là không khả thi ở quy mô lớn. **Envoy** giải đúng bài này: nó được thiết kế để **nhận config động qua API** thay vì đọc file tĩnh.

Cốt lõi là **xDS** (*x* Discovery Service) — một họ API gRPC/REST mà Envoy *chủ động kết nối tới* một control plane để hỏi cấu hình, và control plane **push cập nhật realtime**:

| xDS API | Trả về cái gì | Tương đương nginx |
|---|---|---|
| **LDS** (Listener) | Cổng nào đang nghe, filter chain nào | `listen`, `server` block |
| **RDS** (Route) | Route path/header → cluster nào | `location` |
| **CDS** (Cluster) | Có những nhóm upstream nào | `upstream` block |
| **EDS** (Endpoint) | IP:port thật của từng endpoint trong cluster | `server` trong upstream |

Điểm mấu chốt: khi một pod mới lên, control plane (Istio, Consul, hay control plane tự viết) chỉ cần push **EDS update** — Envoy thêm endpoint vào **không reload, không rớt connection**. Đây là thứ nginx OSS không làm được sạch sẽ.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" aria-labelledby="xds-t xds-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="xds-t">Control plane push config động cho các Envoy sidecar qua xDS</title>
  <desc id="xds-d">Một control plane theo dõi trạng thái cluster (pod lên xuống) và push cập nhật LDS, RDS, CDS, EDS xuống các Envoy proxy chạy làm sidecar cạnh mỗi ứng dụng. Khi pod mới xuất hiện, control plane push EDS mới và Envoy cập nhật endpoint mà không cần reload.</desc>
  <defs>
    <marker id="xa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <rect x="250" y="16" width="220" height="60" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="360" y="40" text-anchor="middle" stroke="none" font-weight="700">Control plane</text>
    <text x="360" y="58" text-anchor="middle" stroke="none" font-size="10" opacity="0.7">Istio / Consul / tự viết</text>
    <text x="360" y="70" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.55">theo dõi service registry + K8s API</text>
  </g>
  <g font-size="9.5" fill="currentColor" stroke="currentColor">
    <text x="360" y="98" text-anchor="middle" stroke="none" opacity="0.8" font-weight="700">push LDS · RDS · CDS · EDS (gRPC stream)</text>
    <line x1="200" y1="104" x2="140" y2="150" stroke-opacity="0.55" marker-end="url(#xa)"/>
    <line x1="360" y1="104" x2="360" y2="150" stroke-opacity="0.55" marker-end="url(#xa)"/>
    <line x1="520" y1="104" x2="580" y2="150" stroke-opacity="0.55" marker-end="url(#xa)"/>
  </g>
  <g font-size="10.5" fill="currentColor" stroke="currentColor">
    <rect x="60" y="152" width="160" height="70" rx="9" fill="currentColor" fill-opacity="0.05" stroke-opacity="0.18"/>
    <rect x="72" y="162" width="60" height="50" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="102" y="190" text-anchor="middle" stroke="none" font-size="9.5">App A</text>
    <rect x="140" y="162" width="70" height="50" rx="6" fill="#14b8a6" fill-opacity="0.16" stroke-opacity="0.2"/>
    <text x="175" y="184" text-anchor="middle" stroke="none" font-size="9.5">Envoy</text>
    <text x="175" y="197" text-anchor="middle" stroke="none" font-size="8.5" opacity="0.6">sidecar</text>
    <rect x="280" y="152" width="160" height="70" rx="9" fill="currentColor" fill-opacity="0.05" stroke-opacity="0.18"/>
    <rect x="292" y="162" width="60" height="50" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="322" y="190" text-anchor="middle" stroke="none" font-size="9.5">App B</text>
    <rect x="360" y="162" width="70" height="50" rx="6" fill="#14b8a6" fill-opacity="0.16" stroke-opacity="0.2"/>
    <text x="395" y="184" text-anchor="middle" stroke="none" font-size="9.5">Envoy</text>
    <text x="395" y="197" text-anchor="middle" stroke="none" font-size="8.5" opacity="0.6">sidecar</text>
    <rect x="500" y="152" width="160" height="70" rx="9" fill="currentColor" fill-opacity="0.05" stroke-opacity="0.18"/>
    <rect x="512" y="162" width="60" height="50" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke-opacity="0.2"/>
    <text x="542" y="190" text-anchor="middle" stroke="none" font-size="9.5">App C</text>
    <rect x="580" y="162" width="70" height="50" rx="6" fill="#14b8a6" fill-opacity="0.16" stroke-opacity="0.2"/>
    <text x="615" y="184" text-anchor="middle" stroke="none" font-size="9.5">Envoy</text>
    <text x="615" y="197" text-anchor="middle" stroke="none" font-size="8.5" opacity="0.6">sidecar</text>
  </g>
  <g font-size="9.5" fill="currentColor" stroke="currentColor">
    <line x1="210" y1="187" x2="358" y2="187" stroke-opacity="0.5" stroke-dasharray="4 3" marker-end="url(#xa)" marker-start="url(#xa)"/>
    <line x1="430" y1="187" x2="578" y2="187" stroke-opacity="0.5" stroke-dasharray="4 3" marker-end="url(#xa)" marker-start="url(#xa)"/>
    <text x="360" y="242" text-anchor="middle" stroke="none" opacity="0.65">traffic app-to-app đi qua Envoy sidecar (mTLS, retry, observability tự động)</text>
  </g>
  <g font-size="10" fill="currentColor" stroke="currentColor">
    <rect x="230" y="268" width="260" height="52" rx="9" fill="#10b981" fill-opacity="0.13" stroke-opacity="0.2"/>
    <text x="360" y="288" text-anchor="middle" stroke="none" font-weight="700" font-size="10.5">Pod D mới lên → control plane push EDS</text>
    <text x="360" y="305" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.7">Envoy thêm endpoint, KHÔNG reload, KHÔNG rớt kết nối</text>
    <path d="M360 268 L360 232" fill="none" stroke-opacity="0.5" stroke-dasharray="4 3" marker-end="url(#xa)"/>
  </g>
</svg>

Đoạn config Envoy tĩnh (bootstrap) — để thấy cấu trúc listener → route → cluster, dù production thường lấy phần route/endpoint qua xDS:

```yaml
# envoy.yaml — bootstrap tối giản (listener + route + cluster)
static_resources:
  listeners:
  - address: { socket_address: { address: 0.0.0.0, port_value: 8443 } }
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress
          route_config:
            virtual_hosts:
            - name: api
              domains: ["*"]
              routes:
              - match: { prefix: "/api/" }
                route:
                  cluster: app_backend
                  retry_policy:                    # retry declarative, không cần script
                    retry_on: "5xx,reset"
                    num_retries: 2
          http_filters:
          - name: envoy.filters.http.local_ratelimit    # rate limit ngay trong Envoy
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
              stat_prefix: http_local_rl
              token_bucket:
                max_tokens: 100          # dung lượng bucket (cho burst)
                tokens_per_fill: 100
                fill_interval: 1s        # refill 100 token mỗi giây → ~100 rps
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
  clusters:
  - name: app_backend
    type: STRICT_DNS                     # hoặc EDS để lấy endpoint động
    lb_policy: LEAST_REQUEST
    load_assignment:
      cluster_name: app_backend
      endpoints:
      - lb_endpoints:
        - endpoint: { address: { socket_address: { address: app, port_value: 8080 } } }
```

Chú ý Envoy dùng **token bucket ngay trong filter** (`local_ratelimit`) — thuật toán được đặt tên thẳng trong config, khác nginx phải hiểu ngầm `limit_req` là leaky bucket. Đây cũng là lý do Envoy hợp cho mesh: **retry, circuit breaking, rate limit, mTLS, tracing** đều là filter khai báo được, control plane quản tập trung.

| | nginx | Envoy |
|---|---|---|
| Config | File tĩnh, reload | Động qua xDS (API), hot update không reload |
| Điểm mạnh | Đơn giản, nhẹ, phục vụ static/cache/TLS cực tốt | Service mesh, observability sâu, gRPC/HTTP2 first-class |
| Load balancing | RR / least_conn / ip_hash | RR / least_request / ring hash / maglev, outlier detection |
| Observability | Log + stub_status (nghèo) | Metrics/tracing/stats chi tiết theo từng upstream |
| Rate limit thuật toán | leaky bucket (`limit_req`) | token bucket (local) + global RLS service |
| Khi nào chọn | Edge/web server, reverse proxy topology tĩnh | Sidecar trong mesh, backend động, cần retry/CB declarative |

> 💡 Ghi nhớ: không phải "Envoy tốt hơn nginx". nginx thắng ở **edge tĩnh** (web server, TLS, cache, phục vụ file). Envoy thắng khi backend **động và cần policy declarative** (mesh). Nhiều hệ dùng cả hai: nginx/CDN ở ngoài cùng, Envoy sidecar bên trong.

## 5. Rate limiting — bốn thuật toán, chọn theo *mục đích*

Rate limiting bảo vệ hệ khỏi bị quá tải (do lạm dụng, bug client, hay tấn công). Nhưng "giới hạn 100 req/phút" có thể được *đo* theo bốn cách rất khác nhau — và khác biệt nằm ở **xử lý burst** thế nào.

### Fixed window

Đếm request trong từng khung thời gian cố định (ví dụ mỗi phút reset counter). Đơn giản nhất: `INCR key; nếu > limit thì chặn`.

- **Vấn đề burst biên window**: limit 100/phút. Client bắn 100 req lúc 00:00:59 và 100 req lúc 00:01:00 → **200 req trong 1 giây**, vẫn "hợp lệ" vì rơi vào hai window khác nhau. Đây là lỗ hổng kinh điển.

### Sliding window

Sửa lỗi biên bằng cách tính trên cửa sổ *trượt*. Hai biến thể:

- **Sliding log**: lưu timestamp từng request, đếm số request trong "60 giây gần nhất tính từ bây giờ". Chính xác tuyệt đối nhưng tốn bộ nhớ (lưu mọi timestamp).
- **Sliding window counter**: xấp xỉ — trọng số counter của window trước + window hiện tại theo phần trăm đã trôi qua. Gần như chính xác mà rẻ. Đây là lựa chọn phổ biến cho API public cần *công bằng*.

### Token bucket — cho phép **burst có kiểm soát**

Hình dung một cái xô chứa token, dung lượng tối đa `capacity`. Token được **đổ thêm đều đặn** (`refill rate`). Mỗi request tiêu 1 token; hết token thì bị chặn.

- Xô đầy sẵn → client *im lặng lâu* có thể **bung một burst** tới `capacity` request tức thời, rồi sau đó bị ghì về `refill rate`. Đây chính là cái ta muốn cho API thật: cho phép spike ngắn (mở app tải nhiều thứ cùng lúc) nhưng chặn lạm dụng kéo dài.
- Ví dụ: `capacity=100, refill=10/s`. Client nghỉ 10s → xô đầy 100. Bùng 100 req ngay lập tức được chấp nhận, sau đó chỉ còn 10 req/s.

### Leaky bucket — **làm mượt** output

Cũng là cái xô, nhưng góc nhìn ngược: request đổ *vào* xô (hàng đợi), và **rỉ ra đáy với tốc độ cố định**. Xô đầy tràn thì request mới bị bỏ.

- Output rate luôn **phẳng đều** bất kể input bùng thế nào — hàng đợi hấp thụ burst rồi nhả ra từ từ. Dùng khi **downstream không chịu được spike** (database, third-party API chậm). nginx `limit_req` chính là leaky bucket: `burst=20` là kích thước hàng đợi, request vượt bị delay (mượt) hoặc drop (`nodelay`).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-labelledby="bkt-t bkt-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title id="bkt-t">Token bucket cho phép burst, leaky bucket làm mượt output</title>
  <desc id="bkt-d">Bên trái token bucket: token nhỏ giọt vào xô, request lấy token ra, khi xô đầy token cho phép một burst request đi qua ngay. Bên phải leaky bucket: request dồn vào xô rồi rỉ ra đáy với tốc độ cố định, output luôn phẳng đều dù input bùng nổ.</desc>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <text x="16" y="22" font-size="12" font-weight="700" stroke="none">TOKEN BUCKET — cho phép burst</text>
    <text x="30" y="52" stroke="none" font-size="10" opacity="0.7">token nhỏ giọt đều →</text>
    <path d="M120 58 q10 8 0 16" fill="none" stroke-opacity="0.5"/>
    <rect x="70" y="70" width="120" height="90" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke-opacity="0.25"/>
    <circle cx="95" cy="140" r="5" fill="#3b82f6" fill-opacity="0.5" stroke="none"/>
    <circle cx="115" cy="145" r="5" fill="#3b82f6" fill-opacity="0.5" stroke="none"/>
    <circle cx="135" cy="138" r="5" fill="#3b82f6" fill-opacity="0.5" stroke="none"/>
    <circle cx="155" cy="146" r="5" fill="#3b82f6" fill-opacity="0.5" stroke="none"/>
    <circle cx="105" cy="120" r="5" fill="#3b82f6" fill-opacity="0.5" stroke="none"/>
    <circle cx="145" cy="122" r="5" fill="#3b82f6" fill-opacity="0.5" stroke="none"/>
    <text x="130" y="180" text-anchor="middle" stroke="none" font-size="9.5" opacity="0.65">xô token (capacity)</text>
    <path d="M190 130 L230 130" stroke-opacity="0.6" marker-end="url(#rpa)"/>
    <rect x="234" y="88" width="86" height="24" rx="4" fill="#10b981" fill-opacity="0.18" stroke-opacity="0.2"/>
    <rect x="234" y="116" width="86" height="24" rx="4" fill="#10b981" fill-opacity="0.18" stroke-opacity="0.2"/>
    <rect x="234" y="144" width="86" height="24" rx="4" fill="#10b981" fill-opacity="0.18" stroke-opacity="0.2"/>
    <text x="277" y="104" text-anchor="middle" stroke="none" font-size="9">req ✓ (burst)</text>
    <text x="277" y="132" text-anchor="middle" stroke="none" font-size="9">req ✓</text>
    <text x="277" y="160" text-anchor="middle" stroke="none" font-size="9">req ✓</text>
    <text x="277" y="190" text-anchor="middle" stroke="none" font-size="9" opacity="0.65">nhiều req đi ngay nếu còn token</text>
  </g>
  <line x1="360" y1="24" x2="360" y2="276" stroke="currentColor" stroke-opacity="0.15" stroke-dasharray="5 5"/>
  <g font-size="11" fill="currentColor" stroke="currentColor">
    <text x="392" y="22" font-size="12" font-weight="700" stroke="none">LEAKY BUCKET — làm mượt</text>
    <rect x="420" y="46" width="24" height="20" rx="3" fill="#f59e0b" fill-opacity="0.3" stroke="none"/>
    <rect x="450" y="46" width="24" height="20" rx="3" fill="#f59e0b" fill-opacity="0.3" stroke="none"/>
    <rect x="480" y="46" width="24" height="20" rx="3" fill="#f59e0b" fill-opacity="0.3" stroke="none"/>
    <rect x="510" y="46" width="24" height="20" rx="3" fill="#f59e0b" fill-opacity="0.3" stroke="none"/>
    <text x="560" y="61" stroke="none" font-size="9.5" opacity="0.7">burst dồn vào ↓</text>
    <path d="M470 66 L470 82" stroke-opacity="0.6" marker-end="url(#rpa)"/>
    <path d="M430 90 L430 200 L560 200 L560 90 Z" fill="#f59e0b" fill-opacity="0.13" stroke-opacity="0.25"/>
    <rect x="440" y="120" width="110" height="16" rx="3" fill="#f59e0b" fill-opacity="0.3" stroke="none"/>
    <rect x="440" y="142" width="110" height="16" rx="3" fill="#f59e0b" fill-opacity="0.3" stroke="none"/>
    <rect x="440" y="164" width="110" height="16" rx="3" fill="#f59e0b" fill-opacity="0.3" stroke="none"/>
    <text x="495" y="112" text-anchor="middle" stroke="none" font-size="9" opacity="0.65">hàng đợi (đầy → tràn, drop)</text>
    <path d="M495 200 L495 224" stroke-opacity="0.6" marker-end="url(#rpa)"/>
    <text x="512" y="216" stroke="none" font-size="9.5" opacity="0.7">rỉ đều</text>
    <rect x="450" y="228" width="90" height="22" rx="4" fill="#10b981" fill-opacity="0.18" stroke-opacity="0.2"/>
    <text x="495" y="243" text-anchor="middle" stroke="none" font-size="9.5">output PHẲNG</text>
    <text x="495" y="268" text-anchor="middle" stroke="none" font-size="9" opacity="0.65">tốc độ cố định, bảo vệ downstream</text>
  </g>
</svg>

| Thuật toán | Xử lý burst | Bộ nhớ | Dùng khi |
|---|---|---|---|
| Fixed window | Cho burst 2x ở biên (lỗi) | Rất nhỏ (1 counter) | Quota thô theo ngày, đếm nội bộ |
| Sliding window | Chặn burst biên, công bằng | Vừa (log) hoặc nhỏ (counter xấp xỉ) | API public cần công bằng, chính xác |
| **Token bucket** | **Cho phép burst tới capacity** | Nhỏ (tokens + timestamp) | **Mặc định tốt cho đa số API** — thân thiện spike thật |
| **Leaky bucket** | **Triệt tiêu burst, output phẳng** | Nhỏ (queue depth) | Bảo vệ downstream chậm, cần rate ổn định |

> 💡 Ghi nhớ một câu: **token bucket hỏi "được phép bùng bao nhiêu?"**, **leaky bucket hỏi "cho ra đều bao nhiêu?"**. Chọn token bucket khi ưu tiên trải nghiệm client (spike ngắn OK), leaky bucket khi ưu tiên bảo vệ thứ phía sau.

## 6. Đặt rate limit ở đâu — và làm distributed với Redis

**Đặt ở đâu** là quyết định kiến trúc, không chỉ kỹ thuật. Ba tầng, thường phối hợp:

- **Edge / CDN** (Cloudflare, WAF): chặn tấn công thô (DDoS, IP xấu) *trước khi* vào hạ tầng bạn — rẻ nhất, sớm nhất.
- **Gateway / reverse proxy** (nginx, Envoy, API Gateway): giới hạn theo API key/user/endpoint. Đây là chỗ đặt limit "nghiệp vụ" chính vì nó nằm *trước* app đắt đỏ.
- **Application**: limit tinh vi theo logic (ví dụ "3 lần đổi mật khẩu sai/giờ") mà chỉ app mới đủ ngữ cảnh để biết.

Nguyên tắc: **limit càng sớm càng rẻ**, nhưng càng sớm càng ít ngữ cảnh. Chặn IP tấn công ở edge; đếm quota theo user ở gateway; luật nghiệp vụ ở app.

**Vấn đề distributed**: nếu bạn có 5 instance gateway, mỗi instance đếm in-memory riêng thì limit "100/phút" thực tế thành **500/phút** — sai gấp số instance. State phải **tập trung**, và Redis là lựa chọn kinh điển (xem [[dst-06-redis-patterns]]) vì atomic và nhanh. Token bucket phải cập nhật *nguyên tử* (đọc token, tính refill, trừ, ghi lại) — không thể làm bằng nhiều lệnh rời rạc vì **race condition** giữa các instance. Dùng **Lua script** (Redis chạy nguyên khối, atomic):

```lua
-- token_bucket.lua — atomic token bucket trong Redis
-- KEYS[1] = định danh (vd "rl:user:42")
-- ARGV[1] = capacity, ARGV[2] = refill_rate (token/giây)
-- ARGV[3] = now (epoch giây, số thực), ARGV[4] = số token cần tiêu (thường 1)
local capacity    = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now         = tonumber(ARGV[3])
local requested   = tonumber(ARGV[4])

local bucket = redis.call("HMGET", KEYS[1], "tokens", "ts")
local tokens = tonumber(bucket[1])
local last   = tonumber(bucket[2])
if tokens == nil then           -- lần đầu: xô đầy
  tokens = capacity
  last   = now
end

-- refill theo thời gian đã trôi, không vượt capacity
local delta = math.max(0, now - last)
tokens = math.min(capacity, tokens + delta * refill_rate)

local allowed = tokens >= requested
if allowed then
  tokens = tokens - requested
end

redis.call("HMSET", KEYS[1], "tokens", tokens, "ts", now)
redis.call("EXPIRE", KEYS[1], math.ceil(capacity / refill_rate) * 2)  -- dọn rác key idle

-- trả: cho phép hay không, còn bao nhiêu token, bao lâu nữa đủ 1 token (Retry-After)
local retry_after = 0
if not allowed then
  retry_after = math.ceil((requested - tokens) / refill_rate)
end
return { allowed and 1 or 0, math.floor(tokens), retry_after }
```

Gọi từ ứng dụng (Python, `redis-py`):

```python
import time, redis
r = redis.Redis()
bucket = r.register_script(open("token_bucket.lua").read())

def check(user_id, capacity=100, rate=10):
    allowed, remaining, retry_after = bucket(
        keys=[f"rl:user:{user_id}"],
        args=[capacity, rate, time.time(), 1],
    )
    return bool(allowed), remaining, retry_after

ok, remaining, retry = check("42")
if not ok:
    # trả 429 (xem mục 7), đính Retry-After = retry
    ...
```

Vì sao Lua chứ không phải `INCR + EXPIRE`:

- `INCR + EXPIRE` chỉ làm được **fixed window** (và dính lỗi biên ở mục 5). Token bucket cần đọc-tính-ghi liên hoàn → phải atomic.
- Lua chạy **một round-trip, một khối atomic** → không race giữa 5 instance, không cần distributed lock. Tốc độ cực cao (Redis single-threaded thực thi script không xen kẽ).
- `EXPIRE` để **key idle tự dọn** — không thì mỗi user/IP để lại một key vĩnh viễn, phình bộ nhớ.

> ⚠️ Bẫy production: Redis rate limiter là **single point of failure**. Redis chết thì làm gì — **fail-open** (cho qua hết, chấp nhận không limit trong lúc sự cố) hay **fail-closed** (chặn hết, an toàn nhưng sập tính năng)? Đa số chọn **fail-open cho limit "công bằng"** (thà không limit còn hơn sập) và **fail-closed cho limit "an ninh"** (brute-force login thì thà chặn). Phải quyết định *có chủ đích*, đừng để mặc định của thư viện quyết hộ.

## 7. Trả 429 đúng chuẩn — và ba khái niệm dễ lẫn

Khi chạm limit, response phải giúp client **tự sửa hành vi**, không chỉ nói "không":

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 8
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 8
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/rate-limited",
  "title": "Rate limit exceeded",
  "status": 429,
  "detail": "Bạn đã dùng hết 100 request/phút. Thử lại sau 8 giây.",
  "retry_after": 8
}
```

- **`Retry-After`** (giây, hoặc HTTP-date) là bắt buộc — client tử tế đợi đúng khoảng đó thay vì đập lại ngay. Với token bucket, giá trị này = thời gian để tích đủ token (đã tính trong Lua ở trên).
- **`RateLimit-*`** (draft IETF) cho client *chủ động* biết còn bao nhiêu quota để tự ghì trước khi bị chặn — tốt hơn là để nó đâm đầu vào 429.
- Client nên retry với **exponential backoff + jitter** *và* tôn trọng `Retry-After` — nếu server nói rõ thì nghe server, đừng backoff mù.

**Ba khái niệm hay bị dùng lẫn** — chúng khác nhau về *bản chất* và *thời gian tác dụng*:

| Khái niệm | Bản chất | Đơn vị thời gian | Khi vượt |
|---|---|---|---|
| **Rate limit** | Giới hạn *số request trên đơn vị thời gian* | Giây/phút (ngắn) | Từ chối (429) request thừa |
| **Throttle** | *Làm chậm/xếp hàng* thay vì từ chối | Liên tục, làm mượt tức thời | Delay request (giảm tốc), không nhất thiết drop |
| **Quota** | Tổng lượng *tích luỹ* trong kỳ dài | Ngày/tháng (dài) | Chặn tới hết kỳ (thường 403/429 kèm reset xa) |

- **Rate limit** = "10 req/giây". Vượt → 429 ngay.
- **Throttle** = thay vì cắt phựt, hệ *ghì tốc độ* — request vẫn chạy nhưng chậm lại (giống leaky bucket delay, hoặc bandwidth throttling). Trải nghiệm mềm hơn.
- **Quota** = "1 triệu request/tháng" (gói trả phí). Đây là *đếm dồn dài hạn*, reset theo chu kỳ billing — không liên quan burst tức thời. Một hệ thường có **cả ba**: quota tháng theo gói, rate limit giây để chống spike, throttle để làm mượt.

> ⚠️ Bẫy production: đừng gộp mọi thứ vào một con số. "100 request" mà không nói *trên bao lâu* và *theo ai (IP/user/key/endpoint)* là vô nghĩa. Và **key rate limit phải đúng chiều**: limit theo IP dễ bị NAT (cả văn phòng chung một IP bị chặn oan) hoặc bị vượt (attacker đổi IP); limit theo API key/user chính xác hơn nhưng cần đã xác thực. Thực tế phối hợp nhiều tầng: IP thô ở edge, user/key tinh ở gateway.

## Tóm tắt

- **Reverse proxy đứng trước server** (giấu backend, đại diện server); **forward proxy đứng trước client** (giấu client, đại diện client). Cùng phần mềm, khác chiều phục vụ.
- Reverse proxy gánh 6 việc ngang: **TLS termination, caching, compression (gzip/brotli), routing/upstream, buffering, security** — để app chỉ lo nghiệp vụ.
- **nginx**: config tĩnh, `server`/`location`/`upstream`, tuyệt cho edge/web/static; nhớ `X-Forwarded-*`, keepalive upstream, và tắt buffering cho SSE/streaming.
- **Envoy**: config động qua **xDS** (LDS/RDS/CDS/EDS), hot update không reload, sinh ra cho **service mesh** với retry/circuit-break/rate-limit declarative; token bucket khai báo thẳng trong filter.
- Rate limit — chọn theo mục đích: **token bucket cho burst có kiểm soát** (mặc định tốt), **leaky bucket làm mượt output** (bảo vệ downstream), sliding window cho công bằng, tránh fixed window vì lỗi biên 2x.
- Đặt limit **càng sớm càng rẻ** (edge → gateway → app); distributed thì state ở **Redis + Lua atomic** (không dùng nhiều lệnh rời), quyết định **fail-open vs fail-closed** có chủ đích.
- Chạm limit trả **429 + `Retry-After` + `RateLimit-*`** (problem+json). Phân biệt **rate limit** (req/thời-gian-ngắn, từ chối) vs **throttle** (làm chậm) vs **quota** (tổng dồn dài hạn).

> Bài tiếp theo: circuit breaker, retry & timeout ở phía client — nửa còn lại của resilience, khi *bạn* là bên gọi ra một service có thể chậm hoặc chết.
