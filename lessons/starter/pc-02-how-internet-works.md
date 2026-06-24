# Internet hoạt động thế nào

Chào mừng bạn quay lại với khoá **Máy tính & Internet 101**! Hôm nay chúng ta sẽ giải mã một điều kỳ diệu mà bạn dùng mỗi ngày nhưng có thể chưa bao giờ hiểu: **chuyện gì thực sự xảy ra khi bạn gõ một địa chỉ web và nhấn Enter?**

Đừng lo nếu bạn chưa biết gì về công nghệ. Bài này được viết cho người bắt đầu từ con số 0, với những ví dụ đời thường như gửi thư, gọi điện thoại, và đi ăn nhà hàng.

---

## 1. Internet là gì, nói cho dễ hiểu?

Hãy tưởng tượng Internet như **hệ thống bưu điện khổng lồ toàn cầu**:

- Mỗi máy tính, điện thoại là một **ngôi nhà** có địa chỉ riêng.
- Thông tin (hình ảnh, video, tin nhắn) được chia thành các **bưu kiện nhỏ** gửi qua lại.
- Có hàng triệu "trạm trung chuyển" giúp bưu kiện đi đúng hướng.

Internet **không phải** là một đám mây thần bí. Nó là hàng triệu máy tính nối với nhau bằng dây cáp (kể cả cáp quang chạy dưới đáy đại dương!), sóng Wi-Fi và sóng di động.

> 💡 **Ghi nhớ**: Internet = mạng lưới khổng lồ các máy tính nối với nhau, gửi dữ liệu cho nhau như bưu điện gửi thư.

---

## 2. Client và Server — Khách hàng và Nhà hàng

Trước khi đi tiếp, bạn cần biết 2 từ quan trọng nhất của bài hôm nay:

| Thuật ngữ | Nghĩa | Ví dụ đời thường |
|---|---|---|
| **Client** (máy khách) | Thiết bị **yêu cầu** thông tin — điện thoại, laptop của bạn | **Thực khách** trong nhà hàng: gọi món |
| **Server** (máy chủ) | Máy tính **cung cấp** thông tin — nơi lưu trang web, video | **Nhà bếp**: nhận order, nấu và bưng món ra |

Khi bạn mở Facebook trên điện thoại:
- Điện thoại của bạn là **client** — nó "gọi món": *"Cho tôi xem bảng tin!"*
- Máy chủ của Facebook (những máy tính cực mạnh đặt trong các toà nhà lớn gọi là **data center** — trung tâm dữ liệu) là **server** — nó "nấu" và gửi bảng tin về cho bạn.

> 💡 **Ghi nhớ**: Client hỏi — Server trả lời. Cả Internet vận hành dựa trên màn "hỏi – đáp" này, lặp lại hàng tỷ lần mỗi giây trên toàn thế giới.

---

## 3. Địa chỉ IP — "Số nhà" của mỗi thiết bị

Bưu điện muốn giao thư thì phải có **địa chỉ nhà**. Internet cũng vậy: mỗi thiết bị nối mạng đều có một **địa chỉ IP** (IP address — Internet Protocol address, tạm hiểu là "địa chỉ giao thức Internet").

Địa chỉ IP trông như thế này:

```
142.250.66.78
```

Chỉ là một dãy số, giống số nhà + tên đường + quận + thành phố gộp lại. Máy chủ của Google có IP riêng, điện thoại của bạn cũng có IP riêng.

**Vấn đề**: con người rất tệ trong việc nhớ dãy số. Bạn có muốn gõ `142.250.66.78` mỗi lần lên Google không? Chắc chắn là không. Bạn muốn gõ `google.com`.

Và đó là lý do **DNS** ra đời.

---

## 4. DNS — "Danh bạ điện thoại" của Internet

**DNS** (Domain Name System — hệ thống tên miền) hoạt động y hệt **danh bạ trong điện thoại** của bạn:

| Trong danh bạ điện thoại | Trên Internet (DNS) |
|---|---|
| Bạn nhớ tên: "Mẹ" | Bạn nhớ tên miền: `google.com` |
| Danh bạ tra ra số: `0912 345 678` | DNS tra ra IP: `142.250.66.78` |
| Điện thoại gọi đến số đó | Trình duyệt kết nối đến IP đó |

Bạn không cần nhớ số điện thoại của mẹ — chỉ cần bấm tên "Mẹ", máy tự tra số. Tương tự, bạn không cần nhớ IP của Google — chỉ cần gõ `google.com`, DNS tự tra IP giúp bạn.

### Tên miền (domain) là gì?

**Tên miền** là cái tên dễ nhớ của một trang web: `google.com`, `vnexpress.net`, `wikipedia.org`. Mỗi tên miền là duy nhất trên thế giới — giống như biển số xe, không thể có hai trang trùng tên.

> ⚠️ **Lỗi người mới hay gặp**: Tưởng rằng gõ `google.com` vào ô tìm kiếm của Google và gõ vào **thanh địa chỉ** trình duyệt là một. Thanh địa chỉ (ô dài trên cùng trình duyệt) đưa bạn đi **thẳng** đến trang đó; còn ô tìm kiếm chỉ tìm các trang **nói về** từ khoá đó. Kẻ lừa đảo hay lợi dụng điều này để dụ bạn bấm vào trang giả mạo trong kết quả tìm kiếm!

---

## 5. Đường đi của dữ liệu: Wi-Fi → Router → ISP

Trước khi tin nhắn của bạn "bay" ra Internet, nó phải đi qua vài chặng ngay trong nhà bạn:

### Chặng 1: Wi-Fi — sóng vô tuyến trong nhà

**Wi-Fi** là công nghệ truyền dữ liệu **không dây** trong phạm vi ngắn (vài chục mét). Hãy tưởng tượng nó như... hai người nói chuyện với nhau trong một căn phòng: điện thoại của bạn "nói" với cái router bằng sóng vô tuyến thay vì dây cáp.

**Lưu ý quan trọng**: Wi-Fi **không phải là** Internet! Wi-Fi chỉ là đoạn đường ngắn từ điện thoại đến cái hộp router. Nhà bạn có thể có Wi-Fi đầy vạch nhưng vẫn "không vào được mạng" — vì đứt cáp ở chặng sau.

### Chặng 2: Router — "bưu cục" của gia đình

**Router** (bộ định tuyến) là cái hộp nhỏ có đèn nhấp nháy mà nhà nào cũng có. Nó như **bưu cục địa phương**:

- Gom mọi yêu cầu từ điện thoại, laptop, TV trong nhà.
- Chuyển tiếp chúng ra ngoài Internet.
- Nhận dữ liệu trả về và phân phát đúng thiết bị (gửi video cho TV, gửi tin nhắn cho điện thoại — không nhầm lẫn).

### Chặng 3: ISP — công ty bán Internet cho bạn

**ISP** (Internet Service Provider — nhà cung cấp dịch vụ Internet) là công ty bạn trả tiền hàng tháng để có mạng: ở Việt Nam là VNPT, Viettel, FPT... ISP giống **tổng công ty bưu chính quốc gia**: họ sở hữu các tuyến cáp lớn nối nhà bạn ra thế giới.

Tóm lại đường đi:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 220" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Đường đi của dữ liệu từ điện thoại ra Internet đến server</title>
  <desc>Điện thoại nối với router bằng sóng Wi-Fi, router nối ISP bằng cáp, ISP ra Internet toàn cầu rồi tới server. Mỗi chặng có nhãn loại kết nối.</desc>
  <defs>
    <marker id="netArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <g>
    <rect x="14" y="64" width="104" height="56" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="66" y="88" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Điện thoại</text>
    <text x="66" y="106" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">Client</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M120 92 H188" marker-end="url(#netArr)"/>
  </g>
  <text x="156" y="80" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">sóng Wi-Fi</text>
  <g>
    <rect x="192" y="64" width="104" height="56" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="244" y="88" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Router</text>
    <text x="244" y="106" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">Bưu cục nhà</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M298 92 H366" marker-end="url(#netArr)"/>
  </g>
  <text x="334" y="80" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">cáp</text>
  <g>
    <rect x="370" y="64" width="104" height="56" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="422" y="88" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">ISP</text>
    <text x="422" y="106" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">VNPT, FPT...</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M476 92 H544" marker-end="url(#netArr)"/>
  </g>
  <text x="510" y="80" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">cáp quang</text>
  <g>
    <ellipse cx="600" cy="92" rx="56" ry="34" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="600" y="89" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Internet</text>
    <text x="600" y="105" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">toàn cầu</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <path d="M600 126 V164 H520" marker-end="url(#netArr)"/>
  </g>
  <g>
    <rect x="414" y="150" width="104" height="56" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="466" y="174" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Server</text>
    <text x="466" y="192" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">Data center</text>
  </g>
</svg>

> ⚠️ **Lỗi người mới hay gặp**: Mạng chậm là đổ lỗi ngay cho "Wi-Fi yếu". Thực tế có thể do: (1) đứng quá xa router, (2) ISP đang nghẽn/đứt cáp quang biển, hoặc (3) chính server của trang web bị quá tải. Mẹo kiểm tra: nếu một trang chậm mà các trang khác vẫn nhanh → lỗi ở server trang đó, không phải mạng nhà bạn. Và khi nghi ngờ router "đơ" — tắt đi bật lại 30 giây thật sự có tác dụng!

---

## 6. HTTP — Ngôn ngữ "gọi món" giữa client và server

Khi thực khách gọi món, họ nói theo phép lịch sự chung: "Cho tôi một phở bò". Client và server cũng nói chuyện theo một "phép lịch sự" chung gọi là **HTTP** (HyperText Transfer Protocol — giao thức truyền siêu văn bản). "Giao thức" (protocol) nghĩa là **bộ quy tắc nói chuyện** mà cả hai bên cùng tuân theo.

Cuộc hội thoại HTTP gồm 2 phần:

### Request (yêu cầu) — client "gọi món"

Trình duyệt của bạn gửi đi:

```
GET /trang-chu HTTP/1.1
Host: vnexpress.net
```

Dịch nôm na: *"Chào server vnexpress.net, cho tôi (GET = lấy) trang chủ nhé!"*

### Response (phản hồi) — server "bưng món ra"

Server trả lời:

```
HTTP/1.1 200 OK
(kèm theo toàn bộ nội dung trang web)
```

Dịch nôm na: *"OK đây, món của bạn đây!"* — kèm theo chữ, hình, video của trang web.

### Các "mã trạng thái" thú vị

Server luôn trả lời kèm một con số gọi là **status code** (mã trạng thái):

| Mã | Ý nghĩa | Tương đương ở nhà hàng |
|---|---|---|
| **200** | OK — thành công | "Món của bạn đây ạ!" |
| **404** | Not Found — không tìm thấy | "Món này không có trong thực đơn" |
| **500** | Lỗi server | "Nhà bếp đang cháy, xin lỗi quý khách!" |

Giờ bạn đã hiểu vì sao thỉnh thoảng thấy trang báo **"404 Not Found"** — nghĩa là trang đó đã bị xoá hoặc bạn gõ sai địa chỉ.

> 💡 **Ghi nhớ**: HTTP = một lượt hỏi (request) + một lượt đáp (response). Mỗi trang web bạn xem là kết quả của hàng chục, hàng trăm lượt hỏi–đáp như vậy (mỗi tấm hình, mỗi đoạn chữ là một lượt riêng).

---

## 7. Tổng hợp: Gõ URL rồi nhấn Enter — chuyện gì xảy ra?

**URL** (địa chỉ web, ví dụ `https://vnexpress.net`) là thứ bạn gõ vào thanh địa chỉ. Giờ hãy ghép tất cả kiến thức trên thành một câu chuyện hoàn chỉnh. Bạn gõ `vnexpress.net` và nhấn Enter:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Sơ đồ trình tự: cuộc trao đổi hai chiều khi gõ URL</title>
  <desc>Sơ đồ trình tự ba lifeline Trình duyệt, DNS và Server. Trình duyệt hỏi DNS lấy IP và nhận lại IP; gửi HTTP request sang Server; Server xử lý rồi trả response 200 OK ngược về; cuối cùng Trình duyệt tự vẽ trang. Mũi tên qua lại theo thời gian thể hiện đối thoại khứ hồi giữa client và server.</desc>
  <defs>
    <marker id="urlArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.7"/></marker>
  </defs>
  <text x="360" y="22" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.75">Gõ URL → nhấn Enter (đối thoại hai chiều, đọc từ trên xuống = thời gian)</text>
  <!-- Đầu mỗi lifeline -->
  <g>
    <rect x="40" y="40" width="150" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="115" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Trình duyệt</text>
    <text x="115" y="73" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">(client — máy bạn)</text>
  </g>
  <g>
    <rect x="290" y="40" width="140" height="40" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">DNS</text>
    <text x="360" y="73" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">(danh bạ tên miền)</text>
  </g>
  <g>
    <rect x="530" y="40" width="150" height="40" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="605" y="58" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Server</text>
    <text x="605" y="73" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">(VnExpress)</text>
  </g>
  <!-- Lifelines dọc -->
  <line x1="115" y1="80" x2="115" y2="396" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
  <line x1="360" y1="80" x2="360" y2="396" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
  <line x1="605" y1="80" x2="605" y2="396" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
  <!-- 1: Trình duyệt → DNS -->
  <text x="116" y="106" font-size="11" font-weight="700" fill="currentColor">1</text>
  <text x="237" y="106" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">"vnexpress.net ở IP nào?"</text>
  <line x1="115" y1="114" x2="360" y2="114" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#urlArr)"/>
  <!-- DNS → Trình duyệt (đáp) -->
  <text x="237" y="138" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">"IP = 111.65.250.x"</text>
  <line x1="360" y1="146" x2="115" y2="146" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="5 4" marker-end="url(#urlArr)"/>
  <!-- 2: Trình duyệt → Server: HTTP request -->
  <text x="116" y="178" font-size="11" font-weight="700" fill="currentColor">2</text>
  <text x="360" y="178" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">HTTP request: "cho tôi trang chủ"</text>
  <line x1="115" y1="186" x2="605" y2="186" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#urlArr)"/>
  <!-- 3: ô xử lý (activation) trên lifeline Server -->
  <rect x="595" y="196" width="20" height="56" rx="4" fill="#f59e0b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="606" y="224" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">3</text>
  <text x="582" y="246" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.75">Server "vào bếp" gom nội dung</text>
  <!-- 4: Server → Trình duyệt: response -->
  <text x="360" y="282" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">HTTP response: 200 OK + dữ liệu</text>
  <text x="116" y="282" font-size="11" font-weight="700" fill="currentColor">4</text>
  <line x1="605" y1="290" x2="115" y2="290" stroke="currentColor" stroke-opacity="0.6" stroke-dasharray="5 4" marker-end="url(#urlArr)"/>
  <!-- 5: tự-xử lý trên lifeline Trình duyệt -->
  <rect x="105" y="300" width="20" height="56" rx="4" fill="#3b82f6" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="116" y="328" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">5</text>
  <text x="134" y="332" font-size="10.5" fill="currentColor" opacity="0.75">Trình duyệt "vẽ" trang — ráp dữ liệu thành trang bạn thấy</text>
  <text x="360" y="384" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.55">Nét liền = lượt hỏi (đi ra) · nét đứt = lượt đáp (quay về)</text>
</svg>

### Bước 1 — Tra danh bạ (DNS)
Trình duyệt hỏi DNS: *"vnexpress.net ở địa chỉ IP nào?"* DNS trả lời: *"Ở `111.65.250.x` nhé."* (Mất khoảng vài phần nghìn giây.)

### Bước 2 — Gửi yêu cầu (HTTP Request)
Trình duyệt soạn một "lá thư gọi món": *"Cho tôi trang chủ!"* — gửi qua Wi-Fi → router → ISP → băng qua các tuyến cáp → đến server của VnExpress.

### Bước 3 — Server xử lý
Server nhận thư, "vào bếp" chuẩn bị: lấy tin tức mới nhất, ảnh, tiêu đề... đóng gói thành nội dung trang web.

### Bước 4 — Gửi phản hồi (HTTP Response)
Server gửi ngược lại: *"200 OK, hàng của bạn đây!"* Dữ liệu được **chia thành hàng nghìn gói nhỏ** (như tháo tủ ra từng mảnh để chuyển nhà), mỗi gói có thể đi đường khác nhau, về đến máy bạn thì được ráp lại.

### Bước 5 — Trình duyệt "vẽ" trang web
Trình duyệt (Chrome, Safari...) nhận nguyên liệu và **dựng** thành trang web bạn nhìn thấy: đặt tiêu đề chỗ này, ảnh chỗ kia, tô màu chữ...

**Toàn bộ 5 bước này thường diễn ra trong chưa đầy 1 giây** — kể cả khi server nằm ở bên kia Trái Đất. Dữ liệu di chuyển gần bằng tốc độ ánh sáng qua cáp quang!

> 💡 **Ghi nhớ**: Gõ URL → tra DNS lấy IP → gửi request → server xử lý → nhận response → trình duyệt vẽ trang. Sáu chữ: **Tra – Gửi – Xử – Nhận – Vẽ – Xem**.

---

## 8. Cookie — "Thẻ thành viên" của trang web

Có một vấn đề: server rất... **đãng trí**. Mỗi lượt hỏi–đáp HTTP xong là server quên bạn ngay. Vậy tại sao Facebook vẫn nhớ bạn đã đăng nhập, giỏ hàng Shopee vẫn còn nguyên món bạn chọn hôm qua?

Câu trả lời: **cookie**.

**Cookie** là một **mẩu ghi chú nhỏ** mà trang web nhờ trình duyệt của bạn cất giữ. Hãy tưởng tượng:

> Bạn đến quán cà phê quen. Lần đầu, quán đưa bạn một **thẻ thành viên** ghi: *"Khách số 1247, thích cà phê sữa ít đường"*. Bạn cất thẻ vào ví. Lần sau quay lại, bạn chìa thẻ ra — nhân viên nhìn thẻ là biết ngay bạn là ai và bạn thích gì, không cần hỏi lại.

Cookie hoạt động y hệt:
1. Lần đầu bạn đăng nhập Facebook, server đưa trình duyệt một cookie: *"Đây là người dùng số 1247, đã đăng nhập"*.
2. Trình duyệt cất cookie đó.
3. Mọi lần sau bạn mở Facebook, trình duyệt **tự động chìa cookie ra** — thế là không phải gõ mật khẩu lại.

### Mặt trái của cookie

Cookie cũng là lý do bạn vừa xem một đôi giày trên Shopee, lát sau **quảng cáo đôi giày đó bám theo bạn khắp nơi**. Một số cookie (gọi là cookie theo dõi) ghi lại bạn đã xem gì để các công ty quảng cáo "đoán ý" bạn.

Đó là lý do các trang web châu Âu hay hiện bảng *"Trang này dùng cookie, bạn đồng ý không?"* — luật buộc họ phải xin phép.

> ⚠️ **Lỗi người mới hay gặp**: Nghe lời khuyên "xoá cookie cho máy nhanh" rồi ngạc nhiên vì **bị đăng xuất khỏi mọi trang web**. Xoá cookie = vứt hết thẻ thành viên trong ví — mọi quán đều coi bạn là khách lạ, phải đăng nhập lại từ đầu. Không sai, nhưng hãy biết trước hậu quả!

---

## 9. HTTPS và chiếc ổ khoá — Thư thường vs. thư niêm phong

Nhìn lên thanh địa chỉ trình duyệt, bạn sẽ thấy địa chỉ bắt đầu bằng `https://` và (trên nhiều trình duyệt) một biểu tượng **ổ khoá 🔒**. Nó nghĩa là gì?

### HTTP thường = bưu thiếp

Dữ liệu gửi bằng HTTP thường giống **tấm bưu thiếp không phong bì**: ai cầm nó trên đường đi (nhân viên bưu điện, người tò mò) đều **đọc được nội dung**. Nếu bạn gõ mật khẩu trên trang HTTP thường, kẻ xấu chung mạng Wi-Fi với bạn có thể "nhìn trộm" được.

### HTTPS = thư trong két sắt

**HTTPS** (chữ **S** = Secure, nghĩa là an toàn) **mã hoá** toàn bộ dữ liệu trước khi gửi. "Mã hoá" (encryption) nghĩa là biến nội dung thành chuỗi ký tự lộn xộn vô nghĩa — chỉ server đích mới có "chìa khoá" giải mã. Kẻ trộm có chặn được giữa đường cũng chỉ thấy một mớ ký tự loằng ngoằng.

| | HTTP | HTTPS |
|---|---|---|
| Hình ảnh | Bưu thiếp trần | Thư trong két sắt khoá |
| Ai đọc được giữa đường? | Bất kỳ ai | Không ai |
| Mật khẩu, số thẻ | **Nguy hiểm** | An toàn |
| Dấu hiệu trên trình duyệt | "Không bảo mật" | Ổ khoá 🔒 |

### Ổ khoá còn xác nhận "đúng người"

Ngoài việc niêm phong thư, HTTPS còn có **chứng chỉ** (certificate) — như **căn cước công dân** của trang web, do một tổ chức uy tín cấp, xác nhận: *"Trang này đúng là vnexpress.net thật, không phải hàng giả."*

> ⚠️ **Lỗi người mới hay gặp**: Tưởng rằng **ổ khoá = trang web đáng tin hoàn toàn**. SAI! Ổ khoá chỉ nói: *"Đường truyền được niêm phong"*. Một trang **lừa đảo** vẫn có thể có ổ khoá — kẻ trộm vẫn có thể niêm phong thư của hắn! Ví dụ: `vietc0mbank-xacthuc.xyz` có thể có ổ khoá đàng hoàng nhưng vẫn là trang giả mạo. Hãy kiểm tra cả **tên miền có viết đúng không** chứ đừng chỉ nhìn ổ khoá.

> 💡 **Ghi nhớ**: Không bao giờ nhập mật khẩu hay số thẻ ngân hàng vào trang **không có HTTPS**. Có HTTPS rồi thì kiểm tra tiếp **tên miền** có chính xác từng chữ không.

---

## 10. Ôn tập nhanh

Ghép tất cả lại bằng một câu chuyện 30 giây:

> Bạn gõ `vnexpress.net` và nhấn Enter. Trình duyệt (**client**) tra **DNS** — cuốn danh bạ của Internet — để đổi tên miền thành **địa chỉ IP**. Yêu cầu của bạn bay qua sóng **Wi-Fi** đến **router**, ra ngoài qua đường cáp của **ISP**, băng qua đại dương đến **server**. Hai bên nói chuyện bằng ngôn ngữ **HTTP**: bạn gửi **request**, server trả **response** kèm mã `200 OK`. Vì kết nối dùng **HTTPS** (có ổ khoá), mọi thứ được mã hoá, không ai đọc trộm được. Server gửi kèm một **cookie** để lần sau còn nhận ra bạn. Trình duyệt ráp các gói dữ liệu lại và vẽ thành trang báo bạn đang đọc. Tất cả trong chưa đầy một giây.

### Bảng thuật ngữ của bài

| Thuật ngữ | Nhớ bằng hình ảnh |
|---|---|
| Client / Server | Thực khách / Nhà bếp |
| Địa chỉ IP | Số nhà của thiết bị |
| DNS | Danh bạ điện thoại |
| Wi-Fi | Sóng nói chuyện trong nhà |
| Router | Bưu cục gia đình |
| ISP | Công ty bán Internet (Viettel, FPT...) |
| HTTP request/response | Gọi món / Bưng món |
| 404 | "Món này không có trong thực đơn" |
| Cookie | Thẻ thành viên cất trong ví |
| HTTPS + ổ khoá | Thư niêm phong trong két sắt |

### Tự kiểm tra (thử trả lời trước khi xem lại bài!)

1. Tại sao bạn gõ được `google.com` thay vì một dãy số? *(Gợi ý: danh bạ)*
2. Wi-Fi đầy vạch nhưng không vào được mạng — chuyện đó có thể xảy ra không? Vì sao?
3. Xoá cookie thì điều gì xảy ra với các tài khoản đang đăng nhập?
4. Một trang có ổ khoá 🔒 thì có chắc chắn không lừa đảo không?
5. Thấy "404 Not Found" nghĩa là lỗi ở máy bạn hay ở phía trang web?

Hẹn gặp bạn ở bài tiếp theo, nơi chúng ta sẽ tìm hiểu sâu hơn về trình duyệt và cách giữ an toàn khi lướt web!
