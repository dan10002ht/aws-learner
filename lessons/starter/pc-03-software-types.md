# Phần mềm: từ app điện thoại đến server

Bạn dùng phần mềm mỗi ngày: lướt Facebook, nhắn Zalo, xem YouTube, chuyển tiền qua app ngân hàng. Nhưng phần mềm thực ra là gì? Vì sao có app phải tải về, có app chỉ cần mở trình duyệt? Khi bạn bấm "Gửi tin nhắn", chuyện gì xảy ra phía sau? Bài này sẽ giải thích tất cả từ con số 0, bằng những ví dụ đời thường.

## 1. Phần mềm là gì?

Hãy tưởng tượng chiếc máy tính hay điện thoại là **một nhân viên cực kỳ chăm chỉ nhưng không biết tự nghĩ**. Nó chỉ làm đúng những gì được dặn, từng bước một.

**Phần mềm (software)** chính là **bản hướng dẫn chi tiết** dặn nhân viên đó phải làm gì:

- App máy tính bỏ túi là bản hướng dẫn: "Khi người dùng bấm 2, rồi bấm +, rồi bấm 3, rồi bấm =, hãy hiện số 5."
- App nhắn tin là bản hướng dẫn: "Khi người dùng gõ chữ và bấm Gửi, hãy chuyển đoạn chữ đó đến điện thoại của người kia."

Phân biệt với **phần cứng (hardware)** — những thứ sờ được: màn hình, chip, pin, bàn phím.

> 💡 **Ghi nhớ:** Phần cứng là cơ thể, phần mềm là suy nghĩ. Một chiếc điện thoại không có phần mềm chỉ là cục kim loại đẹp đẽ vô dụng.

Phần mềm được viết bằng **ngôn ngữ lập trình (programming language)** — những ngôn ngữ đặc biệt (như Python, JavaScript) mà con người dùng để "viết bản hướng dẫn" cho máy. Người viết gọi là **lập trình viên (developer)**.

## 2. Ba "kiểu nhà" của phần mềm: desktop, web, mobile

Cùng một dịch vụ (ví dụ Facebook) có thể xuất hiện ở ba nơi khác nhau. Giống như một quán phở có thể: bán tại quán, bán mang về, và bán qua xe đẩy lưu động — cùng món phở, nhưng cách phục vụ khác nhau.

### 2.1. App desktop (ứng dụng máy tính)

Là phần mềm **cài đặt thẳng vào máy tính**: Microsoft Word, Photoshop, game trên máy tính.

- Bạn phải **tải về và cài đặt** (giống mua nguyên bộ bàn ghế về nhà lắp).
- Chạy nhanh, mạnh, có thể dùng **không cần Internet** (với nhiều app).
- Nhược điểm: muốn cập nhật phiên bản mới phải tải lại; cài trên máy nào chỉ dùng được trên máy đó.

### 2.2. App web (ứng dụng web)

Là phần mềm **chạy trong trình duyệt** (browser — chương trình để lướt mạng như Chrome, Safari): Gmail, Google Docs, Facebook bản web.

- **Không cần cài đặt** — gõ địa chỉ là dùng được, như đến quán ăn tại chỗ, không phải mua bếp về nhà.
- Dùng được trên **bất kỳ máy nào** có trình duyệt.
- Luôn là **phiên bản mới nhất** (chủ quán đổi thực đơn, mọi khách thấy ngay).
- Nhược điểm: hầu như **bắt buộc có Internet**.

### 2.3. App mobile (ứng dụng di động)

Là phần mềm **cài lên điện thoại** qua App Store (iPhone) hoặc Google Play (Android): Zalo, TikTok, app ngân hàng.

- Tận dụng được tính năng riêng của điện thoại: **camera, GPS (định vị), thông báo đẩy, vân tay**.
- Tối ưu cho màn hình nhỏ và thao tác chạm.
- Nhược điểm: phải viết riêng cho iPhone và Android (hai "hệ điều hành" khác nhau — như hai quốc gia nói hai thứ tiếng).

### Bảng so sánh nhanh

| Tiêu chí | Desktop | Web | Mobile |
|---|---|---|---|
| Cần cài đặt? | Có | Không | Có (qua cửa hàng app) |
| Dùng offline được? | Thường được | Hầu như không | Một phần |
| Cập nhật | Tự tải bản mới | Tự động, tức thì | Qua cửa hàng app |
| Dùng camera/GPS | Hạn chế | Hạn chế | Rất tốt |
| Ví dụ | Word, Photoshop | Gmail, Google Docs | Zalo, TikTok |

> ⚠️ **Lỗi người mới hay gặp:** Nghĩ rằng "vào Facebook trên Chrome" và "mở app Facebook" là hai dịch vụ khác nhau. Thực ra đó là **cùng một dịch vụ**, chỉ khác "cửa ra vào". Dữ liệu của bạn (bạn bè, tin nhắn) nằm ở một nơi chung — phía sau, trên server. Server là gì? Đọc tiếp nhé.

## 3. Frontend và Backend: nhà hàng có hai khu vực

Đây là khái niệm quan trọng nhất bài. Hầu hết phần mềm hiện đại chia làm **hai nửa**, giống một nhà hàng:

### 3.1. Frontend — khu vực khách ngồi

**Frontend** (phần giao diện, "mặt tiền") là **tất cả những gì bạn nhìn thấy và chạm vào**: nút bấm, màu sắc, chữ, hình ảnh, ô nhập liệu.

Trong nhà hàng, frontend là: **bàn ghế, thực đơn, cách bài trí, đèn đóm** — mọi thứ khách trải nghiệm trực tiếp.

Ví dụ: nút "Thích" màu xanh trên Facebook, ô gõ tin nhắn trong Zalo — đều là frontend. Frontend chạy **trên máy của bạn** (điện thoại, trình duyệt).

### 3.2. Backend — khu bếp

**Backend** (phần phía sau, "hậu trường") là nơi **xử lý thật sự diễn ra**, mà bạn không bao giờ nhìn thấy.

Trong nhà hàng, backend là: **căn bếp** — nơi đầu bếp nấu món, kho chứa nguyên liệu, quy trình chế biến. Khách không vào bếp, nhưng không có bếp thì thực đơn đẹp mấy cũng vô nghĩa.

Khi bạn bấm "Đăng nhập" trên app ngân hàng:
1. Frontend (app trên điện thoại bạn) gửi tên đăng nhập + mật khẩu đi.
2. Backend (máy chủ của ngân hàng) **kiểm tra** mật khẩu đúng không, tra số dư, rồi gửi kết quả về.
3. Frontend **hiển thị** số dư cho bạn xem.

### 3.3. Server là gì?

Backend phải chạy trên một máy tính nào đó — máy đó gọi là **server (máy chủ)**.

Server thực ra chỉ là **một chiếc máy tính bình thường nhưng khỏe hơn, không màn hình, không bàn phím, bật 24/7**, đặt trong các tòa nhà chuyên dụng gọi là **data center (trung tâm dữ liệu)** — những "nhà kho" khổng lồ chứa hàng nghìn máy, có điều hòa và điện dự phòng.

Nó gọi là "máy chủ" vì nó **phục vụ (serve)** hàng triệu máy "khách" (client) — chính là điện thoại, máy tính của người dùng như bạn.

| | Frontend | Backend |
|---|---|---|
| Là gì | Giao diện người dùng thấy | Xử lý logic phía sau |
| Chạy ở đâu | Máy của bạn | Server của công ty |
| Analogy nhà hàng | Bàn ghế, thực đơn, không gian | Căn bếp, kho nguyên liệu |
| Ví dụ | Nút "Thích", ô nhập mật khẩu | Kiểm tra mật khẩu, tính số dư |

> 💡 **Ghi nhớ:** Frontend = những gì bạn THẤY. Backend = những gì THẬT SỰ XẢY RA. Cả hai phải phối hợp, như khu khách ngồi và căn bếp của nhà hàng.

## 4. Database: cuốn sổ ghi chép khổng lồ

Câu hỏi: bạn tắt app Facebook, đổi sang điện thoại mới, đăng nhập lại — vì sao **bạn bè, ảnh, tin nhắn vẫn còn nguyên**?

Vì chúng không lưu trên điện thoại bạn. Chúng nằm trong **database (cơ sở dữ liệu)** — nơi backend **lưu trữ dữ liệu lâu dài, có tổ chức**.

Hãy tưởng tượng database như **tủ hồ sơ của một bệnh viện**:
- Mỗi bệnh nhân một hồ sơ, xếp theo thứ tự, có mã số.
- Cần tra ai là tìm được ngay, dù có hàng triệu hồ sơ.
- Thêm, sửa, xóa hồ sơ đều theo quy củ.

Trong nhà hàng, database giống **kho nguyên liệu + sổ sách của quán**: ghi ai đặt bàn, tồn kho bao nhiêu thịt, doanh thu hôm nay bao nhiêu.

Database thường lưu dữ liệu dưới dạng **bảng** — giống bảng tính Excel nhưng chứa được hàng tỷ dòng và tra cứu trong tích tắc:

| Mã người dùng | Tên | Email | Ngày đăng ký |
|---|---|---|---|
| 1 | Lan | lan@gmail.com | 01/03/2024 |
| 2 | Minh | minh@gmail.com | 15/07/2024 |

> ⚠️ **Lỗi người mới hay gặp:** Nhầm database với "bộ nhớ điện thoại". Ảnh bạn chụp lưu trong máy là **lưu cục bộ** — mất máy là mất ảnh. Tin nhắn Zalo, bài đăng Facebook lưu trong **database trên server** — mất máy vẫn còn, vì chúng nằm "trong tủ hồ sơ của công ty", không nằm trong túi bạn.

## 5. API: người phục vụ của nhà hàng

Giờ ghép lại: frontend là khu khách ngồi, backend là bếp, database là kho. Vậy **ai chuyển lời qua lại giữa khách và bếp**?

Đó là **người phục vụ** — và trong phần mềm, vai trò này gọi là **API** (Application Programming Interface — giao diện lập trình ứng dụng; cứ hiểu là **"cách chuẩn để hai phần mềm nói chuyện với nhau"**).

Quy trình ở nhà hàng:
1. Khách (frontend) xem thực đơn, gọi: "Cho một phở bò tái."
2. **Người phục vụ (API)** ghi nhận đơn theo đúng mẫu, mang vào bếp.
3. Bếp (backend) nấu, lấy nguyên liệu từ kho (database).
4. Người phục vụ bưng món ra cho khách.

Điểm hay: khách **không cần biết bếp nấu thế nào**, chỉ cần gọi món **theo đúng thực đơn**. Bếp cũng không cần biết khách là ai — chỉ nhận đơn chuẩn và trả món chuẩn.

Ví dụ thực tế:
- App thời tiết trên điện thoại bạn **không tự đo thời tiết**. Nó gọi API của một dịch vụ khí tượng: "Cho xin thời tiết Hà Nội hôm nay" → nhận về "31 độ, có mưa rào".
- Khi app đặt xe hiển thị bản đồ, nó gọi **API của Google Maps** — Google "nấu" bản đồ, app chỉ "gọi món".
- Khi một trang web cho bạn "Đăng nhập bằng Facebook", trang đó đang dùng **API của Facebook** để xác nhận danh tính bạn.

> 💡 **Ghi nhớ:** API = người phục vụ + thực đơn chuẩn. Nó cho phép các phần mềm dùng dịch vụ của nhau mà không cần biết "công thức bí mật trong bếp" của nhau. Cả Internet hiện đại vận hành nhờ hàng triệu API gọi qua gọi lại như vậy.

Bốn mảnh ghép — frontend, API, backend, database — xếp thành các tầng nối tiếp nhau. Có một ranh giới quan trọng: những gì **bạn thấy** nằm trên máy của bạn, còn phần xử lý thật **ẩn phía sau** trên server:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc phân tầng: Frontend ↔ API ↔ Backend ↔ Database</title>
  <desc>Bốn khối nối nhau bằng mũi tên hai chiều: Frontend trên máy người dùng, qua API người phục vụ, tới Backend trên server, rồi Database kho dữ liệu. Một đường ranh giới tách phần bạn thấy (frontend) khỏi phần ẩn phía sau (API, backend, database).</desc>
  <text x="16" y="26" font-size="14" font-weight="700" fill="currentColor">Bốn mảnh ghép của một phần mềm hiện đại</text>

  <text x="120" y="64" font-size="11" font-weight="700" text-anchor="middle" fill="#10b981">NHỮNG GÌ BẠN THẤY</text>
  <text x="120" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">trên máy của bạn</text>

  <text x="470" y="64" font-size="11" font-weight="700" text-anchor="middle" fill="#3b82f6">PHÍA SAU</text>
  <text x="470" y="80" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.6">trên server, bạn không thấy</text>

  <line x1="246" y1="44" x2="246" y2="316" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="6 5"/>

  <g>
    <rect x="24" y="104" width="196" height="170" rx="12" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="122" y="150" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Frontend</text>
    <text x="122" y="172" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.72">giao diện, nút bấm</text>
    <text x="122" y="190" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.72">điện thoại / trình duyệt</text>
    <text x="122" y="222" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">= khu khách ngồi</text>
  </g>

  <g>
    <rect x="272" y="104" width="120" height="170" rx="12" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="332" y="150" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">API</text>
    <text x="332" y="172" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.72">cách chuẩn để</text>
    <text x="332" y="188" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.72">nói chuyện</text>
    <text x="332" y="222" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">= người phục vụ</text>
  </g>

  <g>
    <rect x="444" y="104" width="120" height="170" rx="12" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="504" y="150" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Backend</text>
    <text x="504" y="172" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.72">xử lý logic</text>
    <text x="504" y="188" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.72">trên server</text>
    <text x="504" y="222" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">= căn bếp</text>
  </g>

  <g>
    <rect x="588" y="104" width="116" height="170" rx="12" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="646" y="150" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Database</text>
    <text x="646" y="172" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.72">lưu dữ liệu</text>
    <text x="646" y="188" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.72">lâu dài</text>
    <text x="646" y="222" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">= kho hồ sơ</text>
  </g>

  <defs>
    <marker id="archA" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <g stroke="currentColor" stroke-opacity="0.55" fill="none">
    <line x1="222" y1="180" x2="268" y2="180" marker-end="url(#archA)"/>
    <line x1="270" y1="200" x2="224" y2="200" marker-end="url(#archA)"/>
    <line x1="394" y1="180" x2="440" y2="180" marker-end="url(#archA)"/>
    <line x1="442" y1="200" x2="396" y2="200" marker-end="url(#archA)"/>
    <line x1="566" y1="180" x2="584" y2="180" marker-end="url(#archA)"/>
    <line x1="586" y1="200" x2="568" y2="200" marker-end="url(#archA)"/>
  </g>

  <text x="120" y="306" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Bạn gõ / bấm ở đây</text>
  <text x="470" y="306" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Công việc thật xảy ra ở đây</text>
</svg>

## 6. Cloud: thuê thay vì tự xây

### 6.1. Vấn đề

Giả sử bạn muốn mở một app bán hàng. Bạn cần server để chạy backend và database. Lựa chọn 1: **tự mua máy chủ** — tốn vài trăm triệu, phải thuê phòng máy lạnh, lo điện, lo hỏng hóc, lo bảo mật. Như **tự đào giếng để có nước**.

### 6.2. Giải pháp: cloud

**Cloud (điện toán đám mây)** đơn giản là: **thuê máy tính của công ty khác qua Internet, trả tiền theo mức dùng** — giống như **dùng nước máy**: vặn vòi là có, dùng bao nhiêu trả bấy nhiêu, không cần biết nhà máy nước ở đâu.

Các "nhà máy nước" lớn nhất: **Amazon (AWS)**, **Microsoft (Azure)**, **Google (Google Cloud)**. Họ sở hữu những data center khổng lồ khắp thế giới và cho thuê sức mạnh tính toán trong đó.

Lợi ích dễ hiểu:
- **Khởi đầu rẻ:** quán mới mở chỉ thuê "một vòi nước nhỏ", vài trăm nghìn/tháng.
- **Co giãn:** ngày sale đông khách gấp 100 lần? Vặn vòi to lên trong vài phút, qua đợt thì vặn nhỏ lại.
- **Khỏi lo bảo trì:** máy hỏng, mất điện, bảo mật — nhà cung cấp lo.

### 6.3. Bạn đã dùng cloud mỗi ngày

- Ảnh "lưu trên iCloud / Google Photos" = ảnh nằm trên **server thuê của Apple/Google**, không nằm trong điện thoại.
- Netflix không tự xây data center cho phần lớn hệ thống — họ **thuê của Amazon**.
- File "lưu trên Google Drive" = file nằm trong data center của Google đâu đó trên thế giới.

> ⚠️ **Lỗi người mới hay gặp:** Nghĩ "đám mây" là thứ gì đó lơ lửng trên trời, không có thật. **Cloud chỉ là máy tính của người khác** — những server rất thật, đặt trong những tòa nhà rất thật, chỉ là bạn truy cập chúng qua Internet thay vì đặt trong nhà mình.

## 7. Open source: công thức nấu ăn công khai

Phần mềm có hai "triết lý" phân phối:

### 7.1. Phần mềm đóng (closed source / proprietary)

Công ty **giữ bí mật mã nguồn** (source code — chính là "bản hướng dẫn" mà lập trình viên viết ra). Bạn chỉ được dùng món ăn, **không được xem công thức**. Ví dụ: Windows, Photoshop, iOS.

### 7.2. Phần mềm mã nguồn mở (open source)

Tác giả **công khai toàn bộ công thức** cho cả thế giới: ai cũng được xem, dùng miễn phí, sửa lại, và đóng góp cải tiến.

Analogy: một đầu bếp đăng công thức phở lên mạng. Hàng nghìn người nấu thử, người góp ý "thêm gừng nướng ngon hơn", người chỉ ra "bước 3 dễ làm cháy" — công thức ngày càng hoàn thiện nhờ **trí tuệ tập thể**.

Ví dụ open source nổi tiếng (bạn đang hưởng lợi mà không biết):
- **Linux:** hệ điều hành chạy trên đa số server của thế giới — và Android cũng xây trên Linux.
- **Firefox, Chromium:** nền của các trình duyệt.
- **WordPress:** đứng sau khoảng 40% website toàn cầu.

| | Phần mềm đóng | Open source |
|---|---|---|
| Xem được mã nguồn? | Không | Có, công khai |
| Giá | Thường trả phí | Thường miễn phí |
| Ai sửa lỗi/cải tiến | Chỉ công ty sở hữu | Cộng đồng toàn cầu |
| Analogy | Công thức gia truyền giấu kín | Công thức đăng công khai, ai cũng góp ý |

> 💡 **Ghi nhớ:** Open source không có nghĩa là "kém chất lượng vì miễn phí". Ngược lại, nhiều phần mềm quan trọng nhất thế giới (Linux chạy server, nền tảng của Android) là open source — vì hàng nghìn con mắt cùng soi thì lỗi khó trốn.

## 8. Ghép tất cả lại: một lần bấm "Đặt hàng"

Hãy theo dấu một thao tác quen thuộc — bạn bấm **"Đặt hàng"** trên app mua sắm:

1. **Frontend** (app mobile trên điện thoại bạn) thu thập thông tin: món hàng, địa chỉ, rồi gói thành một "đơn gọi món".
2. Đơn được gửi qua Internet đến **API** — người phục vụ tiếp nhận theo đúng mẫu chuẩn.
3. **Backend** (chạy trên **server**, server đó thường **thuê trên cloud**) xử lý: kiểm tra hàng còn không, tính tiền, trừ khuyến mãi.
4. Backend ghi đơn hàng vào **database** — cuốn sổ khổng lồ — để mai mốt bạn tra "lịch sử đơn hàng" vẫn thấy.
5. Backend gọi tiếp **API của ngân hàng** để trừ tiền (phần mềm nói chuyện với phần mềm).
6. Kết quả "Đặt hàng thành công" được trả ngược về, **frontend** hiển thị màn hình xác nhận xanh lá quen thuộc.

Cả sáu bước đó, nhìn theo thời gian (đi từ trái sang phải, rồi quay ngược về), trông như sau:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng một lần bấm Đặt hàng qua 6 bước</title>
  <desc>Sơ đồ luồng theo thời gian đi xuống, bốn cột: Frontend, API, Backend trên cloud, Database. Bước 1 frontend gửi đơn tới API; bước 2 API chuyển vào backend; bước 3 backend xử lý; bước 4 backend ghi vào database; bước 5 backend gọi tiếp API ngân hàng để trừ tiền; bước 6 kết quả trả ngược về frontend hiển thị Đặt hàng thành công.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Một lần bấm "Đặt hàng" — 6 bước trong chưa đầy một giây</text>

  <g text-anchor="middle">
    <rect x="40" y="40" width="120" height="34" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="100" y="62" font-size="12" font-weight="700" fill="currentColor">Frontend</text>
    <rect x="216" y="40" width="120" height="34" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="276" y="62" font-size="12" font-weight="700" fill="currentColor">API</text>
    <rect x="392" y="40" width="140" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="462" y="58" font-size="12" font-weight="700" fill="currentColor">Backend</text>
    <text x="462" y="71" font-size="9.5" fill="currentColor" opacity="0.6">(server trên cloud)</text>
    <rect x="588" y="40" width="116" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="646" y="62" font-size="12" font-weight="700" fill="currentColor">Database</text>
  </g>

  <g stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3 5">
    <line x1="100" y1="78" x2="100" y2="404"/>
    <line x1="276" y1="78" x2="276" y2="404"/>
    <line x1="462" y1="78" x2="462" y2="404"/>
    <line x1="646" y1="78" x2="646" y2="404"/>
  </g>

  <defs>
    <marker id="ordA" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.65"/></marker>
  </defs>

  <g font-size="11" fill="currentColor">
    <circle cx="100" cy="106" r="9" fill="#10b981" fill-opacity="0.9"/><text x="100" y="110" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">1</text>
    <line x1="100" y1="106" x2="270" y2="106" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#ordA)"/>
    <text x="108" y="100" opacity="0.85">gói đơn hàng, gửi đi</text>

    <circle cx="276" cy="146" r="9" fill="#f59e0b" fill-opacity="0.9"/><text x="276" y="150" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">2</text>
    <line x1="276" y1="146" x2="456" y2="146" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#ordA)"/>
    <text x="284" y="140" opacity="0.85">nhận theo mẫu chuẩn</text>

    <circle cx="462" cy="190" r="9" fill="#3b82f6" fill-opacity="0.9"/><text x="462" y="194" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">3</text>
    <text x="476" y="186" opacity="0.85">kiểm hàng, tính tiền, trừ khuyến mãi</text>

    <circle cx="462" cy="232" r="9" fill="#8b5cf6" fill-opacity="0.95"/><text x="462" y="236" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">4</text>
    <line x1="462" y1="232" x2="640" y2="232" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#ordA)"/>
    <text x="470" y="226" opacity="0.85">ghi đơn vào sổ</text>
  </g>

  <g>
    <rect x="392" y="266" width="140" height="40" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="462" y="282" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">API ngân hàng</text>
    <text x="462" y="297" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">phần mềm gọi phần mềm</text>
    <circle cx="462" cy="266" r="9" fill="#3b82f6" fill-opacity="0.9"/><text x="462" y="270" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">5</text>
    <text x="372" y="260" font-size="11" text-anchor="end" fill="currentColor" opacity="0.85">trừ tiền</text>
  </g>

  <g>
    <circle cx="462" cy="346" r="9" fill="#10b981" fill-opacity="0.9"/><text x="462" y="350" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">6</text>
    <line x1="462" y1="346" x2="106" y2="346" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#ordA)"/>
    <text x="454" y="340" font-size="11" text-anchor="end" fill="currentColor" opacity="0.85">trả kết quả về</text>
    <rect x="40" y="362" width="170" height="34" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="125" y="383" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">"Đặt hàng thành công" ✓</text>
  </g>

  <text x="690" y="420" font-size="10" text-anchor="end" fill="currentColor" opacity="0.55">thời gian đi xuống ↓</text>
</svg>

Toàn bộ chuyến đi đó diễn ra trong **chưa đầy một giây**.

## Tóm tắt bài học

| Khái niệm | Hiểu nhanh | Analogy |
|---|---|---|
| Phần mềm | Bản hướng dẫn cho máy tính | Suy nghĩ của cơ thể |
| App desktop | Cài vào máy tính | Mua bếp về nhà |
| App web | Chạy trong trình duyệt, khỏi cài | Ăn tại quán |
| App mobile | Cài lên điện thoại, dùng camera/GPS | Xe đẩy lưu động, tiện mọi nơi |
| Frontend | Những gì bạn thấy và chạm | Thực đơn, bàn ghế |
| Backend | Xử lý thật phía sau | Căn bếp |
| Server | Máy tính khỏe, chạy 24/7, phục vụ triệu người | Tòa nhà bếp trung tâm |
| Database | Kho lưu dữ liệu có tổ chức | Tủ hồ sơ bệnh viện |
| API | Cách chuẩn để phần mềm nói chuyện với nhau | Người phục vụ + thực đơn |
| Cloud | Thuê máy tính qua Internet, trả theo mức dùng | Nước máy thay vì đào giếng |
| Open source | Mã nguồn công khai, cộng đồng cùng cải tiến | Công thức nấu ăn đăng công khai |

### Câu hỏi tự kiểm tra

1. Vì sao đổi điện thoại mới, đăng nhập Zalo vẫn thấy đủ tin nhắn cũ? *(Gợi ý: dữ liệu nằm ở đâu?)*
2. Trong analogy nhà hàng, nếu frontend là thực đơn và backend là bếp, thì API là ai?
3. "Lưu ảnh lên cloud" nghĩa là ảnh đang nằm ở đâu, theo nghĩa vật lý?
4. Một app thời tiết lấy dữ liệu nhiệt độ từ đâu — tự đo hay hỏi ai?

Bài tiếp theo, chúng ta sẽ tìm hiểu chính con đường mà những "đơn gọi món" này di chuyển: **Internet hoạt động như thế nào**.
