# Bài 16 — TCP từ bên trong: sequence, ACK và truyền lại

## 1. Mục tiêu

Sau bài này bạn có thể:

- Từ một đoạn tcpdump, xác định vùng byte đã tới liên tục, vùng đang thiếu và vùng chỉ được SACK báo nhận.
- Phân biệt ACK của TCP với việc ứng dụng đã đọc hoặc đã hoàn tất một thao tác nghiệp vụ.
- Giải thích vì sao mất một segment có thể giữ lại dữ liệu đã đến sau nó, dù kết nối vẫn ESTABLISHED.
- Phân biệt bằng chứng cho fast retransmit, hết retransmission timer và truyền lại có thể là thừa.
- Đo mức giảm goodput khi thêm mất gói, giữ các điều kiện khác cố định, rồi bác bỏ phép trừ thẳng phần trăm mất gói.
- Chọn điểm bắt và counter để phân biệt mất dữ liệu, mất ACK, đảo thứ tự và capture thiếu gói.

## 2. Triệu chứng

Một job chuyển dữ liệu qua TCP chạy đúng nội dung ở cả hai lượt. Đường lab đặt trễ mỗi chiều 20 ms và giới hạn chiều gửi 100 Mbit/s. Khi chưa thêm mất gói, tốc độ phía nhận nằm ở **94,695–94,772 Mbit/s**. Giữ nguyên trễ, thuật toán CUBIC và kích thước segment, chỉ đặt xác suất mất gói chiều gửi thành **1%**, tốc độ còn **2,866–4,427 Mbit/s**. Không có lỗi ứng dụng để retry.

Bản giải thích đầu tiên nghe hợp lý: “Mất 1% thì truyền lại thêm 1%, đáng lẽ chỉ còn khoảng 99% tốc độ cũ.” Nếu đúng, phần chậm còn lại phải nằm ở CPU hoặc disk. Lab cố tình dùng iperf3, công cụ sinh và nhận dữ liệu trong bộ nhớ, để thử chính dự đoán đó trước khi đổ lỗi cho xử lý nghiệp vụ.

> **Đo trên lab.** Docker/colima, Alpine 3.20, Linux `6.8.0-64-generic` aarch64, iperf3 `3.17.1`. Ba lượt mỗi điều kiện, mỗi lượt đo 8 s sau khi bỏ 1 s đầu; TCP dùng `-C cubic -M 1200`, một luồng gửi từ `10.16.0.1` tới `10.16.0.2`. Số ở trên lấy từ `net-16/out/summary.txt`; môi trường ở `out/state.txt`, cấu hình ở `inside.sh`. Chạy lại: `~/projects/net-lab/net-16/run.sh`.

**Goodput** là tốc độ dữ liệu hữu ích được phía nhận báo đã nhận, không cộng byte truyền lại hay header trên dây. Trong bài, throughput trong câu hỏi “tải được bao nhiêu” được đo bằng goodput của iperf3. Không lấy tốc độ ghi vào socket phía gửi thay cho nó, vì một phần dữ liệu có thể còn trong hàng đợi lúc hết thời gian đo.

Ta không học lại bắt tay TCP hay TLS ở đây; phần đó nằm trong [TCP/UDP & TLS](../engineering/eng-03-tcp-tls.md). [Bài 1](net-01-boc-request-tcpdump.md) đã chỉ cách bóc header và đọc sequence tương đối. Bài này theo dõi điều xảy ra khi luồng byte bị thủng một đoạn, và vì sao độ tin cậy có chi phí thời gian lớn hơn số byte phải gửi thêm.

## ⏸ Dừng lại — đoán trước #1

Trên cùng kết nối, bên nhận đã có byte `1..1000` và `2001..3000`, nhưng chưa có `1001..2000`. ACK tích lũy phải mang giá trị nào?

(a) 3001, vì đó là byte sau byte lớn nhất từng thấy.
(b) 1001, vì đó là byte đầu tiên còn thiếu trong chuỗi liên tục.
(c) 2001, vì có tổng cộng 2000 byte đã tới.
(d) Không được gửi ACK cho đến khi hết thiếu.

## 3. Cơ chế

### 3.1 Sequence là tọa độ của byte, ACK là mép của đoạn liên tục

Đáp án là **(b)**. **Sequence number** là số thứ tự dùng để định vị dữ liệu trong không gian byte của một chiều TCP; **ACK tích lũy** là số thứ tự tiếp theo bên nhận đang chờ, xác nhận mọi byte trước nó trong chiều ấy. Vì byte `1001` còn thiếu, không thể xác nhận một mạch tới `3000`, dù những byte phía sau đã nằm trong buffer. Quy tắc nằm trong [RFC 9293 §3.4](https://www.rfc-editor.org/rfc/rfc9293.txt).

Có hai không gian sequence độc lập: số của C→S và số của S→C. ACK từ S nói về dữ liệu C gửi, không phải về sequence riêng của S. Khi dùng tcpdump không bật `-S`, số hiển thị thường là tương đối với sequence khởi đầu của từng kết nối. Hai kết nối cùng có `seq 1:1001` không có nghĩa là cùng dữ liệu; phải ghép đúng cặp IP/port và thời điểm.

Ký hiệu `seq a:b` mô tả khoảng **[a,b)**: có byte a, không có byte b; số byte là `b − a`. Một segment `seq 1:1001` mang 1000 byte. Segment sau có thể là `1001:3001`, mang 2000 byte; ACK liên tục sau cả hai là 3001. Ranh giới ấy không khẳng định ứng dụng đã nhận đúng hai lần `recv()`.

> **Nguồn.** RFC 9293 §3.4: *“mechanism employed is cumulative”*. SYN và FIN cũng chiếm vị trí trong không gian sequence, dù không phải byte dữ liệu ứng dụng. Xem [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.txt); bản tải đối chiếu nằm ở `net-16/src/rfc9293.txt`.

Hai lần `sendall()` 1000 và 2000 byte trong lab dẫn tới ACK 1001 rồi 3001; server lại đọc bằng buffer 333 byte. Hình sau biểu diễn **độ dài byte**, không phải số lời gọi hàm. Ba thanh cùng tỉ lệ để thấy vì sao số byte đã đến khác vị trí ACK khi có một lỗ hổng. Hàng có lỗ là mô hình giả định dùng đúng các biên byte của phép thử stream, không phải tuyên bố trace stream có mất gói.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 350" role="img" aria-labelledby="net16-byte-t net16-byte-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net16-byte-t">ACK dừng ở đầu lỗ byte</title>
<desc id="net16-byte-d">Thanh byte có độ rộng tỉ lệ; cùng tổng byte gửi nhưng ACK phụ thuộc vùng liên tục.</desc>
<text x="20" y="26" font-size="14" text-anchor="start" fill="currentColor">Cùng trục byte · thanh dài = nhiều byte hơn</text><text x="20" y="64" font-size="14" text-anchor="start" fill="currentColor">Dữ liệu gửi</text><rect x="60" y="76" width="130" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><rect x="190" y="76" width="130" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><rect x="320" y="76" width="130" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="60" y="124" font-size="13" text-anchor="middle" fill="currentColor">1</text><text x="190" y="124" font-size="13" text-anchor="middle" fill="currentColor">1001</text><text x="320" y="124" font-size="13" text-anchor="middle" fill="currentColor">2001</text><text x="450" y="124" font-size="13" text-anchor="middle" fill="currentColor">3001</text><text x="20" y="148" font-size="14" text-anchor="start" fill="currentColor">Nhận đủ</text><rect x="60" y="160" width="130" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><rect x="190" y="160" width="130" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><rect x="320" y="160" width="130" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="60" y="208" font-size="13" text-anchor="middle" fill="currentColor">1</text><text x="190" y="208" font-size="13" text-anchor="middle" fill="currentColor">1001</text><text x="320" y="208" font-size="13" text-anchor="middle" fill="currentColor">2001</text><text x="450" y="208" font-size="13" text-anchor="middle" fill="currentColor">3001</text><text x="20" y="232" font-size="14" text-anchor="start" fill="currentColor">Có lỗ: ACK 1001</text><rect x="60" y="244" width="130" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><rect x="190" y="244" width="130" height="28" rx="4" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="255" y="263" font-size="13" text-anchor="middle" fill="currentColor">thiếu</text><rect x="320" y="244" width="130" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="60" y="292" font-size="13" text-anchor="middle" fill="currentColor">1</text><text x="190" y="292" font-size="13" text-anchor="middle" fill="currentColor">1001</text><text x="320" y="292" font-size="13" text-anchor="middle" fill="currentColor">2001</text><text x="450" y="292" font-size="13" text-anchor="middle" fill="currentColor">3001</text><text x="20" y="330" font-size="14" text-anchor="start" fill="currentColor">Suy luận: hàng có lỗ không phải trace stream.</text>
</svg>

Không dùng ACK như biên bản xử lý nghiệp vụ. TCP phía nhận có thể ACK khi dữ liệu đã được nhận vào hệ thống, trước khi code ứng dụng đọc socket. Nếu server chết sau ACK nhưng trước commit database, phía gửi không có gì trong TCP để biết giao dịch đã commit hay chưa. Muốn biết điều đó cần response ứng dụng hoặc một cơ chế xác nhận nghiệp vụ. Tăng retry TCP không tạo ra exactly-once cho thao tác ghi.

### 3.2 Vì sao byte đã tới vẫn chưa xuất hiện ở ứng dụng

**Receive buffer** là vùng bộ nhớ phía nhận giữ dữ liệu TCP chờ ứng dụng đọc và có thể giữ cả dữ liệu đến lệch thứ tự. TCP cung cấp cho ứng dụng một luồng byte có thứ tự. Khi segment đầu và segment thứ ba đã tới nhưng segment giữa chưa tới, ứng dụng có thể đọc phần liên tục trước lỗ; nó chưa thể nhận tiếp phần phía sau lỗ theo giao diện luồng bình thường. Đó là **head-of-line blocking** ở TCP: một lỗ ở đầu phần chưa giao chặn những byte đã đến sau nó.

So với “mọi gói đều bị mất”, triệu chứng khác ở điểm phía nhận vẫn có dữ liệu ngoài thứ tự và vẫn gửi phản hồi. So với “ứng dụng nhận sai thứ tự”, TCP che lỗi thứ tự bằng cách chờ và ghép lại; cái ứng dụng nhìn thấy thường là một lần đọc bị chậm. Nếu thư viện HTTP ghép nhiều luồng logic vào một TCP connection, hậu quả ứng dụng phụ thuộc cách ghép; phần HTTP/2 so với HTTP/3 dành cho bài 22.

**SACK — Selective Acknowledgment — là tùy chọn TCP báo những khoảng byte đã nhận ngoài phần ACK tích lũy.** Bên nhận vẫn giữ ACK tại đầu lỗ, đồng thời có thể ghi `sack {2001:3001}`. Bên gửi biết phần sau đã đến và có cơ sở chỉ truyền lại vùng thiếu. SACK không cho phép đẩy ACK tích lũy vượt lỗ và không làm TCP đổi thành giao thức giao dữ liệu lệch thứ tự. [RFC 2018 §3–5](https://www.rfc-editor.org/rfc/rfc2018.txt).

**SACK-permitted** là tùy chọn trong SYN cho biết đầu đó hỗ trợ nhận SACK; còn block SACK mang biên trái/phải xuất hiện trong các segment xác nhận sau đó. Đừng tìm block SACK trong mọi ACK, cũng đừng suy từ không thấy block trong một capture ngắn rằng hai bên không hỗ trợ. Phải bắt cả SYN hoặc kiểm state phù hợp.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 700" role="img" aria-labelledby="net16-recover-t net16-recover-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="net16-recover-t">Từ segment mất tới SACK và hồi phục luồng byte</title>
<desc id="net16-recover-d">Hai endpoint cố định, tám bước theo vùng byte thật của capture. Phân biệt số đo receiver với mô hình fast retransmit và nhánh RTO chưa đo.</desc>
<defs><marker id="net16-recover-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="currentColor"/></marker></defs>
<rect x="15" y="16" width="140" height="46" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<rect x="485" y="16" width="140" height="46" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/>
<rect x="81" y="62" width="8" height="550" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<rect x="551" y="62" width="8" height="550" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/>
<text x="85" y="44" text-anchor="middle" font-size="14" fill="currentColor">C · 10.16.0.1</text><text x="555" y="44" text-anchor="middle" font-size="14" fill="currentColor">S · 10.16.0.2</text><g data-step="1">
<path d="M89 85 H551" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net16-recover-arr)"/><text x="320" y="73" text-anchor="middle" font-size="14" fill="currentColor">[122402, 123590) · 1188 byte</text>
</g><g data-step="2" data-until="2">
<path d="M89 125 H320" fill="none" stroke="currentColor" marker-end="url(#net16-recover-arr)"/><text x="320" y="108" text-anchor="middle" font-size="14" fill="currentColor">[123590, 124778) · mất trước S</text><text x="320" y="151" text-anchor="middle" font-size="14" fill="currentColor">[124778, 125966) cũng thiếu</text>
</g><g data-step="3">
<path d="M89 180 H551" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net16-recover-arr)"/><text x="320" y="168" text-anchor="middle" font-size="14" fill="currentColor">[125966, 127154)</text><path d="M89 214 H551" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net16-recover-arr)"/><text x="320" y="202" text-anchor="middle" font-size="14" fill="currentColor">[127154, 128342)</text><path d="M89 248 H551" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net16-recover-arr)"/><text x="320" y="236" text-anchor="middle" font-size="14" fill="currentColor">[128342, 129530)</text>
</g><g data-step="4">
<path d="M551 282 H89" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net16-recover-arr)"/><text x="320" y="270" text-anchor="middle" font-size="14" fill="currentColor">ACK 123590 · SACK [125966, 127154)</text><path d="M551 316 H89" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net16-recover-arr)"/><text x="320" y="304" text-anchor="middle" font-size="14" fill="currentColor">ACK 123590 · SACK [125966, 128342)</text>
</g><g data-step="5">
<path d="M551 350 H89" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net16-recover-arr)"/><text x="320" y="338" text-anchor="middle" font-size="14" fill="currentColor">ACK 123590 · SACK [125966, 129530)</text><text x="320" y="375" text-anchor="middle" font-size="14" fill="currentColor">RFC 5681: đủ 3 dupACK ⇒ fast retransmit</text><text x="320" y="395" text-anchor="middle" font-size="13" fill="currentColor">Quy tắc mô hình; không đếm 3 dòng trên thành 3 dupACK</text>
</g><g data-step="6">
<path d="M89 425 H551" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net16-recover-arr)"/><text x="320" y="413" text-anchor="middle" font-size="14" fill="currentColor">Gửi lại [123590, 124778)</text><path d="M89 459 H551" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net16-recover-arr)"/><text x="320" y="447" text-anchor="middle" font-size="14" fill="currentColor">Gửi lại [124778, 125966)</text>
</g><g data-step="7">
<path d="M551 493 H89" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net16-recover-arr)"/><text x="320" y="481" text-anchor="middle" font-size="14" fill="currentColor">ACK 124778 · vẫn thiếu segment kế</text><path d="M551 527 H89" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#net16-recover-arr)"/><text x="320" y="515" text-anchor="middle" font-size="14" fill="currentColor">ACK 230510 · lỗ đã được lấp</text><text x="320" y="553" text-anchor="middle" font-size="13" fill="currentColor">Các segment tới 230510 ở giữa đã được lược bớt</text>
</g><g data-step="2" data-until="6">
<rect x="175" y="570" width="350" height="36" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="350" y="593" text-anchor="middle" font-size="14" fill="currentColor">Chưa giao byte sau lỗ [123590, 125966)</text>
</g><g data-step="7">
<rect x="175" y="570" width="350" height="36" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="350" y="593" text-anchor="middle" font-size="14" fill="currentColor">Chuỗi liên tục đã tới byte 230509</text>
</g><g data-step="8">
<text x="320" y="650" text-anchor="middle" font-size="14" fill="currentColor">Nhánh khác · tail loss: không đủ dupACK → chờ timer (mô hình)</text>
<text x="320" y="675" text-anchor="middle" font-size="13" fill="currentColor">Chưa đo RTO; probe hiện đại có thể hồi phục sớm</text>
</g>
</svg>
<step-note data-step="1">Segment ngay trước lỗ đã tới S; số byte trong hình lấy từ flow C:59268 → S:5201 của capture. Thời gian đi xuống nhưng khoảng cách dọc không theo tỷ lệ.</step-note>
<step-note data-step="2">Hai segment liên tiếp thuộc [123590,125966) không xuất hiện ở receiver trước hồi phục. Đường gửi bị cắt giữa hình là suy luận theo vị trí netem, không phải timestamp gửi gốc đã đo; nó biến mất ở bước sau.</step-note>
<step-note data-step="3">Các segment sau lỗ vẫn tới receiver, tạo dữ liệu ngoài thứ tự. TCP chưa giao phần sau lỗ cho ứng dụng dù đường vẫn chuyển packet.</step-note>
<step-note data-step="4">ACK giữ mép 123590 trong khi block SACK mở rộng. Dòng ACK đầu ở đây vừa tiến từ mép trước, nên ba dòng SACK không tự bằng ba duplicate ACK.</step-note>
<step-note data-step="5">Theo RFC 5681, đủ ba duplicate ACK hợp lệ cho phép fast retransmit mà không chờ RTO. Capture receiver không đủ xác nhận kernel đã kích hoạt đúng quy tắc ấy ở thời điểm nào; hình tách quy tắc khỏi số đo.</step-note>
<step-note data-step="6">Capture ghi hai vùng thiếu xuất hiện lại tại 1794546999.917661 và 1794546999.917806. Đây là diễn tiến hồi phục thật, không phải phép đo thời gian giữa hai lần sender phát.</step-note>
<step-note data-step="7">ACK trước hết lên 124778 rồi nhảy tới 230510 khi lỗ kế được lấp và dữ liệu đã giữ nối thành chuỗi. Hình lược các segment trung gian, không bịa bước nhảy chỉ từ ba segment vừa vẽ.</step-note>
<step-note data-step="8">Ở mô hình không có probe khác, thiếu phản hồi dupACK thì timer là đường hồi phục còn lại. Chưa đo RTO/tail loss trong lab này; stack hiện đại không bắt buộc mọi tail loss đều đợi RTO.</step-note>
</step-flow>

Hình dùng **vùng byte thật của flow `59268 → 5201`**, nhưng có hai lớp bằng chứng: segment/SACK/ACK quan sát ở S, và mô hình hồi phục theo RFC. Ba block SACK đầu lớn dần từ 1188 tới 3564 byte; hai vùng thiếu dài tổng cộng 2376 byte xuất hiện lại rồi ACK lên 230510. Các segment tới trước mép ấy đã được lược trên hình, không bị coi là chưa gửi.

> **Suy luận.** Vết mất giữa đường được dựng từ lỗ byte tại S và fault injection netem ở c0; capture này không chứa lần sender phát bản gốc. Quy tắc “dupACK thứ ba → fast retransmit” theo RFC 5681 §3.2 không phải kết luận rằng kernel lab đã dùng đúng trigger đó; ACK đầu trong ba dòng trích vừa tiến mép, chưa phải duplicate ACK.

> **Chưa đo.** Nhánh mất cuối luồng/RTO trong bước 8 là mô hình cơ sở, không có số RTO đo riêng. Không đủ dupACK không đồng nghĩa mọi TCP hiện đại phải chờ RTO: các probe/cơ chế phát hiện theo thời gian có thể hồi phục trước đó.

Một giới hạn dễ bỏ qua: SACK là lời báo có tính tư vấn; receiver có thể bỏ dữ liệu đã SACK trong những điều kiện được chuẩn cho phép. Bên gửi không được coi phần đó là đã ACK tích lũy để tự do xóa mọi bản sao. Vì vậy “đã thấy SACK” và “đã tiến mép ACK” là hai bằng chứng khác nhau khi phân tích hồi phục. [RFC 2018 §8](https://www.rfc-editor.org/rfc/rfc2018.txt).

### 3.3 Ba duplicate ACK là quy tắc cơ sở, không phải mọi TCP đều chỉ có một đường hồi phục

**Duplicate ACK** trong thuật toán cơ sở là ACK lặp cùng mép xác nhận khi còn dữ liệu chưa được xác nhận, kèm các điều kiện như không mang dữ liệu và không thay đổi advertised window. Không phải mọi dòng cùng `ack X` đều được đếm như nhau. Một cập nhật window hay ACK đi kèm dữ liệu chiều ngược không thể tự động được bạn gắn nhãn duplicate chỉ từ một trường. [RFC 5681 §2](https://www.rfc-editor.org/rfc/rfc5681.txt).

**Fast retransmit** là cơ chế gửi lại vùng nghi mất dựa trên phản hồi ACK, không đợi retransmission timer hết. Với quy tắc RFC 5681, ba duplicate ACK liên tiếp là tín hiệu đủ để truyền lại segment có vẻ đã mất. Vì các segment sau vẫn tới, chúng tạo ra phản hồi về lỗ; bên gửi nhận phản hồi ấy sớm hơn một lần chờ timer trong nhiều tình huống. [RFC 5681 §3.2](https://www.rfc-editor.org/rfc/rfc5681.txt).

Điều này giải thích tại sao cùng một gói bị mất nhưng vị trí của nó quan trọng. Mất ở giữa một đợt gửi còn nhiều segment sau có thể sinh đủ phản hồi; mất segment cuối khi không có dữ liệu sau thì không có cùng chuỗi duplicate ACK để dựa vào. Không được kết luận “mất segment cuối luôn chờ RTO”: stack hiện đại có cơ chế phát hiện theo thời gian và probe khác. Bài chỉ dùng RFC 5681 làm mô hình cơ sở, không định danh thuật toán hồi phục cụ thể của kernel chỉ từ một vài dòng capture.

ACK trùng cũng không chứng minh mất gói. Segment bị đảo thứ tự tạo ra cùng kiểu lỗ tạm thời; một bản sao ACK trên mạng có thể làm phản hồi bị lặp. Nếu byte gốc đến muộn, việc truyền lại có thể là thừa. Muốn kết luận cần timeline hai đầu, vùng byte, SACK và trạng thái sender. Capture ở một đầu chỉ cho thấy điều đi qua điểm bắt, không có camera ở mọi link.

## ⏸ Dừng lại — đoán trước #2

Client gửi hết phần cuối của response rồi im lặng chờ ACK. Không có thêm segment dữ liệu đi sau. Bạn không thấy ba duplicate ACK, nhưng một vùng byte vẫn xuất hiện lại sau một khoảng chờ. Kết luận nào chắc nhất?

(a) Không thể là truyền lại TCP, vì truyền lại bắt buộc có ba duplicate ACK.
(b) Chắc chắn ứng dụng retry toàn bộ request.
(c) TCP còn có timer/probe; cần đo khoảng chờ và state để phân loại, không suy riêng từ số duplicate ACK.
(d) Receiver đã xử lý nghiệp vụ hai lần.

### 3.4 Timer là bảo hiểm khi phản hồi không đủ

Đáp án là **(c)**. **RTO — Retransmission Timeout — là khoảng chờ của timer truyền lại dữ liệu chưa được xác nhận.** **RTT — Round-Trip Time — là thời gian khứ hồi của phép đo gắn với dữ liệu và phản hồi**; nó gồm thời gian đi, về và những phần chờ nằm trên đường đo. RTO cần có biên cho biến động, vì dùng đúng RTT lần gần nhất sẽ truyền lại thừa ngay khi lần sau chậm hơn một chút.

RFC 6298 giữ hai đại lượng: **SRTT**, ước lượng RTT đã làm mượt; **RTTVAR**, ước lượng độ biến động dùng trong công thức timer. Với mẫu RTT đầu tiên R, đặt `SRTT = R`, `RTTVAR = R/2`. Giá trị tính là `SRTT + max(G, 4 × RTTVAR)`, trong đó G là độ phân giải đồng hồ. Với mẫu tiếp R mới, cập nhật RTTVAR bằng trọng số 1/4 trên sai khác so với **SRTT cũ**, rồi cập nhật SRTT bằng trọng số 1/8 trên mẫu mới. Thứ tự ấy có ý nghĩa; dùng SRTT đã cập nhật vào công thức RTTVAR sẽ ra số khác. [RFC 6298 §2](https://www.rfc-editor.org/rfc/rfc6298.txt).

Chuẩn này khuyến nghị làm tròn RTO tính được dưới 1 s lên 1 s. Đó là khuyến nghị của RFC, không phải lời hứa rằng mọi timer TCP trên Linux production đều tối thiểu đúng 1 s. Lab này **chưa đo riêng ca hết RTO**, nên không dùng công thức để gán nguyên nhân cho khoảng chờ bất kỳ trong pcap. Khi timer hết, RFC quy định truyền lại segment sớm nhất chưa ACK và nhân đôi RTO; việc nhân đôi làm một đợt mất liên tiếp gây khoảng chờ tăng dần. [RFC 6298 §5](https://www.rfc-editor.org/rfc/rfc6298.txt).

Ví dụ **suy luận**, không phải số đo kernel: với R = 40 ms và G = 1 ms, giá trị công thức ban đầu là `40 + 4 × 20 = 120 ms`, rồi áp khuyến nghị RFC thành 1000 ms. Con số 120 ms không được gọi là RTO thực của máy lab. Phần tính tay sẽ đi thêm một mẫu để bạn tự kiểm thứ tự cập nhật.

Một bẫy khác là đo RTT từ segment đã truyền lại. Khi ACK về, không chắc nó phản hồi bản gốc hay bản gửi lại. RFC 6298 §3 yêu cầu dùng quy tắc Karn để tránh mẫu mơ hồ, trừ trường hợp tùy chọn timestamp cho phép phân biệt. Không lấy “ACK lúc 100 ms trừ lần gửi lại lúc 90 ms” thành RTT chắc chắn 10 ms nếu không biết ACK ấy ứng với bản nào.

### 3.5 Từ một lỗ byte tới tốc độ giảm: có ba khoản chi phí

Truyền lại tiêu tốn byte trên đường. Nhưng còn hai khoản: thời gian chờ phát hiện và lấp lỗ khiến dữ liệu sau chưa giao được; phản ứng điều khiển tắc nghẽn làm sender giảm lượng đang gửi rồi tăng trở lại. **Congestion window — cwnd — là giới hạn phía gửi đặt cho lượng dữ liệu đang bay để kiểm soát tải lên đường truyền.** Bài 17 sẽ đo nó cùng receive window; ở đây chỉ cần biết một sự kiện mất có thể làm thay đổi lịch gửi sau đó, không chỉ thêm một bản sao segment. [RFC 5681 §3](https://www.rfc-editor.org/rfc/rfc5681.txt).

Nếu mạng liên tục làm rơi dữ liệu trong lúc sender đang phục hồi, đợt phục hồi sau chồng lên đợt trước. Cùng 1% nhưng RTT, thuật toán, mức mất theo cụm, MSS và thời gian đo khác nhau có thể ra goodput khác nhau. Không có một hằng số “1% loss = giảm X% throughput” áp dụng cho mọi kết nối. Công thức xấp xỉ cho một mô hình Reno dài hạn cũng không phải công thức dự đoán chính xác CUBIC trong phép thử này.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 345" role="img" aria-labelledby="net16-rate-t net16-rate-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net16-rate-t">Mất một phần trăm làm goodput giảm hơn một phần trăm</title>
<desc id="net16-rate-d">Sáu thanh cùng tỷ lệ, ba lượt không loss khoảng 95 Mbit/s, ba lượt loss 1 phần trăm khoảng 3 đến 4 Mbit/s.</desc>
<text x="20" y="25" font-size="14" text-anchor="start" fill="currentColor">Goodput phía nhận · Mbit/s</text><text x="18" y="74" font-size="13" text-anchor="start" fill="currentColor">0% · 1</text><rect x="88" y="55" width="331.51" height="25" rx="4" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="430" y="74" font-size="13" text-anchor="start" fill="currentColor">94,716</text><text x="18" y="114" font-size="13" text-anchor="start" fill="currentColor">0% · 2</text><rect x="88" y="95" width="331.43" height="25" rx="4" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="430" y="114" font-size="13" text-anchor="start" fill="currentColor">94,695</text><text x="18" y="154" font-size="13" text-anchor="start" fill="currentColor">0% · 3</text><rect x="88" y="135" width="331.7" height="25" rx="4" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="430" y="154" font-size="13" text-anchor="start" fill="currentColor">94,772</text><text x="18" y="194" font-size="13" text-anchor="start" fill="currentColor">1% · 1</text><rect x="88" y="175" width="10.03" height="25" rx="4" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="430" y="194" font-size="13" text-anchor="start" fill="currentColor">2,866</text><text x="18" y="234" font-size="13" text-anchor="start" fill="currentColor">1% · 2</text><rect x="88" y="215" width="15.49" height="25" rx="4" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="430" y="234" font-size="13" text-anchor="start" fill="currentColor">4,427</text><text x="18" y="274" font-size="13" text-anchor="start" fill="currentColor">1% · 3</text><rect x="88" y="255" width="12.76" height="25" rx="4" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="430" y="274" font-size="13" text-anchor="start" fill="currentColor">3,646</text><path d="M88 45 V300 H438" stroke="currentColor" fill="none"/><text x="88" y="322" font-size="13" text-anchor="middle" fill="currentColor">0</text><text x="438" y="322" font-size="13" text-anchor="middle" fill="currentColor">100</text>
</svg>

Đồ thị là **số đo của chính lab**, cùng trục Mbit/s và bắt đầu ở 0. Nó không nội suy sang những phần trăm mất gói chưa thử. Mỗi thanh là một lượt, không phải khoảng tin cậy; ba lượt đủ bác bỏ dự đoán “chỉ giảm 1%” ở đây, chưa đủ mô tả phân bố tail latency hay biến động cả ngày ngoài Internet.

Giữa các công cụ cũng phải giữ đúng mẫu số. `retransmits` iperf3 lấy từ sender nói về số segment truyền lại trong thống kê của socket, không phải tỷ lệ mọi frame mất trên đường. Netem có counter drop ở qdisc; receiver goodput là byte nhận chia thời gian. Ba số trả lời ba câu hỏi khác nhau. Chia retransmits cho số dòng capture có cả ACK, kết nối điều khiển và dữ liệu sẽ không ra xác suất mất đã cấu hình.

### 3.6 Điều một capture có thể và chưa thể kết luận

**Offload** là việc giao bớt xử lý gói cho phần cứng hoặc đường xử lý tối ưu; TSO/GSO có thể làm capture phía gửi thấy khối lớn trước khi chia segment, GRO có thể làm capture phía nhận thấy dữ liệu đã gộp. Lab tắt TSO, GSO, GRO trên cả hai đầu veth để đọc biên segment dễ hơn. Tắt trong lab không phải khuyến nghị tắt toàn hệ thống production. Đừng đồng nhất segment ở điểm bắt với frame thật trên dây nếu chưa xét điểm bắt và offload; [bài 1](net-01-boc-request-tcpdump.md) đã đặt ranh giới này.

Một packet analyzer có thể đánh nhãn retransmission khi thấy vùng sequence lặp, nhưng capture thiếu gói, bắt giữa chừng hoặc gói bị nhân bản cũng ảnh hưởng kết quả. Khi có quyền trên hai đầu, bắt đồng thời cùng flow, kiểm dropped-by-kernel của tcpdump, rồi đối chiếu timestamp và vùng byte. Capture chỉ ở receiver không cho thời điểm sender thực sự gửi bản đầu đã rơi trước receiver.

Trong lab, mất được gài ở egress c0, capture ở s0. Nếu một vùng byte chưa từng tới s0, rồi xuất hiện sau SACK báo lỗ, đó là bằng chứng hồi phục phù hợp với fault injection; không đòi receiver capture phải chứa bản đầu đã mất. Muốn đo **khoảng cách giữa hai lần sender phát cùng byte**, phải bổ sung capture c0. Không được dùng thời gian từ ACK đầu lỗ đến lần byte tới receiver thay cho thời gian giữa hai lần gửi.

## 4. Lab

### 4.1 Dựng đường đi rồi giữ log nguyên bản

Bộ lab nằm ở `~/projects/net-lab/net-16/`: `run.sh` tạo container `net16-lab`, cài công cụ, chạy `inside.sh`, rồi trap dọn container; `stream.py` thử API luồng, `summarize.py` đọc JSON iperf3. Hai namespace `net16-c` và `net16-s` nối bằng veth c0–s0, lần lượt có `10.16.0.1/24` và `10.16.0.2/24`. Đây là tham số lab, không phải IP dịch vụ ngoài Internet. Script chỉ tạo/xóa tài nguyên có tiền tố riêng.

```bash
cd ~/projects/net-lab/net-16
./run.sh
cat out/state.txt
cat out/summary.txt
```

Container cần quyền tạo network namespace; script dùng `--privileged` cho lab cách ly. Gói cài và phiên bản được ghi trong `out/install.txt`, không suy rằng tag Alpine cố định mãi mọi package. Toàn bộ lưu lượng đo chạy trong container, không gửi thử tải ra Internet.

Hai chiều có qdisc netem — bộ lập lịch mô phỏng điều kiện mạng của Linux. Chiều C→S đặt rate 100 Mbit/s; hai chiều đặt delay 20 ms. `limit 10000` là sức chứa theo số packet của qdisc, không phải byte và không phải cwnd. Đó là **tham số thử nghiệm** đủ giữ hàng chờ của phép thử; không phải kích thước buffer nên bê nguyên vào production. Tài liệu [tc-netem](https://man7.org/linux/man-pages/man8/tc-netem.8.html) cũng cảnh báo vị trí đặt netem ảnh hưởng phép đo TCP, do cơ chế hàng đợi của sender. Topology này dùng egress trực tiếp để tái hiện có điều kiện, không đại diện mọi đường WAN.

### 4.2 Đọc 3000 byte mà không bảo toàn ranh giới write

Script gỡ loss trước khi chạy stream nhỏ; giữ delay để các pha dễ đọc. Sender gọi `sendall()` với 1000 rồi 2000 byte, cách nhau 0,2 s; receiver gọi `recv(333)`. Xem output:

```bash
cat out/stream-client.txt
cat out/stream-server.txt
cat out/stream-tcpdump.txt
```

Trích các dòng quyết định từ `out/stream-server.txt`:

```text
recv=333 total=333
recv=333 total=666
recv=333 total=999
recv=1 total=1000
recv=333 total=1333
recv=333 total=1666
recv=333 total=1999
recv=333 total=2332
recv=333 total=2665
recv=333 total=2998
recv=2 total=3000
```

Trích `out/stream-tcpdump.txt`, bỏ timestamp và tuple để chỉ giữ phần TCP sau dấu hai chấm:

```text
Flags [P.], seq 1:1001, ack 1, win 502, options [nop,nop,TS val 123725960 ecr 1347111992], length 1000: HTTP
Flags [.], ack 1001, win 524, options [nop,nop,TS val 1347112048 ecr 123725960], length 0
Flags [.], seq 1001:2449, ack 1, win 502, options [nop,nop,TS val 123726166 ecr 1347112048], length 1448: HTTP
Flags [P.], seq 2449:3001, ack 1, win 502, options [nop,nop,TS val 123726166 ecr 1347112048], length 552: HTTP
Flags [.], ack 3001, win 569, options [nop,nop,TS val 1347112248 ecr 123726166], length 0
```

Thấy gì: biên ACK đi theo số byte liên tục, còn số byte mỗi `recv()` đi theo dữ liệu sẵn có và kích thước buffer ứng dụng. Vì sao: socket là giao diện luồng, không bảo toàn biên `sendall()`. Chữ `HTTP` ở cuối dòng là tcpdump suy đoán theo port; payload của `stream.py` chỉ là byte `x`, không phải thông điệp HTTP hợp lệ. Phép thử này chỉ là mốc tọa độ; lỗi mất gói sẽ được gài ở phép thử tải, không gán ngược cho trace stream.

### 4.3 Cho dự đoán “chỉ chậm 1%” chạy trước

Bước chính trong `inside.sh` tương đương các lệnh dưới, chạy bên trong container đã dựng:

```bash
ip netns exec net16-c tc qdisc replace dev c0 root \
  netem delay 20ms loss 1% rate 100mbit limit 10000
ip netns exec net16-c iperf3 -c 10.16.0.2 \
  -C cubic -M 1200 -t 8 -O 1 -J
ip netns exec net16-c tc -s qdisc show dev c0
```

Đầu kia có iperf3 server và qdisc delay 20 ms. Script chạy lần lượt loss 0% rồi 1%, mỗi điều kiện ba lần, ghi `out/iperf-<loss>-<run>.json`. `-O 1` bỏ một giây warm-up, không biến phép đo ngắn thành kết luận về trạng thái ổn định dài hạn. `-M 1200` yêu cầu MSS; payload thực còn phụ thuộc TCP options, nên đừng lấy 1200 nhân số packet trong capture mà chưa đọc `length`.

`out/summary.txt` giữ nguyên output thật:

```text
loss=0% run=1 receiver_Mbit_s=94.716 retransmits=0
loss=0% run=2 receiver_Mbit_s=94.695 retransmits=0
loss=0% run=3 receiver_Mbit_s=94.772 retransmits=0
loss=1% run=1 receiver_Mbit_s=2.866 retransmits=26
loss=1% run=2 receiver_Mbit_s=4.427 retransmits=28
loss=1% run=3 receiver_Mbit_s=3.646 retransmits=29
```

Vì sao kết quả phá dự đoán: cả ba lượt loss 1% đều cách xa 99% baseline, và có retransmits. Chúng ta đã giữ payload trong bộ nhớ, cùng một sender/receiver và cùng cách đo; thay đổi loss đủ tạo khác biệt. Nhưng chưa được tách bằng tỷ lệ phần trăm xem bao nhiêu thời gian thuộc HOL, bao nhiêu thuộc giảm cwnd. Muốn tách cần thêm timeline socket và capture sender, không suy từ một con số goodput cuối lượt.

**1% là tham số xác suất**, không bảo đảm đúng một trong mỗi 100 packet liên tiếp sẽ mất. Mỗi lần chạy chọn những gói rơi khác nhau; mất ở phần dữ liệu và mất ở điều khiển cũng có tác động khác. Script không đặt mất ACK ở s0. Counter drop trong `out/qdisc-1-after.txt` bao gồm tất cả packet qua qdisc trong cả điều kiện đó, còn iperf summary tính từng flow và khoảng đo riêng.

### 4.4 Tìm lỗ và SACK trong bản bắt thật

Capture `out/loss.pcap` bắt ở s0, lọc TCP port 5201, có cả kết nối điều khiển iperf3. Snaplen 128 đủ giữ header/options đang xét; dữ liệu payload có thể bị cắt, vì ta không cần lưu toàn bộ nội dung tải. Bản giải mã bằng tcpdump được giữ ở `out/loss-tcpdump.txt`.

```bash
rg 'sack|seq ' out/loss-tcpdump.txt
cat out/capture.txt
```

Trích một đoạn liên quan cùng tuple trong `out/loss-tcpdump.txt`:

```text
1794546999.893070 IP 10.16.0.2.5201 > 10.16.0.1.59268: Flags [.], ack 123590, win 1848, options [nop,nop,TS val 1347081998 ecr 123695907,nop,nop,sack 1 {125966:127154}], length 0
1794546999.893071 IP 10.16.0.2.5201 > 10.16.0.1.59268: Flags [.], ack 123590, win 1848, options [nop,nop,TS val 1347081998 ecr 123695907,nop,nop,sack 1 {125966:128342}], length 0
1794546999.893071 IP 10.16.0.2.5201 > 10.16.0.1.59268: Flags [.], ack 123590, win 1848, options [nop,nop,TS val 1347081998 ecr 123695907,nop,nop,sack 1 {125966:129530}], length 0
```

Cả ba ACK thuộc chiều `10.16.0.2:5201 → 10.16.0.1:59268`, cùng ACK 123590; mép trái SACK 125966 không đổi, mép phải tăng. Khoảng `[123590,125966)` chưa được xác nhận trong khi phần sau đã được báo nhận. File capture ghi **0 packets dropped by kernel**; điều đó chỉ kiểm việc rơi tại bộ bắt, không phủ nhận netem đang làm rơi packet trước điểm bắt.

Cùng flow, các dòng sau trong `out/loss-tcpdump.txt` cho thấy hai vùng thiếu xuất hiện rồi ACK tiến; đây là phần hồi phục ở bước 6–7 của hình:

```text
1794546999.917661 IP 10.16.0.1.59268 > 10.16.0.2.5201: Flags [.], seq 123590:124778, ack 1, win 507, options [nop,nop,TS val 123695961 ecr 1347081998], length 1188
1794546999.917806 IP 10.16.0.1.59268 > 10.16.0.2.5201: Flags [.], seq 124778:125966, ack 1, win 507, options [nop,nop,TS val 123695961 ecr 1347081999], length 1188
1794546999.937766 IP 10.16.0.2.5201 > 10.16.0.1.59268: Flags [.], ack 124778, win 2970, options [nop,nop,TS val 1347082046 ecr 123695961,nop,nop,sack 1 {125966:230510}], length 0
1794546999.937857 IP 10.16.0.2.5201 > 10.16.0.1.59268: Flags [.], ack 230510, win 2988, options [nop,nop,TS val 1347082047 ecr 123695961], length 0
```

Bằng chứng đúng mức là: receiver báo một khoảng phía sau mép ACK đã đến; sau đó vùng ở mép thiếu xuất hiện và ACK có thể tiến qua phần liên tục mới. Không gọi mọi ACK lặp là lỗi mạng, không gọi mỗi SACK block là một segment riêng: block có thể gộp nhiều segment liền nhau. `out/capture.txt` phải được xem cùng pcap để kiểm capture có tự rơi gói không.

### 4.5 Giữ một đối chứng trước khi đề xuất sửa

Khi làm lại trên hệ thống của bạn, giữ nguyên chiều truyền, kích thước, thuật toán và RTT; đổi từng yếu tố. Trước hết xác nhận đường không mất có đạt mức dự kiến hay không, rồi thêm lỗi. Nếu baseline đã thiếu nhiều so với năng lực đường, phải kiểm receive window, app-limited, rate limit và CPU trước khi dùng loss giải thích mọi thứ. Bài 17 đi tiếp theo thứ tự đó.

> **Chưa đo.** Lab này chưa cô lập mất ACK, mất theo cụm, đảo thứ tự, tail loss hay hết RTO; cũng chưa đo thời gian commit ứng dụng. Có thể mở rộng bằng capture hai đầu, điều kiện netem riêng cho từng chiều và một luồng request/response có dấu xác nhận nghiệp vụ. Không dùng số 1% trong bài làm SLO loss chung cho dịch vụ thật.

## 5. Tính tay

### 5.1 Có đủ 3000 byte, vì sao vẫn ACK 1001?

**Đề giả định.** Receiver đã nhận `[1,1001)` và `[2001,4001)`. Nó còn thiếu bao nhiêu byte trước vùng đã nhận sau cùng, ACK tích lũy là gì, và một block SACK hợp lệ mô tả vùng nào? Sau khi nhận lại `[1001,2001)`, ACK có thể tiến tới đâu nếu không còn lỗ khác?

**Lời giải — suy luận theo RFC 9293/2018.** Đã nhận `1000 + 2000 = 3000 byte`, nhưng lỗ có `2001 − 1001 = 1000 byte`. ACK vẫn 1001; block SACK có thể là `[2001,4001)`. Lấp lỗ xong thì chuỗi liên tục là `[1,4001)`, ACK tiến tới 4001. Trước khi lấp, không được dùng tổng byte đã nhận cộng 1 thành 3001: tổng dung lượng và tọa độ mép liên tục là hai đại lượng khác nhau.

### 5.2 Tự tính timer rồi tách công thức khỏi khuyến nghị

**Đề giả định.** G = 1 ms; mẫu đầu R = 40 ms, mẫu sau R mới = 60 ms. Áp công thức RFC 6298 với alpha 1/8, beta 1/4. Tính SRTT, RTTVAR và RTO theo công thức trước khi áp khuyến nghị tối thiểu 1 s. Nếu timer 1 s hết hai lần liên tiếp, hai khoảng chờ sau mỗi lần backoff là bao nhiêu?

**Lời giải — suy luận, không phải số đo Linux.** Sau mẫu đầu: SRTT 40 ms, RTTVAR 20 ms, giá trị công thức 120 ms. Mẫu sau: `RTTVAR = 0,75 × 20 + 0,25 × |40 − 60| = 20 ms`; `SRTT = 0,875 × 40 + 0,125 × 60 = 42,5 ms`. Giá trị công thức `42,5 + max(1; 80) = 122,5 ms`; theo khuyến nghị tối thiểu của RFC, RTO là 1000 ms. Hai lần backoff tạo khoảng chờ tiếp theo lần lượt 2 s và 4 s. Không cộng thành “response chắc chậm 7 s”: còn phụ thuộc ACK đến lúc nào và ứng dụng có timeout trước hay không.

### 5.3 Tốc độ giảm bao nhiêu trong lần chạy này?

**Đề từ lab.** Lấy trung bình ba goodput không loss và trung bình ba goodput loss 1% trong `summary.txt`. Tính tỷ lệ giảm bằng `(baseline − loss) / baseline`. Có thể lấy tỷ lệ đó làm tỷ lệ byte mất không?

**Lời giải — số học trên số đo.** Trung bình baseline 94,727 Mbit/s, trung bình loss 3,646 Mbit/s; tỷ lệ giảm 96,15%. Không thể gọi tỷ lệ giảm goodput là tỷ lệ byte mất: nó đã chứa ảnh hưởng của lịch gửi, hồi phục và khoảng đo. Tỷ lệ loss cấu hình là xác suất theo packet tại qdisc, còn phần trăm giảm goodput là hiệu của tốc độ dữ liệu hữu ích ở hai điều kiện.

## 6. Chuyển giao

1. Pcap phía client có vùng sequence lặp, nhưng server capture chỉ có một bản và tcpdump báo rơi packet khi bắt. Bạn cần thêm bằng chứng nào để phân biệt truyền lại trên mạng với thiếu gói ở công cụ quan sát?
2. API ghi dữ liệu đã gửi TCP ACK, sau đó process chết trước khi gửi HTTP response. Client có được phép suy rằng giao dịch chưa chạy để retry vô điều kiện không? Bạn sẽ thiết kế định danh thao tác thế nào?
3. ACK tích lũy không đổi nhưng SACK block mở rộng dần. Vì sao đây có thể là dấu hiệu mạng vẫn chuyển dữ liệu, trong khi ứng dụng vẫn chờ đọc?
4. Chuyển upload thành download làm vấn đề biến mất dù ping gần như không đổi. Bạn sẽ đặt loss, capture và counter ở những chiều nào để tìm lỗi đường đi so với đường ACK?
5. Hai đường đều mất 1% nhưng một đường mất thành cụm, đường kia mất rải rác. Cần giữ và đo thêm những biến nào trước khi dùng tốc độ một đường dự đoán đường kia?
6. **Câu khó nhất.** Chỉ được bắt ở sender, không có quyền trên receiver hoặc router; tải file thỉnh thoảng dừng rồi hồi phục, có ACK lặp và một số vùng byte gửi lại. Hãy xây dựng thí nghiệm phân biệt ít nhất ba giả thuyết: dữ liệu mất trên đường đi, ACK mất trên đường về, receiver ngừng đọc. Nêu bằng chứng nào đủ bác bỏ mỗi giả thuyết, bằng chứng nào chỉ tăng độ tin cậy, và tình huống nào về nguyên tắc chưa thể phân biệt với quyền quan sát hiện có.

## 7. Tóm tắt

- ACK tích lũy chỉ tới byte tiếp theo còn chờ trong chuỗi liên tục; nó không chỉ tới byte lớn nhất từng thấy. [RFC 9293 §3.4](https://www.rfc-editor.org/rfc/rfc9293.txt).
- SACK mô tả vùng nhận ngoài mép ACK, không thay ACK tích lũy và không chứng minh ứng dụng đã xử lý dữ liệu. [RFC 2018](https://www.rfc-editor.org/rfc/rfc2018.txt).
- Ba duplicate ACK là tín hiệu fast retransmit trong mô hình RFC 5681; ACK trùng cũng có thể đến từ đảo thứ tự. [§3.2](https://www.rfc-editor.org/rfc/rfc5681.txt).
- RTO dựa trên RTT làm mượt và độ biến động; hết timer thì backoff, không gửi lại đều đặn theo một nhịp RTT cố định. [RFC 6298 §2, §5](https://www.rfc-editor.org/rfc/rfc6298.txt).
- Trong lab này, loss 1% làm goodput giảm nhiều hơn 1%; kết quả cụ thể thuộc `out/summary.txt`, không phải hệ số chung cho mọi TCP.
- Muốn kết luận mất ở đâu phải xét điểm bắt, chiều truyền và chất lượng capture; ACK TCP không thay response nghiệp vụ.

→ **Bài 17 — Flow control và congestion control**: đã biết TCP lấp lỗ byte ra sao, ta đo hai giới hạn quyết định lượng byte được phép bay trước khi chờ ACK.
