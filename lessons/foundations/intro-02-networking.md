# Mạng cơ bản cho Cloud

Trước khi học bất kỳ chứng chỉ AWS nào, bạn cần hiểu mạng máy tính hoạt động ra sao — vì cloud về bản chất là "máy tính của người khác" được nối với nhau và với bạn qua mạng. Bài này xây dựng trực giác từ gốc: địa chỉ IP, DNS, HTTP/HTTPS, firewall, load balancer, latency và CDN. Cuối bài có phần map sang các service AWS tương ứng.

## 1. Địa chỉ IP — "số nhà" của máy tính

### Analogy: thành phố và số nhà

Hãy tưởng tượng Internet là một thành phố khổng lồ. Mỗi máy tính là một ngôi nhà, và để gửi thư (dữ liệu) đến đúng nhà, bạn cần **địa chỉ** — đó chính là **IP address**.

Một địa chỉ IPv4 gồm 4 số, mỗi số từ 0–255, ví dụ:

```
192.168.1.10
 │   │  │ │
 └───┴──┴─┴── 4 "octet", mỗi octet = 8 bit → tổng 32 bit
```

32 bit nghĩa là có khoảng 4,3 tỷ địa chỉ IPv4 — nghe nhiều nhưng đã cạn từ lâu, vì vậy mới sinh ra private IP, NAT (phần dưới) và IPv6 (128 bit, gần như vô hạn).

### Subnet — chia thành phố thành các "quận"

Không ai quản lý 4 tỷ địa chỉ phẳng lì như một danh sách. Người ta chia mạng thành các **subnet** (mạng con) — giống như thành phố chia thành quận, quận chia thành phường. Địa chỉ IP vì thế có 2 phần:

```
192.168.1 . 10
└────┬───┘  └┬┘
 phần mạng   phần host
("quận nào") ("nhà số mấy trong quận")
```

### CIDR — cách viết gọn của subnet

**CIDR** (Classless Inter-Domain Routing) là ký hiệu kiểu `192.168.1.0/24`. Con số sau dấu `/` cho biết **bao nhiêu bit đầu tiên là phần mạng**:

| CIDR | Bit mạng | Bit host | Số địa chỉ | Trực quan |
|---|---|---|---|---|
| `/32` | 32 | 0 | 1 | đúng 1 máy |
| `/24` | 24 | 8 | 256 | một "phường" nhỏ |
| `/16` | 16 | 16 | 65.536 | một "quận" lớn |
| `/8` | 8 | 24 | ~16,7 triệu | cả một "tỉnh" |

Quy tắc nhẩm nhanh: **số sau `/` càng nhỏ → mạng càng to**. Mỗi lần giảm 1 (ví dụ /24 → /23) thì số địa chỉ **nhân đôi**.

Ví dụ đọc `10.0.1.0/24`:
- Phần mạng: `10.0.1` (24 bit đầu).
- Các host hợp lệ: `10.0.1.0` → `10.0.1.255` (256 địa chỉ, thực tế trừ vài địa chỉ dành riêng).

> 💡 Ghi nhớ: CIDR `/n` nghĩa là n bit đầu cố định cho mạng, phần còn lại dành cho máy. `/16` to, `/24` vừa, `/32` là một máy duy nhất. Khi tạo VPC trên AWS bạn sẽ phải tự chọn CIDR — đây là kỹ năng bắt buộc.

## 2. Public IP vs Private IP, và NAT

### Hai loại địa chỉ

- **Public IP**: địa chỉ "ngoài mặt phố" — duy nhất trên toàn Internet, ai cũng có thể gửi gói tin tới. Phải thuê/được cấp, có giới hạn.
- **Private IP**: địa chỉ "trong khu chung cư" — chỉ có nghĩa trong mạng nội bộ, **không định tuyến được trên Internet**. Ba dải private chuẩn (RFC 1918):

| Dải | CIDR | Hay gặp ở |
|---|---|---|
| `10.0.0.0/8` | 10.x.x.x | doanh nghiệp, VPC cloud |
| `172.16.0.0/12` | 172.16–31.x.x | Docker, VPC mặc định AWS |
| `192.168.0.0/16` | 192.168.x.x | router WiFi gia đình |

Hàng triệu nhà cùng dùng `192.168.1.10` mà không đụng nhau — vì mỗi nhà là một "khu chung cư" riêng.

### NAT — lễ tân của khu chung cư

Vậy máy có private IP làm sao lướt web? Nhờ **NAT** (Network Address Translation).

Analogy: bạn ở phòng 1502 trong chung cư. Khi gửi thư ra ngoài, **lễ tân** (router NAT) thay địa chỉ người gửi bằng địa chỉ tòa nhà (public IP) và ghi sổ "thư này là của phòng 1502". Khi thư hồi âm về tòa nhà, lễ tân tra sổ và chuyển đúng phòng.

```
[Laptop 192.168.1.10] ──┐
[Phone  192.168.1.11] ──┤→ [Router NAT] → Internet
[TV     192.168.1.12] ──┘   public IP:
                            203.0.113.7  ← cả nhà "đội chung" 1 IP
```

Hệ quả quan trọng: NAT cho phép **bên trong chủ động gọi ra ngoài**, nhưng **bên ngoài không thể tự gọi vào** một máy private (lễ tân không biết chuyển cho ai nếu không có sổ ghi trước). Đây vừa là hạn chế, vừa là một lớp bảo vệ tự nhiên.

> 💡 Ghi nhớ: Private IP = không ra Internet trực tiếp. NAT = bên trong gọi ra được, bên ngoài không gọi vào được. Mô hình "server private + NAT để cập nhật phần mềm" là kiến trúc chuẩn mực trong cloud.

## 3. DNS — danh bạ của Internet

Con người nhớ tên (`google.com`), máy tính cần số (`142.250.4.100`). **DNS** (Domain Name System) là hệ thống dịch tên → IP, giống danh bạ điện thoại toàn cầu.

### Hành trình một truy vấn DNS

Khi bạn gõ `shop.example.com`, trình duyệt (qua một **DNS resolver**, thường của ISP hoặc 8.8.8.8) hỏi lần lượt như hỏi đường:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Hành trình một truy vấn DNS phân cấp</title>
  <desc>Trình duyệt hỏi DNS resolver tên shop.example.com; resolver hỏi lần lượt Root server, TLD server .com, rồi Authoritative name server để lấy IP 93.184.216.34, sau đó cache lại theo TTL.</desc>
  <defs>
    <marker id="dnsArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="16" y="120" width="150" height="70" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="91" y="148" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">DNS Resolver</text>
  <text x="91" y="167" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">(ISP hoặc 8.8.8.8)</text>
  <text x="91" y="182" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">có cache + TTL</text>
  <rect x="554" y="20" width="150" height="56" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="629" y="43" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Root server</text>
  <text x="629" y="61" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">"hỏi .com kìa"</text>
  <rect x="554" y="132" width="150" height="56" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="629" y="155" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">TLD server (.com)</text>
  <text x="629" y="173" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">"name server X quản"</text>
  <rect x="554" y="244" width="150" height="56" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="629" y="266" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Authoritative NS</text>
  <text x="629" y="284" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">= 93.184.216.34</text>
  <g stroke="currentColor" fill="none" stroke-width="1.4" marker-end="url(#dnsArrow)">
    <path d="M166 138 C 360 90, 420 60, 554 50"/>
    <path d="M166 155 C 360 158, 420 160, 554 160"/>
    <path d="M166 172 C 360 230, 420 260, 554 272"/>
  </g>
  <g font-size="10.5" fill="currentColor" opacity="0.85">
    <text x="300" y="78">1. .com ở đâu?</text>
    <text x="300" y="150">2. ai quản example.com?</text>
    <text x="300" y="250">3. shop.example.com = ?</text>
  </g>
  <text x="16" y="232" font-size="11" fill="currentColor" opacity="0.85">Trình duyệt → "shop.example.com?"</text>
  <text x="16" y="262" font-size="11" fill="currentColor" opacity="0.85">← "93.184.216.34"</text>
  <text x="16" y="290" font-size="10.5" fill="currentColor" opacity="0.65">Resolver cache kết quả trong</text>
  <text x="16" y="305" font-size="10.5" fill="currentColor" opacity="0.65">thời gian TTL → lần sau khỏi hỏi</text>
</svg>

- **Phân cấp**: root → TLD (`.com`, `.vn`) → domain (`example.com`) → bản ghi cụ thể.
- **Cache + TTL**: mỗi câu trả lời có "hạn dùng" (TTL — time to live). Resolver nhớ kết quả trong thời gian đó, nên đa số truy vấn không phải đi hết vòng.

### Vài loại bản ghi hay gặp

| Bản ghi | Ý nghĩa | Ví dụ |
|---|---|---|
| `A` | tên → IPv4 | `example.com → 93.184.216.34` |
| `AAAA` | tên → IPv6 | |
| `CNAME` | tên → tên khác (bí danh) | `www → example.com` |
| `MX` | mail server của domain | |

> 💡 Ghi nhớ: DNS là dịch vụ phân tán, phân cấp, có cache. Nếu DNS chết, tên miền không phân giải được — với người dùng thì "cả Internet sập" dù server vẫn chạy. Vì vậy DNS luôn được thiết kế cực kỳ sẵn sàng (Route 53 cam kết SLA 100%).

## 4. HTTP/HTTPS và TLS handshake (mức ý tưởng)

### HTTP — ngôn ngữ hỏi-đáp của web

**HTTP** là giao thức kiểu **request → response**: client hỏi, server trả lời, xong là... quên nhau (HTTP tự thân là **stateless** — không nhớ gì giữa các lần hỏi; "đăng nhập rồi" là do cookie/token gắn kèm mỗi request).

```
Client                                Server
  │── GET /products/42 HTTP/1.1 ───────→│
  │←─ 200 OK + JSON sản phẩm ───────────│
```

Các động từ chính: `GET` (lấy), `POST` (tạo), `PUT/PATCH` (sửa), `DELETE` (xoá). Mã trả về: `2xx` thành công, `3xx` chuyển hướng, `4xx` lỗi phía client (404 không tìm thấy, 403 cấm), `5xx` lỗi phía server.

### HTTPS = HTTP + TLS

HTTP thuần là **bưu thiếp** — ai cầm trên đường đều đọc được. HTTPS bỏ bưu thiếp vào **phong bì khoá** nhờ **TLS**. TLS giải 3 bài toán:

1. **Mã hoá** — kẻ nghe lén chỉ thấy nhiễu.
2. **Xác thực** — chứng minh server đúng là `bank.com` thật (nhờ **certificate** do một Certificate Authority uy tín ký).
3. **Toàn vẹn** — dữ liệu không bị sửa giữa đường.

### TLS handshake — màn "bắt tay" mức ý tưởng

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Trình tự bắt tay TLS giữa client và server</title>
  <desc>Client gửi ClientHello; server trả ServerHello kèm certificate; client kiểm tra cert; hai bên trao đổi nguyên liệu tính ra khoá phiên chung; từ đó mọi dữ liệu được mã hoá bằng session key.</desc>
  <defs>
    <marker id="tlsArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <rect x="40" y="16" width="140" height="38" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="110" y="40" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Client</text>
  <rect x="540" y="16" width="140" height="38" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="610" y="40" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Server</text>
  <g stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4">
    <line x1="110" y1="54" x2="110" y2="344"/>
    <line x1="610" y1="54" x2="610" y2="344"/>
  </g>
  <g stroke="currentColor" fill="none" stroke-width="1.4" marker-end="url(#tlsArrow)">
    <line x1="110" y1="82" x2="608" y2="82"/>
    <line x1="610" y1="128" x2="112" y2="128"/>
    <line x1="110" y1="220" x2="608" y2="220"/>
  </g>
  <text x="120" y="76" font-size="11" fill="currentColor">ClientHello — "tôi hỗ trợ thuật toán A, B, C"</text>
  <text x="600" y="122" font-size="11" text-anchor="end" fill="currentColor">ServerHello — "chọn B" + certificate</text>
  <rect x="40" y="142" width="220" height="50" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="52" y="161" font-size="10.5" fill="currentColor">Client kiểm tra cert:</text>
  <text x="52" y="177" font-size="10.5" fill="currentColor" opacity="0.8">đúng tên miền? CA uy tín ký? còn hạn?</text>
  <text x="120" y="214" font-size="11" fill="currentColor">Trao đổi "nguyên liệu" tạo khoá</text>
  <rect x="180" y="238" width="360" height="46" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="257" font-size="10.5" text-anchor="middle" fill="currentColor">Hai bên cùng tính ra KHOÁ PHIÊN chung</text>
  <text x="360" y="273" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">mà kẻ nghe lén không tính được</text>
  <g stroke="#10b981" stroke-width="3" stroke-opacity="0.7">
    <line x1="110" y1="312" x2="610" y2="312"/>
  </g>
  <text x="360" y="334" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Kênh mã hoá: mọi dữ liệu dùng session key</text>
</svg>

Điểm tinh tế đáng nhớ: TLS dùng mã hoá **bất đối xứng** (chậm, dùng để bắt tay an toàn và xác thực) để thống nhất một **khoá đối xứng** (nhanh, dùng cho toàn bộ dữ liệu sau đó). Giống như dùng két sắt nặng nề chỉ để trao nhau chiếc chìa khoá nhà, rồi sau đó ra vào bằng chìa cho nhanh.

> 💡 Ghi nhớ: HTTPS = HTTP chạy trên TLS. Certificate trả lời câu hỏi "anh có đúng là người anh tự xưng không?". Trên AWS, certificate được cấp/quản lý miễn phí qua ACM và "gắn" vào load balancer hoặc CloudFront.

## 5. Port, firewall, stateful vs stateless

### Port — "số phòng" trong một địa chỉ

IP đưa gói tin đến đúng **máy**; **port** đưa nó đến đúng **chương trình** trên máy đó. Một máy như một toà nhà: IP là địa chỉ toà nhà, port là số phòng (0–65535).

Các port kinh điển nên thuộc lòng:

| Port | Dịch vụ |
|---|---|
| 22 | SSH (điều khiển server từ xa) |
| 53 | DNS |
| 80 | HTTP |
| 443 | HTTPS |
| 3306 / 5432 | MySQL / PostgreSQL |

### Firewall — bảo vệ cổng toà nhà

**Firewall** là bộ luật quyết định gói tin nào được vào/ra, dựa trên: IP nguồn, IP đích, port, giao thức. Ví dụ luật đời thường: "Chỉ cho khách từ sảnh (Internet) vào phòng 443 (web); phòng 3306 (database) chỉ tiếp người nội bộ."

### Stateful vs stateless filtering — điểm dễ nhầm nhất

Hai "tính cách" bảo vệ:

- **Stateful** (có trí nhớ): như bảo vệ ghi sổ. Bạn đi ra, anh ấy nhớ mặt; lúc quay vào không cần trình giấy lần nữa. Kỹ thuật: nếu connection chiều đi được phép, **traffic trả lời tự động được cho vào**, không cần luật riêng.
- **Stateless** (không trí nhớ): như máy quẹt thẻ. Mỗi gói tin, mỗi chiều, đều bị kiểm tra độc lập. Muốn hai chiều thông suốt phải viết luật cho **cả chiều đi lẫn chiều về**.

| Tiêu chí | Stateful | Stateless |
|---|---|---|
| Nhớ connection? | Có | Không |
| Luật chiều về | Tự động cho phép | Phải khai báo riêng |
| Ví dụ AWS | **Security Group** | **Network ACL** |
| Loại luật | Chỉ allow | Allow và deny |
| Áp dụng ở | từng máy (instance) | ranh giới subnet |

> 💡 Ghi nhớ: Stateful = "đã cho ra thì cho về". Stateless = "kiểm tra từng gói, từng chiều". Trên AWS: Security Group là stateful, NACL là stateless — đây là câu hỏi quen thuộc ở mọi kỳ thi AWS.

## 6. Load balancer — L4 vs L7

Khi một server không gánh nổi lượng truy cập, bạn chạy nhiều server và đặt một **load balancer** (LB) phía trước để chia việc — như nhân viên điều phối hàng ở siêu thị: "Quầy 3 đang trống, mời anh qua!"

```
                ┌→ [Server 1]
[Users] → [LB] ─┼→ [Server 2]
                └→ [Server 3]   (server chết → LB tự loại ra
                                 nhờ health check định kỳ)
```

LB còn mang lại **high availability**: health check phát hiện server hỏng và ngừng gửi traffic tới nó.

### L4 vs L7 — điều phối "mù" và điều phối "hiểu nội dung"

Tên gọi đến từ mô hình OSI: Layer 4 là tầng transport (TCP/UDP), Layer 7 là tầng application (HTTP).

- **L4 LB**: chỉ nhìn IP + port, **không mở phong bì**. Như bưu tá chia thư theo địa chỉ ngoài bì — cực nhanh, không quan tâm bên trong viết gì.
- **L7 LB**: **đọc nội dung HTTP** — URL, header, cookie — rồi quyết định. Như lễ tân đọc thư: "thư về hoá đơn chuyển phòng kế toán, thư khiếu nại chuyển phòng CSKH."

| Tiêu chí | L4 (transport) | L7 (application) |
|---|---|---|
| Nhìn thấy gì | IP, port TCP/UDP | URL, header, cookie, method |
| Định tuyến theo nội dung (`/api` → nhóm A, `/img` → nhóm B) | Không | Có |
| Tốc độ / độ trễ | Rất nhanh | Chậm hơn một chút |
| Phù hợp | game, IoT, TCP/UDP thô, cần hiệu năng cực cao | web app, API, microservices |
| Trên AWS | **Network Load Balancer (NLB)** | **Application Load Balancer (ALB)** |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>So sánh load balancer tầng 4 và tầng 7</title>
  <desc>L4 load balancer (NLB) chỉ nhìn IP và port rồi chuyển tiếp tới các server. L7 load balancer (ALB) đọc HTTP path, host, header rồi route tới target group khác nhau theo nội dung.</desc>
  <defs>
    <marker id="lbArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="180" y="22" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">L4 — NLB (nhìn IP/port)</text>
  <rect x="16" y="60" width="78" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="55" y="84" font-size="11" text-anchor="middle" fill="currentColor">Client</text>
  <rect x="128" y="48" width="104" height="64" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="180" y="74" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">NLB</text>
  <text x="180" y="92" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">chỉ thấy IP+port</text>
  <text x="180" y="104" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">không mở phong bì</text>
  <g stroke="currentColor" fill="none" stroke-width="1.4" marker-end="url(#lbArrow)">
    <line x1="94" y1="80" x2="126" y2="80"/>
    <path d="M232 70 C 270 50, 290 42, 320 42"/>
    <line x1="232" y1="80" x2="318" y2="80"/>
    <path d="M232 90 C 270 110, 290 118, 320 118"/>
  </g>
  <g>
    <rect x="320" y="26" width="100" height="32" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="370" y="46" font-size="10.5" text-anchor="middle" fill="currentColor">Server 1</text>
    <rect x="320" y="64" width="100" height="32" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="370" y="84" font-size="10.5" text-anchor="middle" fill="currentColor">Server 2</text>
    <rect x="320" y="102" width="100" height="32" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="370" y="122" font-size="10.5" text-anchor="middle" fill="currentColor">Server 3</text>
  </g>
  <line x1="16" y1="168" x2="704" y2="168" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="200" y="206" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">L7 — ALB (đọc HTTP path/host/header)</text>
  <rect x="16" y="248" width="78" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="55" y="272" font-size="11" text-anchor="middle" fill="currentColor">Client</text>
  <rect x="128" y="236" width="116" height="64" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="186" y="262" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">ALB</text>
  <text x="186" y="280" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">đọc URL/host/header</text>
  <text x="186" y="292" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">route theo nội dung</text>
  <g stroke="currentColor" fill="none" stroke-width="1.4" marker-end="url(#lbArrow)">
    <line x1="94" y1="268" x2="126" y2="268"/>
    <path d="M244 256 C 300 232, 340 226, 396 226"/>
    <path d="M244 282 C 300 306, 340 312, 396 312"/>
  </g>
  <text x="262" y="226" font-size="9.5" fill="currentColor" opacity="0.85">/api → </text>
  <text x="262" y="328" font-size="9.5" fill="currentColor" opacity="0.85">/img → </text>
  <rect x="396" y="206" width="150" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="471" y="225" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Target group A</text>
  <text x="471" y="240" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">server API</text>
  <rect x="396" y="290" width="150" height="44" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="471" y="309" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">Target group B</text>
  <text x="471" y="324" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">server ảnh tĩnh</text>
</svg>

> 💡 Ghi nhớ: L4 nhìn "bì thư" (IP/port), L7 đọc "lá thư" (HTTP). Cần route theo path/host/header → L7 (ALB). Cần hiệu năng thô, giao thức TCP/UDP bất kỳ, IP tĩnh → L4 (NLB).

## 7. Latency vs Bandwidth — hai thước đo dễ lẫn

Analogy đường ống nước:

- **Latency** (độ trễ): mở vòi bao lâu thì giọt nước **đầu tiên** chảy tới — đo bằng mili giây (ms). Phụ thuộc chủ yếu vào **khoảng cách** và số chặng trung gian; bị giới hạn bởi tốc độ ánh sáng, không tiền nào mua nhanh hơn được.
- **Bandwidth** (băng thông): ống **to cỡ nào** — mỗi giây chảy được bao nhiêu nước (Mbps, Gbps). Có thể mua thêm.

Ví von kinh điển: một xe tải chở đầy ổ cứng chạy xuyên quốc gia có **bandwidth khổng lồ** (hàng petabyte/chuyến) nhưng **latency thê thảm** (2 ngày mới có byte đầu tiên).

| | Latency | Bandwidth |
|---|---|---|
| Câu hỏi | "Bao lâu thì TỚI?" | "Mỗi giây chở được BAO NHIÊU?" |
| Đơn vị | ms | Mbps / Gbps |
| Cải thiện bằng | đặt server **gần** người dùng, giảm số round-trip, cache | nâng cấp đường truyền, nén dữ liệu |
| Ứng dụng nhạy cảm | game online, gọi video, giao dịch tài chính | tải file lớn, streaming 4K, backup |

Một trang web "chậm" thường do **latency × số lượt khứ hồi** (DNS + TCP + TLS + hàng chục request) chứ không phải do thiếu băng thông. Đó là lý do "đem nội dung lại gần người dùng" hiệu quả đến vậy — dẫn tới CDN.

> 💡 Ghi nhớ: Latency = độ trễ (ms), quyết định bởi khoảng cách. Bandwidth = độ rộng ống (Mbps). Tăng bandwidth KHÔNG làm giảm latency. Muốn giảm latency → lại gần người dùng (region gần, edge, CDN, cache).

## 8. CDN — đem nội dung lại gần người dùng

**CDN** (Content Delivery Network) là mạng lưới hàng trăm máy chủ **edge** rải khắp thế giới, **cache** (lưu tạm) nội dung của bạn ở gần người dùng.

Analogy: thay vì cả nước đặt sách từ một nhà in duy nhất ở Hà Nội (origin), nhà xuất bản đặt **kho sách ở mỗi tỉnh** (edge). Người Cần Thơ mua sách lấy từ kho Cần Thơ — chỉ khi kho hết (cache miss) mới gọi về nhà in.

```
                     cache hit (đa số) ─ trả ngay, ~10-30ms
User (VN) → [Edge Singapore] ─────────────────────────────
                     │ cache miss (lần đầu / hết hạn)
                     └──→ [Origin server ở Mỹ] ~200ms, rồi
                          edge lưu lại cho người sau
```

CDN phát huy tốt nhất với **nội dung tĩnh** (ảnh, video, CSS, JS, file tải về) — thứ giống nhau cho mọi người. Nội dung động/cá nhân hoá khó cache hơn, nhưng CDN vẫn giúp nhờ kết nối backbone tối ưu về origin và TLS termination tại edge.

Lợi ích chính:
- **Giảm latency**: nội dung ở cách người dùng vài chục km thay vì nửa vòng Trái Đất.
- **Giảm tải origin**: 90% request không bao giờ chạm tới server gốc.
- **Chống chịu tốt hơn**: hấp thụ traffic đột biến, lớp đệm trước DDoS.

> 💡 Ghi nhớ: CDN = cache nội dung tại edge gần người dùng. Hai khái niệm điều khiển cache: **TTL** (nội dung sống bao lâu tại edge) và **invalidation** (chủ động xoá cache khi cập nhật nội dung).

## 9. Liên hệ sang AWS

Toàn bộ khái niệm trong bài đều có "hoá thân" trực tiếp trên AWS — đây là bản đồ bạn sẽ gặp lại liên tục khi học CLF/SAA/DVA:

| Khái niệm trong bài | Service / tính năng AWS |
|---|---|
| Mạng riêng, subnet, CIDR | **Amazon VPC** — bạn tự khai CIDR (vd `10.0.0.0/16`), chia public/private subnet |
| Public vs private IP | Elastic IP (public tĩnh), private IP trong VPC |
| NAT cho máy private ra Internet | **NAT Gateway** (chiều ra); **Internet Gateway** cho subnet public |
| DNS | **Route 53** — đăng ký domain, hosted zone, bản ghi A/CNAME/Alias, health check |
| HTTPS / TLS certificate | **ACM** (AWS Certificate Manager) — cert miễn phí, gắn vào ALB/CloudFront |
| Firewall stateful (mức máy) | **Security Group** |
| Firewall stateless (mức subnet) | **Network ACL** |
| Load balancer L7 | **ALB** (Application Load Balancer) — route theo path/host/header |
| Load balancer L4 | **NLB** (Network Load Balancer) — TCP/UDP, IP tĩnh, hiệu năng cao |
| CDN | **CloudFront** — edge location toàn cầu, TTL, invalidation, gắn với S3/ALB làm origin |
| Giảm latency toàn cục | chọn **Region** gần người dùng, CloudFront, Route 53 latency-based routing |

Khi đọc đề thi AWS, hãy "dịch ngược" về khái niệm gốc: thấy *Security Group* → nghĩ "firewall stateful"; thấy *CloudFront* → nghĩ "cache tại edge để giảm latency"; thấy *NAT Gateway* → nghĩ "private ra Internet một chiều". Nắm chắc gốc, mọi service chỉ là tên thương mại của những ý tưởng trong bài này.

## Tóm tắt

- **IP/CIDR**: địa chỉ máy + cách chia mạng; `/n` càng nhỏ mạng càng to.
- **Private IP + NAT**: trong gọi ra được, ngoài không gọi vào được.
- **DNS**: danh bạ phân cấp tên → IP, có cache và TTL.
- **HTTPS = HTTP + TLS**: mã hoá, xác thực bằng certificate, bắt tay để tạo khoá phiên.
- **Port** định danh chương trình; **firewall** lọc theo IP/port; stateful nhớ connection, stateless thì không.
- **LB L4** nhìn bì thư, **L7** đọc lá thư.
- **Latency** là độ trễ (giảm bằng cách lại gần), **bandwidth** là độ rộng ống (tăng bằng tiền).
- **CDN** đem nội dung tĩnh tới edge gần người dùng.

Bài tiếp theo sẽ dùng nền tảng này để bàn về cách thiết kế hệ thống chịu lỗi và mở rộng trong môi trường phân tán.
