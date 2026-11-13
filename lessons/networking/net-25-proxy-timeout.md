# Bài 25 — Proxy và chuỗi timeout

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đặt từng timeout lên đúng chặng kết nối và đúng giai đoạn, rồi dự đoán thành phần nào bỏ cuộc trước.
- Dùng status, error log và thời gian upstream để tách chờ response header, upstream đóng sớm và client hết hạn.
- Chứng minh read timeout không phải deadline tổng bằng một response gửi từng phần lâu hơn timeout.
- Kiểm một pool có tái sử dụng socket hay không, và phân biệt socket cũ đã đóng với lỗi race lúc tái sử dụng.
- Xác lập ranh giới tin cậy cho `X-Forwarded-For` và PROXY protocol bằng phép thử gửi địa chỉ giả.
- Phân bổ ngân sách và quyền retry qua nhiều tầng mà không coi response lỗi là bằng chứng thao tác chưa thực hiện.

## 2. Triệu chứng

Backend mất **1,5 s** để tạo response. Bạn đặt timeout ở proxy trong là **3 s**, gọi trực tiếp qua nó nhận `200` sau **1,503 s**. Nhưng client ngoài vẫn nhận `504` sau **0,502 s**. Tăng timeout bên trong một lần nữa không đổi triệu chứng.

Cùng lab ấy có thêm hai dòng tưởng như mâu thuẫn: proxy read timeout **1 s**, nhưng một response mất **2,417 s** vẫn `200`; một endpoint khác lỗi `502` chỉ sau **0,001 s**, hoàn toàn chưa chạm timeout đọc. Nếu gom hết thành “backend chậm”, bạn sẽ sửa ba cơ chế khác nhau bằng cùng một nút.

> **Đo trên lab.** `net-lab/net-25/out/lab.txt`, Linux colima aarch64, Alpine 3.20, nginx 1.26.3, HTTP/1.1 loopback, không TLS, retries tắt. Dòng `INNER_DIRECT` là gọi riêng tới proxy trong; `CHAIN_OUTER_TIMEOUT` đi qua cả hai proxy. Đo lại: chạy `./run.sh` trong thư mục lab.

## ⏸ Dừng lại — đoán trước #1

Proxy ngoài đợi upstream tối đa 0,5 s trong khi backend chưa có response header cho tới khoảng 1,5 s. Đổi proxy trong từ 3 s lên một hạn lớn hơn sẽ làm gì?

- (a) Proxy ngoài tự nhận hạn mới của proxy trong và chờ theo.
- (b) Proxy ngoài vẫn có thể hết hạn trước; mỗi chặng đang có đồng hồ riêng.
- (c) Mọi response timeout bắt buộc là `502`, nên số đo `504` không thể đúng.
- (d) Backend tự hủy công việc đúng lúc proxy ngoài trả lỗi, không cần cơ chế nào khác.

## 3. Cơ chế

### 3.1 Có bao nhiêu đồng hồ trên một request?

Đáp án là **(b)**. Bài [[net-24-load-balancer]] đã đo rằng proxy nhận một connection và mở connection khác; connection phía client không quyết định vòng đời connection upstream. **Upstream là thành phần ở chặng kế tiếp mà proxy đang gọi để lấy response.** Với chuỗi client → proxy ngoài → proxy trong → app, proxy trong là upstream của proxy ngoài, app là upstream của proxy trong. Từ “upstream timeout” mà không ghi ai đang gọi ai sẽ thiếu nửa thông tin cần debug.

**Timeout là giới hạn chờ cho một hoạt động hoặc một khoảng không tiến triển; deadline là mốc cuối cho toàn bộ công việc theo một ngân sách đã định.** Một request có thể lần lượt chờ pool, kết nối, gửi body, đợi header rồi nhận body. Mỗi giai đoạn có thể có timer riêng; không có quy tắc phổ quát rằng một dòng `timeout=...` bao trùm tất cả. Cần đọc chính xác thư viện/sản phẩm, phiên bản và nơi cấu hình được áp dụng.

Trong nginx của lab, `proxy_connect_timeout` giới hạn lúc thiết lập kết nối upstream. `proxy_send_timeout` giới hạn khoảng giữa các lần ghi tới upstream; nó không phải thời gian gửi toàn bộ request. `proxy_read_timeout` giới hạn khoảng giữa các lần đọc response từ upstream; nó không đặt trần cho toàn bộ response. Các tên này cũng không phải idle timer của pool hay TCP keepalive của kernel. Bài [[net-18-dong-ket-noi]] đã tách TCP probe khỏi HTTP keep-alive; ở đây ta giữ khác biệt ấy khi đọc cấu hình proxy.

Lab dùng cùng một nginx với ba listener để cô lập các đồng hồ. Listener `8080` gọi app `9001`, read timeout 1 s. Listener `8081` cũng gọi app đó nhưng read timeout 3 s. Listener `8082` gọi `8081`, read timeout 0,5 s. Handler `/delay` ngủ 1,5 s trước khi gửi header. Khi đi `8082 → 8081 → app`, chặng ngoài không có dữ liệu để đọc trong cửa sổ của nó nên trả `504` trước. Khi gọi riêng `8081`, chặng đó đủ thời gian cho app trả `200`.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 415" role="img" aria-labelledby="net25-a-t net25-a-d" style="width:100%;max-width:700px;height:auto;display:block;margin:1.25rem auto">
<title id="net25-a-t">Outer hết hạn trước inner</title>
<desc id="net25-a-d">Request qua ba chặng; ngoài dừng ở 0,5 giây, app chỉ sẵn response ở khoảng 1,5 giây.</desc>
<defs><marker id="net25-a-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<rect x="20" y="30" width="120" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="80.0" y="57.0" font-size="14" text-anchor="middle" fill="currentColor">Client</text><line x1="80" y1="74" x2="80" y2="355" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><rect x="200" y="30" width="120" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="260.0" y="57.0" font-size="14" text-anchor="middle" fill="currentColor">Ngoài :8082</text><line x1="260" y1="74" x2="260" y2="355" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><rect x="380" y="30" width="120" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="440.0" y="57.0" font-size="14" text-anchor="middle" fill="currentColor">Trong :8081</text><line x1="440" y1="74" x2="440" y2="355" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><rect x="560" y="30" width="120" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="620.0" y="57.0" font-size="14" text-anchor="middle" fill="currentColor">App :9001</text><line x1="620" y1="74" x2="620" y2="355" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><g data-step="1"><path d="M80 110 L260 110" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net25-a-arr)"/><text x="170.0" y="98" font-size="14" text-anchor="middle" fill="currentColor">/delay</text><path d="M260 150 L440 150" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net25-a-arr)"/><text x="350.0" y="138" font-size="14" text-anchor="middle" fill="currentColor">read 0,5 s</text><path d="M440 190 L620 190" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net25-a-arr)"/><text x="530.0" y="178" font-size="14" text-anchor="middle" fill="currentColor">read 3 s</text></g><g data-step="1" data-until="1"><rect x="200" y="220" width="120" height="30" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="260.0" y="240.0" font-size="14" text-anchor="middle" fill="currentColor">đang đợi</text></g><g data-step="2"><rect x="200" y="220" width="120" height="30" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="260.0" y="240.0" font-size="14" text-anchor="middle" fill="currentColor">hết hạn</text><path d="M260 280 L80 280" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net25-a-arr)"/><text x="170.0" y="268" font-size="14" text-anchor="middle" fill="currentColor">504 ~0,5 s</text></g><g data-step="3"><circle cx="620" cy="330" r="6" fill="#10b981"/><text x="535" y="330" font-size="14" text-anchor="middle" fill="currentColor">mốc 1,5 s</text><text x="350" y="385" font-size="14" text-anchor="middle" fill="currentColor">Hạn của proxy trong chưa hết khi proxy ngoài đã bỏ chờ</text></g>
</svg>
<step-note data-step="1">Ba mũi tên đi qua ba connection; timer thuộc từng caller, không tự truyền từ trong ra ngoài.</step-note>
<step-note data-step="2">Trạng thái đang đợi đổi thành hết hạn trước khi app có header. Proxy ngoài tạo 504.</step-note>
<step-note data-step="3">Mốc 1,5 s là thời gian ngủ được cấu hình. Gọi riêng inner đo 200 sau 1,503 s; hình không khẳng định response còn truyền qua chuỗi đã bị hủy.</step-note>
</step-flow>

Như vậy tăng timeout trong app không mở rộng ngân sách của client hoặc proxy ngoài. Ngược lại, tăng hết mọi hạn có thể giữ socket và công việc lâu hơn khi dependency đang lỗi, mà chưa cải thiện khả năng hoàn thành. Trước khi sửa, hãy viết một dòng cho mỗi timer: **ai sở hữu; nhìn vào chặng nào; bắt đầu lúc nào; sự kiện nào đặt lại; hết hạn thì hủy cái gì**. Nếu thiếu mục cuối, request ở tầng ngoài có thể đã chết trong khi việc phía trong còn chạy.

| Timer của lab | Chặng được quan sát | Sự kiện liên quan | Không thay được thứ gì |
|---|---|---|---|
| Connect 200 ms ở `8080` | nginx → app | Thiết lập connection upstream | Tổng deadline của request |
| Read 1 s ở `8080` | app → nginx | Tiến triển đọc response | Idle lifetime của socket trong pool |
| Read 0,5 s ở `8082` | proxy trong → proxy ngoài | Tiến triển đọc response chặng ấy | Hạn 3 s của proxy trong |
| Pool idle 1 s | Socket upstream đang rảnh trong worker | Thời gian không tái sử dụng | Hạn chờ của request đang chạy |
| Backend idle 0,4 s | HTTP server chờ request kế tiếp | Không có request mới trên socket | Thời gian handler xử lý công việc hiện tại |



### 3.2 Bản sai chạy được: “read timeout 1 s, response không thể lâu hơn 1 s”

Cho app gửi header ngay rồi gửi **4 byte**, mỗi byte cách lần trước **0,6 s**, flush từng lần. Với read timeout 1 s, mỗi lần có tiến triển trước khi khoảng chờ đủ dài; tổng thời gian theo mô hình là `4×0,6=2,4 s`. Lab nhận đủ 4 byte, status `200`, đo 2,417 s. Vậy cấu hình đọc không tự cung cấp deadline tổng 1 s.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 280" role="img" aria-labelledby="net25-b-t net25-b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net25-b-t">Tổng thời gian khác khoảng im lặng</title>
<desc id="net25-b-d">Các điểm có khoảng cách 0,6 giây đều nhau; thanh 1 giây ngắn hơn tổng 2,4 giây.</desc>
<defs><marker id="net25-b-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<text x="20" y="25" font-size="14" text-anchor="start" fill="currentColor">4 phần cách nhau 0,6 s; read timeout 1 s</text><line x1="35" y1="115" x2="485" y2="115" stroke="currentColor"/><line x1="40" y1="107" x2="40" y2="123" stroke="currentColor"/><text x="40" y="145" font-size="14" text-anchor="middle" fill="currentColor">0,0</text><line x1="148" y1="107" x2="148" y2="123" stroke="currentColor"/><text x="148" y="145" font-size="14" text-anchor="middle" fill="currentColor">0,6</text><circle cx="148" cy="115" r="7" fill="#10b981"/><text x="148" y="90" font-size="14" text-anchor="middle" fill="currentColor">byte 1</text><line x1="256" y1="107" x2="256" y2="123" stroke="currentColor"/><text x="256" y="145" font-size="14" text-anchor="middle" fill="currentColor">1,2</text><circle cx="256" cy="115" r="7" fill="#10b981"/><text x="256" y="90" font-size="14" text-anchor="middle" fill="currentColor">byte 2</text><line x1="364" y1="107" x2="364" y2="123" stroke="currentColor"/><text x="364" y="145" font-size="14" text-anchor="middle" fill="currentColor">1,8</text><circle cx="364" cy="115" r="7" fill="#10b981"/><text x="364" y="90" font-size="14" text-anchor="middle" fill="currentColor">byte 3</text><line x1="472" y1="107" x2="472" y2="123" stroke="currentColor"/><text x="472" y="145" font-size="14" text-anchor="middle" fill="currentColor">2,4</text><circle cx="472" cy="115" r="7" fill="#10b981"/><text x="472" y="90" font-size="14" text-anchor="middle" fill="currentColor">byte 4</text><rect x="40" y="170" width="180" height="18" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="235" y="185" font-size="14" text-anchor="start" fill="currentColor">1 s: giới hạn im lặng</text><path d="M40 215 V225 H472 V215" stroke="currentColor" fill="none"/><text x="256" y="250" font-size="14" text-anchor="middle" fill="currentColor">2,4 s theo mô hình; đo tổng 2,417 s</text>
</svg>

**Streaming là cách gửi response thành các phần trước khi có toàn bộ nội dung.** Nó có thể giữ một read timeout chưa hết nhờ tiến triển định kỳ. Một stream gửi đều không tự có hạn tổng; nếu sản phẩm cần một mốc kết thúc bất kể tiến triển, phải có deadline hoặc cơ chế giới hạn tổng tương ứng. Ngược lại, đặt read timeout nhỏ hơn khoảng im lặng hợp lệ giữa các phần có thể cắt stream đang đúng nghiệp vụ.

> **Nguồn.** nginx ghi về `proxy_read_timeout`: *“The timeout is set only between two successive read operations”* ([proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_read_timeout)). Giá trị cấu hình không phải đồng hồ chính xác tới từng microsecond; dùng khoảng thử đủ tách biệt và đo lại trên runtime đang vận hành.

**Buffering là cơ chế proxy giữ dữ liệu upstream trong buffer trước hoặc trong lúc chuyển cho client.** Tiến triển mà proxy đọc được không nhất thiết trùng thời điểm client nhìn thấy một phần body. Lab đặt `proxy_buffering off` riêng cho `/stream` để giảm sự nhập nhằng ấy. Trong hệ thật, chỉ nhìn client không thấy byte mới chưa đủ kết luận proxy không nhận byte nào; phải đối chiếu cả phía upstream và cấu hình buffer/compression.

Cũng cần phân biệt timeout trước và sau khi response header đã gửi ra ngoài. Trước header, proxy còn có thể tạo một response lỗi như `504`. Sau khi đã gửi `200` và một phần body, nó không thể quay ngược byte đã gửi để thay status thành `504`. Client có thể thấy body bị cắt hoặc lỗi stream. Đây là **suy luận từ thứ tự gửi response**, chưa phải nhánh lỗi streaming đã đo trong bài. Đo ca ấy cần handler cố tình ngừng sau một phần body và client kiểm đủ độ dài, không chỉ đọc status.

### 3.3 `502` và `504` là kết quả của gateway, không phải root cause đầy đủ

Lab `/delay` chưa gửi header khi nginx hết read timeout: nginx tạo `504`. Lab `/close` chủ động đóng upstream socket trước response header: nginx tạo `502`. Một nhánh là chờ không có tiến triển đủ lâu; nhánh kia là đường response kết thúc mà chưa có response hợp lệ. Vì vậy `502` sau 0,001 s không đòi backend phải chạy quá hạn.

RFC 9110 §15.6.3 và §15.6.5 phân biệt invalid upstream response với không nhận response kịp thời tại gateway ([RFC 9110](https://www.rfc-editor.org/rfc/rfc9110#section-15.6.3)). DNS upstream lỗi, connect bị từ chối hoặc response malformed có thể cần các nhánh điều tra khác; bài không đo mọi nguyên nhân tạo cùng status.

**Error log** trong lab ghi giai đoạn, còn access log ghi kết quả và thời gian. Với `/delay` có cụm `upstream timed out` và `while reading response header from upstream`; với `/close` có `upstream prematurely closed connection` ở cùng giai đoạn đọc header. Cùng chưa có header nhưng lỗi chờ và lỗi đóng khác nhau; đừng xóa mất thông tin đó rồi đếm chung “5xx”.

`$upstream_connect_time` là thời gian kết nối upstream, `$upstream_header_time` là thời gian tới header upstream và `$upstream_response_time` là thời gian response theo phép đo của nginx; `$request_time` nhìn request ở proxy hiện tại. Các biến có thể chứa nhiều attempt và không phải mọi khoảng đều rời nhau để cộng trực tiếp. Lab tắt retries để một dòng tương ứng một attempt và giữ phân tích có thể kiểm được.

Không nhận được HTTP response lại là một quan sát khác: client có thể hết deadline rồi đóng socket trước khi proxy kịp trả. Một số phần mềm ghi mã nội bộ cho ca client rời đi; đó không phải status do client đã nhận trên dây. Khi báo sự cố hãy tách **status nhận ở client**, **status proxy ghi**, **upstream status**, **lỗi vận chuyển của client**. Ba nơi có thể ghi ba kết quả khác nhau cho cùng một đường gọi.

### 3.4 Pool giảm tạo kết nối, nhưng socket rảnh vẫn có vòng đời

**Connection pool là tập kết nối được giữ để tái sử dụng cho các lần gọi sau.** Trong lab, mỗi request từ client mở connection mới tới nginx, nhưng nginx có thể dùng lại connection tới app. Hai request `/echo` liên tiếp được app quan sát với cùng source port `49650`: đó là bằng chứng trong phép đo rằng chặng upstream đã được tái sử dụng, không phải bằng chứng client ngoài giữ nguyên TCP.

Để bật rõ ràng trên nginx 1.26.3, cấu hình upstream có `keepalive 4`, phía proxy dùng HTTP/1.1 và bỏ header `Connection` mặc định bằng `proxy_set_header Connection ""`. Nếu peer yêu cầu đóng sau response hoặc không xác định được ranh giới body, pool cũng không thể cứ giữ stream rồi đọc request kế tiếp tùy ý.

**Idle timeout là khoảng rảnh tối đa của kết nối trong ngữ cảnh đang xét.** Lab đặt app đóng khi chờ request kế tiếp quá 0,4 s, còn cache upstream của nginx cho giữ idle 1 s. Sau khi đợi 0,6 s, nginx nhận request mới, mở kết nối khác, app thấy port `49664`, response vẫn `200`. Khoảng timeout lệch **không đủ để suy ra chắc chắn có nginx 502**: nginx có thể đã nhận và xử lý sự kiện peer đóng trước khi chọn socket cũ.

Để cho bản sai chạy trước, lab có thêm một client pool thô: giữ socket, không theo dõi peer close, đợi 0,6 s rồi gửi lại. Nó đọc được EOF — end of file, dấu hiệu không còn byte từ phía peer — thay vì status HTTP. Đây là lỗi của client thô trong phép thử, không phải output nginx. Nó cho thấy vì sao state “tôi còn giữ đối tượng socket” không chứng minh peer còn nhận request.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 550 280" role="img" aria-labelledby="net25-c-t net25-c-d" style="width:100%;max-width:550px;height:auto;display:block;margin:1.25rem auto">
<title id="net25-c-t">Socket đổi vòng đời nhưng hai endpoint không đổi</title>
<desc id="net25-c-d">Tại cùng vị trí, active đổi thành idle, bị loại sau peer close rồi thay bằng connection mới.</desc>
<defs><marker id="net25-c-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<rect x="30" y="40" width="150" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="105.0" y="67.0" font-size="14" text-anchor="middle" fill="currentColor">nginx :8080</text><rect x="360" y="40" width="150" height="44" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="435.0" y="67.0" font-size="14" text-anchor="middle" fill="currentColor">App :9001</text><line x1="105" y1="84" x2="105" y2="235" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><line x1="435" y1="84" x2="435" y2="235" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><g data-step="1" data-until="1"><path d="M105 130 L435 130" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net25-c-arr)"/><text x="270.0" y="118" font-size="14" text-anchor="middle" fill="currentColor">port 49650</text><rect x="195" y="175" width="150" height="34" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="270.0" y="197.0" font-size="14" text-anchor="middle" fill="currentColor">active</text></g><g data-step="2" data-until="2"><path d="M105 130 L435 130" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net25-c-arr)"/><text x="270.0" y="118" font-size="14" text-anchor="middle" fill="currentColor">cùng socket</text><rect x="195" y="175" width="150" height="34" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="270.0" y="197.0" font-size="14" text-anchor="middle" fill="currentColor">idle</text></g><g data-step="3" data-until="3"><text x="270" y="130" font-size="14" text-anchor="middle" fill="currentColor">peer đã đóng</text><rect x="195" y="175" width="150" height="34" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="270.0" y="197.0" font-size="14" text-anchor="middle" fill="currentColor">loại khỏi pool</text></g><g data-step="4"><path d="M105 130 L435 130" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net25-c-arr)"/><text x="270.0" y="118" font-size="14" text-anchor="middle" fill="currentColor">port 49664 mới</text><rect x="195" y="175" width="150" height="34" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="270.0" y="197.0" font-size="14" text-anchor="middle" fill="currentColor">active mới</text></g><text x="270" y="245" font-size="14" text-anchor="middle" fill="currentColor">Backend idle 0,4 s; hỏi lại sau 0,6 s</text>
</svg>
<step-note data-step="1">Hai request liên tiếp dùng cùng source port upstream. Con số không phải port client ngoài.</step-note>
<step-note data-step="2">Kết thúc response đưa connection vào cache idle; idle không phải bằng chứng peer sẽ sống mãi.</step-note>
<step-note data-step="3">Peer đóng trước hạn cache nginx; đây là khoảng đủ để nginx nhận close trong phép đo.</step-note>
<step-note data-step="4">Request sau dùng port mới và vẫn 200. Lab không tạo race FIN/RST lúc checkout.</step-note>
</step-flow>

Còn **race tái sử dụng** là tình huống hai sự kiện xảy ra sát nhau: pool chọn socket và peer đóng socket. Dù pool xử lý FIN khi rảnh, vẫn cần chính sách khi close xảy ra đúng lúc gửi request mới. Đặt idle timeout phía giữ pool ngắn hơn phía peer với biên phù hợp làm giảm khả năng dùng socket gần hạn, nhưng không loại mọi race hoặc sự cố mạng. Lab không tạo FIN/RST race; muốn kết luận tần suất lỗi phải bắt packet quanh lúc tái sử dụng và log attempt, không suy từ tỷ lệ timeout cấu hình.

> **Nguồn.** nginx nói `keepalive` *“does not limit the total number of connections to upstream servers”* ([upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive)). Nó giữ số connection **idle được cache theo worker**, không phải semaphore chặn toàn bộ active connection. Muốn giới hạn đồng thời phải xác định cơ chế riêng của phiên bản/cấu hình đang dùng.

Do cache theo worker, đọc `keepalive 4` thành “cả nginx chỉ có 4 connection” sai cả phạm vi lẫn trạng thái. Nhiều worker có thể giữ nhiều cache riêng, và active connection vẫn có thể tồn tại bên ngoài các slot idle ấy. Tăng cache không tăng khả năng xử lý của app; cần đo số active, idle, queue và hạn của peer.

## ⏸ Dừng lại — đoán trước #2

Client gửi `X-Forwarded-For: 198.51.100.66` tới edge công khai. Edge nối thêm địa chỉ peer vào cuối, backend lấy phần tử đầu để làm khoá rate limit. Kết luận nào đúng?

- (a) Phần tử đầu được chuẩn HTTP chứng nhận là IP thật.
- (b) Chỉ cần header có từ “Forwarded” thì client không giả được.
- (c) Client vẫn kiểm soát phần tử đầu; phải xác lập proxy tin cậy và luật xử lý cả chuỗi.
- (d) Chuyển nguyên chuỗi ấy sang PROXY protocol sẽ tự có chữ ký xác thực.

### 3.5 Danh tính địa chỉ phải bắt đầu từ peer được tin

Đáp án là **(c)**. **`X-Forwarded-For` — XFF — là header thường dùng để truyền danh sách địa chỉ client qua các proxy.** Ở một TCP connection bình thường, app chỉ thấy peer của chặng cuối; proxy có thể cung cấp thông tin chặng trước qua header. Nhưng header là byte client cũng gửi được, nên “có giá trị trong XFF” không tự biến thành “địa chỉ do hạ tầng xác thực”.

Lab có route `/unsafe` dùng `$proxy_add_x_forwarded_for`: giá trị XFF có sẵn được giữ, rồi nối `$remote_addr` của kết nối tới nginx. Gửi địa chỉ giả `198.51.100.66`, app nhận `198.51.100.66, 127.0.0.1`. Nếu app chọn phần tử đầu, nó vừa chọn dữ liệu người gửi tự khai. Route `/safe` cho mô hình **nginx là edge đầu tiên, client kết nối trực tiếp** thì ghi đè XFF bằng `$remote_addr`; app nhận `127.0.0.1`, peer thực của lab.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 300" role="img" aria-labelledby="net25-d-t net25-d-d" style="width:100%;max-width:580px;height:auto;display:block;margin:1.25rem auto">
<title id="net25-d-t">XFF bị giả biến mất tại edge trực tiếp</title>
<desc id="net25-d-d">Client gửi IP giả; edge thay dữ liệu đó bằng peer thật trước khi chuyển app.</desc>
<defs><marker id="net25-d-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<rect x="20" y="40" width="120" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="80.0" y="67.0" font-size="14" text-anchor="middle" fill="currentColor">Client</text><rect x="230" y="40" width="120" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="290.0" y="67.0" font-size="14" text-anchor="middle" fill="currentColor">Edge</text><rect x="440" y="40" width="120" height="44" rx="7" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="500.0" y="67.0" font-size="14" text-anchor="middle" fill="currentColor">App</text><line x1="80" y1="84" x2="80" y2="145" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><line x1="290" y1="84" x2="290" y2="145" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><line x1="500" y1="84" x2="500" y2="145" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><g data-step="1" data-until="1"><path d="M80 120 L290 120" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net25-d-arr)"/><rect x="20" y="155" width="230" height="38" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="135.0" y="179.0" font-size="14" text-anchor="middle" fill="currentColor">XFF: 198.51.100.66</text></g><g data-step="2"><path d="M80 120 L290 120" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net25-d-arr)"/><rect x="200" y="155" width="220" height="38" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="310.0" y="179.0" font-size="14" text-anchor="middle" fill="currentColor">XFF: 127.0.0.1</text></g><g data-step="3"><path d="M290 120 L500 120" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net25-d-arr)"/><text x="500" y="220" font-size="14" text-anchor="middle" fill="currentColor">peer tin cậy</text></g><text x="290" y="265" font-size="14" text-anchor="middle" fill="currentColor">Mô hình edge đầu tiên: ghi đè bằng peer socket</text>
</svg>
<step-note data-step="1">IP ở đầu XFF do client tự khai, chưa có cơ sở dùng làm danh tính.</step-note>
<step-note data-step="2">Ở mô hình client đi thẳng edge, edge ghi đè bằng địa chỉ peer. Giá trị giả biến mất.</step-note>
<step-note data-step="3">App chỉ diễn giải metadata khi peer trực tiếp là proxy được tin; đường bypass phải bị xử lý theo hợp đồng riêng.</step-note>
</step-flow>

Ở chuỗi nhiều proxy, không phải proxy nào cũng ghi đè thành IP peer cuối rồi gọi đó là client gốc. Cần định nghĩa trust boundary — ranh giới các thành phần được quyền khẳng định địa chỉ thay client. Edge tin cậy đầu tiên loại hoặc chuẩn hóa dữ liệu client tự gửi; các proxy nội bộ chỉ nhận kết nối từ đích đã cho phép và thêm thông tin theo hợp đồng. Backend chỉ diễn giải chuỗi sau khi kiểm peer trực tiếp thuộc tập proxy được tin.

Một cách diễn giải là đi từ phải sang trái, bỏ các hop thuộc tập proxy đã được xác định, rồi chọn địa chỉ không tin cuối cùng theo chính sách. Nó chỉ đúng nếu chuỗi được tạo và kiểm soát theo hợp đồng ấy; không phải chỉ đảo mảng là an toàn. Nếu backend còn mở đường trực tiếp từ Internet, kẻ gọi có thể bỏ qua edge; nếu tin toàn bộ một mạng có cả workload không được quyền khẳng định IP, ranh giới đã bị mở rộng quá mức. Không dùng số hop cố định khi cùng endpoint có đường đi dài ngắn khác nhau.

**Nguồn cho cách xử lý cụ thể:** nginx realip module cho cấu hình `set_real_ip_from`, `real_ip_header` và `real_ip_recursive`; khi bật recursive, nó dùng địa chỉ không tin cuối theo tập nguồn đã khai báo ([realip module](https://nginx.org/en/docs/http/ngx_http_realip_module.html#real_ip_recursive)). Lab XFF chỉ đo ghi đè so với nối thêm, **chưa đo parser recursive nhiều hop**. Đừng lấy route `/safe` ở loopback làm cấu hình hoàn chỉnh cho một mạng nhiều CDN/LB.

Nếu địa chỉ được dùng làm khoá rate limit, audit hoặc kiểm soát truy cập, ranh giới tin cậy là phần của cơ chế chứ không phải bước trang trí sau debug. Route `/unsafe` tồn tại để chứng minh lỗi; không sao chép nó kèm cách lấy phần tử đầu vào một endpoint public.

### 3.6 PROXY protocol chuyển metadata trước HTTP, không tự chứng thực nó

**PROXY protocol là định dạng để proxy gửi địa chỉ nguồn/đích của kết nối gốc cho bên nhận ở đầu một connection mới.** Phiên bản v1 dùng một dòng text đứng trước payload; v2 dùng header nhị phân. Cơ chế này hữu ích khi proxy không sửa HTTP, hoặc khi ứng dụng phía sau cần biết nguồn trước khi phân tích HTTP. Nó không phải HTTP CONNECT và không phải header HTTP có tên `Proxy`.

Lab gửi đúng chuỗi sau tới listener `8085`:

```text
PROXY TCP4 192.0.2.44 192.0.2.10 5555 8085
GET / HTTP/1.1
Host: lab
Connection: close
```

Đây là biểu diễn các dòng đã gửi thật; trên dây mỗi dòng kết thúc bằng `\r\n`, sau header HTTP có dòng trống. Prefix khai báo nguồn `192.0.2.44:5555`, đích `192.0.2.10:8085`; đây là metadata thử nghiệm, không phải IP bind thật. Connection thật tới `127.0.0.1:8085`, nginx được cấu hình `listen ... proxy_protocol`, chỉ tin peer `127.0.0.1/32` trong container, và `real_ip_header proxy_protocol`. Nginx chuyển địa chỉ đã nhận sang XFF cho app; output là `PROXY_V1 xff=192.0.2.44`.

Nếu gửi thẳng `GET` tới listener đang đòi prefix, phép thử nhận EOF; error log ghi header PROXY hỏng. Hai phía không khớp giao thức đầu connection thì lỗi xảy ra trước HTTP app. Tương tự về thứ tự byte, nếu một chặng yêu cầu PROXY trước TLS thì TLS ClientHello không phải byte đầu tiên mà listener ấy mong nhận; cần đọc hợp đồng listener, không thử bật cờ độc lập ở một bên rồi mong bên kia đoán được.

> **Nguồn.** Đặc tả yêu cầu lọc để *“only trusted proxies are allowed to use this protocol”* ([PROXY protocol](https://www.haproxy.org/download/3.0/doc/proxy-protocol.txt)). Dòng prefix v1 không có chữ ký bảo đảm địa chỉ là thật. Lab cố ý cho sender tự khai địa chỉ để chứng minh khả năng truyền metadata, không chứng minh nó là cơ chế authentication.

Trong production phải bảo vệ listener nhận PROXY bằng đường mạng và peer được tin phù hợp. Khi debug, log tách địa chỉ peer socket và địa chỉ được khẳng định qua proxy, thay vì ghi đè hết rồi mất bằng chứng đường vào.

## ⏸ Dừng lại — đoán trước #3

Proxy ngoài trả `504`. App phía trong vừa ghi xong một thao tác có side effect nhưng response chưa tới client. Client được tự động gửi lại cùng POST chỉ vì status ấy không?

- (a) Được, `504` bảo đảm app chưa chạy.
- (b) Được, mọi request qua proxy đều idempotent.
- (c) Chưa đủ bằng chứng; cần hợp đồng retry/idempotency và ngân sách còn lại.

### 3.7 Ngân sách đi vào sâu phải để lại đường trả ra ngoài

Đáp án là **(c)**. **Idempotency là tính chất việc lặp lại cùng thao tác không làm tăng thêm tác dụng dự định so với thực hiện một lần.** Một mã lỗi mạng không tạo ra tính chất ấy. Bài 24 đã thấy đóng session có thể cắt response; ở bài này outer timeout còn cho thấy một tầng có thể bỏ chờ trước hạn của tầng trong. Không có phép đo nào ở đây chứng minh giao dịch đã rollback khi client thấy lỗi.

Để điều khiển tổng thời gian, hệ thống cần ngân sách xuyên chuỗi: lấy deadline của caller, trừ phần đã tiêu và phần dành cho đường trả/cleanup, rồi cho tầng trong một hạn không vượt phần còn lại. Tầng trong gọi dependency lại làm tương tự. Các idle/read timeout vẫn hữu ích để phát hiện không tiến triển, nhưng không thay cho mốc tổng. Cách truyền deadline phải thống nhất và không tin mù giá trị public client gửi; đồng hồ tuyệt đối giữa máy cần xử lý lệch giờ, còn ngân sách tương đối cần trừ thời gian đã trôi qua.

**Suy luận thiết kế:** thường muốn việc phía trong kết thúc hoặc hủy có kiểm soát trước khi caller bên ngoài không còn nhận kết quả, có biên cho trả lỗi và cleanup. Đó không phải công thức phổ quát “mọi số timeout ngoài luôn lớn hơn trong”: connect, idle stream và deadline đo các thứ khác nhau.

**Cancellation là tín hiệu yêu cầu dừng công việc không còn được caller chờ.** Nó cần được truyền và được code/dependency thực thi; đóng socket không tự hoàn tác DB commit hoặc job đã phát. Lab có handler ngủ; nó không triển khai cancellation nghiệp vụ và không đo độ trễ dừng công việc. Nếu sản phẩm có tác vụ phải tiếp tục dù client rời đi, nên có trạng thái tra cứu kết quả và định danh thao tác thay vì để client đoán từ status gateway.

Retry còn tiêu ngân sách và nhân tải. Nếu mỗi tầng thử lại độc lập khi dependency lỗi, một request ở ngoài có thể biến thành nhiều attempt ở trong. Cần xác định tầng nào được retry, lỗi nào đủ điều kiện, còn bao nhiêu ngân sách và cách ngăn lặp side effect. Kiểm RFC 9110 §9.2.2 cùng hợp đồng API, rồi đo attempt bằng request ID và operation ID. Không thêm retry để che nhánh `502` của bài lab này: nó cố tình tắt để quan sát được lỗi gốc.

## 4. Lab

### 4.1 Đọc cả log client lẫn log proxy

Trong `net-lab/net-25/`, chạy:

```bash
./run.sh
```

Script dựng đúng container `net25-lab`, cài nginx/Python, chạy `lab.py`, ghi console qua `tee out/lab.txt`, dọn container kể cả khi lỗi. Không dùng network/container lane khác. `nginx.conf` được sinh lại mỗi lần; `out/access.txt` và `out/error.txt` là log của lượt chạy mới nhất. Nginx có **1 worker** để phép thử pool không trộn cache nhiều worker. Các cổng là loopback trong container, không mở trên host.

Phần cấu hình upstream quyết định phép thử tái sử dụng:

```nginx
upstream app {
    server 127.0.0.1:9001;
    keepalive 4;
    keepalive_timeout 1s;
}
proxy_http_version 1.1;
proxy_set_header Connection "";
proxy_connect_timeout 200ms;
proxy_read_timeout 1s;
proxy_send_timeout 1s;
proxy_next_upstream off;
```

Block trên trích các directive ở ngữ cảnh tương ứng trong config sinh ra: `upstream` nằm trong `http`, các directive proxy của phép thử nằm trong `server 8080`. Không dán nguyên mọi dòng vào một `location` rồi coi đó là config hợp lệ. App dùng HTTP/1.1 có Content-Length và idle timeout 0,4 s; riêng handler đang chạy không bị timer chờ request kế tiếp cắt ngang.

### 4.2 Một response chậm và một response kết thúc sai

Gọi `/delay` qua `8080`, rồi `/close` qua cùng listener. Script ghi:

```text
READ_TIMEOUT status=504 seconds=1.005
EARLY_CLOSE status=502 seconds=0.001
```

Error log chứa hai cụm quyết định, trích phần không có timestamp/connection ID:

```text
upstream timed out (110: Operation timed out) while reading response header from upstream
upstream prematurely closed connection while reading response header from upstream
```

**Thấy gì:** cùng giai đoạn chưa có header, một nhánh chờ hết hạn, một nhánh peer đóng sớm. **Vì sao:** `/delay` ngủ trước header; `/close` chủ động shutdown socket. Status không thay thế dấu vết giai đoạn. Lab chưa có TLS, DNS upstream hay queue để chúng gây nhiễu kết luận này.

### 4.3 Phá đồng nhất “read timeout = deadline”

Gọi `/stream` qua `8080`, đọc **đủ body**; handler gửi 4 phần, mỗi phần một byte sau 0,6 s. Output thật:

```text
STREAM status=200 seconds=2.417 bytes=4
```

**Thấy gì:** 2,417 s lớn hơn 1 s nhưng response hoàn chỉnh. **Vì sao:** khoảng giữa các lần có dữ liệu nhỏ hơn read timeout trong phép thử này. Đọc status sớm rồi dừng đồng hồ sẽ không đo được tổng response; client trong script gọi `read()` hết body trước khi ghi thời gian.

### 4.4 Đặt đồng hồ ngắn nhất ở ngoài

Gọi `/delay` lần lượt qua `8082 → 8081 → app` và gọi riêng `8081 → app`:

```text
CHAIN_OUTER_TIMEOUT status=504 seconds=0.502
INNER_DIRECT status=200 seconds=1.503
```

**Thấy gì:** app không cần đổi code để cùng endpoint có một đường thành công và một đường hết hạn. **Vì sao:** ở đường dài hơn, read timeout 0,5 s của proxy ngoài hết trước response header; đường trực tiếp cho proxy trong 3 s nên đủ. Đối chiếu port `$server_port` trong `out/access.txt`; nếu chỉ nhìn log `8081`, bạn có thể bỏ lỡ thành phần tạo lỗi mà client đã nhận.

### 4.5 Chứng minh pool trước, rồi mới thử socket hết hạn

Hai request client mới liên tiếp qua `8080` cho app thấy cùng port. Đợi 0,6 s, lâu hơn app idle 0,4 s, request tiếp theo vẫn thành công nhưng port đổi:

```text
POOL_TWO_REQUESTS same_peer=True ports=[49650, 49650]
POOL_AFTER_BACKEND_IDLE status=200 new_peer=True port=49664
NAIVE_POOL_AFTER_IDLE EOF=True
```

**Thấy gì:** nginx đã tái sử dụng chặng upstream, rồi tránh được socket peer đã đóng trong lượt này; pool thô không theo dõi close thì đọc EOF. **Vì sao:** quyền giữ socket trong cấu trúc dữ liệu local không kéo dài vòng đời peer.

> **Chưa đo.** Không có packet capture chứng minh một FIN/RST race ở thời điểm nginx checkout socket. Đo bằng `tcpdump` trong container, đồng bộ idle close với request mới, giữ log attempt và trạng thái pool. Không gọi một cấu hình timeout lệch là root cause của `502` thực tế trước khi có bằng chứng đường lỗi tương ứng.

### 4.6 Gửi IP giả qua hai đường, rồi thử sai giao thức đầu connection

Script gửi cùng header `X-Forwarded-For: 198.51.100.66` tới hai route:

```text
XFF /unsafe status=200 value=198.51.100.66, 127.0.0.1
XFF /safe status=200 value=127.0.0.1
```

**Thấy gì:** nối thêm giữ nguyên dữ liệu giả ở đầu, ghi đè ở edge trực tiếp loại nó. **Vì sao:** `$proxy_add_x_forwarded_for` không phải hàm kiểm danh tính. Thử một client không gửi XFF cũng phải qua được edge; cấu hình không cần tin header để phục vụ request hợp lệ.

Với listener `8085`, script gửi prefix PROXY v1 đúng rồi HTTP; lần khác gửi thẳng HTTP không prefix:

```text
PROXY_V1 xff=192.0.2.44
PROXY_LISTENER_WITHOUT_PREFIX EOF=True
```

**Thấy gì:** metadata tới được app khi hai phía khớp, và sai hợp đồng đầu connection bị đóng trước HTTP. **Vì sao:** listener đã chọn parser PROXY trước parser HTTP. Lab không kiểm PROXY v2, TLS cùng prefix hoặc ACL trên mạng thật; listener chỉ ở loopback container và bị dọn sau phép thử.

## 5. Tính tay

Các bài sau dùng **giả định được nêu tại đề**, không là giá trị khuyên dùng. Python kiểm phép tính, lưu ở `out/calculations.txt`.

### 5.1 Response có thể dài hơn timer bao nhiêu?

Một stream gửi 4 byte ở các mốc 0,6; 1,2; 1,8; 2,4 s, header có ngay; read timeout 1 s. Bỏ độ trễ xử lý, nó có bắt buộc timeout vì tổng lớn hơn 1 s không? Nếu caller có deadline tổng 2 s thì sao?

**Giải:** không; mọi khoảng đọc theo mô hình là 0,6 s, nhỏ hơn 1 s, tổng `4×0,6=2,4 s`. Nhưng caller có deadline tổng 2 s sẽ hết ngân sách trước byte cuối. Kết quả hai timer không mâu thuẫn vì một timer đo im lặng, một timer đo tổng. Client phải xử lý response chưa hoàn chỉnh, không coi header `200` đã nhận là bằng chứng đủ body.

### 5.2 Bốn slot có phải bốn connection toàn hệ thống?

Giả sử có 8 worker, mỗi worker cấu hình cache tối đa 4 upstream connection idle. Ở một thời điểm có tổng cộng 48 active connection và mọi cache idle đều đầy. Theo mô hình, có tối đa bao nhiêu connection idle và tổng active+idle lúc ấy là bao nhiêu? Nếu mỗi attempt ngoài kéo tối đa 2 attempt dependency, mà caller cho tối đa 3 attempt ngoài, dependency có thể nhận tối đa bao nhiêu attempt cho một thao tác?

**Giải:** idle `8×4=32`; tổng tại thời điểm giả định `48+32=80`. Con số 32 không phải cap cho active. Với retry lồng nhau, cận theo giả định là `3×2=6` attempt dependency; không phải tất cả đều xảy ra, vì success hoặc hết deadline có thể dừng sớm. Cận chỉ có ý nghĩa khi định nghĩa attempt đã bao gồm lần thử đầu, không lẫn “retry 3” với “tổng 3 lần”.

### 5.3 Cho tầng trong bao nhiêu ngân sách?

Caller có deadline tổng 2 s tính từ lúc nhận request. Trước khi gọi dependency đã tiêu 0,2 s; muốn giữ 0,3 s cho xử lý/trả kết quả. Không có ngân sách ngoài đề, dependency chỉ có một attempt. Bạn được giao tối đa bao nhiêu thời gian tổng cho lần gọi đó? Trong mô hình lab, outer dừng chờ ở 0,5 s nhưng backend kết thúc ở 1,5 s nếu không có cancellation: phần đuôi không còn caller đợi dài bao lâu?

**Giải:** ngân sách dependency là `2−0,2−0,3=1,5 s` **tổng**, không phải đặt connect 1,5 s rồi read thêm 1,5 s. Phần đuôi mô hình là `1,5−0,5=1 s`. Lab không đo chính xác lúc handler được hủy và không thực hiện giao dịch; số 1 s là suy luận trên mốc giả định, không chứng minh bao nhiêu tài nguyên bị giữ hay dữ liệu đã ghi ở thời điểm nào.

## 6. Chuyển giao

1. Client báo timeout nhưng proxy log có response `200`. Bạn cần timestamp, body completeness và ID nào để phân biệt client rời sớm với proxy trả `200` nhưng body bị cắt?
2. Chỉ request đầu sau một khoảng rảnh gặp lỗi, request tiếp theo thành công. Thiết kế phép thử tách stale pool, DNS đổi đích và backend cold start; mỗi giả thuyết cần một dấu hiệu bác bỏ được.
3. Streaming hoạt động khi gọi origin nhưng lỗi qua một proxy có buffering. Bạn đo tiến triển ở hai chặng thế nào để không chỉnh read timeout dựa vào riêng nhịp hiển thị client?
4. Một endpoint đi qua CDN hoặc đi thẳng edge tuỳ client. Cùng app đang tin số hop cố định trong XFF. Hãy thiết kế lại trust boundary và phép thử đường bypass, gồm cả request hợp lệ không có header.
5. Bật PROXY protocol ở backend khiến mọi TLS handshake hỏng trước khi app có log. Bạn cần kiểm thứ tự byte, parser listener, bên gửi và ACL thế nào? Vì sao thay certificate chưa phải bước đầu?
6. **Câu khó nhất, không có đáp án trong bài.** Một thao tác ghi đi qua ba proxy và hai dịch vụ; caller retry, một dịch vụ dùng pool, một dependency không hỗ trợ cancellation, và mạng chỉ lỗi trên đường response sau commit. Thiết kế deadline, operation ID, nơi được retry, cách trả hoặc tra cứu kết quả và hệ log đủ chứng minh không lặp tác dụng. Phân tích trường hợp deadline hết giữa commit và ghi trạng thái idempotency, cùng một đường vào bypass proxy tin cậy; nêu phần bảo đảm nào cần thay đổi ở giao thức lưu trữ chứ không thể sửa bằng timeout.

## 7. Tóm tắt

- Mỗi proxy có đồng hồ trên chặng nó gọi: lab outer 0,5 s trả `504` dù gọi riêng inner 3 s nhận `200`.
- Read timeout nginx đo khoảng giữa các lần đọc, không phải tổng: lab nhận 4 byte trong 2,417 s với read timeout 1 s.
- Lab đóng upstream trước header ra `502` sau 0,001 s; không gọi mọi `502` là timeout.
- Status, giai đoạn lỗi và upstream timing phải đi cùng nhau; status lỗi không chứng minh giao dịch chưa commit.
- Pool phía proxy và connection phía client độc lập: lab hai client connection dùng cùng upstream port rồi đổi port sau peer idle close.
- `keepalive` nginx giới hạn cache idle theo worker; nó không chặn mọi active connection ở cùng con số.
- XFF cần peer và chuỗi proxy đáng tin; lab giữ địa chỉ giả khi nối thêm và loại nó khi edge trực tiếp ghi đè.
- PROXY protocol chuyển metadata trước payload; lab thiếu prefix nhận EOF, prefix hợp lệ không tự chứng minh địa chỉ được khai là thật.
- Deadline tổng, idle timeout và quyền retry giải ba câu hỏi khác nhau; thay một timer không tự giải hai câu còn lại.

→ **Bài 26 — CDN từ bên trong**: khi đã kiểm đúng chặng proxy và danh tính nguồn, ta theo cache key, origin shield và đường chọn điểm phục vụ để giải thích vì sao cùng URL có lúc chạm origin, có lúc không.
