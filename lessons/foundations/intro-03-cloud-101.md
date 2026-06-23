# Cloud Computing 101 — Đám mây thực ra là gì?

Trước khi học bất kỳ chứng chỉ AWS nào, bạn cần trả lời được một câu hỏi tưởng dễ mà nhiều người làm nghề lâu năm vẫn lúng túng: **"Cloud" rốt cuộc là cái gì, và vì sao cả thế giới chuyển sang nó?** Bài này xây nền tảng đó từ con số 0 — không luyện đề, không học vẹt, chỉ hiểu bản chất.

## 1. Trước khi có cloud: thời kỳ "ôm server vật lý"

Hãy tưởng tượng năm 2005, bạn muốn mở một trang web bán hàng. Quy trình sẽ như sau:

1. **Mua server vật lý** — vài chục đến vài trăm triệu đồng, trả trước toàn bộ.
2. **Thuê chỗ đặt** — phòng máy lạnh, điện dự phòng, đường truyền (gọi là colocation), hoặc tự dựng phòng server.
3. **Chờ 2–6 tuần** để hàng về, lắp ráp, cài hệ điều hành, cấu hình mạng.
4. **Đoán trước nhu cầu**: mua dư thì lãng phí, mua thiếu thì sập web đúng lúc đông khách.

```
   THỜI XƯA (on-premises)
   ┌──────────────────────────────┐
   │  Bạn lo TẤT CẢ:              │
   │  điện, lạnh, mạng, phần cứng,│
   │  OS, bảo mật, ứng dụng...    │
   │        🏢 phòng server       │
   └──────────────────────────────┘
   Vốn lớn trả trước + chờ hàng tuần
```

Vấn đề cốt lõi: **tài nguyên tính toán bị mua theo kiểu "tài sản"** — như mua nguyên một chiếc xe tải chỉ để chở hàng vài ngày Tết.

### Cloud ra đời từ nhu cầu gì?

Các công ty khổng lồ (Amazon là điển hình) xây hạ tầng cực lớn để phục vụ mùa cao điểm (Black Friday), nhưng phần lớn thời gian trong năm máy móc... ngồi chơi. Họ nảy ra ý tưởng: **cho người khác thuê phần dư đó, tính tiền theo giờ**. Năm 2006, Amazon Web Services ra mắt — và mô hình "thuê tài nguyên qua Internet, trả theo mức dùng" trở thành **cloud computing**.

> 💡 Ghi nhớ: Cloud computing = **thuê tài nguyên tính toán (máy chủ, lưu trữ, mạng, phần mềm) qua Internet, theo nhu cầu (on-demand), trả tiền theo mức sử dụng (pay-as-you-go)** — thay vì mua và tự vận hành phần cứng.

### Từ "bấm nút tạo server" đến Infrastructure as Code

Cloud không chỉ là "server của người khác". Điểm cách mạng là **mọi thứ được điều khiển bằng API**: bạn có thể tạo 100 server bằng một dòng lệnh, và hủy chúng sau 1 giờ. Từ đó sinh ra **Infrastructure as Code (IaC)** — viết hạ tầng thành file mã nguồn (khai báo "tôi cần 3 server, 1 database, 1 load balancer"), chạy là có, xóa là sạch, lưu được vào Git như code thường.

```
  Tiến hóa:
  Mua server (tuần) → Thuê VPS (ngày) → Cloud API (phút) → IaC (tự động, lặp lại được)
```

## 2. IaaS vs PaaS vs SaaS — analogy "ăn pizza"

Đây là cách phân loại cloud theo **mức độ bạn tự lo vs nhà cung cấp lo**. Analogy kinh điển: bạn muốn ăn pizza, có 4 cách.

| Cách ăn pizza | Bạn làm gì | Tương ứng |
|---|---|---|
| **Tự làm ở nhà** | Tự mua bột, lò, nướng, dọn bàn | **On-premises** — tự lo hết |
| **Mua đế pizza đông lạnh** | Có sẵn đế; bạn thêm topping, nướng, dọn bàn | **IaaS** — thuê máy ảo, bạn cài và quản lý phần mềm |
| **Gọi ship pizza về nhà** | Pizza làm sẵn; bạn chỉ lo bàn ăn, nước uống | **PaaS** — chỉ đưa code, nền tảng lo server/OS/scaling |
| **Ra nhà hàng ăn** | Ngồi xuống và ăn, không lo gì cả | **SaaS** — dùng phần mềm hoàn chỉnh (Gmail, Google Docs) |

Nhìn theo "tầng trách nhiệm":

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ma trận tầng trách nhiệm: On-prem vs IaaS vs PaaS vs SaaS</title>
  <desc>Bảy tầng từ trên xuống — Ứng dụng, Data, Runtime, OS, Máy ảo, Phần cứng, Tòa nhà — qua bốn mô hình On-prem, IaaS, PaaS, SaaS. Ô xanh là Bạn tự lo, ô lục là nhà cung cấp lo. Càng sang phải, nhà cung cấp lo càng nhiều.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Ai lo tầng nào? — bạn lo ít dần khi đi sang phải</text>
  <g font-size="12.5" font-weight="700" fill="currentColor" text-anchor="middle">
    <text x="300" y="58">On-prem</text>
    <text x="408" y="58">IaaS</text>
    <text x="516" y="58">PaaS</text>
    <text x="624" y="58">SaaS</text>
  </g>
  <g font-size="12" fill="currentColor" text-anchor="end">
    <text x="184" y="92">Ứng dụng</text>
    <text x="184" y="136">Data</text>
    <text x="184" y="180">Runtime</text>
    <text x="184" y="224">OS</text>
    <text x="184" y="268">Máy ảo</text>
    <text x="184" y="312">Phần cứng</text>
    <text x="184" y="356">Tòa nhà</text>
  </g>
  <g font-size="11.5" font-weight="700" text-anchor="middle">
    <!-- Hàng Ứng dụng -->
    <rect x="200" y="74" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="250" y="95" fill="currentColor">Bạn</text>
    <rect x="308" y="74" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="358" y="95" fill="currentColor">Bạn</text>
    <rect x="416" y="74" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="466" y="95" fill="currentColor">Bạn</text>
    <rect x="524" y="74" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="574" y="95" fill="currentColor">NCC</text>
    <!-- Hàng Data -->
    <rect x="200" y="118" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="250" y="139" fill="currentColor">Bạn</text>
    <rect x="308" y="118" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="358" y="139" fill="currentColor">Bạn</text>
    <rect x="416" y="118" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="466" y="139" fill="currentColor">Bạn</text>
    <rect x="524" y="118" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="574" y="139" fill="currentColor">NCC*</text>
    <!-- Hàng Runtime -->
    <rect x="200" y="162" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="250" y="183" fill="currentColor">Bạn</text>
    <rect x="308" y="162" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="358" y="183" fill="currentColor">Bạn</text>
    <rect x="416" y="162" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="466" y="183" fill="currentColor">NCC</text>
    <rect x="524" y="162" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="574" y="183" fill="currentColor">NCC</text>
    <!-- Hàng OS -->
    <rect x="200" y="206" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="250" y="227" fill="currentColor">Bạn</text>
    <rect x="308" y="206" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="358" y="227" fill="currentColor">Bạn</text>
    <rect x="416" y="206" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="466" y="227" fill="currentColor">NCC</text>
    <rect x="524" y="206" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="574" y="227" fill="currentColor">NCC</text>
    <!-- Hàng Máy ảo -->
    <rect x="200" y="250" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="250" y="271" fill="currentColor">Bạn</text>
    <rect x="308" y="250" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="358" y="271" fill="currentColor">NCC</text>
    <rect x="416" y="250" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="466" y="271" fill="currentColor">NCC</text>
    <rect x="524" y="250" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="574" y="271" fill="currentColor">NCC</text>
    <!-- Hàng Phần cứng -->
    <rect x="200" y="294" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="250" y="315" fill="currentColor">Bạn</text>
    <rect x="308" y="294" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="358" y="315" fill="currentColor">NCC</text>
    <rect x="416" y="294" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="466" y="315" fill="currentColor">NCC</text>
    <rect x="524" y="294" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="574" y="315" fill="currentColor">NCC</text>
    <!-- Hàng Tòa nhà -->
    <rect x="200" y="338" width="100" height="32" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/><text x="250" y="359" fill="currentColor">Bạn</text>
    <rect x="308" y="338" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="358" y="359" fill="currentColor">NCC</text>
    <rect x="416" y="338" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="466" y="359" fill="currentColor">NCC</text>
    <rect x="524" y="338" width="100" height="32" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/><text x="574" y="359" fill="currentColor">NCC</text>
  </g>
  <g font-size="11" fill="currentColor">
    <rect x="200" y="392" width="16" height="16" rx="4" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="224" y="404" opacity="0.85">Bạn tự lo</text>
    <rect x="308" y="392" width="16" height="16" rx="4" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.18"/>
    <text x="332" y="404" opacity="0.85">NCC = nhà cung cấp cloud lo</text>
  </g>
  <text x="16" y="428" font-size="10.5" fill="currentColor" opacity="0.6">*Data trong SaaS vẫn là của bạn, nhưng NCC vận hành nơi lưu trữ.</text>
</svg>

- **IaaS (Infrastructure as a Service)**: thuê máy ảo, ổ đĩa, mạng "thô". Linh hoạt nhất, nhưng bạn phải tự vá OS, tự cấu hình. Ví dụ: thuê một máy ảo Linux.
- **PaaS (Platform as a Service)**: bạn chỉ đưa code, nền tảng tự lo deploy, scale, vá lỗi hệ thống. Nhanh, đỡ việc, nhưng ít quyền kiểm soát hơn.
- **SaaS (Software as a Service)**: dùng luôn phần mềm qua trình duyệt. Gmail, Slack, Zoom, Salesforce.

> 💡 Ghi nhớ: Đi từ IaaS → PaaS → SaaS, **bạn lo ít hơn, nhà cung cấp lo nhiều hơn, nhưng quyền tùy biến cũng giảm dần**. Không có mức "tốt nhất" — chỉ có mức phù hợp với bài toán.

## 3. Public, Private, Hybrid cloud

Phân loại theo **ai sở hữu hạ tầng và ai được dùng**:

| Mô hình | Là gì | Ví dụ đời thường |
|---|---|---|
| **Public cloud** | Hạ tầng của nhà cung cấp (AWS, Azure, GCP), nhiều khách hàng dùng chung, truy cập qua Internet | Đi xe buýt — rẻ, tiện, dùng chung với người khác |
| **Private cloud** | Hạ tầng riêng cho một tổ chức (tự xây hoặc thuê riêng) | Xe riêng — toàn quyền kiểm soát, đắt hơn |
| **Hybrid cloud** | Kết hợp cả hai, có kết nối giữa chúng | Có xe riêng nhưng vẫn đi máy bay khi cần đi xa |

Hybrid rất phổ biến trong thực tế: ngân hàng giữ dữ liệu nhạy cảm trong data center riêng (vì quy định pháp lý), nhưng chạy website và phân tích dữ liệu trên public cloud để tận dụng độ co giãn.

## 4. Region và Availability Zone — cloud "ở đâu"?

Cloud không phải đám mây lơ lửng — nó là **các data center vật lý đặt khắp thế giới**. Hai khái niệm cần nắm ở mức ý tưởng:

- **Region**: một khu vực địa lý (ví dụ Singapore, Tokyo, Frankfurt). Mỗi region độc lập với nhau.
- **Availability Zone (AZ)**: bên trong mỗi region có nhiều "cụm data center" tách biệt — khác tòa nhà, khác nguồn điện, khác đường mạng — nhưng nối với nhau bằng cáp tốc độ cao.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Một Region chứa nhiều Availability Zone độc lập</title>
  <desc>Region Singapore bao gồm ba Availability Zone (AZ-1, AZ-2, AZ-3), mỗi AZ là một cụm data center độc lập, khác tòa nhà, khác nguồn điện. Ba AZ nối với nhau bằng cáp riêng độ trễ cực thấp. Nếu một AZ gặp sự cố, ứng dụng trải trên các AZ còn lại vẫn sống — đó là nền tảng của high availability.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Region chứa nhiều AZ — vì sao Multi-AZ chống sự cố</text>
  <!-- Khung Region -->
  <rect x="16" y="40" width="688" height="216" rx="12" fill="#3b82f6" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="36" y="64" font-size="13" font-weight="700" fill="currentColor">Region "Singapore" — một khu vực địa lý</text>
  <!-- AZ-1 -->
  <g>
    <rect x="48" y="86" width="180" height="146" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="138" y="108" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">AZ-1</text>
    <rect x="72" y="124" width="60" height="44" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="144" y="124" width="60" height="44" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="138" y="194" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">cụm data center</text>
    <text x="138" y="210" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">điện + mạng riêng</text>
  </g>
  <!-- AZ-2 -->
  <g>
    <rect x="270" y="86" width="180" height="146" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="360" y="108" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">AZ-2</text>
    <rect x="294" y="124" width="60" height="44" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="366" y="124" width="60" height="44" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="360" y="194" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">cụm data center</text>
    <text x="360" y="210" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">điện + mạng riêng</text>
  </g>
  <!-- AZ-3 -->
  <g>
    <rect x="492" y="86" width="180" height="146" rx="9" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="582" y="108" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">AZ-3</text>
    <rect x="516" y="124" width="60" height="44" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="588" y="124" width="60" height="44" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="582" y="194" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">cụm data center</text>
    <text x="582" y="210" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">điện + mạng riêng</text>
  </g>
  <!-- Cáp nối giữa các AZ -->
  <g stroke="#f59e0b" stroke-width="3" stroke-opacity="0.8" fill="none">
    <line x1="228" y1="155" x2="270" y2="155"/>
    <line x1="450" y1="155" x2="492" y2="155"/>
  </g>
  <text x="360" y="250" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">cáp riêng, độ trễ cực thấp — các AZ đồng bộ dữ liệu cho nhau</text>
  <!-- Internet bên ngoài -->
  <line x1="360" y1="256" x2="360" y2="300" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/>
  <rect x="288" y="300" width="144" height="36" rx="18" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="323" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Internet</text>
</svg>

Vì sao thiết kế như vậy? **Để chống sự cố.** Nếu một tòa nhà mất điện hay cháy, ứng dụng đặt ở 2 AZ trở lên vẫn sống. Đây là nền tảng của khái niệm **high availability** (tính sẵn sàng cao) mà bạn sẽ gặp suốt hành trình học cloud.

Chọn region thường dựa trên: (1) gần người dùng để giảm độ trễ, (2) quy định pháp lý về nơi lưu dữ liệu, (3) giá cả và dịch vụ có sẵn.

> 💡 Ghi nhớ: **Region = khu vực địa lý; AZ = các cụm data center độc lập bên trong region.** Muốn ứng dụng chịu lỗi tốt, hãy trải nó trên **nhiều AZ**.

## 5. Scalability vs Elasticity — hai từ hay bị nhầm

Cả hai đều nói về "đáp ứng tải", nhưng khác nhau ở **chiều và tính tự động**:

- **Scalability (khả năng mở rộng)**: khả năng hệ thống **tăng năng lực** khi nhu cầu tăng — có thể là kế hoạch dài hạn, làm thủ công cũng được.
  - *Scale up (vertical)*: nâng cấp máy hiện tại to hơn (thêm CPU/RAM) — như đổi xe máy lên ô tô.
  - *Scale out (horizontal)*: thêm nhiều máy chạy song song — như thuê thêm nhiều xe máy giao hàng.
- **Elasticity (tính co giãn)**: khả năng **tự động tăng VÀ giảm** theo tải thực tế, gần như theo thời gian thực. Cao điểm thì phình ra, vắng khách thì co lại — và bạn chỉ trả tiền phần đang dùng.

```
 Tải ───►  ▁▂▅█▅▂▁▂▅█▅▂▁
 Elastic:  ▁▂▅█▅▂▁▂▅█▅▂▁   (tài nguyên bám sát tải)
 On-prem:  ████████████████ (mua cố định cho đỉnh tải → lãng phí lúc thấp điểm)
```

Analogy: scalability là **nhà hàng có thể xây thêm tầng**; elasticity là **nhà hàng buffet tự động kê thêm bàn giờ cao điểm và cất bớt bàn lúc vắng**.

> 💡 Ghi nhớ: Scalability = *có thể* lớn lên. Elasticity = *tự động* co giãn hai chiều theo nhu cầu. Elasticity là lý do kinh tế lớn nhất khiến cloud thắng on-premises.

## 6. Pay-as-you-go và cuộc cách mạng CapEx → OpEx

Hai thuật ngữ tài chính bạn sẽ gặp trong mọi tài liệu cloud:

| | CapEx (Capital Expenditure) | OpEx (Operational Expenditure) |
|---|---|---|
| Bản chất | Chi vốn đầu tư — mua tài sản trả trước | Chi phí vận hành — trả dần theo sử dụng |
| Ví dụ | Mua server 200 triệu | Hóa đơn cloud 5 triệu/tháng |
| Đời thường | Mua ô tô | Đi Grab |
| Rủi ro | Đoán sai nhu cầu → kẹt vốn, máy thừa/thiếu | Dùng nhiều trả nhiều — nhưng dễ dự báo sai nếu không theo dõi |

Cloud chuyển chi phí hạ tầng từ **CapEx sang OpEx**: không cần vốn lớn ban đầu, startup 2 người cũng có hạ tầng ngang tập đoàn — chỉ trả vài đô la khi còn ít người dùng. Đi kèm là các lợi ích kinh tế khác:

- **Economies of scale**: nhà cung cấp mua phần cứng số lượng khổng lồ → giá rẻ hơn bạn tự mua.
- **Không trả tiền cho công suất nhàn rỗi**: tắt máy là ngừng tính tiền (với hầu hết dịch vụ).
- **Thử nghiệm rẻ**: dựng môi trường test trong 10 phút, xóa sau 1 giờ, tốn vài nghìn đồng.

> 💡 Ghi nhớ: Pay-as-you-go biến hạ tầng từ **tài sản phải mua** thành **dịch vụ tiện ích như điện, nước** — dùng bao nhiêu trả bấy nhiêu.

## 7. Shared Responsibility — ai chịu trách nhiệm bảo mật?

Câu hỏi kinh điển: "Đưa lên cloud thì nhà cung cấp lo bảo mật hết đúng không?" — **Sai.** Trách nhiệm được **chia đôi**:

- **Nhà cung cấp chịu trách nhiệm về security OF the cloud**: tòa nhà, phần cứng, mạng vật lý, phần mềm nền tảng — tức là bản thân "đám mây".
- **Bạn chịu trách nhiệm về security IN the cloud**: dữ liệu của bạn, tài khoản và mật khẩu, cấu hình quyền truy cập, mã hóa, code ứng dụng.

Analogy chung cư: ban quản lý lo kết cấu tòa nhà, bảo vệ, camera hành lang (**of**); nhưng **khóa cửa căn hộ của bạn, đồ đạc bên trong là việc của bạn** (**in**). Phần lớn sự cố lộ dữ liệu trên cloud không phải do nhà cung cấp bị hack, mà do **khách hàng cấu hình sai** (ví dụ để kho dữ liệu ở chế độ public).

Ranh giới trượt theo mô hình dịch vụ: dùng IaaS thì bạn lo nhiều (cả vá OS); dùng SaaS thì bạn chỉ còn lo dữ liệu và tài khoản.

> 💡 Ghi nhớ: Nhà cung cấp bảo vệ **hạ tầng cloud**; bạn bảo vệ **những gì bạn đặt vào cloud**. Lên cloud không có nghĩa là "khoán trắng" bảo mật.

## 8. Multi-tenancy — nhiều khách chung một hạ tầng

Vì sao cloud rẻ? Một phần nhờ **multi-tenancy**: nhiều khách hàng (tenant) **chia sẻ cùng phần cứng vật lý**, nhưng được **cách ly logic** với nhau bằng công nghệ ảo hóa (virtualization).

```
   Máy chủ vật lý (1 cái)
   ┌─────────────────────────────┐
   │ Hypervisor (lớp ảo hóa)     │
   │ ┌───────┐ ┌───────┐ ┌──────┐│
   │ │ VM của│ │ VM của│ │ VM   ││
   │ │ cty A │ │ cty B │ │ cty C││
   │ └───────┘ └───────┘ └──────┘│
   └─────────────────────────────┘
   A, B, C không nhìn thấy nhau dù chung một máy
```

Analogy: tòa chung cư — chung móng, chung thang máy, nhưng mỗi căn hộ có khóa riêng và hàng xóm không vào được nhà bạn. Đối lập với multi-tenancy là **single-tenancy** (thuê nguyên máy vật lý riêng) — đắt hơn, dành cho yêu cầu tuân thủ đặc biệt.

Multi-tenancy + ảo hóa chính là phép màu kỹ thuật cho phép "tạo server trong 1 phút": không ai đi lắp máy mới cho bạn cả — hệ thống chỉ cắt một lát tài nguyên từ phần cứng có sẵn.

## 9. Tổng kết bức tranh

```
  VÌ SAO CLOUD?
  ┌──────────────────────────────────────────────┐
  │ Đoán trước nhu cầu  →  Co giãn theo nhu cầu  │
  │ Vốn lớn trả trước   →  Trả theo mức dùng     │
  │ Chờ hàng tuần       →  Có máy trong 1 phút   │
  │ Tự lo phòng máy     →  Chia trách nhiệm      │
  │ Cấu hình tay        →  Hạ tầng bằng code     │
  └──────────────────────────────────────────────┘
```

Checklist tự kiểm tra — bạn nên giải thích được cho người khác:

1. Cloud khác gì việc thuê một server vật lý ở đâu đó?
2. IaaS/PaaS/SaaS khác nhau ở tầng trách nhiệm nào? (Dùng analogy pizza.)
3. Vì sao đặt ứng dụng trên nhiều AZ giúp chống sự cố?
4. Elasticity khác scalability ở điểm nào?
5. Nếu dữ liệu trên cloud bị lộ do cấu hình quyền sai, lỗi thuộc về ai?

## Liên hệ sang AWS

Khi bạn bước vào học CLF/SAA/DVA, các khái niệm trên ánh xạ trực tiếp như sau:

| Khái niệm trong bài | Trên AWS |
|---|---|
| Region / Availability Zone | AWS có ~30+ Regions, mỗi Region thường có 3+ AZ (ví dụ `ap-southeast-1` là Singapore với các AZ `1a`, `1b`, `1c`) |
| IaaS — thuê máy ảo | **Amazon EC2** (Elastic Compute Cloud): bạn chọn OS, tự cài và quản lý mọi thứ trên máy ảo |
| PaaS — chỉ đưa code | **AWS Elastic Beanstalk**: upload code, AWS tự lo server, scaling, load balancer |
| "Không quản lý server nào cả" (serverless) | **AWS Lambda**: chỉ viết hàm, chạy khi có sự kiện, tính tiền theo mili-giây — đỉnh cao của pay-as-you-go |
| Elasticity | **EC2 Auto Scaling**: tự thêm/bớt máy theo tải |
| Pay-as-you-go, CapEx→OpEx | **AWS Billing & Cost Management**: hóa đơn theo giờ/giây, không cam kết trả trước (trừ khi bạn chọn Reserved/Savings Plans để giảm giá) |
| Shared responsibility | **AWS Shared Responsibility Model** — xuất hiện trong MỌI kỳ thi AWS, đúng nguyên văn "security OF the cloud vs security IN the cloud" |
| Multi-tenancy / single-tenancy | EC2 mặc định multi-tenant; **Dedicated Hosts/Instances** khi cần máy vật lý riêng |
| Infrastructure as Code | **AWS CloudFormation** (và AWS CDK) |

> 💡 Ghi nhớ: Bộ ba **EC2 (IaaS) → Beanstalk (PaaS) → Lambda (serverless)** chính là thang "bạn lo ít dần" của bài này, phiên bản AWS. Nắm chắc bài hôm nay, các dịch vụ AWS sau này sẽ chỉ là "tên riêng" của những ý tưởng bạn đã hiểu.
