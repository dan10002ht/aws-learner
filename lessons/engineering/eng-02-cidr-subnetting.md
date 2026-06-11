# CIDR & Subnetting thực hành

Đây là kỹ năng "tính nhẩm" quan trọng nhất của một Cloud Engineer. Trong đề thi SAA/DVA, bạn sẽ gặp câu hỏi kiểu "VPC 10.0.0.0/16, cần 4 subnet mỗi cái chứa 500 instance, chọn CIDR nào?" — và bạn phải trả lời trong dưới 60 giây, không máy tính. Bài này dạy bạn phương pháp block size để làm điều đó bằng tay.

## 1. Nhị phân & octet — nền tảng 5 phút

Một địa chỉ IPv4 là **32 bit**, chia thành 4 **octet** (mỗi octet 8 bit, giá trị 0–255):

```
10.0.5.130  =  00001010 . 00000000 . 00000101 . 10000010
```

Giá trị từng bit trong một octet (học thuộc dòng này):

```
Bit:      128   64   32   16    8    4    2    1
```

Ví dụ tính tay: `130 = 128 + 2` → `10000010`. Ngược lại, `11000000 = 128 + 64 = 192`.

> 💡 **Ghi nhớ:** Bạn chỉ cần thuộc dãy `128 64 32 16 8 4 2 1`. Mọi phép tính subnet đều quy về dãy này.

Kiểm tra nhanh bằng lệnh (macOS/Linux có sẵn Python):

```bash
python3 -c "print(bin(130))"
# 0b10000010
```

## 2. CIDR notation — /n nghĩa là gì

`10.0.0.0/16` nghĩa là: **16 bit đầu là phần network** (cố định), 32 − 16 = **16 bit còn lại là phần host** (thay đổi được).

Công thức cốt lõi:

```
Số địa chỉ trong block = 2^(32 − prefix)
```

| Prefix | Số địa chỉ | Subnet mask | Ghi chú hay gặp |
|---|---|---|---|
| /16 | 65,536 | 255.255.0.0 | Cỡ VPC lớn nhất AWS cho phép |
| /20 | 4,096 | 255.255.240.0 | Subnet "rộng rãi" trong VPC |
| /22 | 1,024 | 255.255.252.0 | |
| /24 | 256 | 255.255.255.0 | Subnet phổ biến nhất |
| /26 | 64 | 255.255.255.192 | |
| /27 | 32 | 255.255.255.224 | |
| /28 | 16 | 255.255.255.240 | Cỡ subnet **nhỏ nhất** AWS cho phép |
| /32 | 1 | 255.255.255.255 | Một host duy nhất (security group rule) |

> 💡 **Ghi nhớ:** Mỗi lần prefix **giảm 1** (vd /24 → /23), số địa chỉ **nhân đôi**. Mỗi lần **tăng 1**, số địa chỉ **chia đôi**.

## 3. Block size method — tính network/broadcast nhanh bằng tay

Đây là kỹ thuật quan trọng nhất bài. Quy trình 4 bước:

**Bước 1.** Xác định "octet đáng quan tâm" (interesting octet) — octet mà prefix cắt ngang:
- /1–/8 → octet 1; /9–/16 → octet 2; /17–/24 → octet 3; /25–/32 → octet 4.

**Bước 2.** Tính **block size** = `256 − giá trị mask tại octet đó`, hoặc nhanh hơn: `2^(số bit host trong octet đó)`.

**Bước 3.** Network address = bội số của block size **gần nhất, không vượt quá** giá trị octet đang xét.

**Bước 4.** Broadcast = network của block kế tiếp **trừ 1**. Usable host range = network + 1 đến broadcast − 1.

### Ví dụ tính tay: `10.0.77.200/26` thuộc subnet nào?

```
/26 → octet 4 là interesting octet (26 − 24 = 2 bit network trong octet 4)
Block size = 2^(8−2) = 64  →  các block bắt đầu tại: 0, 64, 128, 192
200 nằm giữa 192 và 256 → network = 10.0.77.192
Broadcast = 10.0.77.255 (block kế tiếp 256 − 1)
Usable hosts (mạng thường) = .193 → .254  (62 địa chỉ)
```

### Ví dụ với octet 3: `172.16.37.14/20`

```
/20 → octet 3, bit network trong octet 3 = 20 − 16 = 4 → block size = 2^4 = 16
Các block: 0, 16, 32, 48, ...
37 nằm giữa 32 và 48 → network = 172.16.32.0/20
Broadcast = 172.16.47.255
Range = 172.16.32.0 → 172.16.47.255 (4,096 địa chỉ)
```

Kiểm chứng bằng tool:

```bash
python3 -c "import ipaddress; n=ipaddress.ip_network('172.16.37.14/20', strict=False); print(n, n.broadcast_address, n.num_addresses)"
# 172.16.32.0/20 172.16.47.255 4096
```

> ⚠️ **Lỗi thường gặp:** Quên rằng usable hosts = tổng − 2 (network + broadcast) trong mạng truyền thống. Riêng **AWS trừ 5** (xem mục 8) — đề thi hay gài đúng chỗ này.

## 4. Chia subnet từ một VPC CIDR

Bài toán thực tế: VPC `10.0.0.0/16`, chia subnet thế nào?

### Chia thành các /20 (16 subnet, mỗi cái 4,096 IP)

Mượn 20 − 16 = 4 bit → 2^4 = 16 subnet. Block size tại octet 3 = 16:

```
10.0.0.0/20    10.0.16.0/20   10.0.32.0/20   10.0.48.0/20
10.0.64.0/20   10.0.80.0/20   ...            10.0.240.0/20
```

### Chia thành các /24 (256 subnet, mỗi cái 256 IP)

Mượn 8 bit → octet 3 chạy 0–255:

```
10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24, ..., 10.0.255.0/24
```

### Chia hỗn hợp (thực tế nhất)

Layout VPC chuẩn 3 AZ thường dùng:

```
VPC: 10.0.0.0/16
  Public subnets  (3 AZ): 10.0.0.0/24,  10.0.1.0/24,  10.0.2.0/24
  Private app     (3 AZ): 10.0.16.0/20, 10.0.32.0/20, 10.0.48.0/20
  Private data    (3 AZ): 10.0.64.0/24, 10.0.65.0/24, 10.0.66.0/24
  Dự phòng: phần còn lại
```

> 💡 **Ghi nhớ:** Subnet con phải **bắt đầu tại bội số của block size của chính nó**. `10.0.10.0/20` là CIDR **không hợp lệ** vì 10 không chia hết cho 16 — AWS console sẽ báo lỗi "CIDR block is not within valid range" hoặc tự hiểu thành block khác tuỳ tool.

## 5. Public vs Private ranges (RFC 1918)

Ba dải private — học thuộc:

| Dải | CIDR | Số địa chỉ |
|---|---|---|
| 10.0.0.0 – 10.255.255.255 | 10.0.0.0/8 | ~16.7 triệu |
| 172.16.0.0 – 172.31.255.255 | 172.16.0.0/12 | ~1 triệu |
| 192.168.0.0 – 192.168.255.255 | 192.168.0.0/16 | 65,536 |

Các dải đặc biệt khác hay gặp trong đề:

- `169.254.0.0/16` — link-local. AWS dùng cho **Instance Metadata Service** (`169.254.169.254`) và VPN tunnel inside IP.
- `100.64.0.0/10` — Carrier-Grade NAT (RFC 6598). AWS cho phép dùng làm **secondary CIDR** của VPC, hay dùng cho dải "non-routable" của EKS pod hoặc kiến trúc private NAT gateway.
- `127.0.0.0/8` — loopback; `0.0.0.0/0` — "mọi nơi" (default route).

> ⚠️ **Lỗi thường gặp:** `172.32.0.0` **không** phải private — dải 172 chỉ private từ 172.**16** đến 172.**31** (vì /12 = 16 block /16, bắt đầu tại 16).

## 6. Overlap detection — phát hiện trùng dải

Hai CIDR overlap khi block này nằm trong block kia (hoặc trùng nhau). Cách check tay: đưa cả hai về dạng range rồi so.

**Ví dụ:** `10.0.0.0/16` và `10.0.128.0/17` có overlap không?

```
10.0.0.0/16   → 10.0.0.0   – 10.0.255.255
10.0.128.0/17 → 10.0.128.0 – 10.0.255.255
→ Overlap (block /17 nằm trọn trong /16)
```

**Mẹo nhanh:** so prefix ngắn hơn trước — nếu địa chỉ network của CIDR dài hơn rơi vào range của CIDR ngắn hơn → chắc chắn overlap.

```bash
python3 -c "import ipaddress as i; print(i.ip_network('10.0.0.0/16').overlaps(i.ip_network('10.0.128.0/17')))"
# True
```

> 💡 **Ghi nhớ:** Hai CIDR **cùng prefix** thì hoặc trùng hệt nhau, hoặc không overlap. Overlap "một phần" chỉ xảy ra khi prefix khác nhau.

## 7. Route table & longest-prefix match

Khi một packet cần định tuyến, router chọn route có **prefix dài nhất** (cụ thể nhất) khớp với destination — không phải route đứng trước.

Ví dụ route table của một private subnet AWS:

| Destination | Target | Ý nghĩa |
|---|---|---|
| 10.0.0.0/16 | local | Nội bộ VPC (luôn có, không xoá được) |
| 10.1.0.0/16 | pcx-abc123 | Sang VPC peering |
| 10.1.5.0/24 | tgw-xyz789 | Riêng dải này đi qua Transit Gateway |
| 0.0.0.0/0 | nat-0aaa | Mọi thứ còn lại ra Internet qua NAT |

Packet tới `10.1.5.40`: khớp cả /16 (peering) lẫn /24 (TGW) → chọn **/24 → Transit Gateway** vì prefix dài hơn. Packet tới `10.1.9.9` → /16 → peering. Packet tới `8.8.8.8` → chỉ khớp /0 → NAT.

> ⚠️ **Lỗi thường gặp:** Nghĩ rằng `0.0.0.0/0` "ưu tiên cao vì đứng đầu". Sai — /0 là prefix **ngắn nhất**, luôn là lựa chọn cuối cùng (default route). Thứ tự dòng trong route table không có ý nghĩa.

## 8. Liên hệ AWS: VPC/subnet sizing — AWS giữ 5 IP

Trong **mỗi subnet**, AWS dành riêng **5 địa chỉ** (đầu 4 + cuối 1). Với subnet `10.0.0.0/24`:

| IP | Dùng cho |
|---|---|
| 10.0.0.0 | Network address |
| 10.0.0.1 | VPC router (implicit router) |
| 10.0.0.2 | DNS resolver (Route 53 Resolver, "VPC+2") |
| 10.0.0.3 | Dự phòng tương lai của AWS |
| 10.0.0.255 | Broadcast (AWS không hỗ trợ broadcast nhưng vẫn giữ) |

```
Usable IP trong subnet AWS = 2^(32 − prefix) − 5
/24 → 256 − 5 = 251        /28 → 16 − 5 = 11
/27 → 32 − 5 = 27          /26 → 64 − 5 = 59
```

Quy tắc VPC/subnet hiện hành (2025–2026):

- VPC IPv4 CIDR: từ **/28** (nhỏ nhất) đến **/16** (lớn nhất).
- Có thể gắn **secondary CIDR** vào VPC đang chạy (tối đa 5 IPv4 CIDR mặc định, nâng quota được) — đây là cách "cứu" VPC hết IP mà **không** phải tạo VPC mới. Secondary CIDR có ràng buộc: ví dụ VPC chính 10.x thì không được thêm secondary từ 172.16.0.0/12 hay 192.168.0.0/16, nhưng được thêm 100.64.0.0/10.
- ENI thứ cấp, mỗi pod EKS (với VPC CNI), mỗi Fargate task, mỗi Lambda trong VPC, mỗi interface endpoint đều "ăn" IP của subnet — subnet production nên rộng hơn bạn nghĩ.

> 💡 **Ghi nhớ cho đề thi:** "Cần 500 instance mỗi subnet" → 500 + 5 = 505 → /23 (512 − 5 = 507) là đáp án **khít** nhất. /24 (251) không đủ.

## 9. IPv6 cơ bản — vì sao AWS đẩy mạnh

Lý do AWS đẩy IPv6 (và đề thi bắt đầu hỏi nhiều hơn):

1. **IPv4 cạn kiệt và đắt** — từ tháng 2/2024, AWS tính phí **mọi public IPv4** (~$0.005/giờ ≈ $3.6/tháng mỗi IP), kể cả IP gắn vào instance đang chạy. IPv6 thì miễn phí.
2. Quy mô container/serverless cần không gian địa chỉ khổng lồ (EKS IPv6 cluster giải bài toán hết IP pod).
3. Yêu cầu compliance (chính phủ Mỹ bắt buộc chuyển dịch IPv6).

Những điều cần biết:

- IPv6 dài **128 bit**, viết hex, 8 nhóm: `2600:1f18:abc:1200::/56`. `::` rút gọn chuỗi số 0 (chỉ dùng 1 lần).
- AWS cấp cho VPC một block **/56** (Amazon-provided GUA), mỗi subnet nhận một **/64**. /56 → /64 là 8 bit → **256 subnet** IPv6 mỗi VPC.
- IPv6 trên AWS là **global unicast — public và unique toàn cầu**; tính "private" được kiểm soát bằng route table + security group, không bằng NAT. Subnet IPv6-private dùng **egress-only internet gateway** (tương đương NAT gateway nhưng cho IPv6, và miễn phí xử lý).
- Không có broadcast trong IPv6; không cần tính usable hosts kiểu IPv4 — một /64 có 2^64 địa chỉ.
- VPC có thể **dual-stack** (IPv4 + IPv6) hoặc subnet **IPv6-only** (hỗ trợ EC2 Nitro, EKS, ECS).

> ⚠️ **Lỗi thường gặp:** Tưởng NAT gateway dùng được cho IPv6. Sai — IPv6 outbound-only dùng **egress-only internet gateway**; NAT gateway chủ yếu cho IPv4 (riêng tính năng NAT64/DNS64 cho phép subnet IPv6-only gọi ra dịch vụ IPv4).

## 10. Bài tập có lời giải

### Bài 1 — Xác định subnet

`192.168.100.93/27` — tìm network, broadcast, usable range (mạng thường).

**Giải:**
```
/27 → octet 4, block size = 2^(8−3) = 32 → block: 0, 32, 64, 96...
93 nằm giữa 64 và 96 → network = 192.168.100.64/27
Broadcast = 192.168.100.95 (96 − 1)
Usable = .65 → .94 (30 hosts)
```

### Bài 2 — Sizing subnet AWS

Cần subnet chứa **50 EC2 instance** trong VPC. Prefix nhỏ nhất (tiết kiệm nhất) là gì?

**Giải:**
```
Cần ≥ 50 usable. AWS trừ 5:
/27 → 32 − 5 = 27   → thiếu
/26 → 64 − 5 = 59   → đủ ✓
Đáp án: /26
```

### Bài 3 — Chia VPC

VPC `10.50.0.0/16`. Chia 8 subnet bằng nhau. Viết CIDR của subnet thứ 3 và thứ 8.

**Giải:**
```
8 subnet = mượn 3 bit → /19. Block size octet 3 = 2^(8−3) = 32.
Các subnet: 10.50.0.0/19, 10.50.32.0/19, 10.50.64.0/19, 10.50.96.0/19,
            10.50.128.0/19, 10.50.160.0/19, 10.50.192.0/19, 10.50.224.0/19
Subnet thứ 3 = 10.50.64.0/19; thứ 8 = 10.50.224.0/19
```

### Bài 4 — Overlap khi peering

VPC A: `172.16.0.0/16`. VPC B: `172.16.200.0/24`. VPC C: `172.17.0.0/16`. VPC A peering được với VPC nào?

**Giải:**
```
A vs B: 172.16.200.0/24 nằm trong 172.16.0.0 – 172.16.255.255 → OVERLAP → không peering được.
A vs C: 172.17.x ngoài range của A → không overlap → peering OK.
Đáp án: chỉ VPC C.
```

### Bài 5 — Longest-prefix match

Route table: `10.0.0.0/16 → local`, `10.0.0.0/8 → vgw-1` (VPN về on-prem), `0.0.0.0/0 → igw-1`. Packet tới `10.0.4.7` và `10.9.9.9` đi đâu?

**Giải:**
```
10.0.4.7: khớp /16 (local) và /8 (vgw) → /16 dài hơn → local (trong VPC).
10.9.9.9: chỉ khớp /8 → vgw-1 (về on-prem qua VPN).
```

### Bài 6 — IPv6 subnetting

VPC nhận `2600:1f18:1234:5600::/56`. Subnet thứ nhất và thứ hai (/64) là gì? Tối đa bao nhiêu subnet?

**Giải:**
```
/56 → /64: 8 bit subnet ID, nằm ở 2 ký tự hex cuối của nhóm thứ 4.
Subnet 1: 2600:1f18:1234:5600::/64
Subnet 2: 2600:1f18:1234:5601::/64
Tối đa 2^8 = 256 subnet.
```

## Bảng tra nhanh (in ra dán cạnh bàn)

| Prefix | Block size (octet liên quan) | Tổng IP | Usable AWS (−5) |
|---|---|---|---|
| /20 | 16 (octet 3) | 4,096 | 4,091 |
| /21 | 8 (octet 3) | 2,048 | 2,043 |
| /22 | 4 (octet 3) | 1,024 | 1,019 |
| /23 | 2 (octet 3) | 512 | 507 |
| /24 | 1 (octet 3) / 256 (octet 4) | 256 | 251 |
| /25 | 128 (octet 4) | 128 | 123 |
| /26 | 64 (octet 4) | 64 | 59 |
| /27 | 32 (octet 4) | 32 | 27 |
| /28 | 16 (octet 4) | 16 | 11 |

## Liên hệ sang AWS

- **VPC sizing (SAA hay hỏi):** VPC từ /28 đến /16; subnet nhỏ nhất /28; **mỗi subnet mất 5 IP**. Câu hỏi "subnet /28 chạy được tối đa bao nhiêu instance?" → đáp án 11, không phải 14.
- **Bẫy CIDR overlap khi peering:** VPC peering và Transit Gateway propagation **không hoạt động giữa hai CIDR trùng dải**. Đề SAA thường cho 2 VPC cùng `10.0.0.0/16` rồi hỏi cách kết nối — đáp án đúng thường là **PrivateLink (interface endpoint)** hoặc private NAT gateway, vì PrivateLink không quan tâm overlap. Đây là distractor kinh điển: "tạo VPC peering" sẽ sai.
- **Secondary CIDR:** VPC hết IP → **thêm secondary CIDR** (vd 100.64.0.0/10) thay vì rebuild VPC. Hay xuất hiện trong câu hỏi EKS hết IP pod.
- **Route table:** hiểu longest-prefix match để giải các câu "traffic tới on-prem đi VPN hay Direct Connect?" — route cụ thể hơn thắng; khi prefix bằng nhau, AWS ưu tiên DX trước VPN.
- **IPv6 & chi phí (cập nhật trend 2025–2026):** public IPv4 bị tính phí → câu hỏi "giảm chi phí IP" có thể trỏ về IPv6/dual-stack, hoặc Public IPv4 trong **BYOIP**/IPAM. Nhớ cặp: IPv4 private outbound = NAT gateway; IPv6 outbound = **egress-only internet gateway**.
- **Security group / NACL:** rule viết bằng CIDR — `/32` cho một host, `0.0.0.0/0` (và `::/0` cho IPv6) cho mọi nơi. Mở SSH bằng `0.0.0.0/0` là red flag trong câu hỏi security.
- **DVA góc nhìn dev:** Lambda trong VPC, ECS task awsvpc mode đều tiêu thụ IP subnet; lỗi `Client.NetworkInterfaceLimitExceeded` hoặc Lambda không scale được thường do subnet quá nhỏ — biết tính CIDR giúp bạn debug nhanh.
