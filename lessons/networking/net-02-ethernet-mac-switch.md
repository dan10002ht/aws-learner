# Bài 2 — Ethernet, MAC và switch học địa chỉ

## 1. Mục tiêu

Sau bài này bạn có thể:

- Dự đoán cổng ra của một frame từ MAC nguồn, MAC đích, cổng vào và trạng thái bảng chuyển tiếp.
- Chứng minh switch học từ địa chỉ nguồn bằng cách chụp bảng trước và sau từng frame, không dựa vào việc máy đích có trả lời IP hay không.
- Phân biệt unknown unicast với broadcast bằng byte MAC đích, dù cả hai có thể xuất hiện trên cùng tập cổng.
- Tách “frame đã ra cổng” khỏi “ứng dụng trên máy nối cổng đã nhận”, để không diễn giải quá mức kết quả tcpdump.
- Tái hiện MAC đổi cổng, xoá entry và hết hạn entry; dự đoán frame sau đó sẽ đi đâu.
- Đọc đúng độ dài Ethernet trong pcap veth và chỉ ra phần khác với frame trên Ethernet vật lý.

## 2. Triệu chứng

Bạn đặt ba máy lab A, B, C sau cùng một switch. A chỉ gửi một frame tới MAC của B. Tcpdump ở cổng nối C vẫn thấy frame đó, dù MAC đích **không phải** C và cũng **không phải** `ff:ff:ff:ff:ff:ff`. Sau khi B gửi một frame, A gửi lại: cổng C không còn thấy nữa.

Nếu bạn đang tìm một lỗi rò traffic, rất dễ chốt “switch đang biến unicast thành broadcast”. Một lần khác, cùng địa chỉ B lại nhận traffic qua cổng C sau một frame có nguồn B đi vào từ C. Không đổi IP, không đổi route, không có DNS; chỉ bảng MAC đổi.

> **Đo trên lab.** Linux 6.8.0-64-generic aarch64 trong Docker/colima, Alpine 3.20.10, bridge utility 6.9.0, tcpdump 4.99.4. Linux bridge `net02-br` nối ba cổng `net02-pa`, `net02-pb`, `net02-pc`. Frame E1 A→B xuất hiện trên cả ba capture cổng; E3 A→B chỉ trên pa và pb. Trong hai phép này pa là quan sát chiều vào, pb/pc là quan sát chiều ra. Log: `out/summary.txt`, `out/events.txt`; đo lại bằng `./run.sh` trong thư mục lab `net-02`.

**Linux bridge** là cơ chế chuyển tiếp frame Ethernet giữa các interface của Linux, có bảng học địa chỉ tương tự một switch Ethernet. Ta dùng nó để nhìn và điều khiển trạng thái, không khẳng định mọi switch phần cứng có cùng giới hạn hay tốc độ với phần mềm này. Lab không gán IP cho A/B/C, tắt IPv6 tự phát và gửi frame có EtherType `0x88b5`; nhờ vậy không có ARP hay TCP tự chạy thay ta học MAC.

## ⏸ Dừng lại — đoán trước #1

Bảng học địa chỉ đang trống. Frame từ A đi vào pa, có MAC nguồn A và MAC đích B. Chọn điều switch có đủ bằng chứng để làm ngay:

(a) Ghi B ở pa, vì B là đích của frame vừa nhận.
(b) Ghi A ở pa, rồi tìm B trong bảng; chưa có B thì nhân bản frame ra những cổng đủ điều kiện còn lại.
(c) Phải phát một truy vấn ARP mới chuyển tiếp được.
(d) Ghi cả A và B ở pa để lần sau không cần tìm nữa.

## 3. Cơ chế

### 3.1 Một frame nói gì, và không nói gì?

Đáp án là **(b)**. Một frame tới từ pa chứng minh rằng **đường đi tới MAC nguồn vừa xuất hiện nằm qua pa**. Nó không chứng minh MAC đích nằm cùng phía. Nếu thấy phong bì A gửi B, điều quan sát được là A ở phía người vừa đưa phong bì; địa chỉ B trên phong bì không biến phía đó thành chỗ ở của B.

Trước khi theo bảng, nhìn lại vật được chuyển tiếp. **MAC — Media Access Control address — là địa chỉ tầng liên kết dùng trong header Ethernet.** Header Ethernet không gắn VLAN trong lab có MAC đích, MAC nguồn, rồi EtherType chỉ loại payload; nó không có trường IP hay port. [Bài 1](net-01-boc-request-tcpdump.md) đã dùng ranh giới này để bóc HTTP. Ở đây payload chỉ là mã sự kiện và byte đệm, đủ để nhận ra bản sao cùng frame trên từng cổng.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 235" role="img" aria-labelledby="net02-a-t net02-a-d" style="width:100%;max-width:500px;height:auto;display:block;margin:1.25rem auto">
<title id="net02-a-t">Các trường của frame lab Ethernet</title>
<desc id="net02-a-d">Header phóng to có tỉ lệ 6:6:2, thanh frame đầy đủ có tỉ lệ 14:46. Payload là mã sự kiện và dấu chấm do script tạo.</desc>
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">Phóng to header: 6 + 6 + 2 = 14 byte</text>
<rect x="30" y="42" width="180" height="48" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="120.0" y="65" font-size="14" text-anchor="middle" fill="currentColor">MAC đích · 6</text>
<rect x="210" y="42" width="180" height="48" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="300.0" y="65" font-size="14" text-anchor="middle" fill="currentColor">MAC nguồn · 6</text>
<rect x="390" y="42" width="60" height="48" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="420.0" y="65" font-size="14" text-anchor="middle" fill="currentColor">Type</text>
<text x="420" y="82" font-size="13" text-anchor="middle" fill="currentColor">2</text>
<text x="20" y="130" font-size="15" text-anchor="start" fill="currentColor">Frame đã bắt: 60 byte</text>
<rect x="30" y="145" width="98" height="38" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="79" y="169" font-size="13" text-anchor="middle" fill="currentColor">header · 14</text>
<rect x="128" y="145" width="322" height="38" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="289" y="169" font-size="14" text-anchor="middle" fill="currentColor">payload · 46</text>
<text x="30" y="211" font-size="13" text-anchor="start" fill="currentColor">E1 + dấu chấm nằm trong payload; không có FCS.</text>
</svg>

> **Nguồn.** Header theo [Linux v6.8, `struct ethhdr`](https://raw.githubusercontent.com/torvalds/linux/v6.8/include/uapi/linux/if_ether.h): *“unsigned char h_dest[ETH_ALEN];”* rồi *“unsigned char h_source[ETH_ALEN];”*. `ETH_ALEN` là 6 byte, `ETH_HLEN` là 14 byte; phần EtherType chiếm 2 byte. Các kích thước trong hình dựa trên header này và 46 byte payload do `send.py` tạo.

Switch có thể quyết định cổng ra mà không giải mã HTTP, không biết IP của máy và không hỏi DNS. Trong lab, cả E1 lẫn E3 mang đích `02:00:00:02:00:0b`, nguồn `02:00:00:02:00:0a`; chúng khác mã sự kiện và trạng thái bảng lúc đi qua. Việc không mang IP là một đối chứng: giả thuyết “switch phải ARP trước mới biết cổng” không giải thích được các frame Ethernet thuần vẫn được chuyển tiếp.

**Unicast** là frame có địa chỉ đích chỉ một địa chỉ cá thể. **Broadcast** ở Ethernet dùng MAC đích toàn bit 1, viết là `ff:ff:ff:ff:ff:ff`, để gửi tới các đầu trong cùng miền broadcast. **Multicast** dùng địa chỉ nhóm; quy tắc chuyển tiếp nó có thể còn phụ thuộc bảng nhóm và snooping, nên không được gom mọi multicast vào quy tắc unicast của bài này. **Miền broadcast** là tập liên kết mà broadcast được bridge/switch chuyển tiếp trong phạm vi cấu hình của nó.

MAC không phải vị trí địa lý hay một danh tính được xác thực. Trong lab ta tự gán A=`02:00:00:02:00:0a`, B=`02:00:00:02:00:0b`, C=`02:00:00:02:00:0c`; frame thô còn có thể khai một địa chỉ nguồn khác MAC của interface. Bởi thế bảng học địa chỉ chỉ giữ quan sát “nguồn này vừa tới từ cổng đó”, không phải hồ sơ đảm bảo ai sở hữu thiết bị.

[Bài OSI](../engineering/eng-osi-model.md) đã định vị switch ở tầng liên kết; bài 4 sẽ dựng bridge/veth/VLAN bằng tay. Ở đây chỉ cần coi pa/pb/pc là ba cổng của cùng bridge.

### 3.2 Hai thao tác khác nhau: học nguồn, tra đích

**FDB — Forwarding Database — là bảng ánh xạ địa chỉ MAC sang cổng chuyển tiếp của bridge/switch.** Một entry động được học từ traffic và có thể hết hạn; entry tĩnh được cấu hình với quy tắc tồn tại riêng. Trên Linux lệnh `bridge fdb show` có cả entry phục vụ chính interface; chúng không đồng nghĩa với các địa chỉ đầu xa đã học. Lab lọc entry `self` và `permanent` khi in bảng sự kiện để chỉ nhìn các dòng động đang thử.

Với frame unicast thông thường trong lab, chuỗi nhân quả là: nhận frame trên cổng đang cho phép học/chuyển tiếp → cập nhật nguồn gắn cổng vào → tra MAC đích → chọn cổng hoặc flood. **Flood** nghĩa là tạo các bản sao để gửi ra những cổng đủ điều kiện khi chưa thể chọn một cổng duy nhất. Nó không đổi MAC đích thành broadcast. Ta đang xét cổng forwarding, không lọc VLAN, không port isolation, không ACL và không hairpin.

**Hairpin** là chế độ cho phép chuyển frame trở lại chính cổng mà nó đi vào; lab để chế độ này tắt. Nếu địa chỉ đích đã biết ở cùng cổng vào, chuyển tiếp unicast thông thường sẽ không gửi bản sao trở lại cổng đó. Đích có thể là một máy khác ở sau switch con nối cùng cổng: bảng lưu hướng đi, không đếm trực tiếp mỗi cổng chỉ có một máy.

Trong sơ đồ dưới, switch và ba máy không đổi vị trí. Phần bảng thay giá trị theo sự kiện; entry B chưa có ở bước đầu, chỉ xuất hiện sau frame **có nguồn B**. Mũi tên E1 ra cả B lẫn C giữ nguyên MAC đích B.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 410" role="img" aria-labelledby="net02-b-t net02-b-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="net02-b-t">Nguồn tạo entry; đích chọn cổng</title>
<desc id="net02-b-d">Một topology cố định với FDB thay đổi. B chưa có ở bước một rồi được thay bằng B qua pb. Các đường flood cũ biến mất ở bước sau.</desc>
<defs><marker id="net02-b-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="50" width="120" height="55" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="80" y="74" font-size="15" text-anchor="middle" fill="currentColor">A · ...:0a</text>
<text x="80" y="94" font-size="14" text-anchor="middle" fill="currentColor">cổng pa</text>
<rect x="265" y="115" width="125" height="65" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="327" y="142" font-size="15" text-anchor="middle" fill="currentColor">net02-br</text>
<text x="327" y="165" font-size="14" text-anchor="middle" fill="currentColor">FDB</text>
<rect x="500" y="50" width="120" height="55" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="560" y="74" font-size="15" text-anchor="middle" fill="currentColor">B · ...:0b</text>
<text x="560" y="94" font-size="14" text-anchor="middle" fill="currentColor">cổng pb</text>
<rect x="500" y="265" width="120" height="55" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="560" y="290" font-size="15" text-anchor="middle" fill="currentColor">C · ...:0c</text>
<text x="560" y="310" font-size="14" text-anchor="middle" fill="currentColor">cổng pc</text>
<line x1="140" y1="78" x2="265" y2="137" stroke="currentColor" stroke-opacity="0.25" stroke-width="2"/>
<line x1="390" y1="137" x2="500" y2="78" stroke="currentColor" stroke-opacity="0.25" stroke-width="2"/>
<line x1="390" y1="160" x2="500" y2="290" stroke="currentColor" stroke-opacity="0.25" stroke-width="2"/>
<rect x="25" y="250" width="365" height="130" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="42" y="275" font-size="14" text-anchor="start" fill="currentColor">Bảng động sau sự kiện</text>
<g data-step="1" data-until="1">
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">E1: A → B, B chưa có trong FDB</text>
<line x1="140" y1="78" x2="265" y2="137" stroke="currentColor" stroke-width="2" marker-end="url(#net02-b-arr)"/>
<line x1="390" y1="137" x2="500" y2="78" stroke="currentColor" stroke-width="2" marker-end="url(#net02-b-arr)"/>
<line x1="390" y1="160" x2="500" y2="290" stroke="currentColor" stroke-width="2" marker-end="url(#net02-b-arr)"/>
<text x="420" y="360" font-size="14" text-anchor="start" fill="currentColor">đích vẫn B</text>
<text x="42" y="332" font-size="15" text-anchor="start" fill="currentColor">B: chưa có</text>
</g>
<g data-step="1">
<text x="42" y="305" font-size="15" text-anchor="start" fill="currentColor">A → pa</text>
</g>
<g data-step="2">
<text x="42" y="332" font-size="15" text-anchor="start" fill="currentColor">B → pb</text>
</g>
<g data-step="2" data-until="2">
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">E2: B → A, học B từ pb</text>
<line x1="500" y1="78" x2="390" y2="137" stroke="currentColor" stroke-width="2" marker-end="url(#net02-b-arr)"/>
<line x1="265" y1="137" x2="140" y2="78" stroke="currentColor" stroke-width="2" marker-end="url(#net02-b-arr)"/>
</g>
<g data-step="3">
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">E3: A → B, chỉ ra pb</text>
<line x1="140" y1="78" x2="265" y2="137" stroke="currentColor" stroke-width="2" marker-end="url(#net02-b-arr)"/>
<line x1="390" y1="137" x2="500" y2="78" stroke="currentColor" stroke-width="2" marker-end="url(#net02-b-arr)"/>
</g>
</svg>
<step-note data-step="1">E1 học A từ pa nhưng không học vị trí B từ trường đích. B chưa biết nên có hai bản sao egress.</step-note>
<step-note data-step="2">E2 mang nguồn B đi vào pb: entry B xuất hiện. Đích A đã biết nên chỉ ra pa.</step-note>
<step-note data-step="3">E3 tra được B ở pb. Cổng pc không có bản sao, dù trường MAC đích vẫn như E1.</step-note>
</step-flow>

Theo `events.txt`, ban đầu bảng động trống. E1 đi vào pa có nguồn A, đích B. Bridge ghi A→pa. B chưa tồn tại nên bridge nhân bản ra pb và pc. Sau E1, bảng vẫn chưa có B: nhìn thấy chữ B ở trường đích không cho bridge thêm bằng chứng vị trí của B.

E2 do B gửi tới A đi vào pb. Bridge học B→pb, tra A đã biết ở pa, nên chỉ chuyển tiếp ra pa. E3 do A gửi tới B lại đi vào pa; B đã có nên chỉ ra pb. Như vậy một frame nguồn B giải quyết việc chọn cổng cho chiều **A→B** sau đó. Đó là cách traffic chiều ngược cập nhật trạng thái chuyển tiếp mà không cần thông điệp “đăng ký MAC” riêng trong thí nghiệm này.

> **Nguồn.** [Tài liệu bridge của Linux kernel](https://www.kernel.org/doc/html/latest/networking/bridge.html) mô tả learning, unicast flood và ageing. Câu về flood là *“Controls whether unicast traffic for which there is no FDB entry will be flooded towards this port.”* Đây là điều khiển theo **cổng ra**; không phải mọi cổng còn lại lúc nào cũng nhận mọi unknown unicast.

Vì cơ chế đã rõ, có thể cô đọng các trường hợp. Bảng chỉ áp cho unicast chuyển tiếp thông thường trong phạm vi lab; entry local cho chính bridge và multicast cần cách xử lý khác.

| Kết quả tra đích | Hành động chuyển tiếp | Thứ có thể học từ frame vừa vào |
|---|---|---|
| Chưa có đích | Flood tới các cổng ra đủ điều kiện | Nguồn→cổng vào |
| Có đích ở cổng khác | Gửi ra cổng đã tra được | Cập nhật nguồn→cổng vào |
| Có đích ở chính cổng vào, hairpin tắt | Không phản xạ frame ra chính cổng đó | Vẫn có thể cập nhật nguồn |
| Đích broadcast | Chuyển ra tập cổng broadcast được phép | Vẫn học nguồn nếu cổng cho học |

Không đánh đồng “frame không được forward” với “không thể học gì”. Hai thao tác giải hai câu hỏi khác nhau. Tương tự, không lấy bảng FDB thay bảng ARP. FDB trả lời **MAC qua cổng nào**; cache láng giềng IPv4 trả lời **IP tương ứng MAC nào** trên liên kết. Muốn nối hai câu hỏi phải xem cả hai bảng, không tự suy entry ở bảng này luôn làm mới entry ở bảng kia.

### 3.3 Unknown unicast không phải broadcast trá hình

**Unknown unicast** là frame có đích unicast nhưng bridge hiện không có entry FDB cho đích đó. “Unknown” mô tả kiến thức của bridge tại thời điểm nhận; nó không phải một kiểu địa chỉ đặc biệt trong frame. Cùng MAC B có thể unknown ở E1, known ở E3, rồi unknown trở lại sau khi entry bị xoá.

Từ E1 sang E3, byte MAC đích không đổi. Thứ thay là FDB. Còn E4 dùng đích broadcast ngay từ nguồn. Cả E1 và E4 xuất hiện trên pb/pc trong cấu hình mặc định; chỉ nhìn tập cổng ra không đủ phân biệt. Phải mở trường MAC đích. Một switch làm đúng cũng có thể khiến cổng không phải đích thấy một số unicast do flood.

Trong lab, tcpdump ở pc cho thấy frame E1 vẫn có đích B. Việc nhân bản đã không viết lại địa chỉ đích. Máy C nối phía kia có thể bỏ frame unicast không dành cho nó ở bước lọc nhận, trừ khi interface hay công cụ được đặt nhận rộng hơn. **Promiscuous mode** là chế độ cho interface nhận cả những frame không mang MAC đích của chính nó để quan sát. Bắt trực tiếp ở cổng bridge phía switch còn cho biết bản sao đã được đưa ra cổng, trước câu hỏi ứng dụng C có chấp nhận hay không.

> **Đo trên lab.** `out/trace-pc.txt` bắt ở phía switch của cổng pc, không phải log ứng dụng C. Dòng E1 ghi `02:00:00:02:00:0a > 02:00:00:02:00:0b`, `ethertype Unknown (0x88b5), length 60`. `Unknown` ở phần EtherType là tcpdump không giải mã giao thức lab, không phải công cụ đang thông báo đích MAC unknown trong FDB.

Chi tiết cuối đáng tách riêng: tcpdump không tự biết trạng thái FDB của bridge từ byte frame. Ta biết E1 là unknown unicast nhờ bảng trước E1 trống, sau E1 chỉ có A, và nó ra cả pb/pc. Nếu chỉ có pcap E1 mà thiếu ảnh bảng, có thể mô tả “unicast được thấy trên pc”; muốn quy nguyên nhân cho FDB miss phải có thêm bằng chứng trạng thái hoặc đối chứng trước/sau như lab.

Cũng không biến “C thường không thấy unicast đã học của B” thành ranh giới bảo mật. Flood có thể xảy ra khi chưa học hay entry hết hạn; người cùng miền có thể khai MAC nguồn khác; thiết bị có thể có cấu hình mirror. **Port mirroring** là cấu hình sao traffic sang một cổng quan sát độc lập với quyết định cổng ra thông thường. Bài này chưa bật mirror và không đo cơ chế chống giả MAC. Hệ quả của mô hình tin MAC nguồn sẽ được thử ngay sau đây.

## ⏸ Dừng lại — đoán trước #2

FDB đang có A→pa, B→pb. Một frame đi vào **pc**, khai MAC nguồn **B**, đích **A**. Sau đó A gửi tới B. Trong lab không có khoá MAC, entry B là entry động và learning đang bật. Chọn kết quả:

(a) B luôn còn ở pb vì switch đã học lần đầu thì không đổi.
(b) Switch xác minh IP của B trước rồi mới quyết định.
(c) B được học lại ở pc; frame A→B tiếp theo ra pc.
(d) Switch tự broadcast yêu cầu hai máy chứng minh ai là B.

### 3.4 MAC đổi cổng: một cập nhật đúng cơ chế có thể tạo đường sai

Đáp án là **(c)**. E5 trong lab cố ý làm đúng tình huống này: interface C vẫn có địa chỉ riêng C, nhưng script tạo frame với trường nguồn B. Bridge quan sát B từ pc nên entry động B chuyển từ pb sang pc. E6 do A gửi tới B theo entry mới: chỉ ra pc. Máy B thật vẫn ở pb nhưng không nhận bản sao E6 ở cổng của nó.

**MAC move** là việc cùng MAC được học lại qua một cổng khác. Nó có thể là hành vi bình thường khi máy ảo chuyển chỗ, hoặc dấu hiệu địa chỉ trùng, loop hay giả mạo. **MAC flapping** là tình trạng địa chỉ liên tục bị học qua lại giữa các cổng. Một lần chuyển chưa đủ gọi là flapping; muốn chẩn đoán phải có chuỗi thời gian và cổng cụ thể.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 410" role="img" aria-labelledby="net02-c-t net02-c-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto">
<title id="net02-c-t">B đổi cổng rồi mất entry</title>
<desc id="net02-c-d">Giữ nguyên vị trí máy B và C, thay đúng entry B tại cùng ô. data-until bỏ giá trị cũ và cạnh cũ qua mỗi bước.</desc>
<defs><marker id="net02-c-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="50" width="120" height="55" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="80" y="74" font-size="15" text-anchor="middle" fill="currentColor">A · ...:0a</text>
<text x="80" y="94" font-size="14" text-anchor="middle" fill="currentColor">cổng pa</text>
<rect x="265" y="115" width="125" height="65" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="327" y="142" font-size="15" text-anchor="middle" fill="currentColor">net02-br</text>
<text x="327" y="165" font-size="14" text-anchor="middle" fill="currentColor">FDB</text>
<rect x="500" y="50" width="120" height="55" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="560" y="74" font-size="15" text-anchor="middle" fill="currentColor">B · ...:0b</text>
<text x="560" y="94" font-size="14" text-anchor="middle" fill="currentColor">cổng pb</text>
<rect x="500" y="265" width="120" height="55" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="560" y="290" font-size="15" text-anchor="middle" fill="currentColor">C · ...:0c</text>
<text x="560" y="310" font-size="14" text-anchor="middle" fill="currentColor">cổng pc</text>
<line x1="140" y1="78" x2="265" y2="137" stroke="currentColor" stroke-opacity="0.25" stroke-width="2"/>
<line x1="390" y1="137" x2="500" y2="78" stroke="currentColor" stroke-opacity="0.25" stroke-width="2"/>
<line x1="390" y1="160" x2="500" y2="290" stroke="currentColor" stroke-opacity="0.25" stroke-width="2"/>
<rect x="25" y="250" width="365" height="130" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="42" y="275" font-size="14" text-anchor="start" fill="currentColor">Bảng động sau sự kiện</text>
<g data-step="1">
<text x="42" y="305" font-size="15" text-anchor="start" fill="currentColor">A → pa</text>
</g>
<g data-step="1" data-until="1">
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">Trước E5: B → pb</text>
<text x="42" y="332" font-size="15" text-anchor="start" fill="currentColor">B → pb</text>
</g>
<g data-step="2" data-until="3">
<text x="42" y="332" font-size="15" text-anchor="start" fill="currentColor">B → pc</text>
</g>
<g data-step="2" data-until="2">
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">E5: nguồn B đi vào từ pc</text>
<line x1="500" y1="290" x2="390" y2="160" stroke="currentColor" stroke-width="2" marker-end="url(#net02-c-arr)"/>
<line x1="265" y1="137" x2="140" y2="78" stroke="currentColor" stroke-width="2" marker-end="url(#net02-c-arr)"/>
</g>
<g data-step="3" data-until="3">
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">E6: A gửi B, đi ra pc</text>
<line x1="140" y1="78" x2="265" y2="137" stroke="currentColor" stroke-width="2" marker-end="url(#net02-c-arr)"/>
<line x1="390" y1="160" x2="500" y2="290" stroke="currentColor" stroke-width="2" marker-end="url(#net02-c-arr)"/>
</g>
<g data-step="4">
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">Xoá B; E7 lại flood tới pb và pc</text>
<text x="42" y="332" font-size="15" text-anchor="start" fill="currentColor">B: chưa có</text>
<line x1="140" y1="78" x2="265" y2="137" stroke="currentColor" stroke-width="2" marker-end="url(#net02-c-arr)"/>
<line x1="390" y1="137" x2="500" y2="78" stroke="currentColor" stroke-width="2" marker-end="url(#net02-c-arr)"/>
<line x1="390" y1="160" x2="500" y2="290" stroke="currentColor" stroke-width="2" marker-end="url(#net02-c-arr)"/>
</g>
</svg>
<step-note data-step="1">Entry B đã được học ở pb sau E2; máy B thật vẫn nối ở đó.</step-note>
<step-note data-step="2">E5 do C phát nhưng khai nguồn B. Entry cũ bị thay vì learning đang bật và B là entry động.</step-note>
<step-note data-step="3">E6 theo entry B qua pc, nên cổng nối B thật không có bản sao. Chưa kết luận ứng dụng C nhận được.</step-note>
<step-note data-step="4">Lệnh xoá loại entry B khỏi bảng. E7 đích unicast B trở lại unknown và được flood.</step-note>
</step-flow>

> **Đo trên lab.** `events.txt` sau E2 ghi B ở `net02-pb`; sau E5 ghi B ở `net02-pc`. `summary.txt` ghi `E6 ports=pa,pc`. `send.py` dựng header Ethernet bằng raw socket, có khả năng điền MAC nguồn do người chạy chỉ định; quyền này chỉ được cấp trong container lab cô lập. Đây là đối chứng cho việc bảng tin trường nguồn, không phải phép thử tấn công một mạng đang dùng.

Bảng không thể biết “B hợp pháp” chỉ từ frame tự khai nguồn B. Việc chuyển entry bảo đảm mạng thích ứng được với thiết bị đổi cổng mà không cần cấu hình tay mọi lần; chính khả năng thích ứng đó cũng tạo cửa cho dữ liệu nguồn không đáng tin làm lệch hướng. Muốn đánh giá biện pháp bảo vệ phải xem cơ chế khoá, xác thực hay chính sách của thiết bị cụ thể; bài này không biến một lệnh “tắt learning” thành cách chữa phổ quát.

Lưu ý điều **chưa** được chứng minh: E6 ra pc không đồng nghĩa ứng dụng ở C đã xử lý payload gửi cho B. Ta đã giả nguồn ở E5 chứ chưa đổi MAC nhận của C. Mục tiêu là chứng minh quyết định chuyển tiếp bị đổi; muốn kiểm rò nội dung tới ứng dụng phải thiết kế thêm phía nhận và quyền promiscuous. Không suy thêm hành vi ứng dụng từ capture ở cổng bridge.

### 3.5 Mất entry là mất kiến thức, không phải mất thiết bị

**Ageing** là việc entry động bị loại khi nguồn MAC không được quan sát làm mới trong khoảng được cấu hình. Nó giải bài toán thiết bị rời cổng nhưng switch không có một thông điệp chắc chắn báo địa chỉ đó đã đi đâu. Nếu giữ hướng cũ mãi, traffic có thể tiếp tục đi vào một nhánh không còn đích.

Khi xoá B→pc sau E6, frame A→B E7 lại unknown. Nó được flood ra pb và pc, nên B thật lại có cơ hội nhận trên cổng của mình. Nhưng **chỉ có A gửi tới B không làm học B**: từ E7 bridge chỉ học/làm mới A. Nếu B hoàn toàn im lặng, entry B không được tạo chỉ vì đã có traffic tìm B.

> **Nguồn.** [Kernel bridge documentation, IFLA_BR_AGEING_TIME](https://www.kernel.org/doc/html/latest/networking/bridge.html) định nghĩa hết hạn theo thời gian kể từ packet nhận **từ** MAC đó; API dùng đơn vị gắn với `USER_HZ`. [Source iproute2 v6.9.0](https://raw.githubusercontent.com/iproute2/iproute2/v6.9.0/ip/iplink_bridge.c) cho thấy tuỳ chọn `ageing_time` chuyển số nguyên vào netlink và in lại giá trị raw. Vì vậy cần kiểm đơn vị của đúng công cụ đang chạy, không sao chép một con số rồi tự gọi nó là giây.

Lab còn đo riêng hết hạn tự nhiên. Với bản iproute2 đang cài, script đặt `ageing_time 200`; `clock.txt` ghi `CLK_TCK=100`, tương ứng cấu hình 2 giây theo API đang dùng. E10 từ B đi vào pb để học lại B; ảnh trước chờ có A→pa và B→pb. Script chờ 8 giây không phát thêm frame, ảnh sau chờ không còn entry động; E11 A→B lại xuất hiện ở pb và pc.

> **Đo trên lab.** Đơn vị và cấu hình: `out/ageing-config.txt`, `out/clock.txt`; bảng trước/sau: `out/events.txt`; E11: `out/summary.txt`. Khoảng chờ 8 giây là tham số script, không phải thời điểm entry chính xác bị xoá. Phép đo chỉ kết luận entry đã mất khi chụp sau chờ; chưa đo độ lệch bộ dọn bảng so với ngưỡng 2 giây.

**Entry động** và **entry tĩnh** không cùng vòng đời. `bridge fdb show` không trống hoàn toàn không có nghĩa phép thử ageing thất bại: các dòng local/permanent có thể còn, đúng mục đích của chúng. Cũng không suy giá trị mặc định trên mọi thiết bị từ giá trị rút ngắn trong lab. Xoá entry bằng lệnh là một can thiệp khác với chờ entry động hết hạn; lab ghi riêng cả hai để tránh nhận công của lệnh xoá cho bộ ageing.

### 3.6 “Mọi cổng còn lại” còn thiếu điều kiện nào?

Câu tắt “switch không biết đích thì gửi ra tất cả cổng trừ cổng vào” hữu ích để đoán E1 nhưng không phải luật đủ cho một cấu hình bất kỳ. Cổng phải đang hoạt động và ở trạng thái cho phép chuyển tiếp; VLAN, chính sách lọc và cờ flood có thể làm tập cổng ra nhỏ hơn. **VLAN — Virtual LAN — là cách tách các miền chuyển tiếp tầng liên kết trên cùng hạ tầng switch**; việc gắn thẻ và cấu hình cụ thể để bài 4. Trong lab VLAN filtering tắt, nên phép so không bị ranh giới VLAN che mất.

**STP — Spanning Tree Protocol — là cơ chế chọn topology chuyển tiếp không vòng lặp giữa các bridge.** Lab là một hình sao không vòng, để STP tắt. Ta không tạo loop để “thử tốc độ broadcast”: Ethernet frame không có TTL kiểu IP để tự dừng mỗi lần đi qua bridge, nên một topology vòng cần cơ chế ngăn vòng ở lớp liên kết. Bài này chưa đo storm hay thời gian hội tụ STP.

Một đối chứng nhỏ hơn và có kiểm soát là tắt **unknown-unicast flood** ở pc trong khi để broadcast flood của pc bật. Khi B chưa có entry, E8 A→B không còn ra pc. E9 A→broadcast vẫn ra pc. Địa chỉ đích khác nhau nên hai đường quyết định không nhất thiết dùng cùng cờ.

<ab-toggle data-labels="E8 unicast|E9 broadcast">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 330" role="img" aria-labelledby="net02-d1-t net02-d1-d" style="width:100%;max-width:500px;height:auto;display:block;margin:1.25rem auto">
<title id="net02-d1-t">Broadcast và unknown unicast dùng cờ khác nhau</title>
<desc id="net02-d1-d">Cùng bố cục và cấu hình. Unknown unicast không ra pc; broadcast vẫn có cạnh ra pc.</desc>
<defs><marker id="net02-d1-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">pc: flood off; bcast_flood on</text>
<rect x="20" y="115" width="100" height="52" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="70" y="145" font-size="15" text-anchor="middle" fill="currentColor">A · pa</text>
<rect x="180" y="108" width="120" height="65" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="240" y="136" font-size="15" text-anchor="middle" fill="currentColor">net02-br</text>
<text x="240" y="158" font-size="13" text-anchor="middle" fill="currentColor">B chưa biết</text>
<rect x="365" y="55" width="110" height="50" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="420" y="85" font-size="15" text-anchor="middle" fill="currentColor">B · pb</text>
<rect x="365" y="215" width="110" height="50" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="420" y="245" font-size="15" text-anchor="middle" fill="currentColor">C · pc</text>
<line x1="120" y1="140" x2="180" y2="140" stroke="currentColor" stroke-width="2" marker-end="url(#net02-d1-arr)"/>
<line x1="300" y1="125" x2="365" y2="80" stroke="currentColor" stroke-width="2" marker-end="url(#net02-d1-arr)"/>
<text x="20" y="305" font-size="14" text-anchor="start" fill="currentColor">Đích: 02:00:00:02:00:0b</text>
<line x1="300" y1="155" x2="365" y2="240" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="5 5"/>
<text x="300" y="210" font-size="13" text-anchor="start" fill="currentColor">bị chặn</text>
</svg>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 330" role="img" aria-labelledby="net02-d2-t net02-d2-d" style="width:100%;max-width:500px;height:auto;display:block;margin:1.25rem auto">
<title id="net02-d2-t">Broadcast và unknown unicast dùng cờ khác nhau</title>
<desc id="net02-d2-d">Cùng bố cục và cấu hình. Unknown unicast không ra pc; broadcast vẫn có cạnh ra pc.</desc>
<defs><marker id="net02-d2-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
<text x="20" y="25" font-size="15" text-anchor="start" fill="currentColor">pc: flood off; bcast_flood on</text>
<rect x="20" y="115" width="100" height="52" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="70" y="145" font-size="15" text-anchor="middle" fill="currentColor">A · pa</text>
<rect x="180" y="108" width="120" height="65" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="240" y="136" font-size="15" text-anchor="middle" fill="currentColor">net02-br</text>
<text x="240" y="158" font-size="13" text-anchor="middle" fill="currentColor">B chưa biết</text>
<rect x="365" y="55" width="110" height="50" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="420" y="85" font-size="15" text-anchor="middle" fill="currentColor">B · pb</text>
<rect x="365" y="215" width="110" height="50" rx="5" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.5"/>
<text x="420" y="245" font-size="15" text-anchor="middle" fill="currentColor">C · pc</text>
<line x1="120" y1="140" x2="180" y2="140" stroke="currentColor" stroke-width="2" marker-end="url(#net02-d2-arr)"/>
<line x1="300" y1="125" x2="365" y2="80" stroke="currentColor" stroke-width="2" marker-end="url(#net02-d2-arr)"/>
<text x="20" y="305" font-size="14" text-anchor="start" fill="currentColor">Đích: ff:ff:ff:ff:ff:ff</text>
<line x1="300" y1="155" x2="365" y2="240" stroke="currentColor" stroke-width="2" marker-end="url(#net02-d2-arr)"/>
</svg>
<ab-note>Không có entry B, nhưng pc không cho unknown unicast flood ra. Chỉ pb có bản sao egress.</ab-note>
<ab-note>Broadcast đi theo cờ riêng còn bật trên pc. Tắt flood unicast chưa tắt broadcast.</ab-note>
</ab-toggle>

**Nguồn cho hai cờ:** [bridge(8)](https://man7.org/linux/man-pages/man8/bridge.8.html) phân biệt `flood` với `bcast_flood`. Thay đổi `flood off` là hạn chế unknown unicast ra cổng đó, không phải lệnh tắt mọi frame trên cổng. Khi vận hành, nếu muốn quan sát traffic cụ thể, kiểm cờ của đúng **cổng ra** thay vì chỉ thấy interface UP rồi kết luận nó sẽ nhận mọi flood.

> **Suy luận.** Nếu B chỉ còn đường qua pc mà chưa có entry, `flood off` trên pc có thể làm unknown unicast A→B không tới B cho tới khi có cách khác cung cấp entry hoặc B tự phát traffic được học. Lab E8 xác nhận thiếu bản sao ở pc; nó chưa đo một dịch vụ IP mất kết nối trong cấu hình đó. Muốn kiểm chuyển sang IP cần giữ nguyên điều kiện FDB miss và chụp cả cache láng giềng.

### 3.7 Frame 60 byte trong pcap có vi phạm Ethernet tối thiểu không?

Lab tạo mỗi frame bằng 6 byte đích + 6 byte nguồn + 2 byte EtherType + 46 byte payload, tổng 60 byte được capture. Mã E1, E2… nằm đầu payload; phần còn lại là dấu chấm do script điền. Không phải kernel tự sinh các dấu chấm này. Ta chủ động gửi đủ độ dài payload để không phụ thuộc việc đường ảo có tự padding giống NIC vật lý hay không.

**Padding** là phần đệm thêm để đạt kích thước tối thiểu của frame; **FCS** là phần kiểm tra lỗi cuối frame Ethernet. Với Ethernet không gắn VLAN thông thường, header 14 + payload tối thiểu 46 + FCS 4 = 64 byte tính từ MAC đích tới hết FCS. [RFC 894, Frame Format](https://www.rfc-editor.org/rfc/rfc894.txt) quy định payload tối thiểu và padding không thuộc độ dài IP; [hằng số Linux `ETH_ZLEN`/`ETH_FCS_LEN`](https://raw.githubusercontent.com/torvalds/linux/v6.8/include/uapi/linux/if_ether.h) xác định giới hạn không FCS và độ dài FCS.

> **Nguồn.** RFC 894: *“The minimum length of the data field of a packet sent over an Ethernet is 46 octets.”* Câu đó nói về độ dài tối thiểu data field; không được đọc 46 thành toàn frame. Header, FCS và byte capture thuộc các phạm vi đếm khác nhau.

Pcap veth ở bài này không có FCS, nên 60 không phủ định 64. Ở bài 1, frame ARP còn chỉ có 42 byte capture trên veth; thiết bị ảo không phải chứng cứ rằng một NIC vật lý cũng sẽ truyền một frame 42 byte từ MAC tới FCS. Muốn đo trên dây phải có điểm đo và cách xử lý FCS/padding tương ứng; một pcap local không tự cung cấp những byte không được chuyển lên nó.

Các phép nhân byte dưới đây chỉ tính capture egress, chưa tính preamble hay khoảng cách frame của Ethernet vật lý.

## 4. Lab

### 4.1 Chạy lại và giữ đúng phạm vi quan sát

Thư mục `~/projects/net-lab/net-02/` chứa `run.sh`, `inside.sh`, `send.py`, `analyze.py`, bản tải nguồn và `out/`. Cần Docker Linux; container `net02-lab` dùng `--privileged` để tạo namespace bên trong. Đọc script trước khi chạy; chỉ dùng trên lab do bạn kiểm soát. Script không gắn mạng vật lý vào bridge thử nghiệm, không phát frame giả MAC tới LAN ngoài.

```bash
./run.sh
cat out/environment.txt
cat out/events.txt
cat out/summary.txt
```

**Làm gì → thấy gì → vì sao:** script dựng một namespace switch và ba namespace đầu cuối, nối bằng ba cặp veth. Bridge và cả ba đầu không có IP phục vụ phép thử. IPv6 được tắt trong từng namespace trước khi bật interface; nếu để các frame tự phát làm bridge học nguồn trước E1, bạn sẽ thử một bảng đã có sẵn dữ liệu mà cứ tưởng đang trống. Lọc capture chỉ lấy `ether proto 0x88b5` không tự ngăn các frame loại khác làm FDB thay đổi.

Ba tcpdump chạy đồng thời ở phía switch của pa/pb/pc, lưu vào `pa.pcap`, `pb.pcap`, `pc.pcap`. Script đợi công cụ bắt sẵn trước khi gửi rồi dừng sau frame cuối. Nó giữ log kết quả và dọn đúng container có tiền tố net02 khi thoát. Mọi mã E trong bài có thể đối chiếu với byte payload; không dựa vào “gói thứ mấy” nếu chạy lại có traffic ngoài dự kiến.

### 4.2 Cho “học MAC đích” chạy trước, rồi đối chiếu bảng

Đọc đoạn đầu `out/events.txt`. Đây là output thật, gồm nhãn trạng thái do script in và những dòng động từ `bridge fdb show`:

```text
STATE initial
E1 src=02:00:00:02:00:0a dst=02:00:00:02:00:0b bytes=60
STATE after-E1
02:00:00:02:00:0a dev net02-pa master net02-br
E2 src=02:00:00:02:00:0b dst=02:00:00:02:00:0a bytes=60
STATE after-E2
02:00:00:02:00:0a dev net02-pa master net02-br
02:00:00:02:00:0b dev net02-pb master net02-br
```

**Làm gì → thấy gì → vì sao:** trước khi xem, viết bảng dự đoán theo mô hình sai “thấy đích B thì học B ở cổng vào”. Nó dự đoán B→pa sau E1. Log chỉ có A→pa. E2 mới sinh B→pb. Mô hình sai thất bại ngay ở trạng thái bảng, trước cả việc phải suy ứng dụng có nhận được gì.

Đối chiếu `summary.txt`:

```text
E1 ports=pa,pb,pc
E2 ports=pa,pb
E3 ports=pa,pb
E4 ports=pa,pb,pc
```

Đếm pa ở E1 như cổng ra là sai: A nối pa, đó là quan sát ingress. **Ingress** là chiều frame đi vào thiết bị xét; **egress** là chiều frame rời thiết bị đó. E1 có một quan sát vào và hai quan sát ra, không phải “switch forward ngược về A”. E3 có một vào và một ra; giữa chúng trạng thái FDB đã thay đổi như log cho thấy.

### 4.3 Dùng hex phân biệt unknown unicast và broadcast

Mở `out/trace-pc.txt`. Hai đoạn quyết định, một của E1 và một của E4:

```text
02:00:00:02:00:0a > 02:00:00:02:00:0b, ethertype Unknown (0x88b5), length 60:
0x0000:  0200 0002 000b 0200 0002 000a 88b5 4531
02:00:00:02:00:0a > ff:ff:ff:ff:ff:ff, ethertype Unknown (0x88b5), length 60:
0x0000:  ffff ffff ffff 0200 0002 000a 88b5 4534
```

**Làm gì → thấy gì → vì sao:** sáu byte đầu E1 vẫn là B, trong khi E4 là toàn `ff`. Hai byte payload đầu `4531` là E1, `4534` là E4. Cả hai đều đi ra pc nhưng chỉ E4 là broadcast theo địa chỉ đích. Nếu switch viết lại E1 thành broadcast như mô hình sai, sáu byte đầu đã phải khác. So byte như thế mạnh hơn nhận xét “công cụ thấy gói nên chắc broadcast”.

Không cần giải mã `88b5` thành HTTP; [packet(7)](https://man7.org/linux/man-pages/man7/packet.7.html) mô tả raw packet socket dùng để gửi/nhận frame tầng liên kết. `send.py` tự dựng header nên thí nghiệm không cần server TCP, ARP hay IP. Phần chấm trong payload chỉ giúp đủ 46 byte và không ảnh hưởng việc chọn cổng.

### 4.4 Đổi nguồn qua cổng khác rồi xoá entry

Trong `inside.sh`, ba dòng lệnh can thiệp thuộc cùng namespace switch. Các biến A/B/C là ba MAC đã nêu trong bài. Lệnh chuyển bảng được tạo bởi frame E5, còn lệnh dưới đây chỉ xoá B sau E6:

```sh
ip netns exec net02-c python3 /lab/send.py net02-c0 "$B" "$A" E5
ip netns exec net02-sw bridge fdb show br net02-br
ip netns exec net02-sw bridge fdb del "$B" dev net02-pc master
```

Các lệnh chạy bên trong container; `/lab` là mount thư mục lab. `run.sh` đã thực hiện E6 trước khi xoá.

**Làm gì → thấy gì → vì sao:** so ảnh `after-E2`, `after-E5`, `deleted-B` trong events. Sau E5, entry B chỉ còn ở pc. Summary ghi:

```text
E5 ports=pa,pc
E6 ports=pa,pc
E7 ports=pa,pb,pc
```

E5 vào pc ra pa; E6 vào pa ra pc; E7 vào pa ra pb và pc vì B đã bị xoá khỏi FDB. Cùng tập capture `pa,pc` ở E5/E6 nhưng vai trò ingress/egress đảo chiều, nên phải biết nguồn sự kiện, không đọc mỗi danh sách cổng.

### 4.5 Tách hai cờ flood và kiểm hết hạn

Khi B đang thiếu entry, script tắt flood unknown unicast ở pc, gửi E8 rồi gửi broadcast E9; sau đó bật lại trước thử ageing. Lệnh cấu hình:

```sh
ip netns exec net02-sw bridge link set dev net02-pc flood off
ip netns exec net02-sw bridge link set dev net02-pc flood on
ip -n net02-sw link set net02-br type bridge ageing_time 200
```

Các frame E8/E9 được gửi giữa hai lệnh đổi cờ trong `inside.sh`; summary ghi:

```text
E8 ports=pa,pb
E9 ports=pa,pb,pc
E10 ports=pa,pb
E11 ports=pa,pb,pc
```

**Làm gì → thấy gì → vì sao:** E8 biến mất khỏi pc nhưng E9 vẫn có ở đó, xác nhận hai loại flood có điều khiển khác nhau. E10 học lại B ở pb; sau khoảng chờ, E11 unknown trở lại và ra thêm pc. Xem ảnh bảng trước/sau chờ, đừng chỉ quy E11 cho ageing từ bộ đếm gói.

`ageing_time 200` là số raw của bản iproute2 này, không phải yêu cầu chờ 200 giây. Source và `CLK_TCK=100` giải thích ngưỡng 2 giây. Man page tải cùng đợt mô tả đơn vị là giây; với binary đang chạy, source và quan sát không khớp cách diễn đạt đó. Vì vậy bài dùng số raw cùng điều kiện cụ thể và giữ khoảng chờ dư 8 giây; nếu dùng phiên bản công cụ khác, kiểm lại cấu hình thay vì sao chép nguyên giá trị.

## 5. Tính tay

### Bài tính 1 — Học được bao nhiêu entry?

Bắt đầu FDB động trống như lab. A→B vào pa; B→A vào pb; A→B vào pa. Không có traffic khác và không entry nào hết hạn. Sau mỗi frame có những entry nào? Tổng số bản sao **egress** là bao nhiêu, và vì sao số quan sát trên ba capture lớn hơn nó?

**Giải:** sau E1 chỉ A→pa; sau E2 có A→pa, B→pb; sau E3 giữ hai entry. Egress lần lượt 2, 1, 1, tổng 4. Cộng ba quan sát ingress được 7 quan sát capture cho ba frame do nguồn phát. Không có 7 thông điệp do ứng dụng tạo. Kết quả đối chiếu E1/E2/E3 ở `summary.txt`; chưa tính E4 và các phép thử sau.

### Bài tính 2 — Byte capture tăng thế nào khi flood?

Frame lab dài 60 byte không FCS. Với E1 unknown, hai cổng egress đều nhận bản sao. Với E3 đã biết B, chỉ một cổng egress nhận. Chỉ tính tổng byte capture egress, chênh bao nhiêu byte và bao nhiêu phần trăm so với E3? Một bridge giả định có 8 cổng đủ điều kiện, một cổng ingress, đích unknown thì bao nhiêu byte egress cho cùng frame?

**Giải:** E1 là `2 × 60 = 120` byte; E3 `1 × 60 = 60` byte. Chênh 60 byte, tăng `60 / 60 × 100 = 100 %`. Trường hợp giả định 8 cổng: `7 × 60 = 420` byte egress. Đây là phép suy theo cấu hình mọi cổng còn lại được phép flood, không phải số đo switch 8 cổng, và không phải byte vật lý có đủ preamble/FCS/khoảng cách frame.

### Bài tính 3 — MAC đích có làm mới thời gian học không?

Giả sử một bảng đơn giản đặt tuổi entry là 10 giây, dọn đúng ngưỡng và không có entry tĩnh. B được học từ pb lúc t=0; từ t=1 tới t=12 chỉ A gửi tới B mỗi giây, B không phát frame nào. Frame A→B ở t=11 có buộc phải đi riêng pb không? Nếu có thêm một frame nguồn B vào pc lúc t=9 thì kết quả khác thế nào?

**Giải:** trong mô hình giả định, traffic **tới** B không làm mới quan sát **từ** B. Tại t=11 entry học lúc 0 đã quá 10 giây, nên không được lấy entry đó làm căn cứ gửi riêng pb; nếu thiếu entry khác thì flood theo cổng được phép. Nếu B xuất hiện ở pc lúc 9, bảng học B→pc, còn hạn tại 11, nên frame đi riêng pc trong điều kiện còn lại không đổi. Đây là suy luận theo quy tắc học/ageing của nguồn, không phải đo chính xác bộ dọn bảng Linux vào giây 10.

## 6. Chuyển giao

Các câu dưới đây đổi topology hoặc điều kiện so với lab; hãy chỉ rõ bằng chứng cần thu. Câu cuối không có đáp án trong bài.

1. Một switch con nối hai máy D/E phía sau cùng một cổng uplink của switch chính. D gửi E, switch chính đã có cả hai MAC qua uplink đó. Bạn sẽ bắt ở đâu để kiểm liệu việc không forward trở lại uplink có làm D/E mất liên lạc không?
2. Một VM đổi host, IP không đổi. Cache láng giềng ở client vẫn có MAC cũ đúng, nhưng đường chuyển tiếp tới VM chưa đúng. Cần đối chiếu những bảng nào, và frame mang nguồn nào có thể giúp phân biệt lỗi cache IP→MAC với lỗi MAC→cổng?
3. Bạn thấy cùng MAC học qua hai cổng xen kẽ theo thời gian. Làm sao phân biệt VM di chuyển hợp lệ, hai máy trùng MAC và vòng lặp mà không kết luận chỉ từ một ảnh FDB?
4. Cổng đã UP nhưng unknown unicast không ra đó; broadcast lại ra. Ngoài capture ingress/egress, bạn lấy những thông tin cấu hình nào trước khi gọi đây là lỗi phần cứng?
5. Một dịch vụ trên B vẫn nhận request bình thường, nhưng pcap bắt ở C không còn thấy unicast như trước. Sự thay đổi đó chứng minh được điều gì về đường đi, và vì sao chưa chứng minh hệ thống an toàn trước người cùng miền mạng?
6. **Câu khó nhất:** FDB động của B mất theo chu kỳ, dù ứng dụng A liên tục nhận phản hồi từ “B”. Có router, proxy và một đường trả về khác trong topology. Hãy thiết kế bộ capture và ảnh bảng theo thời gian đủ để xác định switch này có thật sự quan sát MAC nguồn B hay không; chỉ ra trường hợp traffic ứng dụng hai chiều vẫn không làm mới entry B trên switch đang xét.

## 7. Tóm tắt

- Bridge học MAC **nguồn** qua cổng vào, rồi dùng MAC **đích** để chọn cổng ra.
- E1 unknown unicast được thấy trên pc với MAC đích vẫn là B; flood không biến nó thành broadcast (`trace-pc.txt`).
- Sau frame nguồn B ở pb, E3 A→B chỉ ra pb (`events.txt`, `summary.txt`).
- Frame nguồn B từ pc làm entry động B chuyển sang pc; E6 theo hướng mới dù B thật vẫn ở pb.
- Xoá hay hết hạn entry khiến đích trở lại unknown; traffic chỉ gửi **tới** đích không tự chứng minh vị trí nguồn đó.
- `flood off` ở pc chặn E8 unknown unicast ra pc nhưng không chặn E9 broadcast trong cấu hình lab.
- Frame lab capture 60 byte không chứa FCS; không lấy số đó làm tổng chi phí truyền Ethernet vật lý.

→ **Bài 3 — ARP: gói đầu tiên vì sao chậm**: sau câu hỏi MAC đi qua cổng nào, cần đo cách máy gửi tìm MAC ứng với IP và trạng thái cache nào làm request đầu phải chờ.
