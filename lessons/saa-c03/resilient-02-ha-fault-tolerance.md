# High Availability & Fault Tolerance

Trong Domain 2 (Design Resilient Architectures), đây là bài "xương sống". Đề SAA-C03 cực kỳ thích các tình huống kiểu *"website downtime khi một AZ chết, làm sao khắc phục?"* hoặc *"giảm RTO/RPO xuống mức nào?"*. Nắm chắc bài này bạn xử lý được khoảng 15-20% câu hỏi resilience.

## 1. Phân biệt khái niệm: HA vs Fault Tolerance vs DR

Đề thi thường trộn ba khái niệm này để gài bẫy. Cả ba đều trả lời câu hỏi "một thứ gì đó hỏng thì sao?", nhưng khác nhau ở **người dùng có thấy gián đoạn không** và **thứ hỏng to cỡ nào**.

**High Availability (HA)** chấp nhận một quãng gián đoạn ngắn rồi tự phục hồi. Luôn có một bản dự phòng chờ sẵn, nhưng việc chuyển sang bản đó tốn thời gian: phát hiện lỗi, đổi vai, client kết nối lại. Ví dụ chuẩn là RDS Multi-AZ: primary chết thì standby lên thay sau khoảng 60–120 giây, và trong quãng đó mọi câu query đều lỗi.

**Fault Tolerance (FT)** nghĩa là một thành phần hỏng mà **không request nào thất bại vì nó**. Muốn vậy thì không được có bước "chuyển sang": các bản dư phải **đang cùng làm việc** từ trước, và phần còn lại đủ sức gánh ngay. Ví dụ đúng nghĩa là tầng lưu trữ của Aurora (§2): mỗi lần ghi đi tới 6 bản ở 3 AZ, mất nguyên một AZ thì các bản còn lại vẫn phục vụ đọc ghi, không có failover nào diễn ra. S3 và DynamoDB cũng thuộc loại này vì dữ liệu luôn nằm sẵn ở nhiều AZ. Cái giá là phải trả tiền cho phần dư chạy thường trực, nên FT đắt hơn HA.

**Disaster Recovery (DR)** lo cho sự cố lớn hơn một thành phần: mất cả Region, xoá nhầm dữ liệu, bị mã hoá tống tiền. Lúc này mục tiêu không còn là "không gián đoạn" mà là khôi phục trong một giới hạn đã thoả thuận trước, đo bằng RTO và RPO (§8).

| Khái niệm | Ý nghĩa | Khi component lỗi thì... | Ví dụ AWS |
|---|---|---|---|
| **High Availability (HA)** | Hệ thống *recover nhanh* khi có sự cố, downtime tối thiểu | Có gián đoạn ngắn (giây tới vài phút) rồi tự phục hồi | RDS Multi-AZ (failover 60–120 giây), Aurora failover sang replica (dưới 60 giây) |
| **Fault Tolerance (FT)** | Hệ thống chạy *liên tục không gián đoạn* dù component lỗi | Người dùng không nhận ra có lỗi | Tầng storage của Aurora (6 bản / 3 AZ), S3, DynamoDB, kiến trúc Multi-Site active-active |
| **Disaster Recovery (DR)** | Khôi phục sau thảm họa lớn (mất cả region) | Khôi phục theo RTO/RPO định trước | Multi-Region, Pilot Light, backups |

Lưu ý một chỗ dễ nhầm: **cụm Aurora nhìn từ phía ứng dụng vẫn là HA, không phải FT**. Dữ liệu thì không mất và không gián đoạn (tầng storage chịu lỗi), nhưng nếu instance writer chết thì vẫn có vài chục giây không ghi được trong lúc một replica được nâng lên thay.

> 💡 Mẹo thi: HA = "phục hồi nhanh, chấp nhận downtime ngắn". FT = "không downtime, không mất dữ liệu/giao dịch". Nếu đề nhấn mạnh "no interruption", "zero downtime" → hướng Fault Tolerance (thường cần redundancy nhiều hơn, đắt hơn).

### Single Point of Failure (SPOF)

SPOF = một thành phần mà nếu nó chết thì cả hệ thống chết. Mục tiêu thiết kế resilient là **loại bỏ SPOF**.

Các SPOF kinh điển trong đề:
- EC2 instance đơn lẻ (không Auto Scaling) → giải pháp: ASG qua nhiều AZ.
- RDS Single-AZ → giải pháp: Multi-AZ.
- NAT Instance đơn lẻ → giải pháp: NAT Gateway (managed, redundant trong AZ) hoặc nhiều NAT Gateway ở mỗi AZ.
- Một AZ duy nhất → giải pháp: deploy qua ≥2 AZ.

> ⚠️ Bẫy: NAT Gateway **bản thân nó đã redundant trong AZ đó**, nhưng nó vẫn nằm trong MỘT AZ. Nếu cả AZ đó chết, NAT Gateway chết theo. Kiến trúc HA thật sự cần **một NAT Gateway cho mỗi AZ**, và route table của mỗi private subnet trỏ về NAT Gateway cùng AZ.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 410" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc khử SPOF — VPC trải 2 AZ, NAT Gateway riêng mỗi AZ</title>
  <desc>Một VPC gồm hai Availability Zone. Mỗi AZ có một public subnet chứa NAT Gateway riêng và một private subnet; route table của private subnet trỏ về NAT Gateway cùng AZ. Auto Scaling Group trải instance qua cả hai AZ. Nếu một AZ chết, AZ còn lại vẫn phục vụ — không còn điểm lỗi đơn.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Khử SPOF: NAT Gateway riêng mỗi AZ + ASG trải đa AZ</text>
  <rect x="14" y="38" width="692" height="356" rx="12" fill="#3b82f6" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 4"/>
  <text x="28" y="58" font-size="11.5" font-weight="700" fill="currentColor" opacity="0.75">VPC</text>
  <g>
    <rect x="32" y="70" width="316" height="312" rx="10" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="48" y="90" font-size="12" font-weight="700" fill="currentColor">Availability Zone A</text>
    <rect x="48" y="102" width="284" height="78" rx="8" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="62" y="120" font-size="10.5" fill="currentColor" opacity="0.7">Public subnet A</text>
    <rect x="62" y="128" width="120" height="40" rx="7" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="122" y="145" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">NAT GW A</text>
    <text x="122" y="160" font-size="9.5" text-anchor="middle" fill="#fff" opacity="0.9">(trong AZ A)</text>
    <rect x="48" y="196" width="284" height="170" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="62" y="214" font-size="10.5" fill="currentColor" opacity="0.7">Private subnet A — RT → NAT GW A</text>
    <rect x="68" y="226" width="116" height="36" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="126" y="249" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2</text>
    <rect x="196" y="226" width="116" height="36" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="254" y="249" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2</text>
  </g>
  <g>
    <rect x="372" y="70" width="316" height="312" rx="10" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="388" y="90" font-size="12" font-weight="700" fill="currentColor">Availability Zone B</text>
    <rect x="388" y="102" width="284" height="78" rx="8" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="402" y="120" font-size="10.5" fill="currentColor" opacity="0.7">Public subnet B</text>
    <rect x="402" y="128" width="120" height="40" rx="7" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="462" y="145" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">NAT GW B</text>
    <text x="462" y="160" font-size="9.5" text-anchor="middle" fill="#fff" opacity="0.9">(trong AZ B)</text>
    <rect x="388" y="196" width="284" height="170" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="402" y="214" font-size="10.5" fill="currentColor" opacity="0.7">Private subnet B — RT → NAT GW B</text>
    <rect x="408" y="226" width="116" height="36" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="466" y="249" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2</text>
    <rect x="536" y="226" width="116" height="36" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="594" y="249" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">EC2</text>
  </g>
  <defs>
    <marker id="spofArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M126 226 V190 H122 V172" marker-end="url(#spofArr)"/>
    <path d="M466 226 V190 H462 V172" marker-end="url(#spofArr)"/>
  </g>
  <rect x="32" y="330" width="656" height="44" rx="8" fill="#10b981" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="349" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Auto Scaling Group — trải instance qua AZ A và AZ B</text>
  <text x="360" y="366" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">AZ A chết → ASG launch bù ở AZ B, NAT GW B vẫn sống → không còn SPOF</text>
</svg>

## 2. Multi-AZ: nền tảng của HA trong một Region

### RDS Multi-AZ

**Nó là gì.** Khi bật Multi-AZ, AWS dựng thêm một bản sao của database, gọi là **standby**, ở một AZ khác với bản chính (**primary**). Hai bản có ổ đĩa riêng, và dữ liệu được chép từ primary sang standby theo kiểu **đồng bộ (synchronous)**.

**Đồng bộ nghĩa là gì, và vì sao nó quan trọng.** Khi ứng dụng `COMMIT` một giao dịch, primary chỉ trả lời "xong" **sau khi** dữ liệu đã được ghi ở cả hai AZ. Hệ quả có hai mặt:

- Mọi giao dịch mà ứng dụng đã nhận được "xong" chắc chắn đã nằm trên standby. Primary có chết ngay sau đó thì standby lên thay cũng **không mất giao dịch nào**, tức RPO bằng 0.
- Mỗi lần ghi phải chờ thêm một chặng mạng sang AZ kia, nên độ trễ ghi và commit cao hơn Single-AZ một chút. Đây là cái giá của "không mất dữ liệu".

Ngược lại, **bất đồng bộ (asynchronous)**, kiểu mà Read Replica dùng, cho primary trả lời "xong" ngay rồi mới gửi thay đổi sang replica sau. Ghi nhanh hơn, nhưng replica luôn chậm hơn primary một quãng gọi là **replication lag**. Nếu primary chết đúng lúc đó, những giao dịch chưa kịp gửi đi sẽ mất. Vì vậy Read Replica không được dùng làm cơ chế failover tự động.

**Standby không phục vụ traffic.** Không đọc được, không ghi được, không có endpoint riêng để kết nối vào. Nó chỉ chờ failover. Đây là điểm khác cốt lõi với Read Replica: bật Multi-AZ không làm database đọc nhanh hơn chút nào.

**Failover diễn ra thế nào.** Ứng dụng luôn kết nối qua một tên DNS (endpoint) chứ không qua IP. Khi cần failover, RDS nâng standby lên làm primary rồi sửa bản ghi DNS của endpoint (một bản ghi **CNAME**, tức tên trỏ tới tên khác) sang máy mới. Ứng dụng không phải đổi cấu hình, nhưng các kết nối đang mở đều bị đứt và phải **kết nối lại**. Toàn bộ quá trình thường mất **60–120 giây**.

Failover tự động xảy ra khi AZ của primary lỗi, instance lỗi, mất kết nối mạng, và cả trong các thao tác có kế hoạch như đổi instance type hay patching (RDS làm trên standby trước rồi đổi vai, nhờ đó thời gian gián đoạn chỉ bằng một lần failover).

Bảng dưới gom lại những khác biệt vừa giải thích:

| Tiêu chí | Multi-AZ | Read Replica |
|---|---|---|
| Mục đích | High Availability | Scale read (offload đọc) |
| Replication | Synchronous | Asynchronous |
| Phục vụ traffic? | Không (standby im lặng) | Có (read-only) |
| Cross-Region? | Không (cùng region)\* | Có |
| Tự động failover? | Có | Không (phải promote thủ công) |

\* *RDS có tùy chọn Multi-AZ DB cluster (3 instance: 1 writer + 2 readable standby) — readable standby có thể phục vụ đọc, nhưng đây không phải mặc định.*

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>RDS Multi-AZ (standby im lặng) so với Read Replica (phục vụ đọc)</title>
  <desc>Bên trái: Multi-AZ — primary sao chép đồng bộ sang standby ở AZ khác; standby không nhận traffic, chỉ chờ failover. Bên phải: Read Replica — primary sao chép bất đồng bộ sang replica; ứng dụng đọc trực tiếp từ replica để giảm tải đọc.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Multi-AZ (HA) vs Read Replica (scale đọc)</text>
  <g>
    <rect x="14" y="38" width="338" height="262" rx="11" fill="#3b82f6" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="30" y="60" font-size="12.5" font-weight="700" fill="currentColor">RDS Multi-AZ — High Availability</text>
    <rect x="40" y="76" width="120" height="50" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="100" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Primary</text>
    <text x="100" y="114" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">AZ A · read+write</text>
    <rect x="206" y="76" width="120" height="50" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 3"/>
    <text x="266" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Standby</text>
    <text x="266" y="114" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">AZ B · IM LẶNG</text>
    <g stroke="currentColor" stroke-opacity="0.55" fill="none">
      <path d="M160 101 H200" marker-end="url(#rdsArr)"/>
    </g>
    <text x="183" y="92" font-size="9" text-anchor="middle" fill="#10b981" opacity="0.95" font-weight="700">sync</text>
    <rect x="40" y="150" width="76" height="30" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="78" y="170" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">App</text>
    <g stroke="currentColor" stroke-opacity="0.5" fill="none">
      <path d="M100 150 V130" marker-end="url(#rdsArr)"/>
    </g>
    <line x1="266" y1="150" x2="266" y2="135" stroke="#ef4444" stroke-opacity="0.6" stroke-width="2"/>
    <line x1="258" y1="140" x2="274" y2="148" stroke="#ef4444" stroke-opacity="0.7" stroke-width="2"/>
    <line x1="274" y1="140" x2="258" y2="148" stroke="#ef4444" stroke-opacity="0.7" stroke-width="2"/>
    <text x="266" y="170" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">không đọc</text>
    <rect x="30" y="206" width="308" height="80" rx="8" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="44" y="226" font-size="10.5" fill="currentColor" opacity="0.85">• Sao chép ĐỒNG BỘ (synchronous)</text>
    <text x="44" y="244" font-size="10.5" fill="currentColor" opacity="0.85">• Standby chỉ chờ failover (60–120s)</text>
    <text x="44" y="262" font-size="10.5" fill="currentColor" opacity="0.85">• Failover qua DNS CNAME, tự động</text>
    <text x="44" y="280" font-size="10.5" fill="currentColor" opacity="0.85">• Mục đích: chống mất AZ, KHÔNG scale đọc</text>
  </g>
  <g>
    <rect x="368" y="38" width="338" height="262" rx="11" fill="#10b981" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="384" y="60" font-size="12.5" font-weight="700" fill="currentColor">Read Replica — Scale đọc</text>
    <rect x="394" y="76" width="120" height="50" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="454" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Primary</text>
    <text x="454" y="114" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">read+write</text>
    <rect x="560" y="76" width="120" height="50" rx="8" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="620" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Read Replica</text>
    <text x="620" y="114" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">read-only</text>
    <g stroke="currentColor" stroke-opacity="0.55" fill="none">
      <path d="M514 101 H554" marker-end="url(#rdsArr)"/>
    </g>
    <text x="537" y="92" font-size="9" text-anchor="middle" fill="#f59e0b" opacity="0.95" font-weight="700">async</text>
    <rect x="394" y="150" width="76" height="30" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="432" y="170" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">App</text>
    <g stroke="currentColor" stroke-opacity="0.5" fill="none">
      <path d="M454 150 V130" marker-end="url(#rdsArr)"/>
      <path d="M470 165 H560 V130" marker-end="url(#rdsArr)"/>
    </g>
    <text x="540" y="160" font-size="9" text-anchor="middle" fill="#10b981" opacity="0.95" font-weight="700">đọc</text>
    <rect x="384" y="206" width="308" height="80" rx="8" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="398" y="226" font-size="10.5" fill="currentColor" opacity="0.85">• Sao chép BẤT ĐỒNG BỘ (asynchronous)</text>
    <text x="398" y="244" font-size="10.5" fill="currentColor" opacity="0.85">• Replica PHỤC VỤ đọc (offload truy vấn)</text>
    <text x="398" y="262" font-size="10.5" fill="currentColor" opacity="0.85">• Không tự failover (promote thủ công)</text>
    <text x="398" y="280" font-size="10.5" fill="currentColor" opacity="0.85">• Có thể cross-region</text>
  </g>
  <defs>
    <marker id="rdsArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

> ⚠️ Bẫy phổ biến: "Tăng khả năng đọc + đảm bảo HA" → cần **CẢ HAI**: Multi-AZ (cho HA) và Read Replica (cho scale read). Đề hay cho đáp án chỉ một trong hai để bẫy.

### Aurora

**Khác RDS ở đâu.** Ở RDS thường, mỗi instance (primary, standby, từng read replica) có **ổ đĩa riêng** và dữ liệu phải được chép từ máy này sang máy kia. Aurora tách đôi hai phần đó: phần tính toán là các **DB instance**, phần lưu trữ là một **cluster volume dùng chung** mà mọi instance trong cụm cùng gắn vào. Gần như mọi ưu điểm HA của Aurora đều suy ra từ thiết kế này.

**Tầng lưu trữ: 6 bản qua 3 AZ.** Mỗi lần ghi được chép đồng bộ tới **6 storage node trải trên 3 AZ** (2 bản mỗi AZ). Việc này diễn ra bất kể cụm có bao nhiêu instance, kể cả khi chỉ có một. Mất nguyên một AZ, tức mất 2 trong 6 bản, thì cluster volume vẫn đọc ghi được và không mất dữ liệu. Đây là phần fault tolerant đã nhắc ở §1.

**Aurora Replica: đọc chung một volume.** Một cụm có 1 instance writer và tối đa **15 Aurora Replica** chỉ đọc. Replica không giữ bản dữ liệu riêng mà đọc thẳng từ cluster volume chung. Từ đó có ba hệ quả:

- **Thêm replica nhanh**, vì không phải chép dữ liệu sang máy mới.
- **Replica lag rất nhỏ**, thường dưới 100 ms, vì writer chỉ cần báo cho replica biết trang nào vừa đổi chứ không gửi lại toàn bộ dữ liệu. Read replica của RDS thường thì phải nhận và chạy lại từng thay đổi nên lag có thể lên hàng giây hoặc hơn khi tải ghi nặng.
- **Mỗi replica đồng thời là failover target.** Nó đã thấy đủ dữ liệu trên volume chung, nên nâng nó lên làm writer không cần đồng bộ gì thêm. Một replica vừa scale đọc vừa lo HA, không phải trả tiền cho một standby nằm im như RDS Multi-AZ.

**Failover.** Khi writer chết, Aurora nâng một replica lên thay và trỏ **cluster endpoint** (tên DNS luôn chỉ vào writer hiện tại) sang nó. Dịch vụ thường trở lại trong **dưới 60 giây, hay gặp là dưới 30 giây**. Trong quãng đó lệnh đọc ghi tới writer vẫn lỗi, nên đây vẫn là HA chứ chưa phải FT.

```
RDS Multi-AZ:                 failover 60–120 giây, standby không đọc được
Aurora có ≥ 1 replica:        failover < 60 giây (thường < 30 giây), replica đọc được
Aurora KHÔNG có replica nào:  phải dựng lại writer mới, thường dưới 10 phút
```

Dòng cuối là bẫy: dữ liệu Aurora luôn an toàn nhờ 6 bản, nhưng một cụm chỉ có đúng một instance thì **chưa HA ở tầng compute**. Muốn chịu được mất một AZ, cần ít nhất một replica đặt ở AZ khác.

**Aurora Global Database.** Thêm các cụm chỉ đọc ở Region khác, nhận dữ liệu từ Region chính theo kiểu bất đồng bộ với độ trễ thường dưới 1 giây. Dùng cho DR cross-region với RPO thấp (cỡ giây, không phải 0 vì là async) và cho người dùng ở xa đọc dữ liệu gần mình. Khi Region chính sập, promote Region phụ lên trong dưới 1 phút (RTO thấp).

> 💡 Mẹo thi: Đề muốn "RPO gần 0 + đọc toàn cầu + failover cross-region nhanh" → **Aurora Global Database**. Đề muốn HA trong region + scale đọc, không cần global → Aurora với nhiều replica.

### ELB Cross-AZ

**Load balancer không phải một cái máy.** Khi bạn bật một AZ cho load balancer, ELB đặt vào AZ đó một **load balancer node**, tức một (hoặc vài) máy làm nhiệm vụ nhận request và chuyển tiếp cho **target** (EC2 instance, container, IP đứng sau LB). Bật 2 AZ thì có node ở 2 AZ. Tên DNS của load balancer trả về IP của các node này, và client chia nhau kết nối vào chúng gần như đều: với 2 AZ thì mỗi node nhận khoảng 50% traffic. Nhờ vậy bản thân LB không phải SPOF: một AZ sập thì node ở AZ kia vẫn nhận request.

**Cross-zone load balancing** trả lời câu hỏi: node ở AZ-A được phép chuyển request cho target nào?

- **Bật**: mỗi node chia traffic của nó cho **mọi target ở mọi AZ**.
- **Tắt**: mỗi node chỉ chia cho các target **trong AZ của chính nó**.

Khi số target hai bên bằng nhau thì bật hay tắt cho kết quả như nhau. Khác biệt chỉ lộ ra khi **target phân bố lệch**. Lấy ví dụ AZ-A có 8 instance, AZ-B có 2, mỗi node nhận 50% traffic:

```
Cross-zone TẮT:
  AZ-A: 50% ÷ 8 instance = 6,25% mỗi máy
  AZ-B: 50% ÷ 2 instance = 25%   mỗi máy   → gấp 4 lần máy bên AZ-A

Cross-zone BẬT:
  100% ÷ 10 instance     = 10%   mỗi máy   → đều nhau
```

Hai instance ở AZ-B gánh tải gấp 4 lần trong khi tám máy bên kia còn rảnh. Nhìn từ ngoài, triệu chứng là "một số instance CPU rất cao, số khác thấp, dù đứng sau cùng một load balancer".

**Mặc định của từng loại** (ba loại này giải thích ở §6):

- **ALB**: cross-zone **luôn bật** ở mức load balancer, miễn phí. Chỉ có thể tắt riêng cho từng target group.
- **NLB & GWLB**: cross-zone **mặc định TẮT**. Bật lên thì request đi chéo AZ sẽ bị **tính phí data transfer giữa các AZ**.

Vì sao NLB để tắt mặc định? Giữ traffic trong cùng AZ thì không tốn phí liên AZ, không thêm một chặng mạng, và lỗi của một AZ không lan sang AZ khác. Đổi lại, bạn phải tự giữ số target ở các AZ cân nhau.

Một con số liên quan tới HA: load balancer chỉ gửi request cho target **healthy**. Với ALB, health check mặc định chạy mỗi 30 giây và target bị coi là unhealthy sau 2 lần fail liên tiếp, tức mất khoảng `30 × 2 = 60 giây` kể từ lúc app chết tới lúc LB ngừng gửi request cho nó. Muốn phát hiện nhanh hơn thì giảm interval.

> ⚠️ Bẫy: Nếu target không phân bố đều (AZ-A có 8 instance, AZ-B có 2) và cross-zone TẮT, traffic vào AZ-B sẽ dồn nặng lên 2 instance đó. Đề hỏi "vì sao tải không đều" → nghĩ tới cross-zone đang tắt (NLB).

## 3. Auto Scaling cho High Availability

Auto Scaling Group (ASG) không chỉ để scale theo tải — nó là **trụ cột HA**: tự thay thế instance chết và phân bố qua nhiều AZ.

Vai trò HA của ASG:
- **Health check + tự thay thế**: instance fail health check → ASG terminate và launch instance mới.
- **Multi-AZ distribution**: ASG cân bằng instance qua các AZ được cấu hình. AZ chết → ASG launch bù ở AZ còn sống.
- **Min capacity**: đặt `min` ≥ 2 và trải qua ≥ 2 AZ để luôn còn instance khi một AZ sập.

Các loại health check:
- **EC2 health check** (mặc định): chỉ kiểm tra trạng thái hardware/hypervisor của instance.
- **ELB health check**: kiểm tra ứng dụng có thực sự phản hồi (HTTP 200). **Nên bật** để ASG biết loại instance "máy sống nhưng app chết".

> ⚠️ Bẫy: ASG mặc định chỉ dùng EC2 health check. Nếu app crash nhưng OS vẫn chạy, ASG **không** thay thế instance. Giải pháp đề thi: bật **ELB health check** cho ASG.

Chiến lược tránh SPOF với ASG:
- Đặt `min capacity` đủ để chịu mất 1 AZ (ví dụ cần 4 instance phục vụ → set min 6 qua 3 AZ, mất 1 AZ còn 4).
- Dùng **Launch Template** (khuyến nghị, thay cho Launch Configuration đã cũ).

## 4. Stateless & Session Externalization

Để ASG thay thế instance tự do (và để HA hoạt động), instance phải **stateless** — không lưu state cục bộ trên đĩa/RAM của instance đó.

Vấn đề: session người dùng lưu trên instance → instance chết → người dùng bị logout. Đây là **SPOF ở tầng session**.

Các cách externalize session:

| Giải pháp | Đặc điểm | Khi nào dùng |
|---|---|---|
| **ElastiCache (Redis)** | In-memory, latency cực thấp, hỗ trợ replication/Multi-AZ | Session store hiệu năng cao, phổ biến nhất trong đề |
| **DynamoDB** | Serverless, scale tự động, TTL tự xóa session hết hạn | Session store không cần quản lý, tích hợp tốt serverless |
| **ALB Sticky Sessions** | Gắn user vào 1 instance qua cookie | Giải pháp "tạm", KHÔNG phải externalize thật — instance chết vẫn mất session |

> 💡 Mẹo thi: "Làm sao để user không mất session khi instance bị thay thế?" → externalize ra **ElastiCache** hoặc **DynamoDB**. Sticky session là **bẫy** — nó chỉ định tuyến, không bảo toàn session khi instance chết.

> ⚠️ Bẫy: Lưu dữ liệu lên đĩa local của EC2 cũng là anti-pattern. Cần dùng **S3** (object) hoặc **EFS** (shared file system gắn nhiều AZ) để dữ liệu sống độc lập với instance.

## 5. Route 53 Routing Policies & Health Checks

Route 53 là dịch vụ **DNS** của AWS: nó trả lời câu hỏi "tên miền `app.example.com` ứng với địa chỉ nào?". Vì mọi request đều bắt đầu bằng một lần hỏi DNS, đây là nơi điều phối HA/DR ở mức **toàn cục (cross-region)**: load balancer chỉ chia tải trong một Region, còn chọn Region nào là việc của DNS.

Hai điều cần nhớ trước khi vào từng policy:

- **Route 53 không chuyển tiếp traffic.** Nó chỉ trả về một câu trả lời (IP hoặc tên khác), sau đó client tự kết nối thẳng tới địa chỉ đó. "Route traffic" ở đây thực chất là "chọn câu trả lời nào cho người hỏi".
- **Câu trả lời bị cache theo TTL** (time to live, số giây mà resolver và client được phép dùng lại câu trả lời cũ). Route 53 đổi câu trả lời ngay, nhưng client cũ vẫn đi tới địa chỉ cũ cho đến khi hết TTL. TTL 300 giây nghĩa là failover qua DNS có thể chậm thêm tới 5 phút.

**Routing policy** là quy tắc Route 53 dùng để chọn câu trả lời khi một tên có nhiều record. Docs hiện liệt kê **8 policy**; nhiều tài liệu ôn thi cũ đếm 7 vì chưa có IP-based.

### 5.1 Từng policy hoạt động thế nào

**Simple.** Một record, hỏi thì trả đúng giá trị đó. Có thể chứa nhiều IP trong cùng một record, khi đó Route 53 trả hết về theo thứ tự ngẫu nhiên và client tự chọn. Không gắn được health check, nên một IP chết vẫn tiếp tục được trả về.

**Multivalue Answer.** Giống Simple-nhiều-IP ở chỗ trả về nhiều giá trị, khác ở chỗ **mỗi giá trị là một record riêng có health check riêng**. Route 53 chỉ trả những record còn healthy, tối đa **8 record** mỗi lần hỏi. Dùng khi muốn HA đơn giản ở tầng DNS cho vài server có IP public. Nó không thay được load balancer: DNS không biết server nào đang quá tải, và câu trả lời còn bị cache theo TTL.

**Failover.** Hai record cho cùng một tên, một đánh dấu **primary** và một **secondary**. Chừng nào health check của primary còn healthy thì Route 53 chỉ trả primary; khi nó unhealthy thì trả secondary. Đây là mô hình **active-passive**: site phụ không nhận traffic nào lúc bình thường.

**Weighted.** Mỗi record có một trọng số, và xác suất được trả về bằng trọng số của nó chia tổng trọng số:

```
Record A (version cũ): weight 90  → 90 ÷ (90 + 10) = 90% câu trả lời
Record B (version mới): weight 10 → 10 ÷ (90 + 10) = 10% câu trả lời
Đặt weight = 0 → record đó không nhận traffic nữa (rút khỏi vòng mà không cần xoá)
```

Dùng để chuyển traffic dần sang hệ thống mới, A/B testing, canary (§9). Tỉ lệ thực tế chỉ xấp xỉ vì kết quả bị cache.

**Latency.** Bạn tạo một record cho mỗi Region có đặt hệ thống. AWS liên tục đo độ trễ mạng giữa các vùng mạng trên internet và từng Region, rồi Route 53 trả về record của **Region có độ trễ thấp nhất đối với nơi phát ra câu hỏi**. Nó không đo ping của từng người dùng tại thời điểm đó, và "độ trễ thấp nhất" không phải lúc nào cũng là Region gần nhất trên bản đồ, vì đường cáp không chạy theo đường chim bay. Mục đích là **tốc độ**.

**Geolocation.** Chọn theo **người hỏi đang ở đâu**: bạn khai luật theo châu lục, quốc gia (hoặc bang của Mỹ), ví dụ "người dùng ở Đức → record trỏ về Frankfurt". Luật là cứng, không tính tới độ trễ: user ở Đức luôn về Frankfurt kể cả khi Region khác đang nhanh hơn. Nên tạo thêm một record **Default** cho những nơi không khớp luật nào, nếu không họ sẽ không nhận được câu trả lời. Mục đích là **tuân thủ pháp lý** (data residency), nội dung và ngôn ngữ theo quốc gia, bản quyền phát sóng.

**Geoproximity.** Chọn theo **khoảng cách địa lý giữa người dùng và tài nguyên**: ai gần Region nào thì về Region đó. Điểm riêng của nó là **bias**, một số từ −99 tới +99 gắn cho từng tài nguyên để nới rộng hoặc thu hẹp vùng địa lý mà tài nguyên đó phục vụ. Route 53 tính khoảng cách "đã chỉnh" rồi mới so sánh:

```
Khoảng cách đã chỉnh = khoảng cách thật × (1 − bias/100)

Server A cách user 150 km, bias +50 → 150 × (1 − 0,5) = 75 km
Server B cách user 100 km, bias 0   → 100 km
→ user được đưa về A, dù trên bản đồ B gần hơn
```

Bias dương kéo thêm traffic về mình, bias âm đẩy bớt đi. Dùng khi muốn giảm tải dần cho một Region hoặc dồn thêm về Region vừa tăng capacity mà vẫn giữ nguyên tắc "gần đâu về đó". Khác Geolocation ở chỗ ranh giới ở đây là khoảng cách và điều chỉnh được, không phải đường biên quốc gia.

**IP-based.** Bạn tự khai danh sách dải IP (CIDR) và record tương ứng, ví dụ "mọi IP thuộc dải của nhà mạng X → endpoint Y". Dùng khi bạn biết rõ người dùng đến từ dải IP nào và muốn tự quyết thay vì để Route 53 đoán vị trí. Policy này ít ra đề, biết tên và mục đích là đủ.

### 5.2 Bảng chọn policy

| Routing Policy | Mục đích | Tình huống điển hình trong đề |
|---|---|---|
| **Simple** | Một record, không health check | Trường hợp cơ bản nhất |
| **Failover** | Active-Passive: primary chết → chuyển sang secondary | **DR**, standby site. Cần health check trên primary |
| **Weighted** | Chia traffic theo tỉ lệ % | A/B testing, canary deploy, dịch chuyển traffic dần |
| **Latency** | Route tới region có độ trễ thấp nhất | Tối ưu **performance** cho user toàn cầu |
| **Geolocation** | Route theo **vị trí địa lý** của user | Tuân thủ pháp lý (data residency), nội dung theo quốc gia |
| **Geoproximity** | Route theo khoảng cách địa lý + bias dịch chuyển | Cần dịch chuyển traffic giữa region theo "bias" |
| **Multivalue Answer** | Trả tối đa 8 IP healthy, client tự chọn | HA đơn giản kiểu round-robin có health check |
| **IP-based** | Route theo dải IP (CIDR) nguồn do bạn khai | Biết trước user đến từ dải IP/nhà mạng nào |

> ⚠️ Bẫy Latency vs Geolocation: **Latency** = tối ưu *tốc độ* (gần về độ trễ mạng, không nhất thiết gần địa lý). **Geolocation** = dựa trên *vị trí user* (cho compliance/nội dung). Đề mô tả "tuân thủ luật, user EU phải vào server EU" → **Geolocation**. Đề mô tả "user truy cập nhanh nhất có thể" → **Latency**.

> ⚠️ Bẫy Failover vs Multivalue: **Failover** là active-passive (1 primary, 1 standby). **Multivalue** là active-active nhiều endpoint cùng phục vụ. Đề "active-passive DR site" → Failover, không phải Multivalue.

### Health Checks

Route 53 có các máy kiểm tra (**health checker**) đặt ở nhiều nơi trên thế giới, định kỳ gửi request HTTP/HTTPS/TCP tới endpoint của bạn. Endpoint được coi là healthy khi **hơn 18% số health checker** báo healthy. Lấy ý kiến từ nhiều nơi như vậy để một sự cố mạng cục bộ ở phía checker không làm endpoint bị đánh dấu chết oan. Khi endpoint unhealthy, Route 53 ngừng trả record gắn với nó.

Hai tham số quyết định phát hiện lỗi nhanh hay chậm: **request interval** là 30 giây (standard) hoặc 10 giây (fast, tốn thêm tiền), và **failure threshold** là số lần fail liên tiếp để kết luận unhealthy, mặc định 3.

```
Standard: 30 giây × 3 lần fail = ~90 giây mới phát hiện
Fast:     10 giây × 3 lần fail = ~30 giây

Thời gian user thật sự được chuyển sang site phụ ≈ thời gian phát hiện + TTL của record
  ví dụ: 90 giây + TTL 60 giây ≈ 2,5 phút
```

Phép tính này cho thấy failover bằng DNS tính bằng **phút**, và muốn RTO thấp thì phải đặt TTL ngắn cho record failover.

- Loại health check:
  - **Endpoint** monitoring (check IP/domain).
  - **Calculated** (kết hợp nhiều health check con bằng AND/OR).
  - **CloudWatch Alarm** based (dùng cho resource private không expose ra internet).
- Health check là điều kiện để **Failover** và **Multivalue** hoạt động đúng.

> 💡 Mẹo thi: Failover routing **bắt buộc** gắn health check vào primary record thì mới biết khi nào chuyển sang secondary.

## 6. ELB Types: ALB vs NLB vs GWLB

Elastic Load Balancing có ba loại đang dùng (Classic Load Balancer là đời cũ, đề chỉ nhắc như đáp án nhiễu). Chúng khác nhau ở một điểm gốc: **load balancer đọc sâu tới đâu vào gói tin trước khi quyết định chuyển cho ai**. "Layer" là cách gọi độ sâu đó theo mô hình mạng OSI:

- **Layer 3** là địa chỉ IP: gói tin đi từ máy nào tới máy nào.
- **Layer 4** thêm giao thức vận chuyển (TCP hoặc UDP) và số port: gói tin thuộc kết nối nào.
- **Layer 7** là nội dung ứng dụng: với HTTP thì gồm URL, tên host, header, cookie.

Đọc càng sâu thì định tuyến càng thông minh, nhưng tốn công xử lý hơn và chỉ làm việc được với giao thức mà nó hiểu.

### 6.1 ALB (Application Load Balancer) — đọc hiểu HTTP

ALB nhận trọn một request HTTP/HTTPS, đọc nội dung, rồi dùng **listener rule** để chọn **target group** (nhóm target cùng phục vụ một việc). Ví dụ `/api/*` về nhóm API, `/images/*` về nhóm khác, host `admin.example.com` về nhóm quản trị. Một ALB vì thế đứng trước được nhiều microservice. Cũng vì hiểu HTTP, nó làm được những việc gắn với request: giải mã HTTPS, redirect, xác thực người dùng, gắn AWS WAF, hỗ trợ WebSocket, HTTP/2 và gRPC.

Giới hạn đi kèm: **ALB chỉ nói HTTP, HTTPS và gRPC**. Traffic TCP thuần, UDP, MQTT thì nó không nhận. Và vì phải mở kết nối với client, đọc request rồi mở kết nối khác tới target, mỗi request qua ALB tốn thêm công xử lý so với NLB.

### 6.2 NLB (Network Load Balancer) — chuyển tiếp kết nối, không đọc nội dung

NLB chỉ nhìn tới Layer 4. Với mỗi kết nối TCP mới, nó băm (hash) các thông tin IP nguồn, port nguồn, IP đích, port đích, giao thức để chọn một target, rồi **mọi gói tin của kết nối đó đi tới đúng target ấy** cho tới khi kết nối đóng. Nó không mở request ra đọc, nên không định tuyến theo URL được, nhưng bù lại:

- **Nhận mọi giao thức chạy trên TCP/UDP** (listener TCP, UDP, TLS): game server, MQTT của IoT, database, giao thức tự chế.
- **Xử lý mỗi gói tin rất nhẹ.** AWS khuyến nghị NLB khi cần "extreme performance"; đề thi diễn đạt bằng các cụm "millions of requests per second", "ultra-low latency", "sudden traffic spikes". Coi đó là từ khoá nhận diện NLB, không phải hạn mức cần thuộc.
- **Giữ nguyên IP nguồn của client** tới target, không cần đọc header `X-Forwarded-For` như sau ALB.
- **Có IP tĩnh**, xem ngay dưới.

**Vì sao NLB có static IP còn ALB thì không.** ALB tự thêm bớt node theo tải, mỗi node mới có IP mới, và AWS cập nhật tên DNS của ALB để trỏ vào bộ IP hiện tại (TTL 60 giây). IP của ALB vì thế **thay đổi theo thời gian** và bạn chỉ được dùng tên DNS. NLB thì khác: ở mỗi AZ được bật nó tạo đúng **một network interface với một IP cố định** suốt đời load balancer, và bạn có thể gán **Elastic IP** (IP public tĩnh thuộc tài khoản của bạn) cho từng interface đó. NLB bật 3 AZ sẽ có đúng 3 IP không đổi, đưa được cho đối tác để họ mở firewall.

Nếu cần cả hai, tức định tuyến theo URL **và** IP tĩnh, cách làm chuẩn là đặt NLB phía trước với ALB làm target, hoặc dùng AWS Global Accelerator (cấp 2 IP tĩnh toàn cầu) trước ALB.

### 6.3 GWLB (Gateway Load Balancer) — đưa traffic qua thiết bị bảo mật

**Appliance** (virtual appliance) ở đây là một phần mềm mạng hoặc bảo mật của hãng thứ ba chạy trên EC2: firewall, hệ thống phát hiện và ngăn xâm nhập (IDS/IPS), máy soi gói tin. Bài toán: bạn muốn **mọi gói tin** ra vào VPC đều phải đi qua một dàn appliance như vậy để kiểm tra, mà dàn đó phải scale được và không thành SPOF.

GWLB giải bài này ở Layer 3. Bạn sửa route table để traffic đi qua một **GWLB endpoint**; GWLB nhận nguyên gói IP, chọn một appliance trong target group và gửi gói tin tới đó. Appliance kiểm tra xong thì trả lại để gói tin đi tiếp tới đích. Mọi gói của cùng một luồng luôn về cùng một appliance, điều mà firewall có theo dõi trạng thái kết nối cần.

Để gói tin tới appliance mà **không bị sửa địa chỉ nguồn và đích**, GWLB bọc nguyên gói gốc vào trong một gói khác. Kiểu bọc đó là giao thức **GENEVE**, chạy trên port 6081. Appliance mở lớp bọc ra là thấy đúng gói tin ban đầu. Thấy "GENEVE" hay "port 6081" trong đề là nghĩ tới GWLB.

GWLB không phải để cân tải ứng dụng của bạn: client không kết nối vào nó, và ứng dụng không biết nó tồn tại.

### 6.4 Bảng so sánh và cách chọn

| Tiêu chí | **ALB** | **NLB** | **GWLB** |
|---|---|---|---|
| Layer | 7 (HTTP/HTTPS/gRPC) | 4 (TCP/UDP/TLS) | 3 (IP, bọc bằng GENEVE) |
| Định tuyến theo | Path, host, header, query | IP + port (băm theo kết nối) | Toàn bộ packet tới appliance |
| Hiệu năng | Mỗi request phải được đọc và phân tích HTTP | Chỉ chuyển tiếp kết nối nên nhẹ hơn ALB; từ khoá đề: "millions of requests/sec", "ultra-low latency" | Không dùng để cân tải ứng dụng; scale dàn security appliance |
| Static IP | Không (dùng DNS, IP thay đổi) | **Có (1 IP tĩnh mỗi AZ, gán được Elastic IP)** | — |
| IP client tới target | Qua header `X-Forwarded-For` | Giữ nguyên IP nguồn | Giữ nguyên gói tin gốc |
| Use case | Web app, microservices, container | Gaming, IoT, traffic non-HTTP, tải tăng vọt, cần static IP | Firewall/IDS/IPS của bên thứ ba |
| WebSocket/gRPC | Có | TCP passthrough (chuyển nguyên, không hiểu nội dung) | — |
| Cross-zone mặc định | Luôn bật | Tắt | Tắt |

Cách chọn nhanh:
- Cần **routing theo HTTP path/host**, host nhiều microservice sau 1 LB → **ALB**.
- Cần **static IP**, **độ trễ siêu thấp**, **traffic non-HTTP (TCP/UDP)**, hàng triệu request/giây → **NLB**.
- Cần đưa traffic qua **virtual appliance bảo mật** (firewall) → **GWLB**.

> ⚠️ Bẫy: "Cần whitelist một địa chỉ IP cố định cho LB" → **NLB** (có Elastic IP). ALB chỉ có DNS name thay đổi, không có static IP — đây là đáp án bẫy hay gặp.

> 💡 Mẹo thi: ALB chỉ hỗ trợ HTTP/HTTPS. Nếu đề nói "TCP", "UDP", "MQTT", "không phải HTTP" → loại ALB ngay, nghĩ NLB.

## 7. Multi-AZ vs Multi-Region (bẫy lớn nhất của bài)

Đây là chỗ thí sinh hay sai nhất. Phải phân biệt **phạm vi** và **chi phí/độ phức tạp**.

| | **Multi-AZ** | **Multi-Region** |
|---|---|---|
| Bảo vệ chống | Lỗi 1 AZ (datacenter) | Lỗi cả region, thảm họa diện rộng |
| Độ trễ replication | Rất thấp (cùng region) | Cao hơn (đường truyền liên vùng) |
| Mục tiêu chính | **High Availability** | **Disaster Recovery**, global latency |
| Chi phí/độ phức tạp | Vừa phải | Cao |
| Ví dụ service | RDS Multi-AZ, ASG đa AZ | Aurora Global DB, S3 CRR, Route 53 failover |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Phạm vi bảo vệ: Multi-AZ (chống lỗi 1 AZ) vs Multi-Region (chống lỗi cả region)</title>
  <desc>Bên trái: Multi-AZ nằm trong một Region, gồm nhiều AZ — chịu được lỗi của một AZ, nhưng nếu cả Region chết thì sập. Bên phải: Multi-Region trải qua hai Region — chịu được lỗi của toàn bộ một Region.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Phạm vi bảo vệ khác nhau</text>
  <g>
    <text x="30" y="56" font-size="12.5" font-weight="700" fill="currentColor">Multi-AZ — phạm vi 1 Region</text>
    <rect x="14" y="66" width="338" height="180" rx="11" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="30" y="86" font-size="11" font-weight="700" fill="currentColor" opacity="0.75">Region (vd us-east-1)</text>
    <rect x="32" y="98" width="142" height="130" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="103" y="118" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">AZ A</text>
    <rect x="48" y="130" width="110" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="103" y="152" font-size="10" text-anchor="middle" fill="currentColor">app + DB</text>
    <rect x="192" y="98" width="142" height="130" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="263" y="118" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">AZ B</text>
    <rect x="208" y="130" width="110" height="34" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="263" y="152" font-size="10" text-anchor="middle" fill="currentColor">standby</text>
    <text x="183" y="244" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">✔ AZ A chết → AZ B gánh</text>
  </g>
  <rect x="14" y="262" width="338" height="56" rx="9" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="183" y="285" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">✘ Cả Region chết → toàn bộ sập</text>
  <text x="183" y="303" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">Multi-AZ không bảo vệ được cấp Region</text>
  <g>
    <text x="384" y="56" font-size="12.5" font-weight="700" fill="currentColor">Multi-Region — phạm vi nhiều Region</text>
    <rect x="368" y="66" width="160" height="180" rx="11" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="384" y="86" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.75">Region 1</text>
    <rect x="384" y="96" width="128" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="448" y="120" font-size="10" text-anchor="middle" fill="currentColor">AZ A · AZ B</text>
    <text x="448" y="138" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">app + DB (primary)</text>
    <text x="448" y="174" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">site chính</text>
    <rect x="546" y="66" width="160" height="180" rx="11" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="562" y="86" font-size="10.5" font-weight="700" fill="currentColor" opacity="0.75">Region 2</text>
    <rect x="562" y="96" width="128" height="60" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="626" y="120" font-size="10" text-anchor="middle" fill="currentColor">AZ A · AZ B</text>
    <text x="626" y="138" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">app + DB (DR)</text>
    <text x="626" y="174" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">site dự phòng</text>
    <g stroke="currentColor" stroke-opacity="0.55" fill="none">
      <path d="M512 126 H544" marker-end="url(#mrArr)"/>
    </g>
    <text x="528" y="118" font-size="8.5" text-anchor="middle" fill="#f59e0b" opacity="0.95" font-weight="700">replicate</text>
    <text x="537" y="218" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">Route 53 failover giữa region</text>
  </g>
  <rect x="368" y="262" width="338" height="56" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="537" y="285" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">✔ Cả Region 1 chết → Region 2 gánh</text>
  <text x="537" y="303" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">Chống thảm họa diện rộng — đắt &amp; phức tạp hơn</text>
  <defs>
    <marker id="mrArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

> ⚠️ Bẫy: Nếu đề chỉ yêu cầu "chịu được lỗi của một datacenter / một AZ" → **Multi-AZ là đủ**, đừng chọn Multi-Region (thừa, đắt, sai). Multi-Region chỉ khi đề nói rõ "survive an entire region outage", "global users", hoặc "regulatory DR requirement".

## 8. RTO & RPO (gắn với DR strategies)

- **RTO (Recovery Time Objective)**: thời gian tối đa chấp nhận được để **khôi phục dịch vụ** sau sự cố. RTO thấp = phục hồi nhanh.
- **RPO (Recovery Point Objective)**: lượng **dữ liệu** tối đa chấp nhận mất, đo bằng thời gian. RPO thấp = mất ít dữ liệu (cần replicate thường xuyên/liên tục).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 230" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>RTO vs RPO trên trục thời gian</title>
  <desc>Trục thời gian đi từ trái sang phải. Mốc 1: backup tốt cuối cùng. Mốc 2: sự cố (crash). Mốc 3: dịch vụ phục hồi. Khoảng từ backup tới sự cố là RPO — lượng dữ liệu bị mất. Khoảng từ sự cố tới phục hồi là RTO — thời gian downtime.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">RTO vs RPO trên trục thời gian</text>
  <line x1="40" y1="120" x2="700" y2="120" stroke="currentColor" stroke-opacity="0.5" stroke-width="2"/>
  <defs>
    <marker id="tlArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>
  <line x1="690" y1="120" x2="704" y2="120" stroke="currentColor" stroke-opacity="0.55" stroke-width="2" marker-end="url(#tlArr)"/>
  <text x="700" y="140" font-size="10" text-anchor="end" fill="currentColor" opacity="0.6">thời gian →</text>
  <g>
    <circle cx="150" cy="120" r="7" fill="#10b981" fill-opacity="0.9"/>
    <line x1="150" y1="120" x2="150" y2="92" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="150" y="84" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Backup tốt cuối</text>
    <text x="150" y="68" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">last good backup</text>
  </g>
  <g>
    <circle cx="370" cy="120" r="7" fill="#ef4444" fill-opacity="0.85"/>
    <line x1="370" y1="120" x2="370" y2="92" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="370" y="84" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">SỰ CỐ</text>
    <text x="370" y="68" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">crash</text>
  </g>
  <g>
    <circle cx="620" cy="120" r="7" fill="#3b82f6" fill-opacity="0.9"/>
    <line x1="620" y1="120" x2="620" y2="92" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="620" y="84" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Dịch vụ phục hồi</text>
    <text x="620" y="68" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">service restored</text>
  </g>
  <g>
    <rect x="150" y="150" width="220" height="30" rx="7" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="260" y="170" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">RPO — dữ liệu bị mất</text>
    <text x="260" y="200" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">replicate càng dày → RPO càng nhỏ</text>
  </g>
  <g>
    <rect x="370" y="150" width="250" height="30" rx="7" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="495" y="170" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">RTO — thời gian downtime</text>
    <text x="495" y="200" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">phục hồi càng nhanh → RTO càng nhỏ</text>
  </g>
</svg>

Bốn chiến lược DR (RTO/RPO giảm dần, chi phí tăng dần):

| Strategy | RTO/RPO | Mô tả | Chi phí |
|---|---|---|---|
| **Backup & Restore** | Cao (giờ) | Backup ra S3, khi cần thì restore | Thấp nhất |
| **Pilot Light** | Trung bình (chục phút) | Core tối thiểu luôn chạy (vd: DB replicate), app scale lên khi cần | Thấp |
| **Warm Standby** | Thấp (phút) | Bản thu nhỏ của toàn hệ thống luôn chạy, scale lên khi failover | Trung bình |
| **Multi-Site / Active-Active** | Gần 0 | Hai site chạy full song song | Cao nhất |

> 💡 Mẹo thi:
> - Đề nhấn "minimize cost, có thể chấp nhận downtime vài giờ" → **Backup & Restore**.
> - Đề nhấn "RTO/RPO thấp, chi phí hợp lý, DB đã replicate sẵn" → **Pilot Light** hoặc **Warm Standby**.
> - Đề nhấn "near-zero RTO/RPO, không downtime" → **Multi-Site Active-Active** (vd Aurora Global DB + Route 53).

> ⚠️ Bẫy: RTO ≠ RPO. RTO nói về **thời gian phục hồi (downtime)**; RPO nói về **dữ liệu bị mất**. Đề hỏi "tối đa được mất 5 phút dữ liệu" → đó là **RPO = 5 phút** (cần replication, không phải backup hằng đêm).

## 9. Deployment strategies an toàn cho resilience

Resilience không chỉ là chịu lỗi hạ tầng — **lúc release code mới cũng là lúc dễ gây downtime nhất**. Chọn đúng chiến lược deploy giúp giảm rủi ro và rút ngắn thời gian rollback. Đề SAA hay hỏi "làm sao release mà không gián đoạn / có thể rollback nhanh / test trên tập nhỏ user trước".

Bốn chiến lược dưới đây khác nhau ở hai lựa chọn: **sửa máy đang chạy hay dựng máy mới**, và **chuyển traffic một lần hay từng phần**. Lấy một fleet 10 instance đang chạy version 1 làm ví dụ:

```
Rolling (batch 2 máy):  rút 2 máy ra cập nhật → còn 8 máy phục vụ (80% capacity), lặp 5 lượt
                        giữa chừng: vài máy v2 + vài máy v1 cùng nhận traffic
Blue-Green:             dựng thêm 10 máy v2 → lúc cao điểm chạy 20 máy (200%) → chuyển 100% traffic sang v2
Immutable:              dựng 10 máy v2 mới cạnh 10 máy v1, máy mới qua health check mới nhận traffic, rồi bỏ máy v1
Canary 10%:             10% traffic vào v2, 90% vẫn ở v1 → metric ổn thì tăng dần lên 100%
```

**Rolling** rẻ nhất vì không cần máy thừa, nhưng trong lúc deploy capacity giảm và hai version chạy lẫn nhau. Nếu version mới hỏng, những máy đã cập nhật phải được cuộn ngược từng batch, nên rollback chậm. Biến thể "rolling with additional batch" dựng thêm một batch máy trước để giữ đủ 100% capacity.

**Blue-Green** giữ nguyên môi trường cũ (blue) và dựng một môi trường mới hoàn chỉnh (green). Chuyển traffic là một thao tác duy nhất ở tầng định tuyến, nên rollback cũng chỉ là thao tác đó theo chiều ngược lại, miễn là blue chưa bị xoá. Cái giá là trả tiền gấp đôi trong lúc hai môi trường cùng tồn tại.

**Immutable** theo nguyên tắc không bao giờ sửa máy đang chạy. Muốn đổi version thì đóng image mới (AMI) rồi launch máy mới từ đó. Máy cũ còn nguyên cho tới khi máy mới được xác nhận khoẻ, nên rollback chỉ là huỷ máy mới. Nó giống Blue-Green ở chỗ dựng mới hoàn toàn; khác ở chỗ thường diễn ra trong cùng một môi trường, cùng load balancer, chứ không phải hai môi trường tách biệt.

**Canary** đưa version mới ra cho một phần nhỏ traffic thật trước. Nếu có lỗi thì chỉ phần nhỏ đó dính, và rollback là kéo tỉ lệ về 0. Đổi lại, cần có metric và alarm đủ tốt để biết version mới ổn hay không.

Các công cụ AWS xuất hiện trong bảng, mỗi cái một câu:

- **ASG Instance Refresh**: tính năng của Auto Scaling Group, tự thay lần lượt các instance bằng instance mới theo Launch Template mới, giữ một tỉ lệ healthy tối thiểu do bạn đặt.
- **CodeDeploy**: dịch vụ tự động hoá deploy lên EC2, ECS và Lambda. Có chế độ in-place (cập nhật trên máy đang chạy) và Blue/Green. Với Lambda và ECS còn có kiểu chuyển traffic `Canary` (chuyển một phần nhỏ, chờ, rồi chuyển hết) và `Linear` (tăng đều từng nấc).
- **Elastic Beanstalk**: nền tảng PaaS, bạn đưa code lên còn nó tự dựng EC2, ASG và load balancer. Deployment policy của nó là một danh sách chọn sẵn: All at once, Rolling, Rolling with additional batch, Immutable, Traffic Splitting (canary). Blue-Green trên Beanstalk làm bằng cách dựng môi trường thứ hai rồi **swap CNAME** giữa hai môi trường.
- **ALB weighted target group**: một listener rule của ALB chuyển tới hai target group theo tỉ lệ, ví dụ 90/10. Đổi tỉ lệ có hiệu lực ngay, không phụ thuộc TTL của DNS như Route 53 Weighted.
- **API Gateway canary**: một stage của API Gateway gửi một tỉ lệ request sang bản deployment mới.

| Strategy | Ý nghĩa | Rủi ro chính | Rollback | Công cụ AWS |
|---|---|---|---|---|
| **Rolling** | Cập nhật lần lượt từng batch instance trong cùng nhóm (in-place) | Trong lúc deploy tồn tại **cả version cũ và mới cùng phục vụ**; nếu bad → đã dính một phần fleet | Chậm (phải rolling ngược lại) | ASG `Instance Refresh`, CodeDeploy in-place, Elastic Beanstalk (Rolling / Rolling with additional batch) |
| **Blue-Green** | Dựng **môi trường mới (green) song song** với môi trường cũ (blue), rồi **chuyển toàn bộ traffic** sang green | Tốn gấp đôi tài nguyên khi chuyển; cần cơ chế switch traffic sạch | **Rất nhanh** (trỏ traffic về blue) | CodeDeploy Blue/Green, ASG + đổi Target Group của ALB, Route 53 đổi bản ghi, Beanstalk swap CNAME |
| **Immutable** | **Không sửa** instance cũ; launch **instance hoàn toàn mới** từ image/template mới, chỉ khi khỏe mạnh mới cắt traffic, rồi bỏ instance cũ | Tốn tài nguyên tạm thời; thời gian dựng lâu hơn in-place | Nhanh (giữ nguyên fleet cũ tới khi xác nhận) | Beanstalk **Immutable**, ASG launch nhóm instance mới từ Launch Template mới (AMI mới) |
| **Canary** | Đẩy version mới cho **một phần nhỏ traffic/user** (vd 5–10%), theo dõi lỗi/metric rồi mới tăng dần tới 100% | Một phần nhỏ user có thể dính lỗi trong giai đoạn thử | Nhanh (kéo % về 0) | **Route 53 Weighted**, ALB weighted target group, CodeDeploy `Canary`/`Linear` (Lambda/ECS), API Gateway canary, Beanstalk **Traffic Splitting** |

> 💡 Phân biệt Immutable vs Rolling: Rolling **sửa tại chỗ** máy đang chạy (có thời điểm lẫn lộn 2 version, khó rollback sạch); Immutable **thay máy mới hoàn toàn** (không đụng máy cũ → rollback = vứt máy mới, an toàn hơn nhưng tốn hơn).

> 💡 Phân biệt Blue-Green vs Canary: Blue-Green chuyển **toàn bộ** traffic một lần (cutover) — nhanh, rollback tức thì, nhưng lỗi ảnh hưởng 100% user ngay khi switch. Canary chuyển **dần theo %** — giới hạn "bán kính vụ nổ" (blast radius) khi có lỗi, nhưng release lâu hơn.

> ⚠️ Bẫy thi: Đề mô tả *"muốn test version mới trên một tỉ lệ nhỏ traffic thật trước khi rollout toàn bộ"* → **Canary** (thường qua **Route 53 Weighted** hoặc CodeDeploy Canary), KHÔNG phải Blue-Green (Blue-Green là all-or-nothing). Đề mô tả *"cần rollback tức thì về môi trường cũ nếu deploy hỏng"* → **Blue-Green**.

> ⚠️ Bẫy thi: "Zero-downtime deploy + rollback nhanh nhất, chấp nhận tốn thêm tài nguyên tạm thời" → **Blue-Green** hoặc **Immutable**. Nếu đề chốt "**không chỉnh sửa instance đang chạy**, luôn thay bằng máy mới" → **Immutable**. Rolling KHÔNG đảm bảo rollback nhanh vì phải cuộn ngược từng batch.

## 10. Tổng kết quyết định nhanh (cheat sheet)

- "HA cho RDS" → **Multi-AZ**. "Scale đọc" → **Read Replica**. Cần cả hai → dùng cả hai.
- "Failover cực nhanh + global + RPO~0" → **Aurora Global Database**.
- "User mất session khi instance chết" → externalize ra **ElastiCache/DynamoDB**, KHÔNG phải sticky session.
- "Cần static IP cho LB" → **NLB**. "Routing theo URL path" → **ALB**. "Chèn firewall appliance" → **GWLB**.
- "Active-passive DR" → Route 53 **Failover**. "Compliance theo quốc gia" → **Geolocation**. "Nhanh nhất cho user" → **Latency**. "% traffic" → **Weighted**.
- "Chịu lỗi 1 AZ" → **Multi-AZ là đủ**. "Chịu lỗi cả region" → **Multi-Region**.
- "Mất tối đa X phút dữ liệu" = **RPO**. "Phục hồi trong tối đa X phút" = **RTO**.
- Loại bỏ SPOF: ASG đa AZ, NAT Gateway mỗi AZ, RDS Multi-AZ, dữ liệu trên S3/EFS thay vì đĩa local.
- Release: "test trên % nhỏ traffic" → **Canary (Route 53 Weighted)**. "Rollback tức thì về môi trường cũ" → **Blue-Green**. "Không sửa máy đang chạy, thay máy mới" → **Immutable**. "Cập nhật lần lượt in-place" → **Rolling**.

> 💡 Nguyên tắc vàng cho phần resilience: **Design for failure** — luôn giả định mọi component sẽ chết, và thiết kế để hệ thống vẫn sống. Khi phân vân giữa hai đáp án, chọn đáp án **loại bỏ SPOF** mà **không over-engineer** (đừng chọn Multi-Region khi đề chỉ cần Multi-AZ).
