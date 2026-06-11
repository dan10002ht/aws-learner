# Web hoạt động thế nào

Bạn vừa gõ `google.com` vào trình duyệt, nhấn Enter, và chưa đầy một giây sau cả trang hiện ra. Điều gì đã xảy ra trong khoảnh khắc đó? Bài học này sẽ "mổ xẻ" từng bước, để bạn hiểu rõ web vận hành ra sao trước khi tự tay viết trang đầu tiên.

## Client và Server: hai nhân vật chính

Mọi thứ trên web đều là cuộc trò chuyện giữa hai bên: **client** và **server**.

- **Client** (máy khách): là phía *yêu cầu*. Thường chính là **browser** (trình duyệt) — Chrome, Firefox, Safari — trên máy bạn.
- **Server** (máy chủ): là phía *phục vụ*. Một máy tính ở đâu đó trên thế giới, luôn bật, chứa dữ liệu của website và chờ trả lời các yêu cầu.

> 💡 Ghi nhớ: Analogy nhà hàng. Bạn (client) là **khách**, server là **bếp**. Bạn gọi món qua người phục vụ (mạng Internet), bếp nấu rồi gửi món ra. Bạn không vào bếp, bếp cũng không tự mang đồ ăn nếu bạn chưa gọi. Web cũng vậy: client luôn hỏi trước, server chỉ trả lời.

Điểm mấu chốt: **client luôn chủ động mở lời**. Server không tự nhiên gửi trang web cho bạn — nó đợi đến khi bạn (client) yêu cầu.

## URL: địa chỉ của thứ bạn muốn

**URL** (Uniform Resource Locator) là "địa chỉ nhà" của một tài nguyên trên web. Hãy mổ xẻ một URL:

```
https://shop.example.com:443/products/ao-thun?size=M#reviews
```

| Phần | Giá trị | Ý nghĩa |
|------|---------|---------|
| Scheme (giao thức) | `https` | Cách trò chuyện — `https` là bản có mã hoá, an toàn |
| Host (tên miền) | `shop.example.com` | Server nào, ở đâu |
| Port (cổng) | `443` | "Cửa" nào trên server (thường ẩn đi) |
| Path (đường dẫn) | `/products/ao-thun` | Tài nguyên cụ thể nào trên server đó |
| Query (tham số) | `?size=M` | Thông tin thêm gửi kèm |
| Fragment | `#reviews` | Vị trí cụ thể *trong* trang (browser tự xử lý) |

> 💡 Ghi nhớ: Giống địa chỉ thư tín: scheme là "kiểu vận chuyển", host là "thành phố + tên nhà", path là "phòng nào trong nhà", query là "lời nhắn dán kèm".

## URL → Request → Response: từng bước

Khi bạn nhấn Enter trên một URL, đây là chuỗi sự kiện:

1. **Phân giải tên miền (DNS lookup).** Browser hỏi hệ thống **DNS** (Domain Name System — như "danh bạ điện thoại của Internet"): `example.com` ứng với địa chỉ **IP** nào? DNS trả về ví dụ `93.184.216.34`. Máy tính giao tiếp bằng số IP, con người dùng tên cho dễ nhớ.

2. **Mở kết nối.** Browser kết nối tới server tại IP đó (qua port, mặc định 443 cho https).

3. **Gửi request.** Browser gửi một **HTTP request** — một mẩu văn bản nói rõ "tôi muốn gì". Ví dụ:

```http
GET /products/ao-thun HTTP/1.1
Host: shop.example.com
Accept: text/html
```

Dòng đầu: **method** (`GET` = "cho tôi xem") + path. Các dòng sau là **headers** — thông tin phụ về yêu cầu.

4. **Server xử lý.** Server đọc request, tìm dữ liệu, có thể truy vấn database, rồi tạo nội dung trả về.

5. **Gửi response.** Server trả về một **HTTP response**:

```http
HTTP/1.1 200 OK
Content-Type: text/html

<!DOCTYPE html>
<html>...nội dung trang...</html>
```

Dòng đầu có **status code** (`200 OK` = thành công). Sau đó là headers, rồi một dòng trống, rồi **body** — nội dung thật (thường là HTML).

6. **Browser render.** Browser nhận HTML và vẽ ra màn hình (phần này nói kỹ ở dưới).

> 💡 Ghi nhớ: Một lần tải trang không phải *một* request. Trang HTML thường tham chiếu thêm ảnh, file CSS, file JS... Mỗi thứ là một request riêng. Mở 1 trang tin tức có thể là 80-100 request!

## HTTP method: bạn muốn làm gì?

**HTTP** (HyperText Transfer Protocol) là "ngôn ngữ" client và server dùng để trò chuyện. **Method** cho biết *ý định* của request:

| Method | Nghĩa đời thường | Ví dụ |
|--------|------------------|-------|
| `GET` | "Cho tôi xem cái này" | Mở trang sản phẩm |
| `POST` | "Tôi gửi dữ liệu mới lên" | Đăng ký tài khoản, gửi form |
| `PUT` | "Cập nhật, thay toàn bộ" | Sửa hồ sơ |
| `PATCH`| "Cập nhật một phần" | Đổi mỗi ảnh đại diện |
| `DELETE`| "Xoá cái này đi" | Xoá một bài viết |

> 💡 Ghi nhớ: Gõ địa chỉ vào browser hay bấm link luôn là `GET`. Bấm nút "Gửi" trên form thường là `POST`. Phân biệt dễ: `GET` chỉ *đọc*, `POST` thường *thay đổi* gì đó trên server.

## Status code: kết quả ra sao?

Server trả về một con số 3 chữ số để tóm tắt kết quả. Nhóm theo chữ số đầu:

| Nhóm | Ý nghĩa | Ví dụ phổ biến |
|------|---------|----------------|
| **2xx** | Thành công | `200 OK`, `201 Created` |
| **3xx** | Chuyển hướng | `301 Moved Permanently`, `302 Found` |
| **4xx** | Lỗi từ phía client (bạn sai) | `404 Not Found`, `403 Forbidden`, `401 Unauthorized` |
| **5xx** | Lỗi từ phía server (họ sai) | `500 Internal Server Error`, `503 Service Unavailable` |

> 💡 Ghi nhớ cách phân biệt 4xx và 5xx: **4xx là "lỗi tại bạn"** (gõ sai địa chỉ, chưa đăng nhập). **5xx là "lỗi tại server"** (code họ bị crash). `404` huyền thoại nghĩa là: địa chỉ đúng cú pháp nhưng server không tìm thấy thứ đó.

## HTML, CSS, JavaScript: bộ ba xây nên trang

Mọi trang web đều dựng từ ba ngôn ngữ, mỗi cái một vai trò. Analogy cơ thể người:

- **HTML** (HyperText Markup Language) = **bộ xương**. Quy định *nội dung và cấu trúc*: đây là tiêu đề, đây là đoạn văn, đây là ảnh, đây là nút.
- **CSS** (Cascading Style Sheets) = **quần áo, ngoại hình**. Quy định *trông như thế nào*: màu sắc, font, khoảng cách, bố cục.
- **JavaScript** (JS) = **cơ bắp, hành động**. Quy định *làm gì khi tương tác*: bấm nút thì hiện popup, gõ phím thì kiểm tra, tải thêm dữ liệu.

Cùng một nút bấm qua ba lăng kính:

```html
<!-- HTML: nội dung & cấu trúc -->
<button id="btn-chao">Bấm tôi</button>
```

```css
/* CSS: trông ra sao */
#btn-chao {
  background-color: #2563eb;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
```

```javascript
// JavaScript: làm gì khi bấm
const nut = document.getElementById("btn-chao");
nut.addEventListener("click", () => {
  alert("Xin chào! Bạn vừa bấm nút.");
});
```

> ⚠️ Lỗi người mới hay gặp: nghĩ rằng "biết HTML là biết lập trình web". HTML chỉ mô tả nội dung — nó *không có* logic (không if/else, không vòng lặp). Phần "suy nghĩ" thuộc về JavaScript.

### Thử ngay

Tạo file `index.html`, dán đủ cả ba phần vào, rồi mở bằng browser:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Trang đầu tiên</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 40px; }
    #btn-chao {
      background-color: #2563eb; color: white;
      padding: 10px 20px; border: none;
      border-radius: 8px; cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Trang web đầu tiên của tôi</h1>
  <button id="btn-chao">Bấm tôi</button>

  <script>
    document.getElementById("btn-chao").addEventListener("click", () => {
      alert("Xin chào! Bạn vừa bấm nút.");
    });
  </script>
</body>
</html>
```

Mở file này trong Chrome — bạn vừa chạy HTML + CSS + JS thật, ngay trên máy mình, không cần server nào cả.

## Frontend và Backend: hai nửa của một ứng dụng

Hai từ bạn sẽ nghe suốt:

- **Frontend** (phía trước): mọi thứ chạy *trong browser của người dùng* — HTML, CSS, JS. Đây là phần bạn *nhìn thấy và chạm vào*. Nằm ở phía **client**.
- **Backend** (phía sau): mọi thứ chạy *trên server* — xử lý logic, lưu/lấy dữ liệu từ **database**, kiểm tra mật khẩu. Người dùng không thấy trực tiếp.

> 💡 Ghi nhớ: Analogy nhà hàng lần nữa. Frontend là **phòng ăn** — bàn ghế, thực đơn, cách trình bày món (cái khách thấy). Backend là **bếp + kho** — nơi nấu nướng và cất nguyên liệu (khách không vào). Người phục vụ chạy qua chạy lại giữa hai bên chính là các HTTP request/response.

Ví dụ đăng nhập: bạn gõ email + mật khẩu (frontend) → browser gửi `POST` lên server → backend kiểm tra mật khẩu đúng không trong database → trả về `200` (đúng) hoặc `401` (sai) → frontend hiện "Chào mừng" hoặc "Sai mật khẩu".

## Browser render trang ra sao

Khi HTML về tới browser, nó không hiện ra ngay tức thì mà qua mấy bước:

1. **Phân tích HTML (parse).** Browser đọc HTML từ trên xuống, dựng một cây cấu trúc gọi là **DOM** (Document Object Model) — bản đồ mọi phần tử trên trang dưới dạng cây cha-con.
2. **Phân tích CSS.** Browser đọc các quy tắc CSS, tính ra mỗi phần tử trông thế nào.
3. **Layout (sắp đặt).** Tính toán vị trí và kích thước: phần tử này rộng bao nhiêu, nằm ở đâu.
4. **Paint (vẽ).** Tô màu, vẽ chữ, ảnh lên màn hình thành các điểm ảnh.
5. **Chạy JavaScript.** JS có thể *thay đổi* DOM sau đó (thêm phần tử, đổi nội dung), khiến browser vẽ lại phần liên quan.

> 💡 Ghi nhớ: **DOM** là cầu nối quan trọng nhất. HTML là văn bản tĩnh; khi browser đọc xong, nó biến thành DOM — một cấu trúc *sống* mà JavaScript có thể đọc và sửa. Khi bạn viết `document.getElementById(...)`, bạn đang nói chuyện với DOM.

> ⚠️ Lỗi người mới hay gặp: đặt thẻ `<script>` ở *đầu* trang (trong `<head>`) rồi tìm phần tử chưa được tạo. Browser đọc từ trên xuống — nếu JS chạy trước khi nút được dựng, `getElementById` trả về `null` và bạn gặp lỗi. Cách an toàn: đặt `<script>` ngay trước thẻ đóng `</body>`, như ví dụ ở trên.

## DevTools: nhìn tận mắt request và response

**DevTools** (Developer Tools) là bộ công cụ có sẵn trong mọi browser, cho bạn "nhìn vào trong" trang web. Đây là người bạn thân nhất của developer.

### Thử ngay: mở tab Network

1. Mở một trang bất kỳ, ví dụ `https://example.com`.
2. Nhấn **F12** (hoặc chuột phải → **Inspect** / **Kiểm tra**).
3. Chọn tab **Network**.
4. **Tải lại trang** (F5) — giờ bạn sẽ thấy danh sách hiện ra.

Mỗi dòng trong danh sách là **một HTTP request**. Bạn sẽ thấy:

- **Name**: tên tài nguyên (file HTML, ảnh, CSS, JS...).
- **Status**: status code — `200`, `404`...
- **Type**: loại (`document`, `stylesheet`, `script`, `png`...).
- **Size**: dung lượng tải về.
- **Time**: mất bao lâu.

Bấm vào một dòng để xem chi tiết: tab **Headers** cho thấy request/response headers, **Response** cho thấy nội dung thật server trả về. Đây chính là toàn bộ "cuộc trò chuyện" client–server mà chúng ta vừa học, hiện ra bằng mắt thường.

> 💡 Ghi nhớ: Khi trang bị lỗi, mở tab Network là phản xạ đầu tiên. Thấy dòng đỏ `404`? Một file bị thiếu. Thấy `500`? Server đang gặp sự cố. DevTools biến những khái niệm trừu tượng trong bài này thành thứ bạn quan sát được trực tiếp.

## Tóm tắt

- Web là cuộc trò chuyện **request/response** giữa **client** (browser) và **server**; client luôn hỏi trước.
- **URL** là địa chỉ; **DNS** đổi tên miền thành **IP** để máy tìm được nhau.
- **HTTP method** (`GET`, `POST`...) nói *ý định*; **status code** (`2xx`/`4xx`/`5xx`) nói *kết quả*.
- **HTML** = cấu trúc, **CSS** = ngoại hình, **JavaScript** = hành động.
- **Frontend** chạy trên client, **backend** chạy trên server.
- Browser biến HTML thành **DOM** rồi layout và paint ra màn hình.
- **DevTools → tab Network** cho bạn nhìn tận mắt mọi request và response.

Ở bài tiếp theo, bạn sẽ tự tay viết HTML để dựng "bộ xương" cho trang web đầu tiên của mình.
