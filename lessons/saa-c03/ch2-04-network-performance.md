# SAA Ch2.4 — Network & Edge Performance

> Mục tiêu: Hiểu các tầng tối ưu network từ **client → edge → region → VPC → service**, biết khi nào dùng CloudFront vs Global Accelerator, hiểu VPC endpoint tiết kiệm cả tiền lẫn latency, và Direct Connect khi nào hơn VPN.

Tiền đề: [[foundations-04-latency-vs-consistency]], CLF [[06-vpc]].

---

## 1. Câu chuyện mở đầu — Web app "chậm với user Việt Nam"

Web app deploy ở `us-east-1` (Virginia). User ở Việt Nam phàn nàn trang load 8 giây. Trước khi đọc số đo, cần một khái niệm: **RTT** (round-trip time) là thời gian một gói tin đi tới server **và** phản hồi quay về. Việt Nam ↔ bờ Đông nước Mỹ cách nhau nửa vòng trái đất, RTT khoảng **200 ms** — đây là giới hạn vật lý của cáp quang, không mua thêm được.

DevTools của trình duyệt cho thấy 8 giây đó gồm:

| Bước | Thời gian | Vì sao |
|------|-----------|--------|
| DNS | 200 ms | Resolver chưa có sẵn câu trả lời trong cache, phải đi hỏi lần lượt các tầng name server |
| TCP + TLS handshake | 600 ms | Bắt tay TCP mất 1 RTT, bắt tay TLS 1.2 mất thêm 2 RTT: 3 × 200 ms |
| TTFB (time to first byte — từ lúc gửi request tới khi nhận byte đầu tiên) | 400 ms | 1 RTT (200 ms) + server xử lý 200 ms |
| Tải HTML 50 KB | 800 ms | Kết nối TCP mới chỉ được gửi ~14 KB trong lượt đầu rồi tăng dần (*slow start*), mỗi lần tăng phải chờ xác nhận vượt biển — ở đây mất 4 lượt đi-về |
| ~30 file CSS/JS/ảnh | ~6.000 ms | Trình duyệt mở thêm kết nối song song, **mỗi kết nối lại bắt tay TCP + TLS 600 ms**, rồi mỗi file thêm ít nhất 1 RTT |

Trong 8 giây, **server chỉ thật sự làm việc 200 ms**. Phần còn lại là thời gian gói tin bơi qua Thái Bình Dương, lặp đi lặp lại hàng chục lần. Tăng CPU hay tối ưu query không lấy lại được giây nào trong số đó.

**Lời giải** là rút ngắn quãng đường của từng lượt đi-về chứ không phải làm server nhanh hơn. Đặt **CloudFront** trước app: user bắt tay với một edge POP gần họ (TP.HCM, Hà Nội hoặc Singapore — giả sử RTT ~20 ms), file tĩnh được trả thẳng từ cache ở POP đó.

```
                    Trước (thẳng tới us-east-1)     Sau (qua CloudFront, RTT tới POP ~20 ms)
DNS                 200 ms                           200 ms   (CloudFront không đổi được bước này)
TCP + TLS           3 × 200 = 600 ms                 3 × 20  = 60 ms   (bắt tay với POP, không vượt biển)
TTFB trang động     200 + 200 = 400 ms               20 + 200 + 200 = 420 ms  (vẫn phải về origin)
Tải HTML 50 KB      800 ms                           ~60 ms   (POP ↔ origin dùng kết nối đã "nóng")
30 file tĩnh        ~6.000 ms                        ~300 ms  (cache hit tại POP, chung 1 kết nối HTTP/2)
Tổng                ~8.000 ms                        ~1.040 ms
```

Con số "sau" là ước lượng minh hoạ, nhưng tỉ lệ thì đúng với thực tế: CloudFront gần như xoá sổ chi phí **bắt tay** và **file tĩnh**, còn **TTFB của trang động hầu như không đổi** vì request vẫn phải về tận origin để chạy code. Muốn giảm nốt phần đó thì phải cache được response (§4), hoặc đưa chính compute lại gần user (multi-region ở §3, Local Zones ở §6).

Cả bài này đi lần lượt qua từng tầng trên đường đi của request để xem tầng nào bớt được bao nhiêu.

---

## 2. Tầng tối ưu network

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 470" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Các tầng tối ưu network — từ user xuống service</title>
  <desc>Luồng đi xuống qua các tầng: User, DNS Route 53, Edge POP CloudFront hoặc Global Accelerator, AWS backbone, VPC ALB hoặc API Gateway, ENI hoặc VPC endpoint, rồi tới EC2 Lambda DB. Mỗi hop là một cơ hội tối ưu.</desc>
  <defs>
    <marker id="np1Arr" markerWidth="11" markerHeight="11" refX="5" refY="8" orient="auto"><path d="M0 0 L5 8 L10 0" fill="none" stroke="currentColor" stroke-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Các tầng tối ưu network — mỗi hop một cơ hội</text>
  <rect x="180" y="38" width="360" height="42" rx="10" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="60" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">User</text>
  <text x="360" y="74" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">trình duyệt / client app</text>
  <line x1="360" y1="80" x2="360" y2="98" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#np1Arr)"/>
  <text x="372" y="94" font-size="10" fill="currentColor" opacity="0.6">DNS resolution</text>
  <rect x="120" y="100" width="480" height="46" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="132" y="112" width="84" height="22" rx="11" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="174" y="127" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">DNS</text>
  <text x="232" y="121" font-size="12.5" font-weight="700" fill="currentColor">Route 53</text>
  <text x="232" y="138" font-size="10.5" fill="currentColor" opacity="0.62">latency / geo / failover routing</text>
  <line x1="360" y1="146" x2="360" y2="164" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#np1Arr)"/>
  <text x="372" y="160" font-size="10" fill="currentColor" opacity="0.6">Edge (POP gần user)</text>
  <rect x="120" y="166" width="480" height="46" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="132" y="178" width="84" height="22" rx="11" fill="#10b981" fill-opacity="0.92"/>
  <text x="174" y="193" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">Edge POP</text>
  <text x="232" y="187" font-size="12.5" font-weight="700" fill="currentColor">CloudFront cache · Lambda@Edge · GA</text>
  <text x="232" y="204" font-size="10.5" fill="currentColor" opacity="0.62">TLS terminate, cache, anycast IP</text>
  <line x1="360" y1="212" x2="360" y2="230" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#np1Arr)"/>
  <text x="372" y="226" font-size="10" fill="currentColor" opacity="0.6">AWS backbone (private fiber)</text>
  <rect x="120" y="232" width="480" height="42" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="132" y="242" width="84" height="22" rx="11" fill="#f59e0b" fill-opacity="0.92"/>
  <text x="174" y="257" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">Backbone</text>
  <text x="232" y="259" font-size="11.5" fill="currentColor" opacity="0.85">private fiber giữa edge và region — ít jitter/loss</text>
  <line x1="360" y1="274" x2="360" y2="292" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#np1Arr)"/>
  <rect x="120" y="294" width="480" height="46" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="132" y="306" width="84" height="22" rx="11" fill="#8b5cf6" fill-opacity="0.92"/>
  <text x="174" y="321" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">VPC</text>
  <text x="232" y="315" font-size="12.5" font-weight="700" fill="currentColor">ALB / API Gateway</text>
  <text x="232" y="332" font-size="10.5" fill="currentColor" opacity="0.62">entry point vào region</text>
  <line x1="360" y1="340" x2="360" y2="358" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#np1Arr)"/>
  <text x="372" y="354" font-size="10" fill="currentColor" opacity="0.6">ENI / VPC endpoint</text>
  <rect x="120" y="360" width="480" height="42" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="132" y="370" width="84" height="22" rx="11" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="174" y="385" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">ENI</text>
  <text x="232" y="387" font-size="11.5" fill="currentColor" opacity="0.85">ENI / VPC endpoint — private path tới service</text>
  <line x1="360" y1="402" x2="360" y2="420" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#np1Arr)"/>
  <rect x="180" y="422" width="360" height="40" rx="10" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="447" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2 · Lambda · DB</text>
</svg>

Mỗi hop (chặng) trên sơ đồ là một chỗ có thể rút bớt thời gian, và mỗi chặng ứng với một nhóm dịch vụ:

- **DNS** quyết định user được gửi tới region nào — Route 53 (§3).
- **Edge POP** (point of presence: cụm máy của AWS đặt ở các thành phố lớn, gần người dùng hơn region) là nơi bắt tay TLS và trả cache — CloudFront (§4), hoặc làm cửa vào mạng riêng của AWS — Global Accelerator (§5).
- **Backbone** là mạng cáp quang riêng của AWS nối các POP và region. Gói tin đi trên đó ít bị mất và ít dao động độ trễ (*jitter*) hơn so với đi qua internet công cộng, nơi nó phải nhảy qua mạng của nhiều nhà mạng khác nhau.
- **Trong VPC**, đường từ compute tới service khác có thể đi vòng qua NAT ra internet hoặc đi thẳng bằng VPC endpoint (§7).
- **On-prem ↔ AWS** là VPN hoặc Direct Connect (§8).

---

## 3. Route 53 — DNS

**DNS làm gì.** Trình duyệt chỉ kết nối được tới địa chỉ IP, nên trước mọi request nó phải đổi tên `app.example.com` thành IP. Việc đó có ba vai:

- **Client** (trình duyệt, app) hỏi một **resolver** — máy chủ DNS trung gian của nhà mạng, của công ty, hoặc công cộng như `8.8.8.8`.
- **Resolver** đi hỏi hộ, rồi **giữ câu trả lời trong cache** một thời gian.
- **Authoritative name server** là nơi giữ câu trả lời gốc cho domain. **Route 53 đóng vai này.** Một domain cùng các record của nó trong Route 53 gọi là một **hosted zone**.

Từ sơ đồ ba vai này suy ra hai điều chi phối cả section:

1. **Route 53 chỉ trả lời "đi tới IP nào", traffic không hề chạy qua Route 53.** Nó là người chỉ đường, không phải con đường. Vì vậy nó không tăng tốc được kết nối, chỉ chọn được đích tốt hơn.
2. **Route 53 không nhìn thấy user, chỉ thấy resolver.** Nó đoán vị trí user qua IP của resolver (hoặc qua một đoạn IP của user nếu resolver gửi kèm, cơ chế tên là *EDNS Client Subnet*). User ở Hà Nội dùng một resolver đặt ở Mỹ có thể bị coi là user Mỹ.

**Record hay gặp:** `A` trỏ tên tới IPv4, `AAAA` tới IPv6, `CNAME` trỏ tên tới một tên khác. Riêng Route 53 có thêm **Alias**: trỏ thẳng tên tới một tài nguyên AWS (ALB, CloudFront distribution, S3 website, API Gateway…). Alias khác CNAME ở hai điểm đề hay hỏi: nó **dùng được ở domain gốc** (`example.com`, nơi chuẩn DNS cấm CNAME), và query tới Alias trỏ vào tài nguyên AWS **không tính tiền**.

### 3.1 Routing policies

Một tên có thể có nhiều record (ví dụ một record cho mỗi region). **Routing policy** là luật Route 53 dùng để chọn record nào sẽ trả về cho từng câu hỏi. Tám policy chia thành ba nhóm theo câu hỏi chúng trả lời.

**Nhóm "chia tải / chịu lỗi"**

- **Simple** — một tên, một câu trả lời, không health check. Dùng khi chỉ có một đích.
- **Weighted** — mỗi record có một trọng số, xác suất được chọn bằng trọng số chia cho tổng. Hai record nặng 90 và 10 thì record sau nhận 10 ÷ (90 + 10) = 10% lượt phân giải. Dùng để thả dần bản mới (canary) hoặc A/B test; đặt trọng số 0 là ngừng gửi tới record đó.
- **Failover** — cặp primary/secondary. Bình thường luôn trả primary; khi health check của primary fail thì trả secondary. Đây là mô hình active-passive cho DR.
- **Multivalue answer** — trả về **tối đa 8 IP còn khoẻ**, chọn ngẫu nhiên, để client tự thử cái khác nếu một cái chết. Khác Simple ở chỗ mỗi IP gắn được health check. Nó cải thiện độ sẵn sàng nhưng **không thay được load balancer** vì DNS không biết server nào đang quá tải.

**Nhóm "chọn theo vị trí user"** — ba policy dễ lẫn nhất, khác nhau ở *thứ được đem ra so*:

- **Latency-based** so **độ trễ mạng**. AWS liên tục thu số liệu độ trễ giữa các dải mạng trên internet và từng region; khi có query, Route 53 tra bảng đó xem từ mạng của resolver thì region nào (trong số các region bạn có record) nhanh nhất. Nó **không đo trực tiếp** lúc query, và kết quả có thể đổi theo tuần khi đường truyền internet thay đổi. Region nhanh nhất không nhất thiết là region gần nhất trên bản đồ: user ở Hà Nội có thể được trả về Tokyo thay vì Singapore nếu tuyến cáp đi Tokyo đang tốt hơn.
- **Geolocation** so **địa chỉ hành chính** của IP: châu lục, quốc gia, hoặc bang của Mỹ. Luật kiểu "user ở Đức → record Frankfurt". Mục đích không phải tốc độ mà là **nội dung và pháp lý**: hiện đúng ngôn ngữ, chặn nội dung không có bản quyền ở một nước, giữ dữ liệu user châu Âu trong châu Âu. Luôn phải tạo thêm một record **Default**, nếu không user ở nơi không khớp luật nào sẽ nhận câu trả lời rỗng.
- **Geoproximity** so **khoảng cách địa lý** từ user tới tài nguyên, và cho bạn kéo giãn hoặc thu hẹp vùng phục vụ của từng tài nguyên bằng một số gọi là **bias** (từ −99 tới +99). Công thức: `khoảng cách tính toán = khoảng cách thật × (1 − bias/100)`. Server A cách user 150 km với bias +50 được coi như cách 150 × 0,5 = 75 km, nên thắng server B cách 100 km không có bias. Dùng khi muốn chủ động dồn bớt traffic từ một region đang quá tải sang region bên cạnh. Trong đề thi geoproximity thường đi cùng **Route 53 Traffic Flow** — trình soạn policy bằng sơ đồ kéo thả, tính ~$50 mỗi policy record mỗi tháng.

**Nhóm "chọn theo mạng của client"**

- **IP-based** — bạn tự khai các dải IP (CIDR) và record tương ứng: "client thuộc dải IP của nhà mạng X → endpoint này". Dùng khi bạn biết rõ client đến từ mạng nào hơn là Route 53 đoán.

| Policy | So cái gì để chọn | Dùng khi | Từ khoá đề |
|--------|-------------------|----------|------------|
| **Simple** | Không so gì | Một đích duy nhất | — |
| **Weighted** | Trọng số bạn đặt | Canary, A/B test, chia % giữa hai stack | "gửi 10% traffic sang bản mới" |
| **Failover** | Health check của primary | DR active-passive | "standby", "khi primary lỗi" |
| **Multivalue** | Health check từng IP, trả tối đa 8 | Vài server không có load balancer | "trả nhiều IP khoẻ" |
| **Latency-based** | Độ trễ mạng tới từng region | App chạy nhiều region, muốn user nhanh nhất | "lowest latency", "best performance" |
| **Geolocation** | Quốc gia/châu lục của IP | Ngôn ngữ, bản quyền, data residency | "user ở nước X phải tới…", "compliance" |
| **Geoproximity** | Khoảng cách địa lý + bias | Dịch chuyển traffic giữa các region theo ý muốn | "bias", "shift traffic", "Traffic Flow" |
| **IP-based** | Dải CIDR bạn khai | Biết trước mạng của client | "theo ISP", "theo CIDR" |

Các policy **lồng nhau được**: tầng ngoài latency-based chọn region, tầng trong mỗi region là một cặp failover. Đó là cách dựng active-active nhiều region có dự phòng.

> 🪤 Bẫy thi: "user phải được phục vụ **nhanh nhất**" → latency-based. "User ở **nước X** phải tới endpoint Y" hoặc có chữ luật/bản quyền → geolocation. Chọn geolocation cho bài toán tốc độ là sai, vì gần về hành chính không có nghĩa là nhanh về mạng.

### 3.2 TTL trade-off

**TTL** (time to live) là số giây resolver được phép giữ câu trả lời trong cache trước khi phải hỏi lại Route 53. Nó là cái núm đánh đổi giữa "đổi hướng nhanh" và "ít query".

- **TTL thấp (60 giây):** khi bạn đổi record hoặc failover, client đi đúng chỗ mới sau tối đa khoảng 1 phút. Đổi lại resolver hỏi lại thường xuyên hơn, bạn trả nhiều tiền query hơn.
- **TTL cao (1 ngày):** ít query, phân giải nhanh vì gần như luôn trúng cache. Nhưng nếu endpoint chết, có client vẫn bị gửi tới IP cũ suốt 24 giờ.

Tiền query nhỏ hơn nhiều người tưởng, nên đừng vì nó mà đặt TTL dài cho record cần failover:

```
Giá query thường (us-east-1): ~$0,40 mỗi 1 triệu query

TTL 300 giây, 100 triệu query/tháng:      100 × $0,40 = $40
Hạ TTL xuống 60 giây (tối đa gấp 5 query): 500 × $0,40 = $200
Alias trỏ tới ALB/CloudFront:              $0 (không tính tiền query)
```

Hai điều cần nhớ thêm. Record **Alias** không cho bạn đặt TTL: nó dùng TTL của tài nguyên đích. Và TTL chỉ là *lời đề nghị*: một số client (JVM cấu hình mặc định cũ, thiết bị IoT, app tự cache DNS) giữ IP lâu hơn TTL, nên DNS failover không bao giờ đảm bảo được "mọi client chuyển trong N giây". Đây là lý do Global Accelerator tồn tại — xem §5.5.

### 3.3 Healthcheck

Route 53 chỉ biết một endpoint chết nếu có **health check** gắn vào record. Health check là một bộ máy độc lập: các *health checker* của AWS đặt ở nhiều nơi trên thế giới định kỳ gọi thử endpoint của bạn rồi biểu quyết.

Có ba loại:

- **Endpoint check** — gọi HTTP, HTTPS hoặc mở kết nối TCP tới một IP/domain. Coi là khoẻ khi nhận mã 2xx/3xx; có thể bắt thêm một chuỗi ký tự phải xuất hiện trong body (*string matching*).
- **Calculated check** — không gọi gì cả, chỉ gộp kết quả của các check con theo luật kiểu "ít nhất 2 trong 3 check con khoẻ". Dùng khi "app khoẻ" nghĩa là web **và** API **và** DB đều khoẻ.
- **CloudWatch alarm check** — khoẻ hay không dựa theo trạng thái một alarm. Đây là cách duy nhất để theo dõi **tài nguyên private**: health checker nằm ngoài internet nên không gọi được IP private trong VPC, nhưng bạn có thể để một metric nội bộ kích alarm, rồi health check đọc alarm đó.

**Phát hiện lỗi mất bao lâu.** Hai thông số quyết định: **request interval** — khoảng cách giữa hai lần gọi, mặc định **30 giây**, có tuỳ chọn *fast* **10 giây** trả thêm tiền — và **failure threshold** — số lần fail liên tiếp mới coi là chết, mặc định **3**.

```
Mặc định:  30 giây × 3 lần fail = ~90 giây để Route 53 coi endpoint là chết
Fast:      10 giây × 3 lần fail = ~30 giây

Cộng thêm TTL 60 giây của record:
  Mặc định ≈ 90 + 60 = ~150 giây   |   Fast ≈ 30 + 60 = ~90 giây
→ DNS failover đo bằng PHÚT, không bằng giây.
```

Về giá (us-east-1): một health check cơ bản ~$0,50/tháng cho endpoint trong AWS, ~$0,75 cho endpoint ngoài AWS. Mỗi tính năng tuỳ chọn (fast interval, HTTPS, string matching, đo latency) cộng ~$1/tháng với endpoint AWS. Tức bật fast interval làm một check từ $0,50 lên $1,50 mỗi tháng — rẻ so với việc rút ngắn một phút downtime.

Health check kết hợp với **failover routing** ở §3.1 là mẫu DR cơ bản nhất của Route 53: primary chết → check fail → Route 53 bắt đầu trả record secondary.

### 3.4 Private hosted zone

Hosted zone bình thường là **public**: ai trên internet cũng phân giải được. **Private hosted zone** là một zone chỉ trả lời cho các VPC bạn gắn nó vào. Nhờ đó service nội bộ gọi nhau bằng tên như `db.internal.example.com` thay vì IP private, và tên đó không tồn tại với thế giới bên ngoài.

- VPC phải bật cả hai thuộc tính **`enableDnsSupport`** (cho phép dùng DNS resolver có sẵn của VPC) và **`enableDnsHostnames`** (cấp tên DNS cho instance). Thiếu một trong hai thì private zone không phân giải được — lỗi cấu hình hay gặp trong đề.
- Cùng một tên có thể có cả public zone lẫn private zone, trả hai IP khác nhau cho người ngoài và cho bên trong VPC. Kỹ thuật này gọi là *split-horizon DNS*.

**Hybrid DNS — Route 53 Resolver endpoint.** Máy on-prem (nối vào VPC qua VPN/Direct Connect) không tự hỏi được private zone, và EC2 trong VPC cũng không tự phân giải được tên nội bộ của công ty như `erp.corp.local`. Resolver endpoint là các ENI (network interface) đặt trong VPC làm cầu nối cho query DNS:

| Endpoint | Chiều query | Dùng khi |
|----------|-------------|----------|
| **Inbound** | On-prem → AWS | Máy on-prem cần phân giải tên trong private hosted zone |
| **Outbound** (kèm *forwarding rule*) | AWS → on-prem | EC2 cần phân giải tên do DNS server của công ty quản lý |

---

## 4. CloudFront — CDN

**CDN** (content delivery network) là một mạng máy chủ đặt rải khắp thế giới, giữ **bản sao** nội dung của bạn để trả cho user từ chỗ gần họ nhất. CloudFront là CDN của AWS. Nó làm request nhanh hơn theo hai cách khác nhau, và phân biệt hai cách này là chìa khoá của cả section:

1. **Cache** — nội dung đã có sẵn ở edge thì trả luôn, request không cần về server của bạn. Chỉ áp dụng cho nội dung nhiều người dùng chung.
2. **Rút ngắn bắt tay và đi backbone** — kể cả khi không cache được gì, user vẫn bắt tay TCP/TLS với POP ở gần, và POP giữ sẵn kết nối tới server của bạn qua mạng riêng của AWS. Đây là phần "60 ms thay cho 600 ms" ở §1.

### 4.1 Cơ bản

**Ba khái niệm:**

- **Origin** là nơi giữ bản gốc: một S3 bucket, một ALB, một EC2, một API Gateway, một origin của MediaPackage (video), hoặc bất kỳ HTTP server nào kể cả ngoài AWS.
- **Distribution** là một cấu hình CloudFront, có domain riêng dạng `d111abc.cloudfront.net`. Bạn trỏ `www.example.com` vào đó bằng record Alias.
- **Edge location / POP** là nơi đặt cache. Hiện có **750+ POP** ở hơn 100 thành phố (tài liệu cũ ghi 400+ hoặc 600+, đề thi không hỏi con số chính xác). Giữa POP và origin còn một tầng **regional edge cache** lớn hơn, giữ được những object ít người hỏi mà POP nhỏ đã phải bỏ đi.

**Đường đi của một request.** User hỏi `https://www.example.com/logo.png`, DNS trả về IP của POP gần nhất. POP tìm trong cache:

- **Cache hit** — có sẵn và chưa hết hạn: trả ngay cho user, origin không hề biết có request này.
- **Cache miss** — chưa có hoặc đã hết hạn: POP hỏi regional edge cache; ở đó cũng không có thì mới về origin, lấy object, lưu lại, rồi trả cho user. Người **đầu tiên** ở mỗi khu vực luôn chịu chậm; những người sau hưởng cache.

Tỉ lệ request được trả từ cache gọi là **cache hit ratio**. Hit ratio 40% nghĩa là 60% request vẫn phải về origin — CDN đang làm việc chưa tới một nửa công suất. Hai thứ quyết định hit ratio là **cache key** và **TTL**.

**Cache key — "hai request thế nào thì được coi là một?"** Cache key là tập thông tin CloudFront dùng để nhận diện một object trong cache. Mặc định nó là **domain + đường dẫn URL**. Bạn có thể thêm query string, header hoặc cookie vào cache key khi origin thật sự trả nội dung khác nhau theo các giá trị đó (ví dụ `?lang=vi` và `?lang=en`).

Mỗi thứ thêm vào cache key **nhân số bản cache lên**, vì chỉ cần khác một ký tự là thành object khác:

```
Site có 200 file tĩnh, 50.000 user đang đăng nhập.

Cache key = URL:
  200 object trong cache. Người thứ 2 trở đi xin logo.png đều là cache hit.

Cache key = URL + cookie session (mỗi user một giá trị):
  200 × 50.000 = 10.000.000 "object" khác nhau.
  logo.png của user A không dùng lại được cho user B → gần như mọi request đều miss.
```

Đây là nguyên nhân phổ biến nhất của hit ratio thấp: forward **toàn bộ** cookie hoặc header `User-Agent` (có hàng nghìn biến thể) cho cả file tĩnh. Cấu hình việc này bằng hai loại policy gắn vào distribution:

- **Cache policy** — khai những gì nằm trong cache key, cùng với TTL.
- **Origin request policy** — khai những gì được **gửi kèm về origin nhưng không tính vào cache key**. Dùng khi origin cần đọc một header để ghi log nhưng nội dung trả về không đổi theo header đó.

**TTL — object sống trong cache bao lâu.** Origin báo bằng header `Cache-Control: max-age=<giây>` (hoặc `s-maxage` nếu muốn CDN giữ lâu hơn trình duyệt). CloudFront kẹp giá trị đó trong khoảng **Minimum TTL – Maximum TTL** của cache policy. Nếu origin không gửi `Cache-Control`, CloudFront dùng **Default TTL**, mặc định **24 giờ**. Hết TTL không có nghĩa là tải lại cả file: POP hỏi origin "file này đổi chưa?", origin trả `304 Not Modified` (không kèm nội dung) thì POP dùng tiếp bản cũ.

**Tăng cache hit ratio — các việc cụ thể**, xếp theo mức hiệu quả thường gặp:

1. **Bỏ cookie, header, query string thừa khỏi cache key.** File tĩnh không cần cookie nào; chỉ giữ đúng tham số làm nội dung đổi.
2. **Tách cache behavior** (§4.2) cho tĩnh và động, để cấu hình "forward cookie" của `/api/*` không lây sang `/static/*`.
3. **Tăng TTL.** Đặt `max-age` dài nhất chấp nhận được; với file có tên chứa version (`app.3f9a1c.js`) thì để 1 năm.
4. **Chuẩn hoá request.** `?a=1&b=2` và `?b=2&a=1`, hay `?Lang=VI` và `?lang=vi`, là bốn cache key khác nhau dù nội dung y hệt. Sắp xếp và viết thường tham số ở phía client hoặc bằng một CloudFront Function (§4.4).
5. **Dùng header thiết bị của CloudFront thay cho `User-Agent`.** Nếu chỉ cần phân biệt mobile/desktop, cache theo `CloudFront-Is-Mobile-Viewer` (2 giá trị) thay vì `User-Agent` (vô số giá trị).
6. **Bật Origin Shield** (§4.3) để các POP ở nhiều khu vực dùng chung một lớp cache.

### 4.2 Cache behaviors

Một site không cache giống nhau cho mọi đường dẫn: ảnh có thể giữ cả năm, còn `/api/cart` thì mỗi user một kết quả. **Cache behavior** là một bộ luật gắn với một **path pattern**; request khớp pattern nào thì dùng luật đó, không khớp gì thì rơi về behavior mặc định (`*`). Mỗi behavior tự chọn: origin nào, cache policy nào, cho phép method nào, có bắt buộc HTTPS không (*viewer protocol policy*), có gắn function nào không.

| Path pattern | Origin | Cache |
|--------------|--------|-------|
| `/static/*` | S3 bucket | Cache key chỉ gồm URL, TTL 1 năm |
| `/api/*` | ALB | Không cache; forward header `Authorization` và mọi query string |
| `*` (mặc định) | ALB | TTL ngắn, vài phút |

Nhờ vậy **một** domain phục vụ được cả S3 lẫn ALB, và user không thấy sự khác biệt.

### 4.3 Origin Shield

Mỗi regional edge cache giữ bản cache riêng. Một object vừa hết hạn mà được hỏi cùng lúc từ Tokyo, Frankfurt và São Paulo sẽ sinh ra **ba** request về origin, dù cả ba xin cùng một thứ. **Origin Shield** là một lớp cache nữa đặt ở **một** region bạn chọn (thường là region gần origin nhất); mọi tầng cache khác phải đi qua nó trước khi chạm origin. Với ví dụ trên, origin chỉ nhận **một** request, hai nơi còn lại lấy từ Origin Shield.

- **Nên bật khi:** viewer rải ở nhiều châu lục; origin yếu hoặc mỗi request tốn kém (server on-prem, bộ đóng gói video chạy theo yêu cầu, API tính tiền theo lượt gọi).
- **Ít tác dụng khi:** viewer tập trung ở một khu vực, vì khi đó vốn chỉ có một regional edge cache đứng trước origin.
- **Chi phí:** tính thêm theo số request đi qua Origin Shield (~$0,0075 mỗi 10.000 request ở Mỹ). Mức giảm tải cho origin tuỳ độ phân tán của traffic, AWS không công bố con số chung.

### 4.4 Lambda@Edge vs CloudFront Functions

Đôi khi cần chạy một đoạn code **ngay tại edge**, trước khi request tới cache hoặc tới origin: redirect theo quốc gia, viết lại URL, thêm security header, kiểm tra token. Một request đi qua bốn điểm có thể gắn code:

```
User ──(1) viewer request──▶ [ CACHE của POP ] ──(2) origin request──▶ Origin
User ◀─(4) viewer response── [ CACHE của POP ] ◀─(3) origin response── Origin
```

Điểm (1) và (4) chạy trên **mọi** request, kể cả cache hit. Điểm (2) và (3) chỉ chạy khi **cache miss**. Điều này giải thích vì sao có hai dịch vụ:

- **CloudFront Functions** là JavaScript rất nhẹ chạy ngay trong POP, chỉ gắn được ở (1) và (4). Vì chạy trên mọi request nên nó bị ép phải cực nhanh và cực hạn chế: dưới 1 ms, 2 MB bộ nhớ, **không gọi mạng, không đọc body**.
- **Lambda@Edge** là hàm Lambda thật (Node.js hoặc Python) được nhân bản ra các regional edge cache, gắn được cả bốn điểm. Nó gọi được dịch vụ khác, đọc được body, dùng được thư viện — đổi lại chậm hơn và đắt hơn.

| | CloudFront Functions | Lambda@Edge |
|--|---------------------|-------------|
| Ngôn ngữ | JavaScript (runtime riêng `cloudfront-js`) | Node.js / Python |
| Gắn được ở | Viewer request, viewer response | Cả 4 điểm (viewer + origin, request + response) |
| Thời gian chạy | Dưới 1 ms | Đề thi: tối đa **5 giây** (viewer) / **30 giây** (origin). Docs hiện ghi tới 30 giây cho cả hai |
| Bộ nhớ | 2 MB | 128 MB (viewer) / tới 10 GB (origin) |
| Gọi mạng, đọc body | Không | Có |
| Quy mô | Hàng triệu request/giây | Tới 10.000 request/giây mỗi region |
| Giá (us-east-1) | ~$0,10 / 1 triệu lượt | ~$0,60 / 1 triệu lượt + tiền theo thời gian chạy |
| Dùng cho | Viết lại/redirect URL, thêm sửa header, chuẩn hoá cache key, kiểm tra chữ ký JWT | Gọi API/DB để quyết định, resize ảnh, chọn origin (ví dụ bucket S3) theo request, A/B test có trạng thái |

Với 100 triệu lượt mỗi tháng: CloudFront Functions ~100 × $0,10 = **$10**, Lambda@Edge ~100 × $0,60 = **$60** chưa kể tiền thời gian chạy — rẻ hơn ít nhất 6 lần.

> 🪤 Bẫy thi: việc **nhẹ, chạy trên mọi request, không cần gọi ra ngoài** (redirect, sửa header, chuẩn hoá URL) → **CloudFront Functions**. Cần **gọi mạng, đọc body, chạy ở phía origin, hoặc chạy lâu hơn 1 ms** → **Lambda@Edge**.

### 4.5 Optimizations

**Nén (compression).** Bật *Compress objects automatically* thì CloudFront nén file văn bản (HTML, CSS, JS, JSON, SVG…) bằng **Gzip** hoặc **Brotli** trước khi gửi, tuỳ trình duyệt hỗ trợ loại nào. File văn bản thường nhỏ đi còn khoảng một phần ba, có khi dưới một phần tư: một bundle JS 400 KB còn khoảng 100–130 KB. Vừa tải nhanh hơn vừa giảm tiền data transfer, vì CloudFront tính tiền theo byte thực gửi. CloudFront chỉ nén object từ **1.000 byte tới 10 MB**; ảnh JPEG/PNG và video vốn đã nén sẵn nên không được nén thêm.

**HTTP/2 và HTTP/3.** HTTP/1.1 mỗi kết nối chỉ tải một file một lúc, nên trình duyệt phải mở khoảng 6 kết nối song song, mỗi kết nối bắt tay riêng. **HTTP/2** cho nhiều request chạy xen kẽ trên **một** kết nối (*multiplexing*): 30 file tĩnh ở §1 chỉ cần bắt tay một lần. **HTTP/3** chạy trên QUIC (dựa trên UDP), gộp bắt tay kết nối và bắt tay mã hoá làm một, và một gói tin mất không làm nghẽn các file khác — có lợi rõ trên mạng di động chập chờn.

**TLS 1.3.** Bắt tay TLS 1.2 tốn 2 lượt đi-về, TLS 1.3 chỉ 1. Cộng 1 lượt của TCP:

```
                     RTT 200 ms (thẳng tới US)    RTT 20 ms (tới POP)
TCP + TLS 1.2        3 × 200 = 600 ms             3 × 20 = 60 ms
TCP + TLS 1.3        2 × 200 = 400 ms             2 × 20 = 40 ms
```

**Invalidation và tên file có version.** Muốn xoá một object khỏi cache trước khi hết TTL, bạn tạo một **invalidation** cho đường dẫn đó. 1.000 đường dẫn đầu tiên mỗi tháng miễn phí, sau đó ~$0,005 mỗi đường dẫn, và phải chờ lệnh lan ra mọi POP. Cách tốt hơn là **đổi tên file mỗi lần deploy** (`app.3f9a1c.js`): file mới là một cache key mới nên được lấy ngay, file cũ tự hết hạn, không tốn tiền, và rollback chỉ là trỏ HTML về tên cũ. Invalidation nên để dành cho file không đổi tên được như `index.html`.

**OAC — khoá S3 bucket chỉ cho CloudFront đọc.** Nếu bucket vẫn public thì ai biết URL S3 đều đi vòng qua CloudFront được, bỏ qua luôn WAF, signed URL và giới hạn địa lý bạn đặt ở đó. **Origin Access Control (OAC)** khiến CloudFront **ký** từng request gửi tới S3 bằng danh tính của chính dịch vụ CloudFront; bucket policy chỉ cho phép request có chữ ký đó và đến từ đúng distribution của bạn. Bucket khi ấy đóng hẳn public access. OAC thay cho **OAI** (Origin Access Identity) đời cũ; khác biệt đề hay hỏi là OAC hỗ trợ bucket mã hoá bằng **SSE-KMS** và mọi region, OAI thì không.

**Signed URL / Signed Cookie — nội dung chỉ cho người được phép.** OAC chặn đường vòng qua S3, còn hai thứ này kiểm soát **ai** được lấy nội dung qua CloudFront. App của bạn, sau khi xác nhận user đã đăng nhập hoặc đã trả tiền, dùng private key ký một "vé" ghi rõ được lấy gì và hết hạn lúc nào. CloudFront kiểm chữ ký bằng public key bạn đã đăng ký; hợp lệ thì mới trả nội dung.

| | Signed URL | Signed Cookie |
|--|-----------|---------------|
| Vé nằm ở đâu | Trong query string của URL | Trong cookie của trình duyệt |
| Phạm vi | **Một** file | **Nhiều** file theo pattern (cả thư mục) |
| Dùng khi | Link tải một file; client không hỗ trợ cookie | Video HLS/DASH gồm hàng trăm segment; cả khu vực thành viên; không muốn đổi URL |

Đừng lẫn với **S3 presigned URL**: cái đó ký bằng credential IAM và trỏ thẳng vào S3, không đi qua CloudFront nên không được cache ở edge.

### 4.6 Khi nào dùng CloudFront

- **Static asset cho user ở xa origin.** Đây là trường hợp lợi nhất: cache hit thì request không vượt biển.
- **Video on demand.** Video HLS/DASH được cắt thành hàng nghìn file segment nhỏ kèm một file danh mục (*manifest*); tất cả đều là file tĩnh nhiều người xem chung nên cache rất hiệu quả.
- **API `GET` có kết quả dùng chung** (danh mục sản phẩm, bảng giá), cache vài chục giây cũng đã giảm tải đáng kể cho backend.
- **Nội dung động không cache được.** Vẫn có lợi nhờ bắt tay TLS ở edge và đi backbone, và là nơi gắn WAF chống DDoS ở rìa mạng.
- **WebSocket.** CloudFront chuyển tiếp được kết nối WebSocket nhưng **không cache** gì ở đó; lợi ích chỉ là điểm vào gần user và bảo vệ ở edge.

### 4.7 Khi nào **không** dùng CloudFront

- **User và origin cùng một region, lượng nội dung nhỏ.** RTT vốn đã vài ms, thêm CDN chỉ thêm một lớp cấu hình và một chỗ phải gỡ lỗi cache.
- **Giao thức không phải HTTP** (UDP game, VoIP, MQTT, TCP tự chế): CloudFront không nói được các giao thức này — dùng **Global Accelerator** (§5).
- **Cần IP tĩnh cố định cho client whitelist.** IP của CloudFront mặc định thay đổi theo DNS → Global Accelerator. (CloudFront có tuỳ chọn *Anycast static IP list* nhưng phải gửi yêu cầu riêng và không phải đáp án mặc định của đề.)
- **Đẩy dữ liệu realtime từ server xuống client theo kiểu subscription:** dùng AppSync hoặc API Gateway WebSocket; không có gì để cache.

---

## 5. Global Accelerator (GA)

Global Accelerator cấp cho app của bạn **hai địa chỉ IP cố định**, và đưa traffic của user vào mạng riêng của AWS ngay tại edge POP gần họ nhất thay vì để nó tự tìm đường qua internet. Nó không cache, không hiểu HTTP, không chạy code — chỉ **chuyển gói tin** tới endpoint khoẻ gần nhất. Muốn hiểu vì sao hai IP đó làm được việc này, cần khái niệm *anycast*.

### 5.1 Khác CloudFront thế nào

**Anycast là gì.** Bình thường một IP thuộc về đúng một máy ở một nơi (*unicast*). Với **anycast**, **cùng một IP được công bố đồng thời từ rất nhiều địa điểm**. Các router trên internet trao đổi với nhau thông tin "muốn tới dải IP này thì đi qua tôi" bằng giao thức BGP, và luôn chọn đường ngắn nhất. Vì thế gói tin gửi tới một IP anycast tự động chạy về **địa điểm gần người gửi nhất về mặt mạng**. User ở Hà Nội và user ở Paris cùng gõ một IP, nhưng gói tin của họ vào hai POP khác nhau.

Hệ quả là việc "chọn chỗ gần nhất" do **hệ thống định tuyến của internet** làm, không phải do DNS. Client không cần phân giải lại gì cả, nên không có TTL nào để chờ. Đây là gốc của mọi khác biệt giữa GA và các giải pháp dựa trên DNS.

**Layer 4 và Layer 7.** CloudFront làm việc ở **L7**: nó đọc hiểu từng HTTP request (URL, header, cookie), nhờ vậy mới cache và viết lại được. GA làm việc ở **L4**: nó chỉ thấy gói TCP/UDP với IP và port, không biết bên trong là HTTP, game hay cuộc gọi thoại. Vì không đọc nội dung nên GA **chuyển được mọi giao thức**, và cũng vì thế mà **không thể cache**.

| | CloudFront | Global Accelerator |
|--|------------|-------------------|
| Tầng | L7 — hiểu HTTP/HTTPS (và WebSocket) | L4 — mọi thứ chạy trên TCP/UDP |
| Cache | Có | Không |
| IP client nhìn thấy | Thay đổi, lấy qua DNS (có tuỳ chọn Anycast static IP list xin riêng) | **2 IPv4 anycast cố định** suốt vòng đời accelerator, nằm ở hai *network zone* độc lập |
| Chuyển sang region khác khi lỗi | *Origin group*: thử origin phụ khi origin chính trả lỗi/timeout, chỉ với `GET`/`HEAD`/`OPTIONS` | Health check endpoint, rút endpoint hỏng trong **dưới 1 phút**, không chờ DNS |
| Dùng cho | Nội dung web cache được; web động cần TLS ở edge + WAF | Giao thức không phải HTTP, game, voice, IoT; cần IP tĩnh; failover nhanh nhiều region |

### 5.2 Cách hoạt động

1. Bạn tạo một **accelerator** và nhận 2 IP anycast (cùng một DNS name trỏ tới chúng).
2. Bạn khai **listener** (port và giao thức nào), và mỗi region một **endpoint group** chứa các **endpoint**: ALB, NLB, EC2 instance hoặc Elastic IP.
3. Gói tin của user tới IP anycast, vào **POP gần user nhất**. Từ đó nó đi trên **backbone của AWS** tới endpoint group gần nhất còn khoẻ.

Lợi ích nằm ở bước 3. Trên internet công cộng, gói tin từ Việt Nam sang Virginia nhảy qua mạng của nhiều nhà mạng; mỗi chỗ nối là một nơi có thể nghẽn, mất gói, hoặc đổi tuyến giữa chừng làm độ trễ lúc 180 ms lúc 350 ms. Trên backbone, cả quãng đường dài thuộc một mạng do AWS kiểm soát, nên **độ trễ ổn định hơn và ít mất gói hơn**. AWS quảng cáo cải thiện tới 60%, nhưng con số thật tuỳ tuyến đường; thứ chắc chắn cải thiện là **độ ổn định**, quan trọng với game và thoại hơn cả độ trễ trung bình.

GA **không đổi được khoảng cách**: request vẫn phải tới region nơi app chạy. Nó chỉ thay đoạn đường xấu bằng đoạn đường tốt.

Hai núm điều khiển hay gặp trong đề: **traffic dial** (phần trăm traffic một endpoint group nhận, kéo về 0 để rút cả một region khỏi phục vụ khi bảo trì hoặc blue/green) và **endpoint weight** (chia tỉ lệ giữa các endpoint trong cùng group).

### 5.3 Use case

- **Failover nhiều region cho ALB/NLB.** Khi endpoint ở region chính hỏng, GA chuyển traffic sang region kia mà client vẫn dùng đúng 2 IP cũ, không phụ thuộc client có tôn trọng TTL hay không. So sánh chi tiết ở §5.5.
- **Game server, VoIP dùng UDP.** CloudFront không chuyển được UDP; GA thì có, và độ trễ ổn định là thứ các ứng dụng này cần nhất.
- **Thiết bị IoT hoặc app cũ ghi cứng IP.** Firmware không cập nhật được thì IP phải không bao giờ đổi, kể cả khi bạn dời backend sang region khác.
- **Khách hàng doanh nghiệp phải whitelist IP trong firewall.** IP của ALB thay đổi theo thời gian; với GA họ chỉ cần mở đúng 2 IP, mãi mãi.

### 5.4 CloudFront vs GA quick

- Nội dung HTTP **cache được** → **CloudFront**. GA đặt trước nội dung tĩnh không giúp gì thêm, vì mọi request vẫn về tận origin.
- HTTP **động, không cache được**, user ở xa region → cả hai đều tăng tốc theo cùng một nguyên lý (vào mạng AWS ở edge rồi đi backbone). **CloudFront** là lựa chọn mặc định vì còn bắt tay TLS ở edge, gắn được WAF và cache được phần tĩnh. Chọn **GA** khi đề thêm một trong các điều kiện bên dưới.
- Giao thức **không phải HTTP** (TCP/UDP thuần) → **GA**.
- Cần **IP tĩnh** → **GA**.
- Cần failover giữa các region **không phụ thuộc DNS** → **GA**.

Hai dịch vụ không loại trừ nhau: một hệ thống có thể dùng CloudFront cho web và GA cho luồng game UDP.

### 5.5 Route 53 failover vs Global Accelerator — chọn cái nào cho multi-region failover

Cả hai đều "chuyển traffic từ region hỏng sang region lành", nhưng **điểm chuyển hướng khác nhau**: Route 53 chuyển ở tầng **phân giải tên** (client phải hỏi DNS lại mới biết), Global Accelerator chuyển ở tầng **edge POP** (client vẫn giữ nguyên IP, không cần hỏi lại gì).

| Tiêu chí | Route 53 failover | Global Accelerator |
|---|---|---|
| Cơ chế chuyển hướng | Đổi record trả về khi health check fail | Đổi endpoint phía sau **2 static anycast IP** — IP client dùng không đổi |
| Thời gian thực tế tới khi client đi đúng chỗ | Thời gian health check phát hiện lỗi **+ TTL của record + cache của resolver + cache DNS của client** | Thời gian health check phát hiện lỗi; sau đó chuyển hướng gần như tức thì vì không có bước resolve lại |
| Health check | Route 53 health check (interval 30s chuẩn, 10s nếu bật fast) | Health check tới endpoint (ALB/NLB/EIP/EC2) của accelerator |
| Hoạt động với non-HTTP (TCP/UDP thuần, game, VoIP, MQTT) | Có, nhưng vẫn là DNS nên vẫn dính TTL | Có — GA làm việc ở L4 |
| Cho client cần **IP tĩnh để whitelist firewall** | Không — record trỏ tới DNS name của ALB, IP thay đổi | **Có** — 2 anycast IP cố định suốt vòng đời accelerator |
| Chi phí | Rẻ: tiền hosted zone + query + health check | Phí cố định theo giờ cho mỗi accelerator (~$0.025/h) + phí data transfer premium theo GB |
| Bẫy | Client cache DNS quá TTL (một số cấu hình JVM cache vĩnh viễn (`networkaddress.cache.ttl=-1`), nhiều SDK/OS cũng cache riêng) → hạ TTL xuống 60s vẫn có client kẹt ở IP chết | GA **không cache** nội dung; đặt GA trước origin static không giúp gì so với CloudFront |

**Khi nào bắt buộc phải là Global Accelerator** (đề mô tả một trong các ý này thì Route 53 là đáp án sai):

- Đề nói khách hàng/đối tác phải **whitelist IP cố định** trong firewall của họ.
- Protocol **không phải HTTP**: UDP game server, VoIP/SIP, MQTT, custom TCP.
- Yêu cầu failover **"gần như tức thì" / "không phụ thuộc DNS TTL" / "client không kiểm soát được"** (thiết bị IoT, set-top box, app cũ cache DNS).
- Cần **client affinity theo source IP** cho session TCP dài.

**Khi nào Route 53 failover là đủ (và rẻ hơn)**: web app HTTP mà client là trình duyệt (trình duyệt tôn trọng TTL tương đối tốt), RTO đo bằng phút chứ không phải giây, hoặc DR kiểu pilot light / backup-restore nơi vài phút DNS chẳng đáng gì so với thời gian khôi phục stack.

> Khi cần **quyết định failover bằng tay, không để health check tự bật tắt** (tránh flapping trong sự cố lớn), Route 53 **Application Recovery Controller** cho "routing control" — công tắc On/Off chạy trên data plane 5 region, bật/tắt được kể cả khi control plane region chính đang lỗi.

---

## 6. Hạ tầng edge & hybrid compute — Outposts, Local Zones, Wavelength

CloudFront và Global Accelerator chỉ đưa **điểm vào mạng** lại gần user; compute vẫn nằm trong Region. Khi đề nói "app phải chạy gần user/gần máy móc, latency single-digit millisecond" hoặc "dữ liệu không được rời khỏi toà nhà", thì phải đẩy **chính compute** ra ngoài Region. Đó là nhóm Outposts / Local Zones / Wavelength.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phổ hạ tầng AWS từ Region ra tới datacenter khách hàng</title>
  <desc>Trục ngang từ xa user tới gần user. Region chứa compute đầy đủ. Local Zone đặt ở metro lớn, chạy EC2 và EBS, latency vài mili giây tới user trong metro. Wavelength Zone nằm trong datacenter nhà mạng 5G, traffic từ thiết bị di động không rời mạng carrier. Outposts là rack AWS đặt ngay trong datacenter khách hàng, dùng khi cần data residency hoặc nói chuyện với hệ thống on-premises. CloudFront và Global Accelerator nằm ở edge POP nhưng chỉ đưa điểm vào mạng lại gần, không chạy workload của bạn.</desc>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">Compute nằm ở đâu — từ Region ra tới DC khách hàng</text>
  <line x1="30" y1="200" x2="694" y2="200" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="30" y="222" font-size="10.5" fill="currentColor" opacity="0.6">xa user · service đầy đủ nhất</text>
  <text x="694" y="222" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.6">gần user / gần máy móc · service hạn chế</text>
  <rect x="24" y="52" width="150" height="128" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <rect x="36" y="64" width="78" height="20" rx="10" fill="#3b82f6" fill-opacity="0.9"/>
  <text x="75" y="78" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">Region</text>
  <text x="36" y="104" font-size="11" font-weight="700" fill="currentColor">AWS Region / AZ</text>
  <text x="36" y="122" font-size="10" fill="currentColor" opacity="0.65">mọi service, nhiều AZ</text>
  <text x="36" y="138" font-size="10" fill="currentColor" opacity="0.65">mặc định cho mọi thứ</text>
  <text x="36" y="160" font-size="10" fill="currentColor" opacity="0.5">latency: hàng chục ms</text>
  <rect x="190" y="52" width="150" height="128" rx="10" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <rect x="202" y="64" width="98" height="20" rx="10" fill="#10b981" fill-opacity="0.92"/>
  <text x="251" y="78" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">Local Zone</text>
  <text x="202" y="104" font-size="11" font-weight="700" fill="currentColor">metro lớn</text>
  <text x="202" y="122" font-size="10" fill="currentColor" opacity="0.65">EC2, EBS, ALB, FSx…</text>
  <text x="202" y="138" font-size="10" fill="currentColor" opacity="0.65">AWS quản hạ tầng</text>
  <text x="202" y="160" font-size="10" fill="currentColor" opacity="0.5">latency: vài ms trong metro</text>
  <rect x="356" y="52" width="150" height="128" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <rect x="368" y="64" width="106" height="20" rx="10" fill="#8b5cf6" fill-opacity="0.92"/>
  <text x="421" y="78" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">Wavelength</text>
  <text x="368" y="104" font-size="11" font-weight="700" fill="currentColor">trong DC nhà mạng 5G</text>
  <text x="368" y="122" font-size="10" fill="currentColor" opacity="0.65">traffic không rời carrier</text>
  <text x="368" y="138" font-size="10" fill="currentColor" opacity="0.65">chỉ cho client 5G</text>
  <text x="368" y="160" font-size="10" fill="currentColor" opacity="0.5">AR/VR, xe kết nối, IoT 5G</text>
  <rect x="522" y="52" width="172" height="128" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <rect x="534" y="64" width="92" height="20" rx="10" fill="#f59e0b" fill-opacity="0.92"/>
  <text x="580" y="78" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">Outposts</text>
  <text x="534" y="104" font-size="11" font-weight="700" fill="currentColor">rack AWS trong DC bạn</text>
  <text x="534" y="122" font-size="10" fill="currentColor" opacity="0.65">data residency tại chỗ</text>
  <text x="534" y="138" font-size="10" fill="currentColor" opacity="0.65">nói chuyện hệ thống on-prem</text>
  <text x="534" y="160" font-size="10" fill="currentColor" opacity="0.5">control plane vẫn ở Region</text>
  <text x="30" y="242" font-size="10.5" fill="currentColor" opacity="0.7">CloudFront / Global Accelerator: ở edge POP nhưng CHỈ đưa điểm vào mạng lại gần — workload của bạn vẫn ở Region.</text>
</svg>

### 6.1 Bảng chọn hạ tầng edge

| Hạ tầng | Đặt ở đâu | Chạy được gì | Khi nào chọn | Từ khoá đề | Bẫy |
|---|---|---|---|---|---|
| **AWS Outposts** (rack 42U hoặc server 1U/2U) | Trong datacenter / nhà máy / cửa hàng **của khách hàng**, AWS giao và vận hành | EC2, EBS, S3 on Outposts, ECS/EKS, RDS, ElastiCache, ALB (tập con service) | Dữ liệu **bắt buộc ở lại tại chỗ** vì luật/hợp đồng; app phải nói chuyện với hệ thống on-prem (SCADA, máy sản xuất, mainframe) ở latency dưới mili giây | "data residency", "không được rời khỏi cơ sở", "kết nối tới hệ thống cũ trong nhà máy", "cùng API/công cụ như AWS nhưng on-prem" | Vẫn cần **service link** ổn định về home Region: mất link thì instance đang chạy vẫn chạy nhưng **control plane (tạo/xoá instance, API) ngừng dùng được**. Không phải giải pháp "chạy hoàn toàn offline". Capacity là hữu hạn và mua trước — không co giãn vô hạn như Region |
| **Local Zones** | Cơ sở của AWS đặt ở **trung tâm đô thị lớn**, là phần mở rộng của một parent Region (tên dạng `us-west-2-lax-1a`) | EC2, EBS, và một tập con service (thường có ALB, FSx) — không phải mọi service | Cần **single-digit millisecond** tới user hoặc tới on-prem trong chính metro đó, nhưng **không muốn tự quản rack** | "user ở thành phố X cần độ trễ vài ms", "media/game rendering", "ML inference gần user", "app on-prem chưa migrate được cần latency thấp tới AWS" | Thường chỉ có **một zone** (vài Local Zone như LA có 2) → gần như không có HA đa AZ trong Local Zone; muốn bền phải kết hợp với parent Region. Service thiếu thì phải gọi ngược về parent Region (thêm latency) |
| **AWS Wavelength** | **Bên trong datacenter của nhà mạng** ở rìa mạng 5G (tên zone dạng `us-east-1-wl1-…`) | EC2, EBS và một tập con rất hẹp | Client là **thiết bị di động trên mạng 5G** của chính carrier đó, và cần latency cực thấp | "5G", "mobile edge computing", "AR/VR trên điện thoại", "xe kết nối", "nhà máy thông minh qua 5G" | Chỉ hưởng lợi khi traffic **đi qua mạng của carrier đó** — user trên Wi-Fi/cáp quang không được lợi gì. Không phải cách làm web app toàn cầu nhanh hơn |
| **CloudFront edge location** | 750+ POP toàn cầu | Chỉ CloudFront Functions / Lambda@Edge, không phải app của bạn | Nội dung **HTTP cacheable**, TLS terminate gần user | "static content", "video", "cache", "toàn cầu" | Không chạy được workload nặng/stateful ở edge |
| **Global Accelerator edge** | Cùng mạng edge POP | Không chạy code — chỉ là điểm vào anycast | Non-HTTP, IP tĩnh, failover nhanh (xem 5.5) | "static IP", "UDP", "failover không phụ thuộc DNS" | Không cache |

### 6.2 Phân biệt nhanh khi đọc đề

- Đề nhắc **quy định/luật/dữ liệu không được rời cơ sở** → **Outposts**. Local Zones và Wavelength là hạ tầng của AWS/telco, không giải quyết bài toán data residency trong toà nhà của khách.
- Đề nhắc **một thành phố cụ thể + vài mili giây + không muốn quản hạ tầng** → **Local Zones**.
- Đề nhắc **5G / carrier / thiết bị di động** → **Wavelength**. Thấy chữ "5G" gần như luôn là Wavelength.
- Đề nhắc **cache / static asset / video toàn cầu** → **CloudFront**, không phải nhóm trên.
- Đề nhắc **IP tĩnh hoặc TCP/UDP + failover nhanh** → **Global Accelerator**.
- Đề nhắc **thiết bị rời rạc ở nơi không có mạng ổn định, cần xử lý cục bộ rồi đồng bộ sau** → đó là bài toán của **Snowball Edge / IoT Greengrass**, không phải Outposts (xem [[ch2-05-migration-transfer]]).

---

## 7. VPC networking

### 7.1 VPC endpoints — tránh internet

**Bài toán.** S3, DynamoDB, SQS, ECR… đều có địa chỉ **public**. Một EC2 trong private subnet (không có đường ra internet) muốn gọi S3 thì mặc định phải đi vòng: qua NAT Gateway, ra Internet Gateway, rồi mới tới S3 — dù S3 nằm ngay trong cùng region. Đường vòng đó vừa tốn tiền NAT theo từng GB, vừa buộc bạn phải mở lối ra internet cho một subnet lẽ ra kín hoàn toàn.

**VPC endpoint** là một lối đi riêng từ VPC thẳng tới dịch vụ, nằm trọn trong mạng AWS. Có hai loại, khác nhau ở **cách nó được cắm vào VPC**, và mọi khác biệt còn lại đều suy ra từ đó.

**Gateway endpoint — một dòng trong route table.** Bạn tạo endpoint và gắn nó vào các route table. AWS tự thêm một route kiểu "đích là dải IP của S3 trong region này → đi qua endpoint". Không có network interface nào được tạo ra, không có IP mới; EC2 vẫn gọi đúng tên `s3.<region>.amazonaws.com` như cũ, chỉ là gói tin được bẻ lái ở tầng định tuyến. Chỉ hỗ trợ **S3 và DynamoDB**, và **miễn phí hoàn toàn**. Vì nó chỉ là route trong VPC nên **máy bên ngoài VPC không dùng nhờ được**: on-prem đi qua VPN/Direct Connect hay VPC khác qua peering đều không tới được S3 bằng gateway endpoint của bạn.

**Interface endpoint — một card mạng trong subnet.** AWS đặt vào subnet bạn chọn một **ENI** (elastic network interface: card mạng ảo) có **IP private thuộc dải của chính subnet đó**. Gọi dịch vụ lúc này là gọi tới một IP private nội bộ. Công nghệ đứng sau tên là **PrivateLink**. Tuỳ chọn *private DNS* làm tên public của dịch vụ phân giải ra IP private này, nên code không phải sửa. Vì là một IP thật trong VPC nên:

- Gắn **security group** cho nó được.
- **Truy cập được từ on-prem** qua VPN/Direct Connect và từ VPC khác qua peering/Transit Gateway.
- Hỗ trợ **hầu hết dịch vụ AWS** và cả dịch vụ của bên thứ ba (§7.6).
- **Tính tiền**: ~$0,01 mỗi giờ cho mỗi ENI (mỗi AZ một cái) + ~$0,01 mỗi GB đi qua.

| | Gateway endpoint | Interface endpoint (PrivateLink) |
|--|------------------|----------------------------------|
| Cắm vào VPC bằng | Route trong route table | ENI có IP private trong subnet |
| Dịch vụ | Chỉ S3, DynamoDB | Hầu hết dịch vụ AWS + bên thứ ba |
| Giá (us-east-1) | Miễn phí | ~$0,01/giờ mỗi AZ + ~$0,01/GB |
| Security group | Không (kiểm soát bằng endpoint policy) | Có |
| Dùng được từ on-prem / VPC khác | Không | Có |

S3 và DynamoDB có **cả hai loại**. Mặc định chọn gateway endpoint vì miễn phí; chỉ chọn interface endpoint cho S3 khi cần truy cập từ on-prem hoặc từ VPC khác.

**Tính thử.** Một cụm EC2 trong private subnet đọc 10 TB từ S3 mỗi tháng (us-east-1):

```
Qua NAT Gateway:
  10.000 GB × $0,045/GB                       = $450,00
  phí giờ: $0,045 × 730 giờ                   = $32,85   (vẫn phải trả nếu còn traffic khác cần NAT)
Qua Gateway endpoint:
  10.000 GB × $0                              = $0
Qua Interface endpoint (2 AZ):
  2 × $0,01 × 730 giờ + 10.000 GB × $0,01     = $14,60 + $100 = $114,60
```

Về hiệu năng, endpoint bớt được một chặng trung gian và không còn bị giới hạn bởi băng thông của NAT Gateway. Phần lợi đo được rõ nhất vẫn là tiền và việc subnet không cần lối ra internet.

### 7.2 NAT Gateway

**NAT** (network address translation) cho instance chỉ có IP private **chủ động gọi ra** internet (tải package, gọi API bên thứ ba) bằng cách mượn IP public của NAT Gateway; chiều ngược lại, internet không mở được kết nối vào instance.

- **Giá (us-east-1):** ~$0,045 mỗi giờ + **~$0,045 cho mỗi GB đi qua**, tính cả chiều đi lẫn chiều về. Phần theo GB mới là thứ làm hoá đơn phình: 10 TB/tháng là $450 như phép tính trên.
- **Một NAT Gateway chỉ nằm trong một AZ.** Nếu ba AZ dùng chung một cái thì khi AZ đó sập, cả ba mất đường ra internet, và traffic từ hai AZ kia còn chịu thêm phí cross-AZ. Chuẩn HA là **mỗi AZ một NAT Gateway**, route table của AZ nào trỏ vào NAT của AZ đó.
- **Chỉ cần tới S3/DynamoDB thì không cần NAT** cho phần traffic đó: thêm gateway endpoint (miễn phí), NAT chỉ còn gánh traffic ra internet thật sự.

Áp vào bài tập 2 cuối bài: hoá đơn NAT $5.000/tháng mà 90% là đọc S3 thì thêm một S3 gateway endpoint sẽ cắt được khoảng 0,9 × $5.000 = **$4.500** phần phí theo GB, không phải sửa dòng code nào.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Truy cập S3/DynamoDB: Gateway endpoint so với đi qua NAT Gateway</title>
  <desc>So sánh hai đường tới S3 hoặc DynamoDB. Đường trên qua NAT Gateway rồi Internet Gateway ra internet, tính phí data và đi qua mạng công cộng. Đường dưới qua VPC Gateway endpoint đi thẳng trên mạng riêng AWS, miễn phí và bảo mật hơn.</desc>
  <defs>
    <marker id="ge1" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="22" font-size="14" font-weight="700" fill="currentColor">EC2 (private subnet) → S3 / DynamoDB: hai đường</text>
  <rect x="14" y="38" width="80" height="56" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="54" y="62" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2</text>
  <text x="54" y="79" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.62">private</text>
  <rect x="690" y="120" width="16" height="0" fill="none"/>
  <rect x="600" y="118" width="104" height="56" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="652" y="142" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">S3 / DynamoDB</text>
  <text x="652" y="159" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.62">AWS service</text>
  <text x="16" y="46" font-size="10.5" fill="#f59e0b" opacity="0.95" font-weight="700">CÁCH CŨ</text>
  <rect x="150" y="40" width="120" height="46" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="210" y="60" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">NAT Gateway</text>
  <text x="210" y="76" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">$/h + $/GB</text>
  <rect x="320" y="40" width="120" height="46" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="380" y="60" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Internet GW</text>
  <text x="380" y="76" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">ra public internet</text>
  <rect x="478" y="40" width="120" height="46" rx="9" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 3"/>
  <text x="538" y="60" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Internet</text>
  <text x="538" y="76" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">mạng công cộng</text>
  <line x1="94" y1="58" x2="146" y2="60" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ge1)"/>
  <line x1="270" y1="63" x2="316" y2="63" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ge1)"/>
  <line x1="440" y1="63" x2="474" y2="63" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ge1)"/>
  <path d="M598 60 C 640 60 652 90 652 116" fill="none" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#ge1)"/>
  <text x="300" y="104" font-size="10" fill="#f59e0b" opacity="0.95">tính phí data · đi qua internet</text>
  <text x="16" y="200" font-size="10.5" fill="#10b981" opacity="0.95" font-weight="700">CÁCH ĐÚNG</text>
  <rect x="240" y="194" width="220" height="50" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
  <rect x="252" y="206" width="120" height="22" rx="11" fill="#10b981" fill-opacity="0.92"/>
  <text x="312" y="221" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">Gateway endpoint</text>
  <text x="386" y="222" font-size="10.5" font-weight="700" fill="currentColor">FREE</text>
  <text x="350" y="240" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.62">route table → endpoint, không cần NAT</text>
  <path d="M70 94 C 70 220 130 219 236 219" fill="none" stroke="#10b981" stroke-opacity="0.65" marker-end="url(#ge1)"/>
  <path d="M460 219 C 560 219 600 200 642 176" fill="none" stroke="#10b981" stroke-opacity="0.65" marker-end="url(#ge1)"/>
  <text x="250" y="270" font-size="10" fill="#10b981" opacity="0.95">private AWS network · miễn phí · không qua internet</text>
  <text x="250" y="286" font-size="9.5" fill="currentColor" opacity="0.6">(data through endpoint $0.01/GB; gateway endpoint không tính phí endpoint)</text>
</svg>

### 7.3 Enhanced Networking

Ba thứ dưới đây quyết định hai EC2 nói chuyện với nhau nhanh tới đâu. Chúng xếp chồng lên nhau chứ không thay thế nhau.

**ENA (Elastic Network Adapter).** Bình thường mọi gói tin của máy ảo phải đi qua một lớp phần mềm của hypervisor (tầng ảo hoá) rồi mới tới card mạng thật, tốn CPU và thêm độ trễ. *Enhanced networking* dùng kỹ thuật SR-IOV cho máy ảo nói chuyện gần như trực tiếp với card mạng vật lý. Kết quả là băng thông cao hơn, nhiều gói tin mỗi giây hơn và độ trễ đều hơn. ENA là driver cho cơ chế này: hỗ trợ tới 100 Gbps (vài dòng instance chuyên network còn cao hơn), có sẵn trên mọi instance thế hệ hiện tại và **không tính thêm tiền**. Con số thực tế do instance type quyết định: `c5.large` ghi "up to 10 Gigabit" nhưng mức nền chỉ 0,75 Gbps, còn `c5.18xlarge` là 25 Gbps.

**EFA (Elastic Fabric Adapter).** Là ENA cộng thêm khả năng *OS-bypass*: ứng dụng gửi dữ liệu thẳng xuống card mạng, bỏ qua kernel của hệ điều hành. Thứ cần đến nó là **HPC** (high performance computing: mô phỏng thời tiết, động lực học chất lưu, huấn luyện mô hình phân tán), nơi hàng trăm node trao đổi thông điệp liên tục qua thư viện **MPI** (Message Passing Interface) và từng micro giây trễ giữa các node đều kéo chậm cả bài toán. Web app và database thông thường không được lợi gì từ EFA.

**Cluster placement group.** Yêu cầu AWS xếp các instance **sát nhau về vật lý trong cùng một AZ**, để đường đi giữa chúng ngắn nhất. Có một giới hạn ít người biết: một luồng TCP/UDP đơn lẻ (*single flow*) giữa hai instance bị trần **5 Gbps**; trong cùng cluster placement group, trần đó là **10 Gbps**. Cái giá là độ sẵn sàng: mọi thứ nằm chung một cụm phần cứng trong một AZ.

> 🪤 Bẫy thi: "HPC", "MPI", "tightly coupled", "node-to-node latency thấp nhất" → **EFA + cluster placement group**. Chỉ cần "băng thông cao hơn" cho workload thường → chọn instance type lớn hơn có ENA, không phải EFA. Chi tiết placement group ở [[ch2-01-compute-performance]].

### 7.4 Jumbo frames

**MTU** (maximum transmission unit) là kích thước lớn nhất của một gói tin trên một đường truyền. Chuẩn internet là **1.500 byte**. Bên trong VPC, EC2 hỗ trợ **jumbo frame 9.001 byte**.

Gói to hơn thì cùng lượng dữ liệu cần ít gói hơn. Mỗi gói mang khoảng 40 byte header TCP/IP, nhưng phần lợi chính không nằm ở vài byte header mà ở chỗ CPU hai đầu phải xử lý **ít gói hơn nhiều**:

```
Gửi 1 GB dữ liệu:
  MTU 1.500 → 1.460 byte dữ liệu/gói → ~685.000 gói   (header chiếm ~2,7%)
  MTU 9.001 → 8.961 byte dữ liệu/gói → ~112.000 gói   (header chiếm ~0,4%)
→ ít hơn khoảng 6 lần số gói phải xử lý
```

Vì vậy jumbo frame có ích cho **truyền khối lượng lớn giữa các máy trong AWS**: replication database, backup, HPC trong cluster placement group.

Điều kiện là **mọi chặng trên đường đi** đều phải chịu được gói to. Gói vượt MTU của một chặng sẽ bị cắt nhỏ (chậm đi) hoặc bị bỏ hẳn:

| Đường đi | MTU tối đa |
|----------|-----------|
| Trong một VPC; VPC peering cùng region | 9.001 |
| Qua Transit Gateway; inter-region VPC peering | 8.500 |
| Qua Direct Connect | 9.001 (private VIF) / 8.500 (transit VIF), phải bật |
| Qua **Internet Gateway** | **1.500** |
| Qua **Site-to-Site VPN** | Dưới 1.500 (không hỗ trợ jumbo frame) |

> 🪤 Bẫy thi: jumbo frame **không dùng được cho traffic ra internet hay qua VPN**. Kết nối bị treo khi gửi dữ liệu lớn trong khi ping gói nhỏ vẫn thông là dấu hiệu kinh điển của lệch MTU.

### 7.5 VPC Peering vs Transit Gateway

Hai VPC mặc định cô lập hoàn toàn. Có hai cách nối chúng bằng IP private.

**VPC peering** là một đường nối riêng giữa **đúng hai** VPC, cùng hoặc khác region, cùng hoặc khác account. Không có thiết bị trung gian nên không có phí theo giờ và không có nút cổ chai băng thông; bạn chỉ trả tiền data transfer. Hạn chế cốt lõi là **không bắc cầu** (non-transitive): A nối B và B nối C **không** có nghĩa A tới được C. Muốn mọi VPC nói chuyện với nhau thì phải nối từng cặp:

```
Số kết nối peering để n VPC nối đủ từng đôi = n × (n − 1) ÷ 2
  4 VPC  →   6 kết nối
  10 VPC →  45 kết nối
  20 VPC → 190 kết nối (mỗi cái kèm route ở cả hai đầu)
```

**Transit Gateway (TGW)** là một **router trung tâm** do AWS quản lý. Mỗi VPC, VPN hay Direct Connect chỉ cần **một** *attachment* vào nó, và TGW định tuyến giữa tất cả (*hub-and-spoke*, có bắc cầu). 20 VPC là 20 attachment thay cho 190 kết nối. Cái giá là tiền và một chặng trung gian: ~$0,05 mỗi giờ cho mỗi attachment + ~$0,02 cho mỗi GB đi qua.

```
10 VPC gắn vào TGW:  10 × $0,05 × 730 giờ = $365/tháng tiền attachment
                     + 5 TB qua TGW: 5.000 GB × $0,02 = $100
VPC peering cho cùng 10 VPC: $0 phí cố định, nhưng 45 kết nối phải quản lý
```

| Aspect | VPC Peering | Transit Gateway (TGW) |
|--------|-------------|----------------------|
| Topology | 1-1 | Hub-and-spoke |
| Transitive routing | Không | Có |
| Cross-region | Có (inter-region peering) | Có (peering attachment) |
| Số VPC | Pairwise → O(n²) | O(n) |
| Cost | Data transfer | $0.05/h per attachment + data |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>VPC Peering (full mesh) so với Transit Gateway (hub-and-spoke)</title>
  <desc>Bên trái: bốn VPC nối peering từng cặp 1-1 tạo full mesh với 6 kết nối, không transitive routing, số kết nối tăng O(n bình phương). Bên phải: bốn VPC cùng gắn vào một Transit Gateway ở giữa theo hub-and-spoke, có transitive routing, chỉ 4 kết nối, tăng tuyến tính O(n).</desc>
  <text x="180" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">VPC Peering — full mesh</text>
  <text x="540" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Transit Gateway — hub-and-spoke</text>
  <line x1="360" y1="40" x2="360" y2="300" stroke="currentColor" stroke-opacity="0.15"/>
  <g stroke="#3b82f6" stroke-opacity="0.55" fill="none" stroke-width="1.5">
    <line x1="90" y1="90" x2="270" y2="90"/>
    <line x1="90" y1="230" x2="270" y2="230"/>
    <line x1="90" y1="90" x2="90" y2="230"/>
    <line x1="270" y1="90" x2="270" y2="230"/>
    <line x1="90" y1="90" x2="270" y2="230"/>
    <line x1="270" y1="90" x2="90" y2="230"/>
  </g>
  <g>
    <circle cx="90" cy="90" r="26" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="90" y="94" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">VPC A</text>
    <circle cx="270" cy="90" r="26" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="270" y="94" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">VPC B</text>
    <circle cx="90" cy="230" r="26" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="90" y="234" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">VPC C</text>
    <circle cx="270" cy="230" r="26" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="270" y="234" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">VPC D</text>
  </g>
  <text x="180" y="288" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.78">4 VPC → 6 kết nối · O(n²)</text>
  <text x="180" y="306" font-size="10.5" text-anchor="middle" fill="#f59e0b" opacity="0.95">không transitive (A↛C qua B)</text>
  <g stroke="#10b981" stroke-opacity="0.6" fill="none" stroke-width="1.5">
    <line x1="450" y1="100" x2="540" y2="160"/>
    <line x1="630" y1="100" x2="540" y2="160"/>
    <line x1="450" y1="220" x2="540" y2="160"/>
    <line x1="630" y1="220" x2="540" y2="160"/>
  </g>
  <rect x="498" y="138" width="84" height="44" rx="10" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.32"/>
  <text x="540" y="158" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Transit GW</text>
  <text x="540" y="173" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">hub</text>
  <g>
    <circle cx="450" cy="100" r="24" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="450" y="104" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">VPC A</text>
    <circle cx="630" cy="100" r="24" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="630" y="104" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">VPC B</text>
    <circle cx="450" cy="220" r="24" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="450" y="224" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">VPC C</text>
    <circle cx="630" cy="220" r="24" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="630" y="224" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">VPC D</text>
  </g>
  <text x="540" y="288" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.78">4 VPC → 4 attachment · O(n)</text>
  <text x="540" y="306" font-size="10.5" text-anchor="middle" fill="#10b981" opacity="0.95">transitive routing (A↔C qua hub)</text>
</svg>

> Quy tắc: ≤ 5 VPC dùng peering. ≥ 10 VPC dùng TGW.

### 7.6 PrivateLink

Peering và Transit Gateway nối **cả hai mạng** với nhau: mọi máy bên này có thể tới mọi máy bên kia nếu route và security group cho phép. Nhiều khi bạn chỉ muốn cho bên kia dùng **đúng một dịch vụ**. Đó là việc của PrivateLink — cùng công nghệ với interface endpoint ở §7.1, lần này dịch vụ đứng sau là **của bạn** thay vì của AWS.

**Cách dựng**, gồm hai phía:

1. **Provider** (bên có dịch vụ) đặt dịch vụ sau một **Network Load Balancer** rồi tạo một *endpoint service* trỏ vào NLB đó, và cấp quyền cho những account được phép kết nối.
2. **Consumer** (bên dùng) tạo một **interface endpoint** trong VPC của mình trỏ tới endpoint service ấy. Một ENI với IP private xuất hiện trong subnet của consumer.

Consumer gọi IP private đó; AWS chuyển traffic sang NLB của provider. Từ cơ chế này suy ra các tính chất đề hay hỏi:

- **Một chiều.** Chỉ consumer mở được kết nối tới provider. Provider không nhìn thấy và không gọi ngược được vào mạng consumer.
- **Chỉ lộ đúng một dịch vụ**, không lộ cả VPC. Consumer không cần biết IP, subnet hay route bên provider.
- **Hai VPC được phép trùng dải IP (CIDR).** Không có route nào nối hai mạng nên không có xung đột địa chỉ — điều peering và Transit Gateway không làm được.
- **Mở rộng tới hàng nghìn consumer** mà provider không phải quản lý kết nối riêng với từng người.

**Dùng khi:** nhà cung cấp SaaS bán dịch vụ cho nhiều khách hàng mà mỗi khách có VPC riêng (*multi-tenant*: một hệ thống phục vụ nhiều khách hàng tách biệt nhau); team platform chia sẻ một dịch vụ nội bộ cho hàng chục account trong công ty.

> 🪤 Bẫy thi: "cho account/VPC khác dùng **một service** mà **không mở cả mạng**", "hai VPC **trùng CIDR**", "SaaS provider tới nhiều khách hàng" → **PrivateLink**. "Hai VPC cần nói chuyện **hai chiều, nhiều dịch vụ**" → peering; nhiều VPC thì Transit Gateway.

---

## 8. Hybrid network — on-prem ↔ AWS

Phần này chỉ dựng khung để chọn đúng giữa VPN và Direct Connect dưới góc nhìn hiệu năng. BGP, các loại virtual interface, mô hình dự phòng và thứ tự ưu tiên route được dạy kỹ ở [[ch2-07-hybrid-connectivity]].

### 8.1 Site-to-Site VPN

Một đường hầm mã hoá **IPsec** dựng **trên internet công cộng**, nối router của công ty (*customer gateway*) với AWS. Không có sợi cáp mới nào được kéo; nó chỉ bọc mã hoá quanh traffic đi qua đường internet bạn đang có.

- **Dựng nhanh:** vài phút tới vài giờ, vì chỉ là cấu hình.
- **Thông lượng:** tối đa **~1,25 Gbps mỗi tunnel**. Mỗi VPN connection luôn có **2 tunnel** kết thúc ở hai AZ khác nhau, nhưng mục đích là dự phòng: mặc định chỉ một tunnel mang traffic, nên **không** cộng thành 2,5 Gbps. Muốn cộng dồn phải kết thúc VPN ở Transit Gateway và bật ECMP (equal-cost multi-path: chia tải đều trên nhiều đường có cùng chi phí). AWS hiện có thêm loại *large bandwidth tunnel* tới 5 Gbps; đề thi vẫn dùng con số 1,25 Gbps.
- **Độ trễ không ổn định:** traffic đi trên internet nên chịu mọi nghẽn và đổi tuyến của nhà mạng. Hôm nay 30 ms, mai có thể 80 ms.
- **Giá:** ~$0,05 mỗi giờ cho một connection (~$36,50/tháng) + data transfer out theo giá internet.
- **Hợp với:** môi trường dev/test, chi nhánh nhỏ, traffic thấp, đường **dự phòng** cho Direct Connect, và giải pháp tạm trong lúc chờ Direct Connect.

1,25 Gbps là khoảng 156 MB/giây: chuyển 1 TB mất gần 1,8 giờ nếu chạy hết công suất.

### 8.2 Direct Connect (DX)

Một **kết nối vật lý riêng** bằng cáp quang từ mạng của bạn tới một **DX location** (trung tâm dữ liệu trung lập nơi AWS đặt router), rồi từ đó vào mạng AWS. Traffic **không đi qua internet**.

- **Thông lượng:** *Dedicated connection* là cả một cổng vật lý của riêng bạn: **1, 10, 100 hoặc 400 Gbps**. *Hosted connection* là một phần dung lượng trên cổng của đối tác: từ **50 Mbps tới 25 Gbps**.
- **Độ trễ thấp và ổn định:** đường đi cố định, không tranh chấp với traffic internet. Đây thường là lý do chính để chọn DX, quan trọng hơn cả băng thông.
- **Dựng lâu:** vài tuần tới vài tháng, vì phải kéo cáp và làm việc với nhà mạng. Đề nói "cần trong tuần này" thì không phải DX.
- **Giá:** phí cổng theo giờ (~$0,30/giờ cho cổng 1 Gbps) + data transfer out **~$0,02/GB**, rẻ hơn hẳn mức ~$0,09/GB khi ra internet. Chưa tính phí thuê kênh của nhà mạng/đối tác.
- **Không mã hoá sẵn.** DX là đường riêng chứ không phải đường mật; cần mã hoá thì thêm MACsec hoặc chạy VPN bên trên DX.
- **HA:** một sợi cáp là một điểm chết. Tối thiểu cần **2 kết nối DX ở 2 location khác nhau**, hoặc DX chính + VPN dự phòng (rẻ hơn, nhưng khi failover thì băng thông và độ trễ tụt về mức VPN).

**Khi nào DX tự hoàn vốn nhờ giá egress** (cổng dedicated 1 Gbps, chưa tính phí nhà mạng):

```
Phí cổng:        $0,30 × 730 giờ            = $219/tháng
Tiết kiệm egress: $0,09 − $0,02              = $0,07 mỗi GB
Hoà vốn:          $219 ÷ $0,07               ≈ 3.100 GB ≈ 3,1 TB gửi ra mỗi tháng
```

### 8.3 DX Gateway

Một kết nối DX kết thúc ở một region. **Direct Connect Gateway** là một tài nguyên toàn cục đứng giữa DX và các VPC: nối DX vào DX Gateway một lần, rồi gắn nhiều VPC (hoặc nhiều Transit Gateway) ở **nhiều region và nhiều account** vào đó. Không có nó thì mỗi VPC cần một virtual interface riêng trên đường DX.

### 8.4 Khi nào DX vs VPN

| Yêu cầu trong đề | Chọn | Vì sao |
|------------------|------|--------|
| Thông lượng ổn định trên ~1 Gbps | DX | Một tunnel VPN trần ở 1,25 Gbps và còn phụ thuộc đường internet |
| Độ trễ ổn định, ít jitter (thoại, replication đồng bộ, VDI) | DX | Đường riêng, không đi qua internet |
| Cần ngay, traffic thấp, ngân sách nhỏ | VPN | Vài phút là xong, ~$36/tháng |
| Traffic "không được đi qua internet" | DX | VPN có mã hoá nhưng **vẫn đi trên internet** |
| Vừa riêng tư vừa mã hoá | DX + VPN chạy bên trên, hoặc MACsec | DX không tự mã hoá |
| HA cao | 2 DX ở 2 location, hoặc DX + VPN dự phòng | Một kết nối DX không có dự phòng |
| Chuyển lượng lớn dữ liệu ra khỏi AWS đều đặn | DX | Egress ~$0,02/GB thay vì ~$0,09/GB |

Áp vào bài tập 5: 4 datacenter, mỗi nơi 500 Mbps, yêu cầu độ trễ dưới 5 ms. Về băng thông thì 500 Mbps vẫn nằm dưới trần 1,25 Gbps của VPN, nhưng **yêu cầu độ trễ cố định dưới 5 ms** thì internet không cam kết được, nên đáp án là DX. Mỗi DC một kết nối DX (hosted 500 Mbps hoặc dedicated 1 Gbps), mỗi DC đi hai location hoặc kèm VPN dự phòng, tất cả gom về một DX Gateway rồi Transit Gateway.

### 8.5 Cloud WAN (mới)

Khi một tập đoàn có hàng chục VPC ở nhiều region cùng nhiều văn phòng và datacenter, tự nối các Transit Gateway với nhau và giữ đồng bộ route table bằng tay trở thành việc nặng. **AWS Cloud WAN** cho bạn mô tả cả mạng toàn cầu bằng **một policy trung tâm** (region nào tham gia, nhóm mạng nào được nói chuyện với nhóm nào), rồi AWS tự dựng và nối hạ tầng tương đương Transit Gateway ở từng region. Có thể coi nó là một lớp quản lý cao hơn nằm trên Transit Gateway. Với SAA chỉ cần nhận diện: "mạng toàn cầu nhiều region + on-prem, quản lý tập trung bằng policy" → Cloud WAN.

---

## 9. Bandwidth & egress cost

| Path | Cost (US) |
|------|-----------|
| Internet egress (first 10TB) | $0.09/GB |
| CloudFront egress | $0.085/GB (US), thấp hơn ở vài region |
| Cross-region (US ↔ US) | $0.02/GB |
| Cross-region (cross-continent) | $0.02-0.09/GB |
| Cross-AZ trong region | $0.01/GB each way |
| Same-AZ private IP | Free |
| To/from VPC endpoint | Free (data through endpoint $0.01/GB) |

> 💡 Egress là **cost trap** lớn nhất. Đưa 1 GB từ AWS ra internet (~$0,09) đắt gấp khoảng 4 lần tiền lưu chính GB đó trên S3 Standard suốt một tháng (~$0,023), và lần nào tải cũng bị tính lại. Trước khi mở một luồng egress lớn, tính tiền.

### Cost optimization patterns

1. **CloudFront trước S3/ALB**: edge cache rẻ hơn origin egress + giảm origin load.
2. **VPC Gateway endpoint cho S3/DynamoDB**: bỏ NAT GW data charge.
3. **Cross-AZ traffic**: tối ưu cluster placement, dùng zonal-aware routing.
4. **Cam kết sử dụng CloudFront**: *Security Savings Bundle* giảm tới 30% khi cam kết mức chi hằng tháng trong 1 năm; giá riêng (custom pricing) khi cam kết từ 10 TB/tháng trong ít nhất 12 tháng.
5. **Compression**: enable mọi nơi (CloudFront, ALB, app-level).

---

## 10. API Gateway performance

**API Gateway** là "cửa trước" được quản lý sẵn cho API: nó nhận request HTTP hoặc WebSocket từ client, lo xác thực, giới hạn tốc độ, cache, rồi chuyển tiếp tới backend (Lambda, một HTTP endpoint, một dịch vụ AWS, hoặc tài nguyên private trong VPC). Bạn không quản lý server nào và trả tiền theo số request.

### 10.1 Types

Có ba loại, và hai loại đầu hay bị lẫn vì tên gọi: **cả REST API lẫn HTTP API đều là API kiểu REST chạy trên HTTP**. Khác biệt là thế hệ sản phẩm và bộ tính năng.

- **REST API** là thế hệ đầu, đủ tính năng nhất: API key và usage plan (hạn mức riêng cho từng khách hàng), kiểm tra hợp lệ request, biến đổi body request/response, cache response, gắn AWS WAF, endpoint dạng edge-optimized và private.
- **HTTP API** là thế hệ sau, được thiết kế **tối giản để rẻ và nhanh hơn**: có sẵn JWT authorizer (kiểm tra token OIDC/OAuth 2.0 không cần viết Lambda), CORS, tự động deploy. Nó **không có** cache, API key/usage plan, request validation, WAF, và chỉ có endpoint regional.
- **WebSocket API** giữ một kết nối hai chiều mở lâu dài giữa client và server, để server **chủ động đẩy** dữ liệu xuống (chat, bảng giá trực tiếp, thông báo).

| | REST API | HTTP API | WebSocket API |
|--|----------|----------|---------------|
| Giá (us-east-1, bậc đầu) | ~$3,50 / 1 triệu request | ~$1,00 / 1 triệu request | ~$1,00 / 1 triệu message + ~$0,25 / 1 triệu phút kết nối |
| Cache response | Có | Không | — |
| API key, usage plan, throttle theo từng client | Có | Không | — |
| AWS WAF | Có | Không | — |
| JWT authorizer có sẵn | Không (dùng Lambda authorizer hoặc Cognito authorizer) | Có | — |
| Loại endpoint | Edge-optimized, Regional, Private | Chỉ Regional | — |
| Chọn khi | Cần một trong các tính năng ở trên | API đơn giản trước Lambda/HTTP backend, ưu tiên giá | Cần server đẩy dữ liệu realtime |

Với 100 triệu request mỗi tháng: REST API ~100 × $3,50 = **$350**, HTTP API ~100 × $1,00 = **$100**, rẻ hơn khoảng 71%.

### 10.2 Optimization

**Caching (chỉ REST API).** Bật cache cho một *stage* (một môi trường đã deploy của API, như `prod` hay `dev`) thì API Gateway giữ response và trả lại cho các request giống nhau mà không gọi backend. TTL mặc định **300 giây**, tối đa **3.600 giây**; mặc định chỉ method `GET` được cache. Khác với CloudFront, cache này là một **cụm cache riêng tính tiền theo giờ** theo dung lượng bạn chọn, kể cả khi không có request nào. Lợi ích là giảm tải và giảm độ trễ cho backend chậm, ví dụ một Lambda phải query database.

**Throttling — giới hạn tốc độ để bảo vệ backend.** API Gateway dùng thuật toán *token bucket*: một cái xô chứa token được nạp đều theo **rate** (số request mỗi giây), mỗi request lấy một token, và dung tích xô là **burst** (số request được phép dồn tới cùng lúc). Hết token thì request bị trả về **`429 Too Many Requests`**. Mặc định cả account trong một region được **10.000 request/giây** với burst **5.000**, dùng chung cho mọi API. Bạn có thể đặt mức thấp hơn cho từng stage hoặc từng method; riêng REST API còn đặt được cho **từng API key qua usage plan**, ví dụ khách gói Free 10 request/giây, gói Pro 1.000.

**Loại endpoint — client gọi vào từ đâu:**

- **Edge-optimized** (chỉ REST API): API Gateway tự đặt một CloudFront distribution do AWS quản lý ở phía trước. Client ở xa bắt tay TLS với POP gần họ rồi request đi backbone về region, theo đúng cơ chế ở §4. Hợp khi client rải khắp thế giới. Nó không tự cache response; cache vẫn là tính năng riêng nói ở trên.
- **Regional**: endpoint nằm thẳng trong region. Hợp khi client ở cùng region, hoặc khi bạn muốn tự đặt CloudFront của mình phía trước để kiểm soát cache và WAF.
- **Private** (chỉ REST API): chỉ gọi được **từ bên trong VPC** qua một interface endpoint (§7.1), không có đường vào từ internet. Dùng cho API nội bộ.

---

## 11. App Mesh / Service Mesh

**Bài toán.** Một hệ có vài chục microservice gọi lẫn nhau, và service nào cũng phải tự lo cùng một loạt việc về mạng: gọi lỗi thì thử lại mấy lần, chờ tối đa bao lâu, mã hoá kết nối ra sao, ghi metric thế nào. Viết những thứ đó vào từng service, bằng từng ngôn ngữ, vừa lặp lại vừa dễ lệch nhau.

**Service mesh** tách các việc đó ra khỏi code. Cạnh mỗi service chạy một **proxy** nhỏ gọi là **sidecar** (phổ biến nhất là Envoy); mọi traffic vào và ra của service đều đi qua proxy này. Một *control plane* trung tâm đẩy cấu hình xuống tất cả proxy. Code của service chỉ gọi `http://orders` như bình thường, còn proxy lo những việc sau:

- **Traffic shifting:** chia tỉ lệ traffic giữa hai phiên bản, ví dụ 95% về v1 và 5% về v2 để thử bản mới.
- **Retry policy và timeout:** tự gọi lại khi lỗi tạm thời, với số lần và thời gian chờ khai một chỗ.
- **Circuit breaker:** khi một service phía sau lỗi liên tục, proxy **ngừng gửi request tới nó một lúc** và trả lỗi ngay, thay vì để request xếp hàng chờ timeout rồi kéo sập cả chuỗi.
- **mTLS** (mutual TLS): cả hai phía đều xuất trình chứng chỉ, nên service vừa mã hoá kết nối vừa xác minh được **ai đang gọi mình**.
- **Observability:** mọi lời gọi đi qua proxy nên có sẵn metric, log và trace đồng nhất.

Cái giá là mỗi task/pod thêm một container proxy (tốn CPU, RAM, thêm một chặng trễ nhỏ) và thêm một hệ thống phải vận hành. Chỉ đáng khi số microservice đủ nhiều và cần điều khiển traffic chi tiết.

**AWS App Mesh** là service mesh do AWS quản lý, dùng Envoy làm sidecar. AWS **ngừng hỗ trợ App Mesh vào 30/9/2026** và hướng người dùng sang **Amazon ECS Service Connect** (cho ECS) hoặc **VPC Lattice**. Trong đề thi App Mesh còn có thể xuất hiện như một lựa chọn, nhưng không còn là đáp án cho hệ thống mới.

### VPC Lattice (mới)

**VPC Lattice** giải cùng bài toán "service gọi service" nhưng **không cần sidecar**: phần định tuyến, cân bằng tải và xác thực do chính hạ tầng mạng của AWS làm.

- Bạn tạo một **service network** (một nhóm logic), đăng ký các **service** vào đó (đích có thể là EC2, ECS, EKS, Lambda), rồi liên kết các VPC cần gọi với service network.
- Các VPC đó **không cần peering hay Transit Gateway với nhau**, có thể thuộc **account khác nhau** và thậm chí **trùng dải IP**.
- Kiểm soát "ai được gọi service nào" bằng **auth policy** viết theo kiểu IAM, và chia traffic theo trọng số được giống traffic shifting của mesh.

Nó thay cho App Mesh trong phần lớn nhu cầu, và thay cho một số trường hợp trước đây phải dựng PrivateLink (chia sẻ nhiều service HTTP giữa các account mà không muốn tạo một NLB và một endpoint cho từng service).

---

## 12. Ví dụ design network cho 4 use case

### 12.1 SaaS web app, user toàn cầu, B2C
- Route 53 latency-based → 2 region (us-east-1, eu-west-1).
- CloudFront trước ALB ở mỗi region.
- WAF integrated với CloudFront.
- ACM certificate.
- Aurora Global Database, write us-east-1.

### 12.2 Game server realtime UDP
- Global Accelerator → NLB → EC2 fleet (instance store cho state).
- Static anycast IP cho client.
- 2 region failover qua GA.

### 12.3 Enterprise hybrid
- Direct Connect 10 Gbps × 2 (HA, 2 DX location).
- Transit Gateway hub.
- VPC endpoints cho S3/DynamoDB (tránh NAT cost).
- VPN backup.

### 12.4 Multi-account organization
- Transit Gateway shared via Resource Access Manager (RAM).
- Centralized egress qua security account.
- PrivateLink expose shared service.

---

## 13. Cạm bẫy đề thi (SAA)

1. **"CloudFront cache POST"** → **Không**, chỉ cache GET/HEAD (và OPTIONS). POST đi thẳng origin.
2. **"Global Accelerator có cache"** → **Sai**.
3. **"Route 53 failover < 1 giây"** → **Sai**. Thời gian = phát hiện lỗi (~90 giây với health check mặc định) + TTL + cache phía client, tức tính bằng phút. Cần nhanh hơn và không phụ thuộc DNS thì dùng GA (rút endpoint hỏng trong dưới 1 phút, client giữ nguyên IP).
4. **"Gateway endpoint S3 mất tiền"** → **Sai**, free. Interface endpoint mới tốn.
5. **"NAT Gateway cần thiết để EC2 truy cập S3"** → **Sai** nếu dùng Gateway endpoint S3.
6. **"Direct Connect encrypt mặc định"** → **Sai**, là L2 fiber. Cần MACsec (option) hoặc IPsec qua DX.
7. **"VPC Peering transitive"** → **Sai**. Nếu A↔B và B↔C, A không thể đến C qua B. Dùng TGW.
8. **"HTTP API có WAF"** → **Sai** (chưa support gốc, cần workaround qua CloudFront).
9. **"CloudFront và GA dùng cùng underlay"** → AWS backbone giống nhau, nhưng GA expose anycast IP, CloudFront là HTTP cache.

---

## 14. Tóm tắt 1 dòng

> Đẩy content ra **edge** (CloudFront) cho static, dùng **AWS backbone** (Global Accelerator, VPC endpoint, DX) cho dynamic / private. Egress là cost trap — design để minimize cross-AZ, cross-region, và internet egress.

---

## 15. Bài tập tự kiểm tra

1. Web app deploy us-east-1, user VN báo chậm. CloudFront giải quyết bao nhiêu trong các vấn đề: (a) DNS, (b) TLS handshake, (c) TTFB dynamic, (d) static asset?
2. NAT Gateway hóa đơn $5000/tháng, 90% traffic là S3 read. Action?
3. So sánh failover speed: Route 53 failover routing (TTL 60s) vs Global Accelerator. Tại sao GA nhanh hơn?
4. App 10 microservice trong 5 VPC khác account. Cần communicate full mesh. Chọn peering hay TGW hay Lattice? Vì sao?
5. Enterprise cần kết nối 4 datacenter on-prem với AWS, traffic 500 Mbps mỗi DC, latency < 5ms. VPN hay DX? Setup thế nào HA?
6. CloudFront cache hit rate 40%. Liệt kê 5 hành động cụ thể để tăng hit rate.

---

## 16. Đọc thêm

- AWS Whitepaper — *AWS Networking Overview*, *Best Practices for VPC Design*.
- AWS Builder's Library — nhiều bài về *Workload isolation*, *Caching*.
- AWS docs — *CloudFront developer guide*, *Global Accelerator developer guide*.
- *High Performance Browser Networking* — Ilya Grigorik (kinh điển về HTTP/TLS/TCP).

---

**Chương 2 hoàn thành.** Tiếp theo: chương 3 — Design Secure Architectures.
