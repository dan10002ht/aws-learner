# Bài 19 — UDP và QUIC: đổi đường mà không đổi kết nối

## 1. Mục tiêu

Sau bài này bạn có thể:

- Dự đoán kết quả khi đọc một UDP datagram bằng buffer nhỏ và phân biệt nó với đọc tiếp một TCP byte stream.
- Chỉ ra phần UDP không cung cấp và phần QUIC tự thực hiện: handshake, mã hoá, reliable stream, điều khiển luồng và tắc nghẽn.
- Tách packet number, stream offset và connection ID khi giải thích mất gói hoặc thay địa chỉ.
- Đọc log để xác nhận một kết nối QUIC sống qua NAT rebinding, thay vì chỉ thấy request sau đổi mạng thành công rồi kết luận.
- Giải thích điều kiện để có 0-RTT và lý do request có tác động không thể được bật early data chỉ dựa vào tên HTTP method.
- Dùng capture UDP cùng qlog để phân biệt handshake mới, resumption và path validation, đồng thời nói rõ phép thử chưa chứng minh điều gì.

## 2. Triệu chứng

Một client giữ phiên tới dịch vụ; lúc đổi đường ra Internet, source port mà server nhìn thấy thay đổi. Với TCP, tuple cũ không tự biến thành phiên ở tuple mới. Người dùng thấy app phải reconnect; dev nghe “QUIC chạy UDP, đổi mạng không rớt” rồi đề xuất thay socket TCP bằng UDP, giữ nguyên logic đọc/ghi.

Ta thử phần dễ nhất trước. Client gửi **10 byte** `abcdefghij` bằng UDP, server đọc bằng buffer **4 byte**. Nó nhận `abcd`; lần đọc sau không có `efghij`, chỉ hết timeout. Nếu bê parser byte-stream sang đây, dữ liệu mất ngay cả khi đường truyền không làm rơi datagram nào.

Ở phép thử QUIC thật trong cùng lab, relay đổi source port từ `19201` sang `19202`. Server vẫn chỉ có **một connection object**, stream đầu là `0`, stream sau là `4`, cả hai echo trả đủ payload; qlog có `PATH_CHALLENGE` và `PATH_RESPONSE`. Vậy khả năng giữ phiên nằm ở đâu: UDP hay lớp phía trên nó?

> **Đo trên lab.** Alpine 3.20, Linux `6.8.0-64-generic` aarch64 trong Docker/colima, Python và `aioquic 1.3.0`. UDP thô trên loopback; QUIC dùng ALPN `net19-echo`, certificate tự ký chỉ dùng trong lab và được client nạp làm trust anchor cho `localhost`. `out/lab.txt`, `out/server.qlog.json`, `out/client.qlog.json` lưu kết quả. Đo lại: `./run.sh` trong thư mục lab `net-19`.

## ⏸ Dừng lại — đoán trước #1

UDP không bảo đảm giao dữ liệu. Vì sao QUIC vẫn chuyển file theo thứ tự và không để thiếu byte mà ứng dụng không biết?

(a) UDP dùng bởi QUIC tự bật retransmission của kernel.
(b) QUIC phải chấp nhận mất byte như UDP nên không dùng cho file.
(c) QUIC tự quản lý ACK, phát hiện mất, truyền lại thông tin và thứ tự byte trong từng stream ở phía trên UDP.
(d) TLS sửa byte bị mất nên QUIC chỉ cần mã hoá.

## 3. Cơ chế

### 3.1 UDP giao một datagram, không giao một dòng byte

Đáp án là **(c)**. Để thấy QUIC thêm những gì, trước tiên bỏ giả định TCP khỏi lời gọi `recv`. **UDP — User Datagram Protocol — là giao thức mang các thông điệp độc lập giữa các port, không tự thiết lập phiên reliable có thứ tự.** **Datagram là một đơn vị thông điệp được gửi và nhận với ranh giới riêng**, thay vì một phần tuỳ ý của dòng byte TCP.

Một lần `sendto()` tạo một UDP datagram; lần nhận thông thường đọc một datagram. Buffer nhỏ làm Linux chỉ trả phần vừa và bỏ đuôi; `recvmsg()` cho phép kiểm cờ truncation. Lab cố ý dùng `recvfrom(4)` để bản sai “đọc lần nữa lấy phần còn lại” thất bại. Đây là mất dữ liệu do cách dùng socket, không phải do packet rơi giữa mạng.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 345" role="img" aria-labelledby="net19-udp-t net19-udp-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net19-udp-t">UDP bảo toàn ranh giới thông điệp, buffer nhỏ làm mất đuôi</title>
<desc id="net19-udp-d">Mười ô byte ở hàng trên; bốn byte vào buffer, sáu byte bị gạch bỏ ở hàng dưới.</desc>
<defs><marker id="net19-udp-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">1 datagram: 10 byte payload</text><rect x="20" y="50" width="43" height="40" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="41" y="76" font-size="15" text-anchor="middle" fill="currentColor">a</text><rect x="67" y="50" width="43" height="40" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="88" y="76" font-size="15" text-anchor="middle" fill="currentColor">b</text><rect x="114" y="50" width="43" height="40" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="135" y="76" font-size="15" text-anchor="middle" fill="currentColor">c</text><rect x="161" y="50" width="43" height="40" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="182" y="76" font-size="15" text-anchor="middle" fill="currentColor">d</text><rect x="208" y="50" width="43" height="40" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="229" y="76" font-size="15" text-anchor="middle" fill="currentColor">e</text><rect x="255" y="50" width="43" height="40" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="276" y="76" font-size="15" text-anchor="middle" fill="currentColor">f</text><rect x="302" y="50" width="43" height="40" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="323" y="76" font-size="15" text-anchor="middle" fill="currentColor">g</text><rect x="349" y="50" width="43" height="40" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="370" y="76" font-size="15" text-anchor="middle" fill="currentColor">h</text><rect x="396" y="50" width="43" height="40" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="417" y="76" font-size="15" text-anchor="middle" fill="currentColor">i</text><rect x="443" y="50" width="43" height="40" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="464" y="76" font-size="15" text-anchor="middle" fill="currentColor">j</text><path d="M115 105 L115 155" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net19-udp-a)"/><text x="155" y="135" font-size="14" text-anchor="start" fill="currentColor">recvfrom(4)</text><rect x="20" y="170" width="43" height="40" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981"/><text x="41" y="196" font-size="15" text-anchor="middle" fill="currentColor">a</text><rect x="67" y="170" width="43" height="40" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981"/><text x="88" y="196" font-size="15" text-anchor="middle" fill="currentColor">b</text><rect x="114" y="170" width="43" height="40" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981"/><text x="135" y="196" font-size="15" text-anchor="middle" fill="currentColor">c</text><rect x="161" y="170" width="43" height="40" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981"/><text x="182" y="196" font-size="15" text-anchor="middle" fill="currentColor">d</text><rect x="208" y="170" width="43" height="40" rx="6" fill="#f43f5e" fill-opacity="0.15" stroke="#f43f5e"/><text x="229" y="196" font-size="15" text-anchor="middle" fill="currentColor">e</text><path d="M208 170 L251 210" stroke="#f43f5e"/><rect x="255" y="170" width="43" height="40" rx="6" fill="#f43f5e" fill-opacity="0.15" stroke="#f43f5e"/><text x="276" y="196" font-size="15" text-anchor="middle" fill="currentColor">f</text><path d="M255 170 L298 210" stroke="#f43f5e"/><rect x="302" y="170" width="43" height="40" rx="6" fill="#f43f5e" fill-opacity="0.15" stroke="#f43f5e"/><text x="323" y="196" font-size="15" text-anchor="middle" fill="currentColor">g</text><path d="M302 170 L345 210" stroke="#f43f5e"/><rect x="349" y="170" width="43" height="40" rx="6" fill="#f43f5e" fill-opacity="0.15" stroke="#f43f5e"/><text x="370" y="196" font-size="15" text-anchor="middle" fill="currentColor">h</text><path d="M349 170 L392 210" stroke="#f43f5e"/><rect x="396" y="170" width="43" height="40" rx="6" fill="#f43f5e" fill-opacity="0.15" stroke="#f43f5e"/><text x="417" y="196" font-size="15" text-anchor="middle" fill="currentColor">i</text><path d="M396 170 L439 210" stroke="#f43f5e"/><rect x="443" y="170" width="43" height="40" rx="6" fill="#f43f5e" fill-opacity="0.15" stroke="#f43f5e"/><text x="464" y="196" font-size="15" text-anchor="middle" fill="currentColor">j</text><path d="M443 170 L486 210" stroke="#f43f5e"/><text x="20" y="245" font-size="14" text-anchor="start" fill="currentColor">4 byte trả về app</text><text x="250" y="245" font-size="14" text-anchor="start" fill="currentColor">6 byte bị bỏ</text><text x="20" y="290" font-size="14" text-anchor="start" fill="currentColor">Lần recv kế: chờ datagram mới,</text><text x="20" y="314" font-size="14" text-anchor="start" fill="currentColor">không đọc tiếp phần còn lại của gói cũ.</text>
</svg>

UDP header có **8 byte**: source port, destination port, length và checksum, mỗi trường rộng **2 byte**, theo RFC 768. Trường length tính cả header lẫn payload; nó không bao gồm IP header. Checksum hỗ trợ phát hiện lỗi truyền, không xác thực người gửi và không thay mã hoá. Cách tính MTU và chuyện phân mảnh đã ở [[net-05-mtu-pmtud]]; việc app gửi được một datagram lớn không đảm bảo đường đi chuyển nó nguyên vẹn.

UDP không tự hứa datagram đến, không tự loại duplicate, không xếp lại datagram cho đúng thứ tự gửi, không có FIN để báo EOF kiểu TCP. API `connect()` trên UDP thường chỉ gắn peer mặc định và hỗ trợ lọc/nhận lỗi theo hệ điều hành; nó không biến UDP thành handshake ba bước. Những gì ứng dụng cần vẫn phải được cung cấp bởi giao thức ở trên.

Lab tiếp tục chạy bản sai “thiếu một message thì UDP tự gửi lại”. Bộ chuyển tiếp giả lập **chủ động bỏ id 1**, chỉ chuyển id 0 và 2. Receiver nhận `0,2`; trong cửa sổ chờ `0,2 s` không có lần gửi lại nào. Ta không gọi đây là xác suất mất gói Internet: chính code đã chọn bỏ một id. Bài học là quan sát không có retransmission tự động, còn ngưỡng retry và việc message cũ còn hữu dụng hay không là quyết định giao thức.

> **Nguồn.** RFC 768: *“delivery and duplicate protection are not guaranteed.”* ([UDP](https://www.rfc-editor.org/rfc/rfc768)). Header và ngữ nghĩa datagram ở cùng tài liệu. Quy tắc Linux về buffer và truncation được tra ở [udp(7)](https://man7.org/linux/man-pages/man7/udp.7.html); phép thử bài này đo trực tiếp kết quả `recvfrom(4)`.

### 3.2 QUIC mượn đường UDP, tự làm transport có trạng thái

**QUIC là transport có kết nối, bảo mật và nhiều stream, dùng UDP làm lớp mang packet qua mạng.** Dùng port UDP giúp triển khai transport trong thư viện ứng dụng mà không cần hai hệ điều hành cùng thay toàn bộ TCP stack; đây là cơ sở kiến trúc, không phải hứa mọi mạng đều cho UDP đi qua. Khi firewall chặn UDP tới đích, ứng dụng cần phương án khác hoặc báo lỗi theo giao thức; QUIC không tự xuyên firewall.

QUIC handshake thương lượng tham số transport và dùng **TLS 1.3** để xác thực, tạo khoá. TLS không sửa packet mất: QUIC mang các thông điệp handshake trong CRYPTO frames và chịu trách nhiệm giao chúng. Không có TLS record stream trên TCP trong đường QUIC này. Chứng chỉ và chain đã ở [[eng-03-tcp-tls]], vận hành SNI/ALPN sẽ ở bài 23.

**Frame là một đơn vị thông tin bên trong QUIC packet**, ví dụ ACK báo packet đã nhận, STREAM mang byte của một stream, CRYPTO mang dữ liệu handshake, hoặc PATH_CHALLENGE kiểm đường đi. Một UDP datagram có thể chứa các QUIC packet được ghép theo quy tắc giao thức; một packet có thể chứa nhiều frame. Vì thế đếm dòng `UDP, length ...` không tương đương đếm stream hay đếm request.

**Packet number là số định danh lần gửi packet trong một packet number space.** QUIC có các không gian Initial, Handshake và Application Data; 0-RTT và 1-RTT dùng chung không gian Application Data. **Stream offset là vị trí byte trong một stream**, giúp bên nhận ráp lại dòng byte theo thứ tự của stream đó. Hai số giải hai bài toán khác nhau: ACK/loss theo packet đã gửi; ráp dữ liệu theo stream và offset.

Khi một packet mất, QUIC không phát lại nguyên packet với cùng packet number. Các thông tin còn cần có thể được đóng vào frame trong packet mới với packet number mới; dữ liệu STREAM giữ vị trí byte tương ứng. ACK cũ không phải thông tin phải retransmit nguyên xi, và dữ liệu đã hết cần thiết không bắt buộc giữ lại chỉ vì nó từng nằm trong packet mất. Phân biệt “truyền lại thông tin” với “gửi lại nguyên datagram” giúp đọc qlog không bị nhầm là app gửi cùng message hai lần.

QUIC vẫn phải có **flow control — giới hạn dữ liệu do sức nhận**, và **congestion control — giới hạn tốc độ theo khả năng đường truyền**. Chúng đã được phân biệt ở bài 17; chuyển sang UDP không cho phép bỏ kiểm soát tắc nghẽn. RFC 9002 mô tả loss detection và congestion control cho QUIC; so sánh throughput cần ghi thuật toán, RTT, loss, payload và implementation thay vì gán mọi khác biệt cho tên UDP.

> **Nguồn.** [RFC 9000 §12](https://www.rfc-editor.org/rfc/rfc9000#section-12), §13.3 và §19 định nghĩa packet, xử lý loss và frame; [RFC 9001 §4](https://www.rfc-editor.org/rfc/rfc9001#section-4) giải thích tích hợp TLS; [RFC 9002](https://www.rfc-editor.org/rfc/rfc9002) quy định phần phục hồi mất gói và tắc nghẽn. Lab đo handshake/stream/path bên dưới, không benchmark thuật toán congestion control.

### 3.3 Thứ tự nằm trong stream, không phủ cả kết nối

**Stream trong QUIC là một dòng byte có thứ tự và định danh riêng bên trong connection.** Một connection có thể có nhiều stream, trong giới hạn đã thương lượng. Byte thiếu ở stream A cần được khôi phục trước khi phần sau của chính A được giao có thứ tự, nhưng không vì thế bắt byte đủ của stream B phải chờ A.

TCP không biết stream HTTP ở bên trong, nên lỗ sequence có thể chặn byte của request khác. QUIC biết stream/offset ở transport nên không áp thứ tự toàn connection lên mọi stream. **Head-of-line blocking là việc phần đã sẵn sàng phải chờ một phần trước chưa xong**; phải nói rõ đang chặn ở tầng nào và với quan hệ thứ tự nào.

Không suy rộng thành “QUIC không bao giờ HOL”: chính stream còn cần đúng thứ tự; HTTP/3 còn phụ thuộc dữ liệu điều khiển và header compression; ứng dụng có thể tự chờ nhiều kết quả cùng nhau. Các stream chia sẻ đường truyền và congestion budget; giảm ngân sách gửi có thể làm chậm B dù B không chờ lỗ byte của A. Bài 22 sẽ đặt hai kiểu HOL cạnh cùng tải HTTP; ở đây chưa đo ca mất gói nhiều stream.

Trong lab echo, stream `0` chạy trước rebind, stream `4` chạy sau. Đó là hai client-initiated bidirectional stream kế tiếp theo cách mã hoá stream ID của QUIC, **không phải ba stream ở giữa đã bị mất**. Các bit thấp của stream ID mã hoá bên khởi tạo và hướng; RFC 9000 §2.1 giải thích vì sao loại này tăng theo bước 4. Không lấy phép thử tuần tự này làm bằng chứng đã đo khả năng không chặn chéo khi mất gói.

> **Chưa đo.** Độc lập thứ tự giữa các stream khi một STREAM frame bị mất; ảnh hưởng congestion controller lên các stream còn lại. Cơ chế dựa trên [RFC 9000 §2](https://www.rfc-editor.org/rfc/rfc9000#section-2). Đo bằng hai stream song song, chủ động bỏ packet chứa byte của một stream, đối chiếu STREAM offset trong qlog với thời điểm callback nhận dữ liệu của stream kia.

## ⏸ Dừng lại — đoán trước #2

Client giữ khoá và ticket từ phiên trước, gửi thao tác trừ số dư bằng 0-RTT. TLS xác thực server, payload được mã hoá. Có thể bỏ cơ chế chống lặp vì kẻ nghe lén không đọc được nội dung không?

(a) Có, mã hoá làm mọi bản sao ciphertext vô dụng.
(b) Có, ACK QUIC bảo đảm thao tác chỉ chạy đúng một lần trên mọi connection.
(c) Không; early data có thể bị replay, và mã hoá không đồng nghĩa chỉ được thực thi một lần.
(d) Không, vì UDP không có checksum.

### 3.4 0-RTT là gửi trước phản hồi mới, không phải hết mạng trong 0 ms

Đáp án là **(c)**. **RTT — round-trip time — là thời gian một lượt đi và phản hồi về.** **0-RTT là khả năng client gửi early application data trên một kết nối mới trước khi nhận phản hồi handshake của kết nối đó**, dựa vào thông tin từ phiên cũ. Nó không bỏ khoảng cách vật lý, không loại thời gian server xử lý, và không bảo đảm server sẽ chấp nhận early data.

Ở lần đầu, client chưa có ticket/secret phù hợp; handshake QUIC dùng TLS 1.3 tạo khoá và xác thực. Mô hình lý tưởng bỏ DNS, Retry, mất gói và CPU: client nhận chuyến handshake server sau một RTT rồi có thể gửi application data 1-RTT. Với phiên resumable và early data được cho phép, client có thể đặt request trong chuyến đi đầu. Kết quả trả về vẫn phải đi từ server về client, nên gọi “request 0 ms” là sai.

**Session ticket là dữ liệu server phát cho phép client dùng thông tin phiên trước để xin resumption**; **resumption là thiết lập kết nối mới dựa trên thông tin đó**, không phải phục hồi nguyên stream của connection đã đóng. Client cần ticket còn hợp lệ, secret tương ứng, tham số tương thích và sự đồng ý của server. Không phải cứ “đã từng vào website” là chắc có 0-RTT. Server có thể từ chối early data trong khi vẫn tiếp tục handshake; ứng dụng/thư viện phải có cách xử lý từ chối đúng semantics.

<ab-toggle data-labels="Lần đầu|Có ticket">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 365" role="img" aria-labelledby="net19-fresh-t net19-fresh-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net19-fresh-t">QUIC fresh: thời gian là độ dốc của mũi tên</title>
<desc id="net19-fresh-d">Cùng hai đầu và cùng đường truyền; resumption chèn early data trước khi phản hồi handshake về client.</desc>
<defs><marker id="net19-fresh-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<rect x="20" y="15" width="150" height="38" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="95" y="40" font-size="14" text-anchor="middle" fill="currentColor">client</text><rect x="350" y="15" width="150" height="38" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981"/><text x="425" y="40" font-size="14" text-anchor="middle" fill="currentColor">server :19190</text><path d="M95 53 V290 M425 53 V290" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/><path d="M95 90 L425 145" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net19-fresh-a)"/><text x="260" y="92" font-size="13" text-anchor="middle" fill="currentColor">Initial + ClientHello</text><text x="260" y="190" font-size="13" text-anchor="middle" fill="currentColor">Chưa gửi app data</text><rect x="32" y="310" width="455" height="36" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b"/><text x="260" y="333" font-size="13" text-anchor="middle" fill="currentColor">Chưa có ticket; app đợi khoá 1-RTT</text><path d="M425 210 L95 265" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net19-fresh-a)"/><text x="260" y="220" font-size="13" text-anchor="middle" fill="currentColor">Initial + Handshake</text>
</svg>
<ab-note>Lần đầu phải nhận thông tin xác thực và tạo khoá. Hình chỉ biểu diễn các chuyến cần thiết, không phải số packet từ capture.</ab-note>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 365" role="img" aria-labelledby="net19-resume-t net19-resume-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net19-resume-t">QUIC resume: thời gian là độ dốc của mũi tên</title>
<desc id="net19-resume-d">Cùng hai đầu và cùng đường truyền; resumption chèn early data trước khi phản hồi handshake về client.</desc>
<defs><marker id="net19-resume-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<rect x="20" y="15" width="150" height="38" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="95" y="40" font-size="14" text-anchor="middle" fill="currentColor">client</text><rect x="350" y="15" width="150" height="38" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981"/><text x="425" y="40" font-size="14" text-anchor="middle" fill="currentColor">server :19190</text><path d="M95 53 V290 M425 53 V290" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/><path d="M95 90 L425 145" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net19-resume-a)"/><text x="260" y="92" font-size="13" text-anchor="middle" fill="currentColor">Initial + ClientHello</text><path d="M95 120 L425 175" fill="none" stroke="#8b5cf6" stroke-width="2" marker-end="url(#net19-resume-a)"/><text x="260" y="190" font-size="13" text-anchor="middle" fill="currentColor">0-RTT: stream 0</text><rect x="32" y="310" width="455" height="36" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6"/><text x="260" y="333" font-size="13" text-anchor="middle" fill="currentColor">Có ticket, server có quyền từ chối early data</text><path d="M425 210 L95 265" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net19-resume-a)"/><text x="260" y="220" font-size="13" text-anchor="middle" fill="currentColor">Initial + Handshake</text>
</svg>
<ab-note>Ticket cho phép client gửi early data ở chuyến đi đầu. Phản hồi vẫn mất thời gian truyền; 0-RTT không có nghĩa tổng request mất 0 ms.</ab-note>
</ab-toggle>

Mã hoá bảo vệ nội dung, nhưng **replay là phát lại dữ liệu đã bắt được để gây thực hiện lặp**, có thể xảy ra dù attacker không giải mã. Kẻ tấn công không cần sửa lệnh trừ số dư; đủ làm server chấp nhận lại một early request ở ngữ cảnh khác mà hệ thống chưa chặn trùng. QUIC packet number chống duplicate trong một connection không tự cung cấp “đúng một lần” xuyên mọi phiên resumption hay mọi backend.

Vì vậy chính sách early data phải xét tác động của thao tác. “GET nên được phép” chưa đủ nếu một endpoint GET lại thay đổi dữ liệu hoặc phát sinh chi phí không thể lặp an toàn. “POST bị cấm hết” cũng chỉ là chính sách đơn giản, không phải định lý của QUIC: một hệ thống có idempotency key được kiểm nguyên tử xuyên các node có thể đặt chính sách khác, nhưng cần chứng minh. Nếu chưa có yêu cầu và cơ chế chịu replay, giữ thao tác nhạy cảm tới sau handshake.

Trong lab, request early chỉ echo chuỗi `early-read-only-probe`, không ghi nghiệp vụ; ticket nằm trong RAM của tiến trình test. Kết quả `session_resumed=True`, `early_accepted=True` kết hợp qlog có `0RTT` packet mới là bằng chứng có early data, không chỉ thấy request hoàn tất. Lab không phát lại ciphertext và không chứng minh chống replay. Sự an toàn giao dịch nằm ngoài chức năng echo này.

> **Nguồn.** RFC 9001 §4.6: *“0-RTT is not suitable for carrying instructions that might initiate any action that could cause unwanted effects if replayed.”* ([QUIC TLS](https://www.rfc-editor.org/rfc/rfc9001#section-4.6)). RFC 9000 §7.3 nêu resumption và 0-RTT; nguy cơ replay và trách nhiệm ứng dụng được phân tích ở RFC 9001 §9.2.

### 3.5 Connection ID giúp tìm state khi tuple thay đổi

Ở bài 18, TCP state gắn với tuple và state của hai đầu; đổi IP/port không tự chuyển byte stream sang tuple khác. **Connection ID — CID — là định danh QUIC do endpoint cấp cho peer dùng khi gửi tới nó, giúp định tuyến packet về đúng connection mà không cần coi địa chỉ hiện tại là định danh duy nhất.** Một connection có thể dùng nhiều CID trong vòng đời; hai hướng có thể dùng CID khác nhau. Đừng nói “QUIC có một ID bất biến đặt trong mọi packet”.

Khi NAT đổi mapping, server nhận packet có source port mới nhưng CID vẫn giúp tìm connection state, nơi có khoá để xác thực packet. **NAT rebinding là việc NAT cấp mapping địa chỉ/port ngoài mới cho lưu lượng của một endpoint**; lab mô phỏng đúng phần đổi source port mà server nhìn thấy bằng relay. **Connection migration là việc một connection tiếp tục trên đường mạng mới**, chẳng hạn client có địa chỉ IP mới. Hai việc có liên hệ nhưng không phải phép thử cùng mức: đổi port loopback chưa kiểm chuyển Wi-Fi sang mạng di động.

Nhận ra CID chưa đủ tin địa chỉ mới. Kẻ bên ngoài có thể cố thao túng địa chỉ nguồn và làm server gửi lưu lượng tới một máy không liên quan. QUIC dùng **path validation — kiểm endpoint có nhận được dữ liệu gửi tới địa chỉ trên đường mới hay không**, bằng PATH_CHALLENGE và PATH_RESPONSE mang giá trị tương ứng. Trên connection đã thiết lập, packet đường mới phải xác thực được bằng khoá phiên; biết CID đơn lẻ không cho quyền chiếm kết nối.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 435" role="img" aria-labelledby="net19-path-t net19-path-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net19-path-t">NAT rebinding: đường đổi port, connection vẫn còn</title>
<desc id="net19-path-d">Ba node cố định. Đường cũ hết hiển thị sau bước một; đường mới mang stream bốn và phép xác thực đường đi.</desc>
<defs><marker id="net19-path-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<rect x="15" y="25" width="125" height="45" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="77" y="53" font-size="14" text-anchor="middle" fill="currentColor">client QUIC</text><rect x="185" y="25" width="145" height="45" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6"/><text x="257" y="53" font-size="14" text-anchor="middle" fill="currentColor">relay :19191</text><rect x="375" y="25" width="130" height="45" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981"/><text x="440" y="53" font-size="14" text-anchor="middle" fill="currentColor">server :19190</text><path d="M77 70 V365 M257 70 V365 M440 70 V365" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/><g data-step="1" data-until="1"><path d="M77 110 L257 110" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net19-path-a)"/><path d="M257 110 L440 110" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net19-path-a)"/><text x="260" y="98" font-size="13" text-anchor="middle" fill="currentColor">before-rebind · stream 0</text><rect x="275" y="132" width="145" height="28" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="347" y="152" font-size="13" text-anchor="middle" fill="currentColor">src :19201</text></g><g data-step="2"><path d="M77 190 L257 190" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net19-path-a)"/><path d="M257 190 L440 190" fill="none" stroke="#8b5cf6" stroke-width="2" marker-end="url(#net19-path-a)"/><text x="260" y="178" font-size="13" text-anchor="middle" fill="currentColor">after-rebind · stream 4</text><rect x="275" y="210" width="145" height="28" rx="6" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6"/><text x="347" y="230" font-size="13" text-anchor="middle" fill="currentColor">src :19202</text></g><g data-step="3"><path d="M440 268 L257 268" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net19-path-a)"/><path d="M257 268 L77 268" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net19-path-a)"/><text x="260" y="257" font-size="13" text-anchor="middle" fill="currentColor">PATH_CHALLENGE qua port mới</text></g><g data-step="4"><path d="M77 320 L257 320" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net19-path-a)"/><path d="M257 320 L440 320" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net19-path-a)"/><text x="260" y="308" font-size="13" text-anchor="middle" fill="currentColor">PATH_RESPONSE → validated</text><rect x="80" y="380" width="360" height="36" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981"/><text x="260" y="403" font-size="13" text-anchor="middle" fill="currentColor">1 connection object, không handshake lại</text></g>
</svg>
<step-note data-step="1">Relay chuyển datagram nguyên byte với source port 19201. Server nhận stream 0 trên một QUIC connection.</step-note>
<step-note data-step="2">Relay đổi sang socket UDP source 19202; state kết nối ở hai đầu không được tạo lại. Đây là đổi port cùng IP, chưa phải chuyển Wi-Fi sang mạng di động.</step-note>
<step-note data-step="3">Nhận diện được connection chưa chứng minh địa chỉ mới nhận được phản hồi. Server gửi challenge để kiểm đường mới.</step-note>
<step-note data-step="4">Response đúng challenge cho server xác nhận đường. Thứ tự hình là quan hệ phụ thuộc; các frame có thể gộp packet và echo không bắt buộc đợi validation hoàn tất.</step-note>
</step-flow>

Đường mới có thể đổi RTT, MTU và bottleneck; [RFC 9000 §9.4](https://www.rfc-editor.org/rfc/rfc9000#section-9.4) quy định việc điều chỉnh state RTT/congestion, với ngoại lệ liên quan thay đổi chỉ port. Không mặc định giữ ngân sách đường cũ.

Một **load balancer là thiết bị hoặc phần mềm chọn backend nhận lưu lượng**; khi có nhiều backend, CID phải giúp packet mới tới đúng state hoặc hệ thống phải có chiến lược tương đương. Một LB chỉ hash tuple có thể đẩy packet sau migration sang worker không có khoá/state, làm mất lợi ích ở endpoint. CID cũng có điều kiện thương lượng: zero-length CID và `disable_active_migration` làm thay đổi khả năng migration; server không tự có quyền chuyển tuỳ ý tới một địa chỉ chưa thương lượng. RFC 9000 §9 đặt ràng buộc, trong đó active migration không được bắt đầu trước khi handshake được xác nhận.

> **Suy luận.** Nếu LB dùng tuple và không chia sẻ/định tuyến state theo cách phù hợp, đổi tuple có thể đưa packet tới backend khác nên phiên không tiếp tục. Lab chỉ có một server trong RAM, chưa dựng LB. Kiểm bằng hai backend có log CID và fault injection đổi source port ở trước LB; “đổi IP xong gọi lại HTTP được” chưa phân biệt migration với fallback/reconnect.

### 3.6 Chống amplification đặt giới hạn trước khi tin đường đi

**Amplification là việc một lượng dữ liệu gửi vào nhỏ kích server phát ra lượng dữ liệu lớn hơn tới một nạn nhân**, khi attacker có thể lợi dụng địa chỉ nguồn. Trước khi xác thực địa chỉ, QUIC giới hạn server gửi tối đa **3 lần** lượng byte đã nhận từ địa chỉ chưa được xác thực, theo RFC 9000 §8. Đây là ngân sách byte có phạm vi theo quy tắc của giao thức, không phải ba response cho mỗi request.

QUIC client phải bảo đảm UDP datagram mang Initial có payload UDP tối thiểu **1200 byte**, thêm PADDING khi cần, theo RFC 9000 §14.1. PADDING giúp đủ kích thước yêu cầu; Initial chứa handshake không phải “app đã gửi 1200 byte nghiệp vụ”. Ngân sách anti-amplification còn giải thích vì sao server có thể phải chờ thêm dữ liệu client trước khi gửi xong handshake/chứng chỉ. Không đọc một khoảng im lặng rồi kết luận server CPU quá tải mà chưa xem trạng thái address validation và byte budget.

Bài này không ép Retry. **Retry là cơ chế server yêu cầu client chứng minh khả năng nhận tại địa chỉ nguồn bằng token trước khi tiếp tục**, có thể thêm một vòng đi-về. Nó khác path validation trên connection đã có và khác resumption ticket dùng cho early data. Token, ticket và CID có nhiệm vụ khác nhau; thay một tên bằng tên kia sẽ làm sai cả mô hình latency lẫn mô hình an toàn.

> **Nguồn.** [RFC 9000 §8](https://www.rfc-editor.org/rfc/rfc9000#section-8) giới hạn anti-amplification; [§14.1](https://www.rfc-editor.org/rfc/rfc9000#section-14.1) quy định kích thước Initial. Đây là con số giao thức, không phải kết luận từ tổng số UDP packet trong capture lab. Bài toán tính phía dưới giả định chưa có validation và chỉ dùng giới hạn byte ấy.

## 4. Lab

### 4.1 Chạy UDP sai trước khi chạy QUIC đúng

Lab nằm trong `net-lab/net-19`, gồm `run.sh`, `lab.py`, `out/`, `src/`. Từ thư mục này chạy:

```bash
./run.sh
```

Script tạo `net19-lab`, cài Python và `aioquic==1.3.0` trong virtualenv, tạo certificate một ngày cho `localhost`, nạp certificate đó vào trust store của client và capture loopback. Nó dọn container và xoá private key/certificate sau khi chạy thành công. Không tắt certificate verification, không mở port ra Internet, không dùng secret sản xuất.

Cách thử UDP thô chỉ cần:

```python
a.sendto(b'abcdefghij', b.getsockname())
print(repr(b.recvfrom(4)[0]))
```

`out/lab.txt` thật:

```text
UDP sent=10 recv_buffer=4 result= b'abcd'
UDP remainder=none (second recv timed out)
UDP relay explicitly drops id=1
UDP received ids= 0,2
UDP no automatic retransmission within 0.2 s
```

**Thấy gì:** buffer nhỏ làm mất đuôi; bỏ id 1 tạo khoảng trống không được UDP tự sửa. **Vì sao:** UDP không giữ byte stream hay lịch retry. Label “relay explicitly drops” chỉ việc vòng lặp bỏ trước gửi, không phải đo router làm rơi ngẫu nhiên 1/3 packet.

### 4.2 Dựng QUIC echo, chưa gọi đó là HTTP/3

`serve()` nghe UDP `127.0.0.1:19190`; client nói chuyện qua relay `:19191`. Relay giữ datagram nguyên byte, dùng socket uplink `:19201` gửi tới server; phản hồi được chuyển lại client. Không terminate TLS tại relay. Cả QUIC peer và relay nằm trên loopback cùng container để chỉ thay một biến là source port.

Server subclass `QuicConnectionProtocol`, khi nhận `StreamDataReceived` thì gửi lại đúng byte với cùng stream ID và end-of-stream. Client mở stream bằng API của `aioquic`; đây là giao thức echo ALPN `net19-echo`, **không phải HTTP/3**. QUIC có thể mang giao thức khác HTTP; thấy UDP 443 hay thấy TLS/QUIC cũng chưa chứng minh payload là HTTP/3.

```text
ENV Linux 6.8.0-64-generic aarch64 Linux aioquic 1.3.0
FRESH via relay server-observed source=127.0.0.1:19201
CLIENT handshake resumed= False early_accepted= False
SERVER handshake resumed= False early_accepted= False
ECHO stream= 0 sent= before-rebind recv= before-rebind
```

**Thấy gì:** handshake lần đầu không resumed, không early data; stream 0 echo thành công. **Vì sao:** client chưa cầm ticket của server. Không dùng kết quả loopback để gán thời gian handshake cho Internet và cũng không suy “False” là handshake kém tối ưu; đây là điều kiện đầu vào cố ý.

### 4.3 Giữ cùng connection, thay địa chỉ mà server nhìn thấy

Sau echo đầu, script đợi rồi đổi uplink relay sang một UDP socket bind `127.0.0.1:19202`. Client QUIC protocol object không được tạo lại, server không restart và TLS không handshake lại. Socket uplink cũ vẫn mở trong khoảng kiểm để nhận phản hồi đang bay; đây không mô phỏng đường cũ bị cắt vật lý.

Log từ cùng lần chạy:

```text
SERVER original_destination_connection_id= f638be54bdef1be3
REBIND relay source=127.0.0.1:19202 (old transport still open)
ECHO stream= 4 sent= after-rebind recv= after-rebind
SERVER unique_connection_objects= 1 same_original_cid= True
SERVER path= ('127.0.0.1', 19202) validated= True
SERVER path= ('127.0.0.1', 19201) validated= True
```

Script deduplicate object server: một connection có nhiều CID, nên số key trong `_protocols` không phải số connection. `original_destination_connection_id` là mốc debug gắn với phiên này, **không phải tuyên bố mọi wire CID đều phải giữ nguyên giá trị đó**. Field nội bộ chỉ dùng đo, phụ thuộc bản `aioquic`, không phải API routing sản xuất.

**Thấy gì:** stream kế tiếp vẫn trong một connection, hai path được server ghi nhận và validated. **Vì sao:** QUIC lookup state không buộc tuple cũ là định danh duy nhất; phía server có thể kiểm đường mới. Để chứng minh validation không chỉ là cờ tự in, đối chiếu qlog:

```text
SERVER qlog sent path_challenge
CLIENT qlog sent path_response
```

Các dòng trên là summary do script đọc frame thực từ qlog. Summary duyệt server trước client, không phải thứ tự thời gian. Muốn xem quan hệ thời gian, dùng timestamp trong từng trace và nguồn frame; capture UDP chỉ nhìn được địa chỉ và độ dài, không tự giải mã các frame ứng dụng được bảo vệ.

> **Đo trên lab.** Port ngoài đổi `19201 → 19202`, original CID mốc `f638be54bdef1be3`, `unique_connection_objects=1`, hai path validated; frame challenge/response có trong `out/server.qlog.json` và `out/client.qlog.json`. Đây là NAT rebinding cùng IP do relay mô phỏng. Chưa đo IP đổi, client thật chuyển Wi-Fi/di động, backend nhiều node, hoặc mất đồng thời đường cũ.

### 4.4 Mở connection mới với ticket, gửi trước khi đợi handshake

Server lưu session ticket trong dictionary của lần chạy; client nhận ticket qua callback, dùng nó trong `QuicConfiguration` cho kết nối mới. `connect(..., wait_connected=False)` cho phép code tạo stream/gửi payload sớm. Theo source `aioquic` đã tải vào `src/`, tham số này thay mặc định đợi thiết lập trước khi nhường protocol cho ứng dụng.

```python
configuration.session_ticket = client_tickets[-1]
async with connect(host, port, configuration=configuration,
                   wait_connected=False) as proto:
    await request(proto, b'early-read-only-probe')
```

Đây là phần rút gọn luồng code thật; `host`, `port` được script đặt cho relay. Output quyết định từ log:

```text
RESUME ticket_max_early_data_size= 4294967295
RESUME send before wait_connected
CLIENT handshake resumed= True early_accepted= True
ECHO stream= 0 sent= early-read-only-probe recv= early-read-only-probe
SERVER handshake resumed= True early_accepted= True
CLIENT qlog sent_packet_types= {"0RTT": 1, "1RTT": 11, "handshake": 3, "initial": 4}
```

**Thấy gì:** connection mới có stream 0 mới và early data được chấp nhận; summary qlog gộp hai connection, có một packet 0RTT. **Vì sao:** server còn dữ liệu ticket và client chủ động gửi sớm. `4294967295` là giá trị QUIC yêu cầu cho `max_early_data_size` của ticket khi bật early data, không phải ứng dụng được gửi không giới hạn bỏ qua flow control. [RFC 9001 §4.6.1](https://www.rfc-editor.org/rfc/rfc9001#section-4.6.1).

### 4.5 Đọc capture đúng lớp, giữ lại chỗ chưa chứng minh

`out/packets.txt` được tạo bằng:

```bash
tcpdump -l -nn -tt -i lo 'udp port 19190 or udp port 19191'
```

Lọc các dòng có `19201` hoặc `19202` để xem địa chỉ mà server nhận, rồi đối chiếu path trong qlog. QUIC payload được bảo vệ; tcpdump ở đây không phải công cụ đọc chuỗi echo hay xác định handler nào commit. Qlog là instrumentation của endpoint, cần lưu ở nơi có kiểm soát vì có thể lộ metadata như ID, địa chỉ, thời gian và cấu trúc lưu lượng. Lab không export khoá phiên, ticket hay private key vào bài học.

## 5. Tính tay

Các số ngoại trừ cấu trúc giao thức ở đây là **giả định của bài toán**, không phải latency đo trên loopback. Bỏ DNS, mất gói, server processing, pacing và Retry nếu không nói khác.

### 5.1 0-RTT tiết kiệm một lần đợi, không tiết kiệm khoảng cách

Giả sử RTT đối xứng **40 ms**, thời gian một chiều **20 ms**, response nhỏ gửi ngay khi server có request. So QUIC lần đầu, client đợi một RTT rồi gửi request, với resumption có early data được chấp nhận. Tính từ client gửi Initial tới nhận response.

**Giải:** lần đầu server nhận Initial ở 20 ms, client nhận phản hồi handshake ở 40 ms, request đến server ở 60 ms, response về client ở **80 ms**. Nhánh early data gửi request trong chuyến đầu: server nhận ở 20 ms, response tới client sớm nhất ở **40 ms** theo mô hình đã nêu. Tiết kiệm `80 − 40 = 40 ms`, tức một RTT. Cụm “0-RTT” mô tả số lượt phải đợi trước khi gửi request; toàn request vẫn mất ít nhất một RTT trong mô hình này. Nếu thêm Retry thì chuỗi trên không còn đủ, phải vẽ thêm chuyến.

### 5.2 Ngân sách trước xác thực không phải kích thước response vô hạn

Giả sử server đã nhận đúng một datagram Initial có UDP payload **1200 byte** từ địa chỉ chưa được xác thực; chưa nhận thêm byte và chưa có cách validation khác. Với hệ số **3**, ngân sách gửi tối đa bao nhiêu? Nếu đã gửi **2400 byte** trong phạm vi đếm, còn bao nhiêu?

**Giải:** `1200 × 3 = 3600 byte`; còn `3600 − 2400 = 1200 byte`. Đây là giới hạn byte theo quy tắc anti-amplification, không phải cứ mỗi Initial là được phát ba packet. Handshake chưa xong có thể phải chờ client/validation. Phép tính đếm payload theo RFC, không cộng IP/Ethernet header; sau validation đây không phải trần kích thước file.

### 5.3 Hai bộ số không đếm cùng một thứ

Trong lab, cùng connection có stream `0` rồi `4`; connection resumption mới lại có stream `0`. Summary client có `1` packet loại `0RTT` trong cả lần chạy. Có thể kết luận bốn stream bị mất hoặc chỉ một request được gửi qua toàn lab không?

**Giải:** không. Với client-initiated bidirectional stream, stream ID tăng bước **4** do bit loại stream; `0 → 4` là hai stream liên tiếp loại đó. Connection mới có không gian stream ID riêng nên dùng lại `0` hợp lệ. Tổng echo của lab là ba request: trước rebind, sau rebind, và early probe trên phiên mới; chỉ request cuối nằm trong nhánh early data. Một packet có thể mang nhiều frame và một request có thể trải nhiều packet, nên số `0RTT=1` chỉ là số packet của loại ấy được instrumentation ghi lại. Đếm công việc bằng dữ liệu request, không bằng packet number hay max stream ID.

## 6. Chuyển giao

1. UDP receiver báo mỗi message chỉ có 512 byte dù sender log 900 byte. Packet capture ở receiver cho thấy datagram đủ dài. Bạn kiểm buffer và cờ truncation ra sao trước khi kết luận MTU?
2. QUIC qua Wi-Fi được nhưng qua một mạng doanh nghiệp lại fallback HTTP/2. Hãy đặt hai phép thử tách “UDP bị chặn” với “server không thương lượng HTTP/3”, có chỉ rõ điều một capture không thấy được.
3. Resumption báo thành công nhưng `early_data_accepted=False`. Hãy nêu các điều kiện cần kiểm và cách đảm bảo một request có tác động không bị thực hiện hai lần khi thư viện chuyển sang gửi sau handshake.
4. Sau đổi source port, backend B log một CID chưa biết còn backend A vẫn giữ state. Bạn đặt instrumentation ở LB và endpoint thế nào để xác định mất routing state thay vì đổ lỗi TLS?
5. Đã loại HOL chéo stream mà cả download lẫn request nhỏ vẫn chậm khi loss tăng. Hãy tách shared congestion budget, flow control, CPU mã hoá và phụ thuộc ứng dụng bằng những phép đo khác nhau.
6. **Câu khó nhất, không có đáp án trong bài.** Thiết kế dịch vụ ghi có nhiều backend, hỗ trợ migration và resumption qua hai region, trong khi các node không dùng cùng RAM. Cần giữ/định tuyến state connection, kiểm replay early data và deduplicate thao tác nghiệp vụ ở những phạm vi nào? Hãy mô tả một lần đổi mạng trùng deploy và timeout response có thể vượt qua kiểm thử thông thường, rồi đề xuất bằng chứng để chứng minh thiết kế không ghi lặp và không nhận nhầm một connection mới là migration.

## 7. Tóm tắt

- UDP giữ ranh giới datagram; lab gửi 10 byte, đọc buffer 4 chỉ nhận `abcd` và không đọc tiếp được đuôi bằng lần `recvfrom` sau.
- UDP không tự cung cấp retry, thứ tự hay chống duplicate; QUIC tự thực hiện transport và bảo mật phía trên UDP.
- QUIC phân biệt packet number phục vụ ACK/loss với stream offset phục vụ ráp byte; truyền lại thông tin không đòi lặp nguyên packet number.
- Thứ tự byte nằm trong từng stream; không đồng nghĩa các stream hết chia sẻ tắc nghẽn hay phụ thuộc ứng dụng.
- 0-RTT cần thông tin phiên cũ và server chấp nhận; early data có nguy cơ replay, không có bảo đảm thực hiện nghiệp vụ đúng một lần.
- CID giúp tìm state qua tuple mới; path validation kiểm đường mới. Lab rebind `19201 → 19202` giữ một connection và xác thực được path.
- RFC 9000 quy định ngân sách anti-amplification 3 lần trước validation và UDP payload của Initial client tối thiểu 1200 byte; đây không phải giới hạn kích thước file.

→ **Bài 20 — Phân giải từ root**: transport đã có thể theo dõi tới endpoint, nhưng endpoint ấy được tìm từ tên miền qua những lượt hỏi DNS và cache nào?
