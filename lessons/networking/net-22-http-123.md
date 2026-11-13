# Bài 22 — HTTP/1.1 → 2 → 3: head-of-line ở tầng nào?

## 1. Mục tiêu

Sau bài này bạn có thể:

- Chỉ ra request đang chờ connection pool, thứ tự response HTTP, byte TCP hay dữ liệu của chính stream đó.
- Giải thích vì sao HTTP/2 multiplex được request mà một lỗ byte TCP vẫn ảnh hưởng nhiều stream.
- Phân biệt lợi ích độc lập stream của HTTP/3 với lời hứa “bật QUIC là trang tải xong sớm hơn”.
- Chạy cùng bộ tài nguyên qua ba phiên bản, kiểm tra giao thức thực tế và đối chiếu byte body trước khi so thời gian.
- Đọc median cùng khoảng min–max của một phép thử có mất gói mà không biến một lần chạy thành quy luật.
- Thiết kế phép đo tiếp theo để tách loss recovery, flow control, giới hạn stream và phụ thuộc ứng dụng.

## 2. Triệu chứng

Bạn có một trang cần tải một nhóm tài nguyên độc lập. Để bỏ DNS, cache và handshake khỏi phép so, chương trình lab mở kết nối, tải một tài nguyên làm nóng, rồi mới bấm giờ tải **12 body, mỗi body 32.768 byte**. Server trả cùng nội dung cho mọi đường dẫn; client kiểm tra từng body thay vì chỉ nhìn status.

Khi không cấu hình mất gói, median thời gian cả nhóm là **563,79 ms với HTTP/1.1**, **231,17 ms với HTTP/2**, **180,28 ms với HTTP/3**. Bạn đổi đúng biến loss từ **0% sang 1%** trên loopback có netem delay và chờ HTTP/3 bỏ xa HTTP/2. Kết quả lại là **580,28 ms**, **244,39 ms**, **493,50 ms** theo cùng thứ tự.

> **Đo trên lab.** Đây là số của `out/lab.txt` và `out/results.json` trong `net-lab/net-22`, Linux VM aarch64, Hypercorn 0.17.3, aioquic 1.3.0, httpx 0.28.1. Mỗi cấu hình có năm lần chạy; HTTP/1.1 dùng pool tối đa một connection và không pipeline, HTTP/2 và HTTP/3 multiplex trên một connection. `netem delay 20ms` gắn vào egress `lo`; hai chiều đều đi qua thiết bị này. `1%` là tham số xác suất rơi tại qdisc, không phải tỉ lệ request lỗi hay số gói thực tế bị rơi. Đo lại: chạy `./run.sh` trong thư mục lab.

Bản giải thích bạn định gửi là: “HTTP/3 không còn head-of-line nên số đo chắc sai.” Nó đủ hấp dẫn để bỏ qua một sự thật: loại được một nguyên nhân chờ không có nghĩa đã loại mọi nguyên nhân chờ. Bài này dùng chính kết quả trái dự đoán để xác định chỗ nào được giao thức bảo đảm, chỗ nào còn cần đo.

## ⏸ Dừng lại — đoán trước #1

HTTP/2 đã nhận được dữ liệu cho request B ở máy client, nhưng chương trình chưa đọc được phần dữ liệu ấy. Một đoạn TCP ở phía trước bị mất. Đâu là giải thích phù hợp nhất?

- (a) HTTP/2 bắt buộc trả response đúng thứ tự gửi request như HTTP/1.1.
- (b) Stream ID không giúp TCP bỏ qua khoảng trống trong dòng byte mà nó phải giao có thứ tự.
- (c) TCP biết từng stream HTTP/2 nhưng ưu tiên A hơn B.
- (d) Mọi request HTTP/2 dùng chung một response body.

## 3. Cơ chế

### 3.1 Hàng đợi nào đang đứng đầu?

**Head-of-line blocking, viết tắt HOL, là việc một phần tử phía sau phải chờ phần tử phía trước dù bản thân nó đã có thể tiến triển.** Khi debug cần ghi thêm tên hàng đợi. “Có HOL” chưa nói được nên đổi HTTP, tăng connection hay sửa dependency của trang.

Ở HTTP/1.1, **persistent connection là connection có thể phục vụ nhiều lần trao đổi request/response**, thay vì mở TCP mới cho từng request. Nó tiết kiệm thiết lập nhưng không tạo multiplexing. **Pipelining là gửi request kế tiếp trước khi nhận xong response trước**; server có thể xử lý các request an toàn song song, nhưng response trên cùng connection vẫn phải theo thứ tự request. Nếu response A chưa xong, không thể chèn body B xen vào giữa rồi mong client tự nhận ra.

Nguyên nhân gốc là cách ghép request với response. HTTP/1.1 không gắn mỗi response vào một stream ID riêng; client dựa vào thứ tự và ranh giới thông điệp. Đây khác với “TCP chậm”: ngay cả khi TCP giao mọi byte tức thì, response B đã tính xong vẫn phải đợi response A theo quy tắc HTTP. RFC 9112 §9.2 và §9.3.2 mô tả hai mặt của cùng ràng buộc ấy.

Client không pipeline còn gặp hàng đợi sớm hơn: nó chỉ gửi request B khi connection rảnh. Trong lab, bạn tạo đồng thời các coroutine, nhưng httpx phải xếp chúng ở pool một connection cho nhánh HTTP/1.1. **Coroutine chạy đồng thời không chứng minh request đã đồng thời lên dây.** Kết quả HTTP/1.1 ở bài này thể hiện chính sách client đó, không phải thử nghiệm pipelining.

> **Nguồn.** RFC 9112 §9.3.2 yêu cầu thứ tự response: *“it MUST send the corresponding responses in the same order that the requests were received.”* ([RFC 9112](https://www.rfc-editor.org/rfc/rfc9112#section-9.3.2)). Bản tải đối chiếu: `src/rfc9112.txt`. Quy định này áp dụng cho pipeline; nhánh HTTP/1.1 của lab không dùng pipeline.

Mở thêm connection cho HTTP/1.1 chia các request sang các hàng độc lập. Khi A giữ connection thứ nhất, B có thể đi qua connection khác. Cái giá là thêm state, thiết lập và các bộ điều khiển tắc nghẽn riêng. Số connection tối đa không phải hằng số do phiên bản HTTP bắt buộc: RFC 9112 §9.4 không ấn định một trần cụ thể. Vì thế đừng đọc một mặc định của trình duyệt hay thư viện thành giới hạn giao thức.

Điểm cần giữ khi xem waterfall: một khoảng chờ trước khi gửi request có thể đến từ pool; khoảng chờ sau khi request đã tới server có thể là handler, scheduler hoặc đường về. Thay version không tự gỡ hàng đợi database trong handler. Muốn phân biệt, ghi mốc chờ slot, gửi request, server nhận, server bắt đầu trả và client nhận xong bằng instrumentation phù hợp.

### 3.2 HTTP/2 thay cách chia thông điệp, không thay hợp đồng TCP

Đáp án #1 là **(b)**. **Stream là một luồng trao đổi có định danh trong connection; frame là đơn vị định dạng mang dữ liệu hoặc điều khiển của HTTP/2.** HTTP/2 chia thông điệp thành frame có stream ID, nên receiver biết frame nào thuộc response nào. **Multiplexing là xen các đơn vị của nhiều stream trên cùng connection**, nhờ đó response B không phải đợi body A kết thúc chỉ vì A được hỏi trước.

Ví dụ A là tài nguyên lớn, B là tài nguyên nhỏ đã sẵn sàng. Scheduler có thể gửi một phần DATA của A, gửi HEADERS/DATA của B, rồi tiếp tục A. Thứ tự hoàn thành không còn buộc theo thứ tự request. Đây là lợi ích do framing và định danh, không phải do đổi header thành binary tự nhiên làm đường truyền có thêm bandwidth.

Nhưng tất cả frame ấy được TLS đóng record rồi đưa vào cùng dòng byte TCP. **TCP giao cho tầng trên một tiền tố byte liên tục**: byte tới sau một khoảng trống có thể đã nằm trong buffer kernel mà chưa được trả ra qua lần đọc tương ứng. TCP không phân tích HTTP/2 stream ID để bỏ qua lỗ thuộc A và giao riêng frame B. Bài [TCP từ bên trong](net-16-tcp-ben-trong.md) đã đi sâu sequence, ACK và retransmission; ở đây chỉ cần hệ quả lên request.

Cẩn thận với câu “một packet mất, mọi request đứng”. Packet không đồng nghĩa frame hay request. Một frame có thể trải qua nhiều TCP segment; một segment có thể chứa phần byte của nhiều frame sau khi qua TLS. Những byte đã được giao trước lỗ vẫn dùng được; handler server cũng không tự dừng CPU. Điều bị giữ lại là dữ liệu tầng trên cần đi qua chỗ gián đoạn đó. Khi nói HOL TCP, ta mô tả khả năng giao byte có thứ tự, không khẳng định mọi công việc trong hệ thống ngừng cùng thời điểm.

<ab-toggle data-labels="HTTP/2 trên TCP|HTTP/3 trên QUIC">
<svg viewBox="0 0 520 580" role="img" aria-labelledby="net22-hol-tcp-t net22-hol-tcp-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net22-hol-tcp-t">HTTP/2: A, B, C chờ lỗ TCP</title>
<desc id="net22-hol-tcp-d">Cùng sáu packet mang A1 C1 B1 A2 B2 C2, P3 mất. TCP giữ mọi byte sau lỗ, dù A2 B2 C2 đã tới kernel.</desc>
<defs><marker id="net22-hol-tcp-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
<text x="16" y="28" font-size="16" fill="currentColor">HTTP/2: A, B, C chờ lỗ TCP</text><text x="16" y="53" font-size="13" fill="currentColor">A = /asset/0 · B = /asset/1 · C = /asset/2</text><text x="16" y="83" font-size="13" fill="currentColor">Thứ tự gửi: mỗi packet mang một phần dữ liệu</text><text x="23" y="110" font-size="13" fill="currentColor">P1</text><rect x="16" y="121" width="72" height="34" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="25" y="143.0" font-size="14" fill="currentColor">A1</text><text x="106" y="110" font-size="13" fill="currentColor">P2</text><rect x="99" y="121" width="72" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor"/><text x="108" y="143.0" font-size="14" fill="currentColor">C1</text><text x="189" y="110" font-size="13" fill="currentColor">P3</text><rect x="182" y="121" width="72" height="34" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-dasharray="4 3"/><text x="191" y="143.0" font-size="14" fill="currentColor">B1</text><text x="199" y="179" font-size="13" fill="currentColor">mất</text><text x="272" y="110" font-size="13" fill="currentColor">P4</text><rect x="265" y="121" width="72" height="34" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="274" y="143.0" font-size="14" fill="currentColor">A2</text><text x="355" y="110" font-size="13" fill="currentColor">P5</text><rect x="348" y="121" width="72" height="34" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="357" y="143.0" font-size="14" fill="currentColor">B2</text><text x="438" y="110" font-size="13" fill="currentColor">P6</text><rect x="431" y="121" width="72" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor"/><text x="440" y="143.0" font-size="14" fill="currentColor">C2</text><text x="16" y="212" font-size="14" fill="currentColor">Sau khi P4–P6 đã tới; chưa hồi phục P3</text><rect x="175" y="232" width="136" height="234" rx="8" fill="none" stroke="currentColor" stroke-dasharray="5 4"/><text x="185" y="255" font-size="13" fill="currentColor">buffer TCP</text><text x="16" y="300" font-size="16" fill="currentColor">A</text><rect x="62" y="280" width="100" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="71" y="301.0" font-size="14" fill="currentColor">A1 đã giao</text><rect x="185" y="280" width="116" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="194" y="301.0" font-size="14" fill="currentColor">A2 tới kernel</text><path d="M314 287 V307" stroke="currentColor" stroke-width="3"/><text x="332" y="301" font-size="13" fill="currentColor">decoder chờ lỗ</text><text x="16" y="364" font-size="16" fill="currentColor">B</text><rect x="62" y="344" width="100" height="32" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-dasharray="4 3"/><text x="71" y="365.0" font-size="14" fill="currentColor">B1 thiếu</text><rect x="185" y="344" width="116" height="32" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="194" y="365.0" font-size="14" fill="currentColor">B2 tới kernel</text><path d="M314 351 V371" stroke="currentColor" stroke-width="3"/><text x="332" y="365" font-size="13" fill="currentColor">decoder chờ lỗ</text><text x="16" y="428" font-size="16" fill="currentColor">C</text><rect x="62" y="408" width="100" height="32" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor"/><text x="71" y="429.0" font-size="14" fill="currentColor">C1 đã giao</text><rect x="185" y="408" width="116" height="32" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor"/><text x="194" y="429.0" font-size="14" fill="currentColor">C2 tới kernel</text><path d="M314 415 V435" stroke="currentColor" stroke-width="3"/><text x="332" y="429" font-size="13" fill="currentColor">decoder chờ lỗ</text><text x="16" y="503" font-size="14" fill="currentColor">Hồi phục: truyền lại dữ liệu B1 của P3</text><text x="16" y="528" font-size="13" fill="currentColor">→ TCP giao tiếp; decoder nhận A2, B1/B2, C2.</text><text x="16" y="558" font-size="13" fill="currentColor">Mô hình cơ chế; không phải packet trace của lab.</text>
</svg>
<svg viewBox="0 0 520 580" role="img" aria-labelledby="net22-hol-quic-t net22-hol-quic-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net22-hol-quic-t">HTTP/3: A, C tiến; B chờ lỗ</title>
<desc id="net22-hol-quic-d">Cùng sáu packet mang A1 C1 B1 A2 B2 C2, P3 mất. QUIC giao A và C; chỉ B đợi B1.</desc>
<defs><marker id="net22-hol-quic-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
<text x="16" y="28" font-size="16" fill="currentColor">HTTP/3: A, C tiến; B chờ lỗ</text><text x="16" y="53" font-size="13" fill="currentColor">A = /asset/0 · B = /asset/1 · C = /asset/2</text><text x="16" y="83" font-size="13" fill="currentColor">Thứ tự gửi: mỗi packet mang một phần dữ liệu</text><text x="23" y="110" font-size="13" fill="currentColor">P1</text><rect x="16" y="121" width="72" height="34" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="25" y="143.0" font-size="14" fill="currentColor">A1</text><text x="106" y="110" font-size="13" fill="currentColor">P2</text><rect x="99" y="121" width="72" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor"/><text x="108" y="143.0" font-size="14" fill="currentColor">C1</text><text x="189" y="110" font-size="13" fill="currentColor">P3</text><rect x="182" y="121" width="72" height="34" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-dasharray="4 3"/><text x="191" y="143.0" font-size="14" fill="currentColor">B1</text><text x="199" y="179" font-size="13" fill="currentColor">mất</text><text x="272" y="110" font-size="13" fill="currentColor">P4</text><rect x="265" y="121" width="72" height="34" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="274" y="143.0" font-size="14" fill="currentColor">A2</text><text x="355" y="110" font-size="13" fill="currentColor">P5</text><rect x="348" y="121" width="72" height="34" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="357" y="143.0" font-size="14" fill="currentColor">B2</text><text x="438" y="110" font-size="13" fill="currentColor">P6</text><rect x="431" y="121" width="72" height="34" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor"/><text x="440" y="143.0" font-size="14" fill="currentColor">C2</text><text x="16" y="212" font-size="14" fill="currentColor">Sau khi P4–P6 đã tới; chưa hồi phục P3</text><text x="16" y="300" font-size="16" fill="currentColor">A</text><rect x="60" y="280" width="90" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="69" y="301.0" font-size="14" fill="currentColor">A1</text><rect x="170" y="280" width="90" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="179" y="301.0" font-size="14" fill="currentColor">A2</text><path d="M275 296 H325" fill="none" stroke="currentColor" marker-end="url(#net22-hol-quic-a)"/><rect x="340" y="280" width="160" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="349" y="301.0" font-size="14" fill="currentColor">app nhận A1+A2</text><text x="60" y="336" font-size="13" fill="currentColor">Thứ tự riêng trong stream A</text><text x="16" y="364" font-size="16" fill="currentColor">B</text><rect x="60" y="344" width="90" height="32" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-dasharray="4 3"/><text x="69" y="365.0" font-size="14" fill="currentColor">B1 thiếu</text><rect x="170" y="344" width="140" height="32" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="179" y="365.0" font-size="14" fill="currentColor">B2 đợi B1</text><text x="60" y="400" font-size="13" fill="currentColor">B chưa giao được byte</text><text x="16" y="428" font-size="16" fill="currentColor">C</text><rect x="60" y="408" width="90" height="32" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor"/><text x="69" y="429.0" font-size="14" fill="currentColor">C1</text><rect x="170" y="408" width="90" height="32" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor"/><text x="179" y="429.0" font-size="14" fill="currentColor">C2</text><path d="M275 424 H325" fill="none" stroke="currentColor" marker-end="url(#net22-hol-quic-a)"/><rect x="340" y="408" width="160" height="32" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor"/><text x="349" y="429.0" font-size="14" fill="currentColor">app nhận C1+C2</text><text x="60" y="464" font-size="13" fill="currentColor">Thứ tự riêng trong stream C</text><text x="16" y="503" font-size="14" fill="currentColor">Hồi phục: truyền lại dữ liệu B1 của P3</text><text x="16" y="528" font-size="13" fill="currentColor">→ B mở lại; A, C đã đi tiếp.</text><text x="16" y="558" font-size="13" fill="currentColor">Mô hình cơ chế; không phải packet trace của lab.</text>
</svg>
<ab-note>P3 mang B1 bị mất: TCP giữ các byte sau lỗ trong buffer chung. A1 và C1 đã giao vẫn dùng được, nhưng cả A2, B2 và C2 đều chưa tới decoder.</ab-note>
<ab-note>Cùng vị trí mất dữ liệu B1: QUIC giao A1/A2 và C1/C2 cho ứng dụng; B2 vẫn đợi B1 trong stream B. Hồi phục B1 không yêu cầu A và C chờ theo.</ab-note>
</ab-toggle>

Hình dùng ba đường dẫn đầu của bộ `/asset/0`…`/asset/11`: A, B, C đều có hai phần dữ liệu; packet 3 chỉ mang B1 và bị mất. Đây là **mô hình cơ chế, không phải trace lab**: giả định header đã giải mã, mỗi phần nằm gọn trong một packet, các packet sau đã tới và không có phụ thuộc khác. Phía HTTP/2, coi các frame DATA được đóng thành các phần TLS/TCP tương ứng; đây không phải quy tắc một frame luôn bằng một packet. Phía HTTP/3, dữ liệu mỗi response đi trên QUIC stream riêng; khi hồi phục, QUIC gửi lại thông tin B1 trong packet mới, không tái dùng packet number cũ. Các nhãn P1–P6 chỉ thứ tự gửi trong mô hình. A1 và C1 trước lỗ vẫn dùng được ở cả hai tab; khác biệt là A2/C2 đã tới có được giao tiếp ngay hay không. Lab không xác định packet nào đã rơi, nên hình không giải thích thay nguyên nhân của biểu đồ median.

RFC 9113 §5 mô tả stream và multiplexing; RFC 9114 §1.1 giải thích vì sao loss recovery TCP không nhìn thấy tính song song của HTTP/2. Nếu HTTP/2 vẫn cải thiện đáng kể trên mạng không loss, kết quả không mâu thuẫn HOL TCP: nó đã bỏ đợi thứ tự response ở HTTP và giảm số connection cần dùng. Lợi ích nằm ở một chỗ; giới hạn còn lại nằm ở chỗ khác.

### 3.3 HTTP/3 chuyển ranh giới giao có thứ tự xuống từng stream

**HTTP/3 là cách ánh xạ ngữ nghĩa HTTP lên QUIC**, trong đó một request/response thông thường dùng một QUIC stream hai chiều do client khởi tạo. Bài [UDP và QUIC](net-19-udp-quic.md) đã giải thích packet number, stream offset và migration; ở đây không dựng lại QUIC từ đầu.

Thay đổi liên quan HOL là QUIC ráp byte riêng theo offset của từng stream. Thiếu byte của A thì A phải chờ; dữ liệu liên tục của B không bị chặn chỉ vì A có lỗ. Điều kiện cần đọc hết câu: B phải thực sự có đủ dữ liệu cần dùng và không vướng dependency khác. Datagram UDP chỉ là vật chở; việc retransmit, giữ thứ tự và kiểm soát tắc nghẽn do QUIC làm. Không thể thay QUIC bằng UDP thô rồi vẫn hứa HTTP tin cậy.

Một QUIC packet có thể chở thông tin của nhiều stream. Nếu packet ấy mất, nhiều stream cùng mất dữ liệu và cùng phải hồi phục. Điều QUIC bỏ là **ràng buộc giao byte chéo stream của TCP**; nó không hứa mỗi lần loss chỉ chạm đúng một request. Khi packet chỉ mang A mà B đã tới đủ, B có cơ hội tiếp tục. Khi chính B thiếu byte, B vẫn đợi.

Bên cạnh sự độc lập về thứ tự, các stream vẫn chia sẻ đường truyền và congestion controller của connection. Loss có thể làm ngân sách gửi của cả connection giảm hoặc tạo thời gian chờ phản hồi; B không bị giữ vì offset A nhưng byte B chưa được phát ra vẫn có thể chậm. Đây là nguyên nhân gốc để phân biệt **đã nhận nhưng chưa giao** với **chưa có ngân sách gửi**. Hai hiện tượng có waterfall giống nhau ở ứng dụng nhưng cần instrumentation khác nhau.

> **Nguồn.** RFC 9114 §1.2 đặt hai phạm vi cạnh nhau: *“reliability at the stream level and congestion control across the entire connection”* ([RFC 9114](https://www.rfc-editor.org/rfc/rfc9114#section-1.2)). Không suy từ độc lập stream thành độc lập bandwidth. Bản tải nằm ở `src/rfc9114.txt`.

Đây cũng là chỗ cần giới hạn lời khuyên “dùng nhiều connection để né HOL”. Với HTTP/1.1, thêm connection có thể gỡ chờ pool và thứ tự response. Với HTTP/2, chia connection có thể tách các dòng byte TCP nhưng đồng thời thay congestion budget và chi phí thiết lập. Với HTTP/3, nhiều stream đã tách thứ tự transport; thêm connection còn thay bộ điều khiển tắc nghẽn và lịch gửi. Nếu thay cả version lẫn số connection trong một phép thử, bạn chưa biết biến nào tạo ra chênh lệch.

## ⏸ Dừng lại — đoán trước #2

Hai response HTTP/3 nằm trên hai stream. Body B đã tới, nhưng decoder chưa giải được header B vì nó tham chiếu một entry nén chưa nhận. Có mâu thuẫn với “QUIC bỏ HOL chéo stream” không?

- (a) Có; HTTP/3 bắt buộc giao mọi header không cần state.
- (b) Không; phụ thuộc giải nén ở tầng HTTP khác với thứ tự byte ở transport.
- (c) Không; vì HTTP/3 thực ra vẫn dùng TCP cho header.
- (d) Có; QUIC phải gửi lại toàn bộ connection khi mất một entry.

### 3.4 Nén header có dependency của riêng nó

Đáp án #2 là **(b)**. **QPACK là cơ chế nén field section của HTTP/3 bằng bảng tĩnh và bảng động cùng các luồng chỉ dẫn cập nhật bảng.** Nó giải bài toán lặp header mà vẫn cho phép decoder kiểm soát số stream có thể bị chặn do tham chiếu bảng động. **Field section là một nhóm trường HTTP, chẳng hạn các trường của header hoặc trailer.**

Nếu encoder tham chiếu entry mà decoder chưa nhận, decoder cần đợi chỉ dẫn tương ứng. QUIC vẫn có thể giao byte của stream B đúng hợp đồng; việc giải nghĩa những byte ấy đòi state ở tầng trên. RFC 9204 §2.1.2 gọi đây là blocked stream và mô tả giới hạn `SETTINGS_QPACK_BLOCKED_STREAMS`. Giá trị này không phải số stream request tối đa của connection.

**HPACK là cơ chế nén header của HTTP/2**, được thiết kế với thứ tự giao của connection TCP bên dưới. Chuyển nguyên mô hình phụ thuộc đó sang các stream QUIC độc lập sẽ kéo chờ chéo stream lên lại tầng HTTP. QPACK tách chỉ dẫn bảng và cung cấp cách kiểm soát dependency; nó không tuyên bố header động tuyệt đối không thể block. Bởi vậy khi chẩn đoán HTTP/3 “body tới rồi mà response chưa dùng được”, kiểm cả trạng thái decoder chứ không chỉ đếm packet tới.

Trường hợp này **chưa được gài trong lab**. Server dùng header ít biến đổi; không có log decoder chứng minh QPACK gây ra con số 493,50 ms. Không được dùng một khả năng có thật của giao thức để điền vào chỗ trống nguyên nhân. Muốn kiểm, cần instrumentation field section bị block, chỉ dẫn encoder, giới hạn đã thương lượng và timestamp mở block; rồi đối chiếu với thời gian response tương ứng.

Ngoài nén header còn có **flow control — cơ chế receiver cấp quyền gửi để tránh bị tràn buffer**. Nó khác congestion control vốn bảo vệ đường mạng. HTTP/2 có flow control của stream và connection cho DATA; QUIC cũng có giới hạn dữ liệu theo stream và connection. Khi ứng dụng không đọc hoặc không tăng credit, sender có thể đứng dù packet không mất. Nếu connection credit bị giữ bởi dữ liệu chưa tiêu thụ, nhiều stream có thể cùng thiếu quyền gửi; đó không phải TCP HOL quay lại qua UDP.

Cuối cùng là dependency do chính trang đặt ra. Nếu parser chưa biết URL của B trước khi tải và chạy A, không giao thức nào gửi B từ quá khứ. Lab cố ý biết trước toàn bộ URL và không parse HTML hoặc thực thi JavaScript. Vì vậy gọi kết quả là **thời gian tải nhóm tài nguyên của một trang tổng hợp**, không gọi là thời gian trang tương tác được. Khi áp dụng cho trang thật phải kiểm critical path: phần nào cần thiết để người dùng thấy nội dung, phần nào chỉ là download nền.

<svg viewBox="0 0 520 320" role="img" aria-labelledby="net22-deps-t net22-deps-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net22-deps-t">Đồ thị phụ thuộc của response HTTP/3</title>
<desc id="net22-deps-d">URL cho phép gửi; credit cho phép phát byte. Byte stream và state giải nén đều cần cho response.</desc>
<defs><marker id="net22-deps-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
<text x="15" y="25" fill="currentColor" font-size="14">Cùng một response, nhiều ranh giới chờ</text><rect x="15" y="65" width="155" height="35" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="24" y="88" fill="currentColor" font-size="14">URL /asset/1</text><rect x="310" y="65" width="185" height="35" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="319" y="88" fill="currentColor" font-size="14">credit / scheduler</text><rect x="15" y="160" width="155" height="35" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="24" y="183" fill="currentColor" font-size="14">QPACK entry</text><rect x="310" y="160" width="185" height="35" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="319" y="183" fill="currentColor" font-size="14">byte của stream</text><rect x="165" y="260" width="190" height="35" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="174" y="283" fill="currentColor" font-size="14">response dùng được</text><path d="M170 82 L305 82" fill="none" stroke="currentColor" marker-end="url(#net22-deps-a)"/><path d="M402 100 L402 155" fill="none" stroke="currentColor" marker-end="url(#net22-deps-a)"/><path d="M92 195 L210 255" fill="none" stroke="currentColor" marker-end="url(#net22-deps-a)"/><path d="M402 195 L310 255" fill="none" stroke="currentColor" marker-end="url(#net22-deps-a)"/><text x="180" y="145" fill="currentColor" font-size="14">hai phụ thuộc</text><text x="175" y="167" fill="currentColor" font-size="13">cùng phải thoả</text>
</svg>

Hình này là bản đồ các phụ thuộc để đặt probe, không phải thứ tự lỗi bắt buộc xảy ra. Xác định được tầng đang chờ mới chọn được phép can thiệp ít biến nhất.

### 3.5 Đo “cùng trang” phải cố định những gì?

Điểm xuất phát là cùng công việc: cùng danh sách URL, thứ tự phát, kích thước, trạng thái nén, cache và nội dung response. Client phải kiểm body; nhận một trang lỗi nhỏ hơn vẫn có thể cho thời gian trông tốt. Lab kiểm đúng chuỗi byte và tổng **393.216 byte** cho mỗi nhóm. Tổng này chỉ đếm body, không gồm HTTP header, TLS, QUIC hay IP overhead.

Tiếp đến là cùng điều kiện thiết lập. Một kết nối mới phải trả chi phí DNS/transport/TLS; một kết nối đã nóng có state congestion, TLS và bảng header khác. Ở bài này cả ba nhánh đều warm trước khi bấm giờ, nhưng một warm request không làm state bên trong các stack giống hệt nhau. Kết quả trả lời câu hỏi cụ thể: sau cách warm ấy, các implementation đã chọn hoàn thành nhóm như thế nào? Nó không trả lời “giao thức nào có handshake ít RTT hơn”; bài sau đo và suy riêng phần đó.

Rồi kiểm giao thức thực tế. **ALPN là extension TLS thương lượng giao thức ứng dụng**, sẽ học kỹ ở bài 23. Client có hỗ trợ HTTP/2 không đồng nghĩa connection lần này là HTTP/2. `httpx` trả `HTTP/2` ở response; nhánh aioquic dùng `H3Connection` để gửi request và giải response HTTP/3. Chỉ mở UDP hoặc QUIC echo chưa đủ gọi đó là HTTP/3. Nếu công cụ có fallback, cần ghi version của connection đã thắng, không ghi cờ mong muốn của người chạy.

Cấu hình mạng cũng cần đọc đúng. `netem delay 20ms` trên `lo` là trễ egress mỗi chiều trong mô hình này; không phải đo RTT Internet là 20 ms. ACK, handshake và request đều đi qua qdisc. Loopback có packetization, offload và MTU khác đường WAN; xác suất rơi tính trên đơn vị đi qua qdisc nên không được quy đổi thẳng thành “mỗi nhóm tài nguyên mất từng này phần trăm byte”. Đặc biệt một body lớn có thể được chia khác nhau giữa stack kernel TCP và QUIC userspace.

**Netem là qdisc của Linux để giả lập các đặc tính như delay/loss của hàng đợi truyền**, không phải máy phát cùng một dấu vết packet loss cho mọi giao thức. Cùng `loss 1%` không có nghĩa rơi đúng packet tương ứng của từng run. Thay số lần chạy, seed hoặc cách đóng gói có thể thay kết quả. Lab lưu seed mà `tc qdisc show` in ra; đây là thông tin phục vụ tái kiểm, không phải bằng chứng các nhánh đã nhận cùng một lịch mất gói.

Sau khi giữ điều kiện, chọn đại lượng. Thời gian cả nhóm là từ lúc tạo lượt tải đo tới khi nhận xong toàn bộ body. Nó bị quyết định bởi phần hoàn thành cuối, khác latency của request nhỏ quan trọng cho render. Nếu muốn chứng minh B không bị lỗ A chặn, cần mốc riêng của B và trace loss/stream; tổng thời gian nhóm không tự cung cấp bằng chứng đó.

> **Suy luận.** Loss 1% làm median HTTP/3 của lần chạy này lớn hơn HTTP/2, nhưng chưa thể quy nguyên nhân cho QPACK, congestion controller hay loss timer. Ta chỉ đo đầu-cuối với các stack khác nhau và không capture loss theo stream. Kiểm bằng qlog ở hai QUIC endpoint, trace TCP tương ứng và timestamp từng response; giữ nguyên workload, thay đúng một cơ chế cần thử. Không dùng suy luận này để khuyến nghị tắt HTTP/3 trên mọi mạng.

## 4. Lab

### 4.1 Dựng bộ tài nguyên có thể kiểm lại từng byte

Lab nằm ở `net-lab/net-22/`, gồm `run.sh`, `lab.py`, `out/` và `src/`. Chạy từ thư mục ấy:

```bash
./run.sh
```

Script dựng duy nhất container `net22-lab`, có quyền `NET_ADMIN` để đặt qdisc bên trong network namespace của nó. Không publish port ra host hay Internet. Server Hypercorn nghe **127.0.0.1:22443** cho cả TCP/TLS và QUIC; client cũng chạy trong container. Khi script thoát, trap dọn container và key/certificate tạm.

Image nền là `alpine:3.20`; dependency được pin ở script để người đọc biết đang so implementation nào. Certificate tự ký có SAN `localhost`; client nạp chính certificate ấy làm trust anchor và xác minh hostname. Không dùng `verify=False` để làm số đo xanh. Đây là trust riêng cho lab, không sửa trust store máy người dùng.

Server ASGI trả cùng body `b'x' * 32768` và Content-Length. **ASGI là giao diện sự kiện giữa Python web server bất đồng bộ và ứng dụng**, nên cùng app có thể được Hypercorn phục vụ qua các transport đã cấu hình. App không truy vấn database và không cố tình sleep. Việc này giảm khác biệt ở handler, nhưng không biến các implementation HTTP thành cùng một đoạn code.

Đầu log xác nhận môi trường:

```text
ENV Linux 6.8.0-64-generic aarch64 hypercorn=0.17.3 aioquic=1.3.0 httpx=0.28.1
```

**Thấy gì:** kernel/kiến trúc và phiên bản thư viện được lưu cùng kết quả. **Vì sao:** “máy tôi HTTP/3 chậm hơn” không tái kiểm được nếu thiếu stack và điều kiện. Log cài đặt nằm riêng ở `out/setup.txt` và `out/pip.txt`, không trộn thông báo tải package vào số đo.

### 4.2 Cho bản sai “gọi gather là lên dây đồng thời” chạy trước

Mã quyết định ở nhánh HTTP/1.1 và HTTP/2 có cùng cách gọi nhóm:

```python
limits = httpx.Limits(max_connections=1)
# Client đã tải /warm trước mốc start.
start = time.perf_counter()
rs = await asyncio.gather(*(
    client.get('https://localhost:22443/asset/' + str(i))
    for i in range(12)
))
```

Đây là đoạn rút gọn từ `lab.py`; client HTTP/2 bật `http2=True`, nhánh HTTP/1.1 không bật. **Thấy gì:** cùng đồng thời ở scheduler Python, nhưng nhánh HTTP/1.1 vẫn chỉ có một connection và không pipeline. **Vì sao:** pool không thể cho mọi coroutine tuỳ ý ghi request vào một stream HTTP/1.1 đang bận; HTTP/2 lại có stream ID để quản lý nhiều trao đổi.

Ở HTTP/3, `H3Connection.send_headers()` tạo request trên stream riêng; callback nhận `HeadersReceived`/`DataReceived`, chỉ hoàn thành future khi stream kết thúc. Client kiểm byte body sau khi toàn nhóm xong. Đây là HTTP thật trên QUIC, không phải UDP echo hay gửi cùng một blob rồi gắn nhãn `h3`.

Lab không mô phỏng giới hạn connection mặc định của browser. Nếu đổi `max_connections`, cần lưu đó là biến khác trong kết quả. Bản sai bị bác ở đây là cách suy “gather đảm bảo multiplex”, không phải tuyên bố HTTP/1.1 không thể tải tài nguyên song song qua các connection khác nhau.

### 4.3 Lấy đối chứng trước khi gài loss

Trước vòng đo, script chạy lệnh thật bên trong container:

```bash
tc qdisc replace dev lo root netem delay 20ms loss 0%
tc qdisc show dev lo
```

Các dòng quyết định trong `out/lab.txt`:

```text
QDISC qdisc netem 8010: root refcnt 2 limit 1000 delay 20ms seed 14800048022372868869
RUN loss=0% rep=1 protocol=h1 actual=HTTP/1.1 body=393216 ms=572.98
RUN loss=0% rep=1 protocol=h2 actual=HTTP/2 body=393216 ms=231.17
RUN loss=0% rep=1 protocol=h3 actual=h3 body=393216 ms=183.59
SUMMARY loss=0% h1 median_ms=563.79 min_ms=555.88 max_ms=589.58
SUMMARY loss=0% h2 median_ms=231.17 min_ms=105.70 max_ms=251.00
SUMMARY loss=0% h3 median_ms=180.28 min_ms=175.04 max_ms=185.45
```

Output giữ dấu chấm của chương trình; phần diễn giải dùng dấu phẩy thập phân. **Thấy gì:** cả ba nhánh hoàn thành cùng số byte body; version TCP thực tế đúng mong muốn. **Vì sao:** trước khi đánh giá latency, cần loại lỗi cơ bản “một nhánh fallback hoặc tải thiếu dữ liệu”. Phần này chưa chứng minh mọi byte header và wire overhead bằng nhau, vì chúng vốn khác theo giao thức.

HTTP/2 có khoảng biến động đáng kể ngay cả khi không cấu hình loss; đó là một lý do giữ min–max và dữ liệu từng run. Không xoá run ngắn vì nó không hợp câu chuyện. Không gọi thời gian này là throughput tối đa của đường truyền: không giới hạn rate, không đo đường WAN và workload có nhiều lần request/response.

### 4.4 Đổi loss, giữ kết quả trái dự đoán

Lệnh tiếp theo đổi qdisc; phần ứng dụng và body không đổi:

```bash
tc qdisc replace dev lo root netem delay 20ms loss 1%
```

Trích log:

```text
QDISC qdisc netem 8010: root refcnt 2 limit 1000 delay 20ms loss 1% seed 17440156481634819857
RUN loss=1% rep=1 protocol=h2 actual=HTTP/2 body=393216 ms=244.39
RUN loss=1% rep=1 protocol=h3 actual=h3 body=393216 ms=628.24
RUN loss=1% rep=4 protocol=h3 actual=h3 body=393216 ms=1065.56
SUMMARY loss=1% h1 median_ms=580.28 min_ms=560.42 max_ms=820.19
SUMMARY loss=1% h2 median_ms=244.39 min_ms=177.89 max_ms=357.71
SUMMARY loss=1% h3 median_ms=493.50 min_ms=218.41 max_ms=1065.56
```

**Thấy gì:** HTTP/3 hoàn thành đủ body nhưng có run kéo dài hơn các run còn lại. **Vì sao cần giữ:** tổng thời gian hoàn thành có thể phản ánh hồi phục packet cuối, lịch chạy userspace, ngân sách congestion hoặc yếu tố khác; phép đo này chưa tách chúng. Dòng median không chỉ ra vị trí HOL và không đủ để gán một nguyên nhân riêng.

<svg viewBox="0 0 520 335" role="img" aria-labelledby="net22-median-t net22-median-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net22-median-t">Thời gian tăng không theo tên phiên bản</title>
<desc id="net22-median-d">Độ dài thanh theo median thật; HTTP/3 ở loss 1 phần trăm cao hơn HTTP/2 trong lần đo này.</desc>
<defs><marker id="net22-median-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
<text x="15" y="25" fill="currentColor" font-size="14">Median nhóm 12 body · ms</text><text x="12" y="69" fill="currentColor" font-size="13">0% · h1</text><rect x="92" y="50" width="293.1708" height="26" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="393.1708" y="69" fill="currentColor" font-size="13">563,79</text><text x="12" y="109" fill="currentColor" font-size="13">0% · h2</text><rect x="92" y="90" width="120.2084" height="26" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="220.20839999999998" y="109" fill="currentColor" font-size="13">231,17</text><text x="12" y="149" fill="currentColor" font-size="13">0% · h3</text><rect x="92" y="130" width="93.74560000000001" height="26" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="193.74560000000002" y="149" fill="currentColor" font-size="13">180,28</text><text x="12" y="189" fill="currentColor" font-size="13">1% · h1</text><rect x="92" y="170" width="301.7456" height="26" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="401.7456" y="189" fill="currentColor" font-size="13">580,28</text><text x="12" y="229" fill="currentColor" font-size="13">1% · h2</text><rect x="92" y="210" width="127.08279999999999" height="26" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="227.0828" y="229" fill="currentColor" font-size="13">244,39</text><text x="12" y="269" fill="currentColor" font-size="13">1% · h3</text><rect x="92" y="250" width="256.62" height="26" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="356.62" y="269" fill="currentColor" font-size="13">493,50</text><path d="M92 42 V292 H405" fill="none" stroke="currentColor"/><text x="92" y="315" fill="currentColor" font-size="14">0</text><text x="375" y="315" fill="currentColor" font-size="14">600 ms</text>
</svg>

Biểu đồ mã hoá độ dài bằng median đo thật; hai nhóm dùng cùng thang. Nó cho thấy chênh lệch đầu-cuối trong môi trường đã nêu, không biến kết quả thành thứ hạng giao thức áp dụng cho mọi implementation. Để xem độ phân tán, đọc min–max trong log; hình không biểu diễn p95.

Bạn có thể nói chắc điều hẹp hơn: “Trong lần đo năm lượt/cấu hình này, cùng nhóm body và policy một connection, nhánh HTTP/3 có median cao hơn HTTP/2 ở loss cấu hình 1%.” Không thể đổi thành “QUIC không bỏ HOL” hoặc “HTTP/2 chịu mất gói tốt hơn trên mọi đường”. Cơ chế được quy định độc lập với việc implementation nào thắng workload này.

### 4.5 Kế hoạch kiểm tiếp phải chọn câu hỏi cụ thể

Muốn kiểm **HOL giao byte chéo stream**, thêm một tài nguyên lớn A và một response nhỏ B, đặt thời điểm gửi sao cho B sẵn sàng sau phần bị mất của A, rồi thu trace đủ để xác định dữ liệu B đã tới chưa. Bên TCP cần sequence/lỗ và timestamp socket đọc; bên QUIC cần qlog với packet, frame, stream offset và mốc ứng dụng nhận. Việc gài loss có chủ đích phải chỉ rõ packet mang stream nào; drop ngẫu nhiên không tự bảo đảm đúng tình huống muốn kiểm.

Muốn kiểm **thời gian tải nhóm**, tăng số lần chạy, đảo thứ tự giao thức giữa các vòng và kiểm nhiều kích thước/loss/RTT trong các phiên đo riêng. Hiện tại mỗi vòng chạy h1 rồi h2 rồi h3; dùng chung VM nên drift tải nền vẫn là một nhiễu có thể có. Năm lần chưa đủ để suy p95 đáng tin. Lặp nhiều hơn chỉ có ý nghĩa khi câu hỏi và điều kiện đã rõ, không phải để lựa tới khi HTTP/3 thắng.

Muốn kiểm **trải nghiệm trang thật**, thay bộ URL có sẵn bằng dependency graph của trang, lưu cache state và đại lượng hiển thị cần tối ưu. Một response JSON đầu trang có thể quan trọng hơn toàn bộ ảnh nền. Tổng download xong không thay thế thời gian người dùng có thể thao tác. Ba câu hỏi này dùng chung một số công cụ nhưng không có cùng phép đo thành công.

> **Chưa đo.** Lab chưa cô lập một packet loss xác định để chứng minh HOL bằng trace, chưa đo browser rendering, QPACK blocking, connection migration hay p95; cũng chưa so nhiều connection HTTP/1.1 với một connection HTTP/2. Muốn kết luận từng phần phải bổ sung đối chứng tương ứng, không mượn biểu đồ median để trả lời thay.

## 5. Tính tay

Các đại lượng đầu-cuối dưới đây lấy từ log; các giả định về lịch request được ghi riêng và không trình bày như số đo packet. Phép tính được kiểm lại bằng Python trong `out/calculations.txt`.

### 5.1 Tải cùng byte, khác thời gian

Mỗi nhóm có **12 × 32.768 = 393.216 byte** body, tức **384 KiB** với quy ước KiB = 1.024 byte. Dùng median HTTP/2 ở đối chứng **231,17 ms**, tốc độ body hiệu dụng của cả nhóm là bao nhiêu?

**Giải:** đổi thời gian sang **0,23117 s** rồi tính `393216 × 8 / 0,23117 / 10^6 ≈ 13,61 Mbit/s`. Đây là byte body chia thời gian nhóm, gồm các khoảng chờ của workload; không phải wire bitrate, không phải dung lượng link, không cộng warm request. Đổi công thức thành `393216 / 231,17` mà gọi byte/s sẽ sai đơn vị vì mẫu vẫn là mili giây.

### 5.2 Loss 1% có đồng nghĩa chậm 1%?

So median loss 1% với đối chứng của cùng nhánh. HTTP/2 tăng từ **231,17 lên 244,39 ms**, HTTP/3 từ **180,28 lên 493,50 ms**. Tính phần tăng và giải thích giới hạn.

**Giải:** HTTP/2 tăng `(244,39 / 231,17 − 1) × 100 ≈ 5,72%`; HTTP/3 tăng `(493,50 / 180,28 − 1) × 100 ≈ 173,74%`. Đây là phần trăm thay đổi giữa hai median đo trong lần này. `loss 1%` là tham số xác suất packet drop, còn latency phụ thuộc hồi phục, thời điểm loss và packetization; không có quan hệ tuyến tính bắt buộc. Không dùng hai phần trăm trên làm mô hình dự báo cho loss khác hoặc khẳng định mức ý nghĩa thống kê.

### 5.3 Bắt buộc theo thứ tự khác với chia slot

**Giả định bài toán**, không phải đo lab: có mười hai request độc lập, mỗi request sau khi được gửi mất **40 ms** để nhận xong, bỏ thiết lập và tranh chấp bandwidth. Client HTTP/1.1 không pipeline chỉ có một slot; rồi thử một client có bốn slot trên bốn connection. Thời gian nhóm tối thiểu theo mô hình là bao nhiêu? HTTP/2 có tự bảo đảm đúng thời gian của trường hợp bốn slot không?

**Giải:** một slot cần `12 × 40 = 480 ms`; bốn slot có `ceil(12 / 4) × 40 = 120 ms`. Đây là mô hình chia lượt, không phải latency browser. HTTP/2 có thể multiplex nhưng còn giới hạn stream, scheduler, flow/congestion control và handler; không có điều khoản “mười hai request phải xong trong ba lượt”. Nếu tất cả có thể tiến song song và không vướng tài nguyên chung, mô hình lý tưởng còn có thể chỉ cần một lượt; chính giả định tài nguyên quyết định kết quả, không phải số phiên bản HTTP.

## 6. Chuyển giao

1. Một SDK bật HTTP/2 nhưng mọi response báo `HTTP/1.1`. Bạn thu bằng chứng ở TLS endpoint nào để tách thiếu ALPN, thư viện chưa hỗ trợ và proxy đổi version giữa hai chặng?
2. HTTP/2 tải ảnh xong sớm nhưng request JSON quan trọng lại muộn. Bạn cần mốc riêng nào ở client và server để tách scheduler, pool backend và HOL TCP?
3. Tắt nén response làm HTTP/3 thắng phép đo mà trước đó thua. Hãy nêu những biến đã thay ngoài số byte và một đối chứng giúp tránh quy hết chênh lệch cho QPACK.
4. Tăng số connection HTTP/1.1 khiến tổng download xong sớm hơn nhưng backend bắt đầu quá tải. Bạn sẽ giữ workload nghiệp vụ và ngân sách connection ra sao khi so lại các phiên bản?
5. HTTP/3 chỉ chậm ở request cuối của một nhóm nhỏ trên đường có loss. Thiết kế instrumentation để phân biệt mất phần cuối chưa được ACK, chờ credit và handler chưa kết thúc; đừng chọn nguyên nhân chỉ từ một khoảng trắng trên waterfall.
6. **Câu khó nhất, không có đáp án trong bài.** Bạn chỉ có quyền sửa client và một proxy ở giữa, không sửa origin hoặc trình duyệt của khách. Hãy thiết kế thí nghiệm phân biệt HOL TCP ở chặng client–proxy, hàng đợi HTTP/1.1 ở chặng proxy–origin và dependency của trang, trong khi proxy có cache và retry. Cần giữ những định danh/mốc nào xuyên các lần thử để không đếm một retry thành một stream mới “nhanh hơn”, và làm sao chứng minh một cải thiện p95 không đến từ thay tập request được cache?

## 7. Tóm tắt

- HTTP/1.1 không có multiplexing; pipeline vẫn phải gửi response theo thứ tự request, theo RFC 9112 §9.3.2.
- HTTP/2 gắn frame với stream nhưng vẫn nhận byte qua một TCP connection có thứ tự; multiplexing không gỡ lỗ TCP.
- QUIC giữ thứ tự trong từng stream; các stream vẫn chia sẻ congestion control của connection, theo RFC 9114 §1.2.
- QPACK và phụ thuộc ứng dụng có thể tạo chờ ở phía trên transport; lab này chưa đo riêng chúng.
- Lab kiểm đủ 393.216 byte body cho mỗi nhóm, warm trước khi đo và giới hạn một connection ở nhánh TCP.
- Ở cấu hình loss 1% của lần đo này, median HTTP/2 là 244,39 ms và HTTP/3 là 493,50 ms; kết quả không xác định nguyên nhân loss recovery.
- Tổng thời gian nhóm, latency tài nguyên quan trọng và bằng chứng HOL là ba đại lượng khác nhau.

→ **Bài 23 — TLS khi vận hành: SNI, ALPN, resumption, mTLS**: trước khi có stream HTTP, tên nào chọn endpoint, giao thức nào được thương lượng và lần kết nối mới phải trả những chuyến đi-về nào?
