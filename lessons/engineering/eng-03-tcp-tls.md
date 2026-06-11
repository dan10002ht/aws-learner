# TCP/UDP & TLS — HTTPS thật sự hoạt động thế nào

Khi bạn gõ `https://example.com` và trang web hiện ra, có ít nhất 3 tầng giao thức đã làm việc: **TCP (hoặc QUIC)** để vận chuyển dữ liệu tin cậy, **TLS** để mã hoá, và **HTTP** để định dạng request/response. Hiểu rõ từng tầng là kỹ năng nền để debug lỗi kết nối, chọn đúng load balancer trên AWS, và trả lời cả loạt câu hỏi trong đề SAA/DVA.

## 1. TCP vs UDP — hai triết lý vận chuyển

### TCP: tin cậy, có thứ tự, có kết nối

TCP đảm bảo 3 thứ mà tầng IP bên dưới không có:

1. **Kết nối (connection-oriented)** — phải bắt tay 3 bước (3-way handshake) trước khi gửi dữ liệu.
2. **Thứ tự (ordering)** — mỗi byte có sequence number; bên nhận sắp xếp lại đúng thứ tự.
3. **Truyền lại (retransmission)** — gói nào không được ACK trong thời gian chờ sẽ được gửi lại.

3-way handshake:

```text
Client                    Server
  | ------ SYN  (seq=x) ----> |
  | <--- SYN-ACK (seq=y,      |
  |        ack=x+1) --------- |
  | ------ ACK (ack=y+1) ---> |
  |                           |
  |   (bắt đầu gửi dữ liệu)   |
```

Tính tay chi phí: nếu RTT (round-trip time) Hà Nội → Singapore là **~35ms**, riêng handshake TCP tốn **1 RTT = 35ms** trước khi gửi được byte dữ liệu đầu tiên. Cộng thêm TLS (phần sau) là thấy vì sao "kết nối mới" luôn đắt.

### UDP: nhanh, gọn, không hứa hẹn gì

UDP chỉ là IP + port + checksum. Không handshake, không thứ tự, không truyền lại. Gói mất là mất.

### Bảng tra nhanh

| Tiêu chí | TCP | UDP |
|---|---|---|
| Handshake | Có (1 RTT) | Không (0 RTT) |
| Thứ tự gói | Đảm bảo | Không |
| Mất gói | Tự truyền lại | App tự lo |
| Header | 20+ bytes | 8 bytes |
| Tốc độ thiết lập | Chậm hơn | Tức thì |
| Dùng cho | HTTP/1.1, HTTP/2, SSH, database | DNS, video call, game, **QUIC/HTTP3** |

### Khi nào UDP thắng?

- **DNS**: 1 câu hỏi, 1 câu trả lời, gói nhỏ — handshake TCP là lãng phí. Mất gói thì hỏi lại còn nhanh hơn.
- **Video/voice realtime**: frame đến trễ là vô dụng — thà bỏ qua còn hơn chờ truyền lại (đây là lý do Zoom/WebRTC dùng UDP).
- **QUIC (nền của HTTP/3)**: xây độ tin cậy *trên* UDP, để tự kiểm soát congestion control và tránh head-of-line blocking của TCP.

> 💡 **Ghi nhớ**: TCP = "bưu phẩm bảo đảm, ký nhận từng kiện". UDP = "ném bưu thiếp qua hàng rào". Realtime thì bưu thiếp trễ không ai đọc nữa — nên UDP hợp lý.

## 2. Port & Socket

- **Port**: số 16-bit (0–65535) định danh ứng dụng trên một máy. Well-known: 22 (SSH), 53 (DNS), 80 (HTTP), 443 (HTTPS), 3306 (MySQL), 5432 (PostgreSQL), 6379 (Redis).
- **Socket**: một đầu kết nối, định danh bằng bộ 5 thành phần: `(protocol, src IP, src port, dst IP, dst port)`.

Thử ngay trên máy:

```bash
# Xem các kết nối TCP đang mở (macOS/Linux)
ss -tn state established    # Linux
netstat -an | grep ESTABLISHED   # macOS

# Process nào đang nghe port 443?
sudo lsof -i :443
```

Ví dụ tính tay: một server web chỉ nghe **một** port 443, nhưng phục vụ được hàng trăm nghìn client cùng lúc — vì mỗi kết nối phân biệt bằng `(client IP, client port)` khác nhau, không phải bằng port server.

## 3. TCP states — chỉ cần hiểu ý tưởng

Kết nối TCP đi qua các trạng thái: `LISTEN → SYN_SENT/SYN_RECEIVED → ESTABLISHED → FIN_WAIT → TIME_WAIT → CLOSED`.

Đáng nhớ nhất là **TIME_WAIT**: bên *chủ động đóng* kết nối phải giữ socket thêm ~30–120 giây (2×MSL) để chắc chắn gói trễ của kết nối cũ không lẫn vào kết nối mới dùng lại cùng bộ 5 thành phần.

```bash
# Đếm socket theo trạng thái — server bận thường có hàng nghìn TIME_WAIT
ss -tan | awk '{print $1}' | sort | uniq -c | sort -rn
```

> ⚠️ **Lỗi thường gặp**: App backend mở kết nối mới đến database/API cho *mỗi* request rồi đóng ngay → tích luỹ hàng chục nghìn TIME_WAIT, cạn ephemeral port, lỗi `Cannot assign requested address`. Giải pháp: **connection pooling / keep-alive**, không phải tăng giới hạn hệ điều hành.

## 4. HTTP/1.1 vs HTTP/2 vs HTTP/3

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Năm | 1997 | 2015 | 2022 (RFC 9114) |
| Tầng vận chuyển | TCP | TCP | **QUIC trên UDP** |
| Nhiều request song song | 1 request/connection (pipelining gần như chết) → browser mở ~6 connection | **Multiplexing**: nhiều stream trên 1 connection | Multiplexing, mỗi stream độc lập |
| Head-of-line blocking | Ở tầng HTTP | Hết ở HTTP, **còn ở TCP** (1 gói TCP mất chặn mọi stream) | **Hết hẳn** — mất gói chỉ chặn stream đó |
| Header | Text thuần | Nén HPACK, binary | Nén QPACK, binary |
| TLS | Tuỳ chọn | Thực tế bắt buộc | Tích hợp sẵn trong QUIC (luôn TLS 1.3) |
| Thiết lập kết nối mới | TCP + TLS ≈ 2 RTT | TCP + TLS ≈ 2 RTT | **1 RTT** (QUIC gộp transport + TLS), 0-RTT khi quay lại |

Tính tay với RTT 35ms, kết nối mới lần đầu:

- HTTP/2: TCP (1 RTT) + TLS 1.3 (1 RTT) = **70ms** trước byte đầu tiên.
- HTTP/3: QUIC handshake gộp luôn TLS = **35ms**. Quay lại lần sau với 0-RTT: **~0ms** chờ.

Đến 2025, khoảng **~30–35% website** đã bật HTTP/3 (Cloudflare, Google, các CDN lớn bật mặc định), HTTP/2 vẫn là mặt bằng chung.

Kiểm tra server hỗ trợ phiên bản nào:

```bash
curl -sI --http2 https://www.cloudflare.com -o /dev/null -w '%{http_version}\n'
# 2

curl -sI --http3 https://www.cloudflare.com -o /dev/null -w '%{http_version}\n'
# 3   (cần curl build kèm HTTP/3, ví dụ: brew install curl)
```

## 5. TLS 1.3 — vì sao nhanh hơn 1.2

### Handshake TLS 1.3 (1-RTT)

```text
Client                                Server
  | -- ClientHello                       |
  |    + key_share (đoán sẵn khoá DH)    |
  |    + SNI, ALPN ------------------->  |
  |                                      |
  | <-- ServerHello + key_share          |
  |     {EncryptedExtensions,            |
  |      Certificate, CertVerify,        |
  |      Finished}  -------------------- |
  | -- Finished + HTTP request --------> |   ← chỉ 1 RTT!
```

Khác biệt then chốt so với TLS 1.2:

1. **1-RTT thay vì 2-RTT**: client *gửi sẵn* tham số trao đổi khoá (key_share) ngay trong ClientHello, không chờ thoả thuận xong mới gửi.
2. **0-RTT resumption**: client từng kết nối có thể gửi dữ liệu ngay từ gói đầu (đổi lại rủi ro replay — chỉ dùng cho request idempotent như GET).
3. **Cắt bỏ thuật toán yếu**: không còn RSA key exchange, RC4, SHA-1, CBC mode — chỉ còn AEAD (AES-GCM, ChaCha20-Poly1305) và bắt buộc forward secrecy (ECDHE).
4. **Mã hoá sớm hơn**: certificate được gửi đã mã hoá, bên nghe lén không thấy server cert.

Đến 2025, TLS 1.3 chiếm **~75% lưu lượng HTTPS**; TLS 1.0/1.1 đã bị deprecate (RFC 8996) và các trình duyệt chặn hẳn.

### Thực hành với openssl

```bash
# Bắt tay TLS và xem chi tiết
openssl s_client -connect example.com:443 -servername example.com </dev/null

# Trong output, chú ý:
#   Protocol  : TLSv1.3
#   Cipher    : TLS_AES_256_GCM_SHA384
#   Verify return code: 0 (ok)

# Ép thử TLS 1.2 để so sánh
openssl s_client -connect example.com:443 -tls1_2 </dev/null 2>/dev/null | grep Protocol
```

## 6. Certificate chain & CA

Trình duyệt tin server vì **chuỗi chữ ký số**:

```text
Root CA  (cài sẵn trong OS/browser, tự ký)
   └── ký cho → Intermediate CA
                    └── ký cho → Leaf cert (example.com)
```

Server gửi **leaf + intermediate** (không gửi root). Client xác minh: chữ ký leaf hợp lệ theo intermediate → chữ ký intermediate hợp lệ theo root → root nằm trong trust store → tin.

Xem chuỗi thực tế:

```bash
openssl s_client -connect aws.amazon.com:443 -servername aws.amazon.com -showcerts </dev/null 2>/dev/null | grep -E '^ [si]:'
# s: subject (cert của ai), i: issuer (ai ký)

# Xem hạn và SAN của leaf cert
echo | openssl s_client -connect aws.amazon.com:443 -servername aws.amazon.com 2>/dev/null \
  | openssl x509 -noout -dates -ext subjectAltName
```

> 💡 **Ghi nhớ**: Hostname được kiểm tra theo **SAN (Subject Alternative Name)**, không phải Common Name — CN đã bị bỏ qua từ lâu. Cert public hiện tại tối đa **398 ngày**, và ngành đã thống nhất lộ trình rút xuống **~47 ngày vào 2029** → tự động hoá gia hạn (ACM, Let's Encrypt/certbot) là bắt buộc, không phải lựa chọn.

### SNI — Server Name Indication

Một IP phục vụ nhiều domain (shared hosting, CDN, load balancer). Server cần biết client muốn cert của domain nào **trước khi** gửi cert → client khai tên domain dạng plaintext trong ClientHello. Đó là SNI.

- `openssl s_client` cần flag `-servername`, nếu thiếu server có thể trả về cert mặc định sai.
- TLS 1.3 có mở rộng **ECH (Encrypted Client Hello)** để mã hoá cả SNI — Cloudflare/Firefox/Chrome đã triển khai, nhưng chưa phổ cập toàn bộ internet.

### mTLS — mutual TLS

TLS thường: chỉ client xác minh server. **mTLS**: server *cũng* yêu cầu client trình certificate — xác thực hai chiều. Dùng cho service-to-service (service mesh như Istio/App Mesh), API B2B, thiết bị IoT.

```bash
# Gọi API yêu cầu mTLS
curl -v --cert client.pem --key client-key.pem https://api.partner.com/orders
```

### Certificate pinning

App (thường là mobile) "ghim" sẵn public key/cert của server; cert hợp lệ nhưng *khác* cert đã ghim vẫn bị từ chối. Chống được CA bị xâm nhập, nhưng **rất dễ tự bắn vào chân**: rotate cert mà quên cập nhật app → toàn bộ user cũ không kết nối được. Khuyến nghị hiện đại: pin **public key của CA/intermediate** kèm backup pin, hoặc dùng Certificate Transparency monitoring thay vì pin cứng.

## 7. Các lỗi TLS thường gặp — đọc vị nhanh

| Thông báo | Nguyên nhân | Cách kiểm tra |
|---|---|---|
| `certificate has expired` | Cert hết hạn (quên gia hạn) | `openssl x509 -noout -dates` |
| `hostname mismatch` / `SSL: no alternative certificate subject name matches` | Truy cập domain không có trong SAN (vd có `example.com` nhưng thiếu `www.`) | Xem `-ext subjectAltName` |
| `self-signed certificate` | Cert tự ký, không CA nào ký | `s_client` thấy issuer = subject |
| `unable to get local issuer certificate` | Server **quên gửi intermediate** — lỗi cấu hình server cực phổ biến | `s_client -showcerts` chỉ thấy 1 cert |
| `handshake failure` | Lệch phiên bản TLS/cipher (server cũ chỉ có TLS 1.0/1.1) | Thử `-tls1_2`, `-tls1_3` |

> ⚠️ **Lỗi thường gặp**: Khi gặp lỗi cert, đừng vội thêm `curl -k` / `verify=False` rồi để luôn trong code production. Đó là tắt hoàn toàn xác minh — kẻ tấn công man-in-the-middle sẽ cảm ơn bạn. Hãy sửa tận gốc: gia hạn cert, bổ sung SAN, hoặc gửi đủ chain.

## 8. Bộ công cụ thực hành — quy trình debug HTTPS

```bash
# Bước 1: DNS có trỏ đúng không?
dig +short api.myapp.com

# Bước 2: TCP có thông không? (port 443)
nc -zv -w 3 api.myapp.com 443

# Bước 3: TLS có bắt tay được không? Cert có hợp lệ?
echo | openssl s_client -connect api.myapp.com:443 -servername api.myapp.com 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates

# Bước 4: HTTP tầng trên trả gì? Xem toàn bộ quá trình
curl -v https://api.myapp.com/health
```

Đọc output `curl -v` theo ký hiệu:

```text
*  Trying 93.184.216.34:443...        ← DNS + TCP connect
* ALPN: server accepted h2            ← thoả thuận HTTP/2 qua ALPN
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
* Server certificate:
*  subject: CN=api.myapp.com
*  expire date: Mar 01 12:00:00 2027 GMT
*  SSL certificate verify ok.         ← chain hợp lệ
> GET /health HTTP/2                  ← > là request gửi đi
< HTTP/2 200                          ← < là response nhận về
```

Đo thời gian từng pha — thấy ngay chi phí handshake bằng số thật:

```bash
curl -so /dev/null https://example.com -w \
'DNS:        %{time_namelookup}s
TCP connect: %{time_connect}s
TLS done:    %{time_appconnect}s
First byte:  %{time_starttransfer}s
Total:       %{time_total}s\n'
```

## 9. Liên hệ sang AWS

Đây là phần kiến thức trên ánh xạ thẳng vào dịch vụ AWS và đề thi SAA-C03/DVA-C02:

### ACM (AWS Certificate Manager)
- Cấp cert public **miễn phí**, **tự động gia hạn** — giải quyết triệt để lỗi "cert expired" (và càng quan trọng khi vòng đời cert đang rút ngắn về ~47 ngày).
- Cert ACM public **không export private key được** — chỉ gắn vào dịch vụ tích hợp: ALB/NLB, CloudFront, API Gateway. Muốn cài lên EC2 tự quản thì dùng ACM Private CA (exportable) hoặc Let's Encrypt.
- **Bẫy đề thi**: cert cho CloudFront **bắt buộc nằm ở us-east-1**; cert cho ALB phải cùng region với ALB.

### ALB — TLS termination (Layer 7)
- ALB **kết thúc TLS** tại load balancer: giải mã, đọc HTTP header/path để routing, rồi (tuỳ cấu hình) mã hoá lại về target. ALB nói HTTP/2 (và hỗ trợ HTTP/3 phía client qua CloudFront).
- Vì terminate TLS nên ALB thấy được nội dung HTTP → host-based/path-based routing, WAF hoạt động được. Hỗ trợ nhiều cert qua **SNI**.
- ALB cũng hỗ trợ **mTLS** (passthrough hoặc verify với trust store) — điểm mới hay vào đề.

### NLB — TCP passthrough (Layer 4)
- NLB hoạt động ở tầng TCP/UDP: có thể **passthrough** TLS nguyên vẹn đến backend (backend tự terminate, giữ end-to-end encryption), hoặc terminate TLS tại NLB với cert ACM.
- **Bẫy đề thi**: cần client IP thật + hiệu năng cực cao + giao thức không phải HTTP (game UDP, MQTT, database) → chọn **NLB**. Cần routing theo path/header → **ALB**. UDP listener → chỉ NLB.

### CloudFront + TLS
- Edge của CloudFront hỗ trợ **TLS 1.3 và HTTP/3 (QUIC)** — bật HTTP/3 chỉ là một checkbox, giảm độ trễ kết nối cho user xa (đúng bài toán 1-RTT/0-RTT ở phần 4–5).
- Hai chặng TLS riêng biệt: **viewer → CloudFront** (cert ACM us-east-1, custom domain) và **CloudFront → origin** (origin protocol policy; origin cần cert hợp lệ, đúng hostname — lỗi hostname mismatch ở origin là nguồn 502 kinh điển).
- Security policy (vd `TLSv1.2_2021`) quy định phiên bản TLS tối thiểu phía viewer — câu hỏi compliance hay gặp.

### API Gateway mTLS
- REST API/HTTP API hỗ trợ **mTLS trên custom domain**: bạn upload **truststore** (PEM chứa CA cert) lên S3, API Gateway xác minh client cert theo truststore đó. Khi bật mTLS phải **tắt default execute-api endpoint** để không bị đi vòng.
- Tình huống đề DVA: "đối tác B2B phải xác thực bằng client certificate" → API Gateway mTLS, không phải API key (API key chỉ để đo lường/throttle, không phải cơ chế xác thực).

### Tóm tắt ánh xạ nhanh

| Kỹ năng trong bài | Tình huống AWS/đề thi |
|---|---|
| TCP vs UDP | Chọn NLB cho UDP/TCP thuần, ALB cho HTTP |
| Handshake & RTT | Bật HTTP/3 trên CloudFront để giảm latency toàn cầu |
| TLS termination vs passthrough | ALB terminate (đọc được HTTP) vs NLB passthrough (end-to-end encryption) |
| Cert hết hạn / gia hạn | ACM auto-renew; cert CloudFront ở us-east-1 |
| SNI | ALB/CloudFront host nhiều domain trên 1 endpoint |
| mTLS | API Gateway mutual TLS với truststore trên S3; ALB mTLS |
| Debug bằng curl/openssl | Truy lỗi 502 origin, security group chặn 443, cert sai SAN |

> 💡 **Ghi nhớ chốt bài**: Khi HTTPS lỗi, đi từ dưới lên — **DNS (dig) → TCP (nc) → TLS (openssl s_client) → HTTP (curl -v)**. Tầng nào fail thì dừng ở tầng đó mà sửa; 90% thời gian debug bị lãng phí vì đoán mò ở sai tầng.
