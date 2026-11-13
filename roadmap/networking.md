# Roadmap — Networking: gói tin đi từ máy bạn tới đầu kia Internet

Lộ trình học **mạng như nó chạy thật**: một gói tin rời card mạng, qua switch, router, NAT,
nhảy qua vài AS bằng BGP, tới load balancer rồi vào container. Đích đến: đọc được output
`tcpdump`, `ip route`, `conntrack -L`, `dig +trace`, một bảng BGP, và **giải thích được** vì sao
request của mình chậm, treo hay đi vòng.

Đối tượng: **dev backend đã biết IP, port, DNS, HTTP ở mức dùng**. Đã đọc `eng-osi-model`,
`eng-02` (CIDR) và `eng-03` (TCP/TLS) hoặc biết tương đương.

---

## Vì sao cần course riêng

Repo đã có khoảng 8 bài chạm vào mạng, và đều dừng ở mức tổng quan:

| Bài đã có | Dạy gì | Dừng ở đâu |
|---|---|---|
| `starter/pc-02` | Internet cho người mới: IP, DNS, Wi-Fi → router → ISP | Dừng ở "ISP", không nói ISP nối với nhau thế nào |
| `foundations/intro-02-networking` | IP, NAT, DNS, LB L4/L7, CDN ở mức ý tưởng | Mỗi khái niệm một mục ngắn, không có cơ chế bên dưới |
| `engineering/eng-osi-model` | OSI/TCP-IP, encapsulation, bản đồ xuyên tầng | Tầng 1–2 và 3–4 chỉ "định vị nhanh" |
| `engineering/eng-02-cidr-subnetting` | CIDR, chia subnet, longest prefix match | Chỉ trong một VPC, không có định tuyến giữa các mạng |
| `engineering/eng-03-tcp-tls` | TCP vs UDP, states, HTTP/1-2-3, TLS 1.3, chain | TCP states "chỉ cần hiểu ý tưởng", không có congestion control |
| `cloudnative/cn-07`, `cn-08` | Service, Ingress | Từ góc K8s, không xuống iptables/IPVS |
| `saa-c03/16-networking`, `ch2-07` | VPC, VPN, Direct Connect | BGP và ASN chỉ có một dòng định nghĩa |

Ranh giới: không dạy lại CIDR, OSI, chuỗi chứng chỉ TLS hay object K8s. Chỗ cần thì nhắc một câu
và trỏ sang bài trên. Course này đi **xuống dưới** những bài đó.

---

## Lab và con số

Mọi số trong course là **đo trên lab** hoặc **trích nguồn cấp một** (RFC, man page, docs), ghi rõ tại chỗ.

- Lab cục bộ: Docker (colima, Linux VM) với network namespace, veth, bridge, iptables/nftables,
  `tc netem` (giả lập trễ/mất gói), `tcpdump`, FRRouting (dựng nhiều AS chạy BGP thật), CoreDNS/Unbound, nginx/HAProxy.
- Internet thật, chỉ đọc: `dig +trace`, `traceroute`, `whois` (RADb), RIPEstat API, PeeringDB API, `curl -w`.
  Máy lab đi ra Internet qua AS7552 (Viettel) — dùng làm ví dụ thật xuyên course.

---

## Chương 1 — Gói tin trên dây (tầng 2)

| Bài | Câu hỏi thật |
|---|---|
| net-01 Bóc một request HTTP từ `tcpdump` | 1 request `curl` sinh ra bao nhiêu gói, mỗi byte header nghĩa là gì? |
| net-02 Ethernet, MAC và switch học địa chỉ | Switch biết gửi frame ra cổng nào bằng cách nào, khi nào nó "phát loa" cho mọi cổng? |
| net-03 ARP: gói đầu tiên vì sao chậm | Vì sao request đầu tới một IP mới chậm hơn; failover VIP bằng gratuitous ARP chạy thế nào? |
| net-04 Bridge, veth, VLAN: dựng mạng bằng tay | Hai container nói chuyện với nhau qua những thiết bị ảo nào? |

## Chương 2 — IP và định tuyến

| Bài | Câu hỏi thật |
|---|---|
| net-05 MTU, phân mảnh và PMTUD | Vì sao `ping` được, SSH vào được, nhưng HTTPS treo ở bước handshake? |
| net-06 Router Linux bằng tay: bảng định tuyến và forwarding | Gói tin chọn đường ra sao khi máy có nhiều route và nhiều card mạng? |
| net-07 NAT và conntrack | Vì sao NAT gateway hết port, bảng conntrack đầy thì triệu chứng là gì? |
| net-08 ICMP và traceroute đọc cho đúng | Dòng `* * *` và độ trễ tăng vọt giữa traceroute có thật sự là chỗ hỏng không? |
| net-09 IPv6 khi chạy thật | SLAAC, dual-stack, Happy Eyeballs: vì sao app "tự nhiên" chậm 250 ms trên mạng IPv6 lỗi? |

## Chương 3 — Internet là mạng của các mạng (AS, ASN, BGP)

| Bài | Câu hỏi thật |
|---|---|
| net-10 AS và ASN: ai sở hữu mạng nào | ASN là gì, ai cấp (IANA → RIR → LIR), tra ra IP của mình thuộc AS nào? |
| net-11 BGP: các mạng thông báo đường cho nhau | Một UPDATE mang gì, AS_PATH dài dần ra sao, router chọn đường theo thứ tự nào? (lab FRR 3–4 AS) |
| net-12 Transit, peering và IXP | Vì sao gói tin từ Hà Nội tới server ở Hà Nội có lúc đi vòng qua Singapore? |
| net-13 Anycast: một IP ở trăm nơi | 1.1.1.1 và DNS root chạy ở hàng trăm điểm với cùng một IP bằng cách nào? |
| net-14 Khi BGP sai: hijack, leak và RPKI | YouTube 2008, Facebook 2021, route leak: chuyện gì xảy ra và RPKI chặn được tới đâu? |
| net-15 BGP trong cloud | ASN phía Amazon, BGP qua VPN/Direct Connect, ECMP và thứ tự ưu tiên route |

## Chương 4 — Tầng giao vận sâu

| Bài | Câu hỏi thật |
|---|---|
| net-16 TCP từ bên trong: sequence, ACK, retransmission | Mất 1% gói thì throughput giảm bao nhiêu, đo bằng `tc netem` |
| net-17 Flow control và congestion control | BDP, slow start, CUBIC vs BBR: vì sao tải file từ xa không dùng hết băng thông? |
| net-18 Đóng kết nối: TIME_WAIT, RST, keepalive | Vì sao server có 30.000 socket TIME_WAIT, half-open connection phát hiện bằng cách nào? |
| net-19 UDP và QUIC | Vì sao QUIC chạy trên UDP, 0-RTT và đổi mạng không rớt kết nối hoạt động thế nào? |

## Chương 5 — DNS sâu

| Bài | Câu hỏi thật |
|---|---|
| net-20 Phân giải từ root: `dig +trace` từng bước | Một lần phân giải hỏi bao nhiêu server, cache và negative cache nằm ở đâu? |
| net-21 DNS khi vận hành | Đổi IP mà khách vẫn vào server cũ vì TTL; CNAME ở apex; split-horizon; DNSSEC chặn được gì |

## Chương 6 — HTTP và TLS khi vận hành

| Bài | Câu hỏi thật |
|---|---|
| net-22 HTTP/1.1 → 2 → 3: head-of-line ở tầng nào | Đo cùng một trang qua 3 phiên bản trên mạng mất gói |
| net-23 TLS khi vận hành: SNI, ALPN, resumption, mTLS | Handshake tốn bao nhiêu RTT, LB định tuyến theo SNI ra sao? |

## Chương 7 — Mạng trong hệ thống

| Bài | Câu hỏi thật |
|---|---|
| net-24 Load balancer L4 và L7 từ bên trong | NAT vs DSR, consistent hashing, health check, draining: deploy làm rớt request ở đâu? |
| net-25 Proxy và chuỗi timeout | Keepalive pool, timeout lệch giữa các tầng sinh 502/504, `X-Forwarded-For`, PROXY protocol |
| net-26 CDN từ bên trong | Cache key, origin shield, anycast vs DNS-based routing |
| net-27 Mạng container và Kubernetes | Từ veth/bridge/iptables tới CNI, kube-proxy (iptables/IPVS), overlay VXLAN |
| net-28 Mạng cloud dưới nắp | VPC là overlay, security group stateful, vì sao không có ARP/broadcast thật trong VPC |

## Chương 8 — Debug và sự cố

| Bài | Câu hỏi thật |
|---|---|
| net-29 Bộ đồ nghề và quy trình khoanh vùng | `tcpdump` + BPF filter, `ss`, `dig`, `curl -w`, `mtr`: đi từ triệu chứng tới tầng hỏng |
| net-30 Capstone: dựng lại 6 sự cố | MTU blackhole, conntrack đầy, DNS TTL, SYN backlog, định tuyến bất đối xứng, BGP leak trong lab |
