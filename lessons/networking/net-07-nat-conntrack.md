# Bài 7 — NAT và conntrack: hết port khác đầy bảng ở đâu?

## 1. Mục tiêu

Sau bài này bạn có thể:

- Đọc hai tuple trên một dòng `conntrack -L` để suy ra địa chỉ và port trước/sau SNAT, kể cả chiều trả lời.
- Tái hiện việc flow mới timeout nhưng flow cũ vẫn chạy bằng một dải SNAT có đúng hai port.
- Bác bỏ câu “một IP NAT chỉ phục vụ được một số cố định connection” bằng cách đổi đích rồi kiểm mapping.
- Giải thích vì sao thay rule NAT không chuyển ngay flow đang sống sang dải port mới.
- Phân biệt cạn port dịch, cạn port ở máy client và không cấp phát được entry conntrack bằng điểm bắt gói cùng bộ đếm.
- Tính số mapping cần giữ từ tốc độ tạo flow và thời gian giữ state, đồng thời nêu điều kiện khiến phép tính sai.

## 2. Triệu chứng

Một worker gửi datagram tới dịch vụ echo qua router Linux. Lần A trả lời; lần B trả lời; lần C timeout sau **0,5 giây**. Gửi lại từ port của A vẫn trả lời. Cùng client đó, giữ nguyên port nguồn của C nhưng đổi IP đích thì D lại thành công. Server chưa quá tải: A/B/C/D mỗi request chỉ mang một ký tự.

Phản xạ đầu tiên là tăng timeout hoặc restart worker: “Server trả lời không đều, chắc mạng đang mất gói.” Hãy cho chẩn đoán ấy chạy trước: nếu vấn đề là mất gói ngẫu nhiên, vì sao ranh giới thành công lại đi theo **bộ địa chỉ và port** thay vì theo thứ tự thời gian?

> **Đo trên lab.** Docker/colima, Alpine 3.20, Linux `6.8.0-64-generic` aarch64; iptables `1.8.10 (nf_tables)`, conntrack-tools `1.4.8`, Python `3.12.13`. Rule SNAT giới hạn nguồn ngoài là `10.7.2.1:40000-40001`. `out/ports.txt` ghi A/B thành công, C timeout, D thành công, A-again thành công. Đo lại: `./run.sh` trong `~/projects/net-lab/net-07/`. Cấu hình và phiên bản đầy đủ nằm ở `inside.sh`, `out/environment.txt`.

IP “ngoài” ở đây vẫn là IP private trong lab kín, không phải public IP của máy chạy. Cơ chế dịch tuple không đòi hỏi phải gửi traffic ra Internet. Bài nền [[intro-02-networking]] đã giải thích mục đích dùng chung địa chỉ; bài này đi vào phần bộ nhớ trạng thái và các giới hạn cụ thể. CIDR xem [[eng-02-cidr-subnetting]], TCP/UDP cơ bản xem [[eng-03-tcp-tls]].

## ⏸ Dừng lại — đoán trước #1

Rule có hai port, A/B đã dùng cả hai tới `10.7.2.2:9000/UDP`. Vì sao D tới `10.7.2.3:9000/UDP` có thể thành công?

- (a) UDP không cần conntrack nên lần thứ ba luôn được phép.
- (b) Kernel có thể dùng lại port ngoài nếu tuple trả lời vẫn phân biệt được nhờ đích khác.
- (c) Đổi IP đích tự xoá toàn bộ mapping cũ.
- (d) D nhận reply chứng minh rule SNAT đã bị bỏ qua.

## 3. Cơ chế

### 3.1 Router phải nhớ đủ để nhận ra gói trả lời

Đáp án là **(b)**. **NAT — Network Address Translation — là việc viết lại địa chỉ IP khi gói đi qua thiết bị**; biến thể dịch thêm port gọi là **NAPT — Network Address Port Translation**. Trong bài, từ NAT chỉ cấu hình stateful NAT của Linux đang thử, không khẳng định mọi dạng dịch địa chỉ đều phải có cùng cách lưu state.

**SNAT — source NAT — sửa nguồn của chiều khởi tạo**. Client gửi `10.7.1.2:12001 → 10.7.2.2:9000/UDP`; router phát ra `10.7.2.1:40000 → 10.7.2.2:9000/UDP`. Echo server trả về `10.7.2.2:9000 → 10.7.2.1:40000/UDP`. Nếu chỉ sửa chiều đi mà không giữ mapping, router không thể suy ra reply này cần về port `12001` của client.

**Conntrack — connection tracking — là cơ chế kernel ghi nhận các flow và trạng thái của chúng để xử lý các gói tiếp theo.** Một **flow** ở đây là chuỗi gói được nhận diện bằng tuple; **5-tuple** gồm giao thức, IP nguồn, port nguồn, IP đích, port đích. Với UDP, không có handshake cũng vẫn có entry conntrack: “connection” trong tên công cụ không đồng nghĩa có socket TCP ESTABLISHED. Trong cùng network namespace và conntrack zone, hai chiều được tra bằng tuple original và reply; **zone** là miền tách biệt để những tuple giống nhau không bị xem là cùng flow. Cách lọc original/reply và zone có trong [conntrack(8)](https://manpages.debian.org/bookworm/conntrack/conntrack.8.en.html).

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 370" role="img" aria-labelledby="net07-a-t net07-a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net07-a-t">SNAT đi và dịch ngược reply của flow A</title>
<desc id="net07-a-d">SNAT đi và dịch ngược reply của flow A</desc>
<defs><marker id="net07-a-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="15" y="50" width="120" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="75" y="78" font-size="14" text-anchor="middle" fill="currentColor">Client</text><rect x="200" y="50" width="120" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="260" y="78" font-size="14" text-anchor="middle" fill="currentColor">Router</text><rect x="385" y="50" width="120" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="445" y="78" font-size="14" text-anchor="middle" fill="currentColor">Server</text><line x1="75" y1="95" x2="75" y2="350" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/><line x1="260" y1="95" x2="260" y2="350" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/><line x1="445" y1="95" x2="445" y2="350" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/><text x="75" y="25" font-size="14" text-anchor="middle" fill="currentColor">10.7.1.2</text><text x="260" y="25" font-size="14" text-anchor="middle" fill="currentColor">10.7.2.1</text><text x="445" y="25" font-size="14" text-anchor="middle" fill="currentColor">10.7.2.2</text><g data-step="1"><line x1="75" y1="130" x2="260" y2="130" stroke="currentColor" stroke-width="2" marker-end="url(#net07-a-arr)"/><text x="167" y="119" font-size="13" text-anchor="middle" fill="currentColor">12001 → 9000</text></g><g data-step="2"><line x1="260" y1="190" x2="445" y2="190" stroke="currentColor" stroke-width="2" marker-end="url(#net07-a-arr)"/><text x="352" y="179" font-size="13" text-anchor="middle" fill="currentColor">40000 → 9000</text><rect x="155" y="205" width="210" height="30" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="260" y="225" font-size="14" text-anchor="middle" fill="currentColor">binding 12001 ↔ 40000</text></g><g data-step="3"><line x1="445" y1="275" x2="260" y2="275" stroke="currentColor" stroke-width="2" marker-end="url(#net07-a-arr)"/><text x="352" y="264" font-size="13" text-anchor="middle" fill="currentColor">9000 → 40000</text></g><g data-step="4"><line x1="260" y1="330" x2="75" y2="330" stroke="currentColor" stroke-width="2" marker-end="url(#net07-a-arr)"/><text x="167" y="319" font-size="13" text-anchor="middle" fill="currentColor">9000 → 12001</text></g>
</svg>
<step-note data-step="1">Client tạo original tuple tới server; router phải biết đích trước khi chọn đường ra.</step-note>
<step-note data-step="2">SNAT lưu binding rồi phát gói mang nguồn router. Server không thấy port 12001.</step-note>
<step-note data-step="3">Server trả lời về tuple ngoài, không tự biết client private.</step-note>
<step-note data-step="4">Router tra tuple reply rồi khôi phục đích client bằng binding đã giữ.</step-note>
</step-flow>

Hình giữ cố định client, router và server; thứ thay đổi là tuple của gói. Phần dịch ngược dùng lại state đã tạo, không cần viết thêm một rule DNAT thủ công cho mỗi reply. **DNAT — destination NAT — sửa đích của chiều khởi tạo**, chẳng hạn port forwarding vào một server; đó là cấu hình khác với việc tự đảo SNAT cho reply.

Một dòng `conntrack -L` không in “trước NAT” rồi “sau NAT” theo cùng chiều. Nó in **original direction** rồi **reply direction**. Muốn dựng gói đi ra sau SNAT, đảo nguồn/đích của tuple reply. Nhìn thấy `src=10.7.2.2` ở nửa sau rồi kết luận server là nguồn của request là đọc sai chiều.

> **Nguồn.** [RFC 3022 §2.2](https://www.rfc-editor.org/rfc/rfc3022.txt) mô tả NAPT dịch cả địa chỉ và định danh giao vận. [Netfilter Architecture](https://www.iptables.org/documentation/HOWTO/netfilter-hacking-HOWTO-3.html) nêu NAT table chỉ xét gói đầu của connection: *“only the first packet of a new connection will traverse the table”*. Các gói sau dùng kết quả đã lưu.

NAT và conntrack có quan hệ phụ thuộc trong cấu hình này nhưng không phải cùng một bảng mục đích. Một router/firewall có thể theo dõi flow **không dịch địa chỉ**. Ngược lại, có dạng dịch stateless không thuộc phạm vi thí nghiệm này. Vì thế không lấy tổng entry conntrack làm số “port NAT đang chiếm”: phải lọc flow và xem binding nào thật sự thay đổi.

### 3.2 Hai port không phải hai flow cho toàn bộ Internet

Ở lần chạy được trích, A nhận port ngoài `40000`, B nhận `40001`. Nếu flow C cùng dùng `10.7.2.1:40000` tới cùng `10.7.2.2:9000/UDP`, reply của A và C sẽ giống hoàn toàn về tuple ngoài. Router không thể chọn giữa port client `12001` và `12003`. Dùng `40001` cũng đụng B. Dải rule không còn tuple phù hợp nên C không ra được link ngoài.

D thay đích sang `10.7.2.3:9000`; nó dùng lại `40001`. Khi reply về, nguồn reply là `.3`, khác reply của B từ `.2`. **Port ngoài bằng nhau chưa đủ gây xung đột; tuple dùng để tra chiều trả lời mới quyết định.** Đây là bằng chứng cho phép dùng lại trên cấu hình Linux đã đo, không phải lời hứa rằng mọi NAT thương mại sẽ cấp port theo chính sách đó.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 310" role="img" aria-labelledby="net07-b-t net07-b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net07-b-t">Không gian tuple chia theo đích và port ngoài</title>
<desc id="net07-b-d">Không gian tuple chia theo đích và port ngoài</desc>
<defs><marker id="net07-b-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260" y="25" font-size="14" text-anchor="middle" fill="currentColor">Cùng port ngoài · khác đích thì khác tuple</text><text x="220" y="65" font-size="14" text-anchor="middle" fill="currentColor">40000</text><text x="400" y="65" font-size="14" text-anchor="middle" fill="currentColor">40001</text><text x="10" y="125" font-size="13" text-anchor="start" fill="currentColor">10.7.2.2:9000</text><rect x="155" y="95" width="150" height="55" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><rect x="335" y="95" width="150" height="55" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="10" y="195" font-size="13" text-anchor="start" fill="currentColor">10.7.2.3:9000</text><rect x="155" y="165" width="150" height="55" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><rect x="335" y="165" width="150" height="55" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="230" y="128" font-size="14" text-anchor="middle" fill="currentColor">A · 12001</text><text x="410" y="128" font-size="14" text-anchor="middle" fill="currentColor">B · 12002</text><text x="410" y="198" font-size="14" text-anchor="middle" fill="currentColor">D · 12003</text><text x="230" y="198" font-size="14" text-anchor="middle" fill="currentColor">còn trống</text><text x="260" y="260" font-size="14" text-anchor="middle" fill="currentColor">C → .2: cả hai ô đã có binding</text><text x="260" y="285" font-size="13" text-anchor="middle" fill="currentColor">UDP · nguồn ngoài 10.7.2.1</text>
</svg>

Bảng sau chỉ ghi lại kết quả sau khi đã giải thích nguyên nhân:

| Flow | Nguồn client | Đích UDP | Nguồn ngoài đo được | Kết quả |
|---|---|---|---|---|
| A | `10.7.1.2:12001` | `10.7.2.2:9000` | `10.7.2.1:40000` | reply |
| B | `10.7.1.2:12002` | `10.7.2.2:9000` | `10.7.2.1:40001` | reply |
| C | `10.7.1.2:12003` | `10.7.2.2:9000` | không có binding thành công | timeout |
| D | `10.7.1.2:12003` | `10.7.2.3:9000` | `10.7.2.1:40001` | reply |

> **Đo trên lab.** `out/table-before.txt` có ba entry: A/B tới `.2`, D tới `.3`. `out/wire.txt` có gói của A/B/D, không có gói C trên `net07-right`; sau đó A-again vẫn nhận reply. Đo lại bằng `./run.sh`, đối chiếu đồng thời `ports.txt`, `table-before.txt` và `wire.txt`. Port ngoài cụ thể có thể đảo ở lần chạy khác; quan hệ trùng/khác tuple mới là kết quả cần giữ.

Đây là lý do câu “mỗi IP NAT có tối đa 65.536 connection” thiếu điều kiện. Không gian port giao vận dài 16 bit, nhưng số port được cấu hình để cấp, port bị dành riêng, giao thức, đích và chính sách allocator đều ảnh hưởng trần thực tế. [RFC 768](https://www.rfc-editor.org/rfc/rfc768.txt) cho cấu trúc port UDP 16 bit; [RFC 3022 §2.2](https://www.rfc-editor.org/rfc/rfc3022.txt) cho cách dịch NAPT; lab chỉ cho phép hai port để tách cơ chế khỏi kích thước cấu hình production. Không nhân hai port với mọi IP đích rồi nhận đó là quota chắc chắn: conntrack, bộ nhớ, CPU hoặc chính sách thiết bị có thể chặn trước.

Với một dịch vụ cloud có metric lỗi cấp port riêng, phải đọc quota và metric của đúng dịch vụ. Không dùng số mặc định Linux để suy ra hạn mức managed NAT. Ở phạm vi bài này, “NAT gateway” là vai trò của router lab, không phải tuyên bố đã đo một dịch vụ cloud.

### 3.3 Rule quyết định binding mới; binding cũ không tự đổi theo rule

Sau A/B/D, script thay rule từ `40000-40001` sang `41000-41001`. Nếu NAT chạy lại phép chọn port từ rule trên mọi gói, A gửi tiếp phải đổi port ngay. Kết quả: A vẫn ra `40000`; flow mới từ `12004` ra `41000`. Chỉ khi xoá đúng entry A rồi gửi lại, `12001` mới ra `41001`.

Ở đây **binding** là ánh xạ dịch đã gắn với một flow. NAT rule là cách tạo binding khi cần; binding là dữ kiện để xử lý flow đã có. Đổi rule tương đương đổi cách cấp mapping tiếp theo, không phải migrate mọi mapping đang tồn tại. Tên “nat table” dễ làm người vận hành tưởng đó là bảng tra toàn bộ mapping, nhưng `iptables -t nat -L` liệt kê rule, còn `conntrack -L` mới cho thấy state của các flow.

## ⏸ Dừng lại — đoán trước #2

Bạn sửa SNAT sang một địa chỉ mới, chạy kiểm tra bằng connection pool cũ và thấy server vẫn ghi IP nguồn cũ. Hành động nào phân biệt được rule sai với binding cũ còn sống?

- (a) Gọi thêm request HTTP trên cùng socket cho tới khi rule counter tăng.
- (b) Tạo flow có tuple mới, đồng thời xem tuple reply của cả flow cũ và mới.
- (c) Xoá cả bảng conntrack production để thử lại cho sạch.
- (d) Tăng timeout TCP của firewall.

### 3.4 State sống lâu hơn vòng đời một lần gửi của ứng dụng

Đáp án **(b)**. Trong lab, mỗi lần gọi `udp.py` tạo socket, gửi, nhận, rồi thoát. A-again là tiến trình khác nhưng bind lại cùng port, gửi tới cùng đích khi entry còn sống. Conntrack vẫn nhận đó là flow cũ. **Đóng UDP socket ở client không gửi thông báo “xoá mapping” tới router**; NAT chỉ thấy gói trên đường đi và áp dụng timeout/trạng thái của chính nó.

**Timeout conntrack** là thời gian kernel giữ entry theo trạng thái và hoạt động quan sát được, không phải deadline chờ response của ứng dụng. `socket.settimeout(0.5)` khiến C báo lỗi ở phía client sau nửa giây; nó không đặt timeout của NAT thành nửa giây. UDP trong lab có cấu hình thường là `30 s`, stream là `120 s`; ảnh bảng ngay sau echo vẫn hiện `29`, không có nghĩa mọi trao đổi hai chiều lập tức được nâng lên đúng `120`.

> **Nguồn.** [Kernel conntrack sysctl](https://docs.kernel.org/networking/nf_conntrack-sysctl.html) định nghĩa `nf_conntrack_udp_timeout` và `nf_conntrack_udp_timeout_stream`; tài liệu gắn extended timeout với việc phát hiện UDP stream. Các giá trị đang chạy phải đọc từ đúng namespace. `out/final.txt` đo được `30` và `120`; bài không đo thuật toán nhận diện stream hay thời điểm entry tự hết hạn.

Muốn kiểm thay đổi rule, một flow mới có chủ đích rẻ hơn việc xoá state hàng loạt. Script xoá riêng tuple A trong namespace lab để chứng minh quan hệ nhân quả. Đừng thay bằng `conntrack -F` trên router đang phục vụ: đó là thao tác xoá state của các dịch vụ khác nữa. Với TCP, mất state giữa đường còn có thể gặp rule `INVALID`, chính sách nhận gói giữa phiên và dịch địa chỉ không còn khớp; bài không hứa flow cũ sẽ phục hồi theo cùng cách UDP lab.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 245" role="img" aria-labelledby="net07-c-t net07-c-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net07-c-t">Đổi rule không xoá binding cũ</title>
<desc id="net07-c-d">Đổi rule không xoá binding cũ</desc>
<defs><marker id="net07-c-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260" y="24" font-size="14" text-anchor="middle" fill="currentColor">Một flow A · cùng vị trí, binding thay đổi</text><rect x="25" y="80" width="170" height="60" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="110" y="105" font-size="14" text-anchor="middle" fill="currentColor">Original UDP</text><text x="110" y="125" font-size="14" text-anchor="middle" fill="currentColor">12001 → .2:9000</text><line x1="195" y1="110" x2="295" y2="110" stroke="currentColor" stroke-width="2" marker-end="url(#net07-c-arr)"/><rect x="300" y="80" width="195" height="60" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><g data-step="1" data-until="2"><text x="397" y="105" font-size="14" text-anchor="middle" fill="currentColor">SNAT :40000</text><text x="397" y="125" font-size="14" text-anchor="middle" fill="currentColor">binding còn sống</text></g><g data-step="2" data-until="2"><text x="260" y="185" font-size="14" text-anchor="middle" fill="currentColor">Rule mới: 41000–41001</text><text x="260" y="210" font-size="14" text-anchor="middle" fill="currentColor">A vẫn giữ binding cũ</text></g><g data-step="3"><text x="397" y="105" font-size="14" text-anchor="middle" fill="currentColor">SNAT :41001</text><text x="397" y="125" font-size="14" text-anchor="middle" fill="currentColor">binding tạo lại</text><text x="260" y="185" font-size="14" text-anchor="middle" fill="currentColor">Xoá entry A → gửi lại</text></g>
</svg>
<step-note data-step="1">Flow A đã có binding :40000 từ rule đầu.</step-note>
<step-note data-step="2">Rule được thay, nhưng gói của A vẫn tra binding đã có.</step-note>
<step-note data-step="3">Sau khi xoá đúng entry A, gói mới tạo binding từ rule hiện tại.</step-note>
</step-flow>

[iptables-extensions(8)](https://man7.org/linux/man-pages/man8/iptables-extensions.8.html) cũng phân biệt SNAT với **MASQUERADE**, tức kiểu SNAT lấy địa chỉ của interface ra và quên connection liên quan khi interface xuống. Nguyên nhân khác biệt là địa chỉ interface động có thể không còn giữ được sau khi nối lại. MASQUERADE không phải phép tăng số port, cũng không phải tên khác của firewall. Với địa chỉ router lab cố định, script dùng SNAT để binding không phụ thuộc cách chọn IP interface.

### 3.5 Cạn port và đầy conntrack có thể cùng gây timeout, nhưng khác tài nguyên

Khi tạo flow mới, kernel cần một entry theo dõi; khi flow cần NAPT, nó còn cần tuple dịch khả dụng. Thiếu một trong hai đều có thể khiến request mới không tới server. Nhưng thêm port không tạo ra bộ nhớ conntrack, còn tăng số entry không làm một tuple ngoài đang bận trở nên phân biệt được.

**`nf_conntrack_count`** đếm entry flow đang cấp phát; **`nf_conntrack_max`** là giới hạn entry được phép. Hai tuple original/reply thuộc **một entry**, không phải hai connection để cộng đôi count. Tài liệu kernel nói entry được đưa vào hash theo cả hai chiều; việc có hai cách tra không làm số flow tăng gấp đôi. Giá trị mặc định trong docs hiện tại có thể khác kernel đang chạy; luôn ghi phiên bản cùng output.

Ở nhánh cấp phát của [Linux v6.8 `nf_conntrack_core.c`](https://raw.githubusercontent.com/torvalds/linux/v6.8/net/netfilter/nf_conntrack_core.c), khi count vượt max, kernel thử `early_drop()`, tức giải phóng sớm entry đủ điều kiện. Nếu không làm được, nó ghi thông báo `nf_conntrack: table full, dropping packet` và trả lỗi cấp phát. Vì vậy “count chạm max thì tất cả traffic chết ngay” không phải cơ chế: việc tạo entry mới mới là điểm đang chịu áp lực; các gói tra trúng state cũ có thể vẫn qua, và còn phụ thuộc chính sách/filter/tài nguyên khác.

> **Suy luận.** Sự khác biệt flow cũ/flow mới khi bảng đầy suy từ nhánh cấp phát và tra state của source kernel, không phải phép đo bão hoà trong bài. Đo trên một VM riêng bằng tải có giới hạn, chụp `count/max`, chênh bộ đếm `conntrack -S`, log kernel và capture hai phía. Không hạ giới hạn kernel dùng chung để “thử nhanh”.

Trong lần chạy này `out/final.txt` ghi **count 4, max 262144**, trong khi C đã timeout trước đó. Đó là **bác bỏ** giả thuyết bảng đầy cho thí nghiệm này. `drop=1` và `insert_failed=1` trong thống kê không tự biến thành “table full”: chúng có thể xuất hiện cùng các đường lỗi khác. Muốn gán nguyên nhân phải khớp thời gian, lưu lượng, cấu hình và log; một ảnh counter tích luỹ không đủ.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330" role="img" aria-labelledby="net07-d-t net07-d-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net07-d-t">Bốn binding nhưng tổng bảng còn xa giới hạn</title>
<desc id="net07-d-d">Bốn binding nhưng tổng bảng còn xa giới hạn</desc>
<defs><marker id="net07-d-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="260" y="25" font-size="14" text-anchor="middle" fill="currentColor">Ảnh cuối lab: hai giới hạn độc lập</text><text x="15" y="65" font-size="14" text-anchor="start" fill="currentColor">Binding theo dải port ngoài</text><rect x="20" y="85" width="230" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="135" y="113" font-size="14" text-anchor="middle" fill="currentColor">40001 · B</text><rect x="270" y="85" width="230" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="385" y="113" font-size="14" text-anchor="middle" fill="currentColor">40001 · D</text><rect x="20" y="145" width="230" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="135" y="173" font-size="14" text-anchor="middle" fill="currentColor">41000 · mới</text><rect x="270" y="145" width="230" height="45" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><text x="385" y="173" font-size="14" text-anchor="middle" fill="currentColor">41001 · A</text><text x="260" y="220" font-size="14" text-anchor="middle" fill="currentColor">Conntrack tổng: 4 / 262144 entry</text><rect x="20" y="240" width="480" height="30" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/><rect x="20" y="240" width="0.00732421875" height="30" fill="currentColor"/><line x1="70" y1="298" x2="21" y2="272" stroke="currentColor" stroke-width="2" marker-end="url(#net07-d-arr)"/><text x="290" y="305" font-size="13" text-anchor="middle" fill="currentColor">Phần dùng &lt; 1 px ở tỷ lệ này</text>
</svg>

Hình tách giới hạn theo flow khỏi giới hạn tổng, dùng số đo cuối lab; hai port cũ vẫn còn binding và hai binding mới dùng dải mới sau đổi rule. `count=4` gồm D, B, flow mới và A được tạo lại, không còn là bảng ở thời điểm ngay sau C. Không ghép ảnh cuối với thời điểm C để tính occupancy tại một thời điểm chưa chụp.

> **Chưa đo.** Bài không tái hiện đầy bảng, CPU của conntrack khi tải lớn, timeout TCP hay quota NAT managed cloud. Thí nghiệm chỉ xác nhận cạn không gian tuple của rule cụ thể, reuse theo đích, và binding tồn tại qua đổi rule. Các giá trị timeout đọc được là cấu hình, không phải số đo tuổi thọ thực tế.

### 3.6 Đừng nhầm port của client với port của NAT

**Ephemeral port** là port tạm mà hệ điều hành client cấp cho socket khi ứng dụng không tự chọn port. [ip(7)](https://man7.org/linux/man-pages/man7/ip.7.html) mô tả việc tự bind port khi ứng dụng chưa bind trước. Client có thể không tạo được socket/connection vì hết tài nguyên cục bộ, dù NAT còn chỗ. Ngược lại, trong lab C bind port `12003` thành công và gọi `sendto()` xong; timeout đến khi chờ reply. Điều đó loại trừ lỗi bind port client cho C, nhưng riêng timeout vẫn chưa đủ kết luận NAT.

Chuỗi chẩn đoán cần đi theo vị trí gói. Nếu bind/connect báo lỗi trước khi có gói ra client, kiểm socket, port cục bộ và giới hạn file descriptor. Nếu gói ra client, tới phía trong router nhưng không ra phía ngoài, kiểm route, rule filter, cấp state và NAT. Nếu gói đã ra ngoài tới server mà không có reply, hãy kiểm app server và đường về thay vì chỉ tăng bảng NAT. Nếu reply tới ngoài router mà không tới client, đối chiếu tuple reply và capture phía trong.

Một firewall stateful còn cần rule cho phép traffic dựa trên state; việc tồn tại conntrack entry không tự đồng nghĩa packet được ACCEPT. NAT chỉ sửa danh tính trên gói; chính sách lọc quyết định cho qua. Lab để forwarding policy cho phép nhằm cô lập biến số. Khi thêm firewall, phải kiểm các chain thực tế sau backend iptables/nft, tránh đọc rule của công cụ khác rồi tưởng đang nhìn toàn bộ chính sách.

**Connection pooling** là giữ và dùng lại các connection thay vì tạo mới cho mỗi tác vụ. Nếu mỗi request đẻ một flow mới thì tốc độ tạo mapping tăng theo request; reuse connection làm hai tốc độ đó tách ra. Đây là can thiệp từ phía app lên nhu cầu state, không phải bằng chứng cứ bật pooling là giải được mọi cạn port: pool tổng của mọi process, đích tập trung và thời gian giữ state vẫn quyết định tải lên gateway.

## 4. Lab

### 4.1 Dựng lại đúng topology

Thư mục `~/projects/net-lab/net-07/` chứa `run.sh`, `inside.sh`, `udp.py`, `src/` và `out/`. Chạy từ thư mục đó:

```bash
./run.sh
cat out/ports.txt
cat out/table-before.txt
cat out/wire.txt
```

`run.sh` tạo container `net07-lab` bằng Alpine 3.20, cài công cụ và chạy `inside.sh`; khi thoát nó xoá container đó. Container dùng `--privileged` để tạo network namespace và veth, không sửa network host. Mỗi đầu veth, namespace và container đều có tiền tố net07. Không chạy script bằng cách đổi sang namespace/router production.

Topology là client `.1.2` nối router `.1.1`, rồi router `.2.1` nối server `.2.2` và alias `.2.3`. Tất cả địa chỉ đầy đủ đều thuộc `10.7`. Server không có route về subnet client, do đó reply thành công cần nguồn đã dịch. Hai echo socket bind riêng `.2.2`/`.2.3`, giữ đúng địa chỉ nguồn reply cho từng đích; bind wildcard rồi tự chọn IP nguồn có thể làm hỏng chính phép thử đổi đích.

**Làm gì → thấy gì → vì sao:** script bật forwarding trên router, cấu hình SNAT cho UDP ra interface ngoài rồi gọi từng client nối tiếp. Mỗi lần gửi giữ socket tối đa nửa giây chờ echo. Lưu lượng sinh trong lab chỉ đủ phân biệt các mapping; không cần flood hay Internet.

Đây là rule quyết định, chạy **bên trong container** như `inside.sh`:

```sh
ip netns exec net07-r iptables -t nat -A POSTROUTING \
  -o net07-right -p udp \
  -j SNAT --to-source 10.7.2.1:40000-40001
```

POSTROUTING là hook xử lý gói sau quyết định định tuyến, trước khi rời đường ra; chọn SNAT ở đây cho phép dùng interface ra đã biết. DNAT cho traffic được forward thường cần xử lý trước quyết định route, vì thay đích có thể thay đường đi; [Netfilter Architecture](https://www.iptables.org/documentation/HOWTO/netfilter-hacking-HOWTO-3.html) là nguồn cho vị trí hook. Bài 6 phụ trách bảng route/forwarding, không lặp bài chia subnet ở đây.

### 4.2 Cho chẩn đoán “server lúc được lúc không” thất bại

Output thật từ `out/ports.txt`:

```text
A src=12001 dst=10.7.2.2:9000 reply=A
B src=12002 dst=10.7.2.2:9000 reply=B
C src=12003 dst=10.7.2.2:9000 TIMEOUT
D src=12003 dst=10.7.2.3:9000 reply=D
A-again src=12001 dst=10.7.2.2:9000 reply=A-again
```

**Làm gì → thấy gì → vì sao:** đổi port client cho A/B/C nhưng giữ một đích, rồi giữ port C và đổi đích cho D. C thất bại không kéo A chết. D thành công không xoá mapping A/B. Đây là phép thay một biến mỗi lần; nếu restart router giữa từng request thì state không còn đủ để tái hiện hiện tượng.

Trích `out/wire.txt`, giữ nguyên timestamp và dấu chấm của tcpdump:

```text
04:53:59.117727 IP 10.7.2.1.40000 > 10.7.2.2.9000: UDP, length 1
04:53:59.130021 IP 10.7.2.1.40001 > 10.7.2.2.9000: UDP, length 1
04:53:59.669797 IP 10.7.2.1.40001 > 10.7.2.3.9000: UDP, length 1
```

Capture ngoài thấy nguồn router, không thấy `10.7.1.2`. D dùng lại `40001`, nhưng IP đích khác. C không xuất hiện trong capture đầy đủ; chỉ nhìn ba dòng rút gọn ở trên thì không thể chứng minh sự vắng mặt, nên hãy mở toàn file khi đối chiếu. Log capture ghi không bị kernel drop gói ở tcpdump, còn điều đó không bảo đảm mọi vị trí trước interface đều đã capture được.

### 4.3 Giải mã một entry thay vì đoán nhãn NAT

Trong `out/table-before.txt`, dòng A là:

```text
ipv4     2 udp      17 29 src=10.7.1.2 dst=10.7.2.2 sport=12001 dport=9000 src=10.7.2.2 dst=10.7.2.1 sport=9000 dport=40000 mark=0 use=1
```

**Làm gì → thấy gì → vì sao:** tách tại lần `src=` thứ hai. Nửa đầu là request nguyên gốc; nửa sau là reply kỳ vọng ở phía ngoài. Đảo tuple sau cho ra request đã dịch `10.7.2.1:40000 → 10.7.2.2:9000`, đúng capture. `29` là giá trị thời gian còn lại trong ảnh state này, không phải số request. `mark=0` là metadata mark của connection, không phải port hay số gói.

Không tìm trạng thái TCP ESTABLISHED trên một dòng UDP. Nhãn `[UNREPLIED]`, nếu xuất hiện ở một phép thử khác, nói chưa quan sát được chiều reply theo tracking; nó không tự chứng minh server hỏng. Bài này có reply thật và vẫn chỉ ghi ba entry trước đổi rule. Mỗi entry được đối chiếu bằng tuple, không bằng thứ tự dòng vì thứ tự liệt kê hash không bảo đảm theo thời gian tạo.

### 4.4 Thay rule, giữ flow, rồi xoá đúng flow

`inside.sh` thay rule bằng lệnh dưới đây; `-R ... 1` thay rule thứ nhất thay vì append phía sau rule đang match:

```sh
ip netns exec net07-r iptables -t nat -R POSTROUTING 1 \
  -o net07-right -p udp \
  -j SNAT --to-source 10.7.2.1:41000-41001
```

**Làm gì → thấy gì → vì sao:** gửi old-flow từ `12001`, new-flow từ `12004`; sau đó xoá chính xác original tuple A và gửi after-delete. `out/rule-change.txt` xác nhận cả ba echo thành công và đúng một entry bị xoá. Ba dòng gói đi từ `out/wire.txt`:

```text
04:53:59.705678 IP 10.7.2.1.40000 > 10.7.2.2.9000: UDP, length 8
04:53:59.717450 IP 10.7.2.1.41000 > 10.7.2.2.9000: UDP, length 8
04:53:59.732058 IP 10.7.2.1.41001 > 10.7.2.2.9000: UDP, length 12
```

Payload `old-flow` và `new-flow` đều dài 8 byte, `after-delete` dài 12 byte. Chúng dùng cùng server và đường đi; thứ thay đổi là entry còn hay đã xoá. Rule mới không retroactively dịch A, nhưng flow chưa có state dùng được rule mới ngay.

### 4.5 Đo tài nguyên đúng nghĩa và đọc giới hạn của phép thử

Phần cấu hình trong `out/final.txt`:

```text
net.netfilter.nf_conntrack_count = 4
net.netfilter.nf_conntrack_max = 262144
net.netfilter.nf_conntrack_udp_timeout = 30
net.netfilter.nf_conntrack_udp_timeout_stream = 120
```

**Làm gì → thấy gì → vì sao:** đọc sysctl ở namespace router và bảng flow ngay sau cùng. Conntrack không đầy. Counter của rule NAT mới ghi `2` packet, `76` byte; đó là hai lần tạo binding mới, không phải tổng datagram đã đi qua router trong cả lab. State cũ tiếp tục được dịch mà không chạy lại lựa chọn rule. Không so counter mới sau `-R` với tổng capture rồi bảo công cụ mất gói.

Muốn điều tra một lỗi ngoài lab, lấy delta trước/sau của `conntrack -S` tại đúng namespace/router, chụp `count/max`, log kernel và capture. Nếu cần thử tự hết hạn, giữ lại topology, ngừng gửi, quan sát entry theo thời gian và gửi lại sau khi entry thật sự biến mất; đừng chỉ ngủ đúng số timeout cấu hình rồi khẳng định đã đo. Script hiện tại không có phép thử đó.

## 5. Tính tay

### 5.1 Bao nhiêu tuple còn phân biệt được?

Giữ nguyên rule hai port, một IP nguồn ngoài, UDP và đích `10.7.2.2:9000`. Hai mapping đã sống, chưa hết hạn. Thêm ba flow mới tới cùng đích có thể cùng nhận thêm bao nhiêu mapping? Nếu đổi cả ba sang `.3:9000` và Linux cho reuse theo đích như lab, trần theo riêng không gian tuple là bao nhiêu?

**Giải — suy luận từ lab:** tới `.2` còn `2 − 2 = 0` tuple. Với đích `.3` chưa dùng, có tối đa `2` tuple ngoài phân biệt, nên không quá hai trong ba flow mới cùng tồn tại theo điều kiện đã cho. Không phải “cứ đổi đích là vô hạn”; vẫn phải xét tài nguyên tổng và allocator. Con số này là trần mô hình, không đo thêm ba flow ngoài A/B/C/D.

### 5.2 Timeout ảnh hưởng nhu cầu state ra sao?

**Giả định để tính:** hệ ổn định tạo `200` flow/giây, mỗi flow chiếm một entry trong đúng `30` giây, không refresh, không giải phóng sớm. Cần trung bình bao nhiêu entry? Nếu giữ `120` giây thì sao? Một dải ngoài giả định có `4.000` port dành cho cùng đích có chịu được cả hai trường hợp không?

**Giải — suy luận theo mô hình:** số flow đang giữ là tốc độ tạo nhân thời gian giữ: `200 × 30 = 6.000`; với `120` giây là `24.000`, tăng `4` lần. Cả hai đều vượt `4.000` nếu mỗi flow tới cùng đích bắt buộc một tuple ngoài riêng. Đây không phải dự báo từ timeout UDP stream mặc định: ta chủ động giả định mọi flow có tuổi giữ đúng như đề. Burst, reuse, refresh, nhiều đích và nhiều IP NAT làm thay điều kiện; phải đo tốc độ **flow mới**, không lấy request/giây thay vào.

### 5.3 Hai chiều có nhân đôi count không?

Cho bảng cuối lab `count=4`, max `262144`. Mỗi entry có hai tuple. Có phải count thật là `8` và tỷ lệ sử dụng là `8 / 262144` không? Nếu giữ max không đổi và chỉ tính số slot số học, còn bao nhiêu trước max?

**Giải — suy luận từ định nghĩa count:** không. Bốn entry vẫn là bốn flow; hash có tra hai chiều không biến thành tám entry của sysctl. Tỷ lệ `4 / 262144 × 100 = 0,00152587890625 %`, làm tròn `0,001526 %`. Khoảng cách số học là `262144 − 4 = 262140`. Nó không phải cam kết có thể mở thêm đúng chừng ấy flow: bộ nhớ, giới hạn khác và traffic đồng thời chưa nằm trong phép tính.

## 6. Chuyển giao

Mỗi câu yêu cầu nêu bằng chứng có thể phân biệt các giả thuyết, không chỉ tên tham số cần tăng. Câu cuối không có lời giải trong bài.

1. Worker tăng số process, request/giây không đổi nhưng lỗi mở connection mới xuất hiện. Bạn cần đo pool tổng, flow mới và tuple đích thế nào trước khi đề nghị thêm IP NAT?
2. Một client báo lỗi cấp địa chỉ cục bộ ngay khi `connect()`, trong khi capture router không có SYN tương ứng. Dữ liệu nào trên client giúp tách cạn port với giới hạn file descriptor?
3. NAT vẫn còn port, `count/max` chưa sát giới hạn, nhưng bảng có nhiều flow `[UNREPLIED]` tới một đích. Bạn chọn điểm capture nào để tìm mất chiều đi hay chiều về mà không coi mọi entry đó là tấn công?
4. Sau đổi SNAT, request thử từ terminal dùng nguồn mới, request từ dịch vụ vẫn nguồn cũ. Bạn chứng minh khác biệt do socket pool hay do dịch vụ đi qua router khác bằng cách nào?
5. Một nhánh DNAT vào backend trả lời qua gateway khác. Bạn dự đoán client sẽ thấy nguồn nào và cần thu tuple ở những điểm nào để xác định chỗ thiếu dịch ngược?
6. **Câu khó nhất:** hai gateway chia sẻ IP ngoài để failover, nhưng không chia sẻ conntrack state; chiều đi và chiều về còn có thể bị ECMP chọn khác node. Hãy thiết kế phép thử phân biệt mất binding, tuple xung đột và asymmetric routing; đề xuất điều kiện đủ để giữ được phiên đang chạy, rồi chỉ ra cái giá của từng điều kiện.

## 7. Tóm tắt

- Nửa sau dòng conntrack là tuple reply; đảo nó mới được tuple chiều đi sau SNAT.
- A/B chiếm hai tuple tới `.2:9000`; C timeout nhưng A-again vẫn chạy (`ports.txt`).
- D dùng lại port ngoài `40001` tới `.3:9000` mà reply vẫn phân biệt được (`table-before.txt`, `wire.txt`).
- Đổi rule không đổi binding A; xoá đúng entry A mới khiến lần gửi sau dùng dải mới (`rule-change.txt`, `wire.txt`).
- UDP không có handshake vẫn được conntrack theo dõi; socket timeout ở app không phải timeout của NAT.
- Count cuối lab là 4 trên max 262144; đây không phải thí nghiệm đầy bảng (`final.txt`).
- Source kernel v6.8 thử early-drop trước khi báo không cấp được entry; một counter drop đơn lẻ không xác định nguyên nhân.

→ **Bài 8 — ICMP và traceroute đọc cho đúng**: khi một gói không nhận được hồi đáp, cần phân biệt lỗi chuyển tiếp với việc router không trả thông báo chẩn đoán.
