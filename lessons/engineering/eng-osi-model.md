# Mô hình 7 tầng (OSI) — bản đồ mạng & các vấn đề xuyên tầng

Khi một request đi từ trình duyệt của bạn tới server và quay về, nó không "bay thẳng" — nó chui qua một chồng các tầng giao thức, mỗi tầng làm đúng một việc rồi giao cho tầng dưới. Hiểu chồng tầng này là tấm bản đồ giúp bạn định vị **mọi** vấn đề mạng: "lỗi này ở tầng nào?", "cache cũ nằm ở tầng nào?", "tấn công này chặn ở tầng nào?". Bài này là **xương sống** của chương Mạng: nó cho bạn khung 7 tầng, lấp phần tầng thấp (Ethernet/MAC/ARP) mà các bài khác bỏ qua, rồi vẽ ba bản đồ xuyên tầng — **caching, bảo mật, và debug/performance** — để bạn không bao giờ "đoán mò sai tầng" nữa.

> Bài này là bản đồ tổng. Hai bài sau trong chương sẽ khoan sâu: [[eng-02-cidr-subnetting]] (tầng 3 — IP/subnet) và [[eng-03-tcp-tls]] (tầng 4–7 — TCP/UDP/TLS/HTTP).

## 1. Vì sao phải phân tầng?

Hãy hình dung gửi một bưu kiện quốc tế. Bạn chỉ viết nội dung lá thư; bạn **không** cần biết thư sẽ đi máy bay hay tàu thủy, hải quan đóng dấu ra sao, xe tải nào chở chặng cuối. Mỗi khâu — người viết, bưu cục, hãng vận chuyển, hải quan — làm đúng phần việc của mình và **giao tiếp với khâu tương ứng ở đầu kia**: người viết "nói chuyện" với người đọc, hải quan đi "nói chuyện" với hải quan.

Mạng máy tính cũng chia việc y hệt, vì ba lý do:

- **Chia để trị**: "đưa bit qua dây" là bài toán hoàn toàn khác với "định tuyến gói qua Internet" hay "định dạng một HTTP request". Tách ra thì mỗi bài toán giải gọn được.
- **Thay một tầng không phá tầng khác**: đổi WiFi sang cáp quang (tầng 1) mà trình duyệt không phải sửa một dòng nào. Chuyển HTTP/1.1 sang HTTP/3 (tầng 7) mà dây mạng không cần biết.
- **Chuẩn hoá để ghép nối**: thiết bị của hãng A nói chuyện được với hãng B vì cả hai tuân theo cùng "hợp đồng" tại mỗi tầng.

Nguyên tắc vàng: **mỗi tầng chỉ nói chuyện với tầng ngay trên và ngay dưới nó trên cùng một máy, và "nói chuyện logic" với tầng cùng cấp ở máy bên kia.** Tầng 7 bên gửi tư duy như đang nói trực tiếp với tầng 7 bên nhận, dù thực tế dữ liệu phải đi xuống tận tầng 1 rồi mới sang.

> 💡 **Ghi nhớ:** Phân tầng = mỗi tầng một việc + "hợp đồng" rõ ràng giữa các tầng. Nhờ vậy bạn thay/sửa/debug **một** tầng mà không động đến phần còn lại.

## 2. OSI 7 tầng — bảng tổng quan

Mô hình **OSI** (Open Systems Interconnection) chia truyền thông mạng thành 7 tầng, đánh số từ **dưới lên** (tầng 1 là vật lý, tầng 7 sát người dùng nhất):

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 470" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Mô hình OSI 7 tầng và ánh xạ sang TCP/IP</title>
  <desc>Bảy tầng OSI từ trên xuống: Application, Presentation, Session, Transport, Network, Data Link, Physical — kèm PDU và ánh xạ nhóm TCP/IP.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Mô hình OSI 7 tầng</text>
  <text x="704" y="26" font-size="12" text-anchor="end" fill="currentColor" opacity="0.6">TCP/IP</text>
  <g>
    <rect x="16" y="44" width="544" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="24" y="56" width="26" height="26" rx="7" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="37" y="74" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">7</text>
    <text x="62" y="66" font-size="13.5" font-weight="700" fill="currentColor">Application — Ứng dụng</text>
    <text x="62" y="83" font-size="11" fill="currentColor" opacity="0.62">HTTP · DNS · SSH · gRPC</text>
    <rect x="476" y="58" width="76" height="22" rx="11" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="514" y="73" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Data</text>
  </g>
  <g>
    <rect x="16" y="102" width="544" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="24" y="114" width="26" height="26" rx="7" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="37" y="132" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">6</text>
    <text x="62" y="124" font-size="13.5" font-weight="700" fill="currentColor">Presentation — Trình bày</text>
    <text x="62" y="141" font-size="11" fill="currentColor" opacity="0.62">TLS · gzip · UTF-8 · JSON · Base64</text>
    <rect x="476" y="116" width="76" height="22" rx="11" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="514" y="131" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Data</text>
  </g>
  <g>
    <rect x="16" y="160" width="544" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="24" y="172" width="26" height="26" rx="7" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="37" y="190" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">5</text>
    <text x="62" y="182" font-size="13.5" font-weight="700" fill="currentColor">Session — Phiên</text>
    <text x="62" y="199" font-size="11" fill="currentColor" opacity="0.62">cookie · TLS resumption · WebSocket</text>
    <rect x="476" y="174" width="76" height="22" rx="11" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="514" y="189" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Data</text>
  </g>
  <g>
    <rect x="16" y="218" width="544" height="50" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="24" y="230" width="26" height="26" rx="7" fill="#10b981" fill-opacity="0.95"/>
    <text x="37" y="248" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">4</text>
    <text x="62" y="240" font-size="13.5" font-weight="700" fill="currentColor">Transport — Vận chuyển</text>
    <text x="62" y="257" font-size="11" fill="currentColor" opacity="0.62">TCP · UDP · QUIC · port</text>
    <rect x="470" y="232" width="82" height="22" rx="11" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="511" y="247" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Segment</text>
  </g>
  <g>
    <rect x="16" y="276" width="544" height="50" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="24" y="288" width="26" height="26" rx="7" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="37" y="306" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">3</text>
    <text x="62" y="298" font-size="13.5" font-weight="700" fill="currentColor">Network — Mạng</text>
    <text x="62" y="315" font-size="11" fill="currentColor" opacity="0.62">IP · ICMP · NAT · router</text>
    <rect x="476" y="290" width="76" height="22" rx="11" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="514" y="305" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Packet</text>
  </g>
  <g>
    <rect x="16" y="334" width="544" height="50" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="24" y="346" width="26" height="26" rx="7" fill="#8b5cf6" fill-opacity="0.95"/>
    <text x="37" y="364" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">2</text>
    <text x="62" y="356" font-size="13.5" font-weight="700" fill="currentColor">Data Link — Liên kết</text>
    <text x="62" y="373" font-size="11" fill="currentColor" opacity="0.62">Ethernet · MAC · switch · ARP</text>
    <rect x="476" y="348" width="76" height="22" rx="11" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="514" y="363" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Frame</text>
  </g>
  <g>
    <rect x="16" y="392" width="544" height="50" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <rect x="24" y="404" width="26" height="26" rx="7" fill="#8b5cf6" fill-opacity="0.95"/>
    <text x="37" y="422" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">1</text>
    <text x="62" y="414" font-size="13.5" font-weight="700" fill="currentColor">Physical — Vật lý</text>
    <text x="62" y="431" font-size="11" fill="currentColor" opacity="0.62">cáp · sóng · NIC · hub</text>
    <rect x="476" y="406" width="76" height="22" rx="11" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="514" y="421" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Bit</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.35" fill="none">
    <path d="M576 46 h10 v160 h-10"/>
    <path d="M576 220 h10 v46 h-10"/>
    <path d="M576 278 h10 v46 h-10"/>
    <path d="M576 336 h10 v104 h-10"/>
  </g>
  <g font-size="11" fill="currentColor" opacity="0.8">
    <text x="592" y="130">Application</text>
    <text x="592" y="247">Transport</text>
    <text x="592" y="305">Internet</text>
    <text x="592" y="392">Link</text>
  </g>
</svg>

| # | Tầng (EN) | Tên Việt | PDU* | Nhiệm vụ một câu | Ví dụ giao thức / thiết bị |
|---|---|---|---|---|---|
| 7 | Application | Ứng dụng | Data | Giao thức mà app dùng trực tiếp | HTTP, DNS, SMTP, SSH, gRPC |
| 6 | Presentation | Trình bày | Data | Mã hoá, nén, định dạng/serialize dữ liệu | TLS, gzip/br, JSON, UTF-8, Base64 |
| 5 | Session | Phiên | Data | Thiết lập/duy trì/đóng phiên giữa hai bên | cookie/session, TLS resumption, RPC |
| 4 | Transport | Vận chuyển | Segment (TCP) / Datagram (UDP) | Đưa dữ liệu **đúng tiến trình**, tin cậy hay không | TCP, UDP, QUIC; **port** |
| 3 | Network | Mạng | Packet | Định tuyến gói **giữa các mạng** theo địa chỉ IP | IP, ICMP, NAT; **router** |
| 2 | Data Link | Liên kết dữ liệu | Frame | Truyền frame **trong một mạng LAN** theo địa chỉ MAC | Ethernet, ARP, Wi-Fi; **switch** |
| 1 | Physical | Vật lý | Bit | Biến bit thành tín hiệu trên môi trường truyền | cáp đồng/quang, sóng radio; **hub**, NIC |

*PDU = Protocol Data Unit, "đơn vị dữ liệu" của tầng đó (sẽ rõ ở mục 4).

Hai mẹo nhớ thứ tự kinh điển (từ 7 xuống 1): **A**ll **P**eople **S**eem **T**o **N**eed **D**ata **P**rocessing → Application, Presentation, Session, Transport, Network, Data link, Physical. Hoặc từ dưới lên (1→7): **P**lease **D**o **N**ot **T**hrow **S**ausage **P**izza **A**way.

> 💡 **Ghi nhớ:** Hai cặp số phải thuộc lòng vì gặp suốt trong đời thực: **L3 = IP (router)**, **L4 = TCP/UDP + port**, **L7 = HTTP**. "L4 vs L7 load balancer" hay "tấn công L3/L4 vs L7" đều quy về bảng này.

## 3. Mô hình TCP/IP — cái thế giới thật sự chạy

OSI là mô hình **để học và để nói chuyện**. Thứ Internet thật sự chạy là **TCP/IP**, gọn hơn — chỉ 4 tầng (đôi khi vẽ 5). TCP/IP gộp ba tầng trên cùng của OSI làm một, vì trong thực tế HTTP, TLS, JSON... thường do **cùng một ứng dụng** xử lý:

| OSI (7 tầng) | TCP/IP (4 tầng) | Ví dụ |
|---|---|---|
| 7 Application + 6 Presentation + 5 Session | **Application** | HTTP, TLS, DNS, JSON |
| 4 Transport | **Transport** | TCP, UDP, QUIC |
| 3 Network | **Internet** | IP, ICMP |
| 2 Data Link + 1 Physical | **Link** (Network Access) | Ethernet, Wi-Fi |

Vậy học OSI để làm gì nếu thật ra chạy TCP/IP? Vì **từ vựng** chung của cả ngành vẫn theo OSI: người ta nói "L7 firewall", "L2 switch", "vấn đề tầng 4" — và bạn cần dịch ngay ra ý nghĩa. OSI cho bạn cái thước đo chi tiết; TCP/IP cho bạn cái mô hình vận hành.

> 💡 **Ghi nhớ:** OSI = bản đồ chi tiết để mô tả/định vị. TCP/IP = mô hình thực thi (gộp L5–L7 thành "Application"). Khi nghe "tầng application" trong thực tế, hiểu là gộp cả phiên + mã hoá + giao thức app.

## 4. Encapsulation — đóng gói qua từng tầng

Dữ liệu **không** được gửi trần. Mỗi khi đi **xuống** một tầng, nó được bọc thêm một lớp **header** (và ở tầng 2 có cả "đuôi" — trailer) của tầng đó — gọi là **encapsulation** (đóng gói). Ở đầu nhận, quá trình ngược lại — **decapsulation** — bóc dần từng lớp đi lên. Giống lá thư (data) bỏ vào phong bì có địa chỉ (header IP), phong bì cho vào bao của hãng vận chuyển (header Ethernet)...

```text
Bên GỬI — đi xuống, bọc thêm header mỗi tầng:

  L7  [        HTTP data          ]                  → "Data"
  L4  [ TCP hdr | HTTP data       ]                  → "Segment"
  L3  [ IP hdr | TCP hdr | data   ]                  → "Packet"
  L2  [ Eth hdr | IP | TCP | data | Eth trailer ]    → "Frame"
  L1  101000110101...  (bit lên dây)                 → "Bits"

Bên NHẬN — đi lên, bóc dần từng header (decapsulation).
```

Để ý cái tên PDU đổi theo tầng: **Data → Segment (L4) → Packet (L3) → Frame (L2) → Bits (L1)**. Khi ai đó nói "drop packet" họ ngụ ý tầng 3; "frame lỗi CRC" là tầng 2; "segment retransmit" là tầng 4. Dùng đúng từ giúp bạn (và đồng nghiệp) biết ngay đang nói về tầng nào.

Một header không vô hạn: tầng 2 Ethernet giới hạn payload ~**1500 byte** (MTU). Gói IP lớn hơn MTU phải **phân mảnh** (fragmentation) hoặc bị từ chối — đây là gốc của những lỗi "ping nhỏ thì được, tải file lớn thì treo" (MTU/MSS mismatch, hay gặp trong VPN/tunnel).

> 💡 **Ghi nhớ:** Đi xuống = bọc header; đi lên = bóc header. Tên gói đổi theo tầng (Segment/Packet/Frame). Dùng đúng tên = nói đúng tầng.

## 5. Tầng 1 & 2 — phần nền ít ai dạy

Đa số tài liệu nhảy thẳng vào IP/TCP và bỏ qua hai tầng dưới cùng. Nhưng rất nhiều sự cố "mạng chập chờn" lại nằm ở đây.

### 5.1 Tầng 1 — Physical: bit thành tín hiệu

Tầng vật lý chỉ lo **một việc**: biến số 0/1 thành tín hiệu vật lý và đẩy qua môi trường — điện áp trên **cáp đồng**, xung ánh sáng trong **cáp quang**, hoặc **sóng radio** (Wi-Fi). Nó không hiểu địa chỉ, không hiểu gói; chỉ có bit và tín hiệu.

Thiết bị thuần tầng 1 là **hub** (đã lỗi thời): nhận tín hiệu ở một cổng rồi **phát lại ra mọi cổng** một cách mù quáng. Vì thế mọi lỗi "mạng" cơ bản nhất đều ở đây: cáp lỏng, đứt sợi quang, nhiễu điện từ, sai chuẩn cáp. Khi `ping` còn không ra được gateway, hãy nghi tầng 1 trước tiên (`ip link` thấy `state DOWN`, hoặc `ethtool` báo "Link detected: no").

### 5.2 Tầng 2 — Data Link: MAC, frame, switch

Tầng 2 đưa dữ liệu đi **trong một mạng cục bộ (LAN)**, định danh máy bằng **địa chỉ MAC**.

- **MAC address**: số 48-bit gắn cứng vào card mạng (NIC), viết kiểu `a4:83:e7:1c:9b:02`. 24 bit đầu là **OUI** — mã nhà sản xuất. Khác IP (gán mềm, đổi theo mạng), MAC gần như cố định theo phần cứng.
- **Frame**: PDU tầng 2 — gồm MAC nguồn, MAC đích, payload, và **FCS/CRC** ở đuôi để phát hiện frame hỏng.
- **Switch**: thiết bị tầng 2. Nó **học** bằng cách nhìn MAC nguồn của frame đi vào từng cổng, xây một **MAC address table** (MAC ↔ cổng), rồi chỉ chuyển frame **đúng cổng** của máy đích (khác hub phát ra mọi cổng). Frame tới một MAC chưa biết hoặc địa chỉ broadcast (`ff:ff:ff:ff:ff:ff`) thì switch mới phát ra mọi cổng.

### 5.3 ARP — chiếc cầu nối tầng 3 ↔ tầng 2

Đây là mảnh ghép hay bị thiếu nhất. Ứng dụng biết **IP** của máy đích, nhưng để gửi frame trong LAN thì cần **MAC**. Ai dịch IP → MAC? Đó là **ARP** (Address Resolution Protocol):

```text
Máy A muốn gửi cho 192.168.1.20 nhưng chưa biết MAC của nó:

A → (broadcast cả LAN): "Ai là 192.168.1.20? Cho tôi xin MAC!"   (ARP request)
B → (trả riêng cho A):  "192.168.1.20 là a4:83:e7:1c:9b:02"       (ARP reply)

A lưu cặp (IP → MAC) vào ARP cache để lần sau khỏi hỏi lại.
```

Xem ARP cache trên máy bạn:

```bash
ip neigh            # Linux: bảng IP ↔ MAC ↔ cổng
arp -a              # macOS/Linux: cách cũ, tương đương
```

### 5.4 Collision domain, broadcast domain & VLAN

- **Collision domain**: vùng mà hai máy gửi cùng lúc sẽ đụng tín hiệu. Hub gộp tất cả vào **một** collision domain (chậm, đụng độ nhiều); switch tách **mỗi cổng một** collision domain (gần như hết đụng độ) — đây là lý do switch thay thế hub.
- **Broadcast domain**: vùng mà một gói broadcast (như ARP request) lan tới được. Mặc định **một switch = một broadcast domain**: ARP của ai cũng làm phiền cả LAN. LAN càng lớn, "bão broadcast" càng tốn.
- **VLAN** (Virtual LAN): chia một switch vật lý thành nhiều broadcast domain **logic**. Máy ở VLAN 10 và VLAN 20 dù cắm chung switch vẫn không thấy broadcast của nhau — muốn liên lạc phải đi qua **router** (tầng 3). Đây là nền của việc cô lập mạng (vd tách subnet "web" khỏi "database").

> 💡 **Ghi nhớ:** **Switch (L2) chuyển theo MAC trong LAN; router (L3) định tuyến theo IP giữa các mạng.** ARP là cầu nối IP→MAC. VLAN cắt một switch thành nhiều broadcast domain để cô lập.

> ⚠️ **Lỗi thường gặp:** "Ping được IP này nhưng không ping được IP kia cùng dải" thường là **ARP cache cũ** hoặc **trùng IP** (hai máy cùng IP, ARP trả về MAC chập chờn). Xoá entry ARP (`ip neigh flush`) trước khi đổ lỗi cho tầng cao hơn. Còn "cả LAN chậm đột ngột" có thể là **broadcast storm** do vòng lặp tầng 2 (cần Spanning Tree Protocol chặn loop).

## 6. Tầng 3 & 4 — định vị nhanh (đã có bài sâu)

Hai tầng này là trái tim của Internet, và chương Mạng có hẳn bài riêng cho từng tầng — ở đây chỉ cần đặt chúng đúng chỗ trên bản đồ.

- **Tầng 3 — Network (IP):** đưa gói **giữa các mạng khác nhau** bằng địa chỉ IP. Router đọc IP đích, tra **routing table** theo **longest-prefix match**, chuyển gói sang chặng kế. Kèm theo: ICMP (`ping`/`traceroute`), NAT (private ↔ public). Toàn bộ chuyện địa chỉ/subnet/CIDR học kỹ ở [[eng-02-cidr-subnetting]]; trực giác IP/DNS/NAT ở [[intro-02-networking]].
- **Tầng 4 — Transport (TCP/UDP):** đưa dữ liệu tới **đúng tiến trình** qua **port**, và quyết định "tin cậy hay không". TCP = bắt tay 3 bước, có thứ tự, truyền lại; UDP = bắn-và-quên; QUIC = tin cậy xây trên UDP. Handshake, RTT, TLS, HTTP/1.1→3 học kỹ ở [[eng-03-tcp-tls]].

Cặp khác biệt đáng nhớ nhất giữa hai tầng: **L3 chọn *đường* (máy nào tới máy nào), L4 chọn *cửa* (chương trình nào trên máy đó)**. Một gói lạc tầng 3 thì "không tới được host"; lạc tầng 4 thì "tới host nhưng nhầm/đóng port".

> 💡 **Ghi nhớ:** L3 = IP, định tuyến **giữa** mạng (router). L4 = TCP/UDP + port, giao **đúng tiến trình** trên host. "Connection refused" = tới được L3 nhưng L4 đóng port; "no route to host"/timeout = nghẽn ngay ở L3.

## 7. Tầng 5–7 — vì sao thực tế gộp làm một "Application"

Ba tầng trên cùng hiếm khi tách bạch trong code thật, nhưng tách bạch về mặt khái niệm giúp bạn debug đúng chỗ:

- **Tầng 5 — Session (phiên):** thiết lập, duy trì, đóng một "cuộc nói chuyện" có trạng thái giữa hai bên. Ví dụ đời thực: **cookie/session** giữ bạn đăng nhập qua nhiều request; **TLS session resumption** (và **0-RTT**) tái dùng phiên cũ để khỏi bắt tay lại; **connection ID** của QUIC giữ phiên sống dù bạn đổi mạng (Wi-Fi → 4G); một **WebSocket** mở là một phiên dài.
- **Tầng 6 — Presentation (trình bày):** lo **dạng** của dữ liệu — không phải nội dung. Gồm **mã hoá** (TLS biến plaintext thành ciphertext), **nén** (gzip/brotli), **bảng mã** (UTF-8), và **serialize** (JSON, Protobuf, Base64). Lỗi tầng 6 trông như "ô vuông/ký tự lạ" (sai charset) hay "giải mã thất bại" (lệch cipher).
- **Tầng 7 — Application (ứng dụng):** giao thức mà app nói trực tiếp: **HTTP**, **DNS**, **SMTP**, **SSH**, **gRPC**. Đây là tầng người dùng "thấy".

Vì sao gộp? Một thư viện HTTP client điển hình tự lo cả ba: nó mở phiên (5), thương lượng nén + TLS (6), rồi gửi HTTP request (7) — bạn chỉ gọi một hàm. Nên mô hình TCP/IP gọi chung là **Application**. Nhưng khi debug, hãy tự hỏi *tầng nào trong ba*: "trang trắng" có thể là phiên rớt (5), nội dung lỗi giải nén/charset (6), hay status `500` từ app (7).

> 💡 **Ghi nhớ:** L5 = *phiên* (cookie, TLS resumption, WebSocket). L6 = *dạng* (mã hoá, nén, charset, serialize). L7 = *giao thức app* (HTTP/DNS/SSH). Thực thi gộp lại, nhưng định vị lỗi thì tách ra.

## 8. Bản đồ xuyên tầng #1 — Caching ở mỗi tầng

"Vì sao dữ liệu vẫn cũ sau khi tôi đã sửa?" là một trong những câu hỏi khó nhất, vì **cache nằm rải ở rất nhiều tầng** — xoá nhầm tầng thì vẫn thấy bản cũ. Bản đồ từ gần người dùng xuống hạ tầng:

| Tầng/vị trí | Cache gì | Điều khiển bằng | Khi nào "cũ" |
|---|---|---|---|
| L7 — trình duyệt | Bản sao HTTP response, ảnh, JS/CSS | `Cache-Control`, `ETag`/`If-None-Match` → `304`, `stale-while-revalidate` | Đặt `max-age` quá dài, quên đổi tên file build |
| L7 — CDN/edge | Nội dung tĩnh (và đôi khi cả API) tại edge | TTL của CDN + **invalidation** | TTL chưa hết mà nội dung đã đổi → phải invalidate |
| L7 — DNS | Bản ghi tên → IP | **TTL** của record | Đổi IP nhưng client còn giữ bản ghi cũ tới hết TTL |
| L7/App — object cache | Kết quả truy vấn, session, tính toán nặng (Redis/Memcached) | Chiến lược cache-aside / write-through + TTL | Quên xoá key khi update → xem [[be-03-caching]] |
| App — DB cache | Buffer pool, query cache, DAX cho DynamoDB | Tự DB / write-through | Hiếm khi "cũ", nhưng DAX write-through cần hiểu |
| L2/L3 — hệ điều hành | **ARP cache** (IP→MAC), route cache, page cache | tự OS, có timeout | ARP cũ sau khi đổi NIC/IP (mục 5.3) |
| Phần cứng | CPU cache (L1/L2/L3) | tự CPU | Không liên quan "data cũ" web — xem [[cs-02-architecture-memory]] |

Quy trình tư duy khi gặp "data cũ": đi **từ gần người dùng xuống** — thử ẩn danh/`Ctrl+F5` (bỏ cache trình duyệt) → kiểm tra header CDN (`x-cache: HIT`) và invalidate → kiểm tra TTL DNS → cuối cùng mới tới object/DB cache. Mỗi bước loại trừ một tầng.

> 💡 **Ghi nhớ:** Cache tồn tại ở **nhiều** tầng cùng lúc (browser → CDN → DNS → app/Redis → DB). "Data cũ" = xác định **đúng tầng** đang giữ bản cũ rồi mới xoá; xoá sai tầng là công cốc. `ETag`+`304` là cache tầng HTTP rẻ nhất mà hay bị bỏ quên.

## 9. Bản đồ xuyên tầng #2 — Bảo mật & tấn công theo tầng

Mỗi tầng có lớp tấn công riêng và lớp phòng thủ riêng — đó chính là tinh thần **defense in depth**: không tầng nào là tường thành duy nhất. Bảng "tấn công ↔ phòng thủ" theo tầng:

| Tầng | Tấn công điển hình | Phòng thủ | Đối chiếu AWS |
|---|---|---|---|
| L1 Physical | Nghe lén/cắt cáp, tapping | An ninh vật lý, mã hoá đầu-cuối | Trách nhiệm của AWS (data center) |
| L2 Data Link | ARP spoofing, MAC flooding, VLAN hopping | Port security, Dynamic ARP Inspection, 802.1X, tách VLAN | Cô lập tại hạ tầng VPC |
| L3 Network | IP spoofing, ICMP/ping flood, route hijack | Anti-spoofing, **NACL**, lọc ICMP, **Shield** (DDoS) | NACL, AWS Shield |
| L4 Transport | **SYN flood**, port scan, UDP amplification | Firewall **stateful**, SYN cookies, rate-limit, Shield | **Security Group**, Shield |
| L5/6 Session/Presentation | TLS downgrade, cipher yếu, session hijack/fixation | **TLS 1.3**, HSTS, cookie `Secure`/`HttpOnly`/`SameSite`, xoay session khi đăng nhập | ACM (cert), chính sách TLS của ALB/CloudFront |
| L7 Application | **SQLi, XSS, CSRF**, DDoS tầng ứng dụng, bot, credential stuffing | Validate input, parameterized query, output encoding, **WAF**, rate-limit | **AWS WAF** trước ALB/CloudFront/API GW |

Hai điểm cốt lõi:

1. **WAF không thay được Security Group, và ngược lại.** WAF đọc *nội dung HTTP* (L7) nên chặn được SQLi/XSS nhưng **không** chặn nổi DDoS thể tích L3/L4; còn Security Group lọc IP/port (L3/L4) nhưng **mù** với nội dung HTTP. Xếp chồng cả hai mới là defense in depth. (Chi tiết: [[sec-02-owasp-top10-1]] cho L7, và bài Network Security của khoá SAA cho L3–L7.)
2. **Mỗi lớp giả định lớp ngoài đã thủng.** Cứ cho WAF bị né — thì parameterized query trong code (L7) vẫn chặn SQLi; cứ cho ai đó vào được LAN — thì TLS (L6) vẫn khiến họ chỉ thấy nhiễu.

> 💡 **Ghi nhớ:** Bản đồ phòng thủ: **L3/L4 = SG + NACL + Shield** (lọc IP/port, chống DDoS thể tích) **+ L7 = WAF + code an toàn** (chống SQLi/XSS). Tấn công đến từ tầng nào thì phòng thủ phải có mặt ở **đúng tầng đó** — không lớp đơn lẻ nào đủ.

## 10. Bản đồ xuyên tầng #3 — Debug & performance theo tầng

Tấm bản đồ giá trị nhất khi có sự cố: **mỗi tầng có công cụ chẩn đoán riêng**, và quy tắc là đi **từ dưới lên** — tầng nào hỏng thì dừng ngay ở đó, đừng nhảy cóc.

| Tầng | Câu hỏi cần trả lời | Công cụ | Tín hiệu hỏng |
|---|---|---|---|
| L1 Physical | Dây/link có sống? | `ip link`, `ethtool` | `state DOWN`, "Link detected: no" |
| L2 Data Link | Có thấy MAC của gateway? | `ip neigh`, `arp -a` | entry `FAILED`/`INCOMPLETE` |
| L3 Network | Định tuyến tới đích được không? | `ping`, `traceroute`, `ip route` | timeout, "no route to host", dừng giữa chừng |
| L4 Transport | Port có mở, có nghe? | `nc -zv host port`, `ss -tn` | "connection refused"/timeout |
| L7 App (+DNS/TLS) | Tên phân giải? cert ổn? app trả gì? | `dig`, `curl -v`, `openssl s_client` | NXDOMAIN, cert lỗi, HTTP `5xx` |

Đây chính là quy trình debug HTTPS ở [[eng-03-tcp-tls]] nhưng nhìn qua lăng kính 7 tầng: **DNS/TLS/HTTP (L7) → port (L4) → route (L3) → ARP (L2) → link (L1)**. 90% thời gian debug bị phí vì đoán mò sai tầng — bản đồ này loại trừ tuần tự.

Về **performance**, tổng độ trễ một request là tổng đóng góp của từng tầng — biết tầng nào "ăn" thời gian thì biết tối ưu ở đâu:

| Tầng | Đóng góp latency | Giảm bằng |
|---|---|---|
| L1 | Propagation (tốc độ ánh sáng × khoảng cách) | Đặt server **gần** người dùng (region/edge) |
| L2 | Switching trong LAN (rất nhỏ) | hiếm khi là nút thắt |
| L3 | Số chặng router × RTT mỗi chặng | đường đi ngắn hơn, anycast/backbone |
| L4 | TCP handshake (1 RTT) | keep-alive, connection pool, QUIC (0-RTT) |
| L6 | TLS handshake (1 RTT) | TLS 1.3, session resumption, HTTP/3 |
| L7 | Xử lý app + truy vấn DB | cache (mục 8), tối ưu query, CDN |

> 💡 **Ghi nhớ:** Debug đi **từ dưới lên** (link → ARP → route → port → app), dừng ở tầng đầu tiên fail. Latency là **tổng** theo tầng: khoảng cách (L1/L3) và số lần bắt tay (L4/L6) thường là thủ phạm lớn nhất — nên "lại gần + bớt round-trip" hiệu quả hơn "mua thêm băng thông".

## 11. Ví dụ tổng hợp — gõ `https://shop.example.com` đến khi thấy trang

Ghép tất cả lại bằng một hành trình thật, chú thích tầng nào làm gì:

```text
1. DNS (L7): trình duyệt hỏi resolver "shop.example.com là IP nào?"
   → có thể trả ngay từ DNS cache (TTL chưa hết).
2. ARP (L2): biết IP gateway rồi nhưng cần MAC → hỏi ARP (hoặc lấy từ ARP cache).
3. TCP (L4): bắt tay 3 bước (SYN/SYN-ACK/ACK) tới cổng 443 — 1 RTT.
4. TLS (L6): bắt tay TLS 1.3, kiểm cert, thống nhất khoá phiên — 1 RTT (hoặc 0-RTT nếu resume phiên L5).
5. HTTP (L7): gửi "GET / HTTP/2", server trả response (có thể từ CDN edge cache).
6. Mỗi gói thực ra: HTTP bọc trong TCP (L4) bọc trong IP (L3) bọc trong frame Ethernet (L2)
   → router (L3) chuyển giữa các mạng, switch (L2) chuyển trong từng LAN, bit chạy trên dây (L1).
7. Trình duyệt nhận HTML, dựng trang; ảnh/CSS/JS có thể lấy từ cache trình duyệt (L7).
```

Mỗi bước trên ánh xạ về đúng một tầng — và mỗi tầng có **cache** (bước 1, 2, 5, 7) lẫn **điểm có thể fail/bị tấn công** (DNS sai, ARP spoof, port chặn, cert lỗi). Đây là lý do "tấm bản đồ 7 tầng" đáng để thuộc: nó cho bạn một danh sách kiểm tra có thứ tự cho **mọi** sự cố mạng.

## 12. Liên hệ sang AWS — theo tầng

Mỗi tầng có "hoá thân" dịch vụ trên AWS; nhìn theo tầng giúp bạn chọn đúng công cụ trong đề thi và thực tế:

| Tầng | Khái niệm | Dịch vụ / tính năng AWS |
|---|---|---|
| L2 | Mạng LAN ảo, NIC | Subnet trong VPC, **ENI** (Elastic Network Interface) |
| L3 | Định tuyến IP, NAT | **VPC route table**, Internet Gateway, **NAT Gateway**, VPC peering |
| L3/L4 | Firewall theo IP/port | **Security Group** (stateful), **NACL** (stateless) |
| L4 | Load balancer TCP/UDP | **NLB** (Network Load Balancer), IP tĩnh, hiệu năng cao |
| L4–L7 | Chống DDoS | **AWS Shield** (Standard/Advanced) |
| L6 | Chứng chỉ/mã hoá TLS | **ACM** (cert miễn phí, auto-renew), chính sách TLS |
| L7 | Load balancer HTTP, CDN, WAF, DNS | **ALB**, **CloudFront**, **AWS WAF**, **Route 53** |

"Dịch ngược" khi đọc đề: thấy *NLB* → nghĩ "L4, TCP/UDP, IP tĩnh"; thấy *ALB/WAF* → "L7, đọc được HTTP"; thấy *Security Group* → "firewall stateful L3/L4"; thấy *CloudFront* → "cache + TLS tại edge (L6/L7)".

## Tóm tắt

- **Phân tầng** = mỗi tầng một việc, "hợp đồng" rõ giữa các tầng → thay/debug một tầng không phá phần còn lại.
- **OSI 7 tầng** (nhớ 1→7: *Please Do Not Throw Sausage Pizza Away*): **L1** vật lý, **L2** Ethernet/MAC/switch/ARP, **L3** IP/router, **L4** TCP-UDP/port, **L5** phiên, **L6** mã hoá/nén/định dạng, **L7** HTTP/DNS. TCP/IP gộp L5–L7 thành "Application".
- **Encapsulation**: đi xuống bọc header (Data→Segment→Packet→Frame→Bits), đi lên bóc ra.
- **L1/L2** (phần nền): switch chuyển theo MAC trong LAN, router theo IP giữa mạng; **ARP** dịch IP→MAC; **VLAN** cắt broadcast domain.
- **Ba bản đồ xuyên tầng**: **caching** ở mọi tầng (browser→CDN→DNS→app/Redis→DB→ARP); **bảo mật** defense-in-depth (L3/L4 = SG/NACL/Shield + L7 = WAF/code); **debug** từ dưới lên + latency là tổng theo tầng.
- Khi có sự cố, hỏi **"vấn đề này ở tầng nào?"** — đó là giá trị lớn nhất của tấm bản đồ.

## Bảng tra nhanh (in ra dán cạnh bàn)

| # | Tầng | PDU | Thiết bị/giao thức | Công cụ debug | Tấn công điển hình |
|---|---|---|---|---|---|
| 7 | Application | Data | HTTP, DNS, SSH | `curl -v`, `dig` | SQLi, XSS, DDoS-L7 |
| 6 | Presentation | Data | TLS, gzip, UTF-8 | `openssl s_client` | TLS downgrade, cipher yếu |
| 5 | Session | Data | cookie, TLS resume | (logs app) | session hijack |
| 4 | Transport | Segment | TCP, UDP, port | `nc`, `ss` | SYN flood, port scan |
| 3 | Network | Packet | IP, ICMP, router | `ping`, `traceroute` | IP spoof, ICMP flood |
| 2 | Data Link | Frame | Ethernet, MAC, switch, ARP | `ip neigh` | ARP spoof, MAC flood |
| 1 | Physical | Bit | cáp, sóng, NIC, hub | `ip link`, `ethtool` | cắt cáp, tapping |
