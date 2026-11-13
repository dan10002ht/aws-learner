# Bài 20 — Phân giải từ root: hỏi ai, giữ gì trong cache?

## 1. Mục tiêu

Sau bài này bạn có thể:

- Lần theo một referral từ root tới authoritative bằng `dig +norecurse`, đọc đúng ba section của phản hồi.
- Phân biệt việc stub yêu cầu recursion với việc recursive resolver tự đi hỏi từng zone.
- Đếm truy vấn từ log authoritative, tách lượt khởi động root khỏi lượt tìm bản ghi ứng dụng.
- Chứng minh cache hit bằng cả TTL giảm và số truy vấn upstream không tăng.
- Phân biệt NXDOMAIN, NODATA, SERVFAIL và timeout để chọn phép đo tiếp theo.
- Tính hạn negative cache từ SOA, dự đoán vì sao tạo tên mới chưa làm resolver trả địa chỉ ngay.

## 2. Triệu chứng

Bạn tạo `new.lab.test`, kiểm trực tiếp server quản lý zone thì thấy `192.0.2.20`. Nhưng backend hỏi recursive resolver vẫn nhận **NXDOMAIN**. Restart backend không đổi kết quả. Đồng nghiệp đề xuất “DNS chưa lan ra root, đợi đồng bộ”.

Ta cho cách giải thích đó chạy trước. Trong lab, root và TLD đã biết đường tới zone từ trước khi tên mới tồn tại. Authoritative vừa reload có thể trả tên mới ngay; recursive vẫn trả phủ định với SOA TTL còn **10 giây**. Sau khi hạn cũ qua đi, cùng resolver trả địa chỉ mới. Không sửa root, không đổi delegation, không khởi động lại app.

> **Đo trên lab.** BIND 9.18.49 và Unbound 1.20.0 trong Alpine 3.20, Linux aarch64; `net-lab/net-20/out/lab.txt`, các đoạn `NXDOMAIN first`, `new name authority now`, `negative cache still active`, `negative expired`. Tên và IP chỉ thuộc lab. Đo lại bằng `./run.sh` trong thư mục lab; thời gian còn lại có thể lệch theo lịch chạy.

Bài [[intro-02-networking]] đã dựng trực giác tên → địa chỉ. Bài này không kể lại “DNS là danh bạ”; ta xác định **ai trả lời, dựa vào dữ liệu nào, còn được dùng tới khi nào**. TCP/UDP đã ở [[eng-03-tcp-tls]] và [[net-19-udp-quic]]; biết DNS thường dùng UDP chưa đủ để biết câu trả lời đến từ cache hay từ chủ zone.

## ⏸ Dừng lại — đoán trước #1

Authoritative trả A cho `new.lab.test`, recursive trả NXDOMAIN. Phép thử nào phân biệt được giả thuyết cache với giả thuyết delegation sai?

- (a) Restart app, vì mọi cache DNS đều nằm trong tiến trình app.
- (b) Hỏi root xem nó đã có A của `new.lab.test` chưa.
- (c) Ghi status và SOA TTL từ cùng resolver qua thời gian, đồng thời hỏi trực tiếp authoritative hiện tại.
- (d) Đổi tên miền sang tên khác, nếu chạy được thì kết luận authoritative cũ hỏng.

## 3. Cơ chế

### 3.1 Recursion là lời nhờ làm hộ; iteration là các lượt tự đi hỏi

Đáp án **(c)**. Nó giữ nguyên tên, loại bản ghi và resolver, chỉ quan sát thời gian và nơi trả lời. Restart app không xoá cache tại resolver; root không giữ A cho mọi host dưới mọi zone. Đổi tên làm đổi cả cache key nên không cô lập được nguyên nhân.

**Stub resolver là phần phía client gửi câu hỏi tới một resolver đã cấu hình, thay vì tự lần toàn bộ cây DNS.** Nó có thể là thư viện hệ điều hành, dịch vụ cục bộ hoặc phần của ứng dụng. **Recursive resolver là dịch vụ nhận yêu cầu tìm kết quả và thực hiện các truy vấn cần thiết, thường kèm cache.** **Authoritative server là server trả dữ liệu có thẩm quyền cho zone mà nó phục vụ.** Một phần mềm có thể làm nhiều vai, nhưng từng phản hồi vẫn phải đọc theo vai đang thực hiện.

Stub thường đặt **RD — Recursion Desired**, cờ yêu cầu recursion. Recursive trả **RA — Recursion Available** để cho biết có hỗ trợ recursion. RD không buộc bất cứ server Internet nào cũng làm hộ bạn; server có thể từ chối theo cấu hình. **AA — Authoritative Answer** là cờ xác định câu trả lời có thẩm quyền trong phản hồi theo quy tắc DNS; nó không chứng minh có kiểm chữ ký DNSSEC.

Recursive gặp cache miss thì dùng **iteration — lần theo các câu trả lời hoặc chỉ dẫn sang server khác**. Nếu root chỉ biết zone con `.test`, nó trả NS của `.test`. Recursive tự gửi câu hỏi tiếp tới NS ấy. Root không chuyển nguyên request của app xuống TLD rồi ngồi chờ TLD chuyển tiếp tiếp.

**Zone là phần không gian tên do một tập authoritative server quản lý, có thể loại trừ các nhánh đã uỷ quyền xuống dưới.** Vì vậy `lab.test` nằm dưới `test` trong cây tên nhưng dữ liệu A của `api.lab.test` thuộc zone `lab.test` sau khi có delegation. **Delegation là việc zone cha công bố NS cho một nhánh được giao cho zone con.** Một dấu chấm trong tên không tự tạo thêm zone: `blue.api.lab.test` có thể vẫn do cùng zone `lab.test` phục vụ.

> **Nguồn.** Cơ chế recursion/iteration và thuật toán lần zone nằm ở [RFC 1034 §4.3.1–4.3.2](https://www.rfc-editor.org/rfc/rfc1034#section-4.3.1); ý nghĩa cờ và cấu trúc message ở [RFC 1035 §4.1](https://www.rfc-editor.org/rfc/rfc1035#section-4.1). Trong lab ta cố ý tách các vai ra tiến trình riêng để thấy câu hỏi nào tới ai.

<step-flow>
<svg viewBox="0 0 650 395" role="img" aria-labelledby="net20-a-t net20-a-d" style="width:100%;max-width:650px;height:auto;display:block;margin:1.25rem auto">
<title id="net20-a-t">Lần theo referral</title>
<desc id="net20-a-d">Các node đứng cố định; recursive tự hỏi từng authoritative. Sơ đồ bỏ các query priming.</desc>
<defs><marker id="net20-a-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
<rect x="2" y="15" width="126" height="55" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="65" y="38" font-size="14" text-anchor="middle" fill="currentColor">Recursive</text><text x="65" y="58" font-size="13" text-anchor="middle" fill="currentColor">:5353</text><path d="M65 70 L65 335" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><rect x="172" y="15" width="126" height="55" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="235" y="38" font-size="14" text-anchor="middle" fill="currentColor">Root</text><text x="235" y="58" font-size="13" text-anchor="middle" fill="currentColor">127.0.0.2</text><path d="M235 70 L235 335" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><rect x="342" y="15" width="126" height="55" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="405" y="38" font-size="14" text-anchor="middle" fill="currentColor">.test</text><text x="405" y="58" font-size="13" text-anchor="middle" fill="currentColor">127.0.0.3</text><path d="M405 70 L405 335" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><rect x="512" y="15" width="126" height="55" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="575" y="38" font-size="14" text-anchor="middle" fill="currentColor">lab.test</text><text x="575" y="58" font-size="13" text-anchor="middle" fill="currentColor">127.0.0.4</text><path d="M575 70 L575 335" stroke="currentColor" stroke-dasharray="4 4" opacity="0.35"/><g data-step="1"><path d="M65 100 L235 100" stroke="currentColor" fill="none" marker-end="url(#net20-a-a)"/><text x="80" y="92" font-size="13" text-anchor="start" fill="currentColor">api.lab.test A</text><path d="M235 130 L65 130" stroke="currentColor" fill="none" marker-end="url(#net20-a-a)"/><text x="80" y="151" font-size="13" text-anchor="start" fill="currentColor">NS .test + glue</text></g><g data-step="2"><path d="M65 180 L405 180" stroke="currentColor" fill="none" marker-end="url(#net20-a-a)"/><text x="250" y="172" font-size="13" text-anchor="start" fill="currentColor">api.lab.test A</text><path d="M405 208 L65 208" stroke="currentColor" fill="none" marker-end="url(#net20-a-a)"/><text x="225" y="230" font-size="13" text-anchor="start" fill="currentColor">NS lab.test + glue</text></g><g data-step="3"><path d="M65 260 L575 260" stroke="currentColor" fill="none" marker-end="url(#net20-a-a)"/><text x="420" y="252" font-size="13" text-anchor="start" fill="currentColor">api.lab.test A</text><path d="M575 290 L65 290" stroke="currentColor" fill="none" marker-end="url(#net20-a-a)"/><text x="240" y="313" font-size="14" text-anchor="start" fill="currentColor">A 192.0.2.10 · AA</text></g><g data-step="4"><rect x="3" y="345" width="260" height="35" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="15" y="368" font-size="14" text-anchor="start" fill="currentColor">Cache A · TTL 30 s</text></g>
</svg>
<step-note data-step="1">Root trả chỉ dẫn, không gọi TLD thay recursive. Chưa vẽ truy vấn priming trong nhánh này.</step-note>
<step-note data-step="2">Glue cho biết địa chỉ NS tiếp theo, chưa phải địa chỉ backend.</step-note>
<step-note data-step="3">Chỉ zone cuối có câu trả lời A có thẩm quyền cho tên ứng dụng.</step-note>
<step-note data-step="4">Lần hỏi sau có thể dừng tại cache, không cần đi lại các cạnh trên.</step-note>
</step-flow>

### 3.2 Referral đưa địa chỉ của người biết đường, không phải địa chỉ của ứng dụng

**Referral là phản hồi chỉ tới authoritative server của zone con thay vì trả kết quả cuối cho tên đang hỏi.** Với `api.lab.test A`, root lab trả:

```text
test.                  30 IN NS ns.test.
ns.test.               30 IN A  127.0.0.3
```

Hai dòng này trích từ hai section khác nhau trong `out/lab.txt`: NS thuộc **AUTHORITY**, A thuộc **ADDITIONAL**. Chúng nói “hỏi `.test` ở đây”, không nói `api.lab.test` chạy trên `127.0.0.3`. Nếu chỉ tìm dòng nào có chữ `A` rồi lấy IP, bạn sẽ kết nối vào DNS server thay vì backend.

TLD lab trả NS `ns.lab.test` và A `127.0.0.4`. Server này mới trả A `192.0.2.10` trong **ANSWER**, kèm AA. **RR — resource record — là một bản ghi DNS gồm tên, loại, lớp, TTL và dữ liệu.** **RRset là tập bản ghi có cùng tên, loại và lớp.** Khi nói cache A, đơn vị cần nghĩ tới là RRset A của tên đang hỏi, không phải toàn bộ mọi dữ liệu liên quan tên miền.

**Glue là bản ghi địa chỉ do zone cha cung cấp để resolver tới được NS, đặc biệt khi tên NS nằm trong nhánh đang được uỷ quyền.** Không có glue cho `ns.lab.test`, một resolver chưa biết địa chỉ NS có thể mắc vòng: muốn hỏi `lab.test` phải biết `ns.lab.test`; muốn tìm `ns.lab.test` lại cần hỏi chính `lab.test`. Glue phá vòng phụ thuộc địa chỉ, còn câu trả lời ứng dụng vẫn lấy từ zone có thẩm quyền.

Đừng biến điều đó thành luật “mọi NS đều cần glue ở parent”. Nếu NS là tên ở một nhánh khác, resolver có thể phân giải tên NS qua nhánh đó. Một referral cũng không biến mọi dữ liệu nhét trong ADDITIONAL thành đáng tin. Phạm vi liên quan tới zone được hỏi và quy tắc xử lý glue bảo vệ resolver khỏi việc nhận bừa dữ liệu ngoài phạm vi.

> **Nguồn.** [RFC 9471 §2](https://www.rfc-editor.org/rfc/rfc9471#section-2) mô tả xử lý glue trong referral, gồm yêu cầu với glue in-domain và cờ truncation khi không vừa. Địa chỉ `127.0.0.3` và `127.0.0.4` ở đây là **đo trên lab**, không phải địa chỉ DNS root công cộng.

Đọc một phản hồi theo thứ tự: status → flags → ANSWER → AUTHORITY → ADDITIONAL. `NOERROR` với ANSWER rỗng **chưa đủ** để kết luận tên không có bản ghi: có thể bạn đang nhìn referral. Phải nhìn NS trong AUTHORITY và ngữ cảnh server được hỏi. Ở mục negative cache ta sẽ gặp ANSWER rỗng với SOA, mang ý nghĩa khác.

### 3.3 Từ root hints tới `dig +trace`: một đường quan sát khác app

**Root hints là dữ liệu khởi đầu giúp resolver tìm địa chỉ root server, không phải bản sao mọi zone trên Internet.** Resolver có thể làm **priming — hỏi NS của zone root để khởi tạo/cập nhật thông tin về các root server**. Trong lab, root hints chỉ tới `ns.root` tại `127.0.0.2`; cây `.test` là cây riêng, không thay đổi DNS trên máy host.

`dig +trace` cho công cụ tự lần các delegation. Theo [tài liệu dig của BIND](https://bind9.readthedocs.io/en/stable/manpages.html), trace tắt recursion trong các lượt lần cây; server sau `@` được dùng cho câu hỏi ban đầu tới root. Vì vậy `dig @resolver-ten-cong-ty api.example A +trace` không có nghĩa là “cho tôi xem mọi bước mà resolver nội bộ vừa thực hiện”. Công cụ có thể tự gửi truy vấn tới các authoritative sau bước đầu. Đường mạng, cache và chính sách của nó khác ứng dụng.

Dùng trace để kiểm cấu trúc uỷ quyền và khả năng đi tới các server từ **nơi chạy dig**. Dùng truy vấn thường tới đúng recursive để kiểm câu trả lời mà client của recursive ấy nhận. Với split-horizon ở bài sau, hai cách thậm chí có thể dẫn tới hai bộ dữ liệu hợp lệ khác nhau.

**QNAME minimisation là việc resolver chỉ gửi phần tên cần thiết cho từng mức khi lần delegation**, giảm việc tiết lộ toàn bộ tên tới server không cần biết. Một resolver thực tế có thể hỏi `.test NS` trước thay vì mang ngay `api.lab.test A` tới root. Cây truy vấn vẫn có quan hệ cha–con, nhưng chuỗi QNAME trong packet không nhất thiết giống mô hình minh hoạ truyền thống.

> **Nguồn.** [RFC 9156 §2–3](https://www.rfc-editor.org/rfc/rfc9156#section-2) mô tả QNAME minimisation. Lab đặt `qname-minimisation: no` để dễ đối chiếu từng QNAME; **không phải khuyến nghị tắt trong vận hành**. Ta cũng tách DNSSEC sang bài 21, nên không lấy số query của lab này làm định mức cho resolver có validation.

Một trace có thể thất bại dù app vẫn chạy: app dùng cached answer tại recursive còn dig không tới được authoritative từ mạng hiện tại. Chiều ngược lại cũng có: trace thấy dữ liệu mới nhưng recursive còn cache cũ. Đây là hai phép thử khác đối tượng, không phải hai công cụ đang tự mâu thuẫn.

## ⏸ Dừng lại — đoán trước #2

Lab hỏi A lần đầu, log root tăng thêm ba truy vấn, TLD thêm một, authoritative thêm một. Hỏi lại sau hai giây, TTL từ 30 còn 28; ba bộ đếm không tăng. Kết luận nào được bằng chứng hỗ trợ?

- (a) Mỗi lần phân giải DNS bắt buộc tốn năm truy vấn upstream.
- (b) Lần sau là cache hit tại recursive; lần đầu còn có công việc khởi tạo/tìm địa chỉ root ngoài nhánh referral chính.
- (c) TTL 28 chứng minh gói DNS đi qua 28 router.
- (d) Recursive đã hỏi authoritative nhưng authoritative không ghi log được vì TTL nhỏ hơn 30.

### 3.4 Cache chứa nhiều mảnh có đồng hồ riêng

Đáp án **(b)**. **TTL — time to live — trong DNS là thời gian tối đa dữ liệu được cache trước khi cần làm mới theo quy tắc áp dụng**, tính bằng giây. Nó khác trường TTL của IP dùng giới hạn số chặng. Cùng tên gọi không có cùng cơ chế; nhắc lại vị trí tầng ở [[eng-osi-model]] là đủ, không suy số hop từ output dig.

Recursive có thể giữ A của `api.lab.test`, CNAME của `www.lab.test`, NS của zone và địa chỉ NS với các hạn khác nhau. Một câu trả lời A hết hạn không nhất thiết buộc đi lại từ root nếu thông tin delegation còn dùng được. Một CNAME còn hạn không có nghĩa A đích còn hạn. **CNAME là bản ghi cho biết owner name là bí danh của một tên khác**, không chứa IP và không phải HTTP redirect.

Trong output lab, `www.lab.test CNAME api.lab.test` còn TTL **30**, A đích còn **28**. Hai dòng đi chung một DNS response nhưng có hai đồng hồ. Recursive có thể đã có A từ câu hỏi trước rồi mới lấy CNAME. Nếu đích ở zone khác mà chưa cache, nó phải tìm tiếp qua nhánh thích hợp; đó là lý do đếm query bằng số dấu chấm trong URL không có cơ sở.

<svg viewBox="0 0 520 300" role="img" aria-labelledby="net20-b-t net20-b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto">
<title id="net20-b-t">Hai đồng hồ cache độc lập</title>
<desc id="net20-b-d">CNAME còn 30 giây, A còn 28 giây. Hai thanh có cùng tỷ lệ.</desc>
<defs><marker id="net20-b-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
<text x="20" y="25" font-size="14" text-anchor="start" fill="currentColor">Hai RRset trong cùng câu trả lời</text><text x="20" y="60" font-size="13" text-anchor="start" fill="currentColor">www.lab.test · CNAME → api.lab.test</text><rect x="20" y="75" width="450" height="35" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="30" y="98" font-size="14" text-anchor="start" fill="currentColor">TTL 30 s</text><text x="20" y="145" font-size="13" text-anchor="start" fill="currentColor">api.lab.test · A → 192.0.2.10</text><rect x="20" y="160" width="420" height="35" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="30" y="183" font-size="14" text-anchor="start" fill="currentColor">TTL 28 s</text><path d="M20 225 L470 225" stroke="currentColor"/><path d="M20 220 L20 230" stroke="currentColor"/><text x="20" y="248" font-size="13" text-anchor="middle" fill="currentColor">0</text><path d="M170 220 L170 230" stroke="currentColor"/><text x="170" y="248" font-size="13" text-anchor="middle" fill="currentColor">10</text><path d="M320 220 L320 230" stroke="currentColor"/><text x="320" y="248" font-size="13" text-anchor="middle" fill="currentColor">20</text><path d="M470 220 L470 230" stroke="currentColor"/><text x="470" y="248" font-size="13" text-anchor="middle" fill="currentColor">30 s</text><text x="20" y="280" font-size="13" text-anchor="start" fill="currentColor">Độ dài thanh = thời gian còn được cache</text>
</svg>

Cache DNS có thể nằm tại nhiều nơi: thư viện/ứng dụng, dịch vụ resolver của hệ điều hành, recursive gần client, rồi resolver upstream nếu có forwarding. **Forwarder là server DNS mà resolver chuyển câu hỏi tới để nhờ phân giải**, thay vì tự lần từ root cho câu hỏi đó. Không phải host nào cũng có đủ mọi tầng; phải kiểm cấu hình thật. `dig @127.0.0.1 -p 5353` trong lab bỏ qua việc lựa chọn resolver mặc định của hệ điều hành, nhưng vẫn đi qua cache của Unbound ở port ấy.

Cache hit cần bằng chứng chéo. TTL giảm phù hợp với cache, nhưng một TTL nhỏ đơn lẻ chưa xác định cache nào. Lab đồng thời đếm queries tại từng authoritative; warm query không làm bộ đếm nào tăng. Nếu có forwarder ngoài tầm quan sát thì “không thấy query ở authoritative” chưa chỉ ra cache nằm ở resolver gần nhất hay forwarder. Lab không có forwarder nên loại được khả năng đó.

> **Đo trên lab.** Sau ba phép hỏi tay, bộ đếm root/TLD/zone là `1/1/1`; cold recursive lên `4/2/2`; warm giữ `4/2/2`. Log `queries-2.txt` cho thấy phần tăng ở root gồm `. NS`, `ns.root A`, `api.lab.test A`. Đây là **5 truy vấn upstream tới 3 tiến trình authoritative** trong lần cold cụ thể, chưa tính câu hỏi từ dig tới recursive. Không dùng số 5 làm hằng số DNS.

### 3.5 Negative cache giữ một kết luận không tồn tại

**NXDOMAIN là status cho biết tên được hỏi không tồn tại trong ngữ cảnh câu trả lời đó.** **NODATA là tình huống tên tồn tại nhưng không có RRset thuộc loại được hỏi; thường thể hiện bằng NOERROR, ANSWER rỗng và bằng chứng phù hợp.** NODATA không phải chuỗi status sẽ in nguyên như NXDOMAIN trong header.

`api.lab.test A` có dữ liệu; hỏi AAAA cho cùng tên thì lab trả NOERROR và SOA ở AUTHORITY. Ta không tạo AAAA nên đây là NODATA. `new.lab.test A` trước khi tạo tên trả NXDOMAIN. Phân biệt này ảnh hưởng cache: NXDOMAIN gắn với tên/lớp; NODATA gắn thêm loại truy vấn theo RFC 2308. Một phủ định AAAA không chứng minh A cũng không tồn tại.

**SOA — Start of Authority — là bản ghi mô tả thông tin quản lý zone, gồm serial và các trường thời gian.** Với negative caching theo RFC 2308, thời gian phủ định được lấy từ **giá trị nhỏ hơn giữa TTL của SOA và SOA.MINIMUM**. MINIMUM ở đây không phải “TTL mặc định của mọi A” như cách suy từ tên trường. Resolver còn có thể áp giới hạn cache cấu hình riêng.

Lab có `$TTL 30` và SOA.MINIMUM `12`. Phản hồi phủ định mang SOA với TTL **12**, không phải 30. Khi recursive đã giữ NXDOMAIN, authoritative được thêm tên mới; điều đó không phát một thông báo invalidation tới toàn bộ recursive. Recursive tiếp tục dùng kết luận phủ định còn hạn. Chính cache đang làm đúng nhiệm vụ đã được cho phép trước lúc bạn tạo record.

> **Nguồn.** [RFC 2308 §3 và §5](https://www.rfc-editor.org/rfc/rfc2308#section-3): *“minimum of the MINIMUM field of the SOA record and the TTL of the SOA itself”*. Quy tắc này giải thích SOA TTL 12 trong log, không phải đoán từ thời gian bạn bấm lưu trên giao diện DNS.

<step-flow>
<svg viewBox="0 0 760 750" role="img" aria-labelledby="net20-c-t net20-c-d" style="width:100%;max-width:760px;height:auto;display:block;margin:1.25rem auto">
<title id="net20-c-t">Negative cache: tên đã tạo, client vẫn nhận NXDOMAIN</title>
<desc id="net20-c-d">Sequence Client, Recursive port 5353 và Authoritative 127.0.0.4. Lần đầu hỏi upstream và cache NXDOMAIN 12 giây. Admin tạo A sau khoảng 0,1 giây, nhưng client hỏi lại ở khoảng 2,2 giây vẫn nhận NXDOMAIN từ cache, không có query upstream. Hết hạn khoảng 12 giây, entry phủ định biến mất. Tới khoảng 13,3 giây, query mới lấy A 192.0.2.20 qua authoritative.</desc>
<defs><marker id="net20-c-a" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
<rect x="95.0" y="15" width="130" height="50" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="160" y="37" font-size="14" text-anchor="middle" fill="currentColor">Client</text>
<text x="160" y="55" font-size="13" text-anchor="middle" fill="currentColor">dig</text>
<path d="M160 125 L160 710" stroke="currentColor" stroke-dasharray="5 5" opacity="0.4"/>
<rect x="332.5" y="15" width="195" height="50" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="430" y="37" font-size="14" text-anchor="middle" fill="currentColor">Recursive :5353</text>
<text x="430" y="55" font-size="13" text-anchor="middle" fill="currentColor">127.0.0.1</text>
<path d="M430 125 L430 710" stroke="currentColor" stroke-dasharray="5 5" opacity="0.4"/>
<rect x="595.0" y="15" width="160" height="50" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/>
<text x="675" y="37" font-size="14" text-anchor="middle" fill="currentColor">Authoritative .4</text>
<text x="675" y="55" font-size="13" text-anchor="middle" fill="currentColor">127.0.0.4</text>
<path d="M675 125 L675 710" stroke="currentColor" stroke-dasharray="5 5" opacity="0.4"/>
<text x="35" y="43" font-size="14" text-anchor="middle" fill="currentColor">t</text>
<path d="M35 85 L35 710" fill="none" stroke="currentColor" marker-end="url(#net20-c-a)"/>
<g data-step="1" data-until="1"><rect x="332.5" y="78" width="195" height="44" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="430" y="105" font-size="14" text-anchor="middle" fill="currentColor">Cache trống</text></g>
<g data-step="2" data-until="4"><rect x="332.5" y="78" width="195" height="44" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="430" y="105" font-size="14" text-anchor="middle" fill="currentColor">NXDOMAIN · TTL 12 s</text></g>
<g data-step="5" data-until="5"><rect x="332.5" y="78" width="195" height="44" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="430" y="105" font-size="14" text-anchor="middle" fill="currentColor">Cache trống</text></g>
<g data-step="6"><rect x="332.5" y="78" width="195" height="44" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="430" y="105" font-size="14" text-anchor="middle" fill="currentColor">A 192.0.2.20</text></g>
<g data-step="1" data-until="2"><rect x="595" y="78" width="160" height="44" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="675" y="105" font-size="13" text-anchor="middle" fill="currentColor">Chưa có tên</text></g>
<g data-step="3"><rect x="595" y="78" width="160" height="44" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor"/><text x="675" y="105" font-size="13" text-anchor="middle" fill="currentColor">A 192.0.2.20</text></g>
<g data-step="1"><path d="M160 145 L430 145" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#net20-c-a)"/><text x="295.0" y="133" font-size="13" text-anchor="middle" fill="currentColor">new.lab.test A</text><path d="M430 180 L675 180" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#net20-c-a)"/><text x="552.5" y="168" font-size="13" text-anchor="middle" fill="currentColor">new.lab.test A</text></g>
<g data-step="2"><text x="48" y="252" font-size="13" text-anchor="start" fill="currentColor">0 s</text><path d="M675 215 L430 215" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#net20-c-a)"/><text x="552.5" y="203" font-size="13" text-anchor="middle" fill="currentColor">NXDOMAIN + SOA TTL 12</text><path d="M430 250 L160 250" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#net20-c-a)"/><text x="295.0" y="238" font-size="13" text-anchor="middle" fill="currentColor">NXDOMAIN + SOA TTL 12</text><rect x="445" y="262" width="290" height="54" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor"/><text x="552" y="277" font-size="13" text-anchor="middle" fill="currentColor">min(SOA TTL, SOA.MINIMUM)</text><text x="552" y="294" font-size="13" text-anchor="middle" fill="currentColor">min(30 s, 12 s) = 12 s</text><text x="552" y="311" font-size="13" text-anchor="middle" fill="currentColor">RFC 2308 §3, §5</text></g>
<g data-step="3"><text x="48" y="346" font-size="13" text-anchor="start" fill="currentColor">≈0,1 s</text><text x="650" y="338" font-size="13" text-anchor="end" fill="currentColor">Admin: ghi A + reload</text><text x="650" y="355" font-size="13" text-anchor="end" fill="currentColor">192.0.2.20</text><path d="M675 365 L740 365 L740 388 L675 388" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#net20-c-a)"/></g>
<g data-step="4"><text x="48" y="422" font-size="13" text-anchor="start" fill="currentColor">≈2,2 s</text><path d="M160 420 L430 420" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#net20-c-a)"/><text x="295.0" y="408" font-size="13" text-anchor="middle" fill="currentColor">new.lab.test A</text><path d="M430 455 L160 455" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#net20-c-a)"/><text x="295.0" y="443" font-size="13" text-anchor="middle" fill="currentColor">NXDOMAIN TỪ CACHE</text><text x="295" y="477" font-size="13" text-anchor="middle" fill="currentColor">SOA TTL còn 10 s</text><rect x="452" y="404" width="275" height="79" rx="6" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-dasharray="4 4"/><text x="589" y="434" font-size="13" text-anchor="middle" fill="currentColor">Không hỏi authoritative</text><text x="589" y="456" font-size="13" text-anchor="middle" fill="currentColor">Không có query upstream</text></g>
<g data-step="5"><text x="48" y="521" font-size="13" text-anchor="start" fill="currentColor">≈12 s</text><path d="M130 510 L730 510" stroke="currentColor" stroke-dasharray="3 5" opacity="0.5"/><rect x="445" y="522" width="215" height="30" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor"/><text x="552" y="542" font-size="13" text-anchor="middle" fill="currentColor">Hết hạn: bỏ entry phủ định</text></g>
<g data-step="6"><text x="48" y="568" font-size="13" text-anchor="start" fill="currentColor">≈13,3 s</text><path d="M160 570 L430 570" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#net20-c-a)"/><text x="295.0" y="558" font-size="13" text-anchor="middle" fill="currentColor">new.lab.test A</text><path d="M430 605 L675 605" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#net20-c-a)"/><text x="552.5" y="593" font-size="13" text-anchor="middle" fill="currentColor">new.lab.test A</text><path d="M675 640 L430 640" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#net20-c-a)"/><text x="552.5" y="628" font-size="13" text-anchor="middle" fill="currentColor">A 192.0.2.20 · TTL 30</text><path d="M430 675 L160 675" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#net20-c-a)"/><text x="295.0" y="663" font-size="13" text-anchor="middle" fill="currentColor">A 192.0.2.20 · TTL 30</text></g>
<text x="380" y="735" font-size="13" text-anchor="middle" fill="currentColor">Thời gian đi xuống; khoảng cách trên hình không theo tỉ lệ.</text>
</svg>
<step-note data-step="1">Client chưa có kết quả, recursive cũng cache miss nên phải hỏi authoritative. Các mốc thời gian lấy từ dòng TIMELINE trong <code>net-lab/net-20/out/lab.txt</code>.</step-note>
<step-note data-step="2">Đặt t=0 tại lúc client nhận NXDOMAIN đầu tiên. Recursive giữ phủ định 12 s theo min(SOA TTL 30 s, SOA.MINIMUM 12 s), không phải TTL của A sắp tạo.</step-note>
<step-note data-step="3">Lab ghi thao tác tạo A và yêu cầu reload ở t=0,106 s; phép hỏi trực tiếp xác nhận A mới ở t=2,141 s không vẽ trong sequence này. Thay dữ liệu authoritative không xoá cache recursive.</step-note>
<step-note data-step="4">Ở t=2,161 s, client vẫn nhận NXDOMAIN với SOA TTL còn 10 s. Không có lượt recursive → authoritative tại bước này: đây là triệu chứng do cache còn hạn.</step-note>
<step-note data-step="5">Mốc hết hạn khoảng t=12 s được suy ra từ TTL, không phải sự kiện xoá cache đã được instrument. Ô NXDOMAIN biến mất ở bước này vì kết luận phủ định không còn được dùng; lab không phục vụ dữ liệu stale.</step-note>
<step-note data-step="6">Client nhận A mới ở t=13,288 s sau khi script đợi thêm 11 s. Query mới phải đi qua authoritative vì entry phủ định cũ không còn dùng được.</step-note>
</step-flow>

**SERVFAIL là phản hồi cho biết server không hoàn tất được việc xử lý câu hỏi**, không phải xác nhận tên không tồn tại. Ví dụ nguyên nhân có thể là không liên lạc được authoritative hoặc validation thất bại; bài sau đo trường hợp chữ ký sai. **Timeout là việc client không nhận phản hồi trong hạn chờ**, nên chưa có status DNS để phân loại. Dòng `no servers could be reached` không phải một NXDOMAIN được viết theo cách khác.

Một hệ giám sát chỉ gom tất cả thành “DNS error” sẽ xoá dấu vết quyết định: NXDOMAIN cần kiểm tên/zone và negative cache; SERVFAIL cần điều tra resolver/upstream/validation; timeout cần kiểm đường và server trước khi suy về dữ liệu. Lưu QNAME đầy đủ, QTYPE, resolver, status và TTL của SOA nếu có; không cần công bố tên nhạy cảm vào dashboard công khai.

### 3.6 DNS cũng cần đường TCP khi UDP không đủ

Một câu trả lời phải có dữ liệu đủ dùng, không chỉ “nhận được một packet UDP”. **TC — Truncated — là cờ cho biết message bị cắt ngắn theo quy tắc DNS**, có thể buộc client chuyển cách lấy phần trả lời đầy đủ. **EDNS là cơ chế mở rộng DNS cho phép trao đổi thêm khả năng và metadata**, trong đó có kích thước UDP payload mà phía nhận công bố. Số `udp: 1232` trong output lab là giá trị được công bố trong trao đổi, không phải kích thước thực của mọi câu trả lời.

Nếu DNS response lớn và cần TCP nhưng firewall chỉ mở UDP tới DNS server, tên có câu trả lời nhỏ vẫn chạy còn tên khác có thể lỗi. Không suy rằng DNSSEC tự làm domain hỏng chỉ vì câu trả lời có chữ ký lớn hơn. Phải kiểm TC, query TCP và đường TCP tới đúng server. Lab chỉ hỏi TCP trực tiếp một câu trả lời nhỏ; **chưa đo fallback tự động do truncation**.

> **Nguồn.** [RFC 7766 §5](https://www.rfc-editor.org/rfc/rfc7766#section-5) yêu cầu hỗ trợ TCP trong DNS. **Chưa đo:** cắt UDP rồi fallback trong lab này; đo bằng cách dựng RRset đủ lớn, giới hạn kích thước response UDP, capture cả UDP/TCP và kiểm query hoàn tất với/không với đường TCP.

## 4. Lab

### 4.1 Dựng cây riêng, tránh làm thay DNS trên host

Lab ở `net-lab/net-20/`, gồm `run.sh`, `lab.py`, `src/`, `out/`. Chạy:

```bash
cd net-lab/net-20
./run.sh
```

Script dựng container `net20-lab`, cài BIND/Unbound/dig, tạo các địa chỉ loopback trong container, chạy ba named và một Unbound. `NET_ADMIN` chỉ phục vụ việc gắn địa chỉ loopback. Không publish port và không sửa resolver của macOS. Script dọn container khi kết thúc; cấu hình sinh ra cùng log vẫn ở thư mục lab để đối chiếu. Alpine được ghim phiên bản image nhưng gói apk có thể nhận bản vá mới; đọc dòng ENV/version của **lần chạy của bạn**.

Các endpoint là root `127.0.0.2:53`, TLD `127.0.0.3:53`, zone `127.0.0.4:53`, recursive `127.0.0.1:5353`. Mọi lệnh dig dưới đây chạy **trong container của lab**, không phải trên loopback của host. `run.sh` đã thực hiện chúng và lưu output; muốn chạy từng lệnh khi tự sửa lab thì giữ tiến trình lab sống và dùng shell trong cùng container.

Cấu hình recursive dùng `module-config: "iterator"`, tắt minimisation và prefetch; không đo DNSSEC, không phục vụ stale data. Đây là điều kiện thí nghiệm để chỉ quan sát referral/cache. Không sao chép toàn bộ config thành resolver production.

### 4.2 Tự hỏi từng chặng trước khi nhờ recursive

Làm gì: gửi câu hỏi tới từng authoritative, tắt RD để không vô tình nhờ recursion.

```bash
dig @127.0.0.2 api.lab.test. A +norecurse
dig @127.0.0.3 api.lab.test. A +norecurse
dig @127.0.0.4 api.lab.test. A +norecurse
```

Các dòng quyết định trích từ `out/lab.txt`, giữ riêng từng section:

```text
;; AUTHORITY SECTION:
test.                  30 IN NS ns.test.
;; ADDITIONAL SECTION:
ns.test.               30 IN A 127.0.0.3
```

Ở TLD:

```text
;; AUTHORITY SECTION:
lab.test.              30 IN NS ns.lab.test.
;; ADDITIONAL SECTION:
ns.lab.test.           30 IN A 127.0.0.4
```

Ở chủ zone:

```text
;; flags: qr aa; QUERY: 1, ANSWER: 1, AUTHORITY: 1, ADDITIONAL: 2
;; ANSWER SECTION:
api.lab.test.          30 IN A 192.0.2.10
```

**Thấy gì:** cùng QNAME/QTYPE nhưng hai nơi chỉ trả referral, nơi cuối mới trả A trong ANSWER. **Vì sao:** mỗi server có phạm vi zone khác nhau; cấu trúc cây tên không đồng nghĩa mọi cấp giữ cùng dữ liệu host.

### 4.3 Đếm cold/warm thay vì suy từ Query time

Làm gì: hỏi `dig @127.0.0.1 -p 5353 api.lab.test. A`, đợi khoảng hai giây rồi hỏi lại. Script đọc số dòng query log ở ba authoritative sau từng lần. Các dòng thật:

```text
COUNT before server=127.0.0.2 queries=1
COUNT before server=127.0.0.3 queries=1
COUNT before server=127.0.0.4 queries=1
COUNT cold server=127.0.0.2 queries=4
COUNT cold server=127.0.0.3 queries=2
COUNT cold server=127.0.0.4 queries=2
COUNT warm server=127.0.0.2 queries=4
COUNT warm server=127.0.0.3 queries=2
COUNT warm server=127.0.0.4 queries=2
```

**Thấy gì:** cold tạo thêm query; warm không tạo thêm query tại bất kỳ authoritative nào. **Vì sao:** A chưa hết hạn đang ở recursive. Không dùng `Query time: 0 msec` trên loopback để tuyên bố DNS ngoài Internet miễn phí; độ phân giải đồng hồ và vị trí endpoint khác hẳn.

Muốn giải thích phần tăng tại root, đọc `out/queries-2.txt` thay vì lấy tổng rồi quy hết cho ứng dụng. Ba QNAME của cold là `.`, `ns.root`, `api.lab.test`, với QTYPE tương ứng NS, A, A. Hai phép hỏi tay trước đó không làm ấm cache của Unbound: bạn đã hỏi thẳng authoritative bằng một client khác.

Script còn chạy `dig @127.0.0.2 api.lab.test. A +trace +nodnssec`. Trong cây riêng, nó đặt resolver **của container** tới Unbound lab (cũng nghe port 53) cho các lookup phụ tìm địa chỉ NS. Điều này không mô phỏng chính sách resolver của hệ điều hành host; mục tiêu là giữ toàn bộ trace trong cây thử nghiệm. Đọc output đủ cả truy vấn khởi đầu và các referral, không đếm mỗi dòng `Received` như một quy tắc số query của app. Các dòng quyết định của trace thật (các lượt nhận còn có số byte/thời gian trong log):

```text
.                      30 IN NS ns.root.
test.                  30 IN NS ns.test.
lab.test.              30 IN NS ns.lab.test.
api.lab.test.          30 IN A 192.0.2.10
```

Lookup phụ dùng recursive lab đã có cache có thể tạo thêm truy vấn NS. Bộ đếm cold/warm được chốt **trước** trace, nên không gộp các lượt phụ này vào chi phí cold của phép thử trước.

### 4.4 Cho bản sai “tạo record là hết NXDOMAIN” thất bại

Làm gì: hỏi `new.lab.test A` lúc tên chưa có; thêm A vào zone, tăng serial, gửi HUP để named reload; so authoritative với recursive trước và sau khi negative cache hết hạn. `lab.py` làm các thao tác này trong một lần chạy, không để người đọc phải canh thủ công.

Trước khi thêm tên:

```text
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN
lab.test. 12 IN SOA ns.lab.test. hostmaster.lab.test. 1 60 60 600 12
```

Sau khi thêm, authoritative trả:

```text
new.lab.test.          30 IN A 192.0.2.20
```

Recursive trong cửa sổ cache cũ:

```text
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN
lab.test. 10 IN SOA ns.lab.test. hostmaster.lab.test. 1 60 60 600 12
```

Các header trên chỉ giữ phần tới status, bỏ ID thay đổi mỗi lần chạy; dữ liệu SOA giữ nguyên từ log. SOA serial vẫn `1` trong phủ định cache là dấu vết dữ liệu cũ; authoritative mới đã nạp serial `2`. Sau khi script đợi thêm, recursive trả `new.lab.test 30 IN A 192.0.2.20`.

**Thấy gì:** tạo bản ghi không phá cache phủ định; serial mới không tự đẩy vào recursive đang giữ câu trả lời cũ. **Vì sao:** recursive chưa cần hỏi lại. Serial giúp quản lý phiên bản zone, đặc biệt giữa primary/secondary, không phải kênh invalidation cho mọi client.

Để đối chiếu transport, script còn chạy `dig @127.0.0.4 api.lab.test. A +tcp +norecurse`; đoạn `authoritative over TCP` giữ A `192.0.2.10` như qua UDP. Đây là kiểm khả năng trả qua TCP, không phải bằng chứng client đã gặp TC rồi fallback tự động.

### 4.5 Tách không có tên khỏi không có loại bản ghi

Làm gì: hỏi `api.lab.test AAAA`, rồi đối chiếu với A đã tồn tại. Đoạn thật:

```text
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 1
lab.test. 12 IN SOA ns.lab.test. hostmaster.lab.test. 1 60 60 600 12
```

Header của đoạn này là `status: NOERROR`. **Thấy gì:** không có AAAA nhưng tên vẫn có A. **Vì sao:** loại bản ghi là một phần câu hỏi; một kết quả phủ định theo loại không phủ định mọi dữ liệu của tên. Khi debug dual-stack, lưu riêng A và AAAA thay vì một ô “DNS OK”. Bài [[net-09-ipv6-thuc-te]] đã nói cách client chọn đường sau khi nhận các địa chỉ.

## 5. Tính tay

Các thời gian và RTT trong bài toán dưới đây là **giả định để tính**, trừ giá trị SOA/TTL đã ghi rõ là lấy từ lab. Bỏ retry, xử lý server và chạy song song khi không nêu.

### 5.1 Bao nhiêu query, bao nhiêu server?

Từ bộ đếm lab, trước cold là `1/1/1`, sau cold là `4/2/2`. Cold đã gửi thêm bao nhiêu query upstream, tới bao nhiêu endpoint? Tính cả câu hỏi ban đầu từ stub thì có bao nhiêu cặp hỏi–đáp, giả sử mỗi query đều chỉ có một response?

**Giải:** `(4−1)+(2−1)+(2−1)=5` query upstream, tới **3 endpoint**. Thêm câu hỏi stub → recursive thành **6 cặp hỏi–đáp**. Không kết luận có sáu server và không cộng lại ba phép hỏi tay vào chi phí cold của recursive. Với warm, tăng upstream bằng **0** nhưng vẫn có cặp stub–recursive nếu stub gửi query; cache tại app có thể tránh cả cặp cuối này.

### 5.2 Hạn phủ định được tính từ lúc nào?

SOA TTL bằng **30 s**, MINIMUM bằng **12 s** như lab. Giả sử recursive nhận NXDOMAIN tại `t=0`, authoritative tạo tên tại `t=3`. Resolver dùng đúng TTL RFC 2308, không prefetch, không serve-stale và không áp trần thấp hơn. Hỏi tại `t=5` và `t=13` có thể trả gì?

**Giải:** thời gian giữ phủ định là `min(30,12)=12 s`. Tại `t=5`, còn `12−5=7 s`, nên có thể vẫn NXDOMAIN dù tên đã tồn tại được hai giây. Tại `t=13`, phủ định cũ không còn được dùng theo mô hình; resolver phải tìm kết quả mới hoặc gặp lỗi truy vấn mới. Nếu authoritative và đường đi hoạt động, nó nhận A. Không được diễn giải “TTL 12” thành “đợi 12 giây từ lúc tạo tên”.

### 5.3 Cache thay đổi phần nào của ngân sách latency?

Giả sử một lần tìm cold chỉ có ba lượt tuần tự root/TLD/zone với RTT **20/30/40 ms**, RTT stub–recursive **4 ms**, không priming, không CNAME, không DNSSEC. Warm còn nguyên RRset A. Tính thời gian mô hình và phần giảm.

**Giải:** cold `4+20+30+40=94 ms`; warm `4 ms`; giảm `90 ms`, tức `90/94×100 ≈ 95,74%`. Đây là **suy luận từ mô hình giả định**, không phải benchmark từ lab loopback. Nếu cache A trượt nhưng delegation còn, mô hình ba lượt không còn phù hợp; nếu có query song song, cũng không cộng tuyến tính tất cả RTT một cách máy móc.

## 6. Chuyển giao

1. Trace từ laptop tới authoritative thành công, nhưng worker trong mạng riêng timeout khi dùng resolver mặc định. Bạn cần ghi endpoint và phép thử nào ở worker để tránh suy rằng dữ liệu DNS toàn cầu sai?
2. A hoạt động, AAAA NOERROR nhưng ANSWER rỗng. Một dashboard báo “domain missing”. Bạn sửa cách phân loại lỗi và dữ liệu log tối thiểu ra sao?
3. Đổi địa chỉ của name server nhưng giữ nguyên tên NS. Resolver này chạy, resolver khác timeout. Bạn kiểm địa chỉ NS trong child, glue trong parent và cache ở đâu, theo thứ tự nào?
4. Tên bí danh còn CNAME, đích đã đổi zone và đang NXDOMAIN ở một recursive. Hãy thiết kế phép hỏi tách hạn CNAME, hạn A và hạn phủ định mà không flush toàn bộ cache.
5. App vẫn nhận IP cũ trong khi dig tới đúng recursive trả IP mới. Bạn đặt điểm quan sát ở thư viện DNS, dịch vụ OS và connection pool thế nào để chứng minh tầng nào chưa dùng dữ liệu mới?
6. **Câu khó nhất, không có đáp án trong bài.** Một resolver có QNAME minimisation, DNSSEC, nhiều upstream, aggressive negative caching và phục vụ stale data khi authoritative mất mạng. Hãy thiết kế bộ thí nghiệm để phân biệt năm nguyên nhân làm số query thấp hơn mô hình root–TLD–zone, đồng thời chứng minh một NXDOMAIN đang dùng đến từ cache thường, suy diễn từ chứng cứ DNSSEC hay một view khác. Không được dựa duy nhất vào Query time hoặc cờ AA.

## 7. Tóm tắt

- Recursive lần theo delegation; root không giữ A của mọi host và không chuyển tiếp thay mọi client.
- Referral phải đọc cùng AUTHORITY/ADDITIONAL; A của name server trong glue không phải A của ứng dụng.
- `dig +trace` thực hiện đường truy vấn riêng, không xuất lịch sử cache và query của recursive mà app đang dùng.
- Cold trong lab tạo 5 query upstream tới 3 authoritative; warm không tăng bộ đếm và A TTL giảm từ 30 xuống 28.
- CNAME, A, NS và địa chỉ NS có thể có các hạn cache khác nhau.
- RFC 2308 lấy TTL phủ định từ giá trị nhỏ hơn giữa SOA TTL và SOA.MINIMUM; lab là `min(30,12)=12 s`.
- NXDOMAIN, NODATA, SERVFAIL và timeout là các quan sát khác nhau, cần các bước điều tra khác nhau.

→ **Bài 21 — DNS khi vận hành**: từ các đồng hồ và điểm quan sát vừa đo, lập kế hoạch đổi IP, kiểm apex, tách view và xác định DNSSEC thực sự xác thực điều gì.
