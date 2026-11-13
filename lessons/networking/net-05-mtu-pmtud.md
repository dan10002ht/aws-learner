# Bài 5 — MTU, phân mảnh và PMTUD: ping được, HTTPS vẫn treo

## 1. Mục tiêu

Sau bài này bạn có thể:

- Từ một capture, phân biệt độ dài datagram IP, dữ liệu TCP và dữ liệu mà `ping -s` yêu cầu gửi.
- Dự đoán router chuyển nguyên gói, phân mảnh hay bỏ gói khi biết MTU cổng ra và cờ DF.
- Dùng hai probe sát nhau tìm ngưỡng MTU, đồng thời nêu điều phép đo ấy chưa chứng minh được.
- Chỉ ra bên nào phải nhận ICMP để sửa một kết nối đang treo ở chiều server trả dữ liệu.
- Đọc offset, MF và Identification để giải thích vì sao một datagram có thể thành ba mảnh thay vì hai.
- Chọn phép thử phân biệt PMTU black hole với lỗi TLS, rồi kiểm lại bằng chính request bị lỗi.

## 2. Triệu chứng

Một endpoint HTTPS trong mạng lab trả lời ping. Client gửi hai Echo Request, nhận đủ hai Echo Reply. Port TCP của server cũng trả SYN-ACK. Nhưng `curl` chỉ in đến `Client hello`, sau đó hết thời gian kết nối, không nhận được HTTP response. Giữ nguyên server, certificate, client và tuyến đường; chỉ bỏ luật chặn một loại ICMP trên hai router thì request thành công, tải đủ **8.192 byte**.

> **Đo trên lab.** Docker `alpine:3.20`, Linux `6.8.0-64-generic`, aarch64; hai đầu MTU 1.500 byte, chặng giữa 1.280 byte. `net-05/out/blackhole.txt` ghi ping nhận 2/2 nhưng curl thoát mã 28; `recovery.txt` ghi `http=200,bytes=8192`. Đo lại bằng `net-05/run.sh` trong bộ lab đi kèm. Đây là kết quả của topology này, không phải số đo trên một website Internet.

Bản chẩn đoán đầu tiên rất dễ nghe xuôi tai: **“Ping thông, port mở, vậy mạng ổn; sửa certificate hoặc tăng timeout TLS.”** Lab sẽ cho bản sai ấy chạy trước. Điều còn thiếu trong lập luận là ping nhỏ và handshake TCP chưa từng yêu cầu đường truyền chở một gói IP đầy MTU.

Bài trước dựng bridge và veth; ở đây dùng chúng làm dây nối giữa các network namespace — mỗi namespace là một ngăn mạng Linux có interface, route và socket riêng. Không cần học lại mô hình tầng: xem [[eng-osi-model]]. Phần bắt tay và certificate nằm ở [[eng-03-tcp-tls]]; bài này giải thích vì sao byte của bắt tay không tới được nơi nhận.

## ⏸ Dừng lại — đoán trước #1

Hai đầu đều thấy interface MTU 1.500. Chặng giữa chỉ chở được datagram IP 1.280 byte. TCP đã bắt tay xong. Kết luận nào được phép rút ra?

- (a) MSS đã thương lượng nên mọi TCP segment chắc chắn đi qua được mọi chặng.
- (b) TLS dùng port khác ping nên chỉ cần mở thêm port firewall.
- (c) Gói nhỏ đã qua được; vẫn phải kiểm gói lớn và phản hồi ICMP về bên gửi.
- (d) Router sẽ luôn tự chia gói lớn thành các mảnh vừa cổng ra.

## 3. Cơ chế

### 3.1 Giới hạn nằm ở cổng ra, không nằm ở tên giao thức ứng dụng

Đáp án là **(c)**. **MTU — maximum transmission unit — là giới hạn kích thước đơn vị dữ liệu mà một link có thể mang; khi đọc `ip link` trong lab này, đó là kích thước gói IP tối đa trên interface.** Nó không phải số byte JSON, không phải băng thông và không phải TCP MSS.

Một datagram IP là một gói có header IP cùng dữ liệu phía sau. Với MTU 1.500 của lab, tổng hai phần phải không vượt 1.500 byte nếu muốn đi nguyên vẹn qua link ấy. Header Ethernet không được cộng vào giới hạn IP này. Đừng lấy `length` của frame ở một capture rồi so trực tiếp với `mtu` mà chưa xác định công cụ đang báo tầng nào. [RFC 791 §3.1](https://www.rfc-editor.org/rfc/rfc791#section-3.1) định nghĩa Total Length bao gồm header IP và dữ liệu; bài sẽ dùng nghĩa đó khi viết “gói IP dài …”.

**PMTU — path MTU — là MTU nhỏ nhất dọc một đường đi cụ thể.** Trong topology C → R1 → R2 → S, các link lần lượt là 1.500, 1.280, 1.500 byte, nên giới hạn cho gói không phân mảnh là 1.280 byte. Hai đầu chỉ biết link của mình; chúng không suy ra được chặng giữa bằng cách đọc interface cục bộ. Đường về có thể khác đường đi, và sau một lần đổi tuyến PMTU cũng có thể đổi. [RFC 1191 §1–2](https://www.rfc-editor.org/rfc/rfc1191#section-2).

Khi nhận gói, router phải xét cổng **sắp gửi ra**. Một gói IP 1.500 byte đến từ link 1.500 vẫn hợp lệ ở đầu vào; nó chỉ vướng khi phải đi vào link 1.280. Muốn biết điểm bỏ gói phải nhìn cả ingress và egress, không chỉ nhìn interface của client.

Để giữ đúng quan hệ nhân quả, tách ba trường hợp IPv4:

| Gói so với MTU ra | DF | Router có thể làm gì? |
|---|---|---|
| Vừa cổng ra | Bất kỳ | Chuyển tiếp nếu các điều kiện route, TTL, firewall đều cho phép |
| Quá MTU | 0 | Phân mảnh nếu được phép và có đủ tài nguyên, hoặc bỏ vì nguyên nhân khác |
| Quá MTU | 1 | Không được phân mảnh; bỏ gói và phát thông báo lỗi phù hợp |

**DF — Don't Fragment — là bit IPv4 yêu cầu không phân mảnh datagram.** Đây là chỗ (d) sai: router không được chọn cách “giúp” bằng việc phớt lờ DF. Luật cờ và offset nằm trong [RFC 791 §3.1](https://www.rfc-editor.org/rfc/rfc791#section-3.1); xử lý gói quá MTU có DF nằm trong [RFC 1191 §4](https://www.rfc-editor.org/rfc/rfc1191#section-4).

### 3.2 PMTUD là một vòng phản hồi về nguồn đang gửi

**PMTUD — Path MTU Discovery — là quá trình bên gửi tìm giới hạn kích thước gói của đường đi bằng phản hồi từ mạng.** Với cơ chế IPv4 cổ điển, nguồn gửi datagram có DF. Nếu gặp cổng ra hẹp hơn, router bỏ datagram và báo ICMP Destination Unreachable, type 3 code 4: fragmentation needed and DF set. ICMP là giao thức báo lỗi và điều khiển ở tầng IP, không phải tên khác của ping; Echo Request/Reply chỉ là một phần của nó.

Thông báo này chứa MTU chặng gây lỗi theo RFC 1191 và phần gói gốc để nguồn xác định lưu lượng liên quan. Bên gửi giảm ước lượng PMTU rồi packetize lại — chia dòng byte thành các gói mới nhỏ hơn. Đây không phải router đã biến gói cũ thành fragment.

> **Nguồn.** RFC 1191 §2: *“the source host reduces its assumed PMTU for the path.”* ([RFC 1191](https://www.rfc-editor.org/rfc/rfc1191#section-2)). Phản hồi phải quay về nguồn của datagram quá lớn. Với flight TLS từ S về C, nguồn ấy là S.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 700" role="img" aria-labelledby="net05-path-t net05-path-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto">
<title id="net05-path-t">PMTUD phản hồi về bên gửi</title>
<desc id="net05-path-d">C R1 R2 S cố định; TCP và ClientHello nhỏ đi qua. Gói 1500 DF bị R2 bỏ ở cổng MTU1280. Firewall OUTPUT chặn ICMP, retransmit lại mất. Gỡ luật cho ICMP về S, S hạ PMTU rồi gửi gói vừa MTU tới C.</desc>
<defs><marker id="net05-path-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<rect x="5" y="38" width="110" height="600" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="60" y="62" font-size="16" text-anchor="middle" fill="currentColor">C</text>
<text x="60" y="84" font-size="13" text-anchor="middle" fill="currentColor">10.5.1.2</text>
<rect x="220" y="38" width="110" height="600" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="275" y="62" font-size="16" text-anchor="middle" fill="currentColor">R1</text>
<text x="275" y="84" font-size="13" text-anchor="middle" fill="currentColor">10.5.12.1</text>
<rect x="435" y="38" width="110" height="600" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="490" y="62" font-size="16" text-anchor="middle" fill="currentColor">R2</text>
<text x="490" y="84" font-size="13" text-anchor="middle" fill="currentColor">10.5.12.2</text>
<rect x="645" y="38" width="110" height="600" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="700" y="62" font-size="16" text-anchor="middle" fill="currentColor">S</text>
<text x="700" y="84" font-size="13" text-anchor="middle" fill="currentColor">10.5.2.2</text>
<path d="M115 104 H220" stroke="currentColor" fill="none"/>
<text x="167.5" y="92" font-size="13" text-anchor="middle" fill="currentColor">MTU 1500</text>
<path d="M330 104 H435" stroke="currentColor" fill="none"/>
<text x="382.5" y="92" font-size="13" text-anchor="middle" fill="currentColor">MTU 1280</text>
<path d="M545 104 H645" stroke="currentColor" fill="none"/>
<text x="595.0" y="92" font-size="13" text-anchor="middle" fill="currentColor">MTU 1500</text>
<g data-step="1">
<path d="M115 154 L220 154" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="167.5" y="142" font-size="13" text-anchor="middle" fill="currentColor">SYN 60</text><path d="M330 154 L435 154" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="382.5" y="142" font-size="13" text-anchor="middle" fill="currentColor">SYN 60</text><path d="M545 154 L645 154" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="595.0" y="142" font-size="13" text-anchor="middle" fill="currentColor">SYN 60</text><path d="M115 226 L220 226" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="167.5" y="214" font-size="13" text-anchor="middle" fill="currentColor">Hello 569</text><path d="M330 226 L435 226" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="382.5" y="214" font-size="13" text-anchor="middle" fill="currentColor">Hello 569</text><path d="M545 226 L645 226" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="595.0" y="214" font-size="13" text-anchor="middle" fill="currentColor">Hello 569</text>
<path d="M645 178 L545 178" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="595.0" y="166" font-size="13" text-anchor="middle" fill="currentColor">SYN-ACK 60</text><path d="M435 178 L330 178" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="382.5" y="166" font-size="13" text-anchor="middle" fill="currentColor">SYN-ACK 60</text><path d="M220 178 L115 178" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="167.5" y="166" font-size="13" text-anchor="middle" fill="currentColor">SYN-ACK 60</text><path d="M115 202 L220 202" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="167.5" y="190" font-size="13" text-anchor="middle" fill="currentColor">ACK 52</text><path d="M330 202 L435 202" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="382.5" y="190" font-size="13" text-anchor="middle" fill="currentColor">ACK 52</text><path d="M545 202 L645 202" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="595.0" y="190" font-size="13" text-anchor="middle" fill="currentColor">ACK 52</text>
</g>
<g data-step="2" data-until="2">
<path d="M645 260 L545 260" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="595" y="248" font-size="13" text-anchor="middle" fill="currentColor">1500 DF</text><rect x="442" y="270" width="96" height="27" rx="5" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor"/><text x="490" y="289" font-size="13" text-anchor="middle" fill="currentColor">gói bị bỏ</text>
</g>
<g data-step="3" data-until="3">
<path d="M545 334 L580 334" stroke="#f43f5e" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="595" y="290" font-size="13" text-anchor="middle" fill="currentColor">ICMP</text><text x="595" y="312" font-size="13" text-anchor="middle" fill="currentColor">3/4 · 1280</text><rect x="580" y="320" width="12" height="30" rx="5" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor"/><text x="595" y="370" font-size="13" text-anchor="middle" fill="currentColor">OUTPUT DROP</text><path d="M645 410 L545 410" stroke="#f43f5e" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="595" y="398" font-size="13" text-anchor="middle" fill="currentColor">1500 DF</text><rect x="442" y="421" width="96" height="27" rx="5" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor"/><text x="490" y="440" font-size="13" text-anchor="middle" fill="currentColor">lại bị bỏ</text><text x="700" y="464" font-size="13" text-anchor="middle" fill="currentColor">chưa biết</text><text x="700" y="485" font-size="13" text-anchor="middle" fill="currentColor">MTU 1280</text><text x="60" y="464" font-size="13" text-anchor="middle" fill="currentColor">curl treo</text><text x="60" y="485" font-size="13" text-anchor="middle" fill="currentColor">Client hello</text>
</g>
<g data-step="4">
<path d="M545 334 L645 334" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="595" y="290" font-size="13" text-anchor="middle" fill="currentColor">ICMP</text><text x="595" y="312" font-size="13" text-anchor="middle" fill="currentColor">3/4 · 1280</text><text x="595" y="370" font-size="13" text-anchor="middle" fill="currentColor">bỏ luật DROP</text>
</g>
<g data-step="5">
<text x="700" y="525" font-size="13" text-anchor="middle" fill="currentColor">PMTU 1280</text><path d="M645 558 L545 558" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="595.0" y="546" font-size="13" text-anchor="middle" fill="currentColor">IP ≤1280</text><path d="M435 558 L330 558" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="382.5" y="546" font-size="13" text-anchor="middle" fill="currentColor">IP ≤1280</text><path d="M220 558 L115 558" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#net05-path-a)"/><text x="167.5" y="546" font-size="13" text-anchor="middle" fill="currentColor">IP ≤1280</text>
</g>
<g data-step="6">
<text x="380" y="674" font-size="15" text-anchor="middle" fill="currentColor">Chặn ICMP → lặp gói quá lớn. Cho ICMP qua → nguồn giảm PMTU.</text>
</g>
</svg>
<step-note data-step="1">SYN/SYN-ACK dài 60 byte IP, ACK 52 và ClientHello 569 đều dưới MTU 1280 (log blackhole-capture). Bắt tay TCP hoàn tất rồi gửi ClientHello vẫn chưa thử được gói đầy MTU của hai đầu.</step-note>
<step-note data-step="2">S phát IP 1500 có DF. R2 cần đưa gói vào link MTU 1280 nên phải loại; gói bị loại biến mất ở bước sau, không tới R1.</step-note>
<step-note data-step="3">Luật OUTPUT tại R2 chặn ICMP type 3 code 4 trước khi tới S. S chưa học giới hạn, gửi lại cùng vùng byte bằng IP 1500 rồi lại mất; curl dừng ở Client hello.</step-note>
<step-note data-step="4">Bỏ luật chặn trên các router, mở kết nối mới như lab recovery: lần phát IP 1500 đầu vẫn kích hoạt ICMP, nhưng lần này thông báo MTU 1280 tới đúng bên gửi S.</step-note>
<step-note data-step="5">S lưu PMTU 1280 và gửi lại dữ liệu bằng các gói IP vừa đường; capture recovery có IP 1280 với TCP data 1228. Đây là packetization ở nguồn, không phải router phân mảnh.</step-note>
<step-note data-step="6">TCP nối được chỉ chứng minh gói nhỏ đi được. Vòng phản hồi ICMP hoạt động mới giúp nguồn sửa kích thước gói lớn; cùng URL sau sửa trả HTTP 200 và 8192 byte.</step-note>
</step-flow>

Hình dùng địa chỉ và MTU của lab; nhãn SYN/Hello là tổng độ dài IP trong capture. R1 có thêm địa chỉ phía client `10.5.1.1`, R2 có thêm địa chỉ phía server `10.5.2.1`. Firewall chặn ICMP nằm ở OUTPUT của router, không phải trên link mang dữ liệu TLS.

**PMTU black hole** là tình trạng gói quá lớn bị loại nhưng thông tin cần để điều chỉnh kích thước không tới được nguồn. Nguồn chỉ thấy không được ACK, có thể gửi lại cùng vùng byte bằng gói vẫn quá lớn. Nếu đoạn trước đã tới, còn đoạn sau bị chặn vì kích thước, ứng dụng nhìn thấy kết nối tồn tại nhưng dữ liệu không tiến triển. [RFC 2923 §2.1](https://www.rfc-editor.org/rfc/rfc2923#section-2.1) bàn về đường mất thông báo lỗi; lab §4 cho thấy chính sự lặp lại ấy.

Điểm thực dụng: firewall chiều client cho phép ping không chứng minh được ICMP error về **server** đang thông. Cần hỏi “gói lớn đi chiều nào, router nào loại, báo lỗi trở về IP nguồn nào?”. Chỉ sửa firewall của máy chạy curl có thể không chạm vào đường lỗi.

### 3.3 MSS thương lượng ở hai đầu không đo được chặng giữa

**MSS — maximum segment size — là số byte dữ liệu TCP tối đa mà một đầu thông báo có thể nhận trong một segment.** Nó nằm trong option của SYN, không phải chiều dài cả datagram IP. C thông báo MSS cho lưu lượng **S → C**; S thông báo MSS cho **C → S**. Không có router trung gian nào tham gia cuộc thương lượng ấy để nói rằng link của nó chỉ có MTU 1.280.

> **Đo trên lab.** `blackhole-capture.txt` ghi cả SYN và SYN-ACK có `mss 1460`. Sau đó S phát gói IP `length 1500`, TCP `length 1448`; cùng `seq 1:1449` xuất hiện lại khi curl chưa hoàn tất TLS. Con số 1.460 là option đã quảng bá, còn 1.448 là dữ liệu thực tế của segment này. Đo lại: chạy script rồi đọc capture phía `right` của R2.

Tại sao không gửi đủ 1.460 byte dữ liệu? **TCP option** là phần mở rộng header TCP; timestamps trong lab làm header của các gói dữ liệu đang xét dài hơn header cố định. Với IPv4 không option: header IP cố định 20 byte, TCP cố định 20 byte; ở segment đang xét, TCP còn thêm 12 byte option. Ngân sách còn `1500 − 20 − 20 − 12 = 1448`. Các kích thước header cố định và cách xử lý option được nêu trong [RFC 6691 §2](https://www.rfc-editor.org/rfc/rfc6691#section-2).

MSS option được tính bằng MTU trừ **header cố định**; khi thực sự gửi, bên gửi phải trừ thêm option mà nó sử dụng. Vì thế “MSS 1.460 nghĩa là mọi packet chở 1.460 byte application data” sai hai lần: option ăn chỗ, và dữ liệu TCP của HTTPS còn chứa cấu trúc TLS, không chỉ body HTTP.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 275" role="img" aria-labelledby="net05-size-t net05-size-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net05-size-t">MSS và dữ liệu thực khác nhau bởi options</title>
<desc id="net05-size-d">Thanh gói IP gồm IP 20, TCP 32 và dữ liệu 1228 byte. Header được phóng đại, phần dữ liệu là phần còn lại của ngân sách.</desc>
<defs><marker id="net05-size-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<text x="15" y="24" font-size="16" text-anchor="start" fill="currentColor">Cùng một ngân sách IP: 1280 byte</text>
<rect x="15" y="48" width="55" height="48" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/>
<text x="42.5" y="77" font-size="14" text-anchor="middle" fill="currentColor">IP</text>
<rect x="70" y="48" width="70" height="48" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor"/>
<text x="105.0" y="77" font-size="14" text-anchor="middle" fill="currentColor">TCP</text>
<rect x="140" y="48" width="365" height="48" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/>
<text x="322.5" y="77" font-size="14" text-anchor="middle" fill="currentColor">Dữ liệu TCP: 1228</text>
<text x="15" y="122" font-size="14" text-anchor="start" fill="currentColor">20</text>
<text x="75" y="122" font-size="14" text-anchor="start" fill="currentColor">32</text>
<text x="15" y="158" font-size="14" text-anchor="start" fill="currentColor">TCP 32 = cố định 20 + options 12</text>
<text x="15" y="190" font-size="14" text-anchor="start" fill="currentColor">MSS option: 1280 − 20 − 20 = 1240</text>
<text x="15" y="222" font-size="14" text-anchor="start" fill="currentColor">Payload thực: 1240 − 12 = 1228</text>
<text x="15" y="255" font-size="13" text-anchor="start" fill="currentColor">Độ rộng header được phóng đại để đọc.</text>
</svg>

> **Suy luận.** Với PMTU 1.280 của lab, IPv4 không option và TCP có 12 byte option, payload TCP tối đa của loại gói này là `1280 − 20 − 32 = 1228` byte. Hình trên minh hoạ ngân sách ấy; đây không phải lời khẳng định mọi segment của phiên đều dài 1.228. Kiểm bằng tổng độ dài IP, header và TCP data trong `recovery-capture.txt`.

MSS cũng không phải một giá trị liên tục “thương lượng lại” mỗi khi đổi route. Hai đầu đã quảng bá ở SYN; sender còn phải tôn trọng PMTU ước lượng trong lúc gửi. Giảm PMTU tại sender có thể làm payload thực nhỏ lại mà không cần bắt tay lại TCP. [RFC 1191 §6.4](https://www.rfc-editor.org/rfc/rfc1191#section-6.4).

## ⏸ Dừng lại — đoán trước #2

C gửi ping với `-M dont -s 2000`. Interface đầu tiên có MTU 1.500; link tiếp theo là 1.280. Không có IP option. Bạn dự đoán capture ở link 1.280 sẽ thấy gì?

- (a) Luôn đúng hai fragment, vì chỉ có một datagram gốc.
- (b) Có thể ba fragment: nguồn đã chia một lần, router chia lại một mảnh.
- (c) Một gói 2.000 byte vì tắt DF là tắt kiểm MTU.
- (d) TCP tự giảm MSS nên ping không bị chia.

### 3.4 Phân mảnh giữ ranh giới cũ, không gom lại để chia đẹp hơn

Đáp án **(b)** là kết quả đã đo ở topology này. **Fragment — mảnh IP — là một phần datagram mang header IP riêng để đích ráp lại datagram ban đầu.** Phân mảnh IPv4 dùng Identification để nhận diện nhóm, Fragment Offset để đặt phần dữ liệu vào đúng vị trí và MF để nói còn mảnh phía sau. **MF — More Fragments — bằng 1 nghĩa là đây chưa phải mảnh cuối.** Các định nghĩa nằm trong [RFC 791 §3.1–3.2](https://www.rfc-editor.org/rfc/rfc791#section-3.2).

`ping -s 2000` là 2.000 byte dữ liệu Echo, chưa gồm ICMP header 8 byte. IP payload cần chở là 2.008 byte. Trước khi tới router, C đã phải đặt nó lên interface MTU 1.500. Không có IP option, mỗi mảnh chừa 20 byte header IP. Payload của mảnh chưa cuối phải chia hết cho 8 vì offset trên header dùng đơn vị 8 byte. C chia thành 1.480 và 528 byte.

R1 nhận mảnh mang 1.480 byte payload. Cổng ra 1.280 không chở được `20 + 1480`. Nó chia mảnh này tiếp thành 1.256 và 224 byte: `floor((1280 − 20) / 8) × 8 = 1256`. Mảnh 528 byte đã vừa, đi nguyên. R1 không gom các mảnh thành datagram gốc rồi tối ưu lại thành hai mảnh. Việc ráp lại thuộc về đích của datagram, theo [RFC 791 §2.3](https://www.rfc-editor.org/rfc/rfc791#section-2.3).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 375" role="img" aria-labelledby="net05-frag-t net05-frag-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net05-frag-t">Router phân mảnh lại mảnh đầu</title>
<desc id="net05-frag-d">C đã chia payload 2008 thành 1480 và 528. R1 chia tiếp mảnh 1480 thành 1256 và 224. Ba mảnh tới R2 có offset trên header 0,157,185.</desc>
<defs><marker id="net05-frag-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<text x="15" y="24" font-size="16" text-anchor="start" fill="currentColor">Payload gốc: 2008 byte</text>
<rect x="15" y="42" width="480" height="28" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="255" y="62" font-size="14" text-anchor="middle" fill="currentColor">C chia: 1480 + 528</text>
<path d="M255 70 L255 125" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net05-frag-a)"/>
<rect x="15" y="125" width="38" height="40" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/>
<text x="34" y="150" font-size="13" text-anchor="middle" fill="currentColor">20</text>
<rect x="53" y="125" width="300" height="40" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/>
<text x="365" y="150" font-size="13" text-anchor="start" fill="currentColor">0 · 1256 · MF=1</text>
<rect x="15" y="185" width="38" height="40" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/>
<text x="34" y="210" font-size="13" text-anchor="middle" fill="currentColor">20</text>
<rect x="53" y="185" width="54" height="40" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/>
<text x="365" y="210" font-size="13" text-anchor="start" fill="currentColor">157 · 224 · MF=1</text>
<rect x="15" y="245" width="38" height="40" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/>
<text x="34" y="270" font-size="13" text-anchor="middle" fill="currentColor">20</text>
<rect x="53" y="245" width="126" height="40" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/>
<text x="365" y="270" font-size="13" text-anchor="start" fill="currentColor">185 · 528 · MF=0</text>
<text x="15" y="320" font-size="14" text-anchor="start" fill="currentColor">Nhãn: offset trên header · payload · MF</text>
<text x="15" y="350" font-size="13" text-anchor="start" fill="currentColor">Payload cùng tỉ lệ; header phóng đại.</text>
</svg>

**Offset hiển thị không phải lúc nào cũng cùng đơn vị.** Trên header, ba offset là 0, 157 và 185, vì `1256 / 8 = 157`, `1480 / 8 = 185`. Trong output `tcpdump` của lab, chúng được in theo **byte**: 0, 1.256 và 1.480. Nhầm hai kiểu hiển thị làm bạn tính sai vị trí mảnh mặc dù capture không hề hỏng.

Ở chiều reply, S đã học PMTU trong thí nghiệm HTTPS trước đó. Capture thấy reply chia thành hai mảnh IP dài 1.276 và 772 byte; đừng dùng số mảnh của reply để sửa lại lời giải request. State đã học và vị trí phân mảnh khác nhau là đủ tạo ra kết quả khác nhau. Riêng việc cache là nguyên nhân trực tiếp của cách chia reply được ghi ở mức suy luận trong hồ sơ nguồn; capture chỉ chứng minh kích thước hai mảnh, không ghi lời giải thích nội bộ của kernel.

Phân mảnh còn tạo một điều kiện thành công chung: thiếu một mảnh thì không có datagram hoàn chỉnh để giao lên trên. Điều đó không đồng nghĩa “TCP không bao giờ đi cùng phân mảnh” hay “mất một fragment sẽ luôn được IP gửi lại”; cơ chế ráp IP không phải giao thức truyền lại. TCP có thể truyền lại dữ liệu của nó, còn UDP hay ICMP cần hành vi riêng của ứng dụng. Lab này đo Echo, không suy ra thông lượng TCP từ số mảnh.

### 3.5 Vì sao lại treo ở TLS, và tại sao SSH chưa đủ làm bằng chứng

TLS handshake là dữ liệu chạy trên TCP; một TLS message không có quan hệ một-một bắt buộc với một TCP segment. Khi server trả flight chứa dữ liệu handshake lớn hơn phần còn lại của PMTU, sender có thể tạo segment đầy kích thước mà nó đang cho là hợp lệ. Trong lab, phía server phát một segment IP 1.500 và một segment IP 709 byte. Segment nhỏ qua được không lấp được vùng byte còn thiếu ở đầu dòng TCP, nên TLS không tiến tiếp. `blackhole-capture.txt` còn có ACK và SACK — selective acknowledgment, thông báo các vùng byte đã nhận ngoài thứ tự — theo [RFC 2018](https://www.rfc-editor.org/rfc/rfc2018); cơ chế truyền lại đầy đủ thuộc bài 16.

> **Suy luận.** Nhìn thấy cùng sequence range bị gửi lại, gói có DF dài 1.500 vượt link 1.280, và thay đúng luật ICMP làm request chạy được là bằng chứng hội tụ cho PMTU black hole của lab. Một dòng `curl: (28)` đứng riêng không xác định được nguyên nhân: timeout còn có thể do server hoặc firewall khác.

SSH cũng chạy trên TCP. Một phiên chỉ gửi vài phím có thể không chạm ngưỡng; copy file qua chính phiên ấy có thể bộc lộ lỗi. **Chưa đo SSH trong lab này**; đây là dự đoán có điều kiện theo kích thước segment, không phải cam kết mọi SSH handshake sẽ thành công. Certificate ngắn hơn, phiên TLS resumed hoặc request có kích thước khác cũng có thể làm triệu chứng đổi chỗ. Không lấy “thường treo ở handshake” biến thành quy luật của TLS.

### 3.6 Sửa vòng phản hồi trước, dùng giải pháp thu hẹp có điều kiện

Lab sửa bằng cách cho ICMP fragmentation-needed của các router đi qua về nguồn, rồi thử lại HTTPS. Nếu hạ interface MTU ở host để né, bạn đang đổi giới hạn của mọi lưu lượng qua interface ấy. Nếu cấu hình route MTU, phạm vi hẹp hơn nhưng vẫn là một giả định vận hành cần kiểm khi route đổi. Bài 6 sẽ đọc trường route này cùng gateway và interface.

**MSS clamping** là sửa MSS option trong TCP SYN khi gói qua thiết bị trung gian để endpoint tạo segment nhỏ hơn. Theo [iptables-extensions(8), TCPMSS](https://man7.org/linux/man-pages/man8/iptables-extensions.8.html), luật này tác động vào SYN. Nó có thể là cách xử lý cho một tunnel biết trước ngân sách MTU, nhưng chỉ chạm TCP, không sửa UDP hay ICMP, và phải xét đúng chiều SYN quảng bá cho chiều dữ liệu cần hạn chế. Lab này **chưa đo clamping**; muốn kiểm, giữ ICMP bị chặn, thay MSS trên đường SYN rồi mở kết nối mới, đối chiếu MSS hai phía và request gốc. Không gắn nhãn “đã sửa MTU” chỉ vì HTTPS chạy sau một luật TCPMSS.

**PLPMTUD — Packetization Layer PMTU Discovery — là tìm MTU ở lớp đóng gói dữ liệu bằng probe và phản hồi giao vận thay vì chỉ phụ thuộc ICMP.** Linux có `net.ipv4.tcp_mtu_probing`: tài liệu định nghĩa 0 tắt, 1 bật khi phát hiện ICMP black hole, 2 luôn bật. [Linux IP sysctl, tcp_mtu_probing](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html). Không đổi sysctl ấy trong thí nghiệm A/B này; chưa đo thời gian phục hồi hay hiệu quả của từng mode. RFC 8899 mô tả [DPLPMTUD cho datagram transports](https://www.rfc-editor.org/rfc/rfc8899), không phải lời đảm bảo mọi chương trình UDP tự làm được.

Với IPv6, không mang nguyên chuyện DF và router fragmentation sang. Router IPv6 không phân mảnh giúp nguồn ([RFC 8200 §4.5](https://www.rfc-editor.org/rfc/rfc8200#section-4.5)); ICMPv6 Packet Too Big thông báo MTU gây lỗi, nguồn điều chỉnh theo [RFC 8201 §3–4](https://www.rfc-editor.org/rfc/rfc8201#section-3). Phần thực nghiệm IPv6 để bài 9. Ở đây MTU 1.280 là tham số **lab IPv4**, không phải bằng chứng đã thử IPv6.

## 4. Lab

### 4.1 Dựng đúng nút thắt, giữ log và thứ tự state

Bộ lab đặt trong `net-lab/net-05/`, gồm `run.sh`, `inside.sh`, `server.py`, `src/` và `out/`. Trên máy tác giả, thư mục này ở `~/projects/net-lab/net-05/`. `run.sh` tạo container `net05-lab`, cài công cụ, chạy script bên trong và dùng trap để xoá container kể cả khi lệnh đo thất bại. Container cần quyền dựng namespace; chỉ script này dùng `--privileged`, không thay route hay sysctl của máy host. Không chạy các lệnh `ip netns` ở host macOS.

```bash
cd ~/projects/net-lab/net-05
./run.sh
```

Các lệnh trong các mục sau là phần thao tác của `inside.sh`, chạy **trong container** khi các namespace còn tồn tại; script đã tự thực hiện chúng. Muốn đi từng bước, đọc hoặc tách `inside.sh` trước khi chạy, vì container được dọn ngay khi `run.sh` kết thúc. Không thể `docker exec` vào container đã dọn để lặp một lệnh đơn lẻ.

Script nối C `10.5.1.2/24` với R1 `10.5.1.1/24`; R1 `10.5.12.1/24` với R2 `10.5.12.2/24`; R2 `10.5.2.1/24` với S `10.5.2.2/24`. Đặt MTU của cả hai đầu link giữa là 1.280, các link ngoài 1.500. Hai router bật forwarding và có route hai phía; hai host có default route về router cạnh mình. Không dùng NAT.

Server dùng Python HTTPS với certificate tự ký tạo tại chỗ, khoá RSA 4.096 bit để tạo flight handshake đủ lớn trong thí nghiệm. Script chờ socket listen trước khi đo; nếu chưa listen thì không lấy `Connection refused` làm lỗi MTU. `curl -k` chỉ bỏ kiểm certificate của **server tự ký này**; không sửa hoặc khuyến nghị tắt xác thực ở ứng dụng thật. Script xoá key/certificate sau lượt đo thành công.

TSO/GSO/GRO — các cơ chế gộp hoặc chia gói ngoài điểm capture — được tắt trên các veth bằng `ethtool -K` để kích thước segment dễ đọc. Checksum offload là chuyện riêng; capture có thể in `incorrect` vì đang quan sát trước khi checksum hoàn tất. Thí nghiệm này không dùng nhãn checksum ấy làm bằng chứng lỗi đường truyền. Các công tắc offload: [ethtool(8), -K](https://man7.org/linux/man-pages/man8/ethtool.8.html).

### 4.2 Cho bản sai chạy trước: ping nhỏ xanh, TLS không xong

Trên cả hai router, script chỉ chặn thông báo fragmentation-needed **do router phát ra**, không chặn Echo:

```bash
ip netns exec net05-r1 iptables -A OUTPUT -p icmp \
  --icmp-type fragmentation-needed -j DROP
ip netns exec net05-r2 iptables -A OUTPUT -p icmp \
  --icmp-type fragmentation-needed -j DROP
ip netns exec net05-c ping -c 2 -s 56 10.5.2.2
ip netns exec net05-c curl -vk --connect-timeout 2 --max-time 4 \
  https://10.5.2.2:8443/
```

Trích các dòng quyết định từ `out/blackhole.txt`:

```text
2 packets transmitted, 2 received, 0% packet loss, time 1050ms
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
curl_exit=28
```

Ở đây 2 giây là `--connect-timeout` do ta đặt, 4 giây là trần toàn lệnh; curl tính cả TLS vào giai đoạn kết nối nên có thể kết thúc trước trần 4 giây. Đây là ngân sách thí nghiệm, không phải timeout mặc định của giao thức. Trong log còn có thời gian cụ thể của lượt chạy, không dùng nó để suy ra RTT Internet.

Đọc `blackhole-capture.txt` ở interface `right` của R2: SYN/SYN-ACK có MSS 1.460, ClientHello đi qua dưới ngưỡng, rồi server phát `seq 1:1449` nhiều lần. Các gói IP 1.500 đều mang DF. **Có TCP handshake không có nghĩa là mọi byte sau đó đã đi được.**

### 4.3 Cho ICMP quay về, thử lại đúng URL

```bash
ip netns exec net05-r1 iptables -F OUTPUT
ip netns exec net05-r2 iptables -F OUTPUT
ip netns exec net05-c curl -sk --max-time 4 -o /dev/null \
  -w 'http=%{http_code},bytes=%{size_download}\n' https://10.5.2.2:8443/
ip -n net05-s route get 10.5.1.2
```

`-F OUTPUT` chỉ phù hợp ở hai namespace lab có chain do script này tạo. Khi vận hành thật, xoá đúng luật gây lỗi, không flush firewall đang dùng. Trích từ `out/recovery.txt`:

```text
http=200,bytes=8192
10.5.1.2 via 10.5.2.1 dev s0 src 10.5.2.2 uid 0
```

Dòng kế trong cùng file có `mtu 1280` và thời gian hết hạn cache. File `recovery-capture.txt` giữ ICMP trả về server và các gói sau điều chỉnh. Việc endpoint giữ route PMTU exception nghĩa là lượt đo kế có state; muốn A/B sạch, chạy lại toàn bộ script để dựng namespace mới, không chỉ chèn lại luật chặn rồi dùng kết quả cũ.

### 4.4 Tìm biên bằng hai gói chỉ lệch một byte

Script thêm địa chỉ `10.5.2.3` trên S để chưa dùng PMTU exception đã học với `.2`, rồi chạy:

```bash
ip netns exec net05-c ping -c 1 -W 1 -M do -s 1252 10.5.2.3
ip netns exec net05-c ping -c 1 -W 1 -M do -s 1253 10.5.2.3
ip -n net05-c route get 10.5.2.3
```

Trích `out/boundary.txt`:

```text
PING 10.5.2.3 (10.5.2.3) 1252(1280) bytes of data.
PING 10.5.2.3 (10.5.2.3) 1253(1281) bytes of data.
From 10.5.1.1 icmp_seq=1 Frag needed and DF set (mtu = 1280)
```

`-M do` đặt chính sách PMTUD không cho phân mảnh, nhưng còn chịu kiểm PMTU đã biết của kernel, theo [ping(8), -M](https://man7.org/linux/man-pages/man8/ping.8.html). Sau khi học ngưỡng, probe khác có thể bị từ chối ngay tại nguồn với `message too long`; đừng mặc định mọi lỗi sau đều do router vừa trả ICMP. Muốn biết lỗi từ đâu, đối chiếu IP nguồn và capture.

Payload 1.252 cộng ICMP 8 và IP 20 vừa 1.280; payload 1.253 tạo IP 1.281 nên không vừa. Đây là **suy luận từ probe và công thức header**, áp dụng cho đường đang đo, IPv4 không option. Nó không chứng minh server-to-client có cùng PMTU nếu hai chiều khác tuyến, cũng không chứng minh UDP port khác sẽ đi cùng route khi có policy hay cân bằng tải.

### 4.5 Cho phép phân mảnh và đếm ở giữa đường

```bash
ip netns exec net05-r2 tcpdump -n -vv -i mid2 \
  'ip[6:2] & 0x3fff != 0'
ip netns exec net05-c ping -c 1 -W 1 -M dont -s 2000 10.5.2.2
```

Trong script, tcpdump chạy nền và ghi `out/fragments.txt`; biểu thức chọn gói có MF hoặc offset khác 0. Từ file ấy, lọc **request C → S**, không cộng lẫn reply. Ba gói có IP Total Length lần lượt 1.276, 244, 548 và offset in theo byte là 0, 1.256, 1.480. Cùng Identification xác nhận chúng thuộc một datagram; MF lần lượt bật, bật, tắt.

`fragment-ping.txt` giữ kết quả Echo. Khi phân mảnh được phép, gói lớn có thể đi tới đích nhờ nhiều mảnh; điều đó không biến probe thành phép đo “PMTU ít nhất 2.028”. Khái niệm PMTU ở đây dùng cho datagram đi **không phân mảnh**. Giữ cả file capture và câu lệnh, vì chỉ chép dòng ping thành công sẽ che mất cơ chế mà ta cần tìm.

## 5. Tính tay

### 5.1 Một byte thay đổi kết quả

**Đề.** Với đường lab, IPv4 không option và ICMP Echo header 8 byte, `ping -s 1252` tạo gói bao nhiêu byte? Tăng lên 1.253 thì sao? Có thể dùng số 1.252 làm MSS TCP không?

**Lời giải.** Tổng IP là `1252 + 8 + 20 = 1280`, vừa MTU nhỏ nhất. Tăng một byte thành 1.281, DF khiến router không thể phân mảnh. Không dùng 1.252 làm MSS TCP: TCP có header cố định 20 thay vì ICMP 8, nên MSS theo header cố định là `1280 − 20 − 20 = 1240`. Nếu TCP data packet có thêm 12 byte option thì dữ liệu tối đa còn 1.228. Các số là suy luận từ tham số lab và RFC 6691; không phải bốn giá trị đo độc lập.

### 5.2 Tại sao có ba mảnh, và tốn thêm bao nhiêu header?

**Đề.** Request Echo có 2.000 byte dữ liệu; IP không option, link đầu 1.500, link giữa 1.280. Tính payload, Total Length, offset trên header và số byte header tăng thêm khi qua link giữa.

**Lời giải.** IP payload gốc 2.008. C chia payload 1.480 + 528; R1 chia phần 1.480 thành 1.256 + 224. Ba mảnh ở giữa mang payload 1.256, 224, 528; cộng 20 mỗi mảnh được Total Length 1.276, 244, 548. Offset trên header 0, 157, 185. Tổng header IP là `3 × 20 = 60`, hơn datagram chưa chia `60 − 20 = 40` byte. Tổng byte IP trên link giữa `1276 + 244 + 548 = 2068`, so với datagram gốc `2008 + 20 = 2028`. Chưa cộng Ethernet, ACK hay bất kỳ retransmission nào. Đây là phép đếm byte, không phải phép đo throughput.

### 5.3 Một tunnel ăn ngân sách ở đâu?

**Đề giả định, chưa dựng tunnel.** Link ngoài chở tối đa 1.500 byte IP. Một tunnel thêm tổng cộng 60 byte phía ngoài gói IP bên trong, không có padding biến đổi. Muốn không phân mảnh ở link ngoài, inner MTU và inner TCP payload tối đa là bao nhiêu, với IPv4 không option và TCP options 12 byte?

**Lời giải.** Inner MTU tối đa `1500 − 60 = 1440`. MSS theo header cố định `1440 − 20 − 20 = 1400`; TCP payload của loại gói có option đang xét `1400 − 12 = 1388`. 60 là **giả thiết bài tính**, không phải overhead chung cho mọi VPN. Với tunnel thật phải đọc cấu hình encapsulation, thêm padding/extension nếu có, capture trước và sau tunnel, rồi mới đặt con số.

## 6. Chuyển giao

1. Health check gửi response rỗng luôn xanh, API trả danh sách dài lại timeout. Bạn cần đo đại lượng nào ngoài status code để kiểm giả thuyết MTU? Nêu điểm capture cho hai chiều.
2. Sau khi sửa firewall, lần gọi đầu chậm nhưng các lần sau qua ngay. Bạn làm thí nghiệm nào phân biệt việc học PMTU với TLS session resumption mà không thay cả hai cùng lúc?
3. Client gửi upload lớn được, download lớn bị treo. Có thể kết luận ICMP phía client đang bị chặn không? Hãy chỉ ra bên phát gói quá lớn và nơi cần tìm thông báo lỗi.
4. Capture ở một máy báo packet lớn hơn interface MTU nhưng capture ở router không có. Bạn cần kiểm offload nào và đặt thêm điểm capture ở đâu trước khi kết luận link đang mang jumbo packet?
5. Một nhóm giảm MSS và HTTPS chạy được, nhưng UDP telemetry vẫn mất ở một ngưỡng payload. Giải thích phạm vi tác dụng của thay đổi và thiết kế một probe phù hợp với UDP.
6. Một đích anycast đổi đường sau khi endpoint đã học PMTU. Chỉ một số kết nối treo; ping một kích thước cố định vẫn xanh. Thiết kế bộ thí nghiệm tối thiểu để phân biệt PMTU exception cũ, ECMP theo flow và đường về khác tuyến, đồng thời giữ nguyên từng biến còn lại. Cần thu những bằng chứng nào để bác bỏ từng giả thuyết?

## 7. Tóm tắt

- MTU của interface không chứng minh PMTU của cả đường; PMTU có thể thay đổi khi tuyến đổi. [RFC 1191 §2](https://www.rfc-editor.org/rfc/rfc1191#section-2).
- IPv4 quá MTU với DF không được router phân mảnh; thông báo lỗi cần quay về nguồn đang gửi gói ấy. [RFC 1191 §4](https://www.rfc-editor.org/rfc/rfc1191#section-4).
- MSS option không bao gồm header cố định; sender còn phải trừ option khi đóng gói dữ liệu thực. [RFC 6691 §2](https://www.rfc-editor.org/rfc/rfc6691#section-2).
- Lab có ping nhỏ 2/2 trong khi curl lỗi 28; mở ICMP cần thiết làm cùng URL trả 200 và 8.192 byte (`blackhole.txt`, `recovery.txt`).
- Lab có ba fragment request vì nguồn chia trước, router chia tiếp; Total Length là 1.276, 244 và 548 (`fragments.txt`).
- Phép thử sửa lỗi phải dùng lại lưu lượng từng hỏng và kiểm state đã học; một ping nhỏ thành công chưa đủ kết luận.

→ **Bài 6 — Router Linux bằng tay: bảng định tuyến và forwarding**: đã biết vì sao gói không vừa đường ra, ta sẽ xem Linux chọn đường ra ấy bằng những bảng và luật nào.
