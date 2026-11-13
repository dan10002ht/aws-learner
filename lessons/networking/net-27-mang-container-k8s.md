# Bài 27 — Mạng container và Kubernetes: VIP biến mất trước khi gói qua tunnel

## 1. Mục tiêu

Sau bài này bạn có thể:

- Tách một lỗi gọi Service thành lỗi phân giải tên, lỗi ánh xạ VIP hoặc lỗi đi tới endpoint.
- Chỉ ra việc CNI cấu hình lúc tạo Pod khác với việc kernel chuyển tiếp từng gói như thế nào.
- Đọc một rule DNAT và dự đoán địa chỉ bắt được ở phía trước, phía sau rule và trên underlay.
- Giải thích vì sao cập nhật danh sách endpoint không buộc kết nối đang mở đổi backend.
- Bóc địa chỉ node và địa chỉ endpoint trong cùng một capture VXLAN, rồi tính MTU còn lại.
- Phân biệt kube-proxy iptables, IPVS và nftables theo cơ chế, không suy proxy mode từ tên binary.

## 2. Triệu chứng

Backend trên một node vẫn trả HTTP 200 nếu gọi IP endpoint, nhưng ứng dụng gọi qua VIP thì không kết nối được. Đội vận hành nhìn thấy DNS trả đúng IP và kết luận “mạng Pod xuyên node bị hỏng”.

Lab dưới đây cho bản chẩn đoán ấy thất bại. Cùng một client namespace, cùng một endpoint namespace ở đầu kia VXLAN:

```text
DIRECT
200
VIP-BEFORE
000
VIP-AFTER
200
```

`000` là kết quả `curl -w '%{http_code}'` khi chưa nhận được HTTP response, không phải mã HTTP do server trả. Sau khi thêm đúng một rule ánh xạ VIP tới endpoint, gọi VIP được 200. Đường VXLAN không đổi, HTTP server không restart, và phép thử dùng IP nên không có DNS để sửa.

> **Đo trên lab.** Docker/colima, Alpine `3.20`, Linux `6.8.0-64-generic` aarch64; iptables `1.8.10 (nf_tables)`. Namespace `net27-a` gọi endpoint `10.27.0.2:8080` qua VXLAN VNI 27; VIP thử nghiệm là `10.96.0.27:80`. Trích `out/run.txt`. Đo lại: `./run.sh` trong `~/projects/net-lab/net-27/`.

Bài [net-04](net-04-bridge-veth-vlan.md) đã dựng namespace, veth và bridge; [net-07](net-07-nat-conntrack.md) đã giải thích NAT binding và conntrack. Bài [cn-07](../cloudnative/cn-07-services.md) đã dạy object Service cùng EndpointSlice. Bài này lấy các phần ấy làm tiền đề, đi xuống **đường gói thực thi**: ai cấu hình, kernel đổi tuple ở đâu, rồi outer packet mang gì khi vượt qua mạng giữa các node.

## ⏸ Dừng lại — đoán trước #1

Endpoint IP trả được 200, VIP không kết nối được; request dùng IP literal. Nên kiểm gì tiếp để phân biệt các giả thuyết?

- (a) Xoá cache CoreDNS vì Service luôn cần DNS mới tới backend.
- (b) Đối chiếu endpoint mong muốn với rule dataplane ở node phát request, rồi xem tuple trước/sau rule.
- (c) Tăng MTU mọi interface vì gọi VIP luôn thêm một IP header.
- (d) Restart HTTP server vì nó phải listen trên VIP của Service.

## 3. Cơ chế

### 3.1 Có ba công việc độc lập trong một đường request

Đáp án **(b)**. **Dataplane** là phần xử lý và chuyển gói theo cấu hình hiện có; **control plane** là phần quyết định, phân phối cấu hình ấy. Hai phần liên quan nhưng không cần chạy cùng nhịp với từng request.

Khi một Pod được tạo, runtime tích hợp CNI để thiết lập mạng sandbox: interface, IP, route và những cấu hình plugin cần. **CNI — Container Network Interface** là hợp đồng giữa bên chạy container và plugin cấu hình mạng. Plugin thực thi thao tác như ADD/DEL, không phải tên một kiểu tunnel duy nhất.

Khi Service hoặc EndpointSlice đổi, kube-proxy theo dõi trạng thái qua API rồi cập nhật cấu trúc xử lý Service trong kernel. Với dataplane thay thế kube-proxy, một agent khác đảm nhiệm phần ấy. Khi ứng dụng gửi packet, kernel dùng cấu hình đã có; request HTTP không gọi API server để xin một backend cho từng gói.

Ba lỗi do đó có dấu hiệu khác nhau. CNI/IPAM lỗi lúc tạo sandbox có thể làm Pod không có mạng hợp lệ. Đồng bộ Service lỗi có thể để direct endpoint thông nhưng VIP hỏng hoặc trỏ tới endpoint cũ. Đường liên node lỗi có thể khiến cả direct endpoint và VIP chọn endpoint từ xa đều hỏng.

**IPAM** là quản lý và cấp phát địa chỉ IP cho endpoint. Nó trả lời “endpoint nhận IP nào”; routing/encapsulation trả lời “gói tới IP ấy bằng cách nào”. Một plugin có thể kết hợp cả hai nhưng không làm chúng trở thành một phép kiểm.

> **Nguồn.** [CNI specification](https://www.cni.dev/docs/spec/) phân biệt thao tác ADD, DEL và CHECK; [Kubernetes networking model](https://kubernetes.io/docs/concepts/services-networking/) tách mạng Pod khỏi việc hiện thực Service. Bài không giả định mọi CNI đều tạo Linux bridge hay đều dùng VXLAN.

<svg viewBox="0 0 520 315" role="img" aria-labelledby="net27-planes-t net27-planes-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net27-planes-t">Cấu hình đi xuống kernel, gói đi ngang qua kernel</title>
<desc id="net27-planes-d">Runtime gọi CNI để cấu hình mạng endpoint; API cung cấp trạng thái cho agent Service. Hai đường điều khiển hội tụ vào dataplane, còn packet đi ngang.</desc>
<defs><marker id="net27-planes-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
<rect x="20" y="25" width="190" height="48" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="310" y="25" width="190" height="48" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<text x="115" y="54" fill="currentColor" text-anchor="middle" font-size="14">Runtime → CNI ADD</text>
<text x="405" y="54" fill="currentColor" text-anchor="middle" font-size="14">API → Service agent</text>
<path d="M115 73 L115 92 M115 120 L115 176 M405 73 L405 92 M405 120 L405 176" stroke="currentColor" stroke-dasharray="5 4" marker-end="url(#net27-planes-arrow)"/>
<text x="115" y="111" fill="currentColor" text-anchor="middle" font-size="13">IP / route / link</text>
<text x="405" y="111" fill="currentColor" text-anchor="middle" font-size="13">VIP / endpoint map</text>
<rect x="85" y="180" width="350" height="70" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="207" fill="currentColor" text-anchor="middle" font-size="15">Kernel dataplane</text>
<path d="M20 230 L85 230 M435 230 L500 230" stroke="currentColor" stroke-width="2" marker-end="url(#net27-planes-arrow)"/>
<text x="260" y="232" fill="currentColor" text-anchor="middle" font-size="14">tuple → rule/state → route</text>
<text x="260" y="290" fill="currentColor" text-anchor="middle" font-size="14">Nét đứt: cấu hình · Nét liền: gói thực thi</text>
</svg>

Đường điều khiển hỏng không đồng nghĩa mọi flow đang chạy lập tức chết. Kernel có thể vẫn giữ rule và state cũ; flow cũ có thể tiếp tục, trong khi endpoint mới không được cập nhật. Muốn kết luận agent treo làm ảnh hưởng request nào, cần so thời điểm thay đổi endpoint, rule ở node và flow thực tế.

### 3.2 VIP là điểm khớp rule, không buộc có socket ứng dụng

Trong iptables mode, kube-proxy ghi rule để traffic tới Service IP/port được chọn một endpoint và đổi destination tuple. Sau đó kernel route packet tới endpoint đã chọn. App backend listen trên endpoint port; nó không cần bind VIP.

Nguồn [Virtual IPs and Service Proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/) mô tả iptables mode chọn backend ngẫu nhiên mặc định. Vì conntrack giữ kết quả cho flow, đây không phải xoay backend cho từng HTTP request và cũng không bảo đảm tuần tự round-robin giữa các kết nối.

Cần sửa cách hiểu một vài câu rút gọn trong cn-07 khi dùng chúng để debug: “không IP nào sở hữu VIP” phù hợp để hình dung iptables mode nhưng không bao quát IPVS; “round-robin qua Pod” không phải mặc định chung của iptables. Object Service có cùng ý nghĩa phía API nhưng hiện thực dưới kernel khác nhau.

Trong một cấu hình iptables thông thường, chain dành cho Service nhận traffic phù hợp, chain của Service chọn endpoint, chain endpoint thực hiện DNAT. **Hook** là điểm trong đường xử lý kernel mà rule có thể chạy. Traffic đến node từ một interface thường cần đường PREROUTING; traffic do chính node tạo thường cần đường OUTPUT. Rule ở sai hook có thể hoàn toàn không gặp gói bạn đang thử.

Lab tạo request ngay trong namespace `net27-a`, nên rule nằm ở OUTPUT của namespace đó:

```text
-A OUTPUT -d 10.96.0.27/32 -p tcp -m tcp --dport 80 -j DNAT --to-destination 10.27.0.2:8080
```

Trích `out/run.txt`. Rule này chỉ mô phỏng một phép ánh xạ Service, không phải dump kube-proxy. Nó không có chọn nhiều backend, affinity, policy Local, hairpin hay các chain do Kubernetes sinh ra. Đừng chép rule OUTPUT này vào host thật rồi kỳ vọng sửa được traffic Pod đi vào node qua veth.

Một VIP không phản hồi ping cũng không đủ để kết luận Service hỏng. Service rule đang xét protocol và port, chẳng hạn TCP/80; ICMP không phải kết nối ấy. Bằng chứng phù hợp là kết nối đúng protocol/port cộng rule/counter/capture tại đúng namespace.

### 3.3 Một flow được chọn backend, nhiều request dùng lại flow ấy

**Flow** trong phần này là một cuộc trao đổi được state theo tuple và protocol. HTTP keepalive hoặc HTTP/2 có thể đặt nhiều request lên một TCP connection. Nếu phép cân bằng backend diễn ra khi tạo flow, các request dùng lại connection đi về cùng endpoint theo state đã có.

Xem net-07 để đọc original/reply tuple và vì sao binding còn qua đổi rule. Ở đây hệ quả vận hành là: sửa EndpointSlice để bỏ một backend không có nghĩa mọi kết nối đang mở lập tức chuyển sang backend khác. Gửi request mới trên connection cũ và mở connection mới là hai phép thử khác nhau.

Khi Pod bị rút khỏi danh sách nhận traffic, cần phân biệt thời điểm control plane đổi trạng thái, thời điểm agent trên từng node cập nhật rule và thời điểm app ngừng nhận/kết thúc connection. Network policy hoặc sự biến mất route/interface cũng có thể kết thúc flow theo cách khác; không có một quy tắc “xóa endpoint là kill mọi socket” dùng chung cho mọi dataplane.

> **Suy luận.** Một pool giữ ít connection có thể tạo tải lệch giữa backend dù rule chọn endpoint cho connection mới là hợp lý. Suy từ chọn theo flow và tái sử dụng connection; lab một backend không đo được phân bố. Kiểm bằng backend identifier trong response, tuple connection và số connection mới, rồi so với request count.

Muốn đo cân bằng, ghi cả số connection lẫn số request cho mỗi backend. Chỉ gọi curl nhiều lần nhưng vô tình qua một proxy giữ pool sẽ đo cả thuật toán pool của proxy, không chỉ Service dataplane. Ngược lại, tạo connection mới cho mỗi request lại không đại diện client HTTP/2 chạy lâu.

## ⏸ Dừng lại — đoán trước #2

Một request tới `10.96.0.27:80` đã DNAT thành `10.27.0.2:8080`, rồi được VXLAN chở qua underlay IPv4. Capture trên dây giữa hai node sẽ thấy địa chỉ nào?

- (a) Chỉ có VIP, vì client chưa biết backend.
- (b) Outer packet mang IP hai đầu tunnel; inner packet mang tuple endpoint sau DNAT.
- (c) Outer packet mang VIP làm nguồn và endpoint làm đích.
- (d) VXLAN mã hoá inner packet nên tcpdump không thể đọc endpoint IP.

### 3.4 Overlay chở packet endpoint bên trong packet của node

Đáp án **(b)**. **Underlay** là mạng vận chuyển giữa các đầu tunnel; **overlay** là mạng logic được chở trên nó. **VXLAN** đóng gói Ethernet frame bên trong UDP/IP, cho phép hai đầu tunnel trao đổi frame qua mạng IP bên dưới. **VTEP** là đầu thực hiện đóng/mở gói VXLAN. **VNI** là định danh segment VXLAN.

[RFC 7348 §5](https://www.rfc-editor.org/rfc/rfc7348.txt) mô tả header VXLAN, VNI 24 bit và UDP destination port được IANA cấp là 4789. VNI tách segment theo cơ chế encapsulation; nó không phải khoá mã hoá hay danh tính đã xác minh. VXLAN tự nó không giữ bí mật nội dung.

Ở cấu hình lab, hai VTEP có địa chỉ `192.0.2.1` và `192.0.2.2`, remote cố định, VNI 27, destination port 4789. Địa chỉ endpoint là `10.27.0.1` và `10.27.0.2`. Dải `192.0.2.0/24` ở đây nằm hoàn toàn trong lab, không phải IP public của máy.

Một packet TCP sau DNAT có destination `10.27.0.2:8080`. Khi đi qua VXLAN, outer destination là `192.0.2.2:4789`. Router underlay chỉ cần chuyển outer packet tới VTEP kia; nó không cần biết từng địa chỉ endpoint bên trong. Đầu nhận bóc lớp ngoài và đưa inner frame vào đường xử lý phía overlay.

<step-flow>
<svg viewBox="0 0 680 380" role="img" aria-labelledby="net27-path-t net27-path-d" style="width:100%;max-width:680px;height:auto;display:block;margin:1.25rem auto">
<title id="net27-path-t">VIP được thay trước khi packet được VXLAN đóng gói</title>
<desc id="net27-path-d">Client ở A gửi VIP, DNAT đổi sang endpoint B, VTEP A thêm outer IP, VTEP B bóc rồi đưa vào endpoint. Nhãn VIP cũ biến mất sau bước DNAT.</desc>
<defs><marker id="net27-path-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
<rect x="20" y="45" width="270" height="295" rx="12" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="390" y="45" width="270" height="295" rx="12" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<g fill="currentColor" font-size="15" text-anchor="middle"><text x="155" y="72">A · 192.0.2.1</text><text x="525" y="72">B · 192.0.2.2</text></g>
<rect x="55" y="95" width="200" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="55" y="195" width="200" height="42" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<rect x="55" y="280" width="200" height="42" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="425" y="280" width="200" height="42" rx="8" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="425" y="95" width="200" height="55" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<g fill="currentColor" font-size="14" text-anchor="middle"><text x="155" y="118">Client 10.27.0.1</text><text x="155" y="221">OUTPUT DNAT</text><text x="155" y="306">VTEP · VNI 27</text><text x="525" y="306">VTEP · VNI 27</text><text x="525" y="118">10.27.0.2:8080</text><text x="525" y="138">HTTP server</text></g>
<g data-step="1" data-until="1"><text x="155" y="140" fill="currentColor" font-size="13" text-anchor="middle">đích 10.96.0.27:80</text></g>
<g data-step="1"><path d="M155 150 L155 195" stroke="currentColor" marker-end="url(#net27-path-arrow)"/></g>
<g data-step="2"><path d="M155 237 L155 280" stroke="currentColor" marker-end="url(#net27-path-arrow)"/><text x="168" y="265" fill="currentColor" font-size="13">đích .2:8080</text></g>
<g data-step="3"><path d="M255 300 L425 300" stroke="currentColor" marker-end="url(#net27-path-arrow)"/><text x="340" y="268" fill="currentColor" font-size="13" text-anchor="middle">UDP / 4789</text><text x="340" y="360" fill="currentColor" font-size="13" text-anchor="middle">Outer .1 → .2 trong 192.0.2.0/24</text></g>
<g data-step="4"><path d="M525 280 L525 150" stroke="currentColor" marker-end="url(#net27-path-arrow)"/><text x="538" y="210" fill="currentColor" font-size="13">bóc outer</text></g>
</svg>
<step-note data-step="1">Socket client nhắm VIP. Nhãn đích VIP chỉ còn tới trước khi DNAT thực hiện.</step-note>
<step-note data-step="2">Rule đổi destination thành endpoint port. Route tiếp theo được xử lý cho đích đã đổi.</step-note>
<step-note data-step="3">VTEP thêm outer UDP/IP cho đường underlay; inner packet vẫn giữ tuple endpoint sau DNAT.</step-note>
<step-note data-step="4">VTEP B bỏ encapsulation. Hình lược các ACK và đường hồi đáp để chỉ theo một chiều request.</step-note>
</step-flow>

Hình dùng topology lab: client và server chạy trực tiếp trong hai namespace đóng vai đầu mạng, không có Pod riêng nằm sau mỗi VTEP. Cluster thực thường có thêm veth/route hoặc bridge nối Pod với dataplane node. Những phần ấy thuộc net-04; không cần dựng lại để chứng minh hai lớp địa chỉ trong capture.

Không phải mọi mạng Pod đều cần overlay. Nếu underlay có route tới Pod CIDR hoặc Pod dùng địa chỉ có thể route trực tiếp trong mạng nền, packet có thể đi theo routing thông thường. BGP cũng có thể phân phối route của Pod; eBPF có thể thay một phần xử lý Service hoặc forwarding. Đọc topology và cấu hình thật trước khi chọn filter VXLAN.

### 3.5 MTU giảm vì header thật chiếm chỗ thật

**MTU** trong phép tính là giới hạn kích thước IP packet trên một interface Ethernet. Với outer IPv4 không options và inner Ethernet không VLAN, mỗi packet VXLAN cần thêm outer IPv4 20 byte, UDP 8 byte, VXLAN 8 byte và inner Ethernet header 14 byte, tổng cộng 50 byte so với inner IP packet.

Độ dài các header và việc mang inner Ethernet dựa trên [RFC 7348 §5](https://www.rfc-editor.org/rfc/rfc7348.txt). Outer Ethernet không cộng vào giới hạn IP MTU 1.500 ở đây, inner FCS không được mang theo. Nếu outer IPv6, thêm tag hay lớp mã hoá/tunnel khác, phải tính lại thay vì thuộc lòng số 50.

Với underlay MTU 1.500 và đúng giả thiết trên, overlay IP MTU còn `1.500 − 50 = 1.450`. Lab đặt rõ `mtu 1450` cho `net27-vx`. Đây là cấu hình phù hợp với gói header đang xét, không phải chứng minh mọi CNI mặc định dùng giá trị ấy.

<svg viewBox="0 0 520 235" role="img" aria-labelledby="net27-mtu-t net27-mtu-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net27-mtu-t">Ngân sách MTU của outer IPv4 và VXLAN</title>
<desc id="net27-mtu-d">Thanh tỷ lệ cho thấy 50 byte overhead và 1450 byte inner IP nằm trong 1500 byte outer IP. Phần overhead được phóng ra để đọc từng header.</desc>
<rect x="20" y="55" width="16" height="45" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor"/>
<rect x="36" y="55" width="464" height="45" fill="#10b981" fill-opacity="0.14" stroke="currentColor"/>
<text x="260" y="28" fill="currentColor" text-anchor="middle" font-size="15">Outer IP MTU: 1.500 byte</text>
<text x="268" y="83" fill="currentColor" text-anchor="middle" font-size="15">Inner IP: tối đa 1.450 byte</text>
<path d="M28 100 L28 135 L260 135" stroke="currentColor" fill="none"/>
<text x="260" y="157" fill="currentColor" text-anchor="middle" font-size="14">50 byte overhead · phóng phần header bên dưới</text>
<rect x="20" y="175" width="192" height="36" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor"/>
<rect x="212" y="175" width="77" height="36" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="289" y="175" width="77" height="36" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor"/>
<rect x="366" y="175" width="134" height="36" fill="#14b8a6" fill-opacity="0.14" stroke="currentColor"/>
<g fill="currentColor" font-size="13" text-anchor="middle"><text x="116" y="198">IPv4 20</text><text x="250" y="198">UDP 8</text><text x="327" y="198">VXLAN 8</text><text x="433" y="198">Ethernet 14</text></g>
</svg>

Vì vậy một request nhỏ thông không loại được MTU blackhole. TCP handshake dùng packet nhỏ, response có payload lớn mới chạm giới hạn. Xem net-05 để học PMTUD và phân mảnh; ở đây chỉ nối việc thêm encapsulation với ngân sách packet mà Pod còn được dùng.

Lab dùng ping có DF để thử ranh giới local của overlay interface: payload ICMP 1.422 cộng IPv4 20 và ICMP 8 bằng 1.450, đi được; payload 1.423 tạo 1.451 và bị kernel phía gửi báo quá dài. Đây là **local MTU rejection**, không phải đã tái hiện silent blackhole ở một router trung gian. Hai hiện tượng có thể dẫn tới timeout ứng dụng nhưng bằng chứng bắt gói khác nhau.

### 3.6 iptables, IPVS, nftables: tên mode phải đọc đúng lớp

Trong iptables mode, Service được biểu diễn bằng các rule/chain của iptables do kube-proxy đồng bộ. **IPVS** là cơ chế virtual server trong Linux kernel dùng cấu trúc dịch vụ và destination cùng scheduler để chọn backend; kube-proxy IPVS còn phối hợp iptables cho những phần xử lý khác. [Mã kube-proxy IPVS v1.34.0](https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/proxy/ipvs/proxier.go) gắn VIP lên dummy interface, nên không lấy việc thấy VIP trên interface làm bằng chứng đang chạy một app proxy.

**nftables** là API/hệ thống lọc gói kế nhiệm iptables của Linux. kube-proxy có nftables mode riêng. Nó không đồng nghĩa “binary iptables in ra nf_tables”. Lab in:

```text
iptables v1.8.10 (nf_tables)
```

Theo [xtables-nft(8)](https://man7.org/linux/man-pages/man8/xtables-nft.8.html), frontend iptables có thể dùng API nf_tables với cú pháp iptables; dòng này xác nhận backend ấy trong lab. Nó không chứng minh kube-proxy đang chạy nftables mode; lab thậm chí không chạy kube-proxy. Muốn biết mode cluster, đọc cấu hình và log agent, rồi đối chiếu với cấu trúc rule thực tế.

> **Nguồn.** [Virtual IPs and Service Proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/) bản tải ngày 13/11/2026 đánh dấu IPVS mode deprecated từ Kubernetes v1.35 và mô tả nftables mode là lựa chọn thay thế. Đây là trạng thái tài liệu tại ngày nghiên cứu, không phải kết quả benchmark của bài.

Bài vẫn trình bày IPVS vì cần đọc được cluster đã triển khai và vì roadmap yêu cầu so cơ chế. Không khuyến nghị chọn IPVS cho cluster mới chỉ từ khẩu hiệu “hash table nên nhanh hơn”. Thời gian đồng bộ endpoint, chi phí xử lý packet, feature parity và phiên bản kernel là các câu hỏi khác nhau; phải đo cấu hình thật để so hiệu năng.

Sau khi biết cơ chế, có thể dùng bảng này để chọn bằng chứng:

| Hiện thực đang kiểm | Bằng chứng cần đọc | Bẫy cần tránh |
|---|---|---|
| kube-proxy iptables | config/log mode, rule NAT, tuple và conntrack | Nhầm rule chọn flow với round-robin từng HTTP request |
| kube-proxy IPVS | config/log mode, virtual service/destination, interface và rule phối hợp | Cho rằng mọi Service đều chỉ tồn tại trong iptables |
| kube-proxy nftables | config/log mode và native ruleset tương ứng | Suy mode từ `iptables --version` |
| Dataplane thay kube-proxy | config/agent/map và tài liệu của implementation | Tìm chain KUBE-SVC rồi coi không thấy là mạng hỏng |

### 3.7 Debug từ bên trong ra dây giữa node

Ghi rõ nơi phát request trước. Một curl trong Pod khác một curl trên node; chúng đi qua các namespace và hook khác nhau. Khi dùng `tcpdump -i any`, output có thể chứa nhiều bản quan sát của cùng packet, trước/sau encapsulation. Đếm dòng không tự bằng đếm request hay retransmission.

Tiếp theo tách endpoint nội bộ node và endpoint từ xa. Nếu cả hai không thông, kiểm app listen, port, policy và route từ client trước. Nếu chỉ endpoint từ xa lỗi, đối chiếu route, VTEP remote/FDB nếu triển khai dùng nó, underlay reachability và packet tunnel ở cả hai đầu. Nếu direct endpoint đều thông mà VIP lỗi, quay lại mapping và hook Service thay vì sửa tunnel.

**FDB** là bảng ánh xạ MAC tới cổng/đầu ra của cơ chế chuyển frame; với VXLAN có thể chứa thông tin remote VTEP tương ứng. Linux hỗ trợ học hoặc cấu hình tĩnh remote; [Linux VXLAN documentation](https://docs.kernel.org/networking/vxlan.html) mô tả quản lý interface và forwarding table. Lab dùng remote cố định, không đo học FDB đa node hay EVPN.

Kiểm policy cũng cần đúng lớp. NetworkPolicy chỉ có tác dụng nếu implementation hỗ trợ và thực thi; một kết nối bị drop không tự nói rule nào làm việc đó. Firewall underlay có thể chặn UDP/4789 trong khi ping node vẫn thông. Overlay IP route đúng nhưng outer route sai cũng không vận chuyển được packet.

Không dùng một lần thấy “bad udp cksum” trên interface ảo để kết luận gói hỏng trên đường truyền. Offload có thể để checksum được tính sau điểm capture. Trong lab, capture có nhãn checksum incorrect nhưng HTTP vẫn trả 200. Bài chỉ xác nhận hai quan sát cùng tồn tại; muốn kết luận nguyên nhân checksum phải so điểm bắt và trạng thái offload, hoặc capture đầu nhận. Xem lại net-01 về giới hạn của công cụ bắt gói.

## 4. Lab

### 4.1 Dựng hai VTEP thay vì dựng cả control plane

Chạy:

```sh
cd ~/projects/net-lab/net-27
./run.sh
cat out/run.txt
cat out/wire.txt
```

Script `run.sh` tạo container `net27-lab` có quyền quản trị mạng; `inside.sh` dựng hai namespace trong đó. Tên interface/namespace đều bắt đầu bằng `net27-`. Không sửa network namespace của host VM; container được dọn khi thoát.

Topology underlay là một cặp veth giữa A và B với IP `192.0.2.1/24`, `192.0.2.2/24`, MTU 1.500 mặc định của cặp link. Mỗi bên có interface VXLAN trỏ remote còn lại. Hai interface overlay nhận `10.27.0.1/24`, `10.27.0.2/24`, MTU 1.450. HTTP server Python listen port 8080 bên B.

Không có Kubernetes API, Pod sandbox, CNI executable hay kube-proxy thật trong phép thử này. Cái đã đo là primitive kernel được dùng để giải thích một đường triển khai: direct endpoint, Service-like DNAT và VXLAN. Muốn kết luận implementation cụ thể của cluster cần đo cluster ấy.

### 4.2 Giữ đường endpoint thông rồi thử VIP chưa có rule

Direct curl tới `10.27.0.2:8080` trả 200. Script thêm route tới VIP qua endpoint bên B để packet có đường ban đầu; route ấy không tự biến destination thành địa chỉ HTTP server. Trước DNAT, request VIP không nhận HTTP response nên curl in 000.

Bước này ngăn một phép thử sai khác: nếu namespace không có bất kỳ route nào tới VIP, traffic do local process tạo có thể không đi tới đường OUTPUT cần quan sát. Route ban đầu là điều kiện dựng mô hình local của bài, không phải lệnh cấu hình VIP production.

### 4.3 Thêm đúng ánh xạ, không thay tunnel

Lệnh cốt lõi trong `inside.sh`:

```sh
ip netns exec net27-a iptables -t nat -A OUTPUT \
  -d 10.96.0.27 -p tcp --dport 80 \
  -j DNAT --to-destination 10.27.0.2:8080
```

Sau lệnh ấy, VIP-AFTER trả 200 như output mở bài. Sự thay đổi có kiểm soát là rule DNAT; direct path đã thông từ trước. Vì vậy phép thử bác bỏ kết luận “VIP lỗi chắc chắn do overlay hỏng”, nhưng không chứng minh mọi lỗi VIP đều do thiếu rule.

### 4.4 Đọc outer và inner trong cùng capture

Script chạy tcpdump trên `net27-ua` ở namespace A, lọc UDP/4789 theo chiều nguồn `192.0.2.1`. Trích đoạn quyết định trong `out/wire.txt`:

```text
    192.0.2.1.32869 > 192.0.2.2.4789: [bad udp cksum 0x738b -> 0xd992!] VXLAN, flags [I] (0x08), vni 27
IP (tos 0x0, ttl 64, id 26956, offset 0, flags [DF], proto TCP (6), length 60)
    10.27.0.1.58678 > 10.27.0.2.8080: Flags [S], cksum 0x1467 (incorrect -> 0x7a6e), seq 3096301232, win 64860, options [mss 1410,sackOK,TS val 213328754 ecr 0,nop,wscale 7], length 0
```

Outer là UDP giữa hai đầu tunnel; inner là SYN TCP tới endpoint port 8080. VIP và port 80 đã không còn ở inner destination. Source port UDP 32869 và TCP 58678 là số đo của lần chạy này, không phải hằng số VXLAN hay Service; chạy lại có thể khác.

Trong file đầy đủ, outer IP length của gói SYN là 110, inner IP length 60: chênh 50 byte đúng phép tính overhead đang xét. Capture là bằng chứng độc lập với việc chỉ đọc cấu hình interface. Nó cũng cho thấy VXLAN không mã hoá inner IP/TCP header.

### 4.5 Chạm đúng ranh giới MTU

```text
MTU-OK
PING 10.27.0.2 (10.27.0.2) 1422(1450) bytes of data.
1430 bytes from 10.27.0.2: icmp_seq=1 ttl=64 time=0.147 ms
```

```text
MTU-TOO-BIG
ping: local error: message too long, mtu=1450
PING 10.27.0.2 (10.27.0.2) 1423(1451) bytes of data.
```

Trích `out/run.txt`, dùng iputils ping với `-M do`. Con số 1430 ở dòng hồi đáp là ICMP message gồm header ICMP và payload, còn 1450 trong ngoặc bao gồm thêm IPv4 header; chúng không mâu thuẫn. Thời gian 0,147 ms thuộc một echo trong VM, không đại diện độ trễ cluster production.

Payload tăng một byte vượt MTU local làm lỗi xuất hiện ngay tại phía gửi. Nếu muốn tái hiện blackhole, phải giữ MTU local cho phép packet, hạ giới hạn ở một chặng trung gian rồi quan sát phản hồi ICMP/PMTUD; đó là phép thử khác thuộc net-05, không được gắn tên vào output này.

> **Chưa đo.** Bài chưa chạy kube-proxy thật, nhiều backend, IPVS/nftables native mode, eBPF replacement, NetworkPolicy, rollout/draining hay hiệu năng xuyên máy vật lý. Đo tiếp trên cluster thử nghiệm bằng cấu hình mode, EndpointSlice, rule/map, conntrack và capture hai node tại cùng thời điểm; không dùng mô hình hai namespace để đưa số throughput cho Kubernetes.

## 5. Tính tay

Các số giả thiết được ghi ngay trong câu hỏi; số lấy từ lab được chỉ rõ. Tính lại bằng Python trong `out/calculations.txt`.

### 5.1 Đủ MTU khi thêm IPv6 bên ngoài không?

Giả sử underlay MTU 1.500, VXLAN và inner Ethernet như lab, nhưng outer IPv6 dùng header cơ sở 40 byte, không extension. Tổng overhead là `40 + 8 + 8 + 14 = 70` byte; inner IP tối đa `1.500 − 70 = 1.430` byte.

Nếu giữ overlay MTU 1.450, có một khoảng 20 byte mà inner packet local cho phép nhưng outer IP không vừa underlay theo giả thiết. Không khắc phục bằng việc đổi Service port: port không thay độ dài những header đang tính. Đây là suy luận theo kích thước header, chưa đo VXLAN outer IPv6 trong lab.

### 5.2 Ping payload lớn nhất ở MTU lab là bao nhiêu?

Overlay MTU đo/cấu hình trong lab là 1.450. Với inner IPv4 không options và ICMP echo header 8 byte, payload tối đa là `1.450 − 20 − 8 = 1.422`. Output đã xác nhận 1.422 đi được và 1.423 bị từ chối local.

Một ứng dụng có TCP options hoặc TLS record overhead sẽ có ngân sách application payload khác; không lấy 1.422 làm MSS hay kích thước HTTP body tối đa. TCP có thể chia một body qua nhiều segment.

### 5.3 Đếm connection hay đếm request khi cân bằng?

Giả sử có 2 endpoint, một client mở đúng một connection HTTP/2 và gửi 1.000 request trên đó. Giả sử dataplane chọn backend khi flow bắt đầu, không có L7 proxy tách connection và không reset/migrate flow. Cả 1.000 request đi vào backend đã được flow chọn; tỷ lệ request của client này có thể là 100%/0%.

Nếu mở 100 connection mới và chọn backend độc lập đều xác suất, kỳ vọng là 50 connection mỗi endpoint. “Kỳ vọng” không phải bảo đảm mỗi đợt chính xác 50/50; càng không bảo đảm chia đều byte hay CPU khi mỗi connection có lượng công việc khác nhau. Bài không đo phân bố nhiều backend.

## 6. Chuyển giao

1. DNS của Service trả VIP đúng, direct endpoint ở cùng node thông, endpoint từ xa timeout. Bạn cần capture interface nào ở hai node để phân biệt mất outer packet với lỗi sau decapsulation?
2. Sau khi endpoint cũ bị rút, client cũ vẫn gọi vào nó trong khi curl mở connection mới tới endpoint mới. Hãy nêu bằng chứng cần có trước khi quy lỗi đồng bộ kube-proxy.
3. `iptables --version` in nf_tables nhưng cấu hình agent là iptables mode. Vì sao hai quan sát cùng đúng, và bạn sẽ đọc cấu trúc rule nào?
4. Underlay ping thông, UDP/4789 bị firewall chặn. Dự đoán direct endpoint cùng node và khác node sẽ khác nhau thế nào nếu implementation chỉ tunnel traffic xuyên node?
5. Service TCP/80 không ping được nhưng curl được. Chỉ từ hai quan sát ấy, có cần thêm ICMP rule hay không, và hợp đồng nào quyết định câu trả lời?
6. Một cluster vừa đổi CNI, dùng eBPF thay kube-proxy, vẫn có connection cũ và đang rollout. Chỉ một nhóm client bị timeout khi payload lớn, capture node có packet dài hơn MTU danh nghĩa. Hãy thiết kế chuỗi phép đo phân biệt offload, MTU, state cũ và policy mà không xoá conntrack hay restart toàn cụm.

Câu cuối không có đáp án hoàn chỉnh trong bài; cần ghép kiểm soát biến, điểm bắt gói và state của implementation thật.

## 7. Tóm tắt

- CNI thiết lập mạng endpoint; Service agent đồng bộ ánh xạ; kernel thực thi đường gói theo cấu hình và state.
- Direct endpoint thông nhưng VIP lỗi là lý do kiểm mapping/hook, không đủ kết luận overlay hỏng.
- Trong lab, VIP 10.96.0.27:80 được đổi thành 10.27.0.2:8080 trước khi đóng gói VXLAN.
- Capture phân biệt outer 192.0.2.1 → 192.0.2.2 với inner 10.27.0.1 → 10.27.0.2; VXLAN không tự mã hoá nội dung.
- Với bộ header IPv4/VXLAN không tag đang xét, overhead 50 byte để lại overlay MTU 1.450 trên underlay 1.500.
- Mode của kube-proxy phải xác nhận từ cấu hình và dataplane; nhãn nf_tables của binary iptables không phải bằng chứng của native nftables mode.

→ **Bài 28 — Mạng cloud dưới nắp**: từ tunnel do mình dựng chuyển sang dataplane do cloud quản lý, nơi route, security group và hành vi broadcast không thể suy trực tiếp từ một Linux bridge.
