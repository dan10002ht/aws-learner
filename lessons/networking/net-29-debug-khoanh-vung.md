# Bài 29 — Bộ đồ nghề và quy trình khoanh vùng

## 1. Mục tiêu

Sau bài này bạn có thể:

- Biến “API chậm” thành một phép thử có endpoint, điểm xuất phát, deadline và mốc thời gian cụ thể.
- Tách các mốc `curl -w` thành khoảng chờ để chọn phép đo tiếp theo, không cộng các số tích luỹ.
- Dùng `dig` và một request ghim IP để kiểm giả thuyết DNS mà vẫn giữ tên dịch vụ.
- Viết BPF filter có ngoặc đúng, giữ hai chiều của flow cần xem và giải thích được phần capture đã bỏ mất.
- Ghép `ss`, packet capture và log ứng dụng để phân biệt chưa nối được, đã nối nhưng chưa có response, và truyền body chậm.
- Đọc `mtr` theo loại probe và đích đo; kết thúc điều tra bằng một kết luận có giới hạn cùng phép thử đối chứng.

## 2. Triệu chứng

Một backend gọi `http://api.lab.test:18080/slow`. Request trả **200 sau 404,769 ms**. Cùng IP, `/` chỉ mất **4,831 ms**. Người trực nhìn thấy “gọi qua mạng” và định tăng connect timeout. Người khác chạy ICMP thấy không mất probe nào rồi bảo “mạng tốt, chắc database”. Hai người đã chọn cách sửa trước khi biết request đang đứng ở đâu.

Đây là số thật của lab trong bài: DNS hoàn tất ở **1,075 ms**, TCP connect hoàn tất ở **1,205 ms**, byte đầu tới ở **404,636 ms**. Trong lúc curl còn đợi, `ss` thấy `ESTAB`, `Recv-Q=0`, `Send-Q=0`. Cùng máy đích, cổng `18081` trả lỗi gần như ngay; cổng `18082` hết connect timeout. Gọi cả ba là “timeout mạng” sẽ xoá mất bằng chứng quyết định.

> **Đo trên lab.** Alpine 3.20 trong Docker/colima, Linux `6.8.0-64-generic` aarch64; curl 8.14.1, iproute2 6.9.0, tcpdump 4.99.4, mtr 0.95, DiG 9.18.49. `net-lab/net-29/out/lab.txt`, các nhãn FAST, SLOW, REFUSED, DROP. Đo lại: `./run.sh` trong `net-lab/net-29/`. Số thời gian thuộc một lượt chạy, không phải percentile hay cam kết của image.

Ta đã có bản đồ tầng ở [[eng-osi-model]] và trực giác endpoint ở [[intro-02-networking]]. Bài này không đi lại từ Ethernet tới HTTP. Nó dạy cách chọn **quan sát có thể loại một giả thuyết**, sau đó thu hẹp ranh giới nơi lỗi có thể nằm. “Khoanh vùng” chưa nhất thiết tìm được một dòng code gây lỗi.

## ⏸ Dừng lại — đoán trước #1

Bạn được phép chạy thêm đúng một phép thử trước khi sửa cấu hình. Chọn bước có ích nhất cho ca `/slow`:

- A. Tăng connect timeout vì tổng thời gian request lớn.
- B. Ghim cùng IP bằng `--resolve`, giữ nguyên URL và đo lại các mốc.
- C. Chạy ping rồi kết luận handler khỏe nếu ping có phản hồi.
- D. Đổi TCP congestion control ngay vì request dùng TCP.

## 3. Cơ chế

### 3.1 Bắt đầu bằng hợp đồng phép đo

Chọn **B**. Nó kiểm xem bỏ bước phân giải tên có làm khoảng chờ biến mất không. Nếu không, ta giữ lại bằng chứng và chuyển điểm quan sát; chưa cần thay một tham số vận hành.

Trước lệnh đầu tiên, viết một câu có thể kiểm lại: “Từ namespace client, một process curl mới, không proxy, URL này, request GET không body, connect deadline và overall deadline đã định, kết quả này tại thời điểm này”. Namespace là vùng tách riêng trạng thái mạng của Linux; chọn sai namespace thì route, socket và capture đều có thể đúng cho một tiến trình khác. Cấu trúc đó đã có ở [[net-04-bridge-veth-vlan]].

Ghi cả kết quả đúng mong đợi. Với lab: cùng server, cùng đường đi, `/` và `/slow` đều phải trả body `ok` kèm xuống dòng. Nếu chỉ nhìn thời gian mà response là trang lỗi từ proxy, bạn đang so hai công việc khác nhau. Trong hệ thật, giữ request ID và status để ghép với access log; không đưa credential vào command history hay capture công khai.

Từ đây mỗi vòng điều tra có bốn bước: nói giả thuyết, dự đoán dấu hiệu nếu nó đúng, chạy phép thử thay ít biến nhất, rồi ghi điều đã loại được. Ví dụ: “chậm do DNS” dự đoán thời gian trước connect giảm mạnh khi ghim IP và phần chậm biến mất. Đổi đồng thời resolver, địa chỉ, HTTP version và vùng máy sẽ không còn phép thử riêng cho DNS.

### 3.2 Mốc curl là vị trí trên một trục thời gian

`curl -w` in các thông tin sau transfer; các trường thời gian dưới đây tính bằng giây. Với một transfer HTTP/1.1 trực tiếp trên TCP mới, không redirect, không retry, các mốc `time_namelookup`, `time_connect`, `time_appconnect`, `time_starttransfer`, `time_total` cho biết đã đi được tới đâu tính từ đầu. `time_starttransfer` thường được gọi là TTFB — thời gian tới byte phản hồi đầu tiên. Nó không phải thời gian chạy riêng của handler.

> **Nguồn.** curl mô tả `time_connect`: *“from the start until the TCP connect to the remote host (or proxy) was completed.”* ([curl man page](https://curl.se/docs/manpage.html#time_connect)). Bản tải nằm ở `src/curl.html`; chính vì tính “from the start” nên phải lấy hiệu các mốc khi muốn đo một khoảng.

Đối với HTTPS trong điều kiện trên, lấy `connect − namelookup` để ước lượng khoảng thiết lập TCP; `appconnect − connect` cho phần handshake TLS theo cách curl quan sát; `starttransfer − appconnect` vẫn gồm chuẩn bị/gửi request, đường truyền, hàng đợi và xử lý trước byte đầu. Với HTTP thuần, không trừ `appconnect=0` như thể đã có một handshake TLS: dùng mốc connect cho ranh giới transport. Cơ chế và số RTT nằm ở [[net-23-tls-van-hanh]], không suy chúng chỉ từ độ lớn tổng thời gian.

Điều kiện có ý nghĩa: qua HTTP proxy thì connect có thể là tới proxy; redirect tạo thêm chặng; connection reuse có thể bỏ handshake; HTTP/3 không thiết lập TCP theo công thức này. Ghi `%{http_version}`, `%{num_connects}`, proxy và redirect nếu phép thử thật có chúng. Muốn kiểm từng chặng, bắt đầu bằng URL không tự theo redirect; nếu dịch vụ buộc redirect, đo từng URL đích với cùng điều kiện xác thực. Cơ chế multiplexing và chờ giữa stream xem [[net-22-http-123]], QUIC xem [[net-19-udp-quic]].

Đặt các mốc lên trục là thấy phần cần soi tiếp: ở lab HTTP, gần toàn bộ khoảng chờ xảy ra **sau connect**. Hình cố ý phóng lớn vùng đầu; nó không vẽ 1 ms và 400 ms thành hai đoạn bằng nhau.

<svg viewBox="0 0 520 255" role="img" aria-labelledby="net29-a-t net29-a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="system-ui, sans-serif" font-size="14" fill="currentColor">
<title id="net29-a-t">Mốc tích luỹ của request SLOW</title>
<desc id="net29-a-d">Trục chính dành gần toàn chiều dài cho khoảng sau connect; cửa sổ đầu được phóng lớn riêng để đọc DNS và TCP.</desc>
<text x="20" y="25" >SLOW · HTTP thuần · đơn vị ms</text><path d="M30 100 H490" stroke="currentColor"/><rect x="32" y="65" width="450" height="35" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="110" y="88" >sau connect → byte đầu: 403,431</text><text x="30" y="125" >connect 1,205</text><text x="350" y="148" >first 404,636</text><text x="350" y="171" >total 404,769</text><path d="M32 100 L32 178 M482 100 V130" stroke="currentColor" stroke-dasharray="4 4"/><text x="20" y="198" >Phóng lớn phần đầu:</text><rect x="200" y="180" width="215" height="30" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><rect x="415" y="180" width="26" height="30" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="225" y="201" >DNS 1,075</text><text x="360" y="235" >TCP thêm 0,130</text>
</svg>

> **Suy luận.** SLOW có `connect=0.001205`, `first=0.404636`; khoảng sau connect tới byte đầu là `403,431 ms`. Điều đó khoanh vùng thời gian, chưa tách được handler chờ, proxy chờ hay đường trả response. Lab biết handler ngủ vì ta giữ source `server.py`; một incident thật cần thêm log hoặc capture phía server.

### 3.3 DNS: so cùng góc nhìn trước khi ghim địa chỉ

Dùng `dig` để hỏi một câu cụ thể: resolver nào trả status gì cho tên và loại bản ghi nào? Giữ header, ANSWER, SERVER, TTL và thời gian query; `+short` hợp để lấy địa chỉ cho script nhưng cắt mất nhiều dữ kiện cần phân biệt lỗi. Hỏi cả A lẫn AAAA nếu client chạy dual-stack. Một A đúng không loại được fallback từ IPv6 lỗi; nhánh kiểm `curl -4` và `curl -6` cùng điều kiện dẫn về [[net-09-ipv6-thuc-te]].

`dig @resolver` là một client DNS riêng. Nó không chứng minh runtime đang dùng resolver ấy, không đọc cache nội bộ của process và không chứng minh pool hiện tại sẽ mở socket mới. Đối chiếu `/etc/resolv.conf` trong đúng namespace cùng cấu hình resolver của runtime, rồi nhìn IP thực ở curl hoặc socket. Đường recursive và `dig +trace` khác nhau ở [[net-20-dns-phan-giai]]; cache, TTL và view nằm ở [[net-21-dns-van-hanh]]. Đừng lấy một lần `+trace` từ laptop thay cho chứng cứ resolver của worker.

Khi cần tách DNS khỏi phần còn lại, `--resolve tên:port:IP` cung cấp ánh xạ cho curl mà giữ URL hostname. Với HTTPS, điều đó giữ tên cho SNI và xác minh certificate; thay URL bằng IP rồi thêm `Host` không phải phép thử tương đương. Chi tiết tên TLS xem [[net-23-tls-van-hanh]]. Chỉ ghim địa chỉ bạn vừa đối chiếu, cùng port và giao thức; anycast vẫn có thể đưa cùng IP tới site khác, xem [[net-13-anycast]].

Nếu ghim IP làm lỗi biến mất, kết luận vừa đủ là “đường chọn địa chỉ/phân giải tên có liên quan trong phép thử này”. Cần so tập A/AAAA, thứ tự lựa chọn, resolver/view và endpoint thực trước khi nói “DNS server hỏng”. Nếu ghim không đổi phần chờ, ta có đối chứng để chuyển khỏi giả thuyết DNS cho chính lần chạy ấy; không tuyên bố mọi DNS của hệ thống đều khỏe.

### 3.4 Socket trả lời câu hỏi của kernel, capture trả lời câu hỏi của gói

`ss` là công cụ xem socket của Linux. Dùng `ss -lntp` trên server để tìm listener, `ss -ntip` trên client để ghép socket đang nối với process và thông tin TCP, `ss -nto` khi cần timer. `-n` giữ số IP/port, `-t` chọn TCP, `-i` thêm thông tin nội bộ TCP, `-p` thêm process trong phạm vi quyền có thể thấy. Những lựa chọn này theo [ss(8)](https://man7.org/linux/man-pages/man8/ss.8.html). Không thấy PID chưa chứng minh socket vô chủ: kiểm quyền và PID namespace trước.

Ở lab, lọc `'( dport = :18080 )'` khi curl đang đợi giúp tránh đếm socket không liên quan. `ESTAB` nói kernel địa phương đã có state kết nối; nó không xác nhận peer còn xử lý request. Với socket đã established, `Recv-Q` cho biết byte chưa được ứng dụng đọc, `Send-Q` là byte gửi chưa được xác nhận. Chúng là snapshot, không phải lịch sử. Queue bằng không vẫn có thể đi cùng ứng dụng đang chờ byte đầu; đó chính là ca lab.

Đừng mang ý nghĩa queue này áp thẳng sang dòng LISTEN. Muốn điều tra accept queue/backlog phải giữ trạng thái listener, đếm lỗi và đo lúc tải xảy ra; không suy “backlog đầy” từ một ảnh socket client. Các state đóng và bẫy keepalive đã có ở [[net-18-dong-ket-noi]]; rtt, retransmission và ACK xem [[net-16-tcp-ben-trong]], cửa sổ cùng congestion control xem [[net-17-flow-congestion-control]]. Ở đây ta dùng chúng làm dấu hiệu để chọn capture, không thay cả bài cơ chế bằng một bảng state.

Packet capture là bản ghi gói tại **một điểm bắt**. Nếu socket đang SYN-SENT, hỏi capture có SYN ra không, có SYN-ACK/RST/ICMP về không. Nếu đã ESTAB, hỏi dữ liệu request đã rời client chưa, byte nào được ACK, có payload response trở lại không. Khi cần chỉ ra đoạn mạng mất gói, chuyển điểm bắt sang đầu kia hoặc hai phía một thiết bị với cùng cửa sổ thử. Không thấy response ở client chỉ xác định nó chưa xuất hiện tại client; chưa chỉ ra thiết bị nào đã bỏ nó.

Đọc ranh giới trước khi đo chi tiết: `ip route get IP` xác định quyết định route địa phương, rồi chọn interface tương ứng. Không có SYN tại interface đang bắt có thể do app chưa gọi connect, đang chờ pool, chọn IP khác, lỗi route cục bộ hoặc bạn bắt sai chỗ. Route và forwarding xem [[net-06-routing-forwarding]], không nhẩm subnet thay cho lệnh; khi cần kiểm địa chỉ/subnet dùng [[eng-02-cidr-subnetting]].

### 3.5 BPF: một câu hỏi chính xác hơn một file pcap khổng lồ

BPF filter ở đây là biểu thức lọc gói của libpcap, được tcpdump biên dịch để quyết định gói nào được giữ. Nó khác cú pháp display filter của Wireshark: `tcp.port == 18080` không phải biểu thức nhập cho tcpdump. Trước khi chạy, đọc bộ lọc thành lời và thử trên một request biết chắc thành công; capture trống không tự chứng minh mạng im lặng.

Bộ lọc của lab giữ **hai chiều TCP**, giữa client và host server, tại các port đang so. Dùng nháy đơn để shell không xử lý ngoặc hay toán tử:

```sh
# Thực thi bởi measure.sh; file pcap vẫn còn sau khi dọn container
tcpdump -i eth0 -nn -s 128 -U -w /lab/out/flows.pcap \
  'host 10.229.29.20 and tcp and (port 18080 or port 18081 or port 18082)'
```

`host` không có qualifier hướng giữ cả source và destination; `port` cũng vậy. `-nn` tránh tra tên host và tên dịch vụ khi in; `-s 128` giữ tối đa 128 byte mỗi packet, `-U` đẩy ghi packet ra file sớm. Lab chỉ cần header/timing nên chủ ý cắt payload. Muốn phân tích đầy đủ application payload trong môi trường được phép, chọn snaplen phù hợp, có thể `-s 0`, rồi kiểm dung lượng và dữ liệu nhạy cảm. Giá trị `128` là lựa chọn của lab, không bảo đảm chứa hết mọi header có encapsulation.

Trong bộ lọc libpcap, `and` và `or` có cùng độ ưu tiên, kết hợp từ trái qua phải. Thiếu ngoặc ở `host X and tcp port 18080 or tcp port 18081` có thể bắt cả port 18081 của host khác. Đừng áp trực giác từ ngôn ngữ lập trình vào biểu thức này. Phần COMPOUND EXPRESSIONS của [pcap-filter(7)](https://www.tcpdump.org/manpages/pcap-filter.7.html) là nguồn cho luật đó. Muốn ràng buộc đúng hai đầu, viết `host A and host B and tcp and (...)`; muốn đúng một flow, thêm cả ephemeral port sau khi biết nó.

<svg viewBox="0 0 520 255" role="img" aria-labelledby="net29-b-t net29-b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="system-ui, sans-serif" font-size="14" fill="currentColor">
<title id="net29-b-t">Bộ lọc là giao của host, TCP và tập port</title>
<desc id="net29-b-d">Ba miền port nằm trong miền TCP của host server; hướng đi và về cùng được giữ.</desc>
<rect x="20" y="35" width="480" height="200" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="35" y="60" >host 10.229.29.20</text><rect x="45" y="80" width="430" height="135" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="60" y="105" >and tcp</text><rect x="65" y="125" width="110" height="45" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="80" y="153" >18080</text><rect x="205" y="125" width="110" height="45" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="220" y="153" >18081</text><rect x="345" y="125" width="110" height="45" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="360" y="153" >18082</text><text x="182" y="153" >or</text><text x="322" y="153" >or</text><text x="70" y="197" >client → server  và  server → client</text>
</svg>

Đọc offline giúp đổi câu hỏi mà không tạo thêm request. Đây là các filter thực dùng trên pcap lab:

```sh
tcpdump -nn -tttt -r out/flows.pcap \
  'tcp[tcpflags] & (tcp-syn|tcp-rst) != 0'
tcpdump -nn -tttt -r out/flows.pcap 'tcp port 18080'
```

Filter cờ đầu giữ SYN hoặc RST, gồm cả SYN-ACK vì bit SYN vẫn bật. Nó **không** giữ ACK thuần, FIN hay toàn bộ request/response; không dùng nó để kết luận “không có dữ liệu”. Khi cần SYN mở đầu mà không có ACK, điều kiện phải kiểm SYN bật và ACK tắt. Lab dùng IPv4 TCP trực tiếp; đừng bê phép đọc offset TCP này thành bộ lọc mọi IPv6 extension header hay gói trong tunnel mà chưa kiểm lại tài liệu/capture.

Đừng chỉ bắt `dst port 18080` rồi ngạc nhiên không thấy response: response có **source** port 18080. Cũng đừng chỉ bắt TCP nếu đang điều tra DNS UDP, ARP hoặc ICMP báo MTU. Bộ lọc phải đổi theo giả thuyết: DNS dùng `host resolver and (udp port 53 or tcp port 53)`; tìm tín hiệu lỗi IP cần giữ ICMP/ICMPv6 ở điểm quan sát phù hợp. Các filter mở rộng này là mẫu thao tác, chưa nằm trong pcap lab TCP. ARP xem [[net-03-arp]], MTU/PMTUD xem [[net-05-mtu-pmtud]], khung Ethernet xem [[net-02-ethernet-mac-switch]].

> **Nguồn.** tcpdump định nghĩa số gói dropped by kernel là do thiếu buffer ở cơ chế capture của hệ điều hành ([tcpdump(1)](https://www.tcpdump.org/manpages/tcpdump.1.html)). Vì thế số đó không phải bộ đếm mất gói end-to-end. `src/tcpdump.html` giữ nguyên bản nguồn; log lab báo không có kernel capture drop, vẫn không bảo đảm mọi gói cần điều tra đều khớp filter.

## ⏸ Dừng lại — đoán trước #2

Cùng host, `mtr` ICMP trả đích với không probe nào mất. Curl tới `18082` hết connect timeout. Capture thấy hai SYN cùng tuple và sequence, không thấy SYN-ACK. Câu nào đứng vững?

- A. ICMP tốt thì firewall không thể là nguyên nhân.
- B. Hai SYN nghĩa là ứng dụng đã gửi HTTP request hai lần.
- C. TCP setup chưa hoàn tất tại client; cần kiểm hai phía đường TCP tới port ấy.
- D. Chỉ từ capture client đã biết chính xác rule nào bỏ SYN.

### 3.6 mtr: so đường probe, đừng trao quyền phán quyết cho một cột

Chọn **C**. Hai SYN chưa phải hai HTTP request. `mtr` kết hợp probe theo TTL với báo cáo thống kê các phản hồi; nó quan sát đường mà **probe được chọn** đi qua. ICMP echo có thể được nhận trong khi TCP tới một port bị chặn. Khi cần gần traffic ứng dụng hơn, dùng TCP probe tới đúng port, giữ điểm xuất phát và thời điểm gần ca lỗi. Điều đó vẫn không biến probe thành một HTTP transaction có SNI, auth, body và pool như app.

Ví dụ lệnh đã chạy là `mtr -n -r -c 5 -i 0.2 10.229.29.20` và biến thể `-T -P 18082 --max-ttl 2`. `-n` giữ IP, `-r` lấy report, `-c` định số vòng, `-T` dùng TCP, `-P` chọn port; đây là lựa chọn theo [man page mtr của dự án](https://github.com/traviscross/mtr/blob/master/man/mtr.8.in). Dấu chấm thập phân trong lệnh là cú pháp phần mềm. Mẫu ít vòng chỉ đủ đối chứng lab; đừng lấy nó làm thống kê lỗi chập chờn production.

Với mạng nhiều hop, một hop không trả đủ phản hồi mà các hop sau vẫn trả bình thường không đủ chứng minh mất gói forwarding tại hop đó. Nếu loss kéo tới đích, đó là lý do kiểm thêm đường dữ liệu và đường ngược, chưa phải định vị tuyệt đối. RTT từng hop không phải thời gian xử lý riêng của router ấy. Phân biệt đường phát probe và đường trả lỗi theo [[net-08-icmp-traceroute]]; muốn quy đường vòng cho transit/peering phải kiểm dữ liệu định tuyến ở [[net-12-transit-peering-ixp]].

Cũng đừng đọc tên reverse DNS thành chủ sở hữu hay địa lý đã xác minh. Tra ASN ở [[net-10-as-asn]], cơ chế quảng bá route ở [[net-11-bgp-co-che]], policy và rút route ở [[net-14-bgp-hijack-leak-rpki]], cloud route ở [[net-15-bgp-trong-cloud]]. Những bài đó là nhánh chuyên sâu **sau khi** đã xác định vấn đề cần dữ liệu đường đi; chúng không phải danh sách lệnh phải chạy cho mọi API chậm.

Trong lab một LAN bridge, mtr chỉ có một hop tới đích. Ta không dùng kết quả đó để dạy cách định vị router trung gian. Hình dưới chỉ mã hoá ranh giới phép thử: cùng đích IP, các protocol/port không có chung kết quả.

<step-flow>
<svg viewBox="0 0 660 420" role="img" aria-labelledby="net29-c-t net29-c-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto" font-family="system-ui, sans-serif" font-size="14" fill="currentColor">
<title id="net29-c-t">Cùng đích IP, khác kết quả theo loại probe</title>
<desc id="net29-c-d">Hai endpoint cố định; ICMP trả lời, cổng đóng trả reset, cổng DROP không trả TCP response.</desc>
<defs><marker id="net29-c-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="currentColor"/></marker></defs>
<rect x="30" y="35" width="170" height="50" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><rect x="420" y="35" width="200" height="50" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="48" y="57" >client 10.229.29.10</text><text x="438" y="57" >server 10.229.29.20</text><text x="48" y="76" >eth0 · điểm capture</text><text x="438" y="76" >bridge LAN</text><path d="M115 85 V390 M520 85 V390" stroke="currentColor" stroke-dasharray="4 4"/><g data-step="1"><text x="150" y="115" >ICMP echo → đích trả lời</text><path d="M115 130 H520" stroke="#10b981" marker-end="url(#net29-c-arrow)"/><path d="M520 162 H115" stroke="#10b981" marker-end="url(#net29-c-arrow)"/></g><g data-step="2"><text x="150" y="215" >TCP 18081 → RST</text><path d="M115 230 H520" stroke="#f59e0b" marker-end="url(#net29-c-arrow)"/><path d="M520 262 H115" stroke="#f59e0b" marker-end="url(#net29-c-arrow)"/></g><g data-step="3"><text x="150" y="315" >TCP 18082 → không có phản hồi</text><path d="M115 330 H520" stroke="#f43f5e" marker-end="url(#net29-c-arrow)"/><circle cx="520" cy="345" r="10" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor"/></g>
</svg>
<step-note data-step="1">ICMP tới đích trong lab; phép đo này chưa đụng tới listener TCP.</step-note>
<step-note data-step="2">Cổng không nghe trả RST nên client có tín hiệu từ chối trước deadline.</step-note>
<step-note data-step="3">Cổng DROP giữ client đợi tới deadline; muốn quy rule cụ thể phải có bằng chứng phía server.</step-note>
</step-flow>

### 3.7 Dừng ở kết luận đủ bằng chứng, chọn bước mở rộng đúng chỗ

Sau khi đọc các phép đo, viết kết luận với ba phần: **đã thấy gì**, **loại được gì trong phạm vi nào**, **cần gì để hẹp hơn**. Ví dụ: “Ở flow tới 18080, connect hoàn tất, request có ACK, byte đầu response chỉ tới sau khoảng chờ dài. Ghim IP không bỏ được khoảng chờ. Chưa xác định phần chờ bên trong handler; cần mốc nhận request và ghi response trên server.” Câu này có thể giao cho người khác tiếp tục mà không bắt họ tin phán đoán của bạn.

Sơ đồ dưới chọn phép đo tiếp theo. Nhánh TTFB dẫn về [[net-25-proxy-timeout]]; số bài trên hình tương ứng các liên kết trong bảng và đoạn phía trên.

<step-flow>
<svg viewBox="0 0 750 750" role="img" aria-labelledby="net29-d-t net29-d-d" style="width:100%;max-width:750px;height:auto;display:block;margin:1.25rem auto" font-family="system-ui, sans-serif" fill="currentColor">
<title id="net29-d-t">Quy trình khoanh vùng từ triệu chứng tới tầng cần kiểm</title>
<desc id="net29-d-d">Trục dọc lần lượt kiểm DNS, TCP, TLS, byte đầu và body; nhánh ngang ghi công cụ, cơ chế nghi vấn và số bài đọc tiếp. Các nhánh là giả thuyết cần kiểm chứng.</desc>
<defs><marker id="net29-d-arr" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="currentColor"/></marker></defs>
<g data-step="1"><rect x="20" y="10" width="340" height="55" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="32" y="32" font-size="15">Triệu chứng → một request cụ thể</text><text x="32" y="52" font-size="15">URL · IP · namespace · deadline</text></g>
<g data-step="2"><path d="M190 65 V95" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><rect x="20" y="95" width="340" height="65" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="32" y="117" font-size="15">Tên ra đúng IP? dig, so resolver</text><text x="32" y="137" font-size="15">Đối chứng: curl --resolve</text><path d="M360 127 H450" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><text x="382" y="117" font-size="14">không</text><rect x="450" y="100" width="270" height="55" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="462" y="122" font-size="15">DNS / cache / view</text><text x="462" y="142" font-size="15">net-20 / net-21</text></g>
<g data-step="3"><path d="M190 160 V195" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><text x="200" y="182" font-size="14">có</text><rect x="20" y="195" width="340" height="85" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="32" y="217" font-size="15">TCP connect xong? time_connect, ss</text><text x="32" y="237" font-size="15">BPF: host + tcp + (các port)</text><text x="32" y="257" font-size="15">tcpdump hai chiều; mtr đúng probe</text><path d="M360 215 H450" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><text x="385" y="205" font-size="14">RST</text><rect x="450" y="175" width="270" height="60" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="462" y="197" font-size="15">Listener / REJECT / peer reset</text><text x="462" y="217" font-size="15">ss -lntp; net-18</text><path d="M360 265 H450" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><text x="375" y="255" font-size="14">im lặng</text><rect x="450" y="245" width="270" height="60" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="462" y="267" font-size="15">DROP / route / conntrack?</text><text x="462" y="287" font-size="15">net-06 / net-07; bắt hai phía</text></g>
<g data-step="4"><path d="M190 280 V325" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><text x="200" y="307" font-size="14">có</text><rect x="20" y="325" width="340" height="65" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="32" y="347" font-size="15">HTTPS: TLS xong? time_appconnect</text><text x="32" y="367" font-size="15">HTTP lab: bỏ bước TLS này</text><path d="M360 357 H450" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><text x="382" y="347" font-size="14">không</text><rect x="450" y="325" width="270" height="80" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="462" y="347" font-size="15">SNI / xác minh TLS: net-23</text><text x="462" y="367" font-size="15">Gói lớn mới treo → kiểm MTU</text><text x="462" y="387" font-size="15">tcpdump + ICMP; net-05</text></g>
<g data-step="5"><path d="M190 390 V435" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><text x="200" y="417" font-size="14">có</text><rect x="20" y="435" width="340" height="65" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="32" y="457" font-size="15">TTFB lớn? time_starttransfer</text><text x="32" y="477" font-size="15">Lab: sau connect 403,431 ms</text><path d="M360 467 H450" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><text x="390" y="457" font-size="14">có</text><rect x="450" y="435" width="270" height="65" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="462" y="457" font-size="15">App / proxy / chuỗi timeout?</text><text x="462" y="477" font-size="15">Log từng chặng; net-25</text></g>
<g data-step="6"><path d="M190 500 V545" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><text x="200" y="527" font-size="14">không</text><rect x="20" y="545" width="340" height="65" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="32" y="567" font-size="15">Body chậm? time_total − TTFB</text><text x="32" y="587" font-size="15">ss -i; tcpdump đúng flow</text><path d="M360 577 H450" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><text x="390" y="567" font-size="14">có</text><rect x="450" y="535" width="270" height="85" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="462" y="557" font-size="15">Mất gói / window / MTU?</text><text x="462" y="577" font-size="15">net-16 / net-17 / net-05</text><text x="462" y="597" font-size="15">Đối chiếu đường đi bằng mtr</text></g>
<g data-step="7"><path d="M190 610 V665" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><path d="M720 475 H735 V735 H360 V693" fill="none" stroke="currentColor" marker-end="url(#net29-d-arr)"/><rect x="20" y="665" width="340" height="55" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="32" y="687" font-size="15">Khoanh phạm vi → đo thêm tại biên</text><text x="32" y="707" font-size="15">Sửa một biến → lặp lại đối chứng</text><text x="450" y="657" font-size="14">Nhánh nghi vấn ≠ kết luận thủ phạm</text></g>
</svg>
<step-note data-step="1">Giữ cùng request và điểm xuất phát để các mốc có thể đối chiếu.</step-note>
<step-note data-step="2">Ghim IP chỉ tách bước phân giải tên; vẫn kiểm địa chỉ thực mà app chọn.</step-note>
<step-note data-step="3">RST khác im lặng. Bắt đầu kia trước khi quy lỗi một rule hay thiết bị.</step-note>
<step-note data-step="4">TLS và MTU là hướng kiểm tiếp, chưa đo ở lab HTTP này.</step-note>
<step-note data-step="5">Khoảng sau connect gồm cả đường truyền và xử lý; cần log để hẹp hơn.</step-note>
<step-note data-step="6">Body chậm cần dấu hiệu TCP/MTU, không chỉ tổng thời gian tải.</step-note>
<step-note data-step="7">Mỗi nhánh là giả thuyết. Giữ bằng chứng và kiểm lại sau thay đổi.</step-note>
</step-flow>

Bảng sau là thứ tự rẽ nhánh sau lập luận trên, không phải bảng quy triệu chứng thành thủ phạm:

| Quan sát tại điểm xuất phát | Phép đo thu hẹp tiếp | Cơ chế cần đọc khi có dấu hiệu phù hợp |
|---|---|---|
| Chưa có địa chỉ hoặc chọn địa chỉ khác | Đúng resolver/view, A/AAAA, endpoint thực, ghim IP | [[net-20-dns-phan-giai]], [[net-21-dns-van-hanh]] |
| Chưa hoàn tất connect | Route cục bộ, SYN/response hai phía, listener đúng namespace | [[net-06-routing-forwarding]], [[net-18-dong-ket-noi]] |
| TCP xong, TLS không xong | Tên SNI, certificate, ALPN, capture đúng TLS endpoint | [[net-23-tls-van-hanh]] |
| Kết nối có, payload lớn mới treo | Capture ICMP/size, retransmission và window | [[net-05-mtu-pmtud]], [[net-16-tcp-ben-trong]], [[net-17-flow-congestion-control]] |
| Handler chưa nhận dù client đã gửi | Capture tại server và proxy, log từng chặng | [[net-01-boc-request-tcpdump]], [[net-22-http-123]] |
| Chỉ lỗi khi tăng số kết nối | Tuple, rate mở/đóng, counters NAT/conntrack theo thời gian | [[net-07-nat-conntrack]], [[net-18-dong-ket-noi]] |

Một ACK cho byte request chỉ chứng minh TCP peer nhận byte theo hợp đồng TCP, không chứng minh handler đã đọc hoặc database đã commit. Nếu TCP peer là proxy, ACK còn nằm trước upstream. Vì vậy muốn nói “server chậm” phải nói rõ server nào: TLS endpoint, proxy, hay process cuối. Ngay cả khi source lab có `sleep`, các mốc curl vẫn gồm scheduler và đường đi; không ép chúng bằng đúng tham số ngủ.

## 4. Lab

### 4.1 Dựng phạm vi riêng và giữ bằng chứng

Bộ lab nằm ở `net-lab/net-29/`: `Dockerfile`, `run.sh`, `measure.sh`, `server.py`; output ở `out/`. Chạy từ thư mục đó:

```sh
./run.sh | tee out/runner.txt
```

`out/` có sẵn trong bộ lab. Script build image `net29-tools`, tạo network `net29-lan` với client `10.229.29.10`, server `10.229.29.20`, rồi trap để dọn hai container và network ngay cả khi một bước lỗi. Không publish cổng ra host. Nếu subnet này trùng mạng của bạn, đổi đồng bộ địa chỉ trong script trước khi chạy. Image Alpine được build với package từ repository tại thời điểm chạy; muốn so số tuyệt đối giữa các lần cần giữ image digest cùng version đã in đầu log.

Server chạy dnsmasq cho tên `api.lab.test`, HTTP ở `18080`; `/slow` ngủ `0,4 s` trước khi tạo response. Cổng `18081` không có listener, `18082` bị rule INPUT DROP trong chính container server. Đây là ba điều kiện **do ta tạo**, chưa phải suy từ triệu chứng. Không có TLS, proxy, QUIC, nhiều router hay tải đồng thời trong phép đo này.

`measure.sh` bắt đầu tcpdump trước request, lấy `ss` lúc curl còn đợi, chạy mtr sau nhóm curl, rồi dừng capture bằng SIGINT để ghi thống kê. Vì vậy flow của mtr tới port DROP cũng nằm trong pcap: phải ghép tuple và thời gian, không gom mọi SYN vào request curl. `out/lab.txt` giữ stderr lẫn stdout; `out/flows.pcap` giữ bản nhị phân để đổi filter offline.

### 4.2 Hỏi DNS, đọc cả điều không thuận lợi

Lệnh thực của lab:

```sh
dig @10.229.29.20 api.lab.test A +noall +comments +answer +stats
dig @10.229.29.20 api.lab.test AAAA +noall +comments +answer +stats
ip route get 10.229.29.20
```

Trích các dòng quyết định từ DNS và ROUTE trong `out/lab.txt`:

```text
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 46380
api.lab.test.            0       IN      A       10.229.29.20
;; Query time: 1 msec
;; SERVER: 10.229.29.20#53(10.229.29.20) (UDP)
;; ->>HEADER<<- opcode: QUERY, status: REFUSED, id: 46234
; EDE: 14 (Not Ready)
10.229.29.20 dev eth0 src 10.229.29.10 uid 0
```

A có địa chỉ, nhưng AAAA trả REFUSED trong cấu hình dnsmasq `--no-resolv --address=...` này. Không sửa log thành NODATA để câu chuyện đẹp hơn. Curl vẫn gọi được bằng địa chỉ A ở lượt đo; điều đó không chứng minh nhánh AAAA ở mọi resolver đều hoạt động đúng. Lab không dựng một recursive resolver đầy đủ và không đo thời gian negative cache. Route cho biết chọn `eth0` và source `10.229.29.10`, đủ để đặt capture đúng interface; không có next-hop router trung gian trong đường trực tiếp này.

### 4.3 Cho bản sai “DNS hoặc connect chậm” chạy trước

`measure.sh` dùng format sau cho cả FAST, SLOW và PINNED; mỗi lần curl là process mới:

```sh
fmt='code=%{http_code} ip=%{remote_ip} dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} first=%{time_starttransfer} total=%{time_total}\n'
curl --noproxy '*' -sS -o /dev/null -w "$fmt" \
  http://api.lab.test:18080/slow
curl --noproxy '*' --resolve api.lab.test:18080:10.229.29.20 \
  -sS -o /dev/null -w "$fmt" http://api.lab.test:18080/slow
```

Output nguyên dòng, lần lượt FAST, SLOW, PINNED:

```text
code=200 ip=10.229.29.20 dns=0.003172 connect=0.003495 tls=0.000000 first=0.004750 total=0.004831
code=200 ip=10.229.29.20 dns=0.001075 connect=0.001205 tls=0.000000 first=0.404636 total=0.404769
code=200 ip=10.229.29.20 dns=0.000007 connect=0.000130 tls=0.000000 first=0.402107 total=0.402235
```

Bỏ DNS không bỏ khoảng đợi sau connect. `tls=0` phù hợp với HTTP thuần trong lab, không phải bằng chứng TLS handshake “miễn phí”. FAST là đối chứng cùng server và route, thay path; PINNED là đối chứng bỏ phân giải tên, giữ path chậm. Không có đủ mẫu để so mức chênh vài ms giữa các lần thành một cải thiện hiệu năng ổn định.

Khi SLOW chưa xong, lệnh `ss -ntip '( dport = :18080 )'` in:

```text
ESTAB 0      0       10.229.29.10:60472 10.229.29.20:18080 users:(("curl",pid=33,fd=4))
```

Dòng chi tiết cùng socket có `rtt:0.056/0.032`, `bytes_sent:86`, `bytes_acked:87`. Đừng lấy số byte có tính SYN trong kế toán TCP so thẳng với HTTP body. Bằng chứng cần ở đây là socket đúng process đã established và không có queue tồn tại đúng lúc snapshot; chưa có dữ liệu đủ để đổ lỗi congestion hay flow control.

### 4.4 Đặt capture vào khoảng trống giữa hai mốc

Filter offline `tcp port 18080` cho biết request SLOW dùng source port `60472`. Trích đúng hai dòng payload, không phải output dựng lại:

```text
2026-11-13 07:13:27.184857 IP 10.229.29.10.60472 > 10.229.29.20.18080: Flags [P.], seq 1:87, ack 1, win 502, options [nop,nop,TS val 316153207 ecr 1197796955], length 86
2026-11-13 07:13:27.588162 IP 10.229.29.20.18080 > 10.229.29.10.60472: Flags [P.], seq 1:113, ack 87, win 509, options [nop,nop,TS val 1197797358 ecr 316153207], length 112
```

Hai dòng cách nhau **403,305 ms** tại điểm bắt client. Trong log đầy đủ có ACK request ngay sau dòng đầu, trước response. Pcap cùng curl đặt phần chờ sau khi request rời client; source server giải thích nguyên nhân được cài là `time.sleep(0.4)`. Pcap **một phía** không tự đo được thời gian CPU hay database của handler. Muốn phân biệt ở hệ thật, thêm mốc nhận request/gửi header trên server hoặc capture phía server trong cùng cửa sổ thử.

### 4.5 Tách refusal khỏi im lặng

Đổi port, giữ host và dùng `--connect-timeout 2 --max-time 3`. Đây là deadline để phép thử kết thúc, không phải thời gian mặc định của TCP. Output REFUSED rồi DROP:

```text
curl: (7) Failed to connect to api.lab.test port 18081 after 0 ms: Could not connect to server
code=000 ip= dns=0.000873 connect=0.000000 tls=0.000000 first=0.000000 total=0.001005
curl_exit=7
curl: (28) Connection timed out after 2002 milliseconds
code=000 ip= dns=0.000989 connect=0.000000 tls=0.000000 first=0.000000 total=2.002774
curl_exit=28
```

Connect bằng không ở hai dòng là **chưa hoàn tất mốc**, không có nghĩa setup mất đúng không giây. Filter SYN/RST cho port đóng thấy chiều trả về:

```text
2026-11-13 07:13:27.997714 IP 10.229.29.20.18081 > 10.229.29.10.49408: Flags [R.], seq 0, ack 4135255592, win 0, length 0
```

Ở port DROP, hai SYN đầu của curl là:

```text
2026-11-13 07:13:28.002586 IP 10.229.29.10.34980 > 10.229.29.20.18082: Flags [S], seq 2620998197, win 64240, options [mss 1460,sackOK,TS val 316154024 ecr 0,nop,wscale 7], length 0
2026-11-13 07:13:29.027167 IP 10.229.29.10.34980 > 10.229.29.20.18082: Flags [S], seq 2620998197, win 64240, options [mss 1460,sackOK,TS val 316155049 ecr 0,nop,wscale 7], length 0
```

Cùng tuple, cùng sequence, khác thời điểm: đây là SYN thử lại của cùng lần nối. Không có HTTP request được chứng minh đã gửi ở flow này. Trong lab ta biết rule DROP đã tạo; trong thực tế, “SYN ra, không trả lời tại client” còn cần capture đầu kia để tách firewall, đường đi, đường về và server không trả. Một RST có source là server cũng chưa đủ quy trách nhiệm process: thiết bị giữa đường có thể phát reset; phải đối chiếu vị trí bắt và cấu hình.

### 4.6 Giữ kết quả mtr rỗng, không diễn giải quá mức

MTR ICMP trong `out/lab.txt` cho dòng sau; số dùng dấu chấm vì đây là output gốc:

```text
HOST: 17bd665dfb7d                Loss%   Snt   Last   Avg  Best  Wrst StDev
  1.|-- 10.229.29.20               0.0%     5    0.1   0.1   0.0   0.1   0.0
```

Đây là năm probe ICMP có phản hồi, không kiểm listener HTTP. Nhánh TCP tới port DROP chỉ in:

```text
MTR TCP DROP PORT
Start: 2026-11-13T07:13:36+0000
HOST: 17bd665dfb7d                Loss%   Snt   Last   Avg  Best  Wrst StDev
```

Bản mtr này không in một hàng hop mất gói cho ca trực tiếp bị DROP. Không biến report rỗng thành một con số loss tự nghĩ ra. Capture từ thời điểm đó vẫn có SYN mtr với source port khác flow curl; nghĩa là report rỗng không phải bằng chứng tool không gửi probe. Kết luận được phép là “không có phản hồi TCP được thể hiện ở report; phép thử curl và pcap cũng chưa thấy setup hoàn tất”. Chưa đo nhánh mtr qua nhiều router ở bài này; dùng lab của [[net-08-icmp-traceroute]] nếu cần chứng minh bẫy hop trung gian.

Thống kê cuối capture có `93 packets captured`, `100 packets received by filter`, `0 packets dropped by kernel`. Không lấy `100 − 93` chia `100` để báo mạng mất `7%`: các bộ đếm capture có ngữ nghĩa phụ thuộc nền tảng và thời điểm dừng, không phải bộ đếm gói được gửi và được nhận ở hai đầu. Đây cũng là lý do giữ nguyên pcap và lệnh, thay vì chỉ chụp một dòng dashboard.

## 5. Tính tay

### 5.1 Chọn khoảng có thể cứu tổng thời gian

Từ SLOW: `dns=0.001075`, `connect=0.001205`, `first=0.404636`, `total=0.404769`, đơn vị giây. Tính ba khoảng: sau DNS tới connect, sau connect tới byte đầu, sau byte đầu tới xong. Nếu chỉ bỏ hoàn toàn thời gian DNS trong mô hình tuần tự của lượt này, bạn cứu được bao nhiêu phần trăm tổng?

**Lời giải:** lần lượt **0,130 ms**, **403,431 ms**, **0,133 ms**. DNS chiếm `0,001075 / 0,404769 × 100 ≈ 0,266%`. Đây là tính từ số đo một transfer, không phải dự báo tốc độ khi đổi resolver: cache, địa chỉ được chọn và lịch thực thi có thể đổi. Nhưng nó đủ bác mục tiêu chữa toàn bộ khoảng chờ bằng việc rút ngắn đúng bước DNS hiện đã đo.

### 5.2 Một lần nối, bao nhiêu lần thử và bao nhiêu request?

Hai SYN ở `07:13:28.002586` và `07:13:29.027167` cùng tuple và sequence. Curl kết thúc ở tổng `2,002774 s`. Khoảng giữa hai lần thấy SYN là bao nhiêu? Có thể kết luận app retry HTTP hai lần không?

**Lời giải:** `29,027167 − 28,002586 = 1,024581 s`. Capture chỉ chứng minh hai lần phát SYN tại client trong một lần thử kết nối; chưa có setup hoàn tất để gửi HTTP theo đường thử này. Overall time còn gồm DNS và chờ sau SYN thứ hai. Không lấy khoảng SYN này làm hằng số retry của mọi kernel; timer và backoff xem [[net-16-tcp-ben-trong]].

### 5.3 Số mẫu nhỏ cho phép khẳng định tới đâu?

Mtr gửi năm probe ICMP, nhận đủ năm. Người khác kết luận “tỉ lệ mất gói thật bằng không”. Dùng mô hình giả định mỗi probe độc lập với xác suất mất `10%`: xác suất vẫn thấy cả năm thành công là bao nhiêu?

**Lời giải:** `0,9^5 = 0,59049`, tức **59,049%**. Đây là **suy luận trên mô hình**, không phải số đo loss của LAN; loss thực còn có thể theo cụm, không độc lập. Ngay cả mô hình đơn giản cũng đủ cho thấy năm lần thành công không xác lập xác suất mất thật bằng không. Thêm nữa, ICMP và TCP port bị DROP là hai phép thử khác nhau, tăng mẫu ICMP không biến nó thành kiểm tra TCP.

## 6. Chuyển giao

1. Một worker có request chờ nhưng không có socket mới trong `ss`. Bạn đặt mốc nào trong runtime để phân biệt pool wait với DNS wait, rồi chọn điểm capture nào? Đừng mở đầu bằng đổi timeout.
2. `dig` từ laptop trả IP mới, process trong container vẫn có socket tới IP cũ. Bạn giữ bằng chứng gì trước khi restart để tách resolver view, cache process và connection reuse? Trỏ lại bài giải thích đồng hồ liên quan.
3. Client thấy SYN-ACK, TLS không xong, request nhỏ và lớn đều chưa có HTTP. Bạn dùng tên URL, địa chỉ ghim và TLS endpoint thế nào để kiểm SNI mà không bỏ xác minh certificate?
4. `Send-Q` phía server tăng, client nhận response body chậm; cùng lúc `mtr` ICMP không mất probe. Hãy nêu hai giả thuyết khác tầng và phép đo phân biệt chúng, thay vì kết luận “băng thông thiếu”.
5. Một capture lọc `dst port 443` chỉ có chiều đi; một người báo server không trả. Bạn sửa filter và thử đối chứng nào trước khi yêu cầu đổi firewall? Nếu đường dùng HTTP/3 thì còn phải đổi gì?
6. TCP peer của client là reverse proxy. Capture tại client cho thấy ACK request ngay, response đầu về muộn; access log upstream ghi xử lý xong trước đó. Hai máy chưa đối chiếu đồng hồ, proxy có retry và dùng pool, chỉ một vùng xảy ra lỗi. Hãy thiết kế bộ bằng chứng tối thiểu để tách chờ pool, retry upstream, đường trả lời và hàng đợi ghi của proxy; nêu chính xác kết luận nào vẫn chưa thể rút ra nếu không sửa instrumentation.

## 7. Tóm tắt

- Chọn đúng request, namespace, endpoint và đường proxy trước khi dùng một output để loại giả thuyết.
- Các mốc curl là thời gian tích luỹ; phải lấy hiệu trong điều kiện transfer đã nêu, không cộng chúng thành latency.
- Lab HTTP có khoảng sau connect tới byte đầu `403,431 ms`; ghim IP vẫn giữ khoảng chờ, nên chữa DNS không giải quyết ca đã đo.
- `ss` là snapshot state/queue địa phương; ESTAB và queue bằng không chưa xác nhận handler đang tiến triển.
- BPF phải có ngoặc đúng và giữ hai chiều cần xem; filter cờ SYN/RST không chứa toàn bộ cuộc hội thoại.
- RST phản hồi khác im lặng hết deadline; lab có curl exit 7 ở port đóng và exit 28 ở port DROP, không có một thủ phạm chung chỉ từ chữ “connect lỗi”.
- Mtr báo kết quả của probe; ICMP thành công không chứng minh TCP listener, TLS hay HTTP khỏe.
- Kết luận điều tra phải giữ phạm vi bằng chứng và bước kiểm tiếp; thay một biến rồi lặp lại đối chứng trước khi gọi đó là bản sửa.

→ **Bài 30 — Capstone: dựng lại 6 sự cố**: bỏ nhãn nguyên nhân có sẵn của lab, dùng quy trình này để chọn phép đo và chỉ ra tầng hỏng trước khi sửa.
