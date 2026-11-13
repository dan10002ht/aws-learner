# Bài 30 — Capstone: dựng lại sáu sự cố trong một lab

## 1. Mục tiêu

Sau bài này bạn có thể:

- Từ một request timeout, chọn phép thử phân biệt lỗi kích thước gói, state, DNS, hàng đợi hay định tuyến.
- Đặt capture ở đúng chiều và đúng interface để tìm ranh giới cuối cùng còn thấy gói.
- Chứng minh conntrack đầy bằng count/max và thất bại cấp phát, thay vì chỉ đếm kết nối ứng dụng.
- Tách SYN queue khỏi accept queue bằng trạng thái socket, counter và một thay đổi có kiểm soát.
- Đối chiếu chiều reply với reverse lookup và đối chiếu đường BGP được chọn với chính sách xuất route.
- Viết một kết luận sự cố có triệu chứng, bằng chứng, nguyên nhân, bản sửa và phép đo lại cùng điều kiện.

## 2. Triệu chứng

Một API trong lab có lúc trả header HTTP 200 rồi treo, có lúc không kết nối được, có lúc tên mới tạo vẫn báo không tồn tại. Khởi động lại ứng dụng có thể làm một lượt thử chạy được, nhưng không giải thích vì sao lượt tiếp theo lại lỗi. Bạn nhận đúng một hệ thống và sáu lượt thay đổi cấu hình; mỗi lượt chỉ bật một nhóm lỗi, rồi đưa hệ thống về trạng thái gốc trước lượt tiếp theo.

Ở lượt đầu, `/small` tải đủ **2 byte**. `/large` nhận HTTP 200 nhưng tới hạn vẫn tải **0/8.192 byte** body. Ở lượt khác, cùng client và server, UDP dùng source port cũ nhận reply còn source port mới timeout. Hai triệu chứng đều dễ bị ghi thành “backend chậm”, nhưng sửa cùng một timeout sẽ không loại được cả hai nguyên nhân.

> **Đo trên lab.** Các số trên thuộc `net-30/out/01-mtu.txt` và `02-conntrack.txt`: Docker Alpine 3.20, Linux `6.8.0-64-generic`, aarch64 trên Colima. Lệnh chạy lại là `./run.sh` trong thư mục `net-lab/net-30`. `out/environment.txt` lưu image ID và phiên bản package. Đây là các phép thử lỗi có chủ đích, không phải thống kê request production.

**Bản sai để thử trước:** “ping được và service còn listen thì chỉ cần tăng timeout, restart app”. Giữ bản chẩn đoán ấy tới hết ca đầu. Bạn cần chỉ ra phép đo nào bác bỏ nó, không chỉ nhớ tên lỗi.

## ⏸ Dừng lại — đoán trước #1

Client nhận được status HTTP 200, sau đó hết thời gian khi body vẫn rỗng. Trước khi sửa server, bạn chọn phép thử nào?

- (a) Tăng timeout vì status 200 đã chứng minh mạng chuyển được toàn bộ response.
- (b) So request nhỏ/lớn trên cùng đường, bắt gói chiều server → client và kiểm phản hồi ICMP về server.
- (c) Flush DNS vì mọi timeout sau HTTP header đều do TTL.
- (d) Đếm TIME_WAIT rồi giảm `tcp_fin_timeout`.

Chọn trước khi xem mục 4.2. Đừng mở script lỗi đó để tìm đáp án trước khi bạn đã ghi một dự đoán cùng điểm đặt probe.

## 3. Cơ chế

### 3.1 Cơ chế đã học trở thành các giả thuyết cạnh tranh

Dùng quy trình từ [[net-29-debug-khoanh-vung]]: nêu giả thuyết, dự đoán dấu hiệu, thay ít biến nhất rồi đo lại.

Capstone không giảng lại encapsulation, CIDR hay bắt tay TCP/TLS; các nền ấy nằm ở [[eng-osi-model]], [[eng-02-cidr-subnetting]], [[eng-03-tcp-tls]] và [[intro-02-networking]]. Các liên kết dưới đây dùng để quay lại đúng cơ chế khi bằng chứng yêu cầu, không phải danh sách phải đọc lại từ đầu.

**Fault injection là việc chủ động tạo một lỗi có phạm vi và điều kiện biết trước để kiểm cách phát hiện, sửa và đo lại.** Trong bài này, mỗi script dựng lại cùng topology, bật lỗi, in triệu chứng, thu bằng chứng, thay đúng cấu hình gây lỗi và lặp lại probe. Chạy tự động giúp kiểm tính tái lập; chạy có điểm dừng giúp tập chẩn đoán. Hai cách dùng chung script và log.

Câu hỏi đầu không phải “đang ở tầng mấy?” mà là “phép thử vừa thành công đã yêu cầu hệ thống làm được điều gì?”. Ping nhỏ chỉ thử một loại gói nhỏ. TCP connect chỉ thử bắt tay. Status HTTP chứng minh phần header đã tới client; không chứng minh mọi byte body đã tới. Một flow cũ thành công chưa yêu cầu cấp phát state mới. Một query DNS mới chưa chắc hỏi authoritative vì resolver có quyền trả cache.

**Tuple** ở đây là giao thức, IP/port nguồn và IP/port đích của flow. Giữ các trường ấy khi đối chứng, chỉ đổi biến cần thử.

Sau khi đã có quan hệ nhân quả, bảng sau là bản đồ tra lại:

| Dấu phân biệt cần tìm | Cơ chế cần gọi lại | Bài nền |
|---|---|---|
| Nhỏ qua, lớn lặp byte nhưng không tiến | PMTU và phản hồi ICMP về đúng bên gửi | [[net-05-mtu-pmtud]] |
| Flow cũ qua, flow mới không có state | Cấp phát conntrack, khác cạn tuple NAT | [[net-07-nat-conntrack]] |
| Authority mới, recursive cũ hoặc NXDOMAIN | Hạn cache dương và cache phủ định | [[net-20-dns-phan-giai]], [[net-21-dns-van-hanh]] |
| Connect timeout nhưng process vẫn listen | SYN queue hoặc accept queue | [[net-16-tcp-ben-trong]], [[net-18-dong-ket-noi]] |
| Reply tới máy nhưng không được chuyển tiếp | Chiều về và kiểm reverse path | [[net-06-routing-forwarding]] |
| Prefix đúng origin nhưng đi qua customer | Phạm vi export route | [[net-14-bgp-hijack-leak-rpki]] |

### 3.2 Một topology, các điểm quan sát cố định

**Network namespace là một ngăn mạng Linux có interface, route, socket và phần state mạng riêng.** Lab dùng một container `net30-lab` chứa năm namespace: C, R1, R2, R3, S. Docker chỉ cung cấp môi trường Linux và quyền dựng mạng; các dây nối bên trong là veth do script tạo. Không publish port ra host. Sau cài package, runner ngắt network Docker dùng tải package; traffic thí nghiệm không có đường ra Internet.

C nằm ở `10.30.1.2`, S ở `10.30.2.2`. Đường gốc là C → R1 → R2 → S. R3 tạo nhánh R1 → R3 → R2 dùng cho hai ca định tuyến. Resolver và authoritative DNS chạy trong S, tách bằng port, không thay `/etc/resolv.conf` của host. Các địa chỉ, subnet và ASN dưới đây là **cấu hình lab**, không phải dữ liệu phát hiện từ Internet.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 335" role="img" aria-labelledby="net30-topo-t net30-topo-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net30-topo-t">Topology dùng chung</title>
<desc id="net30-topo-d">Năm namespace nối bằng veth. Đường ngang R1 R2 là đường gốc; R3 ở trên tạo đường thay thế hình tam giác.</desc>
<defs><marker id="net30-topo-a" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7z" fill="currentColor"/></marker></defs>
<path d="M70 220 L140 220" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net30-topo-a)"/>
<path d="M200 220 L320 220" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net30-topo-a)"/>
<path d="M380 220 L450 220" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net30-topo-a)"/>
<path d="M190 198 L243 92" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net30-topo-a)"/>
<path d="M278 91 L332 198" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net30-topo-a)"/>
<circle cx="40" cy="220" r="29" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="40" y="225" text-anchor="middle" font-size="16" fill="currentColor">C</text><text x="40" y="270" text-anchor="middle" font-size="13" fill="currentColor">10.30.1.2</text>
<circle cx="170" cy="220" r="29" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="170" y="225" text-anchor="middle" font-size="16" fill="currentColor">R1</text><text x="170" y="270" text-anchor="middle" font-size="13" fill="currentColor">10.30.1.1</text>
<circle cx="350" cy="220" r="29" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="350" y="225" text-anchor="middle" font-size="16" fill="currentColor">R2</text><text x="350" y="270" text-anchor="middle" font-size="13" fill="currentColor">10.30.2.1</text>
<circle cx="480" cy="220" r="29" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="480" y="225" text-anchor="middle" font-size="16" fill="currentColor">S</text><text x="480" y="270" text-anchor="middle" font-size="13" fill="currentColor">10.30.2.2</text>
<circle cx="260" cy="65" r="29" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="260" y="70" text-anchor="middle" font-size="16" fill="currentColor">R3</text>
<text x="260" y="20" text-anchor="middle" font-size="13" fill="currentColor">10.30.13.3 / 10.30.23.3</text>
<text x="260" y="207" text-anchor="middle" font-size="13" fill="currentColor">direct</text>
<text x="139" y="132" text-anchor="middle" font-size="13" fill="currentColor">peer</text>
<text x="365" y="132" text-anchor="middle" font-size="13" fill="currentColor">up2</text>
<text x="260" y="309" text-anchor="middle" font-size="15" fill="currentColor">Gốc: C → R1 → R2 → S</text>
</svg>

Mỗi script gọi `reset` trước khi bật lỗi: dừng process trong namespace của lab, xoá các namespace ấy, tạo lại dây, route và service. Vì thế MTU học từ ca trước, conntrack cũ hay qdisc trễ không được mang sang ca sau. Đây là **một bộ lab với một topology chung**, không phải sáu kết quả nhặt từ các bài cũ. Chạy từng ca nối tiếp; không chạy hai script cùng lúc trên cùng container.

### 3.3 Giữ bằng chứng trước khi tác động vào state

> **Suy luận.** Thay một biến rồi thấy probe hồi phục tăng sức mạnh của kết luận trong topology kiểm soát này. Nó không chứng minh mọi timeout ngoài đời cùng triệu chứng đều có cùng nguyên nhân. Muốn chuyển kết luận sang hệ khác phải lặp lại dấu phân biệt và kiểm những biến đang được giữ cố định ở đây.

Counter cần đọc trước–sau theo cùng phạm vi; capture ingress chưa chứng minh stack đã chấp nhận gói. Đo lại đúng tác vụ từng lỗi, không dùng ping thay cho việc tải đủ body.

## 4. Lab

### 4.1 Dựng và chọn cách tập

Bộ script nằm trong `~/projects/net-lab/net-30/`. Chạy tất cả, lưu log rồi tự dọn:

```bash
cd ~/projects/net-lab/net-30
./run.sh
cat out/verification.txt
```

Runner tạo đúng container có tiền tố `net30-`, cài công cụ, chạy sáu script nối tiếp và xoá container khi thoát kể cả lỗi. `src/` giữ tài liệu nguồn đã tải; `out/` giữ stdout, capture và môi trường; `work/` chứa cấu hình sinh lại. Không dùng `docker system prune`, không restart Colima và không xoá container của bài/lane khác.

Muốn tự khoanh vùng, dựng một lần rồi chọn một ca; ví dụ:

```bash
./run.sh up
docker exec -it -e PAUSE=1 net30-lab bash /lab/01-mtu.sh
# Sau buổi tập:
./run.sh down
```

`PAUSE=1` giữ lỗi ở điểm dừng trước phần xác nhận/sửa; dùng terminal khác để thăm dò. Với DNS, điểm dừng làm thời gian trôi nên cache ngắn có thể đã hết hạn trước khi bạn hỏi: hãy đọc snapshot vừa ghi, hoặc chạy lại ca để lấy cửa sổ mới. Không giả vờ rằng dừng thao tác cũng dừng đồng hồ DNS. Với ca queue, điểm dừng nằm sau triệu chứng SYN queue; phần accept queue chạy tiếp sau khi bạn Enter.

Định nghĩa một lệnh tắt trên host để những lệnh dưới đây không phải lặp cả tiền tố:

```bash
n() { docker exec net30-lab ip netns exec net30-"$@"; }
n r1 ip route
```

Lab cần Docker Linux có `--privileged` để tạo namespace/veth và cấu hình firewall. Conntrack có chặn cứng nếu giới hạn hiện tại vượt 300.000 entry; trường hợp ấy dùng VM riêng có ngân sách phù hợp, không hạ giới hạn kernel đang phục vụ việc khác. Con số này là ngân sách của script, không phải giới hạn Linux.

### 4.2 Sự cố 1 — HTTP 200 rồi body đứng yên

**Triệu chứng người dùng:** response nhỏ thành công, tải lớn treo dù đã nhận status. Lỗi được bật bằng cách đặt MTU đoạn `direct` thành 1.280 và chặn ICMP fragmentation-needed phát từ router. Hai endpoint vẫn có MTU 1.500. Chỉ xem triệu chứng trước, chưa xem counter:

```bash
docker exec net30-lab bash /lab/01-mtu.sh
```

Các dòng quyết định từ `out/01-mtu.txt`:

```text
http=200 bytes=2
http=200 bytes=0
curl_exit=28
```

Đáp án hộp #1 là **(b)**. Body không tiến triển không đồng nghĩa handler chưa tạo body: S có thể đã gửi mà các gói chứa body không qua được. Bản sai “HTTP 200 nên mạng ổn” thất bại vì phần header và phần body tạo ra những yêu cầu kích thước khác nhau trên đường.

```bash
n r2 ip link show direct
n r2 iptables -nvL OUTPUT
rg 'length 1500|ICMP|seq 116:|seq 1:' out/01-wire.txt
```

**Xác nhận.** Trong log, interface `direct` có `mtu 1280`; luật DROP bắt `icmptype 3 code 4` tăng số gói. `out/01-wire.txt` chứa các gói DF dài 1.500 tới R2 và cùng vùng sequence được gửi lại. Counter luật tăng là bằng chứng phản hồi bị chặn, không phải chỉ thiếu ICMP trong một capture đặt sai chiều.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 375" role="img" aria-labelledby="net30-mtu-t net30-mtu-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="net30-mtu-t">Header tới, body bị chặn, phản hồi được sửa</title>
<desc id="net30-mtu-d">Các endpoint giữ vị trí cố định. Gói lớn mất và phản hồi chặn biến mất khi ICMP được phép quay về S.</desc>
<defs><marker id="net30-mtu-a" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7z" fill="currentColor"/></marker></defs>
<rect x="17" y="22" width="86" height="40" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="60" y="48" text-anchor="middle" font-size="16" fill="currentColor">C</text><path d="M60 62 V350" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><rect x="197" y="22" width="86" height="40" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="240" y="48" text-anchor="middle" font-size="16" fill="currentColor">R1</text><path d="M240 62 V350" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><rect x="377" y="22" width="86" height="40" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="420" y="48" text-anchor="middle" font-size="16" fill="currentColor">R2</text><path d="M420 62 V350" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><rect x="557" y="22" width="86" height="40" rx="5" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="600" y="48" text-anchor="middle" font-size="16" fill="currentColor">S</text><path d="M600 62 V350" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><text x="330" y="85" text-anchor="middle" font-size="14" fill="currentColor">direct: MTU 1280 · hai đầu: MTU 1500</text><g data-step="1">
<path d="M600 120 L60 120" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#net30-mtu-a)"/><text x="330" y="110" text-anchor="middle" font-size="14" fill="currentColor">Header nhỏ tới C</text>
</g><g data-step="2" data-until="2">
<path d="M600 170 L420 170" fill="none" stroke="#f43f5e" stroke-width="2" marker-end="url(#net30-mtu-a)"/><text x="510" y="158" text-anchor="middle" font-size="14" fill="currentColor">IP 1500 · DF</text><path d="M420 210 L490 210" fill="none" stroke="#f43f5e" stroke-width="2" marker-end="url(#net30-mtu-a)"/><text x="515" y="235" text-anchor="middle" font-size="13" fill="currentColor">ICMP bị chặn</text><path d="M600 265 L420 265" fill="none" stroke="#f43f5e" stroke-width="2" marker-end="url(#net30-mtu-a)"/><text x="510" y="253" text-anchor="middle" font-size="13" fill="currentColor">gửi lại vẫn mất</text>
</g><g data-step="3">
<path d="M420 210 L600 210" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#net30-mtu-a)"/><text x="510" y="195" text-anchor="middle" font-size="13" fill="currentColor">ICMP về nguồn</text>
</g><g data-step="4">
<path d="M600 310 L60 310" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#net30-mtu-a)"/><text x="330" y="299" text-anchor="middle" font-size="14" fill="currentColor">Nguồn gửi gói vừa MTU → đủ 8192 byte</text>
</g>
</svg>
<step-note data-step="1">Header đi qua chưa thử hết kích thước của body.</step-note>
<step-note data-step="2">R2 bỏ gói DF quá MTU; chặn ICMP làm nguồn không học được giới hạn.</step-note>
<step-note data-step="3">Gỡ đúng luật OUTPUT để thông báo tới nguồn S.</step-note>
<step-note data-step="4">S hạ PMTU; cùng body tải đủ, không thay ứng dụng.</step-note>
</step-flow>

**Sửa và đo lại.** Script gỡ chính luật trên R1/R2, giữ nguyên server, đường và kích thước body rồi mở request mới. Kết quả thật:

```text
http=200 bytes=8192
    cache expires 599sec mtu 1280
```

> **Đo trên lab.** `out/01-mtu.txt`, `01-wire.txt`: nguồn S được đặt `tcp_mtu_probing=0`, tắt TSO/GSO/GRO trên veth, topology tạo mới trước ca. Những điều kiện ấy tránh một cơ chế dò hoặc state đã học che mất lỗi. `cache expires` là tuổi còn lại tại lúc chụp, có thể khác khi chạy lại. [RFC 1191](https://www.rfc-editor.org/rfc/rfc1191.txt) là nguồn quy tắc phản hồi PMTU; lab này đo HTTP thường để cô lập kích thước, không lặp lab certificate/TLS của bài 5.

### 4.3 Sự cố 2 — flow cũ sống, flow mới timeout

**Triệu chứng người dùng:** một client đang dùng dịch vụ tiếp tục chạy, một client mở flow mới thì timeout. API phụ thuộc UDP cũng có thể biểu hiện thành request ứng dụng đứng chờ; lab dùng UDP echo để quan sát trực tiếp đường state mà không thêm retry của thư viện.

## ⏸ Dừng lại — đoán trước #2

Giữ IP đích, port đích và payload; chỉ đổi source port. Flow cũ có reply, flow mới không có reply. Bạn chọn cặp bằng chứng nào trước khi tăng số worker?

- (a) CPU ứng dụng và số thread, vì flow cũ thành công đã loại mọi lỗi trên router.
- (b) Conntrack count/max tại router cùng chênh counter drop và một probe cấp phát flow mới.
- (c) TTL DNS và serial SOA, dù cả hai probe dùng IP trực tiếp.
- (d) Tổng TIME_WAIT tại client, dù thí nghiệm dùng UDP.

**Xác nhận.** Đáp án **(b)**. Chạy `02-conntrack.sh`; script giữ một flow UDP thật, đợi để flow ấy thành ASSURED, rồi nạp state tổng hợp qua ctnetlink — API netlink của Linux để quản lý conntrack. **ASSURED là trạng thái conntrack đánh dấu flow đã đạt điều kiện bảo đảm của tracker; ở phép thử này các state tổng hợp được đặt cờ đó để tránh bị dọn sớm khi cần chỗ.** Đây không phải số đo TCP socket hay cạn port SNAT.

Output thật ở `out/02-conntrack.txt`, trích các dòng trước khi sửa:

```text
sport=12000 reply=probe
sport=12001 TIMEOUT
net.netfilter.nf_conntrack_count = 262144
net.netfilter.nf_conntrack_max = 262144
```

Trong cùng log, `conntrack -S` có CPU tăng `drop=1`; lệnh nạp state báo không cấp phát thêm được. Bạn có thể đọc đúng hai tài nguyên bằng:

```bash
n r1 sysctl net.netfilter.nf_conntrack_count \
  net.netfilter.nf_conntrack_max
n r1 conntrack -S
n r1 conntrack -L -p udp --sport 12000
```

**Phạm vi phép thử.** Các state tổng hợp dùng nguồn `198.18.0.0/16`, đích `198.19.0.1`, không phát hàng trăm nghìn packet ra mạng. Script đọc trần hiện tại và nạp bảng của namespace R1, không ghi `nf_conntrack_max` hay thay hash table dùng chung. Giới hạn đo được là 262.144 entry; đây không phải con số mặc định bảo đảm cho mọi Linux. Bộ nhớ kernel vẫn là tài nguyên của VM; namespace không biến một tải vô hạn thành an toàn.

**Sửa và đo lại.** Script dừng nạp rồi xoá đúng state tổng hợp bằng bộ lọc nguồn, không flush mọi flow. Phần cuối log:

```text
sport=12001 reply=probe
net.netfilter.nf_conntrack_count = 2
net.netfilter.nf_conntrack_max = 262144
```

Flow mới đã nhận reply, trần không đổi. Xoá theo dải chỉ hợp lệ vì dải đó được dành cho fault injection; production phải xử lý nguồn tạo state và tính ngân sách bộ nhớ.

> **Nguồn.** [Linux conntrack sysctl](https://docs.kernel.org/networking/nf_conntrack-sysctl.html) định nghĩa count là *“Number of currently allocated flow entries.”* **Đo trên lab:** bảng thật bão hoà với state được nạp nhân tạo, có probe qua mạng trước–sau. **Chưa đo:** tốc độ tạo flow từ lưu lượng thực, chi phí CPU theo throughput và thời gian tự hết hạn. Không dùng thời gian nạp ctnetlink làm benchmark router.

### 4.4 Sự cố 3 — đổi IP rồi, tên mới vẫn không tồn tại

**Triệu chứng người dùng:** `api.lab.test` tiếp tục dẫn tới IP cũ; `new.lab.test` vừa tạo vẫn NXDOMAIN. **NXDOMAIN là mã phản hồi DNS nói tên được hỏi không tồn tại**, khác timeout không có phản hồi. Lượt lỗi làm ấm cả cache dương cho tên đang có và cache phủ định cho tên chưa có, rồi sửa authoritative.

## ⏸ Dừng lại — đoán trước #3

Hỏi thẳng authoritative thấy cả hai tên trỏ `.2`. Qua recursive, một tên còn `.3`, tên kia NXDOMAIN. Bạn chọn hành động nào?

- (a) Tăng SOA serial liên tục để buộc recursive bỏ mọi cache.
- (b) So TTL của answer cũ và SOA trong negative answer, giữ hai đích phục vụ rồi kiểm lại qua chính resolver ấy sau hạn cũ.
- (c) Restart web server vì recursive không có quyền giữ câu trả lời phủ định.
- (d) Đợi đúng TTL 2 giây vừa mới đặt, bất kể cache đã nhận gì trước đó.

**Xác nhận.** Đáp án **(b)**. `03-dns.sh` chạy BIND authoritative ở port `5300` và Unbound recursive ở `5353` trong S; authoritative ở đây là server có thẩm quyền với zone lab, recursive là bên giữ cache và trả kết quả cho client. Không dựng lại root/TLD; phần ấy nằm ở [[net-20-dns-phan-giai]]. Hỏi hai vai từ cùng namespace:

```bash
n s dig @127.0.0.1 -p 5300 api.lab.test A +norecurse
n s dig @127.0.0.1 -p 5353 api.lab.test A
n s dig @127.0.0.1 -p 5353 new.lab.test A
```

Các dòng answer/SOA nguyên văn trong `out/03-dns.txt`, theo nhãn `PRIME positive`, `AUTHORITY updated`, `FAULT positive old`, `FAULT negative old`:

```text
api.lab.test.          12 IN A 10.30.2.3
api.lab.test.           2 IN A 10.30.2.2
api.lab.test.          10 IN A 10.30.2.3
lab.test.              6 IN SOA ns.lab.test. hostmaster.lab.test. 1 60 60 600 8
```

```text
api.lab.test.           2 IN A 10.30.2.2
new.lab.test.           2 IN A 10.30.2.2
```

Tên từng NXDOMAIN nay trả NOERROR. Cache cũ nhận TTL 12 không bị TTL mới 2 thu hồi; cache phủ định khởi đầu 8. Cutover phải chờ các hạn cũ và giữ đích cũ phục vụ; xem [[net-21-dns-van-hanh]]. Trong vận hành, sửa kế hoạch cutover: hạ TTL đủ sớm, chờ dữ liệu cũ đã phát hết hạn theo điều kiện hệ thống, giữ đích cũ phục vụ, tính cả negative cache khi chuẩn bị tên mới. Flush resolver do mình quản lý có thể giúp một nhóm client, nhưng không chứng minh resolver khác đã đổi dữ liệu. Các điều kiện serve-stale và connection pool đã ở [[net-21-dns-van-hanh]].

> **Nguồn.** [RFC 2308 §5](https://www.rfc-editor.org/rfc/rfc2308.txt) dùng hạn từ *“minimum of the MINIMUM field of the SOA record and the TTL of the SOA itself”*. **Đo trên lab:** `serve-expired: no`, `prefetch: no`, `cache-min-ttl: 0`; không flush giữa hai lượt. **Chưa đo:** app cache riêng và socket pool. Hai query DNS xanh chưa cho phép kết luận mọi kết nối tới IP cũ đã biến mất.

### 4.5 Sự cố 4 — process listen nhưng kết nối mới không vào được

**Triệu chứng người dùng:** port còn LISTEN, health check cũ có thể tiếp tục dùng socket đã mở, nhưng kết nối mới timeout. `04-queues.sh` dựng hai pha riêng: thiếu chỗ cho handshake đang dở và thiếu chỗ cho kết nối đã hoàn tất chờ ứng dụng nhận. **SYN queue là nơi giữ yêu cầu kết nối chưa hoàn tất handshake; accept queue là nơi giữ kết nối đã hoàn tất chờ ứng dụng gọi `accept()`.**

## ⏸ Dừng lại — đoán trước #4

`ss -lnt` thấy LISTEN `Recv-Q=0`, nhưng `ss state syn-recv` đếm được các kết nối chưa hoàn tất và `TCPReqQFullDrop` tăng. Có nên kết luận accept queue đầy và chỉ tăng backlog ứng dụng?

- (a) Có, mọi queue của TCP đều hiện trong Recv-Q của listener.
- (b) Không; cần phân biệt request queue trước handshake với queue chờ accept, rồi thử lại việc mở kết nối mới.
- (c) Không, vì LISTEN chứng minh TCP luôn nhận được thêm kết nối.

**Pha SYN — xác nhận.** Đáp án **(b)**. Script gửi đúng 256 SYN từ C tới port `8081`, đồng thời chặn RST của C để các SYN-ACK không tự dọn request giả. Đây là lưu lượng có giới hạn giữa hai namespace lab. S đặt `tcp_syncookies=0` cho pha tạo lỗi; listener gọi `listen(8)` và vẫn chạy vòng accept.

```bash
n s ss -Hnt state syn-recv '( sport = :8081 )'
n s ss -lnt '( sport = :8081 )'
n s nstat -az | rg 'TCPReqQFull|Listen|SyncookiesSent'
```

Từ `out/04-queues.txt`, lấy snapshot sau lỗi:

```text
port=8081 TIMEOUT
9
LISTEN 0      8            0.0.0.0:8081      0.0.0.0:*
TcpExtTCPReqQFullDrop           248                0.0
```

Dòng `9` là số dòng SYN-RECV, không phải số byte hoặc thời gian. `04-syn-recv.txt` giữ chín tuple thật. `Recv-Q=0` của listener cho thấy không có hàng kết nối hoàn tất đang chờ accept ở snapshot ấy; nó không hứa SYN queue còn chỗ. Giá trị `listen(8)` không nên được diễn giải thành định luật “Linux chỉ giữ đúng tám SYN” trên mọi kernel.

**Pha SYN — nguyên nhân, giảm tác động, đo lại.** Request queue giữ các handshake giả chưa xong; các SYN mới bị loại khi không cấp thêm request state. Script dừng nguồn tạo SYN và bật lại `tcp_syncookies=1`. **SYN cookie là cơ chế dự phòng mã hoá thông tin cần thiết vào SYN-ACK để có thể xử lý một số handshake mà không giữ request state theo cách thông thường.** Cùng probe mới sau đổi cấu hình:

```text
net.ipv4.tcp_syncookies = 1
port=8081 connect=OK data=OK
TcpExtSyncookiesSent            1                  0.0
```

Đây là đo giảm tác động trong điều kiện SYN queue đang chịu lỗi. Không gọi cookies là bản sửa cho ứng dụng ngừng accept; nguồn gây handshake dở vẫn phải được chặn/giới hạn phù hợp. Script chỉ tắt cookies để dựng lỗi có kiểm soát, không khuyên tắt trên server thật.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 335" role="img" aria-labelledby="net30-queue-t net30-queue-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net30-queue-t">Hai hàng đợi không cùng điểm nghẽn</title>
<desc id="net30-queue-d">Hàng trên có chín yêu cầu dở ở port 8081, accept rỗng. Hàng dưới có ba kết nối hoàn tất ở port 8082 và đường accept bị chặn.</desc>
<defs><marker id="net30-queue-a" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7z" fill="currentColor"/></marker></defs>
<text x="260" y="25" text-anchor="middle" font-size="16" fill="currentColor">Hai listener riêng, hai snapshot lỗi</text><text x="260" y="60" text-anchor="middle" font-size="14" fill="currentColor">8081: handshake dở, SYN-RECV = 9</text><circle cx="65" cy="100" r="16" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><circle cx="111" cy="100" r="16" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><circle cx="157" cy="100" r="16" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><circle cx="203" cy="100" r="16" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><circle cx="249" cy="100" r="16" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><circle cx="295" cy="100" r="16" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><circle cx="341" cy="100" r="16" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><circle cx="387" cy="100" r="16" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><circle cx="433" cy="100" r="16" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="260" y="145" text-anchor="middle" font-size="13" fill="currentColor">Accept Recv-Q = 0 · TCPReqQFullDrop tăng</text><text x="260" y="195" text-anchor="middle" font-size="14" fill="currentColor">8082: handshake xong, chưa accept</text><rect x="133" y="216" width="65" height="35" rx="4" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor"/><text x="165" y="239" text-anchor="middle" font-size="14" fill="currentColor">1</text><rect x="218" y="216" width="65" height="35" rx="4" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor"/><text x="250" y="239" text-anchor="middle" font-size="14" fill="currentColor">2</text><rect x="303" y="216" width="65" height="35" rx="4" fill="#f43f5e" fill-opacity="0.15" stroke="currentColor"/><text x="335" y="239" text-anchor="middle" font-size="14" fill="currentColor">3</text><path d="M371 233 L470 233" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#net30-queue-a)"/><text x="435" y="215" text-anchor="middle" font-size="13" fill="currentColor">accept()</text><path d="M390 222 L410 244 M410 222 L390 244" stroke="#f43f5e" stroke-width="2"/><text x="260" y="285" text-anchor="middle" font-size="14" fill="currentColor">Recv-Q = 3 · backlog cấu hình = 2</text><text x="260" y="311" text-anchor="middle" font-size="14" fill="currentColor">Mở gate → accept rút queue về 0</text>
</svg>

**Pha accept — xác nhận.** Port `8082` dùng `listen(2)` nhưng vòng accept bị giữ tại một gate do lab đặt. Tám lần thử connect có ba lần báo OK, năm lần timeout. Snapshot và counter thật:

```text
LISTEN 3      2            0.0.0.0:8082      0.0.0.0:*
TcpExtListenOverflows           5                  0.0
TcpExtListenDrops               253                0.0
```

`ListenDrops=253` là tổng namespace đã tích luỹ qua cả hai pha; **không phải 253 kết nối bị accept queue bỏ**. Trước pha accept giá trị là 248, nên tăng thêm 5. Tương tự, đừng biến `Recv-Q=3` khi backlog cấu hình 2 thành “đã chứng minh mọi kernel cho backlog+1”; hãy báo đúng snapshot của kernel này.

**Pha accept — nguyên nhân, sửa, đo lại.** Kết nối hoàn tất dồn lại vì ứng dụng không lấy ra khỏi queue. Tăng timeout phía client không làm process gọi accept. Script mở gate bằng `touch /lab/work/accept-now`, giữ backlog bằng 2. Probe mới nhận dữ liệu và queue trở về rỗng:

```text
port=8082 connect=OK data=OK
LISTEN 0      2            0.0.0.0:8082      0.0.0.0:*
```

> **Nguồn.** [listen(2)](https://man7.org/linux/man-pages/man2/listen.2.html) phân biệt queue hoàn tất với request đang dở. [Linux IP sysctl](https://docs.kernel.org/networking/ip-sysctl.html) mô tả cookies là *“fallback facility”*. **Đo trên lab:** một namespace mới, hai listener, counter trước–sau trong `04-queues.txt`. Không ngoại suy 256 SYN của lab thành ngưỡng chịu SYN flood của một server thật.

### 4.6 Sự cố 5 — thấy reply vào router mà client vẫn timeout

**Triệu chứng người dùng:** C không connect được API dù tcpdump trên R1 nhìn thấy SYN-ACK từ S. Script giữ chiều đi C → R1 → R2 → S nhưng đổi route về C tại R2 qua R3. R1 vẫn có route tốt nhất về S qua cổng `direct`; reply lại vào cổng `peer`.

## ⏸ Dừng lại — đoán trước #5

R1 bắt được SYN-ACK ở `peer`, nhưng reverse lookup tới source S chọn `direct`. `all.rp_filter=0`, `peer.rp_filter=1`. Dấu nào nên kiểm trước khi sửa application firewall ở S?

- (a) Cơ chế kiểm đường ngược tại interface ingress trên R1 và counter loại tương ứng.
- (b) TTL DNS tại C, dù request đã dùng IP trực tiếp.
- (c) Certificate hết hạn, dù TCP chưa hoàn tất.

**Xác nhận.** Đáp án **(a)**. `rp_filter` là cơ chế Linux kiểm tính phù hợp của đường ngược tới nguồn gói; strict mode yêu cầu interface đến khớp đường ngược tốt nhất, loose mode chỉ đòi nguồn có đường tới theo phép kiểm áp dụng. Không thể suy từ bảng route chiều đi rằng kiểm ingress cũng sẽ chấp nhận gói.

```bash
n r1 tcpdump -ni peer 'host 10.30.2.2'
n r1 ip route get 10.30.2.2
n r1 sysctl net.ipv4.conf.all.rp_filter \
  net.ipv4.conf.peer.rp_filter
n r1 nstat -az | rg ReversePath
```

Script tự bắt gói trước probe. `out/05-ingress.txt` có dòng SYN-ACK `.8080 > .55064` với `Flags [S.]`; `out/05-asymmetric.txt` có:

```text
http=000 bytes=0
curl_exit=28
net.ipv4.conf.all.rp_filter = 0
net.ipv4.conf.peer.rp_filter = 1
10.30.2.2 via 10.30.12.2 dev direct src 10.30.12.1 uid 0
TcpExtIPReversePathFilter       1                  0.0
```

**Sửa và đo lại.** Lab chủ động cho phép đường bất đối xứng nên đổi **riêng** `peer.rp_filter` sang 2, giữ `all=0`, giữ nguyên hai chiều route. Không tắt kiểm tra ở mọi interface. Đo lại cùng URL:

```text
net.ipv4.conf.peer.rp_filter = 2
http=200 bytes=2
```

> **Nguồn.** [Linux IP sysctl, `rp_filter`](https://docs.kernel.org/networking/ip-sysctl.html) quy định dùng giá trị lớn nhất giữa `all` và interface khi kiểm nguồn. Vì thế đổi interface sang 0 chưa đủ nếu `all` vẫn là 1. **Đo trên lab:** `all=0`, `peer=1→2`, capture ingress và HTTP trước–sau. Counter có thể còn tăng do gói đã phát trước lúc đổi; không dùng tổng sau sửa làm số request mới vừa thất bại.

### 4.7 Sự cố 6 — prefix đúng origin, request lại đi vòng

**Triệu chứng người dùng:** API vẫn HTTP 200 nhưng request mất thêm thời gian sau một thay đổi BGP. Script `06-bgp.sh` chạy zebra/bgpd thật trên cùng R1/R2/R3, bỏ static route tới mạng S tại R1 để BGP quyết định đường. **AS là mạng do một tổ chức vận hành với chính sách định tuyến riêng; ASN là số định danh AS.** Lab gán R1=65001, R3=65002, R2=65003.

Theo chính sách giả định của lab, AS65002 là customer của cả AS65001 và AS65003. Nó được xuất prefix của mình `10.30.99.0/24`, không được cung cấp transit giữa hai provider. AS65003 khởi phát `10.30.2.0/24` chứa S. Trước lỗi, R1 dùng đường trực tiếp tới AS65003; filter ở R3 chỉ xuất prefix riêng sang R1 và R2.

## ⏸ Dừng lại — đoán trước #6

R1 nhận hai path cho cùng prefix: `65003` và `65002 65003`. Path qua customer được LOCAL_PREF 300, cao hơn path trực tiếp theo cấu hình lab. Origin cả hai vẫn là 65003. Câu nào đúng?

- (a) Path dài hơn luôn thua nên không có ảnh hưởng.
- (b) Giữ nguyên origin có thể vẫn là route leak; cần kiểm export theo quan hệ AS, không chỉ quyền khởi phát.
- (c) Origin đúng chứng minh route có quyền đi qua bất cứ AS trung gian nào.

**Xác nhận.** Đáp án **(b)**. Script bỏ đúng export filter sang R1 trên R3; R3 xuất route đã học từ provider còn lại. LOCAL_PREF là thuộc tính ưu tiên route bên trong AS; lab cấu hình route từ customer có giá trị 300 để làm leak được chọn một cách rõ ràng. Không phải BGP tự biết quan hệ customer hay tự gán số ấy.

```bash
n r1 vtysh --vty_socket /tmp/net30-r1 \
  -c 'show bgp ipv4 unicast 10.30.2.0/24'
n r1 ip route get 10.30.2.2
```

Trong `out/06-bgp.txt`, snapshot lỗi có các dòng:

```text
  65002 65003
    10.30.13.3 from 10.30.13.3 (10.255.30.3)
      Origin IGP, localpref 300, valid, external, best (Local Pref)
10.30.2.2 via 10.30.13.3 dev peer src 10.30.13.1 uid 0
```

Đừng nhầm `Origin IGP` là ASN khởi phát; đây là thuộc tính ORIGIN của BGP. ASN ngoài cùng bên phải AS_PATH mới là origin AS trong path đơn giản của lab. Giữ origin 65003 không làm hành vi xuất route từ provider này sang provider khác của customer trở thành hợp lệ theo chính sách đã đặt.

<step-flow>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 400" role="img" aria-labelledby="net30-bgp-t net30-bgp-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto">
<title id="net30-bgp-t">Route leak giữ origin nhưng vượt phạm vi export</title>
<desc id="net30-bgp-d">R3 là customer của hai provider. Mũi tên chỉ chiều quảng bá. Filter khôi phục làm quảng bá leak biến mất; đường trực tiếp lại được chọn.</desc>
<defs><marker id="net30-bgp-a" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7z" fill="currentColor"/></marker></defs>
<circle cx="100" cy="70" r="29" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="100" y="75" text-anchor="middle" font-size="16" fill="currentColor">R1</text><text x="100" y="120" text-anchor="middle" font-size="13" fill="currentColor">AS65001</text><circle cx="560" cy="70" r="29" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="560" y="75" text-anchor="middle" font-size="16" fill="currentColor">R2</text><text x="560" y="120" text-anchor="middle" font-size="13" fill="currentColor">AS65003</text><circle cx="330" cy="320" r="29" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="330" y="325" text-anchor="middle" font-size="16" fill="currentColor">R3</text><text x="330" y="370" text-anchor="middle" font-size="13" fill="currentColor">AS65002</text><text x="330" y="30" text-anchor="middle" font-size="15" fill="currentColor">10.30.2.0/24 do AS65003 khởi phát</text><path d="M530 85 L355 299" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#net30-bgp-a)"/><text x="500" y="225" text-anchor="middle" font-size="13" fill="currentColor">học từ provider</text><g data-step="1" data-until="1">
<path d="M530 70 L130 70" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#net30-bgp-a)"/><text x="330" y="95" text-anchor="middle" font-size="14" fill="currentColor">best: 65003</text>
</g><g data-step="2" data-until="2">
<path d="M307 299 L118 95" fill="none" stroke="#f43f5e" stroke-width="2" marker-end="url(#net30-bgp-a)"/><text x="159" y="225" text-anchor="middle" font-size="13" fill="currentColor">leak sang provider</text><text x="330" y="150" text-anchor="middle" font-size="14" fill="currentColor">best: 65002 65003 · LOCAL_PREF 300</text>
</g><g data-step="3">
<path d="M530 70 L130 70" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#net30-bgp-a)"/><text x="330" y="95" text-anchor="middle" font-size="14" fill="currentColor">best: 65003</text><text x="330" y="165" text-anchor="middle" font-size="14" fill="currentColor">Filter xuất: chỉ prefix riêng của R3</text>
</g>
</svg>
<step-note data-step="1">Mũi tên là chiều quảng bá. R1 có route trực tiếp; R3 được học route từ provider.</step-note>
<step-note data-step="2">Bỏ filter làm R3 xuất route provider-learned sang provider khác. R1 ưu tiên customer theo cấu hình lab.</step-note>
<step-note data-step="3">Khôi phục filter xuất ở R3; chỉ route riêng customer còn được xuất, R1 trở lại đường trực tiếp.</step-note>
</step-flow>

**Nguyên nhân và giới hạn số đo.** Leak đưa traffic qua R3. Lab còn đặt `tc netem delay 80ms` trên cổng `up2` của R3 để nhánh đi vòng có hậu quả nhìn thấy được ở request; đây là lỗi chất lượng đường giả lập, không phải “BGP tự tạo 80 ms”. BGP chỉ đổi đường được chọn. So sánh thời gian một request chỉ là bằng chứng minh hoạ cùng route/cấu hình, không phải percentile hoặc benchmark hội tụ.

**Sửa và đo lại.** Khôi phục allowlist export ở R3 sang R1, soft clear outbound để cập nhật quảng bá, rồi chờ lookup trở về next-hop trực tiếp. Không đụng qdisc: nhánh vòng vẫn trễ, nhưng traffic này không còn chọn nó. Kiểm cả route đã rút lẫn route riêng phải còn được xuất:

```text
10.30.2.2 via 10.30.12.2 dev direct src 10.30.12.1 uid 0
```

`show bgp ... 10.30.99.0/24` ở cuối log vẫn có path trực tiếp `65002`, best với next-hop `10.30.13.3`. Filter không biến thành “chặn mọi route của customer”. Cùng log lưu thời gian HTTP thật (đơn vị giây; dấu chấm giữ nguyên output):

```text
leak http=200 total=0.170261
fixed http=200 total=0.001489
```

**Đo trên lab:** tương ứng 170,261 ms và 1,489 ms trong một lượt; không lấy delay cấu hình làm tổng thời gian HTTP.

> **Đo trên lab.** `out/06-bgp.txt` lưu path BGP, FIB lookup và `curl -w` trước–sau; FRR là package Alpine ghi ở `environment.txt`. **Nguồn:** [RFC 7908](https://www.rfc-editor.org/rfc/rfc7908.txt) định nghĩa leak qua việc vượt phạm vi dự định; [RFC 6811](https://www.rfc-editor.org/rfc/rfc6811.txt) đặt origin validation trong phạm vi quyền khởi phát, không xác thực toàn bộ path. **Chưa đo:** Internet BGP, RPKI/RTR, BGP Roles/OTC, thời gian hội tụ và mất request trong cửa sổ đổi route.

## 5. Tính tay

Các câu dưới dùng **giả định bài toán**, không phải tải đo production. Phần tính được kiểm lại bằng `calculations.py`, kết quả lưu `out/calculations.txt`.

### 5.1 Hai đồng hồ DNS bắt đầu trước thao tác lưu

Tại `t=0`, resolver nhận A TTL 12 và một NXDOMAIN có SOA TTL 12, MINIMUM 8. Tại `t=2`, authoritative đổi A và tạo tên còn thiếu, đều TTL 2. Nếu không serve-stale/prefetch/min-TTL và chưa có lần lấy dữ liệu mới, ngay tại `t=2` mỗi cache còn bao lâu? Chờ tới `t=4` đã đủ chưa?

**Giải:** A cũ còn `12−2=10 s`. Hạn phủ định ban đầu là `min(12,8)=8 s`, nên còn `8−2=6 s`. Chờ tới `t=4` chỉ tiêu thêm 2 s: A còn 8, phủ định còn 4. TTL 2 mới chưa thay đồng hồ nào của dữ liệu cũ. Để cả hai hết hạn theo mô hình phải tới ít nhất `t=12`, rồi query mới lấy dữ liệu hiện hành. Lab chờ thêm biên để tránh đo đúng sát ranh giới.

### 5.2 Bảng gần đầy khác đủ sức chịu burst

Giả sử trần bảng bằng 262.144, đang có 260.000 entry; flow mới tới đều 500 flow/s, không entry nào hết hạn hoặc bị dọn trong cửa sổ xét. Còn bao lâu trước khi hết chỗ? Nếu mỗi entry ở lại đúng 300 s ở trạng thái ổn định, 500 flow/s cần bao nhiêu entry?

**Giải:** chỗ còn `262144−260000=2144`. Thời gian là `2144/500=4,288 s`. Mô hình steady state cần `500×300=150000` entry. Hai kết quả không mâu thuẫn: bảng đang có 260.000 có thể chứa di sản của tải trước hoặc state khác, trong khi số 150.000 giả định tốc độ và tuổi thọ đồng nhất đã cân bằng. Không giảm timeout dựa vào phép nhân này trước khi phân loại flow thực và điều kiện ứng dụng.

### 5.3 Tăng backlog mua thời gian nào?

Giả sử accept queue bắt đầu rỗng, kết nối hoàn tất tới đều 80/s, ứng dụng accept đều 60/s, chưa có retry hay giới hạn khác. Nếu thêm 100 chỗ vào queue, mua được bao nhiêu giây trước khi nó đầy? Có sửa được tải kéo dài không?

**Giải:** tốc độ tích luỹ là `80−60=20` kết nối/s; 100 chỗ thêm mua `100/20=5 s`. Nó có thể hấp thụ một burst ngắn hơn cửa sổ đó theo mô hình; không sửa thâm hụt 20/s kéo dài. Đây là accept queue, không tính được số SYN dở dang hay hiệu quả SYN cookie. Phải tách đúng đối tượng rồi mới dùng một phép chia.

## 6. Chuyển giao

1. Tải lớn chỉ treo ở chiều upload, download vẫn đủ body. Bạn chuyển capture và điểm kiểm phản hồi ICMP về đâu, giữ những điều kiện nào để không chẩn đoán nhầm TLS?
2. Count conntrack thấp hơn max nhưng flow mới qua NAT vẫn timeout tới đúng một IP:port. Bạn sẽ tìm bằng chứng nào để tách cạn tuple, drop firewall và lỗi route mà không flush state?
3. Qua resolver tên đã có IP mới, nhưng một process lâu đời vẫn gửi request tới IP cũ. Bạn thêm log nào để phân biệt DNS cache trong process với connection pool, và vì sao query bằng một process khác chưa giải quyết câu hỏi?
4. `ListenOverflows` tăng sau deploy trong lúc SYN cookie cũng tăng. Hãy lập phép đo riêng cho hai listener/queue trước khi thay `somaxconn`; counter toàn namespace thiếu thông tin gì?
5. Đổi `peer.rp_filter` từ 1 xuống 0 nhưng reply vẫn bị loại, `all.rp_filter` còn 1. Bạn kiểm giá trị hiệu dụng, policy route và capture hai phía thế nào mà vẫn giữ yêu cầu chống giả mạo nguồn?
6. **Câu khó nhất, không có đáp án trong bài.** Sau cutover DNS sang một region khác, chỉ client mở kết nối mới bị chậm; route BGP có origin đúng nhưng next-hop đổi, một đường tunnel có MTU nhỏ hơn và LB giữ pool cũ. Thiết kế các phép thử tối thiểu để phân biệt ba lỗi có thể đồng thời tồn tại, đặt thứ tự rollback không xoá bằng chứng, và nêu điều kiện đủ để kết luận phục hồi cho cả kết nối mới lẫn session đang sống. Bạn phải chỉ rõ điểm quan sát, biến giữ cố định và kết quả nào bác bỏ từng giả thuyết.

## 7. Tóm tắt

- HTTP 200 không chứng minh body hoàn tất: ca MTU có status 200 nhưng 0 byte, sửa phản hồi ICMP mới tải đủ 8.192 byte (`01-mtu.txt`).
- Conntrack đầy là lỗi tài nguyên state; lab có count=max=262.144, flow cũ sống và flow mới hồi phục sau khi xoá state tổng hợp (`02-conntrack.txt`).
- Dữ liệu mới ở authoritative không thu hồi cache cũ: lab đo cả A cũ lẫn NXDOMAIN trước khi hai hạn kết thúc (`03-dns.txt`).
- SYN queue và accept queue cần hai phép đo; cookie giúp pha SYN nhưng mở lại vòng accept mới giải quyết pha accept (`04-queues.txt`).
- Gói có mặt tại ingress chưa chắc được forward; strict reverse-path check loại reply bất đối xứng của lab (`05-asymmetric.txt`, `05-ingress.txt`).
- Origin đúng không chứng minh phạm vi export đúng; khôi phục allowlist rút leak và giữ route riêng customer (`06-bgp.txt`).
- Một bản sửa cần phép đo lại đúng tác vụ thất bại; thay đổi cấu hình và ảnh chụp counter riêng lẻ chưa đủ chứng minh phục hồi.

### Tổng kết course — từ nhìn gói tới chứng minh nguyên nhân

Khi gặp sự cố mới, sản phẩm cần mang về không phải danh sách lệnh đã gõ. Hãy viết một đoạn mà người khác có thể kiểm lại: người dùng thất bại ở thao tác nào; ranh giới cuối còn thấy gói/dữ liệu nằm ở đâu; phép thử nào loại giả thuyết cạnh tranh; cấu hình nào gây ra chuỗi lỗi; thay đổi nào đã thực hiện; cùng thao tác sau sửa đạt điều kiện hoàn tất gì. Kèm log gốc, thời điểm và phạm vi đo.

Bạn hoàn thành capstone khi tự chạy lại được sáu ca, dừng trước tiết lộ, chọn được probe phân biệt và giải thích được cả một kết quả âm tính. Một lần đo khác sách là điểm bắt đầu điều tra điều kiện thí nghiệm, không phải lý do sửa output cho giống bài.
