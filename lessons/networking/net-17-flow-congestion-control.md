# Bài 17 — Flow control và congestion control: đường còn chỗ, TCP vẫn chờ

## 1. Mục tiêu

Sau bài này bạn có thể:

- Từ bandwidth và RTT, tính lượng byte cần có trên đường để một luồng duy trì tốc độ mục tiêu.
- Phân biệt giới hạn receive window, congestion window, lượng dữ liệu thực đang bay và dữ liệu ứng dụng chưa đưa vào socket.
- Đọc `ss -tin`, scale của TCP window và trace zero window mà không đồng nhất buffer socket với số byte payload được phép gửi.
- Dựng đối chứng thay kích thước buffer trên cùng đường, đo goodput và chỉ ra giới hạn nào có bằng chứng đang tác động.
- Giải thích slow start, sự giảm cửa sổ sau tắc nghẽn và khác biệt cơ chế giữa CUBIC với BBR.
- Đề xuất thí nghiệm chọn thuật toán có điều kiện, nêu rõ phần chưa đo thay vì coi đổi BBR là cách chữa mọi kết nối chậm.

## 2. Triệu chứng

Bạn tải một file qua đường lab đặt **50 Mbit/s**, delay **40 ms mỗi chiều**, không gài mất gói. Chạy một luồng TCP CUBIC với `iperf3 -w 16K`, phía nhận chỉ báo **1,425–1,428 Mbit/s**. Cùng đường và cùng thuật toán, đổi cấu hình buffer thì kết quả đổi thành **20,989–21,790 Mbit/s với 256K; bỏ tùy chọn buffer thì đạt 42,044–47,357 Mbit/s**. Đường truyền không được nâng cấp giữa hai lượt.

Bản sửa đầu tiên là “CUBIC không hợp đường xa, đổi sang BBR”. Nó có thể thay đổi một nút điều khiển, nhưng chưa trả lời câu hỏi quan trọng hơn: sender đang chờ **phía nhận còn chỗ**, đang tự hạn chế để **đường truyền không quá tải**, hay ứng dụng không có byte để gửi? Ba trường hợp đều có thể trông giống “NIC chưa đầy”.

> **Đo trên lab.** Alpine 3.20 trong Docker/colima, Linux `6.8.0-64-generic` aarch64, iperf3 `3.17.1`, một luồng từ `10.17.0.1` tới `10.17.0.2`. Delay/rate là tham số đặt ở qdisc, không coi RTT thực đúng tròn 80 ms. Ba lượt mỗi cấu hình, đo 8 s sau 1 s bỏ đầu; output ở `net-17/out/summary.txt`, trạng thái socket ở `out/ss-*.txt`. Đo lại bằng `~/projects/net-lab/net-17/run.sh`.

[Bài 16](net-16-tcp-ben-trong.md) đã theo byte thiếu, ACK và truyền lại. Ở đây không gài mất dữ liệu để bắt đầu từ một nguyên nhân khác: **bao nhiêu byte được phép đi trước khi có phản hồi?** Nếu giới hạn này nhỏ, đường có thêm băng thông cũng có thể để trống vì sender đã gửi hết phần được phép và phải chờ.

## ⏸ Dừng lại — đoán trước #1

**Bài toán giả định**, không phải số đo: đường 50 Mbit/s, RTT 80 ms, chỉ cho phép 32 KiB dữ liệu chưa ACK cùng lúc, bỏ mọi overhead và mọi giới hạn khác. Trần tốc độ theo cửa sổ gần giá trị nào nhất?

(a) 50 Mbit/s vì không có loss.
(b) 3,28 Mbit/s vì mỗi vòng phản hồi chỉ chuyển tiếp được một lượng hữu hạn.
(c) 25 Mbit/s vì TCP có hai chiều.
(d) Không tính được bất kỳ giới hạn nào nếu chưa biết CPU.

## 3. Cơ chế

### 3.1 BDP: gửi đủ dữ liệu để không bỏ trống thời gian chờ

Đáp án là **(b)** trong mô hình đã nêu. **BDP — Bandwidth-Delay Product — là tích tốc độ đường với độ trễ khứ hồi, biểu diễn lượng dữ liệu cần đang bay để duy trì tốc độ ấy trong lúc chờ ACK.** Ở đây dùng bit/s nhân giây rồi chia 8 để ra byte; dùng RTT thay vì one-way delay vì sender cần vòng phản hồi quay về để mở tiếp lượt gửi.

Với 50 Mbit/s và 80 ms giả định, `50.000.000 × 0,08 / 8 = 500.000 byte`. Nếu cửa sổ chỉ cho 32 KiB, sender gửi được khoảng ấy rồi chờ ACK trước khi tiếp tục; trần xấp xỉ `32 × 1024 × 8 / 0,08 = 3.276.800 bit/s`, tức **3,2768 Mbit/s**. Đây là trần theo mô hình cửa sổ, không phải kết quả bảo đảm của `iperf3 -w 16K`. Cấu hình buffer 16K không đồng nghĩa advertised window đúng 32 KiB: kernel còn kế toán bộ nhớ, scale, chính sách window và hàng đợi.

> **Suy luận.** Công thức `goodput ≤ cửa_sổ_hữu_hiệu / RTT` suy từ giới hạn byte chưa ACK và vòng phản hồi khi luồng dài hạn gửi liên tục, không xét chi tiết hồi phục. RFC 5681 §2–3 quy định giới hạn theo cwnd/rwnd; phép chia trên là mô hình suy ra từ đó, không phải benchmark hay công thức dự báo chính xác từng khoảng một giây. [RFC 5681](https://www.rfc-editor.org/rfc/rfc5681.txt).

Tại 50 Mbit/s, phát 32 KiB chỉ mất **5,24 ms** theo giả định. Nếu phải chờ hết vòng 80 ms mới phát tiếp, đường bị bỏ trống trong phần còn lại. Không loss không đồng nghĩa luôn đủ dữ liệu được phép gửi.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300" role="img" aria-labelledby="net17-bdp-t net17-bdp-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net17-bdp-t">Cửa sổ nhỏ không đủ lấp đường có trễ</title>
<desc id="net17-bdp-d">Hai thanh cùng tỷ lệ byte: BDP 500000 byte và cửa sổ giả định 32768 byte.</desc>
<text x="20" y="28" font-size="14" text-anchor="start" fill="currentColor">50 Mbit/s × 80 ms / 8 = 500.000 byte</text><text x="20" y="65" font-size="14" text-anchor="start" fill="currentColor">Lượng cần đang bay theo BDP danh định</text><rect x="20" y="80" width="460" height="35" rx="4" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="250" y="103" font-size="14" text-anchor="middle" fill="currentColor">500.000 byte</text><text x="20" y="155" font-size="14" text-anchor="start" fill="currentColor">Cửa sổ hữu hiệu 32 KiB (giả định)</text><rect x="20" y="170" width="30.15" height="35" rx="4" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="70" y="194" font-size="14" text-anchor="start" fill="currentColor">32.768 byte = 6,55% BDP</text><text x="20" y="249" font-size="14" text-anchor="start" fill="currentColor">Cùng tốc độ đường; lượng được gửi khác nhau.</text><text x="20" y="275" font-size="14" text-anchor="start" fill="currentColor">Thanh ngắn hết trước khi ACK quay về.</text>
</svg>

Hình dùng **tham số lab**, còn 500.000 byte và tỷ lệ lấp là phép tính theo RTT danh định 80 ms. Nó vẽ lượng byte đang bay theo đoạn dài, không vẽ buffer router phải lớn đúng bằng BDP. BDP là lượng cần trên toàn đường phản hồi để duy trì tốc độ; buffer ở nút nghẽn giữ phần xếp hàng thêm, không phải toàn bộ những byte đang lan truyền trên các link.

Phân biệt đơn vị từ đầu: **Mbit/s** ở đây dùng hệ thập phân, `1 Mbit/s = 1.000.000 bit/s`; **KiB** là `1024 byte`. Ghi “500 KB” mà lúc tính lại dùng 512.000 byte sẽ làm dự báo lệch dù cơ chế đúng.

### 3.2 Hai cửa sổ bảo vệ hai chỗ khác nhau

**Flow control** là điều khiển để sender không gửi vượt khả năng tiếp nhận đã được receiver quảng bá. **Receive window — rwnd — là khoảng dung lượng nhận được phía bên kia báo trong TCP**, tính từ mép ACK theo quy tắc window. Khi app đọc không kịp và chỗ chứa khả dụng thu hẹp, receiver có thể quảng bá cửa sổ nhỏ hơn; sender không được lờ thông tin đó dù đường mạng còn rảnh.

**Congestion control** là điều khiển lượng/tốc độ gửi để phản ứng với năng lực đường truyền và tín hiệu tắc nghẽn. **Congestion window — cwnd — là giới hạn nội bộ phía gửi cho dữ liệu đang bay.** Nó không nằm trong trường `win` của TCP header. Sender duy trì nó theo thuật toán được chọn, nên xem pcap thấy `win 500` không có nghĩa đã đọc được cwnd 500 segment.

**Flight size** là lượng dữ liệu đã gửi nhưng chưa được ACK tích lũy. Trong mô hình cơ sở, trần dữ liệu đang bay là `min(cwnd, rwnd)` và dung lượng có thể gửi mới xấp xỉ `max(0, min(cwnd,rwnd) − flight)`. Cả hai cửa sổ phải đổi về **byte** trước khi so sánh; `ss` báo cwnd theo segment, nên cần nhân MSS phù hợp. Khi SACK/recovery đang hoạt động, stack còn có kế toán chi tiết vùng đã nhận và vùng cần gửi lại; đừng áp công thức đơn giản cho mọi quyết định từng packet.

> **Nguồn.** RFC 5681 §3: *“The minimum of cwnd and rwnd governs data transmission.”* ([RFC 5681](https://www.rfc-editor.org/rfc/rfc5681.txt)). Phần nhỏ nhất thắng vì mỗi giới hạn bảo vệ một tài nguyên khác: buffer nhận và năng lực đường; tăng riêng giới hạn đang lớn hơn không gỡ giới hạn đang nhỏ hơn.

**App-limited** nghĩa là ứng dụng chưa cung cấp đủ dữ liệu để tận dụng phần gửi đang được cho phép. Cwnd và rwnd cùng lớn vẫn không sinh ra payload. **Pacing** là giãn lịch phát packet theo tốc độ thay vì dồn toàn bộ cửa sổ thành một burst; nó bổ sung giới hạn theo thời gian, nên “còn cửa sổ” cũng chưa có nghĩa packet phải rời máy ngay lập tức.

Sau cơ chế mới dùng bảng để đọc bằng chứng:

| Đại lượng | Bảo vệ/đo gì | Đọc ở đâu | Chỗ dễ nhầm |
|---|---|---|---|
| rwnd | Khả năng tiếp nhận bên kia quảng bá | `win` cùng scale trong pcap, `snd_wnd` ở sender khi có | Không phải luôn bằng SO_RCVBUF |
| cwnd | Lượng sender cho phép trên đường | `ss -tin` ở sender | Không phải trường TCP header; thường theo segment |
| flight | Dữ liệu thực chưa ACK tích lũy | Sequence/ACK và state sender | Có thể nhỏ hơn cả hai cửa sổ |
| send/receive buffer | Bộ nhớ socket được kernel kế toán | Socket option, `ss -m` | Có overhead, không đổi thẳng sang payload window |
| pacing rate | Nhịp phát packet được lập lịch | `ss -tin`, thuật toán và qdisc | Giá trị trần không phải goodput đã đạt |

[ss(8)](https://man7.org/linux/man-pages/man8/ss.8.html) giải thích các field TCP cơ bản. Trường mở rộng như `rwnd_limited` còn phụ thuộc phiên bản; lab lưu output đầy đủ để đối chiếu.

### 3.3 Window scaling mở rộng thước đo, không tự tạo bộ nhớ

Trường window TCP có 16 bit; không scale thì giá trị tối đa là **65.535 byte**. Ở RTT 80 ms giả định, trần theo cửa sổ này chỉ khoảng **6,5535 Mbit/s**. **Window Scale** là tùy chọn thương lượng khi bắt tay để diễn giải trường window của các segment sau SYN bằng cách dịch trái một số bit. Với giá trị trên header W và shift S, window được diễn giải là `W × 2^S`. [RFC 7323 §2](https://www.rfc-editor.org/rfc/rfc7323.txt).

Ví dụ **giả định** `win 4096` với shift 7 nghĩa là `4096 × 128 = 524.288 byte`. Nó khác `win 4096` khi không scale. Shift có hướng: scale do S đưa trong SYN dùng để giải mã window S quảng bá sau đó; scale do C đưa dùng cho window C quảng bá. Không lấy một scale áp chung hai chiều. Window trong chính SYN/SYN-ACK **không được scale**.

Scale không tự tạo buffer hay tăng cwnd. Đổi cấu hình cần thử kết nối mới: nó không viết lại tùy chọn đã thương lượng ở SYN cũ.

Trên Linux, `tcp_moderate_rcvbuf` điều khiển tự điều chỉnh receive buffer, chịu các giới hạn liên quan `tcp_rmem`. Ứng dụng đặt `SO_RCVBUF` có thể thay hành vi tự điều chỉnh của socket đó. Theo [socket(7), SO_RCVBUF](https://man7.org/linux/man-pages/man7/socket.7.html), Linux còn nhân đôi giá trị buffer được yêu cầu để kế toán; số trả về qua getsockopt không phải lời hứa lượng payload trong advertised window. [Tài liệu kernel `tcp_rmem`, `tcp_moderate_rcvbuf`](https://www.kernel.org/doc/html/v6.12/networking/ip-sysctl.html). Vì vậy lab so sánh `-w 16K`, `-w 256K` và không đặt `-w`, nhưng gọi chúng là **cấu hình buffer**, không gán thẳng “rwnd = 16 KiB”.

## ⏸ Dừng lại — đoán trước #2

Receiver dừng đọc socket trong 2 s, buffer đầy và gửi `win 0`. Trong thời gian ấy sender vẫn nhận ACK/probe response, nhưng không tiến dữ liệu mới. Đổi congestion control sang BBR có gỡ được nguyên nhân không?

(a) Có, BBR bỏ qua mọi cửa sổ receiver quảng bá.
(b) Không; phải làm receiver có chỗ nhận rồi quảng bá lại cửa sổ, bất kể dùng thuật toán tắc nghẽn nào.
(c) Có, tăng cwnd luôn cho phép vượt rwnd.
(d) Đây chắc chắn là packet loss vì ứng dụng bị đứng.

### 3.4 Zero window là phía nhận nói dừng, không phải router im lặng

Đáp án là **(b)**. **Zero window** là receiver quảng bá cửa sổ nhận bằng 0, yêu cầu sender dừng gửi dữ liệu mới theo cửa sổ thông thường. TCP có cơ chế probe để tránh kẹt mãi nếu thông báo mở lại window bị mất; việc có những packet probe/ACK trong giai đoạn ấy không chứng minh ứng dụng vẫn đang tiêu thụ payload. Cơ chế zero-window probing nằm trong [RFC 9293 §3.8.6.1](https://www.rfc-editor.org/rfc/rfc9293.txt); bản nguồn được lưu riêng trong thư mục lab.

Lab ở §4.4 làm app server ngủ 2 s sau accept, với receive buffer được chủ động đặt nhỏ. Cửa sổ đóng trong khi sender còn dữ liệu trong hàng đợi; khi app đọc trở lại, receiver quảng bá chỗ trống và luồng tiến tiếp. Không có luật drop để gỡ, không thay tuyến, không đổi thuật toán. Hình theo đúng hai endpoint và thứ tự sự kiện từ capture, bỏ bớt các segment trung gian để thấy quan hệ nhân quả.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 390" role="img" aria-labelledby="net17-zero-t net17-zero-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net17-zero-t">Ngừng đọc làm cửa sổ đóng rồi mở lại</title>
<desc id="net17-zero-d">Hai endpoint cố định. Thanh độ đầy tăng tới đầy rồi thay bằng chỗ nhận được giải phóng khi app đọc.</desc>
<defs><marker id="net17-zero-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="currentColor"/></marker></defs><text x="70" y="28" font-size="14" text-anchor="middle" fill="currentColor">C · 10.17.0.1</text><text x="440" y="28" font-size="14" text-anchor="middle" fill="currentColor">S · 10.17.0.2</text><path d="M70 45 V300 M440 45 V300" stroke="currentColor" stroke-dasharray="5 5"/><text x="20" y="325" font-size="13" text-anchor="start" fill="currentColor">Receive buffer S · mô hình độ đầy</text>
<g data-step="1">
<path d="M70 88 L440 88" stroke="currentColor" fill="none" marker-end="url(#net17-zero-arr)"/><text x="255" y="72" font-size="14" text-anchor="middle" fill="currentColor">Dữ liệu → S chưa đọc</text>
</g>
<g data-step="2">
<path d="M440 155 L70 155" stroke="currentColor" fill="none" marker-end="url(#net17-zero-arr)"/><text x="255" y="138" font-size="14" text-anchor="middle" fill="currentColor">Window = 0</text>
</g>
<g data-step="3">
<path d="M440 220 L70 220" stroke="currentColor" fill="none" marker-end="url(#net17-zero-arr)"/><text x="255" y="201" font-size="14" text-anchor="middle" fill="currentColor">App đọc → window mở lại</text>
</g>
<g data-step="4">
<path d="M70 282 L440 282" stroke="currentColor" fill="none" marker-end="url(#net17-zero-arr)"/><text x="255" y="264" font-size="14" text-anchor="middle" fill="currentColor">Dữ liệu tiếp tục →</text>
</g>
<g data-step="1" data-until="1">
<rect x="20" y="340" width="180" height="28" rx="4" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/>
</g>
<g data-step="2" data-until="2">
<rect x="20" y="340" width="440" height="28" rx="4" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/>
</g>
<g data-step="3">
<rect x="20" y="340" width="440" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="240" y="360" font-size="14" text-anchor="middle" fill="currentColor">Đã đọc bớt: có chỗ nhận</text>
</g>
</svg>
<step-note data-step="1">App dừng đọc sau accept; các byte tới phải nằm lại trong buffer.</step-note>
<step-note data-step="2">Receiver quảng bá cửa sổ bằng 0. Sender không được dùng cwnd lớn để vượt giới hạn này.</step-note>
<step-note data-step="3">Đọc socket giải phóng chỗ nhận, tạo điều kiện quảng bá lại cửa sổ. Trạng thái đầy cũ biến mất.</step-note>
<step-note data-step="4">Dữ liệu tiếp tục đi trên cùng kết nối, không cần đổi congestion control. Thanh buffer biểu diễn định tính, không phải sample byte đã đo.</step-note>
</step-flow>

`rwnd_limited` là thời gian tích lũy bị giới hạn bởi receiver window. Window nhỏ cũng gây giới hạn mà không cần về 0; một `win 0` thoáng qua chưa đủ giải thích cả lượt tải.

Nếu receiver chậm vì event loop bị chặn, disk ghi không kịp hoặc app cố ý tạo backpressure, tăng buffer có thể trì hoãn lúc đầy nhưng không làm tăng năng lực tiêu thụ lâu dài. Đây là **suy luận về hàng đợi**, không phải các nguyên nhân đã được đo trong lab ngủ chủ động. Cần instrumentation ở receiver để biết app ngừng đọc vì lý do nào; pcap một mình không đọc được stack trace của ứng dụng.

### 3.5 Slow start: học đường bằng phản hồi, không mở ngay cả BDP

Sender mới chưa biết đường có thể chịu bao nhiêu dữ liệu cùng lúc. **Slow start** là pha tăng cwnd theo phản hồi xác nhận dữ liệu mới, thay vì khởi đầu bằng một lượng tùy ý đủ lấp đường nhanh nhất mà ta mong muốn. **ssthresh** là ngưỡng dùng để quyết định chuyển giữa slow start và congestion avoidance. Trong mô hình RFC 5681, cwnd dưới ngưỡng dùng slow start; khi vượt ngưỡng dùng congestion avoidance, tại bằng ngưỡng có lựa chọn theo chuẩn. [RFC 5681 §3.1](https://www.rfc-editor.org/rfc/rfc5681.txt).

Mô hình **giả định**, mỗi segment được ACK riêng, không delayed ACK, không loss, không giới hạn receiver, chưa gặp ssthresh: cwnd 10 segment có thể tăng thành 20, 40, 80 qua các vòng phản hồi. Tăng gần theo cấp số nhân qua RTT, nên tên “slow” không có nghĩa tăng tuyến tính một segment mỗi RTT. ACK policy, byte counting, giới hạn receiver và triển khai làm đường thực khác dãy gấp đôi ấy.

Tại sao dùng 10 trong ví dụ? RFC 6928 cho phép tăng initial window tới `min(10 × MSS, max(2 × MSS, 14600))` byte; đó là một lựa chọn được mô tả trong tài liệu Experimental, **không phải mọi TCP bắt buộc bắt đầu ở 10 segment**. Với MSS 1200 byte, trần theo biểu thức là 12.000 byte. Lab không suy IW từ dãy lý tưởng; muốn đo IW cần capture đầu flow và đếm byte trước phản hồi thích hợp. [RFC 6928 §2](https://www.rfc-editor.org/rfc/rfc6928.txt).

<auto-anim data-dur="8">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 335" role="img" aria-labelledby="net17-slow-t net17-slow-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net17-slow-t">Cửa sổ tăng qua các vòng phản hồi</title>
<desc id="net17-slow-d">Đường mô hình từ 10 tới 20,40,80 segment qua ba vòng RTT, không phải trace kernel.</desc>
<defs><marker id="net17-slow-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="currentColor"/></marker></defs><text x="20" y="25" font-size="14" text-anchor="start" fill="currentColor">Mô hình: ACK riêng, không loss, rwnd đủ</text><path d="M60 45 V270 H470" stroke="currentColor" fill="none"/><circle cx="80" cy="245" r="4" fill="currentColor"/><text x="80" y="233" font-size="14" text-anchor="middle" fill="currentColor">10</text><text x="80" y="292" font-size="13" text-anchor="middle" fill="currentColor">0</text><circle cx="200" cy="220" r="4" fill="currentColor"/><text x="200" y="208" font-size="14" text-anchor="middle" fill="currentColor">20</text><text x="200" y="292" font-size="13" text-anchor="middle" fill="currentColor">1</text><circle cx="320" cy="170" r="4" fill="currentColor"/><text x="320" y="158" font-size="14" text-anchor="middle" fill="currentColor">40</text><text x="320" y="292" font-size="13" text-anchor="middle" fill="currentColor">2</text><circle cx="440" cy="70" r="4" fill="currentColor"/><text x="440" y="58" font-size="14" text-anchor="middle" fill="currentColor">80</text><text x="440" y="292" font-size="13" text-anchor="middle" fill="currentColor">3</text><path d="M80 245 L200 220 L320 170 L440 70" fill="none" stroke="currentColor" stroke-width="2"/><text x="20" y="52" font-size="13" text-anchor="start" fill="currentColor">segment</text><text x="470" y="317" font-size="13" text-anchor="end" fill="currentColor">Vòng RTT</text><circle cx="80" cy="245" r="8" fill="#3b82f6"><animate attributeName="cx" values="80;200;320;440;80" keyTimes="0;0.25;0.5;0.75;1" dur="8s" repeatCount="indefinite"/><animate attributeName="cy" values="245;220;170;70;245" keyTimes="0;0.25;0.5;0.75;1" dur="8s" repeatCount="indefinite"/></circle>
</svg>
</auto-anim>

**Suy luận theo mô hình**, hình không phải sample cwnd đo từ kernel. Trục ngang là vòng RTT, trục dọc là segment. Chu kỳ phát hình 8 s chỉ để đọc, không ánh xạ sang RTT thực. Khi cwnd vượt ngưỡng hoặc có tín hiệu tắc nghẽn, không được kéo dài dãy gấp đôi vô hạn.

Hệ quả với backend: một response ngắn có thể kết thúc trước khi flow có thời gian tăng tới BDP; mở connection mới cho từng lượt làm lặp lại pha khởi động. Kết nối dùng lại có thể tránh handshake và hưởng state đang có, nhưng sau idle hoặc điều kiện mạng đổi không được giả định cwnd giữ nguyên mãi. Đây là lý do cần phân biệt “tốc độ tải file dài” với “latency response ngắn”, không dùng một benchmark thay cho cả hai.

### 3.6 CUBIC và BBR khác ở tín hiệu điều khiển

**CUBIC** là thuật toán congestion control dùng hàm bậc ba theo thời gian để đặt mục tiêu cwnd trong congestion avoidance, với vùng tăng chậm gần đỉnh cũ và tăng xa đỉnh theo hình dạng hàm. Sau một congestion event, nó giảm cửa sổ rồi dò lại mức đã đạt; phần tăng còn có nhánh thân thiện với Reno, nên đường cwnd thực không đơn giản chỉ là vẽ một đa thức trong mọi pha. [RFC 9438 §4](https://www.rfc-editor.org/rfc/rfc9438.txt).

Trong công thức chuẩn, `W_cubic(t) = C × (t − K)^3 + W_max`. W_max là mốc cửa sổ liên quan trước giảm, K đặt thời điểm đường cong quay tới mốc đó, C là tham số tăng. Chuẩn khuyến nghị `C = 0,4`, `beta_cubic = 0,7`; Figure 5 dùng `ssthresh = flight_size × 0,7`, rồi cập nhật cwnd với mức sàn theo loại tín hiệu. Vì flight có thể nhỏ hơn cwnd, không diễn giải thành “mọi lần đều còn 70% cwnd cũ”, cũng không áp hệ số 1/2 của Reno sang CUBIC. [RFC 9438 §4.2–4.3, §4.6, §5.1](https://www.rfc-editor.org/rfc/rfc9438.txt).

**BBR — Bottleneck Bandwidth and Round-trip propagation time — xây mô hình bandwidth nút nghẽn và RTT nền để điều khiển tốc độ gửi cùng lượng đang bay.** Bài dùng mã `tcp_bbr.c` Linux v6.12 làm tham khảo cho BBR thế hệ đầu, không đại diện mọi phiên bản.

Mã này ước lượng tốc độ giao dữ liệu từ ACK, giữ một ước lượng RTT tối thiểu, rồi tính pacing rate từ bandwidth estimate và hệ số gain. Cwnd cũng gắn với tích bandwidth và min RTT, cùng các giới hạn khác. Nó có STARTUP để tăng tốc, DRAIN để rút hàng đợi sau khởi động, rồi các pha dò bandwidth và RTT. Nguyên nhân gốc của khác biệt với CUBIC là cách xây quyết định từ mô hình delivery rate/RTT thay vì cùng một quy luật tăng cwnd rồi phản ứng giảm theo congestion event. [Mã nguồn Linux v6.12, phần chú thích đầu file](https://raw.githubusercontent.com/torvalds/linux/v6.12/net/ipv4/tcp_bbr.c).

BBR vẫn cần ACK, truyền lại dữ liệu và tôn trọng rwnd. Chú thích mã nguồn cũng nêu điều chỉnh khi có loss hoặc nghi có **policer** — cơ chế đánh dấu/loại packet vượt mức hợp đồng, thay vì giữ chờ như shaper. Vì vậy “BBR bỏ qua mọi loss” là kết luận sai.

| Khía cạnh | CUBIC theo RFC 9438 | BBR theo mã Linux v6.12 đã tải |
|---|---|---|
| Đại lượng dẫn đường | Mục tiêu cwnd tăng theo hàm thời gian, congestion event và nhánh Reno | Mô hình delivery bandwidth/min RTT, pacing gain và cwnd |
| Khi dữ liệu mất | TCP hồi phục; congestion response điều chỉnh cửa sổ theo pha | TCP vẫn hồi phục; điều khiển có các xử lý loss/policer riêng |
| Receiver quảng bá nhỏ | Vẫn bị rwnd giới hạn | Vẫn bị rwnd giới hạn |
| Muốn đánh giá | Goodput, loss, RTT khi tải, fairness và thời gian flow | Cùng bộ tiêu chí, ghi chính xác phiên bản thuật toán/kernel |

> **Chưa đo.** Bài chưa đo fairness, mất theo cụm, policer hoặc BBRv2/v3; chỉ so một luồng không loss, cùng rate/delay/MSS và buffer mặc định.

### 3.7 Buffer lớn hơn cũng có thể làm thời gian chờ dài hơn

**Bufferbloat** là độ trễ hàng đợi tăng do giữ quá nhiều packet chờ ở nút nghẽn, khiến tương tác phải chờ sau dữ liệu tải. BDP giúp tính lượng trên đường; nó không cho phép cộng thêm buffer vô hạn mà không trả latency. Theo mô hình một hàng đợi phục vụ đều, thời gian chờ phần dữ liệu xếp trước là `bytes_queued × 8 / rate`.

Ví dụ **suy luận giả định**: tại 50 Mbit/s, 500.000 byte xếp trước một packet tạo khoảng 80 ms chờ thêm ở hàng đợi đó. Cộng nó vào RTT nền 80 ms thì RTT có thể thành khoảng 160 ms nếu các điều kiện mô hình giữ nguyên và chỉ một chiều mang hàng đợi ấy. Đây là số tính, **lab chưa tạo phép đo bufferbloat riêng**, không gọi ping trước thử tải là RTT lúc queue đầy.

Thứ tự khoanh vùng: RTT nền → app có dữ liệu → rwnd/cwnd cùng đơn vị → queue/loss → thuật toán. Tăng receive buffer để gỡ rwnd nhỏ khác với tăng queue router để khỏi drop: thao tác sau có thể làm latency tăng.

## 4. Lab

### 4.1 Dựng đúng một luồng, không đem tổng nhiều luồng thay thế

Bộ lab ở `~/projects/net-lab/net-17/`. `run.sh` tạo rồi dọn container `net17-lab`, hai namespace `net17-c`/`net17-s`, veth c0–s0, địa chỉ `10.17.0.1/24` và `10.17.0.2/24`. Các script và log đi cùng trong thư mục ấy; privileged phục vụ dựng namespace trong container.

```bash
cd ~/projects/net-lab/net-17
./run.sh
cat out/state.txt
cat out/ping.txt
```

Trích `out/state.txt` và `out/ping.txt`:

```text
net.ipv4.tcp_available_congestion_control = reno cubic
net.ipv4.tcp_rmem = 4096	131072	6291456
net.ipv4.tcp_wmem = 4096	16384	4194304
net.ipv4.tcp_moderate_rcvbuf = 1
round-trip min/avg/max = 93.643/117.975/163.162 ms
```

Thấy gì: RTT thực không bằng đúng tổng hai delay cấu hình, và danh sách thuật toán ban đầu chưa có BBR. Vì sao: VM, timer và lịch xử lý cộng thêm chi phí ngoài delay cấu hình. Danh sách ban đầu chỉ phản ánh lúc đọc; §4.5 kiểm BBR trên socket thật. Các phép tính 80 ms ở §3 là theo tham số danh định, không thay cho RTT đo; khi dự báo một flow cụ thể, dùng số đo cùng điều kiện tải.

### 4.2 Đặt buffer nhỏ trước để bản sửa “đổi thuật toán” lộ thiếu bằng chứng

Cấu hình qdisc trong container:

```bash
ip netns exec net17-c tc qdisc add dev c0 root \
  netem delay 40ms rate 50mbit limit 10000
ip netns exec net17-s tc qdisc add dev s0 root \
  netem delay 40ms limit 10000
ip netns exec net17-c iperf3 -c 10.17.0.2 \
  -C cubic -M 1200 -w 16K -t 8 -O 1 -J
```

Script chạy ba lượt 16K, ba lượt 256K rồi ba lượt không đặt `-w`. Theo [tài liệu iperf3, `--window`](https://software.es.net/iperf/invoking.html), iperf3 áp buffer option ở các socket của phép thử, vì thế thay `-w` **không cô lập chỉ receive buffer**. Muốn kết luận “nguyên nhân duy nhất là rwnd” phải đối chiếu state hoặc dựng phép thử chỉ thay option bên receiver. Cách trình bày đúng ở đây là: cấu hình buffer nhỏ làm throughput bị giới hạn; `ss` cho bằng chứng giới hạn receiver window trong những mẫu đã lấy.

`out/summary.txt`, output nguyên bản:

```text
window=16K run=1 receiver_Mbit_s=1.427 retransmits=0
window=16K run=2 receiver_Mbit_s=1.425 retransmits=0
window=16K run=3 receiver_Mbit_s=1.428 retransmits=0
window=256K run=1 receiver_Mbit_s=20.989 retransmits=0
window=256K run=2 receiver_Mbit_s=21.790 retransmits=0
window=256K run=3 receiver_Mbit_s=21.133 retransmits=0
window=auto run=1 receiver_Mbit_s=42.044 retransmits=0
window=auto run=2 receiver_Mbit_s=47.313 retransmits=0
window=auto run=3 receiver_Mbit_s=47.357 retransmits=0
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 290" role="img" aria-labelledby="net17-rate-t net17-rate-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net17-rate-t">Buffer thay đổi, cùng CUBIC cho goodput khác</title>
<desc id="net17-rate-d">Ba thanh tỷ lệ với trung bình mỗi nhóm; không phải khoảng tin cậy.</desc>
<text x="20" y="25" font-size="14" text-anchor="start" fill="currentColor">CUBIC · trung bình 3 lượt · Mbit/s</text><text x="20" y="78" font-size="14" text-anchor="start" fill="currentColor">16K</text><rect x="90" y="58" width="9.99" height="28" rx="4" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="435" y="78" font-size="14" text-anchor="start" fill="currentColor">1,427</text><text x="20" y="138" font-size="14" text-anchor="start" fill="currentColor">256K</text><rect x="90" y="118" width="149.13" height="28" rx="4" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="435" y="138" font-size="14" text-anchor="start" fill="currentColor">21,304</text><text x="20" y="198" font-size="14" text-anchor="start" fill="currentColor">auto</text><rect x="90" y="178" width="319.0" height="28" rx="4" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="435" y="198" font-size="14" text-anchor="start" fill="currentColor">45,571</text><path d="M90 45 V245 H440" stroke="currentColor" fill="none"/><text x="90" y="269" font-size="13" text-anchor="middle" fill="currentColor">0</text><text x="440" y="269" font-size="13" text-anchor="middle" fill="currentColor">50</text>
</svg>

Đồ thị dùng trung bình ba lượt trong từng nhóm; các lượt riêng nằm ngay phía trên, không biểu diễn khoảng tin cậy.

Giữ nguyên CUBIC mà tốc độ đổi theo buffer đủ bác bỏ ý kiến rằng **bắt buộc đổi BBR mới gỡ được tình trạng này**. So 256K với auto còn cho thấy một mức buffer lớn hơn chưa chắc đã đủ; cần kiểm state và qdisc.

### 4.3 Đổi từ con số cấu hình sang bằng chứng socket

Script lấy mẫu `ss` sau khoảng 3 s kể từ đầu mỗi lượt. Lệnh cần chạy **khi flow còn tồn tại**:

```bash
ip netns exec net17-c ss -tin dst 10.17.0.2
```

Trích các field ở dòng flow dữ liệu từ `out/ss-16K-1.txt`, theo thứ tự xuất hiện; bỏ những field không dùng ở đây:

```text
wscale:0,0 rtt:96.49/11.343 mss:1188 cwnd:34
rwnd_limited:2471ms(93.5%) sndbuf_limited:1ms(0.0%) unacked:14 minrtt:80.68 snd_wnd:16632
```

Trích tương tự từ `out/ss-auto-1.txt`:

```text
wscale:7,7 rtt:82.15/0.232 mss:1188 cwnd:300
unacked:297 minrtt:80.619 snd_wnd:760576
```

Với 16K, `cwnd:34 × mss:1188 = 40.392 byte`, nhưng `snd_wnd:16632` nhỏ hơn; thời gian `rwnd_limited:2471ms(93.5%)` phù hợp với nhận định receiver-window constraint đang chi phối mẫu đó. Với auto, `cwnd:300 × 1188 = 356.400 byte`, thấp hơn `snd_wnd:760576`; `unacked:297` cho thấy có dữ liệu đang bay. Snapshot auto này còn trong quá trình biến đổi của flow, không chứng minh goodput cả lượt bằng tốc độ suy từ đúng sample đó. Hai socket điều khiển khác trong file có `app_limited`; không được lấy chúng làm bằng chứng luồng tải không có đủ dữ liệu.

`cwnd × MSS / RTT` là trần theo mô hình nếu cửa sổ ấy chi phối và có đủ dữ liệu, không phải tốc độ đã đạt. `rwnd_limited`/`sndbuf_limited` là thời gian tích lũy, không phải tỷ lệ packet mất; dùng các khoảng JSON để kiểm biến động theo thời gian.

### 4.4 Cho phía nhận ngừng đọc rồi quan sát window mở lại

`zero.py server` đặt `SO_RCVBUF=8192` trước listen, sau accept ngủ 2 s rồi đọc đến EOF. Client gửi 262.144 byte, half-close chiều ghi và chờ phía kia kết thúc để không đo mỗi thời gian copy vào send buffer. Half-close nghĩa là đóng riêng chiều gửi của socket; cơ chế FIN và đóng toàn phiên dành cho bài 18.

```bash
cat out/zero-server.txt
cat out/zero-client.txt
rg 'win 0|win 8192' out/zero-tcpdump.txt
cat out/ss-zero.txt
```

Trích output ứng dụng từ hai file `out/zero-server.txt`, `out/zero-client.txt`:

```text
SO_RCVBUF=16384
pause_read_seconds=2
total_received=262144
total_sent=262144 elapsed_seconds=5.415
```

Trích các dòng quyết định từ `out/zero-tcpdump.txt`, cùng flow dữ liệu:

```text
1794547705.362766 IP 10.17.0.2.8080 > 10.17.0.1.40522: Flags [.], ack 14481, win 0, options [nop,nop,TS val 2529213510 ecr 3376869102], length 0
1794547705.777152 IP 10.17.0.2.8080 > 10.17.0.1.40522: Flags [.], ack 14481, win 0, options [nop,nop,TS val 2529213932 ecr 3376869102], length 0
1794547706.870192 IP 10.17.0.2.8080 > 10.17.0.1.40522: Flags [.], ack 14481, win 7240, options [nop,nop,TS val 2529215015 ecr 3376869102], length 0
1794547706.920665 IP 10.17.0.1.40522 > 10.17.0.2.8080: Flags [P.], seq 14481:15929, ack 1, win 502, options [nop,nop,TS val 3376870758 ecr 2529215015], length 1448: HTTP
```

Zero window bắt đầu xuất hiện trong bản bắt tại `1794547705.362766`; window 7240 được quảng bá lại lúc `1794547706.870192`. Hiệu hai timestamp là **1507,426 ms**, không phải toàn bộ thời gian app ngủ 2 s: buffer phải nhận dữ liệu trước khi đầy. SYN-ACK của S quảng bá shift 0 nên window sau đó đọc trực tiếp theo byte. `SO_RCVBUF=16384` trong output là giá trị kernel trả về sau yêu cầu 8192, không phải window trong SYN-ACK (7240) hoặc lượng payload cuối cùng (262.144 byte). Label HTTP của tcpdump là suy đoán theo port; payload lab vẫn chỉ là byte `x`.

Thấy gì: receiver quảng bá zero window trong giai đoạn không đọc, sau đó có window update và nhận đủ dữ liệu khi đọc lại. Vì sao: nút nghẽn trong thí nghiệm nằm ở năng lực nhận ứng dụng đang bị cố ý dừng; tắc nghẽn không cần xảy ra ở router để sender phải chờ. Không gọi dòng zero-window probe là request ứng dụng bị retry.

### 4.5 Chọn BBR rồi xác nhận trên flow dữ liệu

Danh sách ban đầu chỉ có `reno cubic`, nhưng thử chọn BBR thành công. **Danh sách đang có không đủ chứng minh một module không thể được nạp khi yêu cầu.** Script kiểm tên thuật toán trong JSON và dòng socket dữ liệu; socket điều khiển iperf3 có thể vẫn ghi CUBIC. [Mã Linux v6.8 `tcp_cong.c`](https://raw.githubusercontent.com/torvalds/linux/v6.8/net/ipv4/tcp_cong.c) có đường yêu cầu nạp module theo tên.

```bash
cat out/bbr.txt
cat out/ss-bbr.txt
```

`out/bbr.txt`, nguyên văn:

```text
requested=bbr
sender_tcp_congestion=bbr
error=none
net.ipv4.tcp_available_congestion_control = reno cubic bbr
algorithm=bbr run=1 receiver_Mbit_s=47.340 retransmits=0
algorithm=bbr run=2 receiver_Mbit_s=47.309 retransmits=0
algorithm=bbr run=3 receiver_Mbit_s=47.337 retransmits=0
```

Ba lượt BBR dùng cùng `-M 1200 -t 8 -O 1`, buffer mặc định và qdisc như nhóm CUBIC auto. `check-bbr.sh` là lệnh chạy riêng phần BBR với cùng topology; `run.sh` chạy toàn bộ. **Đo trên lab**, kết quả ở trên xác nhận thuật toán đã được chọn và goodput trong điều kiện này, không tự xác nhận mọi chi tiết của binary kernel trùng mã tham khảo v6.12.

Trung bình ba lượt CUBIC auto là **45,571 Mbit/s**, BBR là **47,328 Mbit/s**. BBR chạy sau nhóm CUBIC, chưa đảo xen thứ tự và chưa có khoảng tin cậy, nên chưa kết luận mức chênh nhỏ là lợi thế tái lập. Mọi lượt đều không báo retransmits trong khoảng đo. Cả hai tiến gần rate cấu hình; goodput không bằng line rate do overhead và điều kiện lập lịch.

Chọn cho production cần thêm RTT khi tải, flow cạnh tranh và loss/policer thực tế; goodput một flow không thay fairness hoặc latency.

## 5. Tính tay

### 5.1 Tăng bandwidth có cứu cửa sổ nhỏ không?

**Đề giả định.** RTT 80 ms, cửa sổ hữu hiệu 32 KiB, luồng dài luôn có dữ liệu, không loss. Đường tăng từ 50 lên 100 Mbit/s. Trần theo cửa sổ đổi thế nào? Muốn duy trì 100 Mbit/s ở cùng RTT, cần tối thiểu bao nhiêu byte đang bay theo mô hình bỏ overhead?

**Lời giải — suy luận.** Trần cửa sổ vẫn `32768 × 8 / 0,08 = 3,2768 Mbit/s`; nâng đường không đổi thời gian phản hồi hoặc lượng cho phép gửi. BDP mới là `100.000.000 × 0,08 / 8 = 1.000.000 byte`. Đó là lượng đang bay cần thiết theo mô hình, không phải lệnh đặt mọi socket buffer thành đúng 1.000.000. Kernel phải có bộ nhớ và cơ chế quảng bá đủ, cwnd phải tăng tới mức cần thiết, ứng dụng phải cấp dữ liệu và đường phải thật sự phục vụ mức ấy.

### 5.2 Đọc scale rồi tính phần còn được gửi

**Đề giả định.** Receiver đã thương lượng shift 7; một ACK sau bắt tay mang `win 4096`. Sender có MSS 1200 byte, cwnd 300 segment, flight 240.000 byte. Bỏ pacing, loss và các giới hạn khác. Cửa sổ nào nhỏ hơn, còn được gửi mới tối đa bao nhiêu byte theo mô hình cơ sở?

**Lời giải — suy luận.** Rwnd `4096 × 2^7 = 524.288 byte`; cwnd `300 × 1200 = 360.000 byte`, nên cwnd nhỏ hơn. Phần còn lại `360.000 − 240.000 = 120.000 byte`, tương đương 100 segment đủ MSS theo đề. Nếu nhầm `win 4096` là 4096 byte sẽ chẩn đoán ngược thành flow control; nếu lấy cwnd 300 so trực tiếp với rwnd 524.288 lại mắc lỗi đơn vị.

### 5.3 Bao lâu mới gửi được một cửa sổ bằng BDP?

**Đề giả định.** BDP 500.000 byte như cấu hình danh định lab, MSS 1200 byte, IW 10 segment. Mỗi RTT cwnd gấp đôi, mọi segment ACK riêng, không loss, rwnd đủ và ssthresh chưa chặn. Sau ít nhất bao nhiêu vòng tăng cwnd mới đủ một cửa sổ bằng BDP? Có thể nói file bất kỳ sẽ tải xong sau đúng thời gian đó không?

**Lời giải — suy luận mô hình.** Cần ít nhất `ceil(500000/1200) = 417 segment`. Dãy bắt đầu 10, sau sáu lần gấp đôi thành 640; sau năm lần chỉ 320, nên cần **6 vòng tăng**, tương ứng `6 × 80 = 480 ms` từ mốc đã có IW trong mô hình. Đây là thời gian tới **mức cửa sổ**, không phải completion time: các vòng trước đã chuyển dữ liệu, còn tổng file, handshake, hàng đợi và vòng ACK cuối chưa được tính. Nếu đường đã đầy hoặc ngưỡng slow start buộc đổi pha trước mốc đó, giả thiết gấp đôi không còn đúng.

## 6. Chuyển giao

Các tình huống sau là giả định để tự suy; câu cuối không có lời giải trong bài.

1. Một flow đạt 8 Mbit/s, tám flow song song cộng lại đạt 50 Mbit/s. Vì sao chưa thể kết luận thuật toán TCP của một flow bị lỗi? Bạn sẽ kiểm window, app-limited, RTT và giới hạn theo flow thế nào?
2. Sau deploy, server bắt đầu gửi `win 0` trong vài trăm ms nhưng CPU trung bình chỉ 15%. Những số đo nào ở ứng dụng giúp phân biệt dừng đọc do event loop, ghi disk hay backpressure có chủ ý?
3. Một proxy kết thúc TCP rồi mở TCP khác tới origin. Client capture thấy rwnd tốt. Vì sao vẫn có thể có receiver-window bottleneck ở chặng sau, và cần đặt `ss` tại đâu?
4. Tăng receive buffer làm file tải đạt mục tiêu, nhưng tăng queue ở gateway làm tương tác SSH chậm. Giải thích hai kết quả bằng vị trí hàng đợi và phép đo RTT lúc tải, thay vì kết luận “buffer lớn là tốt/xấu”.
5. BBR tăng goodput trên một đường loss, nhưng bạn chưa đo flow CUBIC chạy cạnh nó. Phải thêm thí nghiệm và tiêu chí nào trước khi đổi mặc định toàn fleet, kể cả trường hợp goodput tổng không đổi?
6. **Câu khó nhất.** Proxy có hai chặng TCP với RTT/thuật toán khác nhau và trần RAM tổng. Chọn ba phép đo thường trực cùng một thí nghiệm ngắn để phân biệt receiver-limited, congestion, app-limited và bufferbloat; chỉ ra trường hợp vẫn mơ hồ. Phân bổ buffer/pacing theo số kết nối thế nào để giữ cả goodput lẫn latency, và khi nào hai mục tiêu không thể cùng đạt?

## 7. Tóm tắt

- Lượng đang bay cần cho tốc độ mục tiêu phụ thuộc bandwidth nhân RTT; 50 Mbit/s × 80 ms danh định tương ứng 500.000 byte theo mô hình bỏ overhead.
- Rwnd bảo vệ khả năng nhận, cwnd điều khiển tải đường; giới hạn cơ sở là giá trị nhỏ hơn, so sau khi đổi cùng đơn vị. [RFC 5681](https://www.rfc-editor.org/rfc/rfc5681.txt).
- Window Scale đổi cách giải mã window sau SYN, không tạo buffer, không tăng cwnd và không cho vượt giới hạn receiver. [RFC 7323](https://www.rfc-editor.org/rfc/rfc7323.txt).
- Trong lab, giữ CUBIC và thay cấu hình buffer đã làm goodput đổi; số đo cùng snapshot socket nằm trong `out/summary.txt` và `out/ss-*.txt`.
- Lab cố ý ngừng đọc tạo zero window, đọc lại thì tiến dữ liệu; đổi congestion control không thay việc receiver cần có chỗ nhận.
- Slow start tăng theo ACK, dãy gấp đôi là mô hình có điều kiện; initial window 10 segment không phải luật bắt buộc mọi TCP. [RFC 5681](https://www.rfc-editor.org/rfc/rfc5681.txt), [RFC 6928](https://www.rfc-editor.org/rfc/rfc6928.txt).
- CUBIC và BBR dùng cơ chế điều khiển khác; kiểm tên trên socket dữ liệu trước khi so kết quả. Danh sách thuật toán ban đầu chưa đủ chứng minh không dùng được BBR.

→ **Bài 18 — Đóng kết nối: TIME_WAIT, RST và keepalive**: sau khi dữ liệu được vận chuyển, ta theo dõi state còn lại lúc một đầu đóng, chết hoặc biến mất khỏi mạng.
