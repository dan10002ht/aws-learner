# Bài 18 — Đóng kết nối: TIME_WAIT, RST và keepalive

## 1. Mục tiêu

Sau bài này bạn có thể:

- Nhìn hai đầu của một lần đóng TCP và xác định bên nào giữ `TIME_WAIT`, bên nào còn phải gọi `close()`.
- Dùng `ss` cùng capture để tách `CLOSE_WAIT`, `FIN_WAIT_2` và một kết nối `ESTABLISHED` đã mất đường truyền.
- Tính số state chờ từ tốc độ đóng kết nối, rồi kiểm xem đó có thực sự gây thiếu port hay file descriptor không.
- Tạo một lần đóng bằng FIN và một lần abort bằng RST, giải thích khác biệt giữa EOF và `ECONNRESET` mà ứng dụng nhận.
- Chọn phép thử phù hợp giữa TCP keepalive, heartbeat ứng dụng và deadline của request.
- Bác bỏ hai cách sửa sai: giảm `tcp_fin_timeout` để dọn TIME_WAIT, hoặc bật keepalive để chứng minh handler còn phục vụ được.

## 2. Triệu chứng

Một worker gọi dịch vụ nội bộ, mỗi việc mở TCP mới rồi đóng sau khi nhận kết quả. Dashboard thấy hàng chục nghìn `TIME_WAIT`; một lời khuyên xuất hiện: “socket chưa giải phóng, giảm timeout xuống là hết”. Cùng lúc, worker khác có socket vẫn `ESTABLISHED` nhưng chờ phản hồi mãi. Dev gom hai hiện tượng vào một lỗi “TCP giữ kết nối quá lâu”.

Ta thu nhỏ ca đó thành phép thử có thể lặp lại. **Lab** tạo 100 kết nối tới `127.0.0.1:18184`, client đóng trước: `ss` đếm đúng 100 entry `TIME_WAIT`. Ở phép thử khác, chặn toàn bộ segment chiều server trả về bằng DROP: sau timeout đọc 3 giây, hai đầu vẫn `ESTABLISHED`. Không có payload đang chờ ACK trong phép thử thứ hai. Hai ảnh chụp đều có “socket còn đó”, nhưng một cái là hậu quả đóng thành công, cái kia là chưa phát hiện đường đã mất.

> **Đo trên lab.** Alpine 3.20, Linux `6.8.0-64-generic`, aarch64 trong Docker/colima; TCP trên loopback, không TLS, không proxy. `out/lab.txt` ghi `burst_timewait_count= 100` và `BLACKHOLE keepalive= False elapsed_s= 3.003 error= TimeoutError errno= None`. Đo lại: chạy `./run.sh` trong thư mục lab `net-18`.

Các port và thời gian trong bài là từ lần chạy lưu log; lần chạy lại có thể cấp source port khác. Mô hình “30.000 TIME_WAIT” ở phần tính là bài toán giả định, không phải số đã tạo trên máy này.

## ⏸ Dừng lại — đoán trước #1

Bạn thấy 100 entry `TIME_WAIT`, không có tên process ở cột cuối của `ss -p`. Kết luận nào đứng được?

(a) Process đang rò 100 file descriptor, phải kill process.
(b) Kernel còn giữ state sau đóng; phải đo thêm port, tốc độ tạo và lỗi connect trước khi kết luận thiếu tài nguyên.
(c) Server quên gọi `close()`, chắc chắn có bug cleanup.
(d) TCP keepalive sẽ dọn ngay các entry này.

## 3. Cơ chế

### 3.1 Đóng một chiều trước, không đóng cả cuộc hội thoại

Đáp án là **(b)**. Muốn biết kernel giữ thứ gì, phải nhìn việc đóng theo từng chiều. **FIN là cờ TCP báo bên gửi không còn byte dữ liệu nào theo chiều đó sau vị trí FIN trong sequence space.** FIN được sắp thứ tự sau dữ liệu và phải được ACK; nó không có nghĩa “bên kia phải bỏ hết dữ liệu đang gửi về”. Các quy tắc sequence/ACK đã có ở bài 16; ở đây chỉ dùng chúng để đọc teardown.

Một **half-close** là kết nối đã kết thúc một chiều gửi nhưng chiều ngược lại còn dùng được. Python `shutdown(socket.SHUT_WR)` diễn đạt đúng ý: client hết phần gửi, vẫn giữ quyền đọc. Server đọc hết dữ liệu rồi `recv()` trả `b''`, tức **EOF — end of file — tín hiệu không còn byte để đọc theo chiều nhận ấy**. Server vẫn có thể gửi kết quả cuối; lab gửi thật `reply-after-eof` và client nhận được.

Đó là một thiết kế có ích với giao thức gửi hết input rồi mới đọc kết quả. Nếu app đọc thấy EOF lập tức hủy cả hai chiều, nó có thể bỏ mất bước gửi kết quả mà giao thức của mình vẫn cần. Ngược lại, với giao thức đã quy định peer đóng là kết thúc toàn bộ phiên, app nên đóng tài nguyên sớm theo quy định đó. TCP không tự chọn quy tắc ứng dụng thay bạn.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 395" role="img" aria-labelledby="net18-fin-t net18-fin-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net18-fin-t">FIN đóng từng chiều, ACK cuối tạo TIME_WAIT</title>
<desc id="net18-fin-d">Hai đầu cố định; thời gian đi từ trên xuống. Các mũi tên xuất hiện theo bước.</desc>
<defs><marker id="net18-fin-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<rect x="25" y="12" width="150" height="38" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="100" y="37" font-size="14" text-anchor="middle" fill="currentColor">client :52496</text><rect x="345" y="12" width="150" height="38" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981"/><text x="420" y="37" font-size="14" text-anchor="middle" fill="currentColor">server :18180</text><path d="M100 50 V330 M420 50 V330" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/><g data-step="1"><text x="260" y="81" font-size="13" text-anchor="middle" fill="currentColor">FIN — hết dữ liệu chiều đi</text><path d="M100 90 L420 90" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net18-fin-a)"/></g><g data-step="2"><text x="260" y="136" font-size="13" text-anchor="middle" fill="currentColor">ACK — server còn gửi được</text><path d="M420 145 L100 145" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net18-fin-a)"/></g><g data-step="3"><text x="260" y="191" font-size="13" text-anchor="middle" fill="currentColor">FIN — server cũng đóng</text><path d="M420 200 L100 200" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net18-fin-a)"/></g><g data-step="4"><text x="260" y="246" font-size="13" text-anchor="middle" fill="currentColor">ACK — client giữ TIME_WAIT</text><path d="M100 255 L420 255" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net18-fin-a)"/></g><g data-step="1" data-until="2"><rect x="130" y="345" width="260" height="32" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b"/><text x="260" y="367" font-size="13" text-anchor="middle" fill="currentColor">Client chờ FIN phía server</text></g><g data-step="3" data-until="3"><rect x="130" y="345" width="260" height="32" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b"/><text x="260" y="367" font-size="13" text-anchor="middle" fill="currentColor">Server chờ ACK cuối</text></g><g data-step="4"><rect x="130" y="345" width="260" height="32" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981"/><text x="260" y="367" font-size="13" text-anchor="middle" fill="currentColor">Client: TIME_WAIT</text></g>
</svg>
<step-note data-step="1">Client gọi <code>shutdown(SHUT_WR)</code>; chỉ hướng client gửi kết thúc. FIN đứng sau dữ liệu đã xếp hàng.</step-note>
<step-note data-step="2">Server trả EOF cho ứng dụng nhưng vẫn được gửi <code>reply-after-eof</code>. ACK cho FIN không bắt app đóng chiều còn lại.</step-note>
<step-note data-step="3">Khi app server đóng, FIN chiều về mới được gửi. Chờ app ở bước trước là lý do CLOSE_WAIT có thể kéo dài.</step-note>
<step-note data-step="4">Client còn state để ACK lại FIN lặp nếu ACK cuối mất; state chờ không còn là file descriptor của app.</step-note>
</step-flow>

**Active closer là phía bắt đầu đóng trong chuỗi đóng thông thường**, không phải danh xưng cố định “client”. Lab cố ý để client gửi FIN trước, nên client có TIME_WAIT. Một HTTP server quyết định hết idle rồi đóng trước có thể là phía giữ TIME_WAIT. Trong đóng đồng thời, cả hai đầu có thể vào TIME_WAIT; vì vậy câu “chỉ bên client có TIME_WAIT” sai ngay ở cơ chế.

Theo đường đóng không đồng thời: sau FIN của client được ACK, client tới `FIN_WAIT_2`; server nhận FIN thì tới `CLOSE_WAIT`. Server chỉ gửi FIN của mình khi ứng dụng server cũng đóng chiều gửi. Sau khi FIN server được ACK, server kết thúc, còn client tới TIME_WAIT. Hình bỏ qua nhánh gộp ACK với FIN và đóng đồng thời; capture thực tế không nhất thiết có bốn packet tách rời.

**CLOSE_WAIT là TCP đã biết peer hết gửi nhưng ứng dụng địa phương chưa hoàn tất đóng.** Tên này không có nghĩa kernel đang đợi một timeout mạng để tự sửa cleanup của app. Nếu số này tăng liên tục và mỗi entry còn gắn file descriptor của process, hãy lần đường EOF, exception, cancel và nhánh return sớm: ai chịu trách nhiệm đóng socket? Trong lab ta giữ server cố ý để chụp được trạng thái này, rồi đóng đúng socket và thấy nó biến mất.

> **Nguồn.** RFC 9293 §3.6.1: *“closed in only one direction”* ([half-close](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.6.1)). Quy tắc đóng từng chiều nằm ở §3.6; sơ đồ trạng thái tổng quan đã có ở [[eng-03-tcp-tls]], không cần học lại toàn bộ sơ đồ để chẩn đoán ca này.

### 3.2 TIME_WAIT giữ hai cam kết sau khi ứng dụng đã xong

**TIME_WAIT là state TCP còn lưu sau một chuỗi đóng để bảo vệ việc hoàn tất và việc dùng lại định danh kết nối.** Có hai lý do liên quan nhưng không thay thế nhau.

Thứ nhất, ACK cuối có thể mất. Server còn ở `LAST_ACK` sẽ truyền lại FIN. Nếu client còn state, nó nhận ra FIN đó và trả ACK lại. Xoá state ngay khi app đã đọc EOF làm mất khả năng hoàn tất gọn chuỗi đóng ấy. ACK đơn thuần không có cơ chế chờ ACK của chính nó; không thể giải bằng việc thêm một ACK cho ACK mãi mãi.

Thứ hai, segment cũ có thể còn trên đường. Một kết nối TCP được phân biệt bởi cặp địa chỉ/port hai đầu trong cùng giao thức. Dùng lại quá sớm cùng định danh làm xuất hiện bài toán phân biệt byte của phiên trước với phiên mới. Sequence number, timestamp và các quy tắc tái dùng hỗ trợ xử lý, nhưng không biến việc bỏ TIME_WAIT tùy tiện thành một tối ưu vô hại.

**MSL — maximum segment lifetime — là giới hạn tuổi segment mà mô hình TCP dùng để tránh nhầm dữ liệu cũ.** RFC 9293 §3.6.1 yêu cầu active close giữ TIME_WAIT trong `2 × MSL`, có các điều kiện cho phép nhận SYN mới được nêu ngay sau đó. Đây là yêu cầu giao thức; số giây của implementation cần đo riêng. Trên Linux lab, `ss -o` vừa đóng xong báo timer gần 60 giây. Không lấy con số xấp xỉ trong bài nền làm mặc định xuyên mọi hệ điều hành.

`close()` trả tài nguyên ứng dụng không đồng nghĩa mọi state kernel phải mất ngay. Trong snapshot lab, TIME_WAIT không còn mục `users:(...)`, còn CLOSE_WAIT vẫn gắn `python3` và fd. Đừng lấy một hàng TIME_WAIT rồi cộng thành một fd app. Ngược lại cũng đừng nói state này miễn phí: kernel vẫn phải quản lý nó, và định danh còn trong thời gian bảo vệ có thể ảnh hưởng khả năng tạo kết nối mới theo chính sách tái dùng.

> **Suy luận.** Với giả định mỗi lần đóng tạo một state giữ đúng 60 s, tốc độ ổn định 500 lần/s và không tái dùng sớm, số đang chờ xấp xỉ `500 × 60 = 30.000`. Đây là mô hình cân bằng vào/ra, không phải đo tải 500 lần/s. Kiểm bằng đo tốc độ active close, histogram tuổi TIME_WAIT và phạm vi tuple; không suy ra từ tổng request/s.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 375" role="img" aria-labelledby="net18-rate-t net18-rate-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net18-rate-t">TIME_WAIT tăng rồi cân bằng</title>
<desc id="net18-rate-d">Diện tích giữ state tăng tuyến tính tới giây 60 rồi nằm ngang ở 30000, theo mô hình không tái dùng.</desc>
<defs><marker id="net18-rate-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">Giả định: 500 lần đóng/s; giữ 60 s</text><path d="M65 295 L490 295" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net18-rate-a)"/><path d="M65 295 L65 55" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net18-rate-a)"/><path d="M65 295 L425 85 L490 85 L490 295 Z" fill="#3b82f6" fill-opacity="0.15"/><path d="M65 295 L425 85 L490 85" stroke="#3b82f6" stroke-width="3" fill="none"/><text x="60" y="89" font-size="13" text-anchor="end" fill="currentColor">30.000</text><text x="53" y="317" font-size="13" text-anchor="start" fill="currentColor">0</text><text x="414" y="317" font-size="13" text-anchor="start" fill="currentColor">60 s</text><text x="200" y="250" font-size="13" text-anchor="start" fill="currentColor">Tích luỹ: tốc độ vào × thời gian</text><text x="270" y="68" font-size="13" text-anchor="start" fill="currentColor">Cân bằng vào = hết hạn</text><path d="M425 295 V85" stroke="currentColor" stroke-dasharray="4 4"/><text x="20" y="348" font-size="14" text-anchor="start" fill="currentColor">Đếm state ở một phía, không đếm request.</text>
</svg>

Để tránh “nhiều là hỏng”, đặt số đếm cạnh triệu chứng có thể bác bỏ: connect mới có trả lỗi không; các lỗi thuộc `EADDRNOTAVAIL`, `EMFILE` hay timeout; mọi flow tới cùng đích hay nhiều đích; kernel có cảnh báo vượt giới hạn TIME_WAIT không. Một listener nhận kết nối từ nhiều remote tuple khác với một worker mở kết nối tới đúng một remote IP/port. Chỉ tổng TIME_WAIT toàn máy không cho biết chiều nào đang thiếu.

**Ephemeral port là port nguồn được cấp tự động khi app chưa chọn port cụ thể.** Nó không phải một kho duy nhất “mọi kết nối cả máy cộng lại chỉ có chừng ấy”. Khả năng phân biệt còn phụ thuộc source IP, remote IP/port, namespace, cách bind và chính sách tái dùng. NAT còn có bảng mapping và ngân sách port riêng: quay lại [[net-07-nat-conntrack]] trước khi quy lỗi host cho gateway hoặc ngược lại.

### 3.3 Vì sao giảm tcp_fin_timeout không dọn TIME_WAIT

Tên biến dễ đánh lừa: có chữ “fin” và có timeout, nên người vận hành nghĩ nó áp dụng cho mọi đoạn đóng. **Trên Linux, `tcp_fin_timeout` áp dụng cho kết nối orphan ở FIN_WAIT_2**, tức không còn ứng dụng tham chiếu nhưng peer chưa đóng chiều của nó. Nó không phải đồng hồ TIME_WAIT, cũng không phải lời hứa CLOSE_WAIT có app đang giữ fd sẽ tự được dọn sau từng ấy giây.

Trong lab, `sysctl` trả `net.ipv4.tcp_fin_timeout = 60`; TIME_WAIT vừa tạo cũng hiện gần 60 s. Hai số trùng nhau không chứng minh biến này điều khiển state kia. Đây là ca chẩn đoán phải đối chiếu ngữ nghĩa tài liệu trước khi chỉnh. Lab này không thay biến đó, và không dùng một lần đổi sysctl trên cả VM làm phép chứng minh.

Tài liệu kernel còn có `tcp_tw_reuse` để cho phép dùng lại TIME_WAIT khi an toàn theo giao thức. Nhưng loại lưu lượng, phiên bản kernel, timestamp và giá trị thực tế của namespace đều ảnh hưởng; không sao chép một giá trị từ bài trên Internet sang mọi server. Ưu tiên sửa nguồn tạo kết nối: một pool có giới hạn và tái dùng kết nối giảm số lần phải bắt tay/đóng trên mỗi đơn vị công việc. Chính sách idle của pool phải phối hợp với proxy, nội dung này sang bài 25.

> **Nguồn.** Linux IP sysctl, `tcp_fin_timeout`: *“The length of time an orphaned (no longer referenced by any application) connection will remain in the FIN_WAIT_2 state before it is aborted at the local end.”* ([kernel docs](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html#tcp-variables)). `tcp_tw_reuse` có điều kiện an toàn riêng trong cùng trang; bài không đề xuất thay giá trị mặc định.

**Chỗ hay sai khi chữa rò fd:** tăng `ulimit` có thể trì hoãn `EMFILE`, không sửa nhánh quên close. **Chỗ hay sai khi chữa churn:** tăng fd không thay số tuple tới cùng remote; giảm idle của pool có thể còn làm tăng số lần đóng. Muốn thay tham số phải nói rõ nó điều khiển tài nguyên nào và dự đoán phép đo nào sẽ đổi.

## ⏸ Dừng lại — đoán trước #2

Server gọi `shutdown(SHUT_WR)` sau khi gửi response. Client đã đọc hết response, lần `recv()` tiếp theo trả `b''`. Điều đó chứng minh gì?

(a) Handler server commit transaction thành công.
(b) Peer đã đóng chiều gửi theo TCP; không tự chứng minh transaction nào được commit.
(c) Đường truyền bị đứt giữa chừng nên TCP đoán không còn dữ liệu.
(d) Client sẽ nhận `ECONNRESET` ở lần đọc đó.

### 3.4 FIN và RST không phải hai cách viết cùng một kết quả

Đáp án là **(b)**. **RST — reset — là tín hiệu hủy hoặc từ chối state TCP, thay vì hoàn tất có thứ tự bằng FIN.** Một FIN hợp lệ đứng sau dữ liệu theo sequence; receiver đọc hết các byte đứng trước nó rồi thấy EOF. Một RST được TCP chấp nhận có thể làm các thao tác chờ thất bại và kết nối bị abort. Kernel phải kiểm tra tính hợp lệ của RST; không phải cứ có bit RST trong bất kỳ packet nào thì phiên chắc chắn đóng.

Lab đặt `SO_LINGER` với timeout bằng 0 rồi đóng socket đã accept, chủ ý tạo **abortive close — đóng bằng cách hủy thay vì chờ flush theo cách thông thường**. Client đang đọc nhận `ConnectionResetError`, errno 104 trên Linux. Capture thấy `[R.]`. Con số errno là của hệ điều hành lab; code ứng dụng nên dùng tên lỗi qua API thay vì hard-code số Linux sang hệ khác.

Không phải mọi RST đều do `SO_LINGER`: port không có listener, peer mất state sau restart hoặc một thiết bị trên đường chủ động reset cũng là những hướng điều tra. Nhìn RST có source server chỉ cho biết địa chỉ mà capture thấy, chưa xác định handler nào phát nó; proxy cũng có hai phiên TCP độc lập. Ghép thời điểm reset với log process, topology và capture đúng phía để kiểm nguồn phát.

Và không suy “không thấy RST” thành “đóng sạch”: đường bị DROP không phát FIN lẫn RST. Không suy “FIN đã ACK” thành “giao dịch đã commit”: ACK cho biết TCP nhận byte, không chứng minh app đã đọc, validate, ghi DB và trả kết quả theo giao thức. Một deadline hết sau lúc gửi thao tác ghi vẫn có thể để lại kết quả chưa biết. Retry cần định danh thao tác hoặc cơ chế idempotency của ứng dụng, không dựa vào FIN/RST để bảo đảm thực hiện đúng một lần.

> **Nguồn.** Quy tắc abort và kiểm RST: [RFC 9293 §3.5.2–3.5.3](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.5.3). Tuỳ chọn `SO_LINGER`: [socket(7)](https://man7.org/linux/man-pages/man7/socket.7.html); orphan FIN_WAIT_2: [tcp(7)](https://man7.org/linux/man-pages/man7/tcp.7.html). Output RST của bài được đo riêng ở mục 4, không suy từ việc `close()` trả về thành công.

### 3.5 Half-open khác half-close: một đầu tin state còn sống

**Half-open là kết nối mà một phía đã mất hoặc bỏ state nhưng phía còn lại chưa biết.** RFC 9293 §3.5.1 mô tả trường hợp này, ví dụ máy restart và quên phiên cũ. Đầu còn giữ state gửi segment thì peer không có phiên có thể đáp RST, giúp phát hiện. Còn half-close là một trạng thái đóng từng chiều có chủ đích mà cả hai phía vẫn có thể biết đúng.

Đường bị đứt im lặng không nhất thiết tạo half-open theo nghĩa chặt ấy: cả hai kernel có thể vẫn giữ state, chỉ không nói chuyện được. Tuy nhiên nó cho ứng dụng cùng vấn đề vận hành: `ESTABLISHED` là nhận định cục bộ từ sự kiện cuối mà TCP nhận, không phải chứng nhận end-to-end ở thời điểm bạn chạy `ss`. Vì vậy lab gọi ca DROP là **blackhole**, không gọi nó là bằng chứng đã tạo peer restart thật.

Một socket đang idle, không payload chờ ACK, không bật keepalive thì không có phép thử mới nào để tạo ra thông tin “đường đã chết”. Đặt timeout đọc ở Python làm lần gọi đọc hết thời gian chờ, nhưng không tự bắt kernel bỏ TCP state. Lab chứng minh đúng điểm đó: sau `TimeoutError errno=None` ở giây 3, `ss` vẫn có hai entry ESTAB. App cần quyết định đóng, tái dùng hay thử lại theo giao thức; đừng mặc định exception của một lời gọi đồng nghĩa fd và state được giải phóng.

Có dữ liệu đang chờ ACK thì TCP đã có retransmission và giới hạn từ bỏ. Phần mất gói và RTO nằm ở bài 16; không dùng công thức keepalive bên dưới thay cho nó. Có dữ liệu chưa được gửi vì zero window lại là trường hợp liên quan flow control ở bài 17. Phân biệt idle hoàn toàn, chưa được ACK và chưa gửi được trước khi chọn timer.

### 3.6 Keepalive chỉ hỏi được tới TCP peer

**TCP keepalive là probe do TCP gửi trên một kết nối idle nhằm kích peer trả lời, từ đó phát hiện phiên không còn hoạt động.** Nó cần được bật cho từng socket qua `SO_KEEPALIVE`; đọc sysctl không có nghĩa mọi socket đã bật. Linux cung cấp các tuỳ chọn socket `TCP_KEEPIDLE`, `TCP_KEEPINTVL`, `TCP_KEEPCNT` để đặt thời gian idle trước probe, khoảng cách probe khi không được trả lời, và ngân sách probe.

Lab đọc mặc định của namespace: `7200 s`, `75 s`, `9`. Những số này chỉ có ý nghĩa cho socket đã bật keepalive mà không override theo socket. Với ứng dụng cần biết lỗi trong vài giây, chỉ bật cờ mà giữ thời gian bắt đầu probe sau 2 giờ không đạt yêu cầu. RFC yêu cầu keepalive mặc định tắt và không được kết luận mất kết nối chỉ vì đúng một probe không được trả lời; ACK có thể mất trên mạng.

Hai lượt A/B dùng kết nối mới và cùng cách DROP chiều server → client; lượt bật đặt cờ và timer trên client. Timeout đọc ứng dụng là 3 s khi tắt, 8 s khi bật để TCP được báo lỗi trước ở lượt bật. Nhánh bật đặt idle 2 s, interval 1 s, count 3; lỗi đọc đến sau `5,088 s`, errno 110 (`ETIMEDOUT`). Nhánh tắt chỉ hết timeout đọc 3 s của Python, TCP vẫn còn. **Timeout ứng dụng và TCP timeout có thể cùng hiện tên `TimeoutError` trong Python nhưng nguồn phát khác**, nên phải đọc errno và state kèm theo.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 395" role="img" aria-labelledby="net18-ka-t net18-ka-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net18-ka-t">DROP im lặng: keepalive tạo phép thử</title>
<desc id="net18-ka-d">Hai đầu cố định; thời gian đi từ trên xuống. Các mũi tên xuất hiện theo bước.</desc>
<defs><marker id="net18-ka-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<rect x="25" y="12" width="150" height="38" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6"/><text x="100" y="37" font-size="14" text-anchor="middle" fill="currentColor">client :41310</text><rect x="345" y="12" width="150" height="38" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981"/><text x="420" y="37" font-size="14" text-anchor="middle" fill="currentColor">server :18183</text><path d="M100 50 V330 M420 50 V330" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/><g data-step="1"><text x="260" y="81" font-size="13" text-anchor="middle" fill="currentColor">idle 2 s → probe #1</text><path d="M100 90 L420 90" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net18-ka-a)"/></g><g data-step="2"><text x="260" y="136" font-size="13" text-anchor="middle" fill="currentColor">+1 s → probe #2</text><path d="M100 145 L420 145" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net18-ka-a)"/></g><g data-step="3"><text x="260" y="191" font-size="13" text-anchor="middle" fill="currentColor">+1 s → probe #3</text><path d="M100 200 L420 200" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net18-ka-a)"/></g><g data-step="4"><text x="260" y="246" font-size="13" text-anchor="middle" fill="currentColor">+1 s → hết ngân sách chờ</text><circle cx="100" cy="255" r="7" fill="#f59e0b"/><path d="M100 245 V265" stroke="currentColor" stroke-width="2"/></g><g data-step="1" data-until="3"><rect x="130" y="345" width="260" height="32" rx="6" fill="#f43f5e" fill-opacity="0.15" stroke="#f43f5e"/><text x="260" y="367" font-size="13" text-anchor="middle" fill="currentColor">Không ACK về client</text></g><g data-step="4"><rect x="130" y="345" width="260" height="32" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b"/><text x="260" y="367" font-size="13" text-anchor="middle" fill="currentColor">Client bỏ state TCP</text></g>
</svg>
<step-note data-step="1">Không có payload chờ ACK; chỉ sau ngưỡng idle kernel mới thử peer. Các port client có thể đổi ở lần chạy sau.</step-note>
<step-note data-step="2">Rule DROP trên chiều server trả về làm client không thấy ACK. Im lặng chưa phải bằng chứng peer đã chết.</step-note>
<step-note data-step="3">Nhiều probe tránh kết luận chỉ từ một ACK mất. Lab đặt <code>TCP_KEEPCNT=3</code>.</step-note>
<step-note data-step="4">Client báo ETIMEDOUT sau khoảng 5 s; đường đi lỗi và máy đích lỗi vẫn chưa phân biệt được bằng kết quả này.</step-note>
</step-flow>

Hình dùng mô hình `2 + 3 × 1 = 5 s` làm mốc giải thích, không cam kết kernel lập lịch đúng từng mili giây. Nó không đo handler: kernel server vẫn có thể ACK probe dù event loop ứng dụng bị treo. Nếu cần biết app còn xử lý, hãy dùng **heartbeat ứng dụng — một thông điệp có ý nghĩa ở giao thức và có deadline cho phản hồi**, chẳng hạn ping/pong của phiên ấy. Nếu heartbeat đi qua load balancer, phải biết phản hồi đến từ proxy hay dịch vụ đích.

**HTTP keep-alive là tái dùng kết nối cho nhiều request**, khác TCP keepalive kiểm liveness. Một cái giảm số lần mở/đóng; cái kia tạo probe cho socket idle. Không thể bật một header HTTP rồi giả định đã đặt `SO_KEEPALIVE`, và không thể bật `SO_KEEPALIVE` rồi mong thư viện HTTP tự tái dùng pool.

Cuối cùng, **`TCP_USER_TIMEOUT` trên Linux giới hạn thời gian dữ liệu đã truyền chưa được ACK hoặc dữ liệu bị giữ chưa truyền do zero window**. Nó không thay deadline end-to-end của request và không tự tạo lịch probe cho socket idle. Khi kết hợp keepalive, nó có ảnh hưởng đến lúc từ bỏ kết nối; nếu đưa nó vào cấu hình phải kiểm cả hai thay vì cộng hai giá trị độc lập. Lab này không đặt tuỳ chọn ấy.

> **Chưa đo.** Handler bị treo nhưng TCP vẫn ACK probe; tác động của `TCP_USER_TIMEOUT` kết hợp keepalive. Cơ sở cơ chế là TCP probe do kernel xử lý và [tcp(7), `TCP_USER_TIMEOUT`](https://man7.org/linux/man-pages/man7/tcp.7.html). Đo riêng bằng dừng handler trong process và capture probe, sau đó thử socket có dữ liệu chưa được ACK; không lấy lab DROP dưới đây làm kết quả cho hai ca đó.

## 4. Lab

### 4.1 Dựng một namespace có thể xoá sau phép thử

File chạy nằm trong `net-lab/net-18`: `run.sh`, `lab.py`; toàn bộ stdout quyết định ở `out/lab.txt`, segment ở `out/packets.txt`. Chạy từ thư mục đó:

```bash
./run.sh
```

Script tạo container `net18-lab` từ `alpine:3.20`, cài Python, `iproute2`, `iptables`, `tcpdump`, gắn thư mục hiện tại vào `/lab`, chạy capture trên loopback rồi dọn container khi kết thúc. Không sửa sysctl VM, không đụng container của bài khác. Rule DROP chỉ nằm trong container và chỉ khớp source port của phép thử. Cần Docker và quyền `NET_ADMIN`; không mang rule OUTPUT này sang host sản xuất.

Điều kiện thật được in trước mỗi phép thử:

```text
ENV Linux 6.8.0-64-generic aarch64 Linux
DEFAULTS net.ipv4.tcp_keepalive_time = 7200
net.ipv4.tcp_keepalive_intvl = 75
net.ipv4.tcp_keepalive_probes = 9
net.ipv4.tcp_fin_timeout = 60
```

Đây là cấu hình đọc được, không phải kết quả chứng minh mọi timer đều đã được dùng. Để kiểm một socket cụ thể còn phải xem code đặt sockopt và `ss -o` của nó.

### 4.2 Chạy bản sai: EOF phải làm cả hai chiều chết?

Trong `lab.py`, `pair(18180)` tạo listener, client rồi accepted socket; sau đó client gọi `shutdown(SHUT_WR)`. Chụp bằng:

```bash
ss -tanop 'sport = :18180 or dport = :18180'
```

Trích các dòng quyết định từ `out/lab.txt` (bỏ khoảng trắng căn cột):

```text
HALF_CLOSE client shutdown(SHUT_WR)
server recv= b''
FIN-WAIT-2 0 0 127.0.0.1:52496 127.0.0.1:18180 users:(("python3",pid=24,fd=4))
CLOSE-WAIT 0 0 127.0.0.1:18180 127.0.0.1:52496 users:(("python3",pid=24,fd=5))
client recv= b'reply-after-eof'
client EOF= b''
```

**Thấy gì:** EOF đã tới server, nhưng server vẫn gửi chuỗi cuối cho client. **Vì sao:** FIN chấm dứt chiều client gửi; server chưa close chiều của nó. Đây đồng thời là cách dựng CLOSE_WAIT có chủ đích để phân biệt với “mạng treo”. Khi app server đóng, trạng thái ấy kết thúc; sau đó mới chụp thấy TIME_WAIT ở client.

```text
AFTER_CLOSE
TIME-WAIT 0 0 127.0.0.1:52496 127.0.0.1:18180 timer:(timewait,59sec,0)
```

Cột process đã mất. `59sec` là timer còn lại lúc chụp sau một khoảng chạy code, không phải kết luận TIME_WAIT được cấu hình đúng 59 giây.

### 4.3 Tạo reset có chủ đích và đối chiếu lỗi client

Đoạn tạo RST trong script chỉ tác động socket accepted của port 18181:

```python
s.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER,
             struct.pack('ii', 1, 0))
s.close()
```

Đầu client đang `recv(1)` và log thật ghi:

```text
ABORTIVE_CLOSE ConnectionResetError 104
```

Trong `out/packets.txt`, tìm dòng có `18181` và `[R.]`; đối chiếu với các dòng `[F.]` ở port 18180. **Thấy gì:** cách đóng thay đổi tín hiệu ứng dụng từ EOF sang reset. **Vì sao:** đây là abortive close đã chủ ý yêu cầu, không phải client đọc chậm hơn nên hết deadline. Đừng dùng linger bằng 0 như cách “dọn TIME_WAIT” chung: bạn vừa thay đổi bảo đảm giao dữ liệu và cách peer nhận lỗi.

### 4.4 Chạy bản sai: ESTABLISHED chứng minh đường còn tốt?

Trước hết script tạo socket mới, không bật keepalive, không gửi payload sau handshake. Nó thêm rule:

```bash
iptables -I OUTPUT -p tcp --sport 18182 -j DROP
```

Như vậy chỉ chiều server → client của flow này bị vứt im lặng. Client đặt timeout đọc 3 s; output thật:

```text
BLACKHOLE keepalive= False elapsed_s= 3.003 error= TimeoutError errno= None
ESTAB 0 0 127.0.0.1:34552 127.0.0.1:18182 users:(("python3",pid=24,fd=4))
ESTAB 0 0 127.0.0.1:18182 127.0.0.1:34552 users:(("python3",pid=24,fd=5))
```

**Thấy gì:** lời gọi đọc hết hạn, cả hai kernel vẫn giữ ESTAB. **Vì sao:** app tự hết ngân sách chờ; không có segment báo đóng và không có dữ liệu outstanding buộc TCP đi vào nhánh thất bại retransmission. Sau snapshot, script xoá đúng rule rồi đóng cả hai socket. Nó không giữ một flow bẩn sang phép thử tiếp theo.

Ở port 18183, script lặp lại lỗi DROP, đặt keepalive trước khi chặn:

```python
c.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
c.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, 2)
c.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 1)
c.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPCNT, 3)
```

```text
BLACKHOLE keepalive= True elapsed_s= 5.088 error= TimeoutError errno= 110
State Recv-Q Send-Q Local Address:Port Peer Address:PortProcess
```

`ss` không còn entry của cặp này tại snapshot đó. Đọc `out/packets.txt` để đối chiếu probe theo thời gian: trên loopback rule OUTPUT làm các segment bị chặn có thể không hiện ở cùng điểm capture như segment đã qua rule; **số probe trên dây không được suy chỉ từ số dòng thấy được**. Log sockopt và lỗi đọc chứng minh phép thử timeout; muốn đếm đầy đủ mọi probe đã thử gửi có thể cần điểm bắt trước firewall hoặc trace kernel.

### 4.5 Phân biệt tích luỹ state với rò socket ứng dụng

Script tạo 100 phiên liên tiếp tới 18184; mỗi phiên client shutdown chiều gửi, server đọc EOF rồi close, client đọc EOF rồi close. Lệnh đếm chỉ lọc đúng port bài này:

```bash
ss -tanH state time-wait 'dport = :18184'
```

Log thật ghi `burst_timewait_count= 100`. Không có nghĩa “100 fd chưa đóng”: code đã close hai socket trong mỗi vòng, snapshot TIME_WAIT ở 4.2 cũng cho thấy entry không gắn app. Đồng thời script poll entry ban đầu tới 18180 mỗi giây để thấy nó tự mất khi hết timer; không dùng tổng TIME_WAIT cả namespace vì các phép thử khác cũng tạo entry.

> **Đo trên lab.** `out/lab.txt` giữ cả snapshot timer `59sec` ngay sau đóng, `51sec` sau các ca blackhole, và số đếm burst 100. Chạy lại có thể lệch thời gian do scheduling; không dùng timing loopback này để suy độ trễ Internet. Capture, stdout và code dựng lỗi được lưu cùng nhau để phân biệt điều đã chạy với giải thích từ RFC.

## 5. Tính tay

Các số ở mục này là **giả định để suy**, không phải benchmark. Mỗi lời giải nêu điều kiện để phép tính không bị áp dụng sai sang một hệ thống khác.

### 5.1 Ba mươi nghìn entry có thể là cân bằng bình thường

Giả sử một phía active close đều 500 kết nối/s, mỗi entry giữ 60 s, không đóng đồng thời và không tái dùng sớm. Từ trạng thái trống, sau 20 s có bao nhiêu? Sau 120 s thì sao?

**Giải:** trước khi entry đầu hết hạn, số chờ bằng số vào: `500 × 20 = 10.000`. Sau thời gian lớn hơn 60 s, mô hình cân bằng giữ các entry của cửa sổ 60 s gần nhất: `500 × 60 = 30.000`, không phải `500 × 120 = 60.000`. Mỗi giây có khoảng 500 vào và 500 hết hạn. Đây là state ở một phía; không nhân đôi thành fd và cũng không tự coi đây là số kết nối đồng thời đang phục vụ.

Nếu pool tái dùng được một kết nối cho trung bình 50 công việc trước đóng, với cùng 500 công việc/s thì tốc độ đóng giả định xuống `500 / 50 = 10/s`, số chờ mô hình còn `10 × 60 = 600`. Phép tính không hứa mọi pool đạt 50: đo reuse thực tế, lỗi stale connection và giới hạn upstream rồi mới dùng nó cho capacity.

### 5.2 Giới hạn port chỉ đúng sau khi khoanh phạm vi

Giả sử worker chỉ dùng một source IP, chỉ gọi một remote IP/port, có đúng 20.000 tuple nguồn khả dụng theo chính sách của bài toán, không reuse khi TIME_WAIT, giữ 60 s; bỏ qua thời gian ESTABLISHED để tính trần thuận lợi nhất. Có chịu được 400 kết nối mới/s bền vững không?

**Giải:** riêng state chờ đã cần `400 × 60 = 24.000`, vượt 20.000. Trần theo mô hình là `20.000 / 60 = 333,33 kết nối/s`; thời gian đang mở chỉ làm nhu cầu thêm. Một burst ngắn vẫn có thể chạy trước khi đầy; không lấy vài giây benchmark ban đầu làm bằng chứng bền vững. Nếu chuyển sang nhiều remote hoặc nhiều source IP, phải dựng lại mô hình tuple thay vì giữ nguyên trần này. Nếu thiếu nằm ở NAT, ngân sách của host không phải toàn bộ câu trả lời.

### 5.3 Ba đồng hồ cho ba câu hỏi

Giả sử socket idle dùng cấu hình lab `idle=2 s`, `interval=1 s`, `count=3`; request có deadline ứng dụng 4 s; đường mất ngay sau lần hoạt động cuối. Ước tính khi nào app nên ngừng chờ request, và TCP khi nào phát hiện theo mô hình keepalive?

**Giải:** app hết ngân sách ở giây 4 dù TCP chưa từ bỏ; mô hình keepalive cho `2 + 3 × 1 = 5 s`, lab thấy `5,088 s`. Nếu app đóng socket ở deadline thì phép đo keepalive đầy đủ không còn cùng điều kiện; lab cố ý đặt timeout đọc 8 s ở nhánh bật để kernel được báo lỗi trước. Một heartbeat với deadline riêng lại trả lời sức khoẻ ứng dụng; không có thông tin để tính nó từ các timer trên. Chênh `5,088 − 5 = 0,088 s` là sai khác giữa mô hình và phép đo cụ thể, không phải hằng số cộng cho mọi Linux.

## 6. Chuyển giao

1. Server API có TIME_WAIT chủ yếu ở local port 443, worker có TIME_WAIT chủ yếu ở remote port 443. Hãy đề xuất một capture ngắn để xác định bên đóng trước, rồi chọn phép đo tài nguyên cho từng máy.
2. `CLOSE_WAIT` tăng sau khi thêm nhánh cancel; tổng TIME_WAIT giảm. Bạn sẽ kiểm ba đường thoát nào trong app và dùng fd/process trong `ss` để bác bỏ chẩn đoán “mạng mất ACK” ra sao?
3. Một job gọi `send()` thành công, mất phản hồi, sau đó nhận reset. Bạn biết được điều gì về byte đã tới TCP peer và điều gì còn chưa biết về tác động trong DB? Thiết kế retry cần thêm thông tin gì?
4. Bật keepalive trên worker nhưng upstream là reverse proxy. TCP probe vẫn có ACK, request nghiệp vụ lại hết hạn. Hãy chỉ ra phép thử hiện chỉ đi tới đâu và cách kiểm đoạn proxy → backend.
5. Kết nối pool rớt ngay lần dùng đầu sau thời gian idle, còn tạo mới thì được. Lập giả thuyết về bên đóng, TTL mapping và lệch timeout; mỗi giả thuyết phải kèm một quan sát có thể bác bỏ nó.
6. **Câu khó nhất, không có đáp án trong bài.** Một hệ thống cần phát hiện mất peer trong 3 s, chịu được gián đoạn mạng 8 s mà không làm lặp thao tác ghi, và tuyệt đối không làm mất kết quả đã commit khi đổi worker. Hãy tách yêu cầu phát hiện, quyết định từ bỏ, retry và lưu kết quả; chỉ ra phần nào TCP có thể hỗ trợ và giao thức ứng dụng phải thêm state gì. Thiết kế một phép thử fault injection chứng minh cả ba yêu cầu thay vì chỉ đếm socket.

## 7. Tóm tắt

- FIN kết thúc một chiều; EOF ở server vẫn có thể đi cùng dữ liệu server gửi ngược lại, như ca `reply-after-eof` trong lab.
- CLOSE_WAIT còn chờ ứng dụng địa phương đóng; TIME_WAIT giữ state sau đóng để xử lý FIN lặp và tránh nhầm dữ liệu cũ.
- TIME_WAIT không phải một fd app chưa được close; phải kiểm lỗi connect, tuple, tốc độ active close và tài nguyên trước khi sửa.
- Linux `tcp_fin_timeout` điều khiển orphan FIN_WAIT_2 theo tài liệu kernel, không phải timer TIME_WAIT.
- RST là abort/reset và cần được TCP chấp nhận; lab linger bằng 0 tạo errno 104, khác EOF của FIN.
- ESTABLISHED là state cục bộ; lab DROP vẫn giữ nó sau timeout đọc 3,003 s khi keepalive tắt.
- TCP keepalive kiểm TCP peer; nhánh `2/1/3` của lab báo ETIMEDOUT sau 5,088 s. HTTP keep-alive, heartbeat và deadline là các cơ chế khác nhau.

→ **Bài 19 — UDP và QUIC**: khi đổi mạng làm tuple TCP không còn dùng được, QUIC tách định danh kết nối khỏi địa chỉ bằng cách nào, và vì sao việc đó vẫn cần kiểm đường mới?
