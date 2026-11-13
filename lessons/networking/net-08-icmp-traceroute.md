# Bài 8 — ICMP và traceroute: đọc dấu sao mà không kết tội nhầm router

## 1. Mục tiêu

Sau bài này bạn có thể:

- Giải thích từng dòng traceroute bằng probe độc lập, TTL và gói trả lời tương ứng, thay vì tưởng một probe chạy qua cả bảng.
- Phân biệt Echo Reply, Time Exceeded và Destination Unreachable bằng type/code cùng phần gói gốc được trích lại.
- Tái hiện `* * *` ở một hop trong khi gói TTL lớn hơn vẫn qua chính router đó tới server.
- Bác bỏ phép trừ RTT hai hop để suy ra độ trễ link bằng một lab chỉ làm chậm ICMP do router sinh ra.
- Chọn UDP, ICMP hoặc TCP traceroute theo câu hỏi cần kiểm, rồi dùng giao dịch ứng dụng xác nhận điều probe chưa chứng minh.
- Thiết kế phép đo tiếp khi mọi hop sau một điểm đều im lặng, đồng thời chỉ ra điều chưa thể kết luận từ một đầu mạng.

## 2. Triệu chứng

Bạn kiểm một HTTP endpoint bằng traceroute. Hop đầu là `* * *`. Hop thứ hai trả **81,198–84,488 ms**. Đích ở hop thứ ba lại trả **0,030–0,088 ms**. `curl` chạy sau đó trong cùng cấu hình can thiệp trả HTTP **200**, tổng **7,658 ms**. Có người chỉ vào hop hai: “Router này thêm hơn 80 ms, mở ticket lỗi đường truyền.” Người khác chỉ vào dấu sao: “Hop đầu chết rồi, số phía sau chắc là cache.”

Cả hai cách đọc đều tạo ra một mô hình có thể kiểm. Nếu hop đầu không forward, gói tới hop thứ ba đi qua đâu? Nếu mọi gói phải chờ thêm 80 ms tại hop thứ hai, vì sao TCP connect chỉ **0,558 ms**? Đừng vội chọn công cụ “chính xác hơn”; trước hết xác định traceroute đang bấm giờ **việc gì**.

> **Đo trên lab.** Docker/colima, Alpine 3.20, Linux `6.8.0-64-generic` aarch64, traceroute `2.1.5`, iproute2 `6.9.0`, iptables `1.8.10`, curl `8.14.1`. Tuyến kín `10.8.1.2 → r1 → r2 → 10.8.3.2`; r1 DROP riêng ICMP Time Exceeded do nó phát, r2 trì hoãn riêng thông báo đó bằng netem `80ms`. Số trên lấy từ `out/delay.txt` và `out/application.txt`. Đo lại: `./run.sh` trong `~/projects/net-lab/net-08/`; điều kiện đầy đủ ở `inside.sh`, `out/environment.txt`.

Bài 7 đã chỉ ra NAT giữ state để dịch gói và chiều trả lời. Bài này xét thêm những gói **báo lỗi về một gói khác**: chúng cũng có đường đi, bộ lọc và thời gian xử lý riêng. Không lặp OSI, CIDR hay handshake TCP; nếu cần bản đồ tầng, xem [[eng-osi-model]], [[eng-02-cidr-subnetting]], [[eng-03-tcp-tls]]. Bài 5 phụ trách MTU/PMTUD; ở đây chỉ nhắc loại ICMP cần giữ để không tự làm hỏng chẩn đoán.

## ⏸ Dừng lại — đoán trước #1

Với topology chỉ có một tuyến qua r1 và r2, hop đầu không trả lời nhưng đích vẫn trả lời. Kết luận nào đứng vững?

- (a) Traceroute lấy địa chỉ đích từ cache nên chưa có gói thật tới server.
- (b) Router r1 không trả lời probe TTL thấp đúng hạn; điều đó không chứng minh nó ngừng chuyển tiếp probe TTL cao.
- (c) Gói tự bỏ qua router r1 khi không nhận được ICMP.
- (d) Dấu sao chỉ có thể xuất hiện do mất đường về, không thể do filter tại router.

## 3. Cơ chế

### 3.1 TTL buộc gói dừng, ICMP cho nguồn biết vì sao

Đáp án **(b)**. **TTL — Time To Live — là trường giới hạn tuổi của gói IPv4; mỗi router khi forward phải giảm ít nhất một đơn vị.** Trong tuyến Linux ở lab, nó hoạt động như giới hạn hop: probe TTL 1 hết hạn tại r1; probe TTL 2 đi qua r1 rồi hết hạn tại r2; probe TTL 3 qua cả hai router và tới server với TTL 1. Server nhận gói gửi **cho chính nó**, không cần forward nó qua một router nữa.

Tên Time To Live dễ khiến người đọc tưởng TTL là số mili giây được đo bằng đồng hồ. [RFC 1812 §5.3.1](https://www.rfc-editor.org/rfc/rfc1812.txt) giữ nguồn gốc time limit nhưng bắt router giảm TTL ít nhất một khi forward, kể cả chưa qua một giây. Bài chỉ dùng quy tắc giảm theo chặng đã thấy ở capture, không đổi định nghĩa chuẩn thành một bộ đếm thời gian ứng dụng.

**ICMP — Internet Control Message Protocol — là giao thức thông báo điều kiện xử lý IP và phục vụ một số trao đổi chẩn đoán.** Nó nằm trong payload của IP, không chạy “trên port ICMP”. **Type** chọn loại thông báo; **code** phân biệt trường hợp cụ thể của loại đó. Trong IPv4, Time Exceeded type 11/code 0 báo hết TTL khi đang đi qua mạng; code 1 lại báo hết thời gian ghép mảnh. Đọc chỉ chữ “timeout” mà bỏ type/code sẽ trộn hai cơ chế khác nhau.

> **Nguồn.** [RFC 792, Time Exceeded](https://www.rfc-editor.org/rfc/rfc792.txt) định nghĩa type 11 với code 0 là *“time to live exceeded in transit”*. [RFC 1812 §5.3.1](https://www.rfc-editor.org/rfc/rfc1812.txt) quy định bỏ gói khi TTL giảm về không và phát thông báo về nguồn, với các điều kiện/ngoại lệ ICMP ở §4.3.2.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 395" role="img" aria-labelledby="net08-a-t net08-a-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto">
<title id="net08-a-t">TTL lần lượt hết hạn tại r1, r2 và probe tới server</title>
<desc id="net08-a-d">TTL lần lượt hết hạn tại r1, r2 và probe tới server</desc>
<defs><marker id="net08-a-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="340" y="25" font-size="14" text-anchor="middle" fill="currentColor">Các probe độc lập · đích 10.8.3.2</text><rect x="35" y="55" width="110" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="90" y="83" font-size="14" text-anchor="middle" fill="currentColor">Client</text><rect x="210" y="55" width="110" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="265" y="83" font-size="14" text-anchor="middle" fill="currentColor">r1</text><rect x="385" y="55" width="110" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="440" y="83" font-size="14" text-anchor="middle" fill="currentColor">r2</text><rect x="560" y="55" width="110" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="615" y="83" font-size="14" text-anchor="middle" fill="currentColor">Server</text><line x1="90" y1="100" x2="90" y2="370" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 4"/><line x1="265" y1="100" x2="265" y2="370" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 4"/><line x1="440" y1="100" x2="440" y2="370" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 4"/><line x1="615" y1="100" x2="615" y2="370" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 4"/><g data-step="1"><line x1="90" y1="135" x2="265" y2="135" stroke="currentColor" stroke-width="2" marker-end="url(#net08-a-arr)"/><text x="177" y="124" font-size="13" text-anchor="middle" fill="currentColor">TTL 1</text><line x1="265" y1="170" x2="90" y2="170" stroke="currentColor" stroke-width="2" marker-end="url(#net08-a-arr)"/><text x="177" y="192" font-size="13" text-anchor="middle" fill="currentColor">11/0 từ r1</text></g><g data-step="2"><line x1="90" y1="225" x2="440" y2="225" stroke="currentColor" stroke-width="2" marker-end="url(#net08-a-arr)"/><text x="177" y="214" font-size="13" text-anchor="middle" fill="currentColor">TTL 2</text><text x="350" y="214" font-size="13" text-anchor="middle" fill="currentColor">TTL 1</text><line x1="440" y1="255" x2="90" y2="255" stroke="currentColor" stroke-width="2" marker-end="url(#net08-a-arr)"/><text x="350" y="276" font-size="13" text-anchor="middle" fill="currentColor">11/0 từ r2</text></g><g data-step="3"><line x1="90" y1="315" x2="615" y2="315" stroke="currentColor" stroke-width="2" marker-end="url(#net08-a-arr)"/><text x="177" y="304" font-size="13" text-anchor="middle" fill="currentColor">TTL 3</text><text x="350" y="304" font-size="13" text-anchor="middle" fill="currentColor">TTL 2</text><text x="525" y="304" font-size="13" text-anchor="middle" fill="currentColor">TTL 1</text><line x1="615" y1="345" x2="90" y2="345" stroke="currentColor" stroke-width="2" marker-end="url(#net08-a-arr)"/><text x="525" y="367" font-size="13" text-anchor="middle" fill="currentColor">3/3 từ server</text></g>
</svg>
<step-note data-step="1">Probe đầu bị bỏ tại r1 khi cần forward; ICMP là gói mới về client.</step-note>
<step-note data-step="2">Probe TTL 2 đi qua r1, hết hạn tại r2. Nó không phải probe cũ được gửi tiếp.</step-note>
<step-note data-step="3">Probe TTL 3 tới server với TTL 1; port UDP không mở gây Port Unreachable.</step-note>
</step-flow>

Mũi tên r1→client là **gói IP mới chứa ICMP**, không phải probe cũ được quay đầu. Probe hết TTL đã bị bỏ. Lần TTL tiếp theo là một gói khác; traceroute có thể tiếp tục phát nó dù gói trước chưa có hồi đáp. Vì vậy một dòng mất phản hồi không làm các dòng sau vô nghĩa.

**Probe** là gói thử được công cụ phát ra để kích thích một phản hồi có thể nhận diện. Mỗi probe có thời điểm gửi và phản hồi riêng. Linux traceroute của lab dùng UDP mặc định, tăng port đích theo probe. Ở đích không có socket UDP lắng nghe port đó, kernel đích trả ICMP Destination Unreachable type 3/code 3, tức port unreachable. Nó là tín hiệu kết thúc hữu ích cho traceroute, không phải bằng chứng máy đích “không tới được” theo nghĩa IP. Chính việc đích nhận UDP mới tạo ra lời từ chối port.

[traceroute(8)](https://man7.org/linux/man-pages/man8/traceroute.8.html) mô tả UDP mặc định cùng các phương pháp khác; đừng suy mọi binary có tên traceroute/tracert trên mọi hệ điều hành đều dùng UDP. Toàn bộ flags và số mặc định trong bài thuộc binary Linux đã ghi phiên bản.

### 3.2 Một ICMP error mang hai lớp địa chỉ cần đọc riêng

Để ghép ICMP error với probe, nguồn cần biết thông báo đang nói về gói nào. **Quoted packet** là phần gói gốc được ICMP error chép vào payload để bên nhận nhận diện lỗi. RFC 792 có cấu trúc header IP gốc cộng phần đầu dữ liệu gốc; RFC 1812 §4.3.2.3 yêu cầu router nên trả lại nhiều hơn trong giới hạn quy định. Vì vậy đừng cắt capture theo một độ dài header tưởng cố định rồi khẳng định phần quote bị hỏng.

Với UDP, những byte đầu header giao vận chứa port nguồn/đích; nhờ đó công cụ ghép ICMP về đúng probe, dù outer IP của phản hồi là router chứ không phải server đích. **Outer IP** là IP header của gói đang mang thông báo; **inner IP** là IP header nằm trong đoạn quote. Chúng trả lời hai câu hỏi khác nhau: “ai gửi báo lỗi?” và “gói nào làm nó phát lỗi?”.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 350" role="img" aria-labelledby="net08-b-t net08-b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net08-b-t">Header ngoài nhận diện nơi báo lỗi, quote nhận diện probe</title>
<desc id="net08-b-d">Header ngoài nhận diện nơi báo lỗi, quote nhận diện probe</desc>
<defs><marker id="net08-b-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="15" y="45" width="490" height="250" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="260" y="27" font-size="14" text-anchor="middle" fill="currentColor">Một gói lỗi: vỏ ngoài và gói được trích</text><text x="260" y="75" font-size="14" text-anchor="middle" fill="currentColor">Outer IPv4 · r2 → client</text><rect x="35" y="95" width="450" height="180" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="260" y="122" font-size="14" text-anchor="middle" fill="currentColor">ICMP Time Exceeded · type 11/code 0</text><rect x="55" y="145" width="410" height="110" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="260" y="173" font-size="14" text-anchor="middle" fill="currentColor">Quote: probe làm phát lỗi</text><rect x="75" y="190" width="220" height="40" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="185" y="215" font-size="13" text-anchor="middle" fill="currentColor">IP: client → server</text><rect x="310" y="190" width="135" height="40" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="377" y="215" font-size="13" text-anchor="middle" fill="currentColor">UDP ports</text><text x="260" y="326" font-size="13" text-anchor="middle" fill="currentColor">Ghép lỗi về probe bằng dữ liệu bên trong</text>
</svg>

Ở probe TTL 2 của baseline, capture phía client có outer nguồn `10.8.2.2`, outer đích `10.8.1.2`; bên trong quote vẫn ghi nguồn `10.8.1.2`, đích `10.8.3.2` và port UDP của probe. TTL inner được thấy là 1 ở bản quote Linux này, còn TTL outer tới client là 63. Không lấy TTL outer 63 rồi kết luận probe đã qua 63 router; đó là ngân sách còn lại của gói phản hồi mới, chưa biết TTL khởi tạo nếu không kiểm đầu phát.

> **Đo trên lab.** `out/capture.txt` có UDP từ client với TTL 1/2/3, ICMP Time Exceeded từ r1/r2 và Port Unreachable từ server. Probe mặc định dài 60 byte; phản hồi ICMP trong baseline dài 88 byte, trong đó IPv4 outer 20 byte và ICMP 68 byte. Đo lại bằng `./run.sh`, đọc dòng tổng độ dài cùng phần quote ngay dưới nó. Đây là format của capture này, không phải hằng số kích thước mọi ICMP.

Các loại thường cần phân biệt chỉ nên đặt cạnh nhau sau khi đã đọc cơ chế:

| Trao đổi IPv4 | Type/code từ RFC 792 | Tín hiệu nhận được | Điều nó không chứng minh |
|---|---|---|---|
| Echo Request / Echo Reply | 8/0 và 0/0 | Có đáp ứng cho phép thử echo | Port TCP của app đang mở |
| Time Exceeded khi transit | 11/0 | Probe đã hết TTL tại nơi phát lỗi | Mọi gói TTL lớn cũng bị bỏ |
| Destination Unreachable: port | 3/3 | Nơi phát báo không có port đích dùng được | HTTP endpoint đã trả response |
| Destination Unreachable: fragmentation needed | 3/4 | Điều kiện phân mảnh/DF cần xử lý | Mạng “cấm ping” là nguyên nhân |

Nguồn toàn bộ mã ở bảng: [RFC 792](https://www.rfc-editor.org/rfc/rfc792.txt), các mục Echo, Destination Unreachable và Time Exceeded. Bài 5 xử lý PMTUD và MTU; ở đây chỉ cần thấy lý do không nên gộp ICMP thành một loại traffic “ping” rồi chặn hết.

NAT khiến việc đọc quote còn cần cẩn thận hơn. Gói báo lỗi có outer header riêng và quote có thể mang tuple thuộc phía trước hoặc sau dịch, tuỳ điểm capture và cách NAT xử lý lỗi. Muốn gán ICMP về socket, so phần quote với tuple ở đúng phía router theo bài 7; không so port trong log client với một tuple ngoài rồi bảo đó là gói lạ. Bài này không có NAT trong tuyến, nên không dùng capture hiện tại để khẳng định một thiết bị NAT cụ thể dịch inner header như thế nào.

### 3.3 Dấu sao là phép đo không nhận được phản hồi đúng hạn

**`*` có nghĩa công cụ không nhận được phản hồi phù hợp cho probe trong cửa sổ chờ**. Với cấu hình lab `-q 3`, ba dấu sao thuộc ba probe của cùng TTL. Cửa sổ chờ không nhận được câu trả lời có thể do probe mất trước nơi hết TTL, router không sinh ICMP, ICMP bị lọc trên chiều về, ICMP tới muộn, hoặc công cụ không ghép được nó về probe. Những nguyên nhân đó tạo cùng một ký tự, nên riêng ký tự không định vị được chỗ hỏng.

Trong lab ta biết nguyên nhân vì tự đặt rule r1: DROP riêng type 11 ở **OUTPUT**, chain xét gói do máy hiện tại tạo. **FORWARD** là chain xét gói được máy đó chuyển tiếp qua. Rule OUTPUT này chặn phản hồi chẩn đoán r1 tạo, nhưng không có rule tương ứng chặn probe TTL lớn đi qua FORWARD. Nó cũng không chặn mọi ICMP: Echo Reply từ server đi qua r1 là traffic transit, không phải thông báo type 11 do r1 tạo.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 355" role="img" aria-labelledby="net08-c-t net08-c-d" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto">
<title id="net08-c-t">Nhánh phát ICMP của r1 bị cắt nhưng tuyến transit còn</title>
<desc id="net08-c-d">Nhánh phát ICMP của r1 bị cắt nhưng tuyến transit còn</desc>
<defs><marker id="net08-c-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="340" y="25" font-size="14" text-anchor="middle" fill="currentColor">r1 không phát được báo lỗi · vẫn forward</text><rect x="35" y="70" width="110" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="90" y="98" font-size="14" text-anchor="middle" fill="currentColor">Client</text><rect x="210" y="70" width="110" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="265" y="98" font-size="14" text-anchor="middle" fill="currentColor">r1</text><rect x="385" y="70" width="110" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="440" y="98" font-size="14" text-anchor="middle" fill="currentColor">r2</text><rect x="560" y="70" width="110" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="615" y="98" font-size="14" text-anchor="middle" fill="currentColor">Server</text><g data-step="1"><line x1="90" y1="150" x2="265" y2="150" stroke="currentColor" stroke-width="2" marker-end="url(#net08-c-arr)"/><text x="177" y="140" font-size="13" text-anchor="middle" fill="currentColor">TTL 1</text><line x1="265" y1="175" x2="200" y2="175" stroke="currentColor" stroke-width="2" marker-end="url(#net08-c-arr)"/><path d="M185 165 L195 185 M195 165 L185 185" stroke="currentColor" stroke-width="2"/><text x="300" y="197" font-size="13" text-anchor="middle" fill="currentColor">OUTPUT DROP type 11</text></g><g data-step="2"><line x1="90" y1="245" x2="615" y2="245" stroke="currentColor" stroke-width="2" marker-end="url(#net08-c-arr)"/><text x="350" y="234" font-size="13" text-anchor="middle" fill="currentColor">Probe TTL 3 · FORWARD qua r1/r2</text></g><g data-step="3"><line x1="615" y1="305" x2="90" y2="305" stroke="currentColor" stroke-width="2" marker-end="url(#net08-c-arr)"/><text x="350" y="329" font-size="13" text-anchor="middle" fill="currentColor">ICMP từ server vẫn về client</text></g>
</svg>
<step-note data-step="1">Rule chỉ bỏ gói Time Exceeded do r1 tạo. Client hết hạn chờ và in dấu sao.</step-note>
<step-note data-step="2">Probe mới có TTL lớn hơn đi qua FORWARD; rule OUTPUT không cắt tuyến này.</step-note>
<step-note data-step="3">Phản hồi từ server là traffic transit khi qua r1, nên rule đó không chặn nó.</step-note>
</step-flow>

Đó là phép phá mô hình “dấu sao nghĩa router hỏng” có kiểm soát. r1 vẫn có mặt vật lý trong tuyến; TTL 2/3 vẫn qua nó. Không có đường dự phòng, cache hay cơ chế tự bỏ hop. Bạn biết r1 DROP ICMP vì rule do script đặt và bộ đếm tăng, chứ trên Internet thật một dấu sao chưa đủ nói ISP đã cấu hình y hệt.

> **Nguồn.** [traceroute(8), DESCRIPTION](https://man7.org/linux/man-pages/man8/traceroute.8.html) mô tả dấu sao khi không có response trong timeout. [RFC 1812 §4.3.2.8](https://www.rfc-editor.org/rfc/rfc1812.txt) cho phép giới hạn tốc độ phát ICMP error; giới hạn này có thể làm probe thiếu phản hồi mà không tương đương mất cùng tỷ lệ traffic ứng dụng.

**Rate limit ICMP** là giới hạn số thông báo chẩn đoán thiết bị sinh ra theo thời gian. Tăng số probe hoặc chạy nhiều phép đo đồng thời có thể tự đụng giới hạn ấy. Script tắt `icmp_ratelimit` trong namespace r1/r2/server để cô lập can thiệp DROP và delay; không sửa sysctl host. Điều đó không mô phỏng mọi thiết bị thật. Muốn kiểm giả thuyết rate limit ở ngoài lab, giảm nhịp probe và so kết quả qua nhiều khoảng đo; không chuyển ngay “không phản hồi” thành “mất packet transit”.

## ⏸ Dừng lại — đoán trước #2

Hop hai khoảng 82 ms, đích khoảng 0,05 ms. Cách giải thích nào phù hợp với lab hơn?

- (a) Đích có thể gửi reply trước khi nhận probe nên RTT thấp hơn.
- (b) Traceroute đo từng link độc lập, hop ba không đi qua hop hai.
- (c) ICMP do r2 tự tạo bị giữ lại; traffic đi xuyên r2 và reply của server không đi vào hàng chờ đó.
- (d) Link r2→server có độ trễ âm nên trừ hết thời gian trước đó.

### 3.4 RTT của một dòng không phải thời gian forward của router ấy

Đáp án **(c)**. **RTT — round-trip time — là khoảng thời gian từ lúc nguồn phát probe tới khi nhận phản hồi tương ứng.** Với Time Exceeded, nó cộng đường probe đi tới router, xử lý/sinh ICMP tại router, đường ICMP về nguồn, và thời gian xử lý/đặt lịch của hai đầu đo. Với đích, gói về có thể khác giao thức và khác đường về. Đó không phải bộ đếm “mỗi router đã forward tốn bao lâu”.

r2 của lab đánh mark 8 **chỉ ở OUTPUT cho type 11**. **Mark** là metadata nội bộ Linux để các cơ chế khác phân loại gói; ở đây tc dùng nó chọn hàng chờ có netem delay 80 ms. `tc` là công cụ cấu hình traffic control; **qdisc** là cơ chế xếp lịch/hàng chờ tại interface. Traffic được forward từ server qua r2 không đi qua rule OUTPUT ấy, nên không được đánh mark 8 và không vào hàng chờ trễ do filter này chọn.

Nếu gắn netem trực tiếp cho mọi packet rời interface thì cả reply transit cũng trễ; phép thử sẽ không còn tách được thời gian trả lời chẩn đoán với forwarding. Việc đặt can thiệp ở đúng đường đi trong kernel là phần quan trọng của thí nghiệm, hơn việc chỉ nhìn thấy một con số lớn trên traceroute.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 375" role="img" aria-labelledby="net08-d-t net08-d-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net08-d-t">Netem nằm trên nhánh ICMP cục bộ, không nằm trên transit</title>
<desc id="net08-d-d">Netem nằm trên nhánh ICMP cục bộ, không nằm trên transit</desc>
<defs><marker id="net08-d-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260" y="25" font-size="14" text-anchor="middle" fill="currentColor">Hai đường xử lý trong r2</text><rect x="190" y="65" width="140" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="260" y="93" font-size="14" text-anchor="middle" fill="currentColor">r2</text><rect x="15" y="180" width="220" height="65" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="125" y="205" font-size="14" text-anchor="middle" fill="currentColor">ICMP r2 tự tạo</text><text x="125" y="227" font-size="14" text-anchor="middle" fill="currentColor">mark 8 → chờ 80 ms</text><rect x="285" y="180" width="220" height="65" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="395" y="205" font-size="14" text-anchor="middle" fill="currentColor">Reply của server</text><text x="395" y="227" font-size="14" text-anchor="middle" fill="currentColor">transit · không mark 8</text><line x1="225" y1="110" x2="125" y2="180" stroke="currentColor" stroke-width="2" marker-end="url(#net08-d-arr)"/><line x1="295" y1="110" x2="395" y2="180" stroke="currentColor" stroke-width="2" marker-end="url(#net08-d-arr)"/><line x1="125" y1="245" x2="125" y2="285" stroke="currentColor" stroke-width="2" marker-end="url(#net08-d-arr)"/><line x1="395" y1="245" x2="395" y2="285" stroke="currentColor" stroke-width="2" marker-end="url(#net08-d-arr)"/><text x="125" y="310" font-size="14" text-anchor="middle" fill="currentColor">Hop 2: TB 82,778 ms</text><text x="395" y="310" font-size="14" text-anchor="middle" fill="currentColor">Hop 3: TB 0,050 ms</text><text x="260" y="350" font-size="13" text-anchor="middle" fill="currentColor">Hai tập probe, không lấy hiệu làm link delay</text>
</svg>

Ở lần đo UDP sau can thiệp, trung bình ba RTT hop hai là **82,778 ms**, còn hop ba là **0,050 ms**. Phép trừ “hop ba trừ hop hai” ra khoảng **−82,728 ms**. Không có đường truyền chạy ngược thời gian: hai trung bình thuộc **hai tập probe độc lập**, với đường xử lý phản hồi khác nhau. Hình vẽ một đoạn chờ tại nhánh phát ICMP của r2, còn cạnh transit đi thẳng, mã hoá đúng khác biệt đó.

> **Suy luận.** Một hop tăng RTT nhưng các hop sau/đích không mang mức tăng tương ứng là lý do cần kiểm cách router trả lời, chưa phải bằng chứng tuyệt đối không có vấn đề forwarding. Lab chứng minh một cơ chế cụ thể có thể tạo pattern ấy; trên mạng thật còn ECMP, đường về bất đối xứng và thay đổi tải. Kiểm bằng probe tới đích, ứng dụng, nhiều lần đo và nếu có quyền thì capture hai đầu cùng thời điểm.

**Control plane** là phần thiết bị xử lý điều khiển/chẩn đoán; **data plane** là phần chuyển tiếp traffic. Hai phần có thể khác đường xử lý và ngân sách tài nguyên, nhưng bài không đo CPU hay kiến trúc ASIC của router thật. Lab Linux dùng mark/qdisc để dựng một sự khác biệt chọn lọc có cùng hệ quả quan sát: thông báo chẩn đoán chậm không buộc mọi gói transit phải chậm bằng nó.

### 3.5 UDP, ICMP, TCP traceroute trả lời những câu khác nhau

UDP mặc định kết thúc nhờ ICMP port unreachable. `-I` đổi probe thành ICMP Echo Request, nên đích trả Echo Reply nếu cho phép. `-T -p 8000` đổi probe thành TCP SYN tới port 8000; đích có thể trả SYN/ACK khi port mở hoặc RST khi từ chối. Tại các router trung gian, cả ba vẫn dựa vào hết TTL để kích ICMP Time Exceeded. Đổi sang TCP vì một firewall cho TCP đi qua **không loại bỏ phụ thuộc vào ICMP ở các hop giữa**.

Đó cũng là lý do trace TCP tới một port trả kết quả không có nghĩa HTTP hoạt động. Probe của traceroute không gửi đủ giao dịch HTTP/TLS, không dùng cùng mọi header ứng dụng, và không xác thực logic endpoint. Một SYN được nhận không kiểm được body, auth, upstream hay thời gian xử lý server. [traceroute(8), TCP method](https://man7.org/linux/man-pages/man8/traceroute.8.html) giải thích kỹ thuật half-open để không làm ứng dụng nhận một giao dịch hoàn chỉnh.

Trong lab, cả ba phương pháp đều thấy dấu sao ở r1 và RTT trễ tại r2; cuối tuyến vẫn có reply. `curl` sau đó kiểm thêm giao dịch HTTP thật ở port 8000, trả 200. Nó là phép xác nhận bổ sung cho endpoint cụ thể, không phải chứng minh mọi port và mọi kích thước payload đều thông. Tương tự, ba ping thành công không đủ phủ định lỗi chỉ xảy ra khi tải hoặc payload lớn hơn; bài 5 đã dành riêng cho kiểu treo theo kích thước gói.

**ECMP — Equal-Cost Multi-Path — là việc có nhiều next hop cùng chi phí để phân phối lưu lượng.** [RFC 2992](https://www.rfc-editor.org/rfc/rfc2992.txt) phân tích một cách chọn đường bằng hash các trường định danh flow. Nếu các probe thay port và thiết bị dùng các trường đó trong hash, chúng có thể không đi cùng đường; còn đổi UDP sang TCP càng có thể đổi lớp traffic được firewall hay policy đối xử. Vì thế địa chỉ in ở các TTL liên tiếp chưa chắc là một chuỗi link của **cùng flow ứng dụng**. Đừng vẽ đường vật lý hay hợp đồng peering chỉ từ ba IP đứng cạnh nhau trong một trace.

> **Chưa đo.** Lab không có ECMP, MPLS, NAT, rate limit dưới tải hay đường về khác đường đi. Các tình huống ấy là giới hạn diễn giải dựa trên cơ chế/protocol, không phải nguyên nhân của số 82 ms trong lab. Muốn đo ECMP cần thêm topology nhiều nhánh và giữ/đổi từng trường flow một cách có chủ đích.

### 3.6 Khi các hop sau cũng toàn dấu sao

Nếu sau một điểm tất cả đều im lặng và ứng dụng cũng thất bại, bằng chứng đã khác với “chỉ một hop không đáp”. Tuy nhiên nó vẫn chưa chứng minh router cuối có tên là thủ phạm: probe sau điểm đó có thể bị lọc, đường trả ICMP có thể mất, đích có thể không trả kiểu phản hồi đang dùng. “Router cuối có tên” chỉ là nơi cuối cùng bạn **nhận được một thông báo**, không nhất thiết là nơi gói tiếp theo bị bỏ.

Bắt đầu bằng việc ghi IP đích đã resolve, phương pháp, port, thời gian, cửa sổ chờ và kết quả endpoint. Giữ `-n` để việc tra ngược tên không thêm công việc ngoài phép đo IP; hostname hiện trên trace không đủ xác định vị trí địa lý hay chủ sở hữu. Đổi phương pháp có kiểm soát, so với curl/TCP connect thực tế. Nếu probe ứng dụng cũng fail, nhờ phía đích kiểm xem có nhận SYN/request không, có phát reply không; đó là cách tách chiều đi và về mà một đầu không nhìn được.

Một lỗi đường về có thể làm probe đi tới đích nhưng nguồn không thấy phản hồi; traceroute một chiều không bóc riêng hai thời gian đó. Đo từ hai đầu tăng khả năng khoanh vùng nhưng hai trace ngược chiều vẫn là hai phép chọn đường độc lập, không tự ghép thành một “đường đối xứng”. Muốn nói có mất gói transit cần thống kê đúng loại traffic tới đích trong điều kiện tương ứng, không lấy tỷ lệ mất phản hồi tại một hop làm tỷ lệ mất của cả tuyến.

## 4. Lab

### 4.1 Dựng tuyến và lấy baseline trước khi can thiệp

Trong `~/projects/net-lab/net-08/` có `run.sh`, `inside.sh`, các bản nguồn tải ở `src/` và log ở `out/`. `run.sh` dùng container `net08-lab` có quyền tạo network namespace, cài công cụ trong Alpine 3.20 và dọn container khi kết thúc. Mọi namespace/interface tạo ra đều có tiền tố net08; các rule và qdisc chỉ nằm trong lab này.

```bash
./run.sh
cat out/baseline.txt
cat out/star.txt
cat out/delay.txt
cat out/application.txt
```

**Làm gì → thấy gì → vì sao:** tuyến có ba subnet `10.8.1.0/24`, `10.8.2.0/24`, `10.8.3.0/24`; client `.1.2`, r1 `.1.1/.2.1`, r2 `.2.2/.3.1`, server `.3.2`. Script bật forwarding và đặt route hai chiều; không dùng NAT. HTTP server bind `10.8.3.2:8000`. Khi baseline chưa có DROP/delay, toàn bộ hop trả lời.

Lệnh trace trong container, dùng lại cho mỗi biến thể:

```sh
ip netns exec net08-c traceroute -n -q 3 -N 1 \
  -w 0.3,0,0 -z 0.05 -m 4 10.8.3.2
```

`-q 3` là ba probe mỗi TTL; `-N 1` giới hạn một probe đang chờ; `-w 0.3,0,0` chọn chờ tối đa 0,3 giây và tắt hai hệ số rút ngắn thích ứng; `-z 0.05` đặt khoảng cách phát 0,05 giây; `-m 4` đặt TTL tối đa 4. Nguồn ngữ nghĩa các flag: [traceroute(8), OPTIONS](https://man7.org/linux/man-pages/man8/traceroute.8.html). Script chủ động tắt rate limit ICMP trong namespace để số dấu sao phản ánh can thiệp đã đặt; giữ rate limit mặc định rồi đổi nhịp gửi có thể thêm một biến khác vào phép thử.

`out/baseline.txt`, output thật:

```text
traceroute to 10.8.3.2 (10.8.3.2), 4 hops max, 60 byte packets
 1  10.8.1.1  0.196 ms  0.057 ms  0.014 ms
 2  10.8.2.2  0.059 ms  0.005 ms  0.004 ms
 3  10.8.3.2  0.008 ms  0.003 ms  0.003 ms
```

Ba dòng nghĩa là ba giá trị TTL đã thử, mỗi giá trị có ba probe; không phải một gói nhận cả chín lời trả lời. Baseline còn cho thấy RTT không bắt buộc tăng đơn điệu ngay khi chưa có delay nhân tạo. Đây là VM dùng link ảo, không dùng các RTT dưới mili giây này làm chuẩn độ trễ WAN.

### 4.2 Để “router chết” vẫn chuyển tiếp gói

Script thêm rule sau vào namespace r1:

```sh
ip netns exec net08-r1 iptables -A OUTPUT \
  -p icmp --icmp-type time-exceeded -j DROP
```

`out/star.txt`:

```text
traceroute to 10.8.3.2 (10.8.3.2), 4 hops max, 60 byte packets
 1  * * *
 2  10.8.2.2  0.106 ms  0.042 ms  0.031 ms
 3  10.8.3.2  0.041 ms  0.030 ms  0.008 ms
```

**Làm gì → thấy gì → vì sao:** cùng tuyến, cùng lệnh, chỉ thêm rule cắt nhánh phản hồi của r1. TTL 1 không còn hồi đáp; TTL 2/3 vẫn trả lời. Không sửa FORWARD, không đổi route. Bản sai “dòng đầu sao thì router đầu không forward” dự đoán không thể có hop sau; output bác bỏ dự đoán ấy.

Trong `application.txt` ở cuối toàn bộ thí nghiệm, counter rule này là **12 packet / 1056 byte**: có bốn lượt trace sau khi thêm DROP, mỗi lượt ba probe TTL 1. Không đếm baseline vào counter của rule chưa tồn tại. Đếm theo thời điểm tạo rule giúp tránh gọi counter tích luỹ là “số lỗi của lượt trace cuối”.

### 4.3 Làm chậm đúng đường phát lỗi của r2

Các lệnh trong `inside.sh`:

```sh
ip netns exec net08-r2 iptables -t mangle -A OUTPUT \
  -p icmp --icmp-type time-exceeded -j MARK --set-mark 8
ip netns exec net08-r2 tc qdisc add dev net08-d root handle 1: prio bands 3
ip netns exec net08-r2 tc qdisc add dev net08-d parent 1:3 \
  handle 30: netem delay 80ms
ip netns exec net08-r2 tc filter add dev net08-d parent 1: \
  protocol ip prio 1 handle 8 fw flowid 1:3
```

**Làm gì → thấy gì → vì sao:** mark 8 chọn band 1:3 có netem. Các gói transit không có mark ấy; cấu hình priomap của prio trong log cũng không mặc định đưa traffic TOS 0 của lab vào band trễ. [tc-prio(8)](https://man7.org/linux/man-pages/man8/tc-prio.8.html) mô tả band và filter; `tc -s qdisc` ở `application.txt` cho thấy netem chỉ xử lý **9 packet**, khớp ba probe TTL 2 của ba lượt UDP/ICMP/TCP sau khi cài delay. Không có drop tại qdisc trong lần này.

`out/delay.txt`:

```text
traceroute to 10.8.3.2 (10.8.3.2), 4 hops max, 60 byte packets
 1  * * *
 2  10.8.2.2  81.198 ms  84.488 ms  82.649 ms
 3  10.8.3.2  0.088 ms  0.032 ms  0.030 ms
```

Delay cấu hình 80 ms không hứa mọi mẫu đúng 80,000 ms: tổng RTT còn có phần xử lý, đường đi/về và đặt lịch VM. Đích không chịu phần chờ chọn lọc đó. Số r2 không phải độ trễ link r1→r2, cũng không được cộng thêm vào RTT đích như thể công cụ đã đo từng đoạn độc lập.

### 4.4 Đổi probe rồi kiểm bằng HTTP thật

`inside.sh` chạy lại trace với `-I`, rồi `-T -p 8000`. Trích từ `out/icmp-trace.txt`:

```text
 1  * * *
 2  10.8.2.2  80.898 ms  82.003 ms  81.626 ms
 3  10.8.3.2  0.074 ms  0.123 ms  0.079 ms
```

Trích từ `out/tcp-trace.txt`:

```text
 1  * * *
 2  10.8.2.2  85.211 ms  81.468 ms  82.784 ms
 3  10.8.3.2  0.201 ms  0.152 ms  0.223 ms
```

**Làm gì → thấy gì → vì sao:** đổi loại probe vẫn giữ cách router báo hết TTL. Chuyển TCP không chữa được rule chặn Time Exceeded ở r1 và không né hàng chờ dành cho Time Exceeded ở r2. Khác biệt cuối tuyến là kiểu phản hồi của server; muốn biết endpoint HTTP thực sự trả được, cần request HTTP.

Phần quyết định của `out/application.txt`:

```text
3 packets transmitted, 3 received, 0% packet loss, time 414ms
rtt min/avg/max/mdev = 0.056/0.108/0.181/0.052 ms
http=200 connect=0.000558 total=0.007658
```

Curl in thời gian theo giây: `0.000558 s = 0,558 ms`, `0.007658 s = 7,658 ms`. HTTP dùng Python server lab; không có TLS, auth hay upstream. Ba ping chỉ đủ kết luận ba gói echo đó có reply. Nếu dùng con số mất 0 % này để khẳng định cả ngày không mất gói, bạn đã biến cỡ mẫu thành lời hứa ngoài dữ liệu.

### 4.5 Ghép phản hồi với gói gốc trong capture

Đọc `out/capture.txt`; đầu file baseline có dòng sau, giữ nguyên phần quyết định:

```text
10.8.1.1 > 10.8.1.2: ICMP time exceeded in-transit, length 68
10.8.2.2 > 10.8.1.2: ICMP time exceeded in-transit, length 68
10.8.3.2 > 10.8.1.2: ICMP 10.8.3.2 udp port 33440 unreachable, length 68
```

Ba dòng được trích ở ba vị trí khác nhau trong file, không phải ba dòng liên tiếp của một gói. Ngay dưới mỗi ICMP, tcpdump giải mã quote của probe làm nó phát lỗi. Ghép source/destination/port trong quote với dòng UDP phát trước đó; với port đích 33440 ở baseline, bạn sẽ tìm được probe TTL 3. Khi đổi sang ICMP/TCP, dùng trường nhận diện tương ứng thay vì cố tìm UDP port cho mọi phép thử.

Capture local có thể ghi `bad udp cksum` ở gói gửi. Nó không tự chứng minh gói tới đích hỏng: checksum offload và điểm capture có thể cho thấy gói trước khi hoàn thiện checksum. Bài 1 đã đặt ranh giới đọc pcap; ở đây các phản hồi ghép đúng probe cho thấy chúng thực sự được xử lý. Muốn kết luận checksum trên dây cần capture phía nhận/điểm phù hợp, không bỏ qua mọi warning và cũng không quy ngay dấu sao cho dòng checksum.

## 5. Tính tay

### 5.1 Bao nhiêu probe, bao nhiêu thông báo bị chặn?

Giữ topology lab hai router trước server, ba probe mỗi TTL, đích được phát hiện ở TTL 3. Có bao nhiêu probe cho một lượt trace hoàn tất? Sau baseline, bốn lượt trace chạy với DROP type 11 ở r1; có bao nhiêu gói bị rule này chặn nếu mỗi probe TTL 1 gây đúng một lỗi? Nếu mỗi lỗi dài 88 byte IPv4, counter byte là bao nhiêu?

**Giải — suy luận rồi đối chiếu log:** `3 × 3 = 9` probe một lượt; `4 × 3 = 12` thông báo do r1 tạo bị chặn; `12 × 88 = 1056` byte. Counter cuối `application.txt` đúng 12/1056. Nó không tính frame Ethernet hay số byte probe client gửi. Với TCP hay ICMP probe, độ dài báo lỗi có thể khác ở cấu hình khác; ở lần đo này counter và capture khớp giả định 88 byte.

### 5.2 “Link âm” xuất hiện từ phép tính nào?

Từ `delay.txt`, tính trung bình RTT ba probe hop hai và hop ba, rồi lấy trung bình sau trừ trước. Kết quả có cho độ trễ link không?

**Giải — suy luận từ số đo:** hop hai `(81,198 + 84,488 + 82,649) / 3 = 82,778333… ms`; hop ba `(0,088 + 0,032 + 0,030) / 3 = 0,050 ms`. Hiệu là `−82,728333… ms`, làm tròn `−82,728 ms`. Nó không phải link delay: hai tập probe độc lập, phản hồi hop hai đi qua netem riêng, phản hồi đích không qua nhánh trễ đó. Ngay cả trên WAN không can thiệp, đường về và thời gian sinh ICMP chưa bị tách khỏi RTT, nên phép trừ vẫn cần những giả định không có sẵn.

### 5.3 Dấu sao có kéo dài mọi request thêm 0,9 giây không?

**Giả định để tính:** ba probe TTL 1 phát nối tiếp, mỗi probe thực sự đợi trọn 0,3 giây, không overlap, chưa tính khoảng phát và chi phí công cụ. Tổng chờ không phản hồi là bao lâu? Có cộng thời gian đó vào HTTP request chạy riêng không?

**Giải — suy luận theo lịch đo giả định:** `3 × 0,3 = 0,9 s` chờ của tiến trình traceroute. Không cộng vào curl: curl dùng flow và lịch riêng, không chờ traceroute vượt qua từng hop. Đây là phần thời gian chờ giả định, không phải số đo tổng thời gian chạy `run.sh`; script còn nhiều lượt đo và khoảng cách phát. Dấu sao không phải một đoạn link giữ mọi packet đúng bằng timeout của công cụ.

## 6. Chuyển giao

Các câu này đổi một điều kiện quan trọng so với lab; hãy nêu phép đo có khả năng bác bỏ giả thuyết. Câu cuối không có lời giải trong bài.

1. UDP trace dừng từ một điểm, TCP trace tới port của dịch vụ lại tới đích. Bạn kiểm rule và app thế nào trước khi kết luận link sau điểm ấy đã phục hồi?
2. Mỗi TTL hiện nhiều IP luân phiên, nhưng một TCP connection dài không rớt. Làm sao kiểm giả thuyết hash theo flow thay vì coi router đang đổi đường ngẫu nhiên cho mọi packet?
3. RTT tại một hop tăng theo giờ cao điểm và giữ mức tăng tới đích, cùng lúc HTTP chậm. Bạn cần dữ liệu gì để phân biệt nghẽn transit, đường về và server bận?
4. Một firewall cho phép Echo Reply nhưng chặn Time Exceeded và Fragmentation Needed. Vì sao ping mặc định có thể vẫn tốt, và bạn sẽ thử gì để kiểm request chỉ treo ở payload lớn mà không gộp mọi lỗi vào “ICMP bị cấm”?
5. Trace từ phía client tới server im lặng, phía server lại capture được SYN và đã phát SYN/ACK. Bạn đặt điểm đo kế tiếp ở đâu để tìm lỗi chiều về khi có NAT giữa đường?
6. **Câu khó nhất:** một endpoint anycast có ECMP, NAT ở phía client, đường về bất đối xứng và ICMP rate limit. Hãy thiết kế một đợt đo đủ để phân biệt đổi instance đích, đổi đường transit và thay đổi lịch sinh ICMP; chỉ ra những cặp nguyên nhân vẫn không phân biệt được nếu bạn chỉ kiểm soát máy client.

## 7. Tóm tắt

- Mỗi dòng traceroute là các probe với cùng TTL; phản hồi không thuộc một gói duy nhất chạy qua toàn bảng.
- Time Exceeded 11/0 nói probe hết TTL; Port Unreachable 3/3 từ đích có thể là dấu kết thúc UDP trace (RFC 792).
- Dấu sao nói không có phản hồi phù hợp đúng hạn, chưa xác định packet bị mất ở đâu (traceroute(8)).
- r1 DROP thông báo type 11 ở OUTPUT nhưng vẫn forward tới các hop sau (`star.txt`, `application.txt`).
- Chỉ trì hoãn ICMP do r2 sinh khiến hop hai khoảng 82 ms, trong khi đích và HTTP không mang phần chờ đó (`delay.txt`, `application.txt`).
- TCP traceroute vẫn cần Time Exceeded ở hop giữa và không thay cho request ứng dụng.
- Ba ping thành công và một HTTP 200 là kết quả của những phép thử ấy, không phải cam kết không mất gói hay không có lỗi payload khác.

→ **Bài 9 — IPv6 khi chạy thật**: sau khi biết giới hạn của phép đo IPv4, cần kiểm hai đường IPv4/IPv6 được client chọn và việc fallback có thể thêm thời gian trước khi ứng dụng kết nối được.
