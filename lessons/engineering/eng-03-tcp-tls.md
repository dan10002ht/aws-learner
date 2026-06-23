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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Head-of-line blocking: HTTP/2 trên TCP so với HTTP/3 trên QUIC</title>
  <desc>Bên trái HTTP/2: nhiều stream chung một dòng byte TCP, một gói mất chặn toàn bộ stream. Bên phải HTTP/3 QUIC: mỗi stream độc lập, gói mất chỉ chặn đúng stream của nó, các stream khác vẫn chạy.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Head-of-line blocking — mất 1 gói thì ai bị chặn?</text>
  <g>
    <text x="180" y="48" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">HTTP/2 trên TCP</text>
    <text x="180" y="66" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">3 stream gộp vào 1 dòng byte TCP có thứ tự</text>
    <rect x="30" y="80" width="300" height="80" rx="9" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="44" y="96" font-size="9.5" fill="currentColor" opacity="0.75">1 connection TCP</text>
    <g>
      <rect x="44" y="104" width="40" height="20" rx="4" fill="#3b82f6" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.25"/>
      <text x="64" y="118" font-size="9" text-anchor="middle" fill="currentColor">S1</text>
      <rect x="90" y="104" width="40" height="20" rx="4" fill="#ef4444" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.4"/>
      <text x="110" y="118" font-size="9" text-anchor="middle" fill="currentColor">mất</text>
      <rect x="136" y="104" width="40" height="20" rx="4" fill="#3b82f6" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.25"/>
      <text x="156" y="118" font-size="9" text-anchor="middle" fill="currentColor">S2</text>
      <rect x="182" y="104" width="40" height="20" rx="4" fill="#3b82f6" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.25"/>
      <text x="202" y="118" font-size="9" text-anchor="middle" fill="currentColor">S3</text>
      <rect x="228" y="104" width="40" height="20" rx="4" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="3 2"/>
      <text x="248" y="118" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.6">chờ</text>
      <rect x="274" y="104" width="40" height="20" rx="4" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="3 2"/>
      <text x="294" y="118" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.6">chờ</text>
    </g>
    <text x="180" y="148" font-size="9.5" text-anchor="middle" fill="#ef4444">1 gói TCP mất → S2, S3 cũng bị chặn (chờ truyền lại)</text>
    <rect x="30" y="172" width="300" height="22" rx="8" fill="#ef4444" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="180" y="187" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Cả connection đứng lại</text>
  </g>
  <g>
    <text x="540" y="48" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">HTTP/3 trên QUIC</text>
    <text x="540" y="66" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">mỗi stream có thứ tự riêng, độc lập</text>
    <rect x="390" y="80" width="300" height="80" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="404" y="96" font-size="9.5" fill="currentColor" opacity="0.75">1 connection QUIC (UDP)</text>
    <g>
      <rect x="404" y="104" width="84" height="20" rx="4" fill="#ef4444" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.35"/>
      <text x="446" y="118" font-size="9" text-anchor="middle" fill="currentColor">S1 — gói mất, chờ</text>
      <rect x="496" y="104" width="84" height="20" rx="4" fill="#10b981" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.25"/>
      <text x="538" y="118" font-size="9" text-anchor="middle" fill="currentColor">S2 — chạy tiếp</text>
      <rect x="588" y="104" width="88" height="20" rx="4" fill="#10b981" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.25"/>
      <text x="632" y="118" font-size="9" text-anchor="middle" fill="currentColor">S3 — chạy tiếp</text>
    </g>
    <text x="540" y="148" font-size="9.5" text-anchor="middle" fill="#10b981">Gói mất chỉ chặn S1; S2, S3 không liên quan</text>
    <rect x="390" y="172" width="300" height="22" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="540" y="187" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Chỉ đúng stream đó bị chặn</text>
  </g>
  <text x="360" y="232" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">TCP coi cả connection là một dòng byte → mọi stream phụ thuộc nhau.</text>
  <text x="360" y="250" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">QUIC quản thứ tự ở từng stream → cô lập mất gói, đây là khác biệt cốt lõi của HTTP/3.</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh thiết lập kết nối TCP+TLS1.3 (HTTP/2) với QUIC (HTTP/3)</title>
  <desc>Sơ đồ trình tự client–server: bên trái TCP 3-way handshake cộng TLS 1.3 tốn 2 RTT (70ms) trước byte đầu; bên phải QUIC gộp transport và TLS chỉ 1 RTT (35ms), quay lại 0-RTT gần 0ms với RTT 35ms.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Chi phí bắt tay (RTT = 35ms)</text>
  <g>
    <text x="180" y="46" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">TCP + TLS 1.3 (HTTP/2)</text>
    <text x="80" y="66" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">Client</text>
    <text x="280" y="66" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">Server</text>
    <line x1="80" y1="74" x2="80" y2="392" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
    <line x1="280" y1="74" x2="280" y2="392" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
    <g stroke="currentColor" stroke-width="1.4" fill="none">
      <path d="M80 92 L274 110" marker-end="url(#a1)"/>
      <path d="M280 130 L86 148" marker-end="url(#a1)"/>
      <path d="M80 168 L274 186" marker-end="url(#a1)"/>
      <path d="M280 206 L86 224" marker-end="url(#a1)"/>
      <path d="M80 244 L274 262" marker-end="url(#a1)"/>
    </g>
    <text x="180" y="100" font-size="9.5" text-anchor="middle" fill="currentColor">SYN</text>
    <text x="180" y="140" font-size="9.5" text-anchor="middle" fill="currentColor">SYN-ACK</text>
    <text x="180" y="176" font-size="9.5" text-anchor="middle" fill="currentColor">ACK + ClientHello</text>
    <text x="180" y="216" font-size="9.5" text-anchor="middle" fill="currentColor">ServerHello + Cert</text>
    <text x="180" y="254" font-size="9.5" text-anchor="middle" fill="currentColor">Finished + GET</text>
    <rect x="40" y="116" width="40" height="16" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="60" y="128" font-size="9" text-anchor="middle" fill="currentColor">RTT 1</text>
    <rect x="40" y="232" width="40" height="16" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="60" y="244" font-size="9" text-anchor="middle" fill="currentColor">RTT 2</text>
    <rect x="60" y="280" width="240" height="26" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="180" y="297" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">≈ 2 RTT = 70ms</text>
  </g>
  <g>
    <text x="540" y="46" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">QUIC (HTTP/3)</text>
    <text x="440" y="66" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">Client</text>
    <text x="640" y="66" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">Server</text>
    <line x1="440" y1="74" x2="440" y2="392" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
    <line x1="640" y1="74" x2="640" y2="392" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
    <g stroke="currentColor" stroke-width="1.4" fill="none">
      <path d="M440 92 L634 110" marker-end="url(#a1)"/>
      <path d="M640 130 L446 148" marker-end="url(#a1)"/>
    </g>
    <text x="540" y="100" font-size="9.5" text-anchor="middle" fill="currentColor">Initial: ClientHello + key_share</text>
    <text x="540" y="140" font-size="9.5" text-anchor="middle" fill="currentColor">ServerHello + Cert + Finished</text>
    <rect x="400" y="116" width="40" height="16" rx="8" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="420" y="128" font-size="9" text-anchor="middle" fill="currentColor">RTT 1</text>
    <rect x="420" y="160" width="240" height="26" rx="8" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="540" y="177" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">≈ 1 RTT = 35ms (lần đầu)</text>
    <g stroke="currentColor" stroke-width="1.4" fill="none">
      <path d="M440 232 L634 250" marker-end="url(#a1)"/>
    </g>
    <text x="540" y="240" font-size="9.5" text-anchor="middle" fill="currentColor">0-RTT: GET gửi ngay (phiên cũ)</text>
    <rect x="420" y="280" width="240" height="26" rx="8" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="540" y="297" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">≈ 0 RTT ≈ 0ms (quay lại)</text>
  </g>
  <text x="360" y="420" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Thời gian đi xuống — QUIC gộp transport + TLS nên rút mất 1 RTT chờ.</text>
  <defs>
    <marker id="a1" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker>
  </defs>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Certificate chain of trust: Root CA ký Intermediate CA ký Leaf cert</title>
  <desc>Chuỗi tin cậy chứng chỉ: Root CA tự ký nằm trong trust store của OS/trình duyệt, ký cho Intermediate CA, Intermediate ký cho Leaf cert của example.com. Server gửi leaf và intermediate, client xác minh ngược lên tới root trong trust store.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Chain of trust — ai ký cho ai</text>
  <g>
    <rect x="250" y="40" width="220" height="58" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="62" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Root CA</text>
    <text x="360" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">tự ký · nằm trong trust store</text>
    <text x="360" y="93" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">(cài sẵn OS / trình duyệt)</text>
  </g>
  <g stroke="currentColor" stroke-width="1.4" fill="none">
    <path d="M360 98 L360 130" marker-end="url(#c1)"/>
  </g>
  <text x="372" y="120" font-size="10" fill="currentColor" opacity="0.85">ký cho ↓</text>
  <g>
    <rect x="250" y="132" width="220" height="54" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="154" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Intermediate CA</text>
    <text x="360" y="172" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">do Root ký · server gửi kèm</text>
  </g>
  <g stroke="currentColor" stroke-width="1.4" fill="none">
    <path d="M360 186 L360 218" marker-end="url(#c1)"/>
  </g>
  <text x="372" y="208" font-size="10" fill="currentColor" opacity="0.85">ký cho ↓</text>
  <g>
    <rect x="250" y="220" width="220" height="54" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="242" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Leaf cert — example.com</text>
    <text x="360" y="260" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">do Intermediate ký · server gửi</text>
  </g>
  <g>
    <rect x="500" y="132" width="200" height="142" rx="10" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22" stroke-dasharray="4 3"/>
    <text x="600" y="152" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Server gửi xuống client</text>
    <rect x="516" y="164" width="168" height="22" rx="6" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="600" y="179" font-size="10" text-anchor="middle" fill="currentColor">Leaf cert</text>
    <rect x="516" y="192" width="168" height="22" rx="6" fill="#3b82f6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="600" y="207" font-size="10" text-anchor="middle" fill="currentColor">Intermediate cert</text>
    <text x="600" y="234" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">KHÔNG gửi Root</text>
    <text x="600" y="248" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">(client đã có sẵn)</text>
  </g>
  <g stroke="currentColor" stroke-width="1.4" fill="none">
    <path d="M250 247 L150 247 L150 70 L250 70" marker-end="url(#c1)"/>
  </g>
  <g>
    <rect x="20" y="284" width="680" height="44" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="36" y="303" font-size="10.5" font-weight="700" fill="currentColor">Client xác minh ngược lên:</text>
    <text x="36" y="319" font-size="10.5" fill="currentColor" opacity="0.85">chữ ký Leaf hợp lệ theo Intermediate → Intermediate hợp lệ theo Root → Root nằm trong trust store ⇒ tin.</text>
  </g>
  <defs>
    <marker id="c1" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker>
  </defs>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>ALB terminate TLS (L7) so với NLB passthrough TLS (L4)</title>
  <desc>Trên: ALB tầng 7 giải mã TLS để đọc HTTP và routing rồi mã hoá lại tới target — TLS đứt làm hai chặng. Dưới: NLB tầng 4 passthrough TLS nguyên vẹn, backend tự giải mã — mã hoá end-to-end client tới target.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Điểm mã hoá / giải mã: ALB vs NLB</text>
  <g>
    <text x="16" y="48" font-size="12" font-weight="700" fill="currentColor">ALB (L7) — terminate TLS</text>
    <rect x="20" y="58" width="120" height="50" rx="9" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="80" y="80" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Client</text>
    <text x="80" y="96" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">gửi HTTPS</text>
    <rect x="300" y="52" width="150" height="62" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="375" y="73" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">ALB</text>
    <text x="375" y="89" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.78">giải mã → đọc HTTP</text>
    <text x="375" y="102" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.78">routing path/host → mã hoá lại</text>
    <rect x="600" y="58" width="100" height="50" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="650" y="80" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Target</text>
    <text x="650" y="96" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">backend</text>
    <g stroke="currentColor" stroke-width="1.6" fill="none">
      <path d="M140 83 L296 83" marker-end="url(#l1)"/>
      <path d="M450 83 L596 83" marker-end="url(#l1)"/>
    </g>
    <text x="218" y="76" font-size="9" text-anchor="middle" fill="currentColor">TLS chặng 1</text>
    <text x="218" y="129" font-size="9" text-anchor="middle" fill="#f59e0b">cert ACM ở ALB</text>
    <text x="523" y="76" font-size="9" text-anchor="middle" fill="currentColor">TLS chặng 2 (re-encrypt)</text>
    <text x="375" y="132" font-size="9" text-anchor="middle" fill="#ef4444">⬤ TLS đứt tại ALB → ALB thấy nội dung HTTP</text>
  </g>
  <line x1="20" y1="158" x2="700" y2="158" stroke="currentColor" stroke-opacity="0.18"/>
  <g>
    <text x="16" y="186" font-size="12" font-weight="700" fill="currentColor">NLB (L4) — passthrough TLS</text>
    <rect x="20" y="198" width="120" height="50" rx="9" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="80" y="220" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Client</text>
    <text x="80" y="236" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">gửi HTTPS</text>
    <rect x="300" y="198" width="150" height="50" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="375" y="219" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">NLB</text>
    <text x="375" y="235" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.78">chuyển byte L4, KHÔNG giải mã</text>
    <rect x="600" y="198" width="100" height="50" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="650" y="216" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Target</text>
    <text x="650" y="232" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">tự terminate TLS</text>
    <g stroke="#10b981" stroke-width="2.2" fill="none">
      <path d="M140 223 L296 223" marker-end="url(#l2)"/>
      <path d="M450 223 L596 223" marker-end="url(#l2)"/>
    </g>
    <text x="375" y="268" font-size="9.5" text-anchor="middle" fill="#10b981">⬤ TLS nguyên vẹn end-to-end: client → target, NLB không đọc được nội dung</text>
  </g>
  <text x="360" y="300" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">Terminate = đọc được HTTP (routing/WAF) nhưng đứt mã hoá; passthrough = end-to-end nhưng LB mù nội dung.</text>
  <defs>
    <marker id="l1" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker>
    <marker id="l2" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#10b981"/></marker>
  </defs>
</svg>

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
