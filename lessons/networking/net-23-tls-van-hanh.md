# Bài 23 — TLS khi vận hành: SNI, ALPN, resumption và mTLS

## 1. Mục tiêu

Sau bài này bạn có thể:

- Tách địa chỉ TCP, tên SNI, tên được xác minh trên certificate và HTTP authority khi debug một endpoint dùng chung IP.
- Kiểm tra ALPN được chọn, thay vì suy giao thức ứng dụng từ phiên bản TLS hoặc cờ cấu hình client.
- Vẽ ngân sách RTT cho TLS 1.3 trên connection TCP mới, resumption thông thường và early data trong điều kiện đã nêu.
- Chứng minh resumption bằng cờ phiên được tái sử dụng; phân biệt nó với nhận ticket và giữ nguyên connection.
- Phân biệt lỗi thiếu client certificate, CA không được tin và thiếu quyền ứng dụng sau khi mTLS thành công.
- Đặt probe đúng TLS endpoint khi proxy terminate, passthrough hoặc tái mã hoá tới upstream.

## 2. Triệu chứng

Cùng một dịch vụ nghe tại **127.0.0.1:23443** trong lab. Client gửi SNI `a.test` thì nhận certificate của `a.test`; đổi SNI thành `b.test` thì nhận certificate của `b.test`. HTTP request trong cả hai ca cố ý mang `Host: unrelated.test`. Request vẫn nhận response, vì server tối giản của lab không dùng Host để chọn virtual host hay cấp quyền.

Bạn sửa theo cách quen tay: “Đổi Host là đủ, TCP đã tới đúng IP rồi.” Ca `wrong.test` lập tức bị client từ chối với `CERTIFICATE_VERIFY_FAILED` trước khi gửi HTTP. Đổi tên TLS và đổi header HTTP rõ ràng không phải cùng một thao tác.

Ở lượt thử khác, client đã nhận ticket nhưng điều đó chưa trả lời câu hỏi connection tiếp theo có resumed hay không. Log phân biệt được **`FRESH reused=False`**, **`RESUME reused=True`** và một client không đưa ticket có **`NO_TICKET reused=False`**. Cuối cùng, cổng **23444** yêu cầu client certificate: không có chứng chỉ hoặc có chứng chỉ ngoài CA của lab đều bị từ chối; chứng chỉ hợp lệ mới nhận `peer=client`.

> **Đo trên lab.** `net-lab/net-23/out/lab.txt`, Alpine 3.20, Linux `6.8.0-64-generic` aarch64, Python `ssl` dùng OpenSSL 3.3.7. Server/client nằm trong cùng container, TLS bị giới hạn ở 1.3. Certificate và CA được sinh riêng mỗi lần chạy; chỉ bind loopback, không publish port. Đo lại: `./run.sh` trong thư mục lab. Các cổng, tên và cờ trên là dữ liệu của phép thử, không phải cấu hình production.

Bài [TCP/UDP & TLS](../engineering/eng-03-tcp-tls.md) đã giải thích chuỗi chứng chỉ và trust anchor. Ta không dựng lại chain ở đây. Mục tiêu là tìm **quyết định nào xảy ra trước quyết định nào**, thông tin nào tồn tại ở thời điểm ấy, và mốc thời gian nào cần có để chẩn đoán.

## ⏸ Dừng lại — đoán trước #1

Một HTTPS endpoint dùng chung IP cho nhiều tên. Client kết nối trực tiếp tới IP rồi chỉ thay `Host: b.test`; TLS server trước đó đã chọn certificate mặc định cho `a.test`. Điều nào có thể sửa certificate đã chọn cho chính handshake đó?

- (a) Header Host, vì header luôn đi trước certificate.
- (b) Path `/b.test/`, vì TLS đọc đường dẫn trước khi mã hoá.
- (c) Không thao tác HTTP nào sửa lại handshake đã xong; phải gửi tên TLS phù hợp từ ClientHello và xác minh đúng tên đích.
- (d) Bật TLS 1.3 tự động suy ra tên mong muốn từ DNS của IP.

## 3. Cơ chế

### 3.1 Có địa chỉ để tới máy, có tên để chọn dịch vụ

Đáp án #1 là **(c)**. **SNI — Server Name Indication — là extension cho client đưa tên server mong muốn vào ClientHello của TLS.** Nó giải bài toán nhiều dịch vụ tên miền cùng chia sẻ một địa chỉ kết nối: phía nhận biết nên chọn cấu hình TLS/certificate nào trước khi đọc HTTP được bảo vệ.

Thứ tự là client tìm địa chỉ, mở transport, gửi ClientHello có tên, phía server chọn cấu hình TLS rồi hoàn tất handshake; sau đó HTTP thông thường mới được gửi. **ClientHello là thông điệp mở đầu handshake do client phát, chứa đề xuất và extension cần cho việc thương lượng.** Tên trong SNI có thể giúp chọn certificate hoặc tuyến upstream; tự nó không chứng minh client sở hữu tên ấy, không là credential và không cho quyền tenant.

Tách thêm một phép kiểm phía client: **hostname verification là việc client đối chiếu tên dịch vụ nó định truy cập với định danh được phép trong certificate nhận được.** Tới đúng IP nhưng certificate không đại diện tên đích vẫn là lỗi. SNI giúp server chọn; hostname verification giúp client kiểm lựa chọn đó. Chúng thường nhận cùng tên từ URL nhưng có nhiệm vụ khác nhau.

**Authority là định danh đích ở tầng HTTP**, thể hiện qua Host trong HTTP/1.1 hoặc `:authority` trong HTTP/2, HTTP/3 theo ngữ nghĩa tương ứng. Nó được gửi và xử lý ở thời điểm khác với SNI. Một proxy có thể áp chính sách yêu cầu chúng tương thích; không được giả định mọi server đều làm vậy. Lab cố ý cho Host không khớp nhưng không có virtual-host policy để chứng minh việc chọn certificate đã xảy ra trước, không khuyến nghị chấp nhận mismatch trong hệ thống nhiều tenant.

> **Nguồn.** RFC 6066 §3 cho phép gửi extension tên trong ClientHello: *“clients MAY include an extension of type "server_name" in the (extended) client hello.”* ([RFC 6066](https://www.rfc-editor.org/rfc/rfc6066#section-3)). Bản tải nằm tại `src/rfc6066.txt`; chứng minh chọn certificate trong bài còn dựa trên callback SNI và kết quả thực của hai tên ở lab.

Khi cần kiểm qua IP cố định, công cụ phải giữ được tên logic. Ví dụ dưới là **lệnh để chạy khi lab server đang sống**, không phải output của run tự động:

```bash
curl --resolve a.test:23443:127.0.0.1 \
  --cacert private/ca.pem https://a.test:23443/
```

`--resolve` thay ánh xạ địa chỉ mà vẫn giữ `a.test` trong URL để curl gửi SNI và xác minh certificate cho tên đó. Ngược lại, `https://127.0.0.1:23443/ -H 'Host: a.test'` vẫn khiến client định truy cập IP ở tầng TLS. Lab không sinh SAN cho IP nên không được trông đợi hostname verification thành công. Không thêm `-k` để che kết quả; nếu bỏ kiểm certificate, bạn đã đổi câu hỏi từ “đúng dịch vụ?” thành “có mã hoá với đầu nào đó?”.

SNI nhìn thấy ở đâu còn phụ thuộc cơ chế bảo vệ ClientHello. Bài này dùng ClientHello thông thường, **không bật ECH — Encrypted ClientHello, cơ chế bảo vệ phần ClientHello bên trong**. Vì vậy không áp mô hình “LB luôn đọc được tên thật trong mọi TLS” sang triển khai có ECH. Lab không kiểm ECH, không kiểm DNS discovery của ECH và không khẳng định cách sản phẩm cụ thể định tuyến khi bật nó; giới hạn mô hình đối chiếu [RFC 9849](https://www.rfc-editor.org/rfc/rfc9849#section-1).

### 3.2 LB chỉ quyết định được bằng thông tin nó đang có

**TLS termination là việc một thành phần trở thành TLS endpoint, giữ khoá phiên và giải mã dữ liệu nhận được.** Một LB terminate có thể đọc HTTP để chọn upstream theo path/header sau handshake; nó phải có cấu hình certificate phù hợp với tên dịch vụ được phục vụ. Client xác thực LB ở chặng đó, không trực tiếp xác thực chứng chỉ của origin phía sau.

**TLS passthrough là chuyển lưu lượng TLS tới endpoint phía sau mà không giải mã application data ở thành phần trung gian.** Một proxy có thể inspect ClientHello thông thường để chọn upstream theo SNI rồi chuyển tiếp nguyên TLS. Khi đó backend phía sau vẫn phải hoàn tất handshake và cung cấp certificate phù hợp; proxy không thể route theo `/api` vì path còn được mã hoá. Không phải mọi LB L4 đều parse SNI; chỉ nói một sản phẩm làm được khi có cấu hình/docs hoặc đo tương ứng.

**TLS re-encryption là terminate connection ở đầu vào rồi mở TLS connection khác tới upstream.** Hai handshake có thể dùng tên SNI, ALPN và trust policy khác nhau. Client thấy certificate đúng không chứng minh proxy đã kiểm certificate upstream. Nếu proxy kết nối bằng IP nhưng upstream cần SNI tên nội bộ, chặng sau có thể fail trong lúc chặng client–proxy vẫn xanh.

<svg viewBox="0 0 520 365" role="img" aria-labelledby="net23-proxy-t net23-proxy-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net23-proxy-t">TLS kết thúc ở đâu quyết định thông tin nhìn được</title>
<desc id="net23-proxy-d">Ba kiến trúc riêng, các đoạn màu biểu diễn phạm vi TLS. Hai đoạn tách nhau ở re-encryption là hai phiên.</desc>
<defs><marker id="net23-proxy-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
<text x="12" y="30" fill="currentColor" font-size="14">Terminate</text><rect x="20" y="45" width="105" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="30" y="66" fill="currentColor" font-size="13">Client</text><rect x="200" y="45" width="105" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="210" y="66" fill="currentColor" font-size="13">Proxy</text><rect x="390" y="45" width="105" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="400" y="66" fill="currentColor" font-size="13">Origin</text><path d="M95 92 H265" stroke="#8b5cf6" stroke-width="5"/><text x="95" y="115" fill="currentColor" font-size="13">TLS a.test</text><path d="M305 60 L385 60" fill="none" stroke="currentColor" marker-end="url(#net23-proxy-a)"/><text x="322" y="85" fill="currentColor" font-size="13">HTTP</text><text x="12" y="140" fill="currentColor" font-size="14">Passthrough</text><rect x="20" y="155" width="105" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="30" y="176" fill="currentColor" font-size="13">Client</text><rect x="200" y="155" width="105" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="210" y="176" fill="currentColor" font-size="13">Proxy</text><rect x="390" y="155" width="105" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="400" y="176" fill="currentColor" font-size="13">Origin</text><path d="M95 202 H435" stroke="#8b5cf6" stroke-width="5"/><text x="95" y="225" fill="currentColor" font-size="13">TLS b.test xuyên proxy</text><text x="12" y="250" fill="currentColor" font-size="14">Re-encryption</text><rect x="20" y="265" width="105" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="30" y="286" fill="currentColor" font-size="13">Client</text><rect x="200" y="265" width="105" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="210" y="286" fill="currentColor" font-size="13">Proxy</text><rect x="390" y="265" width="105" height="32" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="400" y="286" fill="currentColor" font-size="13">Origin</text><path d="M95 312 H245" stroke="#8b5cf6" stroke-width="5"/><text x="95" y="335" fill="currentColor" font-size="13">TLS a.test</text><path d="M285 312 H435" stroke="#8b5cf6" stroke-width="5"/><text x="285" y="335" fill="currentColor" font-size="13">TLS b.test</text>
</svg>

Hình dùng các tên `a.test`, `b.test` của lab để suy mô hình proxy; **lab hiện tại chỉ có endpoint chọn context theo SNI, chưa dựng LB forwarding**. Hai đoạn TLS ở hàng re-encryption được vẽ tách để buộc ta đặt hai bộ probe. Không có một cờ “HTTPS hoạt động” bao phủ cả hai chặng.

> **Suy luận.** Một proxy pass TLS nguyên vẹn không thể route theo HTTP path trước khi giải mã application data; một proxy mở TLS upstream phải có chính sách xác thực riêng ở chặng ấy. Đây là suy luận từ ranh giới endpoint, chưa là kiểm thử cấu hình LB. Kiểm bằng dựng hai backend, log lựa chọn SNI ở proxy/backend, rồi đổi một tên hoặc trust anchor trên đúng một chặng trong khi chặng kia giữ nguyên.

### 3.3 ALPN chọn tiếng nói sau TLS, không chọn bản TLS

**ALPN — Application-Layer Protocol Negotiation — là extension TLS để client đưa danh sách giao thức ứng dụng và server chọn một giao thức chung.** Nó giải tình huống cùng endpoint TLS phục vụ nhiều cách trao đổi ứng dụng mà không cần đoán byte đầu. Ví dụ client đề xuất `h2` và `http/1.1`; server lab chỉ hỗ trợ `http/1.1`, nên chọn `http/1.1`.

TLS 1.3 không đồng nghĩa HTTP/3. HTTP/2 có thể chạy qua TLS 1.3 trên TCP; HTTP/3 dùng QUIC có TLS tích hợp và ALPN HTTP/3. Bài 22 đã kiểm version của request thật vì “bật TLS mới nhất” không nói gì về version HTTP. Tương tự, thuật toán mã hoá được chọn không chứng minh ALPN đã thành công: các phép thương lượng trả lời những câu hỏi khác nhau.

Trong TLS 1.3, ALPN được chọn nằm trong **EncryptedExtensions — thông điệp chứa các extension phản hồi được bảo vệ bằng khoá handshake**. RFC 7301 minh hoạ ALPN ở ServerHello theo bối cảnh TLS trước đó; khi áp dụng cho 1.3 phải đọc bảng vị trí extension của đặc tả TLS 1.3. Không bê vị trí của thông điệp trong sơ đồ cũ sang capture mới rồi kết luận thiếu ALPN.

Có một chỗ lab làm lộ khoảng cách giữa yêu cầu chuẩn và API thư viện. RFC 7301 §3.2 yêu cầu server không có protocol chung trả fatal `no_application_protocol`. Nhưng Python/OpenSSL của lab, khi dùng `set_alpn_protocols()` và không có protocol chung, vẫn hoàn tất TLS với `selected_alpn_protocol() is None`. Client trong script kiểm kết quả rồi **không gửi HTTP**; server cũng đóng nếu kết quả không phải `http/1.1`. Không gọi hành vi này là “ALPN fallback theo chuẩn”.

> **Nguồn.** Khi không có lựa chọn chung, RFC 7301 §3.2 yêu cầu *“the server SHALL respond with a fatal "no_application_protocol" alert.”* ([RFC 7301](https://www.rfc-editor.org/rfc/rfc7301#section-3.2)). `ALPN=None` trong lab là hành vi đo được của tổ hợp API/implementation này, không thay yêu cầu trên. Vị trí ALPN của TLS 1.3 đối chiếu bảng extension ở [RFC 9846 §4.3](https://www.rfc-editor.org/rfc/rfc9846#section-4.3).

Từ đây có một quy tắc debug thực dụng: log cả handshake outcome lẫn ALPN outcome. “Handshake thành công” có thể chỉ nói đã có kênh TLS, còn parser ứng dụng chưa có thoả thuận. Không gửi bytes của một protocol tuỳ ý chỉ vì socket TLS đã mở. Với dịch vụ cho phép không dùng ALPN, cần chính sách ứng dụng rõ ràng; với dịch vụ yêu cầu một protocol cụ thể, kiểm điều kiện trước khi xử lý request.

## ⏸ Dừng lại — đoán trước #2

Client có ticket TLS 1.3 hợp lệ, kết nối mới báo `session_reused=True`. Chưa có early data. Câu nào đúng?

- (a) Không cần TCP handshake vì ticket giữ nguyên socket cũ.
- (b) Client được gửi request trước phản hồi server dù API không bật early data.
- (c) Đây vẫn là connection mới; resumption thông thường không tự biến thành 0-RTT.
- (d) Có ticket nghĩa là server bắt buộc chấp nhận mọi lần resumption sau đó.

### 3.4 Đếm RTT từ một mốc rõ ràng

Đáp án #2 là **(c)**. **RTT — round-trip time — là thời gian một lượt từ một đầu tới đầu kia rồi phản hồi về.** Đếm RTT phải chỉ rõ mốc bắt đầu và sự kiện kết thúc. “TLS mất một RTT” thường nói từ ClientHello tới lúc client có thể phát dữ liệu ứng dụng sau khi nhận chuyến handshake server, không bao gồm DNS hoặc TCP thiết lập trước đó.

Với **TLS 1.3 full handshake thông thường trên TCP mới**, bỏ TCP Fast Open, DNS, loss, CPU và HelloRetryRequest: client mở TCP mất một RTT; gửi ClientHello, nhận ServerHello cùng thông tin xác thực/kết thúc phía server mất thêm một RTT. Client gửi Finished và request, response quay về cần một RTT nữa trong mô hình server xử lý tức thì. Vậy chờ trước khi gửi request là hai RTT tính từ SYN; nhận response đầu tiên là khoảng ba RTT trong mô hình đối xứng ấy.

**Finished là thông điệp xác nhận tính toàn vẹn của transcript handshake dựa trên khoá đã thương lượng.** Phía client phải kiểm phần xác thực của server trước khi dùng kênh như đã xác thực. “Client gửi được request sau một RTT TLS” không có nghĩa server đã nhận request hay client đã nhận response ở chính mốc đó. Thay điểm đo từ client sang server có thể làm hai báo cáo đúng nhưng khác số.

**HelloRetryRequest là thông điệp server yêu cầu client gửi lại ClientHello với tham số phù hợp**, chẳng hạn key share được yêu cầu. Nó thêm một chuyến đi-về cho nhánh handshake đó. Đây không phải lỗi HTTP redirect hay retry request nghiệp vụ. Nếu trace có hai ClientHello, cần đọc loại handshake, đừng lập tức kết luận client đã gửi HTTP hai lần.

**Resumption là thiết lập connection mới dựa trên thông tin mật mã từ phiên trước.** Với TLS 1.3 không early data, nó có thể giảm công việc xác thực và lượng thông tin gửi, nhưng client vẫn cần nhận chuyến server trước khi gửi dữ liệu ứng dụng theo nhánh 1-RTT. Do đó trong mô hình TCP mới ở trên, số lượt đợi không tự giảm chỉ vì `reused=True`. Muốn giảm chi phí kết nối mới bằng cách giữ connection sống là connection reuse; đó là một việc khác.

<step-flow>
<svg viewBox="0 0 520 345" role="img" aria-labelledby="net23-rtt-t net23-rtt-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net23-rtt-t">Ba RTT từ SYN tới response trong mô hình TCP mới</title>
<desc id="net23-rtt-d">RTT giả định 40 mili giây, không loss hay xử lý server, TLS full không HRR. Lifeline client server giữ cố định.</desc>
<defs><marker id="net23-rtt-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
<text x="60" y="25" fill="currentColor" font-size="14">Client</text><text x="390" y="25" fill="currentColor" font-size="14">Server</text><path d="M100 40 V335 M420 40 V335" stroke="currentColor" stroke-dasharray="4 4"/><g data-step="1"><path d="M100 60 L420 85" fill="none" stroke="currentColor" marker-end="url(#net23-rtt-a)"/><path d="M420 90 L100 115" fill="none" stroke="currentColor" marker-end="url(#net23-rtt-a)"/><text x="140" y="50" fill="currentColor" font-size="13">0 → 40 ms: mở TCP</text></g><g data-step="2"><path d="M100 130 L420 155" fill="none" stroke="currentColor" marker-end="url(#net23-rtt-a)"/><text x="140" y="123" fill="currentColor" font-size="13">ClientHello tại 40 ms</text></g><g data-step="2" data-until="2"><rect x="170" y="170" width="185" height="27" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="180" y="189" fill="currentColor" font-size="13">đợi chuyến server</text></g><g data-step="3"><path d="M420 185 L100 210" fill="none" stroke="currentColor" marker-end="url(#net23-rtt-a)"/><text x="145" y="176" fill="currentColor" font-size="13">80 ms: kiểm server</text><path d="M100 235 L420 260" fill="none" stroke="currentColor" marker-end="url(#net23-rtt-a)"/><text x="140" y="228" fill="currentColor" font-size="13">Finished + request</text></g><g data-step="4"><path d="M420 285 L100 315" fill="none" stroke="currentColor" marker-end="url(#net23-rtt-a)"/><text x="140" y="280" fill="currentColor" font-size="13">120 ms: response về</text></g>
</svg>
<step-note data-step="1">TCP mới trả chi phí riêng trước ClientHello; chưa có dữ liệu TLS trong chuyến SYN.</step-note>
<step-note data-step="2">Client gửi đề xuất TLS sau khi TCP mở. Trạng thái chờ không phải đang chờ HTTP response.</step-note>
<step-note data-step="3">Nhận và kiểm chuyến server cho phép client gửi Finished kèm request theo mô hình; chưa nhận response ở mốc này.</step-note>
<step-note data-step="4">Request tới server rồi phản hồi về thêm một RTT. Các mốc là giả định tính tay, không phải capture loopback.</step-note>
</step-flow>

Trục thời gian trong hình là mô hình suy luận, không phải timestamp đo loopback. Các số **0, 40, 80, 120 ms** đến từ giả định RTT **40 ms**, không phải Internet từ máy lab. Bài tính phía dưới nêu đủ điều kiện. Hình tách “gửi request” khỏi “nhận response” để ngăn lỗi gọi 0-RTT là latency bằng không.

Với **early data — dữ liệu ứng dụng gửi trước khi hoàn thành handshake mới nhờ thông tin phiên cũ**, client có thể gửi request ngay cùng chuyến ClientHello sau khi TCP đã mở. Trên TCP mới không Fast Open, vẫn còn chi phí TCP trước đó. Trong mô hình lý tưởng, request tới server sau chuyến TCP và một chiều TLS; response về sớm nhất sau tổng hai RTT tính từ SYN nếu server chấp nhận/xử lý early data. Khi server trì hoãn xử lý hoặc từ chối, phải vẽ lại nhánh ấy.

QUIC không mở TCP trước TLS; bài 19 đã tính đường QUIC. Đừng mang ngân sách của QUIC sang `openssl s_client` trên TCP, cũng đừng cộng TCP handshake vào HTTP/3. Những con số RTT chỉ có ích sau khi xác định transport, full/resumed/early, có Retry hay không và connection đã tồn tại chưa.

### 3.5 Ticket, resumption và replay là ba câu hỏi khác nhau

**Session ticket là thông tin server phát để client xin dùng lại cơ sở phiên trước; PSK — pre-shared key — là bí mật dùng làm đầu vào xác thực/thiết lập khoá trong nhánh tương ứng.** Có ticket không có nghĩa client chỉ cần cầm một chuỗi công khai là đủ giả mạo phiên; resumption còn dựa vào secret tương ứng và kiểm chứng handshake.

TLS 1.3 phát `NewSessionTicket` sau handshake. Một client dừng ngay khi handshake API trả về có thể chưa xử lý thông điệp ấy, tuỳ thư viện và I/O. Vì vậy lab nhận response, đọc các record cần thiết rồi mới lấy `session`; log có `ticket=True` và lần sau kiểm riêng `session_reused`. Không log nội dung ticket hoặc PSK. `ticket=True` ở connection đầu chỉ nói đã có ticket tại thời điểm lấy session; nó chưa nói server sẽ chấp nhận connection kế tiếp.

Server có thể từ chối resumption và làm full handshake, chẳng hạn không còn thông tin cần thiết để xác minh ticket hoặc policy không chấp nhận. Trong cụm có nhiều TLS terminator, khả năng một node chấp nhận ticket của node khác phụ thuộc thiết kế lưu state/khoá và chính sách; không được suy một server local resumed thành cả cụm resumed. Khi deploy đổi cấu hình, cần đo tỉ lệ full/resumed cùng lỗi và tải CPU thay vì chỉ kiểm mọi request còn 200.

Early data là lựa chọn thêm, có điều kiện riêng. `reused=True` không chứng minh đã gửi byte trước phản hồi server. Cần cờ early-data accepted và/hoặc trace phù hợp. **Lab bài này không gửi early data**; Python `ssl` được dùng để đo resumption thông thường. Bài 19 đã có phép thử QUIC early data; không mượn kết quả đó làm bằng chứng 0-RTT trên TCP ở đây.

> **Nguồn.** Đặc tả TLS 1.3 hiện hành ở bộ nguồn tải là RFC 9846, thay RFC 8446. §2.3 nhấn mạnh với early data: *“There are no guarantees of non-replay between connections.”* ([RFC 9846](https://www.rfc-editor.org/rfc/rfc9846#section-2.3)). Bản 8446 cũng được giữ trong `src/` để đối chiếu tài liệu cũ. Lab không chứng minh chống replay chỉ vì traffic được mã hoá.

**Replay là phát lại dữ liệu hợp lệ đã thu được nhằm gây xử lý lặp.** Cơ chế chống duplicate của một connection không tự giải quyết replay giữa các connection hoặc các node. Đổi tên method thành GET không làm thao tác có side effect trở nên chịu replay; phải xem resource thực sự làm gì. RFC 8470 §3 nêu rõ tác động phụ của resource, kể cả khi dùng method được coi là safe, cần được xét.

Với HTTP, RFC 8470 định nghĩa `Early-Data: 1` để truyền thông tin liên quan qua intermediary và **425 Too Early** để origin từ chối xử lý request có rủi ro ở giai đoạn sớm. Đây là vấn đề chặng proxy và resource, không phải một boolean bật chung cho mọi endpoint. Không tin header do client ngoài tự đặt làm bằng chứng an toàn; boundary nhận early data phải có cách xác định và truyền metadata đúng phạm vi tin cậy.

### 3.6 mTLS xác thực peer, ứng dụng vẫn phải quyết quyền

**mTLS — mutual TLS — là cấu hình TLS có xác thực bằng certificate ở cả phía server lẫn phía client.** Client tiếp tục kiểm certificate server như HTTPS thông thường; server yêu cầu, kiểm certificate client và bằng chứng client sở hữu private key tương ứng. Gửi một file certificate công khai đơn lẻ không đủ thay cho bằng chứng sở hữu khoá.

Trong initial handshake TLS 1.3, server đưa `CertificateRequest` vào chuyến thông điệp của mình. Client có thể gửi Certificate, CertificateVerify và Finished trong chuyến trả lời. **CertificateVerify là chữ ký ràng buộc việc sở hữu private key với transcript handshake**, không phải một header HTTP chứa tên người dùng. Ở nhánh initial mTLS này, không có quy tắc bắt buộc thêm một RTT độc lập chỉ vì có client certificate; nhưng thêm byte/chữ ký và điều kiện truyền có thể làm thời gian thực tăng. Post-handshake authentication là nhánh khác, không đo ở bài này.

Trong lab, server cổng 23444 dùng `CERT_REQUIRED`, chỉ tin CA tự sinh. Client thiếu certificate bị phía server ghi `PEER_DID_NOT_RETURN_A_CERTIFICATE`. Client dùng certificate tự ký ngoài CA bị server ghi `CERTIFICATE_VERIFY_FAILED`, còn phía client có thể thấy alert `UNKNOWN_CA`. Client có certificate được ký bởi CA lab mới đi tới handler và nhận body `peer=client`. Chỉ nhìn error string ở client có thể không phân biệt đủ: ca thiếu cert của lần chạy này trả `SSLEOFError:None`, nên log server là bằng chứng quan trọng.

<svg viewBox="0 0 520 330" role="img" aria-labelledby="net23-mtls-t net23-mtls-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net23-mtls-t">Ba nhánh client dừng ở ranh giới khác nhau</title>
<desc id="net23-mtls-d">Thiếu cert và cert ngoài CA dừng ở TLS; cert client hợp lệ tới handler. Độ sâu là giai đoạn, không phải thời gian.</desc>
<defs><marker id="net23-mtls-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
<text x="140" y="25" fill="currentColor" font-size="14">mTLS tại a.test:23444</text><rect x="175" y="45" width="170" height="35" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="187" y="68" fill="currentColor" font-size="13">yêu cầu certificate</text><path d="M260 80 L85 120" fill="none" stroke="currentColor" marker-end="url(#net23-mtls-a)"/><rect x="15" y="125" width="140" height="35" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="24" y="148" fill="currentColor" font-size="13">không cert</text><path d="M260 80 L260 120" fill="none" stroke="currentColor" marker-end="url(#net23-mtls-a)"/><rect x="190" y="125" width="140" height="35" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="199" y="148" fill="currentColor" font-size="13">cert rogue</text><path d="M260 80 L435 120" fill="none" stroke="currentColor" marker-end="url(#net23-mtls-a)"/><rect x="365" y="125" width="140" height="35" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="374" y="148" fill="currentColor" font-size="13">cert client</text><path d="M85 160 L85 210" fill="none" stroke="currentColor" marker-end="url(#net23-mtls-a)"/><path d="M35 215 H135" stroke="#f43f5e" stroke-width="4"/><text x="32" y="241" fill="currentColor" font-size="13">dừng tại TLS</text><path d="M260 160 L260 210" fill="none" stroke="currentColor" marker-end="url(#net23-mtls-a)"/><path d="M210 215 H310" stroke="#f43f5e" stroke-width="4"/><text x="207" y="241" fill="currentColor" font-size="13">dừng tại TLS</text><path d="M435 160 L435 270" fill="none" stroke="currentColor" marker-end="url(#net23-mtls-a)"/><rect x="365" y="275" width="140" height="35" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="375" y="298" fill="currentColor" font-size="13">peer=client</text><text x="15" y="298" fill="currentColor" font-size="13">Chưa có kiểm quyền ứng dụng</text>
</svg>

Ba nhánh dùng đúng ca lab, độ sâu dừng biểu diễn **ranh giới bị từ chối**, không biểu diễn latency. `peer=client` chỉ chứng minh handler đọc được certificate client ở endpoint TLS này. Lab chưa có bảng quyền, role hoặc tenant; không suy ra peer ấy được phép gọi mọi route.

**Authentication là xác minh danh tính; authorization là quyết định danh tính ấy được làm thao tác nào trên tài nguyên nào.** CA tin cậy có thể ký nhiều client; ứng dụng còn phải map định danh đã xác minh sang tài khoản/quyền. Không lấy một header `X-Client-Name` từ request ngoài làm danh tính chỉ vì hệ thống ở đâu đó có bật mTLS.

Nếu LB terminate mTLS, backend không trực tiếp có connection TLS của client. Cần cơ chế chuyển danh tính được xác minh qua chặng tin cậy, chặn đường truy cập bỏ qua proxy và loại/ghi đè header giả từ đầu vào. Nếu backend cũng dùng mTLS với proxy, certificate ở chặng đó thường xác thực proxy; nó không tự là certificate của người dùng đầu tiên. Đây là hai lớp danh tính, không thể gộp bằng một field tên chung mà không biết provenance.

## 4. Lab

### 4.1 Tạo môi trường riêng, không thay trust store của máy

Thư mục `net-lab/net-23/` chứa `run.sh`, `certs.sh`, `lab.py`, `out/`, `src/`. Chạy:

```bash
./run.sh
```

Script dựng `net23-lab` từ `alpine:3.20`, cài Python/OpenSSL rồi tự tạo CA, hai certificate server `a.test`, `b.test`, một client certificate được CA lab ký và một certificate tự ký `rogue`. Server cert có SAN tương ứng; mục đích sử dụng mở rộng là `serverAuth`, còn client được ký có `clientAuth`. Các cấu trúc chain/EKU chỉ dùng làm điều kiện lab; xem bài engineering nếu cần ôn cách xác minh chuỗi.

Mọi key nằm trong thư mục tạm `private/`, tạo với quyền giới hạn, không đi vào output bài học. Trap xoá thư mục ấy và container khi script thoát. Không có publish port, không tải certificate/key từ hệ thống thật. Chỉ client context của phép thử nạp CA này; trust store trên máy host không bị sửa.

Đầu `out/lab.txt`:

```text
ENV Linux 6.8.0-64-generic aarch64 OpenSSL 3.3.7 7 Apr 2026
```

**Thấy gì:** đây là Python/OpenSSL trong Linux VM, không phải `openssl` của macOS. **Vì sao:** API chọn ALPN, việc xử lý session và cách lỗi xuất hiện có thể khác theo runtime. Script cố định cả minimum và maximum TLS version ở 1.3 để không lẫn kết quả TLS 1.2 vào nhánh so sánh.

### 4.2 Cho bản sai “Host chọn certificate” thất bại

Callback server đổi TLS context theo SNI; client luôn kết nối socket tới cùng địa chỉ. Phần quyết định rút từ script:

```python
def sni(sock, name, ctx):
    sock.context = bctx if name == 'b.test' else base
base.set_servername_callback(sni)
# Socket luôn tới 127.0.0.1; tên logic truyền riêng:
ctx.wrap_socket(raw_socket, server_hostname=name)
```

Client sau đó gửi `Host: unrelated.test`, cố định cho mọi lượt. Trích log thật:

```text
SNI_A TLS=TLSv1.3 cert=a.test ALPN=http/1.1 reused=False ticket=True response=peer=none
SNI_B TLS=TLSv1.3 cert=b.test ALPN=http/1.1 reused=False ticket=True response=peer=none
WRONG_NAME ERROR=SSLCertVerificationError:CERTIFICATE_VERIFY_FAILED
```

**Thấy gì:** log in CN để nhận diện certificate; verifier thực sự kiểm tên bằng SAN đã tạo. Đổi SNI đổi certificate được chọn; tên không được certificate mặc định đại diện bị client chặn. **Vì sao:** callback chạy trong handshake, trước khi handler nhận request. `Host` không quay ngược thời gian để sửa lựa chọn ấy. `peer=none` chỉ nói server không nhận certificate client trong nhánh HTTPS một chiều, không nói client đã bỏ kiểm certificate server.

### 4.3 Kiểm cả TLS và ALPN

Client thường đề xuất `['h2', 'http/1.1']`, server chỉ cấu hình `['http/1.1']`; kết quả ở hai ca SNI trên là giao thức chung thứ hai. Sau đó script tạo client chỉ đề xuất `net23-unknown`:

```text
NO_OVERLAP TLS=TLSv1.3 ALPN=None HTTP_NOT_SENT
```

**Thấy gì:** vẫn có TLS 1.3 nhưng không có ALPN được chọn. **Vì sao:** đây là hành vi của đường API đã dùng, khác yêu cầu fatal alert trong RFC 7301. Client không gửi request khi không có thoả thuận; server cũng không chạy handler cho protocol ấy. Vì vậy không thể nhìn “socket TLS mở thành công” rồi khẳng định đã có HTTP/2.

Đo trên service khác cần thu ALPN ở chính endpoint terminate. Nếu client–LB là h2 và LB–origin là HTTP/1.1, log origin báo 1.1 không phủ định h2 của client. Đừng sửa thư viện client khi chưa biết log đang thuộc chặng nào. Lab này không có proxy nên mỗi tên chỉ có một chặng TLS.

### 4.4 Nhận ticket rồi chứng minh dùng lại

Client giữ cùng `SSLContext`, lấy session sau khi đọc response của lần đầu và truyền session đó cho connection mới. Không dùng lại socket cũ. Phần gọi rút gọn:

```python
ctx = clientctx()
ticket = request('FRESH', 'a.test', ctx=ctx)
request('RESUME', 'a.test', ctx=ctx, session=ticket)
request('NO_TICKET', 'a.test')
```

Output:

```text
FRESH TLS=TLSv1.3 cert=a.test ALPN=http/1.1 reused=False ticket=True response=peer=none
RESUME TLS=TLSv1.3 cert=a.test ALPN=http/1.1 reused=True ticket=True response=peer=none
NO_TICKET TLS=TLSv1.3 cert=a.test ALPN=http/1.1 reused=False ticket=True response=peer=none
```

**Thấy gì:** cùng có ticket ở cuối nhưng chỉ lượt chủ động dùng session trước được resumed. **Vì sao:** `ticket=True` mô tả trạng thái đã nhận, còn `reused` mô tả nhánh handshake của chính connection. Lượt không đưa ticket có thể nhận ticket mới sau full handshake; đó không phải resumption ngược về quá khứ.

Script thực hiện đóng TLS có `close_notify` bằng `unwrap()` để hai đầu kết thúc trật tự. Kết quả hiện tại lấy từ cờ runtime thực, không phải biến đặt tên `RESUME`.

Đây không phải phép đo RTT. Không có netem hoặc timestamp handshake ở lab 23, nên không lấy thời gian loopback làm latency Internet. Việc đã xác nhận đúng nhánh handshake cho phép dùng sơ đồ RTT của đặc tả để tính một mô hình riêng; muốn số đo thực cần capture/trace và mốc bắt đầu tương ứng.

### 4.5 Ba client tới cổng bắt buộc mTLS

Cổng 23444 dùng cùng server identity `a.test` nhưng thêm `CERT_REQUIRED` và CA client của lab. Log có các dòng sau; thứ tự dòng server/client có thể xen nhau vì hai thread:

```text
SERVER_MTLS_REJECT SSLError PEER_DID_NOT_RETURN_A_CERTIFICATE
MTLS_MISSING ERROR=SSLEOFError:None
MTLS_UNTRUSTED ERROR=SSLError:TLSV1_ALERT_UNKNOWN_CA
SERVER_MTLS_REJECT SSLCertVerificationError CERTIFICATE_VERIFY_FAILED
MTLS_VALID TLS=TLSv1.3 cert=a.test ALPN=http/1.1 reused=False ticket=True response=peer=client
```

**Thấy gì:** thiếu cert và cert không được tin đều không nhận response HTTP; cert hợp lệ đi tới handler. **Vì sao:** đây là kiểm xác thực peer ở TLS trước ứng dụng. Client thiếu cert không nhận một status HTTP 401 trong phép thử này vì chưa tới tầng HTTP. Ngược lại, một ứng dụng đã xác thực client nhưng từ chối quyền có thể trả lỗi HTTP; cần đọc mốc thất bại để không nhầm hai loại.

Script chỉ in loại lỗi/reason cần phân loại và tên client lab. Không in PEM, private key, serialized session, ticket hay thông tin người dùng thật. Certificate ngoài CA ở đây là một ca âm có chủ đích, không phải thử nghiệm revoke. Không suy từ nó rằng CRL/OCSP hoặc rotation của cả cụm đã được kiểm.

> **Chưa đo.** Chưa dựng proxy terminate/passthrough/re-encryption, chưa gài HelloRetryRequest, early data trên TCP, replay, ECH, post-handshake client authentication, ticket sharing qua nhiều node hoặc rotation CA. Các sơ đồ RTT và proxy là mô hình có điều kiện; bộ log chỉ chứng minh SNI chọn context, ALPN của API này, resumption local và ba nhánh mTLS.

## 5. Tính tay

Các con số RTT ở đây là **giả định bài toán**, không phải số đo lab 23. Bỏ DNS, CPU, loss, bandwidth serialization, TCP Fast Open và server processing; đường đối xứng, RTT **40 ms**. Các phép tính được lưu ở `out/calculations.txt`.

### 5.1 Đếm tới request hay tới response?

TCP mới với TLS 1.3 full handshake, không HelloRetryRequest: từ SYN tới lúc client gửi request cần bao lâu? Tới response nhỏ đầu tiên? Nếu TCP đã mở sẵn nhưng TLS chưa bắt đầu thì sao?

**Giải:** TCP hoàn tất phía client ở **40 ms**; chuyến ClientHello/phản hồi server đưa tới **80 ms**, lúc client gửi Finished và request. Request tới server ở **100 ms**, response về client ở **120 ms**. Nếu bỏ TCP đã mở khỏi mốc đo, từ ClientHello tới gửi request là **40 ms**, tới response là **80 ms**. Cùng cơ chế nhưng mốc bắt đầu khác làm hai kết quả khác nhau; không lấy số từ SYN so trực tiếp với số từ ClientHello.

### 5.2 Resumed có tự tiết kiệm một RTT không?

Vẫn TCP mới, có ticket được chấp nhận nhưng không early data. Sau đó xét riêng early data được chấp nhận/xử lý ngay. Tính thời điểm nhận response; nếu full handshake có thêm một HelloRetryRequest thì thay đổi ra sao?

**Giải:** resumption 1-RTT vẫn nhận response ở khoảng **120 ms** theo mô hình trên; giảm byte/công việc không tự giảm số chuyến cần đợi. Nhánh early data gửi request cùng ClientHello ở **40 ms**, server nhận ở **60 ms**, response về sớm nhất **80 ms**. Tiết kiệm **40 ms**, tức một RTT của nhánh TLS, không đưa tổng thời gian từ SYN về không. Full handshake thêm HelloRetryRequest cần thêm **40 ms**, đưa response lý tưởng tới **160 ms**. Lab chỉ chứng minh resumed, chưa chạy hai nhánh early/HRR này.

### 5.3 Hai chặng TLS, một quan sát xanh

**Giả định riêng:** client–proxy đã có connection nóng; proxy phải mở TCP/TLS mới tới origin với RTT **10 ms**, TLS 1.3 full, không HRR. Origin trả tức thì sau khi nhận request nhỏ. Bỏ thời gian truyền ở chặng client–proxy để chỉ tính phần upstream. Proxy nhận client request ở thời điểm 0 thì sớm nhất nhận response origin lúc nào? Có được kết luận “TLS client nóng nên không có thiết lập” không?

**Giải:** upstream TCP cần **10 ms**, TLS trước gửi request thêm **10 ms**, request/response thêm **10 ms**, tổng **30 ms**. Client TLS nóng chỉ loại thiết lập ở chặng của client. Nếu upstream handshake fail vì SNI/trust thì dù chặng đầu hoàn toàn hợp lệ, request vẫn không có response origin thành công. Không cộng con số 30 ms này như hằng số cho mọi proxy: có pool upstream nóng thì điều kiện đã đổi.

## 6. Chuyển giao

1. Endpoint mới dùng certificate đúng nhưng chỉ client cũ lỗi sau deploy. Bạn ghi metadata nào để phân biệt trust store, tên verify, SNI, ALPN và policy TLS mà không log secret?
2. Một proxy báo client handshake thành công, origin không có HTTP access log, người dùng nhận lỗi gateway. Hãy đặt probe để biết proxy chưa mở được TCP, fail TLS upstream hay chưa gửi request.
3. Tỉ lệ resumed tụt khi tăng số TLS terminator nhưng status HTTP vẫn tốt. Nêu các đối chứng để tách ticket key/state không tương thích, client không giữ session và route thay đổi; đừng mặc định phải chia sẻ mọi key ngay.
4. Client có cert được CA tin cậy ký nhưng bị ứng dụng từ chối một route. Bạn tách authentication, mapping danh tính và authorization bằng bằng chứng nào? HTTP header nào không được tin từ đường truy cập ngoài?
5. Bật early data chỉ cho GET nhưng một route GET tạo báo cáo tính phí. Bạn thay chính sách bằng tiêu chí nào, xử lý 425/retry ra sao và cần chứng minh gì ở phạm vi nhiều node?
6. **Câu khó nhất, không có đáp án trong bài.** Thiết kế rollout vừa đổi CA client vừa rotate ticket keys cho hai lớp proxy và backend, có resumption đang hoạt động và đường truy cập trực tiếp backend cần bị chặn. Làm sao chứng minh client hợp lệ không bị mất quyền giữa rollout, client bị thu hồi không tiếp tục dựa vào state cũ, và danh tính chuyển qua proxy không bị giả? Hãy xác định ma trận phiên cũ/mới, điểm thực thi policy, bằng chứng từng chặng và điều kiện rollback mà không khôi phục credential đã bị thu hồi.

## 7. Tóm tắt

- SNI được gửi ở ClientHello để giúp chọn cấu hình TLS; Host xuất hiện sau không sửa được certificate của handshake đó.
- Tên dùng xác minh certificate và địa chỉ TCP có nhiệm vụ khác nhau; lab giữ IP nhưng đổi SNI để chọn `a.test` hoặc `b.test`.
- ALPN chọn giao thức ứng dụng; TLS 1.3 không tự đồng nghĩa HTTP/2 hay HTTP/3.
- Lab không có ALPN chung vẫn thấy `ALPN=None`; đó là hành vi implementation, khác yêu cầu fatal alert của RFC 7301 §3.2.
- Ticket được nhận không chứng minh resumption; lab có `reused=True` ở connection mới truyền session trước đó.
- TLS 1.3 resumption thông thường và 0-RTT là hai nhánh khác nhau; RFC 9846 §2.3 không bảo đảm chống replay giữa các connection cho early data.
- mTLS xác thực peer tại TLS endpoint; quyền ứng dụng và danh tính đi qua proxy cần chính sách riêng.

→ **Bài 24 — Load balancer L4 và L7 từ bên trong**: khi đã biết thông tin nào hiện hữu ở từng thời điểm, ta theo tiếp cách LB chọn backend, giữ đường trả lời và drain connection trong lúc deploy.
