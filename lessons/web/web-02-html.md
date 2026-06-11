# HTML: bộ khung trang web

Khi bạn bước vào một ngôi nhà, thứ giữ cho nó đứng vững là **bộ khung** — tường, sàn, cột, mái. Trang web cũng vậy: **HTML** chính là bộ khung đó. Nó quyết định *trang web có những gì* và *các phần được sắp xếp ra sao*. CSS sẽ sơn màu, trang trí; JavaScript làm cho mọi thứ "cử động". Nhưng không có khung HTML thì chẳng có gì để sơn hay làm cho cử động cả.

HTML là viết tắt của **HyperText Markup Language** (ngôn ngữ đánh dấu siêu văn bản). Đừng để chữ "ngôn ngữ" làm bạn sợ — HTML không phải ngôn ngữ lập trình. Bạn không viết vòng lặp hay điều kiện ở đây. Bạn chỉ **đánh dấu** (markup) cho trình duyệt biết: "đây là tiêu đề", "đây là đoạn văn", "đây là cái ảnh".

> 💡 Ghi nhớ: HTML mô tả *cấu trúc và ý nghĩa* của nội dung, không phải vẻ ngoài. "Cái này là tiêu đề" là việc của HTML; "tiêu đề màu xanh, cỡ 32px" là việc của CSS.

## 1. Thẻ (tag) và phần tử (element)

Đơn vị cơ bản của HTML là **thẻ (tag)**. Hầu hết thẻ đi theo cặp: thẻ mở và thẻ đóng, bao bọc lấy nội dung ở giữa.

```html
<p>Xin chào, đây là một đoạn văn.</p>
```

Hãy mổ xẻ:

- `<p>` — **thẻ mở** (opening tag). `p` nghĩa là *paragraph* (đoạn văn).
- `Xin chào, đây là một đoạn văn.` — **nội dung**.
- `</p>` — **thẻ đóng** (closing tag). Để ý dấu gạch chéo `/`.

Cả cụm `<p>...</p>` được gọi là một **phần tử (element)**.

Hãy hình dung thẻ giống như **cặp dấu ngoặc**: mở ra thì phải đóng lại. `<p>` mở, `</p>` đóng.

Một vài thẻ **không có nội dung** nên không cần thẻ đóng — gọi là **thẻ rỗng (void/self-closing)**, ví dụ thẻ ảnh `<img>` hay thẻ xuống dòng `<br>`.

### Thuộc tính (attribute)

**Thuộc tính (attribute)** là thông tin thêm gắn vào thẻ mở, theo dạng `tên="giá_trị"`.

```html
<a href="https://google.com">Đi tới Google</a>
```

Ở đây `href="https://google.com"` là một thuộc tính của thẻ `<a>`. Nó nói: "khi click vào, hãy đi tới địa chỉ này". Tên thuộc tính là `href`, giá trị là `"https://google.com"`.

Analogy: thẻ là **danh từ** ("cái cửa"), thuộc tính là **tính chất** của nó ("cửa màu nâu, khoá số 7").

> ⚠️ Lỗi người mới hay gặp: quên thẻ đóng (`<p>` mà không có `</p>`), hoặc lồng thẻ sai thứ tự. Sai: `<b><i>chữ</b></i>`. Đúng: `<b><i>chữ</i></b>` — mở sau thì phải đóng trước (giống ngoặc lồng nhau trong toán).

## 2. Cấu trúc một tài liệu HTML

Mọi trang web đều có bộ khung chuẩn giống nhau. Đây là "bộ xương" tối thiểu:

```html
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Trang đầu tiên của tôi</title>
  </head>
  <body>
    <h1>Xin chào thế giới!</h1>
    <p>Đây là trang web đầu tiên của tôi.</p>
  </body>
</html>
```

Giải thích từng phần:

| Phần | Vai trò | Analogy |
|------|---------|---------|
| `<!DOCTYPE html>` | Báo cho trình duyệt: "đây là HTML hiện đại (HTML5)" | Tấm bảng tên ở cửa nhà |
| `<html lang="vi">` | Thẻ gốc bọc toàn bộ trang; `lang="vi"` báo nội dung là tiếng Việt | Bức tường bao quanh ngôi nhà |
| `<head>` | Thông tin *về* trang, người dùng không thấy trực tiếp | Hồ sơ giấy tờ của ngôi nhà |
| `<meta charset="UTF-8">` | Bảng mã ký tự — cần để hiển thị tiếng Việt có dấu | Quy ước "đọc chữ kiểu gì" |
| `<meta name="viewport" ...>` | Giúp trang hiển thị đúng trên điện thoại | Cài đặt co giãn theo màn hình |
| `<title>` | Tên hiển thị trên tab trình duyệt | Tên ngôi nhà trên bản đồ |
| `<body>` | Toàn bộ nội dung người dùng **nhìn thấy** | Không gian sống bên trong nhà |

> 💡 Ghi nhớ: Mọi thứ bạn *thấy* trên trang nằm trong `<body>`. Mọi thứ *mô tả* trang (như tiêu đề tab, bảng mã) nằm trong `<head>`.

> ⚠️ Lỗi người mới hay gặp: tiếng Việt hiển thị thành "Tiáº¿ng Viá»‡t" loạn xạ. Nguyên nhân hầu như luôn là thiếu `<meta charset="UTF-8">` trong `<head>`.

**Thử ngay:** Mở Notepad (hoặc bất kỳ trình soạn văn bản nào), dán đoạn code trên vào, lưu thành file tên `index.html`, rồi kéo thả file đó vào trình duyệt. Bạn vừa tạo ra một trang web thật!

## 3. Những thẻ thường dùng nhất

### Tiêu đề (heading): `<h1>` đến `<h6>`

Có 6 cấp tiêu đề, từ to nhất `<h1>` đến nhỏ nhất `<h6>`. Hãy dùng chúng như **mục lục một cuốn sách**: `<h1>` là tên sách, `<h2>` là tên chương, `<h3>` là mục con...

```html
<h1>Nấu ăn cho người bận rộn</h1>
<h2>Chương 1: Món xào</h2>
<h3>Rau muống xào tỏi</h3>
```

> ⚠️ Lỗi người mới hay gặp: dùng `<h1>` chỉ vì *muốn chữ to*. Cấp tiêu đề phản ánh **ý nghĩa**, không phải kích cỡ. Muốn chữ to thì dùng CSS. Một trang nên có đúng **một** `<h1>`.

### Đoạn văn: `<p>`

```html
<p>Đây là một đoạn văn. Trình duyệt sẽ tự xuống dòng khi hết chiều rộng.</p>
```

### Liên kết (link): `<a>`

Thẻ `<a>` (*anchor*) tạo ra liên kết click được — thứ làm nên chữ "Hyper" trong HyperText.

```html
<a href="https://vi.wikipedia.org">Truy cập Wikipedia</a>
<a href="lien-he.html">Trang liên hệ (cùng thư mục)</a>
<a href="https://example.com" target="_blank">Mở trong tab mới</a>
```

- `href` là **đích đến**.
- `target="_blank"` mở liên kết trong tab mới.

### Ảnh (image): `<img>`

```html
<img src="meo.jpg" alt="Con mèo vàng đang nằm ngủ" width="300" />
```

- `src` (*source*): đường dẫn tới file ảnh.
- `alt` (*alternative text*): mô tả ảnh bằng chữ — rất quan trọng, ta sẽ nói kỹ ở phần accessibility.
- `<img>` là thẻ rỗng: không có thẻ đóng.

### Danh sách: `<ul>`, `<ol>`, `<li>`

- `<ul>` (*unordered list*): danh sách không thứ tự, hiển thị dấu chấm tròn.
- `<ol>` (*ordered list*): danh sách có thứ tự, hiển thị số.
- `<li>` (*list item*): mỗi mục trong danh sách.

```html
<ul>
  <li>Táo</li>
  <li>Chuối</li>
  <li>Cam</li>
</ul>

<ol>
  <li>Bật bếp</li>
  <li>Đổ dầu</li>
  <li>Cho rau vào</li>
</ol>
```

> 💡 Ghi nhớ: `<li>` **phải** nằm bên trong `<ul>` hoặc `<ol>`. Nó không bao giờ đứng một mình.

## 4. Semantic HTML — đặt tên đúng cho từng phần

"Semantic" nghĩa là *có ý nghĩa*. **Semantic HTML** là việc dùng thẻ mô tả đúng *vai trò* của nội dung, thay vì dùng `<div>` chung chung cho mọi thứ.

`<div>` (*division*) là một cái hộp vô danh — nó không nói lên điều gì. Nếu cả trang chỉ toàn `<div>`, trình duyệt và công cụ đọc màn hình giống như đi vào một toà nhà mà **mọi căn phòng đều không có biển tên**.

Các thẻ semantic giúp "dán biển tên" cho từng khu vực:

| Thẻ | Ý nghĩa | Ví dụ nội dung |
|------|---------|----------------|
| `<header>` | Phần đầu trang | Logo, tên trang |
| `<nav>` | Khu điều hướng (*navigation*) | Thanh menu các link |
| `<main>` | Nội dung chính | Bài viết, sản phẩm |
| `<footer>` | Phần chân trang | Bản quyền, liên hệ |
| `<article>` | Một bài viết độc lập | Một bài blog |
| `<section>` | Một mục/phần của trang | Khu "Về chúng tôi" |

```html
<header>
  <h1>Blog của Lan</h1>
</header>

<nav>
  <a href="trang-chu.html">Trang chủ</a>
  <a href="bai-viet.html">Bài viết</a>
</nav>

<main>
  <article>
    <h2>Ngày đầu học HTML</h2>
    <p>Hôm nay mình đã tạo trang web đầu tiên...</p>
  </article>
</main>

<footer>
  <p>© 2026 Lan. Mọi quyền được bảo lưu.</p>
</footer>
```

> 💡 Ghi nhớ: về *vẻ ngoài*, `<header>` và `<div>` trông y hệt nhau. Nhưng semantic HTML giúp Google hiểu trang của bạn tốt hơn (tốt cho SEO) và giúp người khiếm thị dùng trình đọc màn hình điều hướng dễ dàng.

## 5. Form và input — nơi người dùng nhập liệu

**Form** là khu vực thu thập thông tin từ người dùng: ô đăng nhập, ô tìm kiếm, ô đăng ký... Thẻ `<form>` bọc lấy các ô nhập.

Thẻ `<input>` là ô nhập liệu. Nó đổi hình dạng tuỳ theo thuộc tính `type`:

```html
<form>
  <label for="ten">Họ và tên:</label>
  <input type="text" id="ten" name="ten" placeholder="Nguyễn Văn A" />

  <label for="email">Email:</label>
  <input type="email" id="email" name="email" />

  <label for="matkhau">Mật khẩu:</label>
  <input type="password" id="matkhau" name="matkhau" />

  <label>
    <input type="checkbox" name="dongy" /> Tôi đồng ý điều khoản
  </label>

  <button type="submit">Đăng ký</button>
</form>
```

Một vài `type` hay dùng:

| `type` | Hiển thị thành |
|--------|----------------|
| `text` | Ô chữ thường |
| `email` | Ô email (trình duyệt tự kiểm tra định dạng) |
| `password` | Ô ẩn ký tự thành dấu chấm |
| `checkbox` | Ô tick chọn |
| `radio` | Nút chọn một trong nhiều |
| `number` | Ô chỉ nhập số |

- `placeholder` là chữ gợi ý mờ hiện trong ô khi còn trống.
- `<button type="submit">` là nút gửi form đi.

> ⚠️ Lỗi người mới hay gặp: viết `<label>` mà không liên kết với `<input>`. Thuộc tính `for` của `<label>` phải **trùng** với `id` của `<input>` (`for="email"` ↔ `id="email"`). Liên kết đúng thì khi click vào chữ nhãn, con trỏ sẽ tự nhảy vào ô — và trình đọc màn hình mới đọc đúng.

## 6. Accessibility cơ bản — để ai cũng dùng được

**Accessibility** (viết tắt **a11y**) nghĩa là *khả năng tiếp cận*: làm cho trang web dùng được với cả người khiếm thị, khiếm thính, hay người dùng bàn phím thay chuột.

Hãy hình dung một người mù "đọc" web bằng phần mềm đọc to nội dung (*screen reader*). Họ không *thấy* ảnh, nên nếu bạn quên `alt`, phần mềm chỉ đọc "hình ảnh" trống rỗng. Hai thói quen quan trọng nhất cho người mới:

**1. Luôn viết `alt` cho ảnh:**

```html
<!-- Tốt: mô tả nội dung ảnh -->
<img src="logo.png" alt="Logo công ty ABC hình ngôi sao xanh" />

<!-- Ảnh chỉ để trang trí thì để alt rỗng -->
<img src="duong-ke.png" alt="" />
```

**2. Luôn gắn `<label>` cho mỗi `<input>`** (như mục 5 đã nói).

> 💡 Ghi nhớ: viết accessibility tốt không chỉ giúp người khuyết tật — nó còn giúp Google hiểu trang (text `alt` được index), và khi ảnh tải lỗi thì chữ `alt` hiện ra thay thế. Lợi cho tất cả.

## 7. Ghép tất cả lại — một trang HTML hoàn chỉnh

Đây là một trang dùng đủ những gì đã học. **Hãy lưu thành `index.html` và mở bằng trình duyệt để xem kết quả thật.**

```html
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tiệm Bánh Ngọt Hương Quê</title>
  </head>
  <body>
    <header>
      <h1>Tiệm Bánh Ngọt Hương Quê</h1>
      <p>Bánh nhà làm, tươi mỗi ngày.</p>
    </header>

    <nav>
      <a href="#menu">Thực đơn</a> |
      <a href="#dat-hang">Đặt hàng</a>
    </nav>

    <main>
      <section id="menu">
        <h2>Thực đơn hôm nay</h2>
        <img src="banh-su-kem.jpg" alt="Đĩa bánh su kem phủ đường" width="320" />
        <ul>
          <li>Bánh su kem — 15.000đ</li>
          <li>Bánh bông lan trứng muối — 25.000đ</li>
          <li>Bánh tiramisu — 35.000đ</li>
        </ul>
        <p>Xem thêm tại
          <a href="https://example.com" target="_blank">trang Facebook</a> của tiệm.
        </p>
      </section>

      <section id="dat-hang">
        <h2>Đặt hàng nhanh</h2>
        <form>
          <p>
            <label for="ten">Tên của bạn:</label>
            <input type="text" id="ten" name="ten" placeholder="Nhập tên..." />
          </p>
          <p>
            <label for="sdt">Số điện thoại:</label>
            <input type="number" id="sdt" name="sdt" />
          </p>
          <p>
            <label for="mon">Món muốn đặt:</label>
            <input type="text" id="mon" name="mon" />
          </p>
          <p>
            <label>
              <input type="checkbox" name="giao-hang" /> Tôi muốn giao tận nơi
            </label>
          </p>
          <button type="submit">Gửi đơn hàng</button>
        </form>
      </section>
    </main>

    <footer>
      <p>© 2026 Tiệm Bánh Hương Quê — Liên hệ: 0900 000 000</p>
    </footer>
  </body>
</html>
```

Để ý các liên kết `<nav>` dùng `href="#menu"` — dấu `#` trỏ tới `id` của một phần tử *trong cùng trang*. Click vào sẽ cuộn xuống đúng khu vực đó. Đây là **liên kết neo (anchor link)**.

> ⚠️ Lỗi người mới hay gặp: ảnh không hiện. Hầu như luôn do `src` sai đường dẫn — file ảnh phải nằm đúng chỗ bạn trỏ tới. Nếu ảnh `banh-su-kem.jpg` nằm cùng thư mục với `index.html` thì `src="banh-su-kem.jpg"` mới đúng. Khi ảnh lỗi, chữ trong `alt` sẽ hiện ra — đó cũng là lý do nên luôn viết `alt`.

## Tổng kết

- HTML là **bộ khung** mô tả cấu trúc và ý nghĩa của trang.
- **Thẻ (tag)** thường đi theo cặp mở/đóng và tạo thành **phần tử**; **thuộc tính (attribute)** bổ sung thông tin.
- Mọi trang có khung chuẩn: `<!DOCTYPE>`, `<html>`, `<head>` (thông tin ẩn), `<body>` (nội dung thấy được).
- Thẻ hay dùng: `<h1>`–`<h6>`, `<p>`, `<a>`, `<img>`, `<ul>/<ol>/<li>`.
- **Semantic HTML** (`<header>`, `<nav>`, `<main>`, `<footer>`) đặt "biển tên" cho từng phần — tốt cho SEO và accessibility.
- **Form** và `<input>` thu thập dữ liệu; nhớ gắn `<label>` đúng `for`/`id`.
- **Accessibility**: luôn viết `alt` cho ảnh và `<label>` cho input.

Ở bài tiếp theo, ta sẽ dùng **CSS** để "sơn màu" và sắp xếp bộ khung này cho đẹp mắt.
