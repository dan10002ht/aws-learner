# Bài 13 — WebSocket, QUIC & WebTransport

## 1. Mục tiêu

Sau bài này bạn có thể:

- Liệt kê **đúng bốn cánh cửa mạng** mà JavaScript trong trình duyệt được phép mở, và nói được vì sao danh sách đó là ràng buộc cứng chứ không phải thiếu sót của trình duyệt.
- Tính ra **chi phí byte thật** của WebSocket, UDP thô và QUIC datagram trên cùng một payload, và giải thích vì sao thứ "hiện đại hơn" lại tốn nhiều byte hơn.
- Dùng công thức **ngưỡng `1000/RTT`** để quyết định một message cụ thể có đáng gửi lại hay không — và chứng minh vì sao TCP gửi lại một snapshot 30 Hz là gửi rác.
- Phân biệt **stream tin cậy** và **datagram không tin cậy** trong QUIC, và ánh xạ từng loại message của game vào đúng một trong hai.
- Nói được vì sao WebRTC DataChannel có UDP thật mà nhiều studio vẫn tránh, bằng **danh sách thành phần vận hành** chứ bằng cảm tính.
- Chọn đường truyền cho một game web mới và **bảo vệ lựa chọn đó bằng số**, kể cả khi lựa chọn ấy là cái cũ nhất trong bốn cái.

---

## 2. Triệu chứng

Một studio nhỏ có game bắn súng .io chạy native, netcode viết bằng UDP thô, ổn định nhiều năm. Họ quyết định port sang trình duyệt để phát hành trên portal game web — không cài đặt, click là chơi.

Lập trình viên mạng mở tài liệu trình duyệt, tìm API mở UDP socket, và không tìm thấy. Không có. Không phải "cần quyền", không phải "đang thử nghiệm" — **không tồn tại**.

Kiểm lại xem họ mất những gì. Netcode cũ của họ dùng ba chế độ gửi, đúng như bài 14 sẽ dựng lại:

```
unreliable-unordered   vị trí, snapshot        ~85 % số message
unreliable-sequenced   góc nhìn, animation     ~10 %
reliable-ordered       vào/ra phòng, mua đồ     ~5 %
```

Cổng duy nhất họ port sang nhanh được là WebSocket. WebSocket chạy trên TCP, và TCP chỉ có **một** chế độ: reliable-ordered. Nghĩa là 95% số message của họ vừa bị ép sang một chế độ đắt hơn thứ nó cần.

Cái giá đo được ngay ở lần chơi thử đầu tiên. RTT 40 ms. Một packet rơi trên đường thì TCP giữ mọi byte đến sau nó lại cho tới khi bản gửi lại tới nơi — **40 ms**, tức **2,4 tick** ở 60 Hz. Ngân sách 182 ms của bài 8 thành **222 ms**, tăng **22%**, cho đúng một packet mất. Ở tỉ lệ mất gói 1% với 60 message/giây chiều lên, chuyện đó xảy ra **36 lần mỗi phút**.

Bài 12 đã đo head-of-line blocking ra mili giây và kết luận UDP thắng. Bài này bắt đầu từ chỗ kết luận đó **không dùng được**: trong trình duyệt bạn không có UDP.

---

## ⏸ Dừng lại — đoán trước #1

Chọn trước khi đọc tiếp.

**Vì sao trình duyệt không cho JavaScript mở raw UDP socket?**

```
(a) Thiếu sót lịch sử — các chuẩn mới đang bổ sung dần
(b) UDP không có mã hoá nên vi phạm chính sách bảo mật web
(c) Một trang bất kỳ mở được UDP socket tuỳ ý là một khẩu súng DDoS bắn được từ tab quảng cáo
(d) Hiệu năng — engine JS không xử lý nổi nhịp gói tin của UDP
```

---

## 3. Lý thuyết

### 3.1 Bốn cánh cửa, và cái giá vào cửa

Đáp án là **(c)**, và hệ quả của nó định hình toàn bộ kiến trúc game web.

Mọi đường ra mạng của trình duyệt đều bị ràng buộc bởi cùng một nguyên tắc: bên kia phải **đồng ý bị kết nối**, bằng một cái bắt tay mà trang web không tự bịa ra được. HTTP và WebSocket dùng bắt tay HTTP kèm `Origin`; WebRTC dùng ICE với chuỗi ngẫu nhiên hai bên trao đổi trước; QUIC/WebTransport dùng bắt tay TLS. Không có cửa nào cho phép bắn một gói tin tới một địa chỉ tuỳ ý mà bên nhận chưa đồng ý gì.

Đó là lý do danh sách chỉ có bốn mục, và không mục nào là "socket".

<svg viewBox="0 0 700 268" role="img" aria-labelledby="gs13-a-t gs13-a-d" style="width:100%;height:auto">
<title id="gs13-a-t">Bốn cánh cửa mạng của trình duyệt và tầng vận chuyển bên dưới mỗi cửa</title>
<desc id="gs13-a-d">Raw UDP và raw TCP không tồn tại. HTTP và WebSocket chạy trên TCP nên chịu head-of-line blocking. WebRTC DataChannel chạy trên UDP qua DTLS và SCTP, cho phép gửi không tin cậy. WebTransport chạy trên QUIC trên UDP, cho cả stream tin cậy lẫn datagram không tin cậy.</desc>
<text x="15" y="20" font-size="12" font-weight="bold" fill="currentColor">JavaScript trong trang web được mở:</text>
<rect x="15" y="32" width="200" height="46" rx="8" fill="#ef4444" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 4"/>
<text x="30" y="52" font-size="11" font-weight="bold" fill="currentColor">raw UDP socket</text>
<text x="30" y="70" font-size="10" fill="currentColor" opacity="0.75">KHÔNG TỒN TẠI</text>
<line x1="25" y1="72" x2="205" y2="38" stroke="#ef4444" stroke-opacity="0.7" stroke-width="2"/>
<rect x="230" y="32" width="200" height="46" rx="8" fill="#ef4444" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 4"/>
<text x="245" y="52" font-size="11" font-weight="bold" fill="currentColor">raw TCP socket</text>
<text x="245" y="70" font-size="10" fill="currentColor" opacity="0.75">KHÔNG TỒN TẠI</text>
<line x1="240" y1="72" x2="420" y2="38" stroke="#ef4444" stroke-opacity="0.7" stroke-width="2"/>
<rect x="15" y="96" width="160" height="72" rx="8" fill="#3b82f6" fill-opacity="0.20" stroke="currentColor" stroke-opacity="0.3"/>
<text x="95" y="118" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">HTTP / fetch</text>
<text x="95" y="138" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">request–response</text>
<text x="95" y="156" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">meta, không phải trận</text>
<rect x="187" y="96" width="160" height="72" rx="8" fill="#3b82f6" fill-opacity="0.20" stroke="currentColor" stroke-opacity="0.3"/>
<text x="267" y="118" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">WebSocket</text>
<text x="267" y="138" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">song công, message</text>
<text x="267" y="156" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">chỉ reliable-ordered</text>
<rect x="359" y="96" width="160" height="72" rx="8" fill="#f59e0b" fill-opacity="0.20" stroke="currentColor" stroke-opacity="0.3"/>
<text x="439" y="118" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">WebRTC DataChannel</text>
<text x="439" y="138" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">chọn được unreliable</text>
<text x="439" y="156" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">giá: ICE / STUN / TURN</text>
<rect x="531" y="96" width="154" height="72" rx="8" fill="#84cc16" fill-opacity="0.20" stroke="currentColor" stroke-opacity="0.3"/>
<text x="608" y="118" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">WebTransport</text>
<text x="608" y="138" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">stream + datagram</text>
<text x="608" y="156" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">mới nhất trong bốn</text>
<line x1="95" y1="168" x2="95" y2="196" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<line x1="267" y1="168" x2="267" y2="196" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<line x1="439" y1="168" x2="439" y2="196" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<line x1="608" y1="168" x2="608" y2="196" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<rect x="15" y="196" width="332" height="30" rx="6" fill="#3b82f6" fill-opacity="0.28"/>
<text x="181" y="216" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">TCP — một dòng byte, head-of-line blocking</text>
<rect x="359" y="196" width="160" height="30" rx="6" fill="#f59e0b" fill-opacity="0.28"/>
<text x="439" y="216" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">DTLS + SCTP</text>
<rect x="531" y="196" width="154" height="30" rx="6" fill="#84cc16" fill-opacity="0.28"/>
<text x="608" y="216" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">QUIC</text>
<rect x="359" y="234" width="326" height="26" rx="6" fill="#84cc16" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
<text x="522" y="252" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">UDP — mất gói không chặn gói sau</text>
</svg>

Hai ô đỏ ở trên không phải chỗ để phàn nàn. Chúng là **tiền đề**. Mọi quyết định còn lại của bài này nằm gọn trong bốn ô còn lại.

### 3.2 WebSocket là TCP mặc bộ vest

WebSocket không sửa gì của TCP. Nó chỉ thêm một lớp đóng khung lên trên, để hai bên trao đổi **message có ranh giới** thay vì một dòng byte không đầu không cuối.

*(Các chi tiết khung tin và bắt tay dưới đây là kiến thức chuẩn RFC 6455, không phải thứ tôi đo trong bài này. Con số byte thì tự cộng được và tôi có tính lại.)*

**Bắt tay.** Kết nối bắt đầu bằng một request HTTP có `Upgrade: websocket`; server trả `101 Switching Protocols`. Chi tiết này nghe như thủ tục hành chính, nhưng nó là lý do WebSocket sống sót ở những nơi UDP chết: với mọi firewall, proxy doanh nghiệp và CDN trên đường đi, kết nối này **trông y hệt một request HTTPS**. Thêm TLS vào là thành `wss://`, port 443, không phân biệt được với việc tải một trang web.

**Khung tin.** Mỗi message được bọc trong một frame:

| Thành phần | Kích thước | Ghi chú |
|---|---|---|
| Header cơ sở (opcode, FIN, độ dài) | **2 B** | payload < 126 B |
| Độ dài mở rộng | +2 B hoặc +8 B | payload 126–65.535 B, hoặc lớn hơn |
| Masking key | **4 B** | **bắt buộc** ở frame client → server; server → client không có |
| Payload | tuỳ | |

**Masking là chỗ hay bị hỏi.** Client phải XOR toàn bộ payload với một khoá ngẫu nhiên 4 byte đổi mỗi frame. Nó không phải bảo mật — khoá gửi kèm ngay trong frame, ai đọc được frame thì giải mã được. Nó tồn tại để một trang web độc hại không thể **điều khiển chính xác byte** đi ra khỏi trình duyệt và lừa một proxy cũ diễn giải luồng đó thành một request HTTP thứ hai. Cùng một nguyên tắc với đáp án (c) ở trên: trình duyệt không cho trang web nói tuỳ ý ra mạng. Cái giá bạn trả: 4 byte mỗi frame chiều lên, cộng một vòng XOR trên mỗi byte payload.

**Ping/pong.** WebSocket có sẵn hai opcode điều khiển để giữ kết nối sống — cần thiết vì NAT và proxy doanh nghiệp thường đóng kết nối im lặng sau vài chục giây. Đừng dùng ping/pong này để đo RTT cho game: nhiều runtime trả lời pong ở tầng thư viện, không đi qua code của bạn, nên số bạn đo được là RTT của thư viện chứ không phải của message game. Bài 14 dựng một cơ chế đo RTT riêng, gắn vào chính chuỗi sequence number của bạn.

**Cộng byte ra tiền.** Một input packet 20 byte, gửi 60 lần/giây chiều lên, IPv4:

| Đường truyền | Chi phí bao bọc | Tổng/packet | Chiều lên mỗi player | So với UDP thô |
|---|---|---|---|---|
| UDP thô | IP 20 + UDP 8 = 28 B | **48 B** | 2,88 KB/s | — |
| WebSocket/TCP | IP 20 + TCP 20 + frame 2 + mask 4 = 46 B | **66 B** | 3,96 KB/s | **+37,5 %** |

*(Giả định: header TCP không có option, payload dưới 126 byte, IPv4. Header IPv6 là 40 byte thay vì 20, cộng thêm cho cả hai dòng như nhau.)*

37,5% nghe to, nhưng quy ra: 100 player chiều lên là **0,396 MB/s thay vì 0,288 MB/s**. Trên hoá đơn băng thông của bài 8 — nơi chiều xuống một mình đã là 1 MB/s — đây không phải chỗ đau. **Chi phí byte không phải lý do để bỏ WebSocket.** Lý do nằm ở mục sau.

---

## ⏸ Dừng lại — đoán trước #2

Hộp quan trọng nhất của bài. Có người trong đội lập luận thế này, và nghe rất lọt tai:

> *"Head-of-line blocking bị thổi phồng. TCP gửi lại gói mất trong đúng 1 RTT = 40 ms. Ta chỉ trễ 40 ms cho một packet hiếm khi rơi. Chịu được."*

Server gửi snapshot **30 Hz**. Một snapshot rơi. RTT 40 ms.

**Bản gửi lại tới nơi. Client làm gì với nó?**

```
(a) Dùng nó — trễ 40 ms vẫn hơn không có gì
(b) Dùng nó để nội suy ngược, lấp khoảng trống đã vẽ sai
(c) Vứt đi — nó đã lỗi thời trước khi tới nơi
(d) Tuỳ loại message, và có một phép tính quyết định chuyện đó
```

---

### 3.3 Hạn sử dụng của một message

Đáp án là **(d)**, và phép tính ngắn đến bất ngờ.

Snapshot phát ở tần số `S` thì **hai snapshot liên tiếp cách nhau `1000/S` ms**. Một bản gửi lại mất thêm `RTT` ms mới tới. Nếu `RTT ≥ 1000/S`, bản gửi lại đến **sau** khi client đã nhận một snapshot mới hơn, mô tả một thế giới muộn hơn. Nó không chỉ vô dụng — nó là rác cần được lọc bỏ, và bạn đã trả 40 ms head-of-line blocking để nhận nó.

```
Ngưỡng vô dụng:   1000 / S  ≤  RTT      tức     S  ≥  1000 / RTT
```

| RTT | Snapshot rate mà gửi lại còn ý nghĩa | Ở 20 Hz, bản gửi lại còn dùng được bao lâu |
|---|---|---|
| 20 ms | dưới 50 Hz | 30 ms trên 50 ms = 60 % chu kỳ |
| **40 ms** | **dưới 25 Hz** | **10 ms trên 50 ms = 20 % chu kỳ** |
| 100 ms | dưới 10 Hz | 0 — luôn tới muộn |
| 200 ms | dưới 5 Hz | 0 — luôn tới muộn |

Đọc lại lập luận trong hộp ⏸ với bảng này: ở snapshot 30 Hz, RTT 40 ms, ngưỡng là 25 Hz, và 30 > 25. **TCP vừa dừng cả dòng dữ liệu 40 ms để giao một gói mà client bắt buộc phải vứt đi.** Đó là phần "bị thổi phồng" của head-of-line blocking: cái giá không phải 40 ms độ trễ, mà là 40 ms độ trễ **đổi lấy số không**.

<svg viewBox="0 0 700 200" role="img" aria-labelledby="gs13-b-t gs13-b-d" style="width:100%;height:auto">
<title id="gs13-b-t">Bản gửi lại của một snapshot 30 hertz tới nơi sau khi đã có snapshot mới hơn</title>
<desc id="gs13-b-d">Trục thời gian 30 hertz, mỗi snapshot cách nhau 33,3 mili giây. Snapshot số 2 bị mất, bản gửi lại tới sau 40 mili giây, tức sau khi snapshot số 3 đã tới. Client vứt bản gửi lại đi, nhưng vẫn phải chịu 40 mili giây bị chặn dòng.</desc>
<line x1="40" y1="70" x2="670" y2="70" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
<text x="40" y="26" font-size="11" font-weight="bold" fill="currentColor">Server gửi snapshot 30 Hz — cách nhau 33,3 ms</text>
<circle cx="80" cy="70" r="6" fill="#84cc16"/><text x="80" y="56" text-anchor="middle" font-size="10" fill="currentColor">S1</text>
<circle cx="230" cy="70" r="6" fill="#ef4444"/><text x="230" y="56" text-anchor="middle" font-size="10" fill="currentColor">S2 mất</text>
<circle cx="380" cy="70" r="6" fill="#84cc16"/><text x="380" y="56" text-anchor="middle" font-size="10" fill="currentColor">S3</text>
<circle cx="530" cy="70" r="6" fill="#84cc16"/><text x="530" y="56" text-anchor="middle" font-size="10" fill="currentColor">S4</text>
<text x="80" y="92" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">t=0</text>
<text x="230" y="92" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">33,3</text>
<text x="380" y="92" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">66,7</text>
<text x="530" y="92" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.7">100,0</text>
<rect x="230" y="112" width="180" height="24" rx="5" fill="#ef4444" fill-opacity="0.30" stroke="currentColor" stroke-opacity="0.3"/>
<text x="320" y="129" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">TCP chặn dòng — 40 ms</text>
<circle cx="410" cy="124" r="6" fill="#f59e0b"/>
<text x="425" y="128" font-size="10" fill="currentColor">S2 gửi lại tới nơi — nhưng S3 đã tới lúc 66,7</text>
<line x1="380" y1="76" x2="380" y2="150" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3"/>
<text x="425" y="146" font-size="10" font-weight="bold" fill="#ef4444">→ client vứt S2 đi</text>
<text x="40" y="176" font-size="11" font-weight="bold" fill="currentColor">Trả 40 ms chặn dòng để nhận một gói phải vứt. Ngưỡng: S ≥ 1000/RTT thì gửi lại luôn vô nghĩa.</text>
</svg>

Từ đây rút ra tiêu chí phân loại **mọi** message của game, và nó sẽ theo bạn tới hết chương 6:

> Một message có **hạn sử dụng** nếu tồn tại một message sau nó khiến nó trở nên thừa. Vị trí, vận tốc, góc nhìn, HP hiện tại — tất cả đều có hạn sử dụng: bản mới thay thế hoàn toàn bản cũ. "Người chơi X rời phòng", "mua item Y", "trận kết thúc" thì **không có** — không có bản mới nào thay thế chúng, mất là mất vĩnh viễn.
>
> **Message có hạn sử dụng → gửi bằng datagram không tin cậy. Message không có hạn → gửi bằng stream tin cậy.**

Đó chính là cặp ánh xạ mà cả phần còn lại của bài đi tìm đường truyền để thực hiện. WebSocket chỉ có một nửa bên phải.

### 3.4 WebRTC DataChannel — UDP thật, và hoá đơn đi kèm

Trong nhiều năm, đây là **cách duy nhất** có UDP thật trong trình duyệt. DataChannel chạy trên SCTP trên DTLS trên UDP, và SCTP cho bạn chọn độ tin cậy ở mức từng kênh:

```js
// kênh cho snapshot: không gửi lại, không giữ thứ tự
pc.createDataChannel("state", { ordered: false, maxRetransmits: 0 });
// kênh cho sự kiện: mặc định — tin cậy, đúng thứ tự
pc.createDataChannel("events");
```

Ba dòng đó là chính xác cặp ánh xạ ở mục 3.3. Về mặt năng lực, vấn đề đã giải quyết xong từ lâu.

Vấn đề là cái chưa hiện trong đoạn code trên. Để `pc` kia kết nối được, bạn phải có:

| Thành phần | Làm gì | Bạn phải vận hành gì |
|---|---|---|
| Signaling | Hai bên trao SDP offer/answer cho nhau | **Một server riêng** — thường vẫn là WebSocket |
| STUN | Phát hiện địa chỉ công khai sau NAT | Server STUN (rẻ, nhưng vẫn là một dịch vụ) |
| ICE | Thử mọi cặp đường đi, chọn cái thông | Thời gian thiết lập dài hơn và **không cố định** |
| TURN | Tiếp sức khi ICE thất bại | **Server chuyển tiếp toàn bộ traffic** — trả tiền theo băng thông |
| Thư viện server | Nói SCTP/DTLS/ICE ở phía server | Hệ sinh thái mỏng hơn WebSocket rõ rệt |

Để so sánh cho công bằng: đường này **không** cần TURN khi máy chủ là dedicated server có IP công khai — đó là điểm bài 16 sẽ bóc kỹ. Nhưng bạn vẫn phải dựng signaling, vẫn phải chạy ICE, vẫn phải nuôi một stack DTLS/SCTP ở phía server.

Đó là câu trả lời cho "vì sao nhiều studio tránh": bạn đổi **một** thành phần vận hành lấy **bốn**, để mua về thứ mà mục 3.5 và 3.6 sẽ đưa cho bạn với giá một thành phần. WebRTC được thiết kế cho hội nghị truyền hình ngang hàng; dùng nó cho client-server là dùng một cỗ máy tìm đường trong khi bạn đã biết trước đường.

### 3.5 QUIC — nhiều làn thay vì một làn

QUIC chạy trên UDP và dựng lại toàn bộ phần "đảm bảo" trong không gian người dùng. Hai tính chất khiến nó khác TCP về bản chất chứ không phải về mức độ.

**Một — nhiều stream độc lập.** TCP có đúng một dòng byte: mất một segment thì mọi byte đến sau bị giữ lại, bất kể chúng thuộc về chuyện gì. QUIC mang nhiều stream trong cùng một kết nối, mỗi stream có thứ tự riêng. Mất một packet của stream A thì **stream B vẫn giao hàng bình thường**. Head-of-line blocking không biến mất — nó co lại từ "cả kết nối" xuống "một stream".

Điều này quan trọng hơn nghe tưởng: nó cho bạn tách "chat" và "mua item" và "kết quả trận" thành ba stream, để một tin chat rơi không làm nghẽn kết quả trận. Nhưng nó **vẫn không giải** được bài toán snapshot ở mục 3.3 — snapshot nằm trên một stream thì các snapshot trong stream đó vẫn xếp hàng sau nhau.

**Hai — datagram không tin cậy (RFC 9221).** Đây mới là thứ giải bài toán đó: một loại frame gửi đi không đánh số thứ tự giao hàng, không gửi lại, không chặn gì cả. Chính là UDP, nhưng nằm trong một kết nối đã mã hoá và đã điều khiển tắc nghẽn. *(Đây là kiến thức đặc tả, không phải đo trong bài này — hãy tự đối chiếu RFC nếu bạn cần chi tiết.)*

Hai tính chất đó gộp lại cho ta **một kết nối duy nhất mang cả hai nửa của cặp ánh xạ 3.3**. Đó là điểm mới thật sự, không phải "nhanh hơn".

**Ba — connection ID.** TCP định danh một kết nối bằng bộ bốn `(IP nguồn, port nguồn, IP đích, port đích)`. Điện thoại chuyển từ wifi sang 4G là IP nguồn đổi, bộ bốn đổi, **kết nối chết** — người chơi bị đá khỏi trận và phải vào lại. QUIC định danh bằng một **connection ID** nằm trong gói tin, không phải bằng địa chỉ, nên kết nối sống sót qua lần đổi mạng đó. Với game mobile chơi trên đường, đây có thể là tính năng đáng giá nhất trong cả bài.

**Bốn — 0-RTT resume.** Client từng nối tới server này có thể gửi dữ liệu ngay trong gói đầu tiên, không chờ bắt tay xong. Lưu ý giới hạn, vì nó là giới hạn thật: dữ liệu 0-RTT có thể bị phát lại (replay), nên chỉ được dùng cho thao tác lặp lại không gây hại. "Xin snapshot hiện tại" thì được; "mua item" thì không — bài 34 xếp đúng thứ này vào loại replay attack.

**Và đây là chỗ phản trực giác.** "QUIC chạy trên UDP nên nhẹ hơn WebSocket" là câu sai. Cộng byte cho cùng payload 20 byte:

| Đường truyền | Chi phí bao bọc mỗi packet | Tổng | Chiều lên 60 Hz |
|---|---|---|---|
| UDP thô | 28 B | **48 B** | 2,88 KB/s |
| WebSocket/TCP | 46 B | **66 B** | 3,96 KB/s |
| QUIC datagram | IP+UDP 28 + QUIC 11 + AEAD tag 16 + frame 1 = 56 B | **76 B** | 4,56 KB/s |

*(Giả định QUIC: header ngắn 1 byte cờ + connection ID 8 byte + packet number 2 byte, cộng 16 byte thẻ xác thực AEAD và 1 byte kiểu frame DATAGRAM. Connection ID dài 0–20 byte tuỳ server chọn, nên dòng này **dao động vài byte** — đây là ước lượng có cơ sở, không phải hằng số.)*

QUIC datagram tốn **hơn WebSocket 15,2%** số byte trên payload nhỏ, và hơn UDP thô **58,3%**. Bạn không đổi sang QUIC để tiết kiệm băng thông. Bạn đổi vì **một packet mất không kéo theo gì cả** — và ở payload nhỏ, 10 byte chênh lệch rẻ hơn nhiều so với 40 ms chặn dòng ở mục 3.3.

> Mọi thứ mã hoá đều có một khoản thuế cố định mỗi packet. Payload càng nhỏ, thuế càng nặng theo tỉ lệ. Đây là một lý do độc lập để **gộp nhiều message vào một packet** — bài 15 và bài 27 sẽ quay lại với ràng buộc MTU.

### 3.6 WebTransport — thứ WebSocket lẽ ra phải là

QUIC là giao thức. Trình duyệt không cho JavaScript nói QUIC trực tiếp, vì lý do hệt như (c) ở mục 3.1. **WebTransport** là API trình duyệt đứng trên QUIC/HTTP3 và mở ra đúng hai thứ:

```js
const t = new WebTransport("https://game.example:4433/match/42");
await t.ready;
t.datagrams.writable                  // không tin cậy  → snapshot, input
const s = await t.createBidirectionalStream();  // tin cậy  → sự kiện, chat
```

Bốn dòng đó là cặp ánh xạ của mục 3.3, trong **một** kết nối, với **một** thành phần vận hành — so với bốn của WebRTC. Đặt cạnh nhau thì thấy WebTransport là WebSocket cộng thêm một cái cửa datagram: cùng mô hình client-server, cùng dùng chứng chỉ TLS như web thường, cùng một địa chỉ `https://`.

**Về mức hỗ trợ trình duyệt: tôi không kiểm chứng được trong bài này, và bạn cũng không nên tin một con số phần trăm chép từ bài viết nào.** Đây là thứ đổi theo tháng. Ba điều đáng nói là những điều **không** đổi theo tháng:

1. WebTransport chạy trên HTTP/3, tức trên UDP. **Nhiều mạng doanh nghiệp chặn UDP ra ngoài**, kể cả port 443. Ở những mạng đó WebSocket qua TCP/443 vẫn nối được còn WebTransport thì không — bất kể trình duyệt hỗ trợ tới đâu.
2. Vì (1), bạn **luôn** cần đường lùi về WebSocket. Nghĩa là bạn vận hành hai đường truyền chứ không phải một, và phải test cả hai.
3. Hệ sinh thái server, công cụ debug và tài liệu xử lý sự cố của WebSocket dày hơn rất nhiều năm.

Cách kiểm đúng cho dự án của bạn, làm được trong một buổi: viết một trang thử mở WebTransport, nếu lỗi thì rơi về WebSocket, và **ghi log tỉ lệ rơi về theo người chơi thật của bạn**. Con số đó là con số duy nhất đáng tin — nó đo cả trình duyệt lẫn mạng của chính tệp người chơi bạn có, và không bảng tương thích nào thay thế được.

---

## 4. Bốn lựa chọn, đặt cạnh nhau

| | WebSocket | WebRTC DataChannel | QUIC (server–server) | WebTransport |
|---|---|---|---|---|
| Có UDP thật | không | **có** | **có** | **có** |
| Head-of-line blocking | **cả kết nối** | không, ở kênh unreliable | chỉ trong một stream | chỉ trong một stream; datagram không có |
| Gửi không tin cậy | **không** | có | có (datagram) | **có** |
| Sống sót khi đổi mạng | không | ICE restart, chậm và phiền | **connection ID** | **connection ID** |
| Thành phần vận hành | **1** | **4** (signaling, STUN, ICE, TURN) | 1 | 1 (+ đường lùi WebSocket) |
| Qua firewall doanh nghiệp | **tốt nhất** — TCP/443, giống HTTPS | kém — UDP + dải port rộng | kém — UDP | kém — UDP/443 thường bị chặn |
| Độ chín của hệ sinh thái | **cao nhất** | trung bình | cao ở backend, không dùng được từ trình duyệt | thấp nhất, đang lên |
| Dùng khi | game web mặc định; mọi thứ không phải dữ liệu 60 Hz | cần UDP trong trình duyệt và không đợi được | giữa các dịch vụ backend của bạn | đã đo và biết WebSocket là nút thắt |

Đọc theo cột thì thấy ngay hình dạng của bài toán: **cột duy nhất thắng ở dòng "qua firewall" và dòng "độ chín" là cột đắt nhất ở dòng "head-of-line blocking"**. Không có cột nào thắng hết. Đây không phải bảng để chọn cái tốt nhất, mà là bảng để chọn cái bạn chịu được nhược điểm.

Và ánh xạ message thì không phụ thuộc bạn chọn cột nào:

| Loại message | Ví dụ | Có hạn sử dụng | Gửi bằng |
|---|---|---|---|
| State liên tục | vị trí, vận tốc, góc nhìn, HP | **có** | datagram |
| Input người chơi | phím đang bấm ở tick N | **có** (bài 14 gửi chồng lấn) | datagram |
| Sự kiện rời rạc | vào/ra phòng, mua item, kết quả trận | **không** | stream tin cậy |
| Chat | tin nhắn | **không** | stream tin cậy, stream riêng |

Trên WebSocket, cả bốn dòng chạy chung một đường reliable-ordered. Bạn **không mất tính đúng đắn** — bạn mất khả năng để hai dòng đầu đi trước hai dòng sau khi mạng xấu.

---

## 5. Tính tay

**Bài 1.** Game .io của bạn: 40 player một phòng, input 18 byte gửi 30 Hz chiều lên, snapshot 240 byte gửi 20 Hz chiều xuống, IPv4.
- Chiều lên một phòng tốn bao nhiêu KB/s trên WebSocket? Trên UDP thô?
- Chiều xuống một phòng, WebSocket so với UDP thô chênh bao nhiêu phần trăm? Vì sao tỉ lệ chênh chiều xuống nhỏ hơn chiều lên nhiều?
- Chuyển sang QUIC datagram (chi phí bao bọc 56 B/packet) thì cả phòng tốn thêm bao nhiêu KB/s so với WebSocket? Con số đó có đáng để đánh đổi không, và bạn cần biết thêm dữ kiện gì mới trả lời được?

**Bài 2.** Áp công thức `S ≥ 1000/RTT` của mục 3.3.
- Người chơi RTT 60 ms, snapshot 20 Hz. Gửi lại một snapshot có còn ý nghĩa không? Bản gửi lại dùng được bao nhiêu phần trăm chu kỳ?
- Bạn nâng snapshot lên 30 Hz theo lời khuyên "mượt hơn". Với chính người chơi RTT 60 ms đó, chuyện gì xảy ra với giá trị của mỗi lần gửi lại?
- Kết luận ngược đời gì rút ra: **tăng snapshot rate làm TCP tệ đi hay tốt lên?**

**Bài 3.** Vẫn ngân sách 182 ms của bài 8, WebSocket, RTT 40 ms, tỉ lệ mất gói 2%, chiều xuống 20 Hz.
- Mỗi phút có bao nhiêu snapshot bị mất, tức bao nhiêu lần chặn dòng 40 ms?
- Ngân sách trong những lần đó là bao nhiêu, và tăng bao nhiêu phần trăm?
- Buffer nội suy 100 ms trong ngân sách đó **có hấp thụ được** 40 ms chặn dòng không? Nếu có thì vì sao head-of-line blocking vẫn là vấn đề — hãy chỉ ra trường hợp buffer không cứu nổi.

---

## 6. Chuyển giao

Không có đáp án trong bài.

**Bạn làm game cờ vua nhanh (bullet chess) chạy trên trình duyệt**, mỗi bên 60 giây cho cả ván, đồng hồ đếm ngược liên tục và hiển thị tới phần trăm giây. Nước đi thưa — vài giây một lần — nhưng đồng hồ thì phải mượt.

1. Nước đi thuộc loại nào trong bảng mục 4 — có hạn sử dụng hay không? Còn giá trị đồng hồ hiển thị cho đối thủ?
2. Nếu bạn gửi đồng hồ bằng datagram 10 Hz và một gói rơi, người chơi thấy gì? Tình huống đó có tệ hơn việc chờ 40 ms head-of-line blocking không?
3. Game này chưa từng cần UDP suốt lịch sử của nó. Vậy cái gì trong bài này **vẫn** áp dụng được cho nó, và cái gì không?
4. Một người chơi đang ở trên tàu, điện thoại nhảy giữa wifi và 4G ba lần trong một ván. Trên WebSocket thì chuyện gì xảy ra, và bạn phải viết thêm cái gì để họ không mất ván?
5. Đội đề xuất dùng WebTransport "vì hiện đại hơn". Bạn cần đo đúng **một** con số để bác hoặc ủng hộ đề xuất đó. Con số nào, đo thế nào, và ngưỡng bao nhiêu thì bạn đổi ý?
6. **Câu khó nhất:** connection ID của QUIC giữ kết nối sống khi IP đổi. Nhưng ở mục 3.1, cả bốn cánh cửa đều dựa trên nguyên tắc "bên kia phải đồng ý bị kết nối", và bằng chứng của sự đồng ý đó gắn với địa chỉ. Nếu một kẻ tấn công **sao chép được connection ID** từ gói tin của người khác rồi gửi từ IP của mình, chuyện gì ngăn hắn cướp trận đấu đó? Hãy nghĩ ra ít nhất một cơ chế phòng thủ mà bạn sẽ tự thiết kế nếu phải tự viết QUIC — và nói xem cơ chế của bạn còn hở chỗ nào.

---

## 7. Tóm tắt

- Trình duyệt cho JavaScript đúng **bốn cánh cửa**: HTTP, WebSocket, WebRTC DataChannel, WebTransport. Raw UDP và raw TCP **không tồn tại**, vì một trang bất kỳ mở socket tuỳ ý là một khẩu súng DDoS.
- **WebSocket là TCP mặc bộ vest**: bắt tay HTTP Upgrade, khung 2 byte, thêm **4 byte masking bắt buộc** ở chiều client → server, ping/pong giữ kết nối. Nó thừa hưởng nguyên head-of-line blocking của bài 12 và chỉ có **một** chế độ giao hàng: reliable-ordered.
- Chi phí byte **không** phải lý do bỏ WebSocket: payload 20 B ở 60 Hz là **66 B/packet, +37,5% so với UDP thô** — 0,396 MB/s cho 100 player chiều lên.
- Lý do thật là **hạn sử dụng**: hai snapshot cách nhau `1000/S` ms, bản gửi lại tới sau `RTT` ms, nên **`S ≥ 1000/RTT` thì gửi lại luôn vô nghĩa**. Ở RTT 40 ms, ngưỡng là **25 Hz** — snapshot 30 Hz nghĩa là TCP chặn dòng 40 ms để giao một gói client bắt buộc phải vứt.
- **Message có hạn sử dụng → datagram; không có hạn → stream tin cậy.** Vị trí, vận tốc, input có hạn; vào/ra phòng, mua item, chat thì không.
- **WebRTC DataChannel** làm được cả hai nửa, nhưng đổi **1 thành phần vận hành lấy 4**: signaling, STUN, ICE, TURN. Nó là cỗ máy tìm đường P2P dùng cho bài toán client-server đã biết trước đường.
- **QUIC** cho nhiều stream độc lập (HOL co từ cả kết nối xuống một stream), **datagram không tin cậy (RFC 9221)**, **connection ID** sống sót khi wifi→4G, và 0-RTT chỉ dùng được cho thao tác chịu được replay.
- QUIC datagram **tốn hơn WebSocket 15,2% số byte** trên payload 20 B (76 B so với 66 B) do thuế mã hoá cố định mỗi packet. Đổi sang QUIC là mua khả năng không-chặn-dòng, **không** phải mua băng thông.
- **WebTransport** = QUIC/HTTP3 dưới dạng API trình duyệt: stream tin cậy **và** datagram, một kết nối, một thành phần vận hành. Mức hỗ trợ trình duyệt **đổi theo thời gian — tự kiểm, đừng tin số chép lại**; thứ không đổi là UDP hay bị mạng doanh nghiệp chặn, nên **luôn phải có đường lùi WebSocket**.
- Khuyến nghị thực dụng: **game .io mới thì dùng WebSocket.** Nó qua được firewall tốt nhất, hệ sinh thái chín nhất, một thành phần vận hành. Chỉ đổi khi đã **đo** được head-of-line blocking là nút thắt của chính người chơi bạn — chứ không vì thứ khác hiện đại hơn.

→ **Bài 14 — Tự viết reliability layer trên UDP**: chọn được đường truyền rồi. Nhưng UDP không hứa gì cả — không thứ tự, không đảm bảo tới nơi. Bài sau dựng lại đúng những đảm bảo bạn CẦN, và chỉ những cái đó.
