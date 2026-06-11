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

```
Bạn → Resolver: "shop.example.com là IP nào?"
        │
        ├─1→ Root server:      "Tôi không biết, nhưng .com hỏi anh kia"
        ├─2→ TLD server (.com):"example.com do name server X quản"
        ├─3→ Name server X:    "shop.example.com = 93.184.216.34"
        │
Bạn ← Resolver: "93.184.216.34" (và cache lại để lần sau khỏi hỏi)
```

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

```
Client                                      Server
  │── "Chào! Tôi hỗ trợ các thuật toán A,B,C" →│   (ClientHello)
  │←─ "Chọn B. Đây là certificate của tôi" ────│   (ServerHello + cert)
  │   [Client kiểm tra cert: đúng tên miền?
  │    do CA uy tín ký? còn hạn?]
  │── trao đổi "nguyên liệu" tạo khoá ─────────→│
  │   [Hai bên cùng tính ra một KHOÁ PHIÊN
  │    chung mà kẻ nghe lén không tính được]
  │══ từ đây mọi dữ liệu mã hoá bằng khoá phiên ══│
```

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
