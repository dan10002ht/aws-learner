# Bài 1 — Bóc một request HTTP từ tcpdump

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đếm riêng frame Ethernet, gói IP, segment TCP và thông điệp HTTP trong một file bắt gói, nêu rõ điểm bắt và bộ lọc.
- Đi từ byte hex đầu frame tới đúng byte đầu HTTP bằng độ dài header đọc được từ gói, thay vì cộng một hằng số thuộc lòng.
- Giải thích `length 107` và `length 41` trên cùng một dòng tcpdump mà không quy cho lỗi công cụ.
- Đọc `seq 1:42`, `ack 42`, cờ SYN/ACK/FIN và chỉ ra byte nào đã được phía nhận xác nhận.
- Bác bỏ giả định một lần `write()` hay một request HTTP luôn tương ứng một segment TCP bằng phép đo có thể chạy lại.
- Chọn interface, snaplen và định dạng lưu phù hợp, đồng thời chỉ rõ điều bản bắt gói chưa đủ chứng minh.

## 2. Triệu chứng

Một health endpoint trả đúng `hello`. Bạn gọi `curl` một lần, server ghi đúng một request, nhưng mở bản bắt gói lại thấy **12 frame**. Lọc còn TCP vẫn có **10 segment**, trong đó chỉ **2 segment có dữ liệu ứng dụng**. Dòng mang GET ghi `length 107` ở đầu nhưng `length 41` ở cuối. Response có body **5 byte**, công cụ lại ghi TCP `length 62`.

Bạn thử cách giải thích quen miệng: “Một request, một response, còn lại chắc là retry.” Nếu đúng thì chỉ cần tìm request trùng rồi sửa retry ở client. Nhưng server không nhận request thứ hai; cũng không có byte HTTP nào được gửi lại trong bản bắt này.

> **Đo trên lab.** Alpine 3.20.10 trong Docker/colima, Linux 6.8.0-64-generic aarch64, tcpdump 4.99.4, curl 8.14.1. Bắt trên `net01-c0`, nối trực tiếp hai namespace `10.201.0.1` và `10.201.0.2`, dùng HTTP thuần, xoá cache láng giềng trước lần gọi. `out/summary.txt` ghi 12 frame = 2 ARP + 10 TCP; tổng dữ liệu TCP hai chiều là 103 byte. Đo lại bằng `./run.sh` trong thư mục lab `net-01`; điều kiện đầy đủ ở `out/environment.txt` và `inside.sh`.

Các con số trong bài gắn với lần chạy này. Dấu chấm và cách viết hex trong output được giữ nguyên; phần giải thích dùng dấu phẩy cho số thập phân. Chúng ta chưa ra Internet, chưa chạy TLS, chưa có proxy. Việc thu hẹp này giúp biết số byte đến từ đâu trước khi thêm những lớp khác.

## ⏸ Dừng lại — đoán trước #1

Vì sao một lệnh curl sinh ra hơn hai gói?

(a) HTTP gửi lại request cho tới khi đủ số lần ACK.
(b) Mỗi dòng HTTP header phải nằm trong một gói riêng.
(c) Cùng cuộc trao đổi còn có tìm địa chỉ MAC, thiết lập TCP, xác nhận dữ liệu và đóng kết nối.
(d) Tcpdump luôn đếm cùng gói hai lần, dù chỉ bắt một interface.

## 3. Cơ chế

### 3.1 Đếm đúng vật trước khi đếm số lượng

Đáp án là **(c)** trong cấu hình lab. Để kiểm nó, cần gọi tên đúng thứ được đếm. **Frame** là đơn vị Ethernet truyền trên một liên kết; **packet IP** là phần bắt đầu từ header IP bên trong frame; **segment TCP** là header TCP cùng dữ liệu của nó; **thông điệp HTTP** là request hoặc response được ứng dụng phân tích trên luồng byte. Trong bài, “gói” là cách nói chung; khi tính phải dùng tên cụ thể.

Bản đồ phân tầng đã có ở [bài OSI](../engineering/eng-osi-model.md). Ở đây không học lại các tầng: ta mở một frame thật và dò ranh giới của từng phần. Một frame mang ARP không phải là segment TCP. Một segment chỉ mang ACK vẫn là một segment dù không chứa HTTP. Ngược lại, một response HTTP có thể cần nhiều segment.

**ARP — Address Resolution Protocol — là giao thức tìm địa chỉ MAC tương ứng với một địa chỉ IPv4 trên liên kết cục bộ.** Bản bắt mở đầu bằng một câu hỏi và một câu trả lời ARP vì script vừa xoá cache. Chỉ cần nhận ra chúng chưa phải HTTP; cơ chế cache và vì sao gói đầu có thể chờ sẽ dành cho bài 3. Trong bài này MAC là địa chỉ Ethernet của hai đầu liên kết; bài 2 sẽ đo cách switch dùng nó.

Sau ARP, client mở TCP, gửi GET, nhận response rồi hai đầu đóng phiên. Các ACK là thông báo tiến độ nhận byte của TCP; chúng không phải lần gọi lại API. Muốn gắn nhãn retry ứng dụng, phải tìm thông điệp request mới. Muốn gắn nhãn truyền lại TCP, phải tìm một vùng sequence đã từng gửi, đặt trong bối cảnh ACK và thời gian; chỉ đếm dòng là chưa đủ.

Hình sau giữ nguyên hai đầu nối, thời gian đi từ trên xuống. Số sequence trong phần dữ liệu là số tương đối tcpdump đã chuẩn hoá; mũi tên GET ứng với 41 byte, response ứng với 62 byte trong `summary.txt`.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 475" role="img" aria-labelledby="net01-a-t net01-a-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="net01-a-t">Một request qua các pha trên cùng liên kết</title>
<desc id="net01-a-d">Hai đường sống client và server cố định. Mỗi bước hiện một pha, gom ACK để thấy quan hệ nhân quả; số segment chi tiết đọc trong trace.</desc>
<defs><marker id="net01-a-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="15" width="150" height="50" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<rect x="470" y="15" width="150" height="50" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="95" y="36" font-size="16" text-anchor="middle" fill="currentColor">Client · .1</text>
<text x="95" y="56" font-size="14" text-anchor="middle" fill="currentColor">40001</text>
<text x="545" y="36" font-size="16" text-anchor="middle" fill="currentColor">Server · .2</text>
<text x="545" y="56" font-size="14" text-anchor="middle" fill="currentColor">8080</text>
<line x1="95" y1="65" x2="95" y2="480" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="5 5"/>
<line x1="545" y1="65" x2="545" y2="480" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="5 5"/>
<g data-step="1">
<text x="320" y="91" font-size="14" text-anchor="middle" fill="currentColor">ARP: hỏi MAC .2 → trả lời</text>
<line x1="95" y1="105" x2="545" y2="105" stroke="currentColor" stroke-width="2" marker-end="url(#net01-a-arr)"/>
<line x1="545" y1="127" x2="95" y2="127" stroke="currentColor" stroke-width="2" marker-end="url(#net01-a-arr)"/>
</g>
<g data-step="2">
<text x="320" y="156" font-size="14" text-anchor="middle" fill="currentColor">SYN → SYN-ACK → ACK</text>
<line x1="95" y1="170" x2="545" y2="170" stroke="currentColor" stroke-width="2" marker-end="url(#net01-a-arr)"/>
<line x1="545" y1="192" x2="95" y2="192" stroke="currentColor" stroke-width="2" marker-end="url(#net01-a-arr)"/>
</g>
<g data-step="3">
<text x="320" y="221" font-size="14" text-anchor="middle" fill="currentColor">GET · seq 1:42 → ACK 42</text>
<line x1="95" y1="235" x2="545" y2="235" stroke="currentColor" stroke-width="2" marker-end="url(#net01-a-arr)"/>
<line x1="545" y1="257" x2="95" y2="257" stroke="currentColor" stroke-width="2" marker-end="url(#net01-a-arr)"/>
</g>
<g data-step="4">
<text x="320" y="286" font-size="14" text-anchor="middle" fill="currentColor">Response · seq 1:63 → ACK 63</text>
<line x1="545" y1="300" x2="95" y2="300" stroke="currentColor" stroke-width="2" marker-end="url(#net01-a-arr)"/>
<line x1="95" y1="322" x2="545" y2="322" stroke="currentColor" stroke-width="2" marker-end="url(#net01-a-arr)"/>
</g>
<g data-step="5">
<text x="320" y="381" font-size="14" text-anchor="middle" fill="currentColor">FIN 63 → FIN 42, ACK 64 → ACK 43</text>
<line x1="545" y1="395" x2="95" y2="395" stroke="currentColor" stroke-width="2" marker-end="url(#net01-a-arr)"/>
<line x1="95" y1="417" x2="545" y2="417" stroke="currentColor" stroke-width="2" marker-end="url(#net01-a-arr)"/>
</g>
</svg>
<step-note data-step="1">Cache láng giềng vừa bị xoá nên client phải có MAC trước khi gửi IP. ARP chưa mang HTTP.</step-note>
<step-note data-step="2">Các segment mở kết nối không mang byte HTTP trong lần đo này.</step-note>
<step-note data-step="3">41 byte GET được server xác nhận bằng vị trí byte tiếp theo: ACK 42.</step-note>
<step-note data-step="4">62 byte response thuộc không gian sequence chiều ngược lại; client xác nhận ACK 63.</step-note>
<step-note data-step="5">FIN cũng tiêu một vị trí sequence. Pha đóng có ba segment trong trace, các mũi tên ở đây gom quan hệ hai chiều.</step-note>
</step-flow>

Hình gom các ACK thuần vào bước dữ liệu và gom phần đóng vào một bước để nhìn ra pha của cuộc trao đổi. Nó không thay bảng đếm từng segment. Trong lần đo này, sau response server gửi FIN; client trả FIN kèm ACK; server xác nhận cuối. Vì vậy không được áp công thức cứng “đóng TCP luôn là bốn gói”. Cờ có thể đi chung trong một segment.

> **Nguồn.** RFC 9293 §3.1 định nghĩa ACK là *“the next sequence number the sender of the segment is expecting to receive”*. [Định dạng TCP](https://www.rfc-editor.org/rfc/rfc9293.txt) giải thích cả cờ và các trường header. ACK báo nhận ở tầng TCP, không xác nhận handler HTTP đã chạy hay giao dịch database đã commit.

### 3.2 Vì sao hai chữ length cùng đúng

**Payload** là phần dữ liệu nằm sau header của giao thức đang xét. Nó là khái niệm tương đối: payload của Ethernet ở frame GET là toàn bộ packet IP, còn payload của TCP chỉ là các byte HTTP. Đổi tầng đang xét thì đổi độ dài được gọi là payload.

Trong bản bắt `whole`, frame GET dài 107 byte. Đầu Ethernet chiếm 14 byte, tiếp đến IPv4 20 byte, TCP 32 byte, rồi HTTP 41 byte. Cộng lại vừa đủ. Khi dùng `-e`, tcpdump in độ dài ở phần liên kết; khi giải mã TCP nó in tiếp độ dài dữ liệu TCP. Hai số đo hai đoạn khác nhau của cùng frame.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 280" role="img" aria-labelledby="net01-b-t net01-b-d" style="width:100%;max-width:500px;height:auto;display:block;margin:1.25rem auto">
<title id="net01-b-t">Một frame, nhiều độ dài</title>
<desc id="net01-b-d">Bề rộng từng phần tỉ lệ đúng số byte. Thanh IP bắt đầu sau Ethernet; thanh TCP payload chỉ phủ HTTP.</desc>
<text x="20" y="24" font-size="15" text-anchor="start" fill="currentColor">Offset tính từ đầu frame GET</text>
<rect x="20" y="50" width="56" height="42" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="48" y="115" font-size="13" text-anchor="middle" fill="currentColor">Ethernet · 14</text>
<text x="20" y="42" font-size="13" text-anchor="start" fill="currentColor">0</text>
<rect x="76" y="50" width="80" height="42" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="116" y="115" font-size="13" text-anchor="middle" fill="currentColor">IP · 20</text>
<text x="76" y="42" font-size="13" text-anchor="start" fill="currentColor">14</text>
<rect x="156" y="50" width="128" height="42" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="220" y="115" font-size="13" text-anchor="middle" fill="currentColor">TCP · 32</text>
<text x="156" y="42" font-size="13" text-anchor="start" fill="currentColor">34</text>
<rect x="284" y="50" width="164" height="42" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="366" y="115" font-size="13" text-anchor="middle" fill="currentColor">HTTP · 41</text>
<text x="284" y="42" font-size="13" text-anchor="start" fill="currentColor">66</text>
<text x="448" y="42" font-size="13" text-anchor="middle" fill="currentColor">107</text>
<rect x="76" y="145" width="372" height="33" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="262" y="167" font-size="14" text-anchor="middle" fill="currentColor">IP Total Length = 93</text>
<rect x="284" y="194" width="164" height="33" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="366" y="216" font-size="13" text-anchor="middle" fill="currentColor">TCP payload = 41</text>
<text x="20" y="258" font-size="15" text-anchor="start" fill="currentColor">HTTP bắt đầu: 14 + 20 + 32 = 66</text>
</svg>

> **Đo trên lab.** `out/summary.txt`, dòng GET: `eth=107 ip=93 ihl=20 tcp_h=32 data=41`. Script `analyze.py` đọc trường độ dài trong pcap, IHL của IP và Data Offset của TCP để tính; không tìm chuỗi GET rồi đoán offset. Header Ethernet không gắn VLAN trong lab này. Cấu trúc header Ethernet đối chiếu với [Linux v6.8, if_ether.h](https://raw.githubusercontent.com/torvalds/linux/v6.8/include/uapi/linux/if_ether.h).

**IHL — Internet Header Length — là độ dài header IPv4 tính theo từ 32 bit.** Nửa byte cuối của `45` là `5`: nhân với 4 byte thành 20 byte. **Data Offset** là trường tương tự trong TCP, cho biết số từ 32 bit từ đầu TCP đến đầu dữ liệu. Nửa byte đầu của `80` là `8`: header TCP ở GET dài 32 byte. Hai trường này tồn tại vì cả IPv4 lẫn TCP đều có thể mang options, tức phần mở rộng header.

**Nguồn cho quy tắc độ dài:** [RFC 791 §3.1](https://www.rfc-editor.org/rfc/rfc791.txt) quy định IHL và Total Length; [RFC 9293 §3.1](https://www.rfc-editor.org/rfc/rfc9293.txt) quy định Data Offset. Trong bài này, mọi phép trừ độ dài dùng các trường đó cùng byte đã đo. Nếu cộng cố định `14 + 20 + 20`, bạn sẽ nhảy vào giữa options TCP, sớm hơn byte GET thật 12 byte.

Packet IP ở GET dài 93 byte vì Total Length tính cả header IP. Trừ IHL còn 73 byte gồm TCP và dữ liệu. Trừ tiếp TCP header 32 byte còn 41 byte. Đó là chuỗi tính có thể áp cho một gói khác sau khi đọc lại các trường, thay vì học thuộc số 66 là vị trí HTTP ở mọi gói.

Cũng đừng biến 107 thành “tất cả byte đã dùng trên dây Ethernet vật lý”. Đây là số byte được bắt ở thiết bị veth — một cặp interface Ethernet ảo nối hai đầu Linux. **FCS — Frame Check Sequence — là phần kiểm tra lỗi cuối frame Ethernet**, không có trong bản bắt veth này. Preamble và khoảng cách giữa frame thuộc cách truyền trên môi trường vật lý, cũng không nằm trong pcap ở đây. Bài 2 sẽ đối chiếu frame ngắn với padding; bài 1 chỉ chốt phạm vi phép đếm.

### 3.3 Đọc hex: không bỏ sót byte header nào

**Hex** là cách viết một byte bằng hai chữ số hệ 16; nhóm `0200` trong output là hai byte, không phải một trường 2.000. Offset ở đầu dòng là vị trí tính từ đầu Ethernet do dùng `-XX`; nếu dùng `-X`, phần in hex thông thường bỏ header tầng liên kết. Sự khác biệt này thuộc [man page tcpdump](https://www.tcpdump.org/manpages/tcpdump.1.html), và ảnh hưởng trực tiếp tới cách đánh số offset.

Đây là phần quyết định trong `out/hex-whole.txt`, lấy từ frame mang GET. Không cần thuộc số sequence ngẫu nhiên; mục tiêu là đi hết các trường bằng ranh giới hợp lệ.

```text
0x0000:  0200 0001 0002 0200 0001 0001 0800 4500
0x0010:  005d 75f0 4000 4006 af16 0ac9 0001 0ac9
0x0020:  0002 9c41 1f90 b66c a66d 5992 2f1d 8018
0x0030:  01f6 8de7 0000 0101 080a b9c2 726c 4b23
0x0040:  5651 4745 5420 2f20 4854 5450 2f31 2e31
0x0050:  0d0a 486f 7374 3a20 3130 2e32 3031 2e30
0x0060:  2e32 3a38 3038 300d 0a0d 0a
```

Bắt đầu với Ethernet: sáu byte đầu là MAC đích `02:00:00:01:00:02`, sáu byte kế là MAC nguồn `02:00:00:01:00:01`. Hai byte `0800` là **EtherType**, trường chỉ loại giao thức được chở; ở đây là IPv4. Đây là lý do byte `45` ở offset 14 phải được đọc theo IPv4, thay vì thử giải mã nó thành TCP hay ký tự ASCII. [RFC 894](https://www.rfc-editor.org/rfc/rfc894.txt) quy định EtherType cho IP trên Ethernet.

Sau khi đã xác định IP bắt đầu ở offset 14, bảng dưới phủ đủ header IPv4 của frame. Offset là số thập phân tính từ đầu frame; các giá trị là byte trong `hex-whole.txt`. Ý nghĩa trường theo RFC 791, còn diễn giải trường chưa tham gia sự cố chỉ giữ ở mức cần đọc bản bắt.

| Offset | Byte hex đã đo | Đọc thế nào |
|---|---|---|
| 14 | `45` | Version 4; IHL 5 từ, tức 20 byte |
| 15 | `00` | Byte dịch vụ/ECN bằng 0 trong gói này; không có dấu hiệu ECN ở đây |
| 16–17 | `005d` | Total Length = 93 byte, gồm cả IP header |
| 18–19 | `75f0` | Identification dùng cho việc nhận diện các mảnh của datagram nếu phân mảnh |
| 20–21 | `4000` | Cờ DF được bật; fragment offset bằng 0 |
| 22 | `40` | TTL = 64 tại điểm bắt |
| 23 | `06` | Protocol = TCP |
| 24–25 | `af16` | Header checksum IPv4, chỉ bảo vệ header IPv4 |
| 26–29 | `0ac9 0001` | IP nguồn `10.201.0.1` |
| 30–33 | `0ac9 0002` | IP đích `10.201.0.2` |

**DF — Don't Fragment — là cờ yêu cầu không phân mảnh datagram IPv4 trên đường chuyển tiếp.** Fragment offset là vị trí mảnh trong datagram ban đầu. Chúng xuất hiện ở đây để bạn nhận diện được byte; thuật toán phân mảnh và hậu quả của DF thuộc bài 5. **TTL — Time to Live — là trường giới hạn vòng đời packet; router giảm nó khi chuyển tiếp**, nên `64` ở máy gửi chưa phải bằng chứng packet đã đi qua bao nhiêu router. Muốn suy số hop còn cần biết giá trị khởi tạo và điểm bắt. Ở lab nối trực tiếp này không có router.

**Checksum** là giá trị kiểm tra tính toàn vẹn tính từ các byte theo quy tắc giao thức; nó không phải mã hoá hay chữ ký xác thực. Chỉ nhìn `af16` không thể kết luận hợp lệ: phải tính lại trên đúng header. IPv4 header không có options ở frame này nên TCP bắt đầu ngay offset 34. Bảng tiếp theo phủ hết TCP header 32 byte đã đo.

| Offset | Byte hex đã đo | Đọc thế nào |
|---|---|---|
| 34–35 | `9c41` | Port nguồn 40001 |
| 36–37 | `1f90` | Port đích 8080 |
| 38–41 | `b66c a66d` | Sequence tuyệt đối 3060573805, số của byte đầu đoạn GET |
| 42–45 | `5992 2f1d` | ACK tuyệt đối 1502752541 của chiều server |
| 46–47 | `8018` | Data Offset 8 từ; reserved bằng 0; cờ PSH và ACK bật |
| 48–49 | `01f6` | Window thô 502, cần xét window scaling đã thương lượng |
| 50–51 | `8de7` | Checksum TCP, tính cả dữ liệu và thông tin IP trong pseudo-header |
| 52–53 | `0000` | Urgent Pointer; không dùng ở đây vì cờ URG không bật |
| 54–55 | `0101` | Hai NOP, options đệm căn hàng |
| 56–57 | `080a` | Option Timestamp, kind 8 và độ dài 10 byte |
| 58–61 | `b9c2 726c` | Giá trị timestamp bên gửi |
| 62–65 | `4b23 5651` | Timestamp được echo từ phía kia |

**Pseudo-header** là nhóm thông tin IP được đưa vào phép tính checksum TCP nhưng không phải một header mới chèn giữa TCP và HTTP. **Window scaling** là cách hai đầu thương lượng hệ số dịch cho cửa sổ nhận TCP; **window** là lượng dữ liệu phía nhận đang cho phép gửi tiếp tính từ ACK. Trong SYN ở `trace-whole.txt`, hai bên đã quảng bá `wscale 7`. Vì vậy window thô 502 ở GET tương ứng `502 × 2^7 = 64.256` byte, không phải server chỉ được gửi thêm 502 byte. SYN tự nó không áp hệ số này cho trường window của SYN. Bài 17 sẽ dùng cửa sổ nhận để phân biệt nghẽn phía nhận và nghẽn trên đường.

Các option timestamp không phải đồng hồ Unix để đọc giờ gửi request. Đừng lấy số hex này trừ giờ trên máy rồi kết luận clock lệch. SYN còn chứa các option không xuất hiện ở GET: `mss 1460`, `sackOK`, `wscale 7`. **MSS — Maximum Segment Size — là kích thước dữ liệu TCP tối đa phía nhận quảng bá**, không phải độ dài frame. **SACK — Selective Acknowledgment — là cơ chế báo các vùng byte đã nhận ngoài phần liền mạch**. Ở đây chỉ nhận diện tên trong output; bài 16 và 17 mới đo cách chúng tác động tới truyền lại và tốc độ gửi.

Đến offset 66, hai byte `4745` là `GE`, tiếp đến `54` là `T`. Ta đã tới đúng HTTP. Không trường header nào phải “ước chừng”; chỉ cần biết giao thức tiếp theo và độ dài header hiện tại.

### 3.4 Sequence đếm byte, không đếm request

Sau SYN, tcpdump thường hiển thị sequence tương đối để người đọc không phải trừ những số tuyệt đối như trong bảng hex. `seq 1:42` là khoảng nửa mở: byte bắt đầu mang số 1, byte cuối mang số 41, số tiếp theo là 42. Do đó đoạn này mang `42 − 1 = 41` byte. Phía server trả `ack 42`: đang chờ byte số 42 của chiều client, tức đã nhận liền mạch qua byte 41.

Response có sequence riêng của chiều server: `seq 1:63`, dài 62 byte. Client trả `ack 63`. Không được lấy ACK của chiều server trừ sequence của chiều client để tính response: mỗi chiều đánh số luồng gửi của chính nó. **ISN — Initial Sequence Number — là số sequence khởi đầu của mỗi chiều khi mở kết nối**, và tcpdump dùng nó làm mốc hiển thị tương đối.

SYN và FIN đều chiếm một vị trí sequence dù TCP payload bằng 0; ACK thuần không tiêu thêm vị trí. Bởi vậy server gửi FIN ở `seq 63`, rồi client xác nhận `ack 64`; client gửi FIN ở `seq 42`, rồi server xác nhận `ack 43`. Các quy tắc này nằm ở [RFC 9293 §3.4](https://www.rfc-editor.org/rfc/rfc9293.txt), còn số cụ thể kiểm trong `trace-whole.txt`.

Đây là cách bác bỏ “retry” bằng chứng cứ trong lần đo. GET chiếm đúng vùng sequence 1 tới trước 42 của client, xuất hiện một lần trong pcap. Những segment còn lại có payload bằng 0 hoặc thuộc chiều server. Chúng không thể là bản sao GET vì không mang vùng byte GET đó. Kết luận này chỉ áp cho luồng đang xem, không khẳng định một ứng dụng ngoài lab không có retry ở kết nối khác.

## ⏸ Dừng lại — đoán trước #2

Server đổi từ một `sendall()` sang hai `sendall()`: gửi HTTP header trước, chờ 100 ms, rồi gửi body. Request, status, header và body giữ nguyên. Điều gì bắt buộc giữ nguyên?

(a) Tổng số segment TCP.
(b) Tổng số byte HTTP trong mỗi chiều.
(c) Mỗi lần `sendall()` phải tạo đúng một segment.
(d) Client phải gọi `recv()` đúng hai lần.

### 3.5 Giữ nguyên thông điệp, đổi cách chia đoạn

Đáp án là **(b)**. TCP cung cấp luồng byte; ranh giới lần ghi của ứng dụng không phải ranh giới thông điệp mà đầu nhận được hứa giữ nguyên. Điều này được nói trực tiếp trong [RFC 9293 §3.7](https://www.rfc-editor.org/rfc/rfc9293.txt). Một lần ghi có thể bị chia; nhiều lần ghi có thể được gộp; một lần đọc có thể nhận một phần hoặc nhiều phần đã gửi. Chỉ giao thức ứng dụng mới nói thông điệp kết thúc ở đâu.

Trong server lab, response là một chuỗi 62 byte: HTTP header 57 byte và body `hello` 5 byte. Nhánh `whole` gọi `sendall(r)` một lần. Nhánh `split` bật `TCP_NODELAY`, gửi `r[:-5]`, ngủ 100 ms rồi gửi `r[-5:]`. **TCP_NODELAY** là tuỳ chọn tắt thuật toán Nagle gộp các lần gửi nhỏ; việc bật nó cùng khoảng chờ giúp quan sát hai đoạn trong thí nghiệm này, không phải lời hứa tổng quát về số segment.

> **Đo trên lab.** `out/summary.txt`: nhánh `whole` có 10 TCP/12 frame; nhánh `split` có 12 TCP/14 frame. Dữ liệu TCP hai chiều đều 103 byte. Lần split thêm một segment dữ liệu response và một ACK thuần trong bản bắt này. `out/server-whole.txt`, `out/server-split.txt` đều ghi `request_bytes=41 response_bytes=62`. Khoảng chờ do `server.py` đặt là 100 ms, không phải độ trễ mạng đo được.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" role="img" aria-labelledby="net01-c-t net01-c-d" style="width:100%;max-width:500px;height:auto;display:block;margin:1.25rem auto">
<title id="net01-c-t">Chi phí chia response trong bản bắt</title>
<desc id="net01-c-d">Các thanh có cùng tỉ lệ ba đơn vị mỗi byte. Tách response giữ tổng HTTP, nhưng phải thêm một bộ header mạng.</desc>
<text x="20" y="24" font-size="15" text-anchor="start" fill="currentColor">Cùng 62 byte response, chia đoạn khác nhau</text>
<text x="20" y="55" font-size="14" text-anchor="start" fill="currentColor">whole: 128 byte capture</text>
<rect x="20" y="67" width="198" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="119" y="89" font-size="13" text-anchor="middle" fill="currentColor">header mạng · 66</text>
<rect x="218" y="67" width="186" height="34" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="311" y="89" font-size="14" text-anchor="middle" fill="currentColor">HTTP · 62</text>
<text x="20" y="135" font-size="14" text-anchor="start" fill="currentColor">split: 123 + 71 = 194 byte capture</text>
<rect x="20" y="149" width="198" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="119" y="171" font-size="13" text-anchor="middle" fill="currentColor">header mạng · 66</text>
<rect x="218" y="149" width="171" height="34" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="303" y="171" font-size="13" text-anchor="middle" fill="currentColor">header HTTP · 57</text>
<rect x="20" y="207" width="198" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="119" y="229" font-size="13" text-anchor="middle" fill="currentColor">header mạng · 66</text>
<rect x="218" y="207" width="15" height="34" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="248" y="229" font-size="14" text-anchor="start" fill="currentColor">body · 5</text>
<text x="20" y="278" font-size="13" text-anchor="start" fill="currentColor">Chỉ tính frame response có dữ liệu; chưa cộng ACK.</text>
</svg>

Nhìn độ dài các thanh response: tổng phần dữ liệu bằng nhau, nhưng nhánh dưới cần thêm một TCP header và trong lần đo có thêm một ACK. Vì thế tối ưu “giảm số lần ghi” và “giảm số byte ứng dụng” là hai việc khác nhau. Kết quả này chưa phải benchmark throughput: payload cố ý nhỏ và server còn chủ động ngủ.

**Cờ PSH không đánh dấu “hết request HTTP”.** Lab whole có PSH ở GET và response; lab split có PSH ở cả header lẫn body của cùng response. Nếu parser của bạn kết thúc response tại mỗi gói có PSH, nhánh split sẽ làm lộ lỗi dù mạng không mất byte nào. Với response lab, HTTP dùng `Content-Length: 5` để biết độ dài body; TCP không phải đọc HTTP để quyết định điều đó.

> **Suy luận.** Cùng bytes ứng dụng nhưng số segment khác nhau chứng minh không có ánh xạ cố định request → số gói trong thí nghiệm này. Nó chưa xác định mọi cách chia gói trên mạng thật. Kiểm mở rộng bằng cách thay kích thước body, tái sử dụng kết nối và bắt ở cả hai đầu; không suy từ một lần chạy thành hằng số cho mọi curl.

### 3.6 Điểm bắt quyết định điều bạn được phép kết luận

**Pcap** là định dạng lưu bản bắt gói có byte và metadata của từng bản ghi, để có thể đổi bộ lọc lúc đọc mà không chạy lại request. Cụm “đếm gói từ tcpdump” thiếu ba điều nếu không nói interface, filter và snaplen. **Snaplen** là số byte tối đa công cụ giữ lại cho mỗi gói; nếu nhỏ hơn gói thì bản ghi bị cắt, không phải gói trên mạng bị cắt.

Ở bài này, `tcpdump -i net01-c0 -s0 -w ...` lưu đủ frame trên một đầu veth. `-s0` chọn giá trị mặc định đầy đủ của công cụ, thể hiện ở log là snapshot length 262144; không có nghĩa “giữ 0 byte” hay đảm bảo mọi công cụ khác cũng chọn cùng giới hạn. `-nn` giữ IP và port dạng số; nó giúp không lẫn traffic phân giải tên phục vụ hiển thị với traffic bạn đang điều tra. `-e` yêu cầu in header tầng liên kết. `-r` đọc pcap đã có. Quy tắc tuỳ chọn theo [tcpdump manual](https://www.tcpdump.org/manpages/tcpdump.1.html).

**Capture filter** là biểu thức lọc gói tại lúc bắt hoặc lúc đọc bằng cú pháp libpcap. Filter `tcp port 8080` bỏ ARP theo thiết kế: nếu đếm từ output đó, kết quả không được đem gọi là “mọi frame do curl gây ra”. Muốn quan sát cả ARP trong lab, script dùng `arp or tcp port 8080`. Muốn hỏi “có DNS không”, phải bắt thêm DNS và xét cách curl lấy địa chỉ; lab dùng IP trực tiếp nên không cần phân giải tên cho URL.

Cũng không dùng `-i any` rồi mặc định mỗi dòng có MAC Ethernet thật. Trên Linux, interface tổng hợp có thể dùng kiểu header cooked capture thay cho header Ethernet; cần đọc dòng `link-type`. Lab ghi `EN10MB (Ethernet)`, vì vậy bảng offset ở trên có cơ sở. Nếu bắt ở nhiều interface hoặc trên hai đầu cùng lúc, một packet có thể tạo nhiều quan sát; tổng số dòng lúc đó là số quan sát, chưa phải số packet độc lập trên đường.

**Offload** là việc chuyển một phần xử lý gói sang thiết bị hoặc cơ chế tầng dưới. TSO/GSO có thể làm điểm bắt phía gửi thấy một khối trước khi chia segment; GRO có thể gộp phía nhận; checksum offload có thể để checksum được hoàn tất sau điểm bắt. [Tài liệu segmentation offloads của Linux](https://www.kernel.org/doc/html/latest/networking/segmentation-offloads.html) mô tả các cơ chế chia/gộp này. Script tắt các tính năng liên quan trên hai veth để giảm biến số và lưu kết quả vào `offload-c.txt`, `offload-s.txt`.

> **Chưa đo.** Bài này không đo byte trên cổng Ethernet vật lý, số frame trước/sau TSO trên NIC thật, hay số packet ngoài Internet. Muốn kiểm ảnh hưởng offload cần bắt ở phía gửi và một điểm sau NIC, lưu trạng thái `ethtool -k`, rồi đối chiếu vùng sequence và byte chứ không chỉ số dòng.

Một dòng “bad checksum” trên capture phía gửi vì thế là đầu mối, chưa phải kết luận dây mạng hỏng. Ngược lại, không thấy GET trong `-A` cũng chưa phải server không nhận GET: có thể dùng TLS, bắt thiếu byte, chọn sai interface hoặc lọc mất segment mang dữ liệu. Bài [TCP/TLS cũ](../engineering/eng-03-tcp-tls.md) giải thích phần mã hoá; ta không dùng lab HTTP thuần để suy cách đọc plaintext từ HTTPS.

## 4. Lab

### 4.1 Dựng một đường đi không có Internet xen vào

Mọi script và pcap nằm ở `~/projects/net-lab/net-01/`. Cần Docker chạy Linux và quyền tạo namespace bên trong container. `run.sh` dùng container `net01-lab` với `--privileged` để tạo namespace; chỉ chạy script đã đọc trên máy lab, không dùng quyền đó cho một image hay script không tin cậy. Hai namespace c và s không có default route ra ngoài. Container dùng mạng Docker lúc cài công cụ, còn traffic HTTP chỉ đi qua cặp veth tự dựng.

Chạy từ thư mục lab:

```bash
./run.sh
cat out/environment.txt
cat out/capture-whole.txt
```

Phần quyết định của `out/capture-whole.txt`:

```text
12 packets captured
12 packets received by filter
0 packets dropped by kernel
```

**Làm gì → thấy gì → vì sao:** script dựng veth, gán IP và MAC cố định, xoá cache láng giềng, khởi động server và tcpdump trước curl. Kết thúc mới dừng tcpdump để có cả phần đóng TCP. Dòng dropped kiểm tra mất gói ở bộ đệm capture; nó không phải chỉ số mất gói ngoài đường. File pcap và log còn sau khi container bị xoá. `trap` ở script ngoài dọn đúng container `net01-lab` cả khi lệnh lỗi; không cần dọn Docker chung.

Script không dùng `tcpdump -c 12` để ép kết quả: số 12 đến từ traffic đã phát, không phải điều kiện dừng do người viết cài trước. SYN/FIN có thể được gộp khác trong lần chạy khác. Nếu số segment đổi, giữ log mới, tính lại từ byte; đừng sửa output cho giống bài.

### 4.2 Đếm theo pha, rồi kiểm lại theo byte

Mở `out/trace-whole.txt` để nhìn thứ tự. File có cả MAC và thời gian; `out/summary.txt` bỏ các giá trị ngẫu nhiên và giải mã độ dài. Những dòng sau được trích nguyên từ summary:

```text
src=10.201.0.1:40001 dst_port=8080 flags=0x02 eth=74 ip=60 ihl=20 tcp_h=40 data=0
src=10.201.0.1:40001 dst_port=8080 flags=0x18 eth=107 ip=93 ihl=20 tcp_h=32 data=41
src=10.201.0.2:8080 dst_port=40001 flags=0x18 eth=128 ip=114 ihl=20 tcp_h=32 data=62
COUNTS {'arp': 2, 'tcp': 10, 'data_segments': 2} frames= 12 tcp_payload_bytes= 103
```

**Làm gì → thấy gì → vì sao:** đối chiếu frame SYN và GET. SYN có TCP header 40 byte; GET chỉ có 32 byte vì bộ options khác nhau. Cả hai đều có IP header 20 byte. Nếu mọi gói đều bị trừ TCP header cố định 20 byte, bạn sẽ “tìm ra” dữ liệu ứng dụng ở cả SYN không mang dữ liệu. Tự chỉ vị trí Data Offset trong `hex-whole.txt`, không dùng kết quả summary làm niềm tin duy nhất.

Tiếp theo chia 10 segment TCP trong trace: ba để mở kết nối, GET và ACK của nó, response và ACK của nó, ba để đóng. Đây là phân loại của lần chạy đã lưu, không phải định luật số gói. Hai frame ARP nằm ngoài tổng TCP. Những tên `S`, `.`, `P`, `F` trong tcpdump tương ứng SYN, ACK, PSH, FIN; dấu chấm trong cờ là ACK, không phải thiếu cờ.

### 4.3 Đối chiếu HTTP thật với số byte

`out/ascii-whole.txt` được tạo bằng `tcpdump -nn -A -r ... 'tcp port 8080'`. Lấy phần ASCII có nghĩa của hai segment dữ liệu:

```text
GET / HTTP/1.1
Host: 10.201.0.2:8080
HTTP/1.1 200 OK
Content-Length: 5
Connection: close
hello
```

Đây là các dòng HTTP được trích, bỏ các byte header mạng không in được; không phải một transcript HTTP liên tục. Trong pcap, mỗi xuống dòng HTTP là CRLF (`0d0a`), và dòng trống kết thúc header cũng chứa CRLF. `curl` bị bỏ User-Agent và Accept bằng `-H 'User-Agent:' -H 'Accept:'`; do đó phép đếm không phụ thuộc chuỗi phiên bản curl trong request. URL dùng IP nên header Host mang IP và port.

**Làm gì → thấy gì → vì sao:** đếm cả CRLF từ `hex-whole.txt`, bạn được 41 byte request. Response có 57 byte header cộng 5 byte body, nên TCP in 62. `Content-Length` chỉ đếm body; nó không đếm status line, các header hay TCP/IP. Kiểm lại `out/server-whole.txt`:

```text
request_bytes=41 response_bytes=62
```

Không in nội dung token, cookie hay request thật của khách để làm bài tập này. HTTP lab không mang bí mật; một pcap của hệ thống đang dùng có thể chứa dữ liệu nhạy cảm dù mục đích chỉ là đo độ dài. Giới hạn host/port và thời gian bắt theo câu hỏi cần trả lời.

### 4.4 Cho mô hình “một thông điệp = một segment” thất bại

Trong cùng `run.sh`, nhánh split khởi động server với đối số `split`, xoá cache và bắt lại vào `split.pcap`. Xem `out/server-split.txt`, `out/body-split.txt` và phần split của summary:

```text
src=10.201.0.2:8080 dst_port=40001 flags=0x18 eth=123 ip=109 ihl=20 tcp_h=32 data=57
src=10.201.0.2:8080 dst_port=40001 flags=0x18 eth=71 ip=57 ihl=20 tcp_h=32 data=5
COUNTS {'arp': 2, 'tcp': 12, 'data_segments': 3} frames= 14 tcp_payload_bytes= 103
```

**Làm gì → thấy gì → vì sao:** body curl vẫn là `hello`, tổng byte TCP không đổi, nhưng một response nằm trên hai segment có payload. Mở `server.py` để thấy ứng dụng chỉ đổi cách gửi. Nếu parser dùng `recv()` một lần rồi coi dữ liệu đó là đủ response, mô hình của nó đã sai trước khi cần thử mất gói hay mạng xa. Bài TCP sâu sau này mới đo retransmission; ở đây chưa có bằng chứng cần bật retry để “chữa mạng”.

## 5. Tính tay

### Bài tính 1 — Byte nào mở đầu HTTP?

Dùng đúng frame GET trong hex: Ethernet không VLAN dài 14 byte, byte đầu IPv4 là `45`, Data Offset của TCP là `8`. Tính offset HTTP, độ dài IP và HTTP nếu độ dài frame capture là 107 byte. Nếu người đọc mặc định TCP chỉ 20 byte, họ nhầm bao nhiêu byte?

**Giải:** IHL `5 × 4 = 20`; TCP `8 × 4 = 32`. Offset HTTP `14 + 20 + 32 = 66`. IP dài `107 − 14 = 93`. HTTP dài `93 − 20 − 32 = 41`. Mặc định TCP 20 khiến điểm bắt đầu bị kéo sớm 12 byte. Toàn bộ dữ kiện thuộc `hex-whole.txt`; phép tính kiểm lại bằng `analyze.py`.

### Bài tính 2 — ACK nào, thuộc chiều nào?

Trong lab, client gửi GET `seq 1:42`, server gửi response `seq 1:63`, rồi server gửi FIN. Client cần gửi ACK bao nhiêu để xác nhận hết response và FIN? ACK đó có nghĩa server xử lý thành công GET hay chưa?

**Giải:** response chiếm byte server 1 tới 62; vị trí kế là 63. FIN tiêu vị trí 63, nên ACK cho hết chúng là 64. ACK này do client gửi, nói về luồng byte **server → client**. Nó không phải chứng cứ server đã commit nghiệp vụ. Kết quả `ack 64` có trong `trace-whole.txt`; quy tắc sequence theo RFC 9293.

### Bài tính 3 — Tỉ lệ phần hữu ích của một frame

Chỉ tính frame GET đã bắt, không tính ARP, handshake, ACK, FIN hay chi phí vật lý. HTTP chiếm bao nhiêu phần trăm 107 byte? Khi tách response 62 byte thành 57 và 5, chỉ tính các frame mang dữ liệu response, tổng byte capture tăng bao nhiêu?

**Giải:** `41 / 107 × 100 = 38,32 %`. Phần còn lại của frame GET là header mạng. Response whole: `14 + 20 + 32 + 62 = 128` byte. Split: `(14 + 20 + 32 + 57) + (14 + 20 + 32 + 5) = 194` byte. Tăng 66 byte, chính là thêm một bộ header trong điều kiện này. Chưa cộng ACK bổ sung; nếu cộng toàn bộ phiên thì phải đọc toàn bộ pcap. Không gọi 38,32 % là hiệu suất HTTP nói chung vì mẫu số cố ý chỉ chứa một frame.

## 6. Chuyển giao

Các tình huống dưới đây không dùng đúng endpoint và cấu hình lab. Hãy ghi rõ bằng chứng cần thêm trước khi kết luận; không có đáp án ở phần sau.

1. Bạn bắt trên server HTTPS, thấy segment có payload nhưng `tcpdump -A` không chứa đường dẫn API. Cần kiểm gì để phân biệt mã hoá, snaplen thiếu và chọn nhầm kết nối?
2. Một capture bắt đầu giữa kết nối có `seq 1:1201`. Muốn biết toàn bộ response dài bao nhiêu, bạn còn thiếu những gì? Số tương đối của tcpdump có còn mốc SYN thật không?
3. App ghi log “đã gửi response”, client chỉ nhận một phần body. ACK tăng trong capture phía server chứng minh được tới mức nào, và bạn đặt điểm bắt tiếp theo ở đâu?
4. Bạn lọc `tcp dst port 8080`, đếm không thấy response nào rồi kết luận server im lặng. Phải sửa câu hỏi và bộ lọc thế nào trước khi điều tra server?
5. Khi thay HTTP client sang connection pool, số request tăng mà SYN không tăng tương ứng. Bạn sẽ tính chi phí mở kết nối trên mỗi request bằng hai loại số đo nào?
6. **Câu khó nhất:** hai pcap ở hai đầu cùng một kết nối có tổng byte HTTP bằng nhau, số segment khác nhau, và nhiều checksum bị đánh dấu sai ở một đầu. Hãy thiết kế phép đối chiếu để phân biệt offload, capture mất bản ghi và truyền lại thật mà không cần giải mã nội dung ứng dụng. Nêu rõ điều kiện nào vẫn khiến bạn chưa thể kết luận.

## 7. Tóm tắt

- Trong lần đo đã lưu, một request sinh 12 frame: 2 ARP và 10 TCP; số này thuộc điểm bắt `net01-c0` và filter của lab.
- Frame GET 107 byte chứa IP 93 byte, TCP header 32 byte và HTTP 41 byte (`summary.txt`).
- Ranh giới HTTP phải tính từ IHL và Data Offset, không dùng TCP header cố định 20 byte.
- `seq 1:42` chứa 41 byte; ACK báo vị trí byte tiếp theo đang chờ, không báo giao dịch ứng dụng thành công (RFC 9293).
- Tách cách gửi response làm lần đo tăng từ 12 lên 14 frame trong khi byte HTTP giữ nguyên (`summary.txt`).
- Một kết luận từ tcpdump phải kèm interface, filter, snaplen và phạm vi ảnh hưởng offload.

→ **Bài 2 — Ethernet, MAC và switch học địa chỉ**: bỏ HTTP đi một lúc để đo vì sao cùng một frame lúc tới một cổng, lúc lại xuất hiện ở nhiều cổng.
