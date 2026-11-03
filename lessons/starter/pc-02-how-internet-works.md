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

> **Ghi nhớ**: Internet = mạng lưới khổng lồ các máy tính nối với nhau, gửi dữ liệu cho nhau như bưu điện gửi thư.

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

> **Ghi nhớ**: Client hỏi — Server trả lời. Cả Internet vận hành dựa trên màn "hỏi – đáp" này, lặp lại hàng tỷ lần mỗi giây trên toàn thế giới.

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

> **Lỗi người mới hay gặp**: Tưởng rằng gõ `google.com` vào ô tìm kiếm của Google và gõ vào **thanh địa chỉ** trình duyệt là một. Thanh địa chỉ (ô dài trên cùng trình duyệt) đưa bạn đi **thẳng** đến trang đó; còn ô tìm kiếm chỉ tìm các trang **nói về** từ khoá đó. Kẻ lừa đảo hay lợi dụng điều này để dụ bạn bấm vào trang giả mạo trong kết quả tìm kiếm!

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

> **Lỗi người mới hay gặp**: Mạng chậm là đổ lỗi ngay cho "Wi-Fi yếu". Thực tế có thể do: (1) đứng quá xa router, (2) ISP đang nghẽn/đứt cáp quang biển, hoặc (3) chính server của trang web bị quá tải. Mẹo kiểm tra: nếu một trang chậm mà các trang khác vẫn nhanh → lỗi ở server trang đó, không phải mạng nhà bạn. Và khi nghi ngờ router "đơ" — tắt đi bật lại 30 giây thật sự có tác dụng!

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

> **Ghi nhớ**: HTTP = một lượt hỏi (request) + một lượt đáp (response). Mỗi trang web bạn xem là kết quả của hàng chục, hàng trăm lượt hỏi–đáp như vậy (mỗi tấm hình, mỗi đoạn chữ là một lượt riêng).

---

## 7. Tổng hợp: Gõ URL rồi nhấn Enter — chuyện gì xảy ra?

**URL** (địa chỉ web, ví dụ `https://vnexpress.net`) là thứ bạn gõ vào thanh địa chỉ. Giờ hãy ghép tất cả kiến thức trên thành một câu chuyện hoàn chỉnh. Bạn gõ `vnexpress.net` và nhấn Enter:

<step-flow>
<svg viewBox="0 0 640 520" role="img" aria-labelledby="pc02u-t pc02u-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="pc02u-t">Gõ vnexpress.net rồi nhấn Enter: 5 bước giữa Trình duyệt, DNS và Server</title>
<desc id="pc02u-d">Sơ đồ trình tự ba lifeline Trình duyệt (client, máy bạn), DNS (danh bạ tên miền) và Server (VnExpress), đọc từ trên xuống theo thời gian. Bước 1 trình duyệt hỏi DNS vnexpress.net ở IP nào và nhận lại IP 111.65.250.x. Bước 2 trình duyệt gửi HTTP request GET /trang-chu sang Server qua Wi-Fi, router, ISP và các tuyến cáp. Bước 3 Server vào bếp gom nội dung. Bước 4 Server trả HTTP response 200 OK kèm dữ liệu, chia thành hàng nghìn gói nhỏ rồi ráp lại ở máy bạn. Bước 5 trình duyệt vẽ trang, ráp dữ liệu thành trang bạn thấy. Nét liền là lượt hỏi, nét đứt là lượt đáp; cả 5 bước thường chưa đầy 1 giây.</desc>
<defs><marker id="pc02u-m" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor"/></marker></defs>
<rect x="20" y="10" width="160" height="48" rx="9" fill="#3b82f6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="100" y="31" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">Trình duyệt</text>
<text x="100" y="49" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">client, máy bạn</text>
<line x1="100" y1="58" x2="100" y2="470" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<rect x="240" y="10" width="160" height="48" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="320" y="31" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">DNS</text>
<text x="320" y="49" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">danh bạ tên miền</text>
<line x1="320" y1="58" x2="320" y2="158" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<rect x="460" y="10" width="160" height="48" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
<text x="540" y="31" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">Server</text>
<text x="540" y="49" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.7">VnExpress</text>
<line x1="540" y1="58" x2="540" y2="470" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<g data-step="1">
<circle cx="70" cy="92" r="11" fill="#8b5cf6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/><text x="70" y="96.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">1</text>
<text x="210" y="86" font-size="13" text-anchor="middle" fill="currentColor">"vnexpress.net ở IP nào?"</text>
<line x1="103" y1="98" x2="316" y2="98" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" marker-end="url(#pc02u-m)"/>
<text x="210" y="130" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.85">"IP = 111.65.250.x"</text>
<line x1="317" y1="142" x2="104" y2="142" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" stroke-dasharray="6 4" marker-end="url(#pc02u-m)"/>
</g>
<g data-step="2">
<circle cx="70" cy="186" r="11" fill="#8b5cf6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/><text x="70" y="190.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">2</text>
<text x="320" y="180" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">HTTP request: GET /trang-chu</text>
<line x1="103" y1="192" x2="536" y2="192" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" marker-end="url(#pc02u-m)"/>
<text x="320" y="212" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">đi qua Wi-Fi → router → ISP → cáp</text>
</g>
<g data-step="3">
<rect x="530" y="228" width="20" height="60" rx="4" fill="#f59e0b" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.35"/>
<circle cx="572" cy="258" r="11" fill="#8b5cf6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/><text x="572" y="262.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">3</text>
<text x="520" y="252" font-size="13" text-anchor="end" fill="currentColor">Server "vào bếp" gom nội dung:</text>
<text x="520" y="270" font-size="13" text-anchor="end" fill="currentColor" opacity="0.75">tin mới, ảnh, tiêu đề</text>
</g>
<g data-step="4">
<circle cx="70" cy="322" r="11" fill="#8b5cf6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/><text x="70" y="326.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">4</text>
<text x="320" y="316" font-size="14" text-anchor="middle" fill="currentColor" font-weight="700">HTTP response: 200 OK + dữ liệu</text>
<line x1="537" y1="328" x2="104" y2="328" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" stroke-dasharray="6 4" marker-end="url(#pc02u-m)"/>
<text x="320" y="348" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.75">hàng nghìn gói nhỏ, về máy thì ráp lại</text>
</g>
<g data-step="5">
<rect x="90" y="364" width="20" height="60" rx="4" fill="#3b82f6" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.35"/>
<circle cx="70" cy="394" r="11" fill="#8b5cf6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4"/><text x="70" y="398.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">5</text>
<text x="122" y="388" font-size="13" text-anchor="start" fill="currentColor">Trình duyệt "vẽ" trang: ráp dữ liệu</text>
<text x="122" y="406" font-size="13" text-anchor="start" fill="currentColor" opacity="0.75">thành trang bạn thấy</text>
<text x="320" y="456" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">cả 5 bước thường chưa đầy 1 giây</text>
</g>
<text x="320" y="492" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.65">đọc từ trên xuống = thời gian</text>
<text x="320" y="510" font-size="13" text-anchor="middle" fill="currentColor" opacity="0.65">nét liền = lượt hỏi (đi ra) · nét đứt = lượt đáp (quay về)</text>
</svg>
<step-note data-step="1">Máy tính chỉ gửi gói tin tới một địa chỉ IP, không gửi tới cái tên <code>vnexpress.net</code>. Nên chưa tra được IP thì chưa làm gì khác được; lượt tra này thường chỉ mất vài phần nghìn giây.</step-note>
<step-note data-step="2">Có IP rồi mới biết gửi "lá thư gọi món" đến đâu. Viết theo đúng quy tắc HTTP thì server nào cũng hiểu trình duyệt muốn lấy gì.</step-note>
<step-note data-step="3">Tin tức đổi từng phút, nên server gom tin mới nhất, ảnh, tiêu đề ngay lúc được hỏi rồi đóng gói lại.</step-note>
<step-note data-step="4">Mã <code>200</code> báo trình duyệt là đã thành công (<code>404</code>, <code>500</code> là thất bại). Dữ liệu lớn nên được chia nhỏ; mỗi gói có thể đi đường khác nhau, tới nơi thì ráp lại đúng thứ tự.</step-note>
<step-note data-step="5">Thứ server gửi về mới là nguyên liệu: chữ, ảnh, mô tả bố cục. Trình duyệt phải tự đặt tiêu đề chỗ này, ảnh chỗ kia, tô màu chữ thì bạn mới nhìn thấy trang.</step-note>
</step-flow>

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

> **Ghi nhớ**: Gõ URL → tra DNS lấy IP → gửi request → server xử lý → nhận response → trình duyệt vẽ trang. Năm bước sau khi gõ URL: **Tra – Gửi – Xử – Nhận – Vẽ**.

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

<step-flow>
<svg viewBox="0 0 640 500" role="img" aria-labelledby="pc02c-t pc02c-d" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="pc02c-t">Cookie: server cấp thẻ một lần, trình duyệt tự chìa thẻ ở mọi lần sau</title>
<desc id="pc02c-d">Ba cột: ví cookie trong trình duyệt, trình duyệt, server trang web. Server quên bạn sau mỗi lượt hỏi đáp. Lần đầu: trình duyệt gửi email và mật khẩu, server trả trang kèm thẻ khach=1247, trình duyệt cất thẻ vào ví. Hôm sau: trình duyệt tự gửi kèm thẻ, server nhận ra khách 1247 và không hỏi mật khẩu. Sau khi xoá cookie: request không có thẻ, server coi là khách lạ và bắt đăng nhập lại.</desc>
<defs><marker id="pc02c-m" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<rect x="20.0" y="12" width="120" height="34" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b" stroke-opacity="0.55"/>
<text x="80" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Ví cookie</text>
<line x1="80" y1="46" x2="80" y2="492" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<rect x="220.0" y="12" width="120" height="34" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6" stroke-opacity="0.55"/>
<text x="280" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Trình duyệt</text>
<line x1="280" y1="46" x2="280" y2="492" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<rect x="465.0" y="12" width="150" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6" stroke-opacity="0.55"/>
<text x="540" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Server trang web</text>
<line x1="540" y1="46" x2="540" y2="492" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<text x="540" y="64" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.7">quên bạn sau mỗi lượt</text>
<g data-step="1">
<line x1="284" y1="100" x2="536" y2="100" stroke="currentColor" stroke-opacity="0.8" stroke-width="1.8" marker-end="url(#pc02c-m)"/><text x="410.0" y="92" text-anchor="middle" font-size="12" fill="currentColor">đăng nhập: email + mật khẩu</text>
</g>
<g data-step="2">
<line x1="536" y1="150" x2="284" y2="150" stroke="currentColor" stroke-opacity="0.8" stroke-width="1.8" marker-end="url(#pc02c-m)"/><text x="410.0" y="142" text-anchor="middle" font-size="12" fill="currentColor">trang chủ + Set-Cookie</text>
<rect x="364.0" y="160" width="92" height="24" rx="5" fill="#f59e0b" fill-opacity="0.25" stroke="#f59e0b"/><text x="410.0" y="176" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">khach=1247</text>
</g>
<g data-step="3">
<line x1="276" y1="210" x2="84" y2="210" stroke="currentColor" stroke-opacity="0.8" stroke-width="1.8" marker-end="url(#pc02c-m)"/><text x="180.0" y="202" text-anchor="middle" font-size="12" fill="currentColor">cất thẻ</text>
<rect x="34" y="222" width="92" height="24" rx="5" fill="#f59e0b" fill-opacity="0.25" stroke="#f59e0b"/><text x="80" y="238" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">khach=1247</text>
</g>
<line x1="10" y1="262" x2="630" y2="262" stroke="currentColor" stroke-opacity="0.25"/><rect x="350" y="251" width="150" height="22" rx="11" fill="#64748b" fill-opacity="0.15"/><text x="425" y="266" text-anchor="middle" font-size="12" fill="currentColor">hôm sau, mở lại trang</text>
<g data-step="4">
<line x1="284" y1="304" x2="536" y2="304" stroke="currentColor" stroke-opacity="0.8" stroke-width="1.8" marker-end="url(#pc02c-m)"/><text x="410.0" y="296" text-anchor="middle" font-size="12" fill="currentColor">GET trang chủ + Cookie</text>
<rect x="364.0" y="314" width="92" height="24" rx="5" fill="#f59e0b" fill-opacity="0.25" stroke="#f59e0b"/><text x="410.0" y="330" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">khach=1247</text>
<path d="M100 250 C 120 290, 240 304, 274 304" fill="none" stroke="#f59e0b" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#pc02c-m)"/>
<text x="110" y="300" font-size="12" fill="currentColor" opacity="0.8">tự chìa thẻ</text>
</g>
<g data-step="5">
<line x1="536" y1="378" x2="284" y2="378" stroke="#10b981" stroke-opacity="0.8" stroke-width="1.8" marker-end="url(#pc02c-m)"/><text x="410.0" y="370" text-anchor="middle" font-size="12" fill="currentColor">chào khách 1247 · không hỏi mật khẩu</text>
</g>
<line x1="10" y1="410" x2="630" y2="410" stroke="currentColor" stroke-opacity="0.25"/><rect x="350" y="399" width="150" height="22" rx="11" fill="#64748b" fill-opacity="0.15"/><text x="425" y="414" text-anchor="middle" font-size="12" fill="currentColor">sau khi xoá cookie</text>
<g data-step="6">
<rect x="34" y="436" width="92" height="24" rx="5" fill="#f59e0b" fill-opacity="0.25" stroke="#f59e0b"/><text x="80" y="452" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">khach=1247</text><line x1="34" y1="436" x2="126" y2="460" stroke="#f43f5e" stroke-width="2"/><line x1="34" y1="460" x2="126" y2="436" stroke="#f43f5e" stroke-width="2"/>
<line x1="284" y1="448" x2="536" y2="448" stroke="currentColor" stroke-opacity="0.8" stroke-width="1.8" marker-end="url(#pc02c-m)"/><text x="410.0" y="440" text-anchor="middle" font-size="12" fill="currentColor">GET trang chủ (không thẻ)</text>
<line x1="536" y1="484" x2="284" y2="484" stroke="#f43f5e" stroke-opacity="0.8" stroke-width="1.8" marker-end="url(#pc02c-m)"/><text x="410.0" y="476" text-anchor="middle" font-size="12" fill="currentColor">khách lạ: mời đăng nhập</text>
</g>
</svg>
<step-note data-step="1">Lần đầu, bạn chứng minh mình là ai bằng mật khẩu. Server kiểm xong nhưng sẽ quên ngay khi trả lời.</step-note>
<step-note data-step="2">Để khỏi phải hỏi lại, server đưa kèm trang một tấm thẻ: dòng <code>Set-Cookie</code> trong phản hồi HTTP.</step-note>
<step-note data-step="3">Trình duyệt cất thẻ vào ví, gắn với đúng trang đã cấp. Bạn không phải làm gì.</step-note>
<step-note data-step="4">Lần sau mở trang, trình duyệt tự gửi kèm thẻ trong mỗi request (dòng <code>Cookie</code>). Đây là phần "tự động" khiến bạn không phải gõ lại mật khẩu.</step-note>
<step-note data-step="5">Server vẫn đãng trí, nhưng chỉ cần đọc thẻ là biết bạn là khách 1247 đã đăng nhập.</step-note>
<step-note data-step="6">Xoá cookie là vứt thẻ khỏi ví. Request tới tay server không còn thẻ, server coi bạn là khách lạ: phải đăng nhập lại.</step-note>
</step-flow>

### Mặt trái của cookie

Cookie cũng là lý do bạn vừa xem một đôi giày trên Shopee, lát sau **quảng cáo đôi giày đó bám theo bạn khắp nơi**. Một số cookie (gọi là cookie theo dõi) ghi lại bạn đã xem gì để các công ty quảng cáo "đoán ý" bạn.

Đó là lý do các trang web châu Âu hay hiện bảng *"Trang này dùng cookie, bạn đồng ý không?"* — luật buộc họ phải xin phép.

> **Lỗi người mới hay gặp**: Nghe lời khuyên "xoá cookie cho máy nhanh" rồi ngạc nhiên vì **bị đăng xuất khỏi mọi trang web**. Xoá cookie = vứt hết thẻ thành viên trong ví — mọi quán đều coi bạn là khách lạ, phải đăng nhập lại từ đầu. Không sai, nhưng hãy biết trước hậu quả!

---

## 9. HTTPS và chiếc ổ khoá — Thư thường vs. thư niêm phong

Nhìn lên thanh địa chỉ trình duyệt, bạn sẽ thấy địa chỉ bắt đầu bằng `https://` và (trên nhiều trình duyệt) một biểu tượng **ổ khoá**. Nó nghĩa là gì?

### HTTP thường = bưu thiếp

Dữ liệu gửi bằng HTTP thường giống **tấm bưu thiếp không phong bì**: ai cầm nó trên đường đi (nhân viên bưu điện, người tò mò) đều **đọc được nội dung**. Nếu bạn gõ mật khẩu trên trang HTTP thường, kẻ xấu chung mạng Wi-Fi với bạn có thể "nhìn trộm" được.

### HTTPS = thư trong két sắt

**HTTPS** (chữ **S** = Secure, nghĩa là an toàn) **mã hoá** toàn bộ dữ liệu trước khi gửi. "Mã hoá" (encryption) nghĩa là biến nội dung thành chuỗi ký tự lộn xộn vô nghĩa — chỉ server đích mới có "chìa khoá" giải mã. Kẻ trộm có chặn được giữa đường cũng chỉ thấy một mớ ký tự loằng ngoằng.

| | HTTP | HTTPS |
|---|---|---|
| Hình ảnh | Bưu thiếp trần | Thư trong két sắt khoá |
| Ai đọc được giữa đường? | Bất kỳ ai | Không ai |
| Mật khẩu, số thẻ | **Nguy hiểm** | An toàn |
| Dấu hiệu trên trình duyệt | "Không bảo mật" | Ổ khoá |

### Ổ khoá còn xác nhận "đúng người"

Ngoài việc niêm phong thư, HTTPS còn có **chứng chỉ** (certificate) — như **căn cước công dân** của trang web, do một tổ chức uy tín cấp, xác nhận: *"Trang này đúng là vnexpress.net thật, không phải hàng giả."*

> **Lỗi người mới hay gặp**: Tưởng rằng **ổ khoá = trang web đáng tin hoàn toàn**. SAI! Ổ khoá chỉ nói: *"Đường truyền được niêm phong"*. Một trang **lừa đảo** vẫn có thể có ổ khoá — kẻ trộm vẫn có thể niêm phong thư của hắn! Ví dụ: `vietc0mbank-xacthuc.xyz` có thể có ổ khoá đàng hoàng nhưng vẫn là trang giả mạo. Hãy kiểm tra cả **tên miền có viết đúng không** chứ đừng chỉ nhìn ổ khoá.

> **Ghi nhớ**: Không bao giờ nhập mật khẩu hay số thẻ ngân hàng vào trang **không có HTTPS**. Có HTTPS rồi thì kiểm tra tiếp **tên miền** có chính xác từng chữ không.

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
4. Một trang có ổ khoá thì có chắc chắn không lừa đảo không?
5. Thấy "404 Not Found" nghĩa là lỗi ở máy bạn hay ở phía trang web?

Hẹn gặp bạn ở bài tiếp theo, nơi chúng ta sẽ tìm hiểu sâu hơn về trình duyệt và cách giữ an toàn khi lướt web!
