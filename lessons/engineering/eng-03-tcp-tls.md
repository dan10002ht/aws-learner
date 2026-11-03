# TCP/UDP & TLS — HTTPS thật sự hoạt động thế nào

Khi bạn gõ `https://example.com` và trang web hiện ra, có ít nhất 3 tầng giao thức đã làm việc: **TCP (hoặc QUIC)** để vận chuyển dữ liệu tin cậy, **TLS** để mã hoá, và **HTTP** để định dạng request/response. Hiểu rõ từng tầng là kỹ năng nền để debug lỗi kết nối, chọn đúng load balancer trên AWS, và trả lời cả loạt câu hỏi trong đề SAA/DVA.

## 1. TCP vs UDP — hai triết lý vận chuyển

### TCP: tin cậy, có thứ tự, có kết nối

TCP đảm bảo 3 thứ mà tầng IP bên dưới không có:

1. **Kết nối (connection-oriented)** — phải bắt tay 3 bước (3-way handshake) trước khi gửi dữ liệu.
2. **Thứ tự (ordering)** — mỗi byte có sequence number; bên nhận sắp xếp lại đúng thứ tự.
3. **Truyền lại (retransmission)** — gói nào không được ACK trong thời gian chờ sẽ được gửi lại.

3-way handshake:

```text
Client                    Server
  | ------ SYN  (seq=x) ----> |
  | <--- SYN-ACK (seq=y,      |
  |        ack=x+1) --------- |
  | ------ ACK (ack=y+1) ---> |
  |                           |
  |   (bắt đầu gửi dữ liệu)   |
```

Tính tay chi phí: nếu RTT (round-trip time) Hà Nội → Singapore là **~35ms**, riêng handshake TCP tốn **1 RTT = 35ms** trước khi gửi được byte dữ liệu đầu tiên. Cộng thêm TLS (phần sau) là thấy vì sao "kết nối mới" luôn đắt.

### UDP: nhanh, gọn, không hứa hẹn gì

UDP chỉ là IP + port + checksum. Không handshake, không thứ tự, không truyền lại. Gói mất là mất.

### Bảng tra nhanh

| Tiêu chí | TCP | UDP |
|---|---|---|
| Handshake | Có (1 RTT) | Không (0 RTT) |
| Thứ tự gói | Đảm bảo | Không |
| Mất gói | Tự truyền lại | App tự lo |
| Header | 20+ bytes | 8 bytes |
| Tốc độ thiết lập | Chậm hơn | Tức thì |
| Dùng cho | HTTP/1.1, HTTP/2, SSH, database | DNS, video call, game, **QUIC/HTTP3** |

### Khi nào UDP thắng?

- **DNS**: 1 câu hỏi, 1 câu trả lời, gói nhỏ — handshake TCP là lãng phí. Mất gói thì hỏi lại còn nhanh hơn.
- **Video/voice realtime**: frame đến trễ là vô dụng — thà bỏ qua còn hơn chờ truyền lại (đây là lý do Zoom/WebRTC dùng UDP).
- **QUIC (nền của HTTP/3)**: xây độ tin cậy *trên* UDP, để tự kiểm soát congestion control và tránh head-of-line blocking của TCP.

> **Ghi nhớ**: TCP = "bưu phẩm bảo đảm, ký nhận từng kiện". UDP = "ném bưu thiếp qua hàng rào". Realtime thì bưu thiếp trễ không ai đọc nữa — nên UDP hợp lý.

## 2. Port & Socket

- **Port**: số 16-bit (0–65535) định danh ứng dụng trên một máy. Well-known: 22 (SSH), 53 (DNS), 80 (HTTP), 443 (HTTPS), 3306 (MySQL), 5432 (PostgreSQL), 6379 (Redis).
- **Socket**: một đầu kết nối, định danh bằng bộ 5 thành phần: `(protocol, src IP, src port, dst IP, dst port)`.

Thử ngay trên máy:

```bash
# Xem các kết nối TCP đang mở (macOS/Linux)
ss -tn state established    # Linux
netstat -an | grep ESTABLISHED   # macOS

# Process nào đang nghe port 443?
sudo lsof -i :443
```

Ví dụ tính tay: một server web chỉ nghe **một** port 443, nhưng phục vụ được hàng trăm nghìn client cùng lúc — vì mỗi kết nối phân biệt bằng `(client IP, client port)` khác nhau, không phải bằng port server.

## 3. TCP states — chỉ cần hiểu ý tưởng

Mỗi endpoint có trạng thái riêng. Bên mở chủ động thường đi `CLOSED → SYN_SENT → ESTABLISHED`; bên nhận đi `LISTEN → SYN_RECEIVED → ESTABLISHED`. Khi đóng thông thường, bên đóng chủ động đi `FIN_WAIT_1 → FIN_WAIT_2 → TIME_WAIT → CLOSED`, còn bên đóng thụ động đi `CLOSE_WAIT → LAST_ACK → CLOSED` sau `ESTABLISHED` (bỏ qua các nhánh đóng đồng thời và lỗi).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 490" role="img" aria-labelledby="fixeng-tcp-t fixeng-tcp-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="fixeng-tcp-t">TCP: hai đường trạng thái riêng</title>
<desc id="fixeng-tcp-d">Hai cột tách vai trò chủ động và thụ động; mũi tên chỉ các chuyển tiếp thông thường.</desc>
<defs><marker id="fixeng-tcp-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="currentColor"/></marker></defs>
<text x="260" y="24" font-size="15" text-anchor="middle" fill="currentColor">Một endpoint: mở và đóng thông thường</text><text x="128" y="52" font-size="13" text-anchor="middle" fill="currentColor">Mở / đóng chủ động</text><rect x="16" y="70" width="224" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="128.0" y="92.0" font-size="13" text-anchor="middle" fill="currentColor">CLOSED</text><rect x="16" y="124" width="224" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="128.0" y="146.0" font-size="13" text-anchor="middle" fill="currentColor">SYN_SENT</text><path d="M128 104 L128 121" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-tcp-a)"/><rect x="16" y="178" width="224" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="128.0" y="200.0" font-size="13" text-anchor="middle" fill="currentColor">ESTABLISHED</text><path d="M128 158 L128 175" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-tcp-a)"/><rect x="16" y="232" width="224" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="128.0" y="254.0" font-size="13" text-anchor="middle" fill="currentColor">FIN_WAIT_1</text><path d="M128 212 L128 229" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-tcp-a)"/><rect x="16" y="286" width="224" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="128.0" y="308.0" font-size="13" text-anchor="middle" fill="currentColor">FIN_WAIT_2</text><path d="M128 266 L128 283" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-tcp-a)"/><rect x="16" y="340" width="224" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="128.0" y="362.0" font-size="13" text-anchor="middle" fill="currentColor">TIME_WAIT</text><path d="M128 320 L128 337" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-tcp-a)"/><rect x="16" y="394" width="224" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="128.0" y="416.0" font-size="13" text-anchor="middle" fill="currentColor">CLOSED</text><path d="M128 374 L128 391" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-tcp-a)"/><text x="392" y="52" font-size="13" text-anchor="middle" fill="currentColor">Mở / đóng thụ động</text><rect x="280" y="70" width="224" height="34" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="392.0" y="92.0" font-size="13" text-anchor="middle" fill="currentColor">LISTEN</text><rect x="280" y="124" width="224" height="34" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="392.0" y="146.0" font-size="13" text-anchor="middle" fill="currentColor">SYN_RECEIVED</text><path d="M392 104 L392 121" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-tcp-a)"/><rect x="280" y="178" width="224" height="34" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="392.0" y="200.0" font-size="13" text-anchor="middle" fill="currentColor">ESTABLISHED</text><path d="M392 158 L392 175" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-tcp-a)"/><rect x="280" y="232" width="224" height="34" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="392.0" y="254.0" font-size="13" text-anchor="middle" fill="currentColor">CLOSE_WAIT</text><path d="M392 212 L392 229" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-tcp-a)"/><rect x="280" y="286" width="224" height="34" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="392.0" y="308.0" font-size="13" text-anchor="middle" fill="currentColor">LAST_ACK</text><path d="M392 266 L392 283" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-tcp-a)"/><rect x="280" y="340" width="224" height="34" rx="7" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="392.0" y="362.0" font-size="13" text-anchor="middle" fill="currentColor">CLOSED</text><path d="M392 320 L392 337" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-tcp-a)"/><text x="260" y="468" font-size="13" text-anchor="middle" fill="currentColor">Bỏ qua đóng đồng thời, reset và các nhánh lỗi.</text>
</svg>

Đáng nhớ nhất là **TIME_WAIT**: bên *chủ động đóng* kết nối phải giữ socket thêm ~30–120 giây (2×MSL) để chắc chắn gói trễ của kết nối cũ không lẫn vào kết nối mới dùng lại cùng bộ 5 thành phần.

```bash
# Đếm socket theo trạng thái — server bận thường có hàng nghìn TIME_WAIT
ss -tan | awk '{print $1}' | sort | uniq -c | sort -rn
```

> **Lỗi thường gặp**: App backend mở kết nối mới đến database/API cho *mỗi* request rồi đóng ngay → tích luỹ hàng chục nghìn TIME_WAIT, cạn ephemeral port, lỗi `Cannot assign requested address`. Giải pháp: **connection pooling / keep-alive**, không phải tăng giới hạn hệ điều hành.

## 4. HTTP/1.1 vs HTTP/2 vs HTTP/3

<ab-toggle data-labels="HTTP/2 trên TCP|HTTP/3 trên QUIC">
<svg viewBox="0 0 520 372" role="img" aria-labelledby="eng03a-t eng03a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="eng03a-t">HTTP/2 trên TCP: mất 1 gói của S1 thì cả connection đứng lại</title><desc id="eng03a-d">Ba stream S1, S2, S3 gộp vào một dòng byte TCP có thứ tự. Gói S1·2 mất trên đường; S2·2 và S3·2 đã tới nhưng TCP giữ lại chờ truyền lại S1·2, nên cả ba stream đứng.</desc><text x="16" y="24" font-size="15" text-anchor="start" fill="currentColor" font-weight="700">Mất 1 gói — stream nào bị chặn?</text><text x="16" y="46" font-size="13" text-anchor="start" fill="currentColor" opacity="0.8">1 connection TCP: 3 stream gộp 1 dòng byte có thứ tự</text><text x="16" y="74" font-size="13" text-anchor="start" fill="currentColor" font-weight="700">Trên đường truyền (theo thứ tự gửi)</text><rect x="16" y="84" width="72" height="28" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="52" y="103" font-size="13" text-anchor="middle" fill="currentColor">S1·1</text><rect x="98" y="84" width="72" height="28" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="134" y="103" font-size="13" text-anchor="middle" fill="currentColor">S2·1</text><rect x="180" y="84" width="72" height="28" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="216" y="103" font-size="13" text-anchor="middle" fill="currentColor">S3·1</text><rect x="262" y="84" width="72" height="28" rx="4" fill="#f43f5e" fill-opacity="0.16" stroke="#f43f5e" stroke-dasharray="4 3"/><text x="298" y="103" font-size="13" text-anchor="middle" fill="currentColor">S1·2</text><text x="298" y="130" font-size="13" text-anchor="middle" fill="#f43f5e" font-weight="700">✗ mất</text><rect x="344" y="84" width="72" height="28" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="380" y="103" font-size="13" text-anchor="middle" fill="currentColor">S2·2</text><rect x="426" y="84" width="72" height="28" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="462" y="103" font-size="13" text-anchor="middle" fill="currentColor">S3·2</text><text x="16" y="160" font-size="13" text-anchor="start" fill="currentColor" font-weight="700">Ứng dụng nhận được</text><text x="16" y="190" font-size="13" text-anchor="start" fill="currentColor" font-weight="700">S1</text><rect x="50" y="170" width="92" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="96" y="189" font-size="13" text-anchor="middle" fill="currentColor">S1·1 ✓</text><rect x="150" y="170" width="230" height="28" rx="4" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3"/><text x="265" y="189" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.85">S1·2 chờ truyền lại</text><rect x="390" y="170" width="114" height="28" rx="14" fill="#f43f5e" fill-opacity="0.15" stroke="#f43f5e" stroke-opacity="0.6"/><text x="447" y="189" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">chờ</text><text x="16" y="228" font-size="13" text-anchor="start" fill="currentColor" font-weight="700">S2</text><rect x="50" y="208" width="92" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="96" y="227" font-size="13" text-anchor="middle" fill="currentColor">S2·1 ✓</text><rect x="150" y="208" width="230" height="28" rx="4" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3"/><text x="265" y="227" font-size="13" text-anchor="middle" fill="currentColor">S2·2 tới rồi, TCP giữ lại</text><rect x="390" y="208" width="114" height="28" rx="14" fill="#f43f5e" fill-opacity="0.15" stroke="#f43f5e" stroke-opacity="0.6"/><text x="447" y="227" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">chờ</text><text x="16" y="266" font-size="13" text-anchor="start" fill="currentColor" font-weight="700">S3</text><rect x="50" y="246" width="92" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="96" y="265" font-size="13" text-anchor="middle" fill="currentColor">S3·1 ✓</text><rect x="150" y="246" width="230" height="28" rx="4" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3"/><text x="265" y="265" font-size="13" text-anchor="middle" fill="currentColor">S3·2 tới rồi, TCP giữ lại</text><rect x="390" y="246" width="114" height="28" rx="14" fill="#f43f5e" fill-opacity="0.15" stroke="#f43f5e" stroke-opacity="0.6"/><text x="447" y="265" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">chờ</text><rect x="16" y="290" width="488" height="30" rx="8" fill="#f43f5e" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="260" y="310" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">Cả connection đứng lại: S2, S3 chờ gói của S1</text><text x="260" y="342" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.8">TCP coi cả connection là một dòng byte</text><text x="260" y="360" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.8">→ mọi stream phụ thuộc nhau.</text></svg>
<svg viewBox="0 0 520 372" role="img" aria-labelledby="eng03b-t eng03b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="eng03b-t">HTTP/3 trên QUIC: mất 1 gói của S1 thì chỉ S1 phải chờ</title><desc id="eng03b-d">Cùng sáu gói, cùng gói S1·2 mất. QUIC (chạy trên UDP) giữ thứ tự riêng từng stream: S2·2 và S3·2 giao ngay cho ứng dụng, chỉ S1 chờ truyền lại S1·2.</desc><text x="16" y="24" font-size="15" text-anchor="start" fill="currentColor" font-weight="700">Mất 1 gói — stream nào bị chặn?</text><text x="16" y="46" font-size="13" text-anchor="start" fill="currentColor" opacity="0.8">1 connection QUIC (UDP): mỗi stream thứ tự riêng</text><text x="16" y="74" font-size="13" text-anchor="start" fill="currentColor" font-weight="700">Trên đường truyền (theo thứ tự gửi)</text><rect x="16" y="84" width="72" height="28" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="52" y="103" font-size="13" text-anchor="middle" fill="currentColor">S1·1</text><rect x="98" y="84" width="72" height="28" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="134" y="103" font-size="13" text-anchor="middle" fill="currentColor">S2·1</text><rect x="180" y="84" width="72" height="28" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="216" y="103" font-size="13" text-anchor="middle" fill="currentColor">S3·1</text><rect x="262" y="84" width="72" height="28" rx="4" fill="#f43f5e" fill-opacity="0.16" stroke="#f43f5e" stroke-dasharray="4 3"/><text x="298" y="103" font-size="13" text-anchor="middle" fill="currentColor">S1·2</text><text x="298" y="130" font-size="13" text-anchor="middle" fill="#f43f5e" font-weight="700">✗ mất</text><rect x="344" y="84" width="72" height="28" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="380" y="103" font-size="13" text-anchor="middle" fill="currentColor">S2·2</text><rect x="426" y="84" width="72" height="28" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.35"/><text x="462" y="103" font-size="13" text-anchor="middle" fill="currentColor">S3·2</text><text x="16" y="160" font-size="13" text-anchor="start" fill="currentColor" font-weight="700">Ứng dụng nhận được</text><text x="16" y="190" font-size="13" text-anchor="start" fill="currentColor" font-weight="700">S1</text><rect x="50" y="170" width="92" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="96" y="189" font-size="13" text-anchor="middle" fill="currentColor">S1·1 ✓</text><rect x="150" y="170" width="230" height="28" rx="4" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3"/><text x="265" y="189" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.85">S1·2 chờ truyền lại</text><rect x="390" y="170" width="114" height="28" rx="14" fill="#f43f5e" fill-opacity="0.15" stroke="#f43f5e" stroke-opacity="0.6"/><text x="447" y="189" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">chờ</text><text x="16" y="228" font-size="13" text-anchor="start" fill="currentColor" font-weight="700">S2</text><rect x="50" y="208" width="92" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="96" y="227" font-size="13" text-anchor="middle" fill="currentColor">S2·1 ✓</text><rect x="150" y="208" width="230" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="265" y="227" font-size="13" text-anchor="middle" fill="currentColor">S2·2 ✓ giao ngay</text><rect x="390" y="208" width="114" height="28" rx="14" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-opacity="0.6"/><text x="447" y="227" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">chạy tiếp</text><text x="16" y="266" font-size="13" text-anchor="start" fill="currentColor" font-weight="700">S3</text><rect x="50" y="246" width="92" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="96" y="265" font-size="13" text-anchor="middle" fill="currentColor">S3·1 ✓</text><rect x="150" y="246" width="230" height="28" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/><text x="265" y="265" font-size="13" text-anchor="middle" fill="currentColor">S3·2 ✓ giao ngay</text><rect x="390" y="246" width="114" height="28" rx="14" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-opacity="0.6"/><text x="447" y="265" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">chạy tiếp</text><rect x="16" y="290" width="488" height="30" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/><text x="260" y="310" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">Chỉ đúng stream S1 bị chặn; S2, S3 không liên quan</text><text x="260" y="342" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.8">QUIC quản thứ tự ở từng stream → cô lập mất gói,</text><text x="260" y="360" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.8">khác biệt cốt lõi của HTTP/3.</text></svg>
<ab-note>Sáu gói tới theo thứ tự gửi, chỉ <code>S1·2</code> rơi. <code>S2·2</code> và <code>S3·2</code> đã nằm trong buffer của máy nhận, nhưng TCP chỉ giao byte liền mạch nên giữ chúng tới khi <code>S1·2</code> được truyền lại: multiplexing của HTTP/2 hết head-of-line blocking ở tầng HTTP nhưng vẫn dính ở tầng TCP.</ab-note>
<ab-note>Cùng sáu gói, cùng gói rơi. QUIC đánh thứ tự riêng cho từng stream nên <code>S2·2</code>, <code>S3·2</code> giao ngay cho ứng dụng; chỉ S1 phải đợi bản truyền lại.</ab-note>
</ab-toggle>

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Năm | 1997 | 2015 | 2022 (RFC 9114) |
| Tầng vận chuyển | TCP | TCP | **QUIC trên UDP** |
| Nhiều request song song | 1 request/connection (pipelining gần như chết) → browser mở ~6 connection | **Multiplexing**: nhiều stream trên 1 connection | Multiplexing, mỗi stream độc lập |
| Head-of-line blocking | Ở tầng HTTP | Hết ở HTTP, **còn ở TCP** (1 gói TCP mất chặn mọi stream) | **Hết hẳn** — mất gói chỉ chặn stream đó |
| Header | Text thuần | Nén HPACK, binary | Nén QPACK, binary |
| TLS | Tuỳ chọn | Thực tế bắt buộc | Tích hợp sẵn trong QUIC (luôn TLS 1.3) |
| Thiết lập kết nối mới | TCP + TLS ≈ 2 RTT | TCP + TLS ≈ 2 RTT | **1 RTT** (QUIC gộp transport + TLS), 0-RTT khi quay lại |

Tính tay với RTT 35ms, kết nối mới lần đầu:

- HTTP/2: TCP (1 RTT) + TLS 1.3 (1 RTT) = **70ms** chờ trước khi client gửi request ứng dụng (chưa phải thời gian nhận byte phản hồi đầu tiên).
- HTTP/3: QUIC handshake gộp luôn TLS = **35ms** trước khi client gửi request 1-RTT. Khi phiên cho phép 0-RTT, client có thể gửi request ngay, **~0ms** chờ handshake; vẫn phải chờ mạng/server để nhận phản hồi. Early data có thể bị từ chối và có rủi ro replay.

<ab-toggle data-labels="TCP + TLS|QUIC">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 404" role="img" aria-labelledby="fixeng-rtt0-t fixeng-rtt0-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="fixeng-rtt0-t">TCP và TLS handshake</title>
<desc id="fixeng-rtt0-d">Cùng trục thời gian và vị trí client/server; độ dài chờ đến lúc gửi GET là một hoặc hai RTT.</desc>
<defs><marker id="fixeng-rtt0-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="currentColor"/></marker></defs>
<text x="260" y="25" font-size="15" text-anchor="middle" fill="currentColor">Thời gian trước khi gửi request</text><text x="90" y="54" font-size="13" text-anchor="middle" fill="currentColor">Client</text><line x1="90" y1="70" x2="90" y2="390" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><text x="430" y="54" font-size="13" text-anchor="middle" fill="currentColor">Server</text><line x1="430" y1="70" x2="430" y2="390" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><text x="35" y="86" font-size="13" text-anchor="middle" fill="currentColor">0ms</text><text x="35" y="170" font-size="13" text-anchor="middle" fill="currentColor">35ms</text><text x="35" y="254" font-size="13" text-anchor="middle" fill="currentColor">70ms</text><path d="M90 80 L430 122" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-rtt0-a)"/><text x="260" y="89" font-size="13" text-anchor="middle" fill="currentColor">SYN</text><path d="M430 122 L90 164" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-rtt0-a)"/><text x="260" y="131" font-size="13" text-anchor="middle" fill="currentColor">SYN-ACK</text><path d="M90 164 L430 206" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-rtt0-a)"/><text x="260" y="173" font-size="13" text-anchor="middle" fill="currentColor">ACK + ClientHello</text><path d="M430 206 L90 248" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-rtt0-a)"/><text x="260" y="215" font-size="13" text-anchor="middle" fill="currentColor">ServerHello + Cert + Finished</text><path d="M90 248 L430 290" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-rtt0-a)"/><text x="260" y="257" font-size="13" text-anchor="middle" fill="currentColor">Finished + GET</text><line x1="65" y1="80" x2="65" y2="248" stroke="#10b981" stroke-width="5"/><text x="260" y="330" font-size="15" text-anchor="middle" fill="currentColor">2 RTT = 70ms</text><text x="260" y="355" font-size="13" text-anchor="middle" fill="currentColor">TCP 1 RTT + TLS 1.3 1 RTT</text><text x="260" y="380" font-size="13" text-anchor="middle" fill="currentColor">Chưa bao gồm chờ byte phản hồi đầu tiên.</text>
</svg>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 404" role="img" aria-labelledby="fixeng-rtt1-t fixeng-rtt1-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="fixeng-rtt1-t">QUIC handshake</title>
<desc id="fixeng-rtt1-d">Cùng trục thời gian và vị trí client/server; độ dài chờ đến lúc gửi GET là một hoặc hai RTT.</desc>
<defs><marker id="fixeng-rtt1-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="currentColor"/></marker></defs>
<text x="260" y="25" font-size="15" text-anchor="middle" fill="currentColor">Thời gian trước khi gửi request</text><text x="90" y="54" font-size="13" text-anchor="middle" fill="currentColor">Client</text><line x1="90" y1="70" x2="90" y2="390" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><text x="430" y="54" font-size="13" text-anchor="middle" fill="currentColor">Server</text><line x1="430" y1="70" x2="430" y2="390" stroke="currentColor" stroke-dasharray="4 4" opacity="0.4"/><text x="35" y="86" font-size="13" text-anchor="middle" fill="currentColor">0ms</text><text x="35" y="170" font-size="13" text-anchor="middle" fill="currentColor">35ms</text><text x="35" y="254" font-size="13" text-anchor="middle" fill="currentColor">70ms</text><path d="M90 80 L430 122" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-rtt1-a)"/><text x="260" y="89" font-size="13" text-anchor="middle" fill="currentColor">Initial: ClientHello + key_share</text><path d="M430 122 L90 164" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-rtt1-a)"/><text x="260" y="131" font-size="13" text-anchor="middle" fill="currentColor">ServerHello + Cert + Finished</text><path d="M90 164 L430 206" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#fixeng-rtt1-a)"/><text x="260" y="173" font-size="13" text-anchor="middle" fill="currentColor">Finished + GET</text><line x1="65" y1="80" x2="65" y2="164" stroke="#10b981" stroke-width="5"/><text x="260" y="330" font-size="15" text-anchor="middle" fill="currentColor">1 RTT = 35ms</text><text x="260" y="355" font-size="13" text-anchor="middle" fill="currentColor">0-RTT: gửi sớm ngay nếu phiên cho phép</text><text x="260" y="380" font-size="13" text-anchor="middle" fill="currentColor">Chưa bao gồm chờ byte phản hồi đầu tiên.</text>
</svg>
<ab-note>Ví dụ bỏ qua DNS, xử lý server và TCP Fast Open. Client gửi GET sau hai RTT; nhận phản hồi còn cần thời gian truyền và xử lý.</ab-note>
<ab-note>QUIC gộp transport và TLS. 0-RTT chỉ bỏ chờ trước khi gửi early data, có thể bị từ chối và cần xử lý rủi ro replay.</ab-note>
</ab-toggle>

Đến 2025, khoảng **~30–35% website** đã bật HTTP/3 (Cloudflare, Google, các CDN lớn bật mặc định), HTTP/2 vẫn là mặt bằng chung.

Kiểm tra server hỗ trợ phiên bản nào:

```bash
curl -sI --http2 https://www.cloudflare.com -o /dev/null -w '%{http_version}\n'
# 2

curl -sI --http3 https://www.cloudflare.com -o /dev/null -w '%{http_version}\n'
# 3   (cần curl build kèm HTTP/3, ví dụ: brew install curl)
```

## 5. TLS 1.3 — vì sao nhanh hơn 1.2

### Handshake TLS 1.3 (1-RTT)

Bấm từng bước để xem từng gói trong lần bắt tay:

<step-flow>
<svg viewBox="0 0 640 372" role="img" aria-labelledby="eng03c-t eng03c-d" style="width:100%;height:auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="eng03c-t">Handshake TLS 1.3: 1 RTT trước khi gửi request</title><desc id="eng03c-d">Client gửi ClientHello kèm key_share (đoán sẵn khoá DH), SNI, ALPN. Server trả ServerHello kèm key_share, rồi cùng chuyến đó gửi EncryptedExtensions, Certificate, CertVerify, Finished đã mã hoá. Client gửi Finished kèm HTTP request: chỉ 1 RTT.</desc>
<defs><marker id="eng03c-m" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<rect x="70" y="12" width="100" height="32" rx="8" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="120" y="33" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">Client</text>
<line x1="120" y1="44" x2="120" y2="358" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<rect x="510" y="12" width="100" height="32" rx="8" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="560" y="33" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">Server</text>
<line x1="560" y1="44" x2="560" y2="358" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<g data-step="1">
<text x="340" y="72" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">ClientHello</text>
<text x="340" y="92" font-size="13" text-anchor="middle" fill="currentColor">+ key_share (đoán sẵn khoá DH) + SNI, ALPN</text>
<line x1="122" y1="104" x2="556" y2="104" stroke="currentColor" stroke-width="1.6" marker-end="url(#eng03c-m)"/>
</g>
<g data-step="2">
<text x="340" y="144" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">ServerHello + key_share</text>
<line x1="558" y1="156" x2="124" y2="156" stroke="currentColor" stroke-width="1.6" marker-end="url(#eng03c-m)"/>
<line x1="120" y1="174" x2="560" y2="174" stroke="#8b5cf6" stroke-width="1.4" stroke-dasharray="6 4"/>
<text x="340" y="192" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.85">hai bên đã có khoá chung: từ đây trở xuống mã hoá</text>
</g>
<g data-step="3">
<rect x="140" y="206" width="400" height="64" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6" stroke-opacity="0.6"/>
<text x="340" y="228" font-size="13" text-anchor="middle" fill="currentColor">{EncryptedExtensions, Certificate,</text>
<text x="340" y="246" font-size="13" text-anchor="middle" fill="currentColor">CertVerify, Finished}</text>
<line x1="558" y1="260" x2="124" y2="260" stroke="currentColor" stroke-width="1.6" marker-end="url(#eng03c-m)"/>
</g>
<g data-step="4">
<text x="340" y="304" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">Finished + HTTP request</text>
<line x1="122" y1="316" x2="556" y2="316" stroke="#10b981" stroke-width="2.2" marker-end="url(#eng03c-m)"/>
<path d="M106 104 L96 104 L96 260 L106 260" fill="none" stroke="#f59e0b" stroke-width="2"/>
<text x="88" y="178" font-size="14" text-anchor="end" fill="currentColor" font-weight="700">1 RTT</text>
<text x="88" y="196" font-size="13" text-anchor="end" fill="currentColor" opacity="0.8">(chỉ 1!)</text>
<text x="340" y="350" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.8">request HTTP lên đường ngay sau 1 RTT</text>
</g>
</svg>
<step-note data-step="1">Client không chờ thoả thuận: nó đoán nhóm khoá server sẽ chọn và gửi luôn khoá công khai DH trong <code>key_share</code>. <code>SNI</code> cho server biết tên miền cần cert nào, <code>ALPN</code> chọn h2 hay http/1.1.</step-note>
<step-note data-step="2">Server gửi lại nửa DH của mình. Có hai nửa <code>key_share</code> là cả hai bên tự tính ra cùng một khoá bí mật, không cần thêm chuyến nào.</step-note>
<step-note data-step="3">Cùng chuyến với ServerHello nên không tốn thêm RTT. Certificate đã nằm trong phần mã hoá, người nghe lén không thấy cert của server.</step-note>
<step-note data-step="4">Client kiểm cert + <code>Finished</code> của server rồi gửi <code>Finished</code> của mình kèm luôn request. TLS 1.2 phải thêm một vòng nữa mới tới đây.</step-note>
</step-flow>

Khác biệt then chốt so với TLS 1.2:

1. **1-RTT thay vì 2-RTT**: client *gửi sẵn* tham số trao đổi khoá (key_share) ngay trong ClientHello, không chờ thoả thuận xong mới gửi.
2. **0-RTT resumption**: client từng kết nối có thể gửi dữ liệu ngay từ gói đầu (đổi lại rủi ro replay — chỉ dùng cho request idempotent như GET).
3. **Cắt bỏ thuật toán yếu**: không còn RSA key exchange, RC4, SHA-1, CBC mode — chỉ còn AEAD (AES-GCM, ChaCha20-Poly1305) và bắt buộc forward secrecy (ECDHE).
4. **Mã hoá sớm hơn**: certificate được gửi đã mã hoá, bên nghe lén không thấy server cert.

Đến 2025, TLS 1.3 chiếm **~75% lưu lượng HTTPS**; TLS 1.0/1.1 đã bị deprecate (RFC 8996) và các trình duyệt chặn hẳn.

### Thực hành với openssl

```bash
# Bắt tay TLS và xem chi tiết
openssl s_client -connect example.com:443 -servername example.com </dev/null

# Trong output, chú ý:
#   Protocol  : TLSv1.3
#   Cipher    : TLS_AES_256_GCM_SHA384
#   Verify return code: 0 (ok)

# Ép thử TLS 1.2 để so sánh
openssl s_client -connect example.com:443 -tls1_2 </dev/null 2>/dev/null | grep Protocol
```

## 6. Certificate chain & CA

Trình duyệt tin server vì **chuỗi chữ ký số**:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Certificate chain of trust: Root CA ký Intermediate CA ký Leaf cert</title>
  <desc>Chuỗi tin cậy chứng chỉ: Root CA tự ký nằm trong trust store của OS/trình duyệt, ký cho Intermediate CA, Intermediate ký cho Leaf cert của example.com. Server gửi leaf và intermediate, client xác minh ngược lên tới root trong trust store.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Chain of trust — ai ký cho ai</text>
  <g>
    <rect x="250" y="40" width="220" height="58" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="62" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Root CA</text>
    <text x="360" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">tự ký · nằm trong trust store</text>
    <text x="360" y="93" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">(cài sẵn OS / trình duyệt)</text>
  </g>
  <g stroke="currentColor" stroke-width="1.4" fill="none">
    <path d="M360 98 L360 130" marker-end="url(#c1)"/>
  </g>
  <text x="372" y="120" font-size="10" fill="currentColor" opacity="0.85">ký cho ↓</text>
  <g>
    <rect x="250" y="132" width="220" height="54" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="154" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Intermediate CA</text>
    <text x="360" y="172" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">do Root ký · server gửi kèm</text>
  </g>
  <g stroke="currentColor" stroke-width="1.4" fill="none">
    <path d="M360 186 L360 218" marker-end="url(#c1)"/>
  </g>
  <text x="372" y="208" font-size="10" fill="currentColor" opacity="0.85">ký cho ↓</text>
  <g>
    <rect x="250" y="220" width="220" height="54" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="242" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Leaf cert — example.com</text>
    <text x="360" y="260" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">do Intermediate ký · server gửi</text>
  </g>
  <g>
    <rect x="500" y="132" width="200" height="142" rx="10" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22" stroke-dasharray="4 3"/>
    <text x="600" y="152" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Server gửi xuống client</text>
    <rect x="516" y="164" width="168" height="22" rx="6" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="600" y="179" font-size="10" text-anchor="middle" fill="currentColor">Leaf cert</text>
    <rect x="516" y="192" width="168" height="22" rx="6" fill="#3b82f6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="600" y="207" font-size="10" text-anchor="middle" fill="currentColor">Intermediate cert</text>
    <text x="600" y="234" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">KHÔNG gửi Root</text>
    <text x="600" y="248" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">(client đã có sẵn)</text>
  </g>
  <g stroke="currentColor" stroke-width="1.4" fill="none">
    <path d="M250 247 L150 247 L150 70 L250 70" marker-end="url(#c1)"/>
  </g>
  <g>
    <rect x="20" y="284" width="680" height="44" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="36" y="303" font-size="10.5" font-weight="700" fill="currentColor">Client xác minh ngược lên:</text>
    <text x="36" y="319" font-size="10.5" fill="currentColor" opacity="0.85">chữ ký Leaf hợp lệ theo Intermediate → Intermediate hợp lệ theo Root → Root nằm trong trust store ⇒ tin.</text>
  </g>
  <defs>
    <marker id="c1" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker>
  </defs>
</svg>

Server gửi **leaf + intermediate** (không gửi root). Client xác minh: chữ ký leaf hợp lệ theo intermediate → chữ ký intermediate hợp lệ theo root → root nằm trong trust store → tin.

Xem chuỗi thực tế:

```bash
openssl s_client -connect aws.amazon.com:443 -servername aws.amazon.com -showcerts </dev/null 2>/dev/null | grep -E '^ [si]:'
# s: subject (cert của ai), i: issuer (ai ký)

# Xem hạn và SAN của leaf cert
echo | openssl s_client -connect aws.amazon.com:443 -servername aws.amazon.com 2>/dev/null \
  | openssl x509 -noout -dates -ext subjectAltName
```

> **Ghi nhớ**: Hostname được kiểm tra theo **SAN (Subject Alternative Name)**, không phải Common Name — CN đã bị bỏ qua từ lâu. Cert public hiện tại tối đa **398 ngày**, và ngành đã thống nhất lộ trình rút xuống **~47 ngày vào 2029** → tự động hoá gia hạn (ACM, Let's Encrypt/certbot) là bắt buộc, không phải lựa chọn.

### SNI — Server Name Indication

Một IP phục vụ nhiều domain (shared hosting, CDN, load balancer). Server cần biết client muốn cert của domain nào **trước khi** gửi cert → client khai tên domain dạng plaintext trong ClientHello. Đó là SNI.

- `openssl s_client` cần flag `-servername`, nếu thiếu server có thể trả về cert mặc định sai.
- TLS 1.3 có mở rộng **ECH (Encrypted Client Hello)** để mã hoá cả SNI — Cloudflare/Firefox/Chrome đã triển khai, nhưng chưa phổ cập toàn bộ internet.

### mTLS — mutual TLS

TLS thường: chỉ client xác minh server. **mTLS**: server *cũng* yêu cầu client trình certificate — xác thực hai chiều. Dùng cho service-to-service (service mesh như Istio/App Mesh), API B2B, thiết bị IoT.

```bash
# Gọi API yêu cầu mTLS
curl -v --cert client.pem --key client-key.pem https://api.partner.com/orders
```

### Certificate pinning

App (thường là mobile) "ghim" sẵn public key/cert của server; cert hợp lệ nhưng *khác* cert đã ghim vẫn bị từ chối. Chống được CA bị xâm nhập, nhưng **rất dễ tự bắn vào chân**: rotate cert mà quên cập nhật app → toàn bộ user cũ không kết nối được. Khuyến nghị hiện đại: pin **public key của CA/intermediate** kèm backup pin, hoặc dùng Certificate Transparency monitoring thay vì pin cứng.

## 7. Các lỗi TLS thường gặp — đọc vị nhanh

| Thông báo | Nguyên nhân | Cách kiểm tra |
|---|---|---|
| `certificate has expired` | Cert hết hạn (quên gia hạn) | `openssl x509 -noout -dates` |
| `hostname mismatch` / `SSL: no alternative certificate subject name matches` | Truy cập domain không có trong SAN (vd có `example.com` nhưng thiếu `www.`) | Xem `-ext subjectAltName` |
| `self-signed certificate` | Cert tự ký, không CA nào ký | `s_client` thấy issuer = subject |
| `unable to get local issuer certificate` | Server **quên gửi intermediate** — lỗi cấu hình server cực phổ biến | `s_client -showcerts` chỉ thấy 1 cert |
| `handshake failure` | Lệch phiên bản TLS/cipher (server cũ chỉ có TLS 1.0/1.1) | Thử `-tls1_2`, `-tls1_3` |

> **Lỗi thường gặp**: Khi gặp lỗi cert, đừng vội thêm `curl -k` / `verify=False` rồi để luôn trong code production. Đó là tắt hoàn toàn xác minh — kẻ tấn công man-in-the-middle sẽ cảm ơn bạn. Hãy sửa tận gốc: gia hạn cert, bổ sung SAN, hoặc gửi đủ chain.

## 8. Bộ công cụ thực hành — quy trình debug HTTPS

```bash
# Bước 1: DNS có trỏ đúng không?
dig +short api.myapp.com

# Bước 2: TCP có thông không? (port 443)
nc -zv -w 3 api.myapp.com 443

# Bước 3: TLS có bắt tay được không? Cert có hợp lệ?
echo | openssl s_client -connect api.myapp.com:443 -servername api.myapp.com 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates

# Bước 4: HTTP tầng trên trả gì? Xem toàn bộ quá trình
curl -v https://api.myapp.com/health
```

Đọc output `curl -v` theo ký hiệu:

```text
*  Trying 93.184.216.34:443...        ← DNS + TCP connect
* ALPN: server accepted h2            ← thoả thuận HTTP/2 qua ALPN
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
* Server certificate:
*  subject: CN=api.myapp.com
*  expire date: Mar 01 12:00:00 2027 GMT
*  SSL certificate verify ok.         ← chain hợp lệ
> GET /health HTTP/2                  ← > là request gửi đi
< HTTP/2 200                          ← < là response nhận về
```

Đo thời gian từng pha — thấy ngay chi phí handshake bằng số thật:

```bash
curl -so /dev/null https://example.com -w \
'DNS:        %{time_namelookup}s
TCP connect: %{time_connect}s
TLS done:    %{time_appconnect}s
First byte:  %{time_starttransfer}s
Total:       %{time_total}s\n'
```

## 9. Liên hệ sang AWS

Đây là phần kiến thức trên ánh xạ thẳng vào dịch vụ AWS và đề thi SAA-C03/DVA-C02:

### ACM (AWS Certificate Manager)
- Cấp cert public **miễn phí**, **tự động gia hạn** — giải quyết triệt để lỗi "cert expired" (và càng quan trọng khi vòng đời cert đang rút ngắn về ~47 ngày).
- Cert ACM public **không export private key được** — chỉ gắn vào dịch vụ tích hợp: ALB/NLB, CloudFront, API Gateway. Muốn cài lên EC2 tự quản thì dùng ACM Private CA (exportable) hoặc Let's Encrypt.
- **Bẫy đề thi**: cert cho CloudFront **bắt buộc nằm ở us-east-1**; cert cho ALB phải cùng region với ALB.

### ALB — TLS termination (Layer 7)
- ALB **kết thúc TLS** tại load balancer: giải mã, đọc HTTP header/path để routing, rồi (tuỳ cấu hình) mã hoá lại về target. ALB nói HTTP/2 (và hỗ trợ HTTP/3 phía client qua CloudFront).
- Vì terminate TLS nên ALB thấy được nội dung HTTP → host-based/path-based routing, WAF hoạt động được. Hỗ trợ nhiều cert qua **SNI**.
- ALB cũng hỗ trợ **mTLS** (passthrough hoặc verify với trust store) — điểm mới hay vào đề.

### NLB — TCP passthrough (Layer 4)
- NLB hoạt động ở tầng TCP/UDP: có thể **passthrough** TLS nguyên vẹn đến backend (backend tự terminate, giữ end-to-end encryption), hoặc terminate TLS tại NLB với cert ACM.
- **Bẫy đề thi**: cần client IP thật + hiệu năng cực cao + giao thức không phải HTTP (game UDP, MQTT, database) → chọn **NLB**. Cần routing theo path/header → **ALB**. UDP listener → chỉ NLB.

<ab-toggle data-labels="ALB terminate|NLB passthrough">
<svg viewBox="0 0 520 288" role="img" aria-labelledby="eng03-alb-t eng03-alb-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="eng03-alb-t">TLS qua ALB</title>
<desc id="eng03-alb-d">Cùng vị trí client load balancer target; dải TLS chia hai tại ALB hoặc liên tục qua NLB tới target.</desc>
<defs><marker id="eng03-alb-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs><text x="16" y="26" font-size="14" text-anchor="start" fill="currentColor">Điểm giải mã TLS: vị trí đường mã hoá dừng</text><rect x="16" y="68" width="112" height="44" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="72" y="96" font-size="14" text-anchor="middle" fill="currentColor">Client</text><rect x="204" y="68" width="112" height="44" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="260" y="96" font-size="14" text-anchor="middle" fill="currentColor">ALB (L7)</text><rect x="392" y="68" width="112" height="44" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="448" y="96" font-size="14" text-anchor="middle" fill="currentColor">Target</text><text x="72" y="137" font-size="13" text-anchor="middle" fill="currentColor">HTTPS</text><text x="448" y="137" font-size="13" text-anchor="middle" fill="currentColor">backend</text><path d="M128 90 L200 90" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#eng03-alb-a)"/><path d="M316 90 L388 90" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#eng03-alb-a)"/><rect x="16" y="168" width="244" height="32" rx="4" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/><rect x="268" y="168" width="236" height="32" rx="4" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="138" y="190" font-size="13" text-anchor="middle" fill="currentColor">TLS chặng 1</text><text x="386" y="190" font-size="13" text-anchor="middle" fill="currentColor">TLS chặng 2</text><path d="M260 153 L260 215" fill="none" stroke="#f43f5e" stroke-width="1.5"/><text x="260" y="240" font-size="14" text-anchor="middle" fill="currentColor">Giải mã tại ALB · cert ACM</text><text x="260" y="265" font-size="13" text-anchor="middle" fill="currentColor">Đọc HTTP → routing path/host → mã hoá lại</text>
</svg>
<svg viewBox="0 0 520 288" role="img" aria-labelledby="eng03-nlb-t eng03-nlb-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="eng03-nlb-t">TLS qua NLB</title>
<desc id="eng03-nlb-d">Cùng vị trí client load balancer target; dải TLS chia hai tại ALB hoặc liên tục qua NLB tới target.</desc>
<defs><marker id="eng03-nlb-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs><text x="16" y="26" font-size="14" text-anchor="start" fill="currentColor">Điểm giải mã TLS: vị trí đường mã hoá dừng</text><rect x="16" y="68" width="112" height="44" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="72" y="96" font-size="14" text-anchor="middle" fill="currentColor">Client</text><rect x="204" y="68" width="112" height="44" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="260" y="96" font-size="14" text-anchor="middle" fill="currentColor">NLB (L4)</text><rect x="392" y="68" width="112" height="44" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/><text x="448" y="96" font-size="14" text-anchor="middle" fill="currentColor">Target</text><text x="72" y="137" font-size="13" text-anchor="middle" fill="currentColor">HTTPS</text><text x="448" y="137" font-size="13" text-anchor="middle" fill="currentColor">backend</text><path d="M128 90 L200 90" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#eng03-nlb-a)"/><path d="M316 90 L388 90" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#eng03-nlb-a)"/><rect x="16" y="168" width="488" height="32" rx="4" fill="#10b981" fill-opacity="0.14" stroke="#10b981"/><text x="260" y="190" font-size="13" text-anchor="middle" fill="currentColor">TLS end-to-end: client → target</text><path d="M504 153 L504 215" fill="none" stroke="#f43f5e" stroke-width="1.5"/><text x="260" y="240" font-size="14" text-anchor="middle" fill="currentColor">Target tự terminate TLS</text><text x="260" y="265" font-size="13" text-anchor="middle" fill="currentColor">NLB chỉ chuyển byte; không đọc nội dung</text>
</svg>
<ab-note>ALB giải mã để đọc HTTP, routing theo path/host và tích hợp WAF; ví dụ này mã hoá lại tới target nên có hai chặng TLS riêng.</ab-note>
<ab-note>NLB tầng 4 chuyển nguyên byte TLS tới backend: mã hoá end-to-end, nhưng load balancer không đọc được HTTP để routing theo nội dung.</ab-note>
</ab-toggle>

### CloudFront + TLS
- Edge của CloudFront hỗ trợ **TLS 1.3 và HTTP/3 (QUIC)** — bật HTTP/3 chỉ là một checkbox, giảm độ trễ kết nối cho user xa (đúng bài toán 1-RTT/0-RTT ở phần 4–5).
- Hai chặng TLS riêng biệt: **viewer → CloudFront** (cert ACM us-east-1, custom domain) và **CloudFront → origin** (origin protocol policy; origin cần cert hợp lệ, đúng hostname — lỗi hostname mismatch ở origin là nguồn 502 kinh điển).
- Security policy (vd `TLSv1.2_2021`) quy định phiên bản TLS tối thiểu phía viewer — câu hỏi compliance hay gặp.

### API Gateway mTLS
- REST API/HTTP API hỗ trợ **mTLS trên custom domain**: bạn upload **truststore** (PEM chứa CA cert) lên S3, API Gateway xác minh client cert theo truststore đó. Khi bật mTLS phải **tắt default execute-api endpoint** để không bị đi vòng.
- Tình huống đề DVA: "đối tác B2B phải xác thực bằng client certificate" → API Gateway mTLS, không phải API key (API key chỉ để đo lường/throttle, không phải cơ chế xác thực).

### Tóm tắt ánh xạ nhanh

| Kỹ năng trong bài | Tình huống AWS/đề thi |
|---|---|
| TCP vs UDP | Chọn NLB cho UDP/TCP thuần, ALB cho HTTP |
| Handshake & RTT | Bật HTTP/3 trên CloudFront để giảm latency toàn cầu |
| TLS termination vs passthrough | ALB terminate (đọc được HTTP) vs NLB passthrough (end-to-end encryption) |
| Cert hết hạn / gia hạn | ACM auto-renew; cert CloudFront ở us-east-1 |
| SNI | ALB/CloudFront host nhiều domain trên 1 endpoint |
| mTLS | API Gateway mutual TLS với truststore trên S3; ALB mTLS |
| Debug bằng curl/openssl | Truy lỗi 502 origin, security group chặn 443, cert sai SAN |

> **Ghi nhớ chốt bài**: Khi HTTPS lỗi, đi từ dưới lên — **DNS (dig) → TCP (nc) → TLS (openssl s_client) → HTTP (curl -v)**. Tầng nào fail thì dừng ở tầng đó mà sửa; 90% thời gian debug bị lãng phí vì đoán mò ở sai tầng.
