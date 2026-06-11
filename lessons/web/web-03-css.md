# CSS: tạo kiểu & bố cục

Ở bài trước, bạn đã biết HTML tạo ra "bộ khung" của trang web. Nhưng một trang chỉ có HTML thì trông như một tờ giấy trắng đen, chữ xếp chồng lên nhau, không màu mè gì cả. **CSS** (Cascading Style Sheets - "bảng định kiểu xếp tầng") chính là phần "trang điểm" cho trang web đó.

> 💡 Ghi nhớ: Một cách ví von quen thuộc: HTML là **bộ xương**, CSS là **quần áo & trang điểm**, còn JavaScript là **cơ bắp giúp cử động**. Bài này ta lo phần quần áo.

## 1. Cách gắn CSS vào trang

Có 3 cách đưa CSS vào HTML. Hãy xem qua cả ba rồi mình sẽ nói cách nào nên dùng.

### Cách 1: Inline (gắn thẳng vào thẻ)

```html
<p style="color: red;">Đoạn văn màu đỏ</p>
```

Viết CSS ngay trong thuộc tính `style` của thẻ. Nhanh nhưng rối, khó tái sử dụng. Tránh dùng.

### Cách 2: Internal (đặt trong thẻ `<style>`)

```html
<head>
  <style>
    p { color: red; }
  </style>
</head>
```

Gom CSS vào một chỗ trong file HTML. Ổn cho trang nhỏ, một file.

### Cách 3: External (file .css riêng) - khuyên dùng

Tạo một file riêng tên `style.css`, rồi "gọi" nó vào HTML:

```html
<head>
  <link rel="stylesheet" href="style.css">
</head>
```

```css
/* file style.css */
p {
  color: red;
}
```

> 💡 Ghi nhớ: Dùng file `.css` riêng giống như cất hết quần áo vào một tủ. Nhiều trang HTML có thể dùng chung một tủ đó, sửa một chỗ là cả website đổi theo.

## 2. Cú pháp CSS & Selector

Một quy tắc (rule) CSS gồm 3 phần:

```css
selector {
  property: value;
}
```

- **selector**: chọn thẻ nào để tô vẽ.
- **property**: thuộc tính muốn đổi (màu, cỡ chữ...).
- **value**: giá trị muốn đặt.

Ví dụ `p { color: blue; }` đọc là: "tìm tất cả thẻ `<p>`, đặt màu chữ là xanh".

### Ba selector quan trọng nhất

**1. Element selector** - chọn theo tên thẻ:

```css
h1 { color: navy; }   /* mọi thẻ h1 */
```

**2. Class selector** - chọn theo `class`, bắt đầu bằng dấu chấm `.`:

```html
<p class="canhbao">Cẩn thận!</p>
<span class="canhbao">Cẩn thận!</span>
```

```css
.canhbao { color: orange; }
```

Class **dùng lại được nhiều lần** trên nhiều thẻ khác nhau. Đây là selector bạn sẽ dùng nhiều nhất.

**3. ID selector** - chọn theo `id`, bắt đầu bằng dấu thăng `#`:

```html
<div id="header-chinh">...</div>
```

```css
#header-chinh { background: black; }
```

ID phải **duy nhất** trong trang - mỗi `id` chỉ được gắn cho đúng một thẻ.

> 💡 Ghi nhớ: Phân biệt bằng đời thường: **class** giống "đồng phục" (cả lớp mặc giống nhau được), còn **id** giống "số báo danh" (mỗi người một số, không trùng).

| Selector | Ký hiệu | Dùng lại nhiều lần? | Ví dụ |
|----------|---------|---------------------|-------|
| Element  | (tên thẻ) | Có | `p`, `h1`, `div` |
| Class    | `.`     | Có | `.canhbao` |
| ID       | `#`     | Không (duy nhất) | `#header-chinh` |

> ⚠️ Lỗi người mới hay gặp: Quên dấu `.` trước tên class. Viết `canhbao { }` thì CSS lại đi tìm thẻ tên là `<canhbao>` (không tồn tại) thay vì class. Nhớ: class luôn có chấm, id luôn có thăng.

## 3. Box Model - mọi thứ đều là cái hộp

Đây là khái niệm quan trọng nhất để hiểu bố cục. Trong CSS, **mỗi phần tử HTML đều là một cái hộp chữ nhật**. Mỗi hộp có 4 lớp, từ trong ra ngoài:

```
┌─────────────────────────────┐  ← margin (lề ngoài)
│  ┌───────────────────────┐  │  ← border (viền)
│  │  ┌─────────────────┐  │  │  ← padding (lề trong)
│  │  │    Nội dung      │  │  │  ← content
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

Ví von như một **bức tranh treo tường**:
- **content**: bức tranh.
- **padding**: khoảng trắng giữa tranh và khung (passe-partout).
- **border**: cái khung gỗ.
- **margin**: khoảng cách từ khung này tới khung tranh kế bên.

```css
.the-bai {
  padding: 20px;              /* lề trong, 4 phía */
  border: 2px solid gray;     /* viền: dày 2px, nét liền, màu xám */
  margin: 16px;               /* lề ngoài, 4 phía */
}
```

Bạn có thể chỉnh từng phía:

```css
.the-bai {
  margin-top: 10px;
  margin-bottom: 20px;
  padding: 10px 20px;   /* viết tắt: trên-dưới 10px, trái-phải 20px */
}
```

### Mẹo `box-sizing` cứu cả thế giới

Mặc định, khi bạn đặt `width: 200px` rồi thêm `padding: 20px`, hộp sẽ rộng thành **240px** (200 + 20 + 20). Điều này gây bất ngờ và lệch bố cục. Cách sửa:

```css
* {
  box-sizing: border-box;
}
```

Với `border-box`, `width: 200px` luôn đúng **200px** kể cả khi thêm padding - padding "ăn vào trong" thay vì phình ra.

> 💡 Ghi nhớ: Hầu hết dự án thật đều đặt `* { box-sizing: border-box; }` ngay dòng đầu. Cứ chép nó vào, đời bạn sẽ dễ thở hơn.

**Thử ngay:** Tạo một file HTML, thêm `<div class="the-bai">Xin chào</div>`, rồi đổi `padding`, `border`, `margin` và quan sát cái hộp thay đổi.

## 4. Màu, font và khoảng cách

### Màu sắc

```css
.vidu {
  color: #e74c3c;            /* màu chữ - mã hex */
  background-color: #ecf0f1; /* màu nền */
}
```

Có nhiều cách viết màu:
- **Tên**: `red`, `blue`, `tomato`...
- **Hex**: `#ff0000` (đỏ). Là viết tắt của lượng đỏ-xanh lá-xanh dương.
- **RGB**: `rgb(255, 0, 0)`.
- **RGBA**: `rgba(255, 0, 0, 0.5)` - thêm độ trong suốt (0 = trong suốt hẳn, 1 = đặc).

### Font (kiểu chữ)

```css
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 16px;
  font-weight: bold;     /* hoặc 400 (thường), 700 (đậm) */
  line-height: 1.6;      /* khoảng cách giữa các dòng */
}
```

> 💡 Ghi nhớ: `font-family` nên có nhiều tên cách nhau bằng dấu phẩy - đó là danh sách "dự phòng". Nếu máy người dùng không có font đầu, trình duyệt thử font tiếp theo. Luôn kết thúc bằng một loại chung như `sans-serif`.

### Khoảng cách & căn chữ

```css
.tieu-de {
  text-align: center;     /* căn giữa: left, right, center */
  letter-spacing: 1px;    /* giãn chữ cái */
  margin-bottom: 24px;    /* tạo khoảng trống bên dưới */
}
```

## 5. Flexbox - xếp hàng dễ dàng

Trước đây, việc xếp các phần tử nằm ngang cạnh nhau là cơn ác mộng. **Flexbox** ra đời để giải quyết điều đó. Ý tưởng: bạn có một **hộp cha** (container), nó sẽ tự sắp xếp các **con** bên trong.

```html
<div class="thanh-menu">
  <div>Trang chủ</div>
  <div>Giới thiệu</div>
  <div>Liên hệ</div>
</div>
```

```css
.thanh-menu {
  display: flex;            /* bật chế độ flex */
  gap: 16px;               /* khoảng cách giữa các con */
  justify-content: space-between;  /* dàn theo chiều ngang */
  align-items: center;     /* căn theo chiều dọc */
}
```

Hai "công tắc" quan trọng nhất của Flexbox:

| Thuộc tính | Điều khiển | Giá trị hay dùng |
|------------|-----------|-------------------|
| `justify-content` | Trục **ngang** (theo hàng) | `flex-start`, `center`, `space-between`, `space-around` |
| `align-items` | Trục **dọc** (cao thấp) | `flex-start`, `center`, `flex-end`, `stretch` |

> 💡 Ghi nhớ: Cách nhớ nhanh: muốn xếp đồ thành **một hàng và căn chỉnh chúng**, dùng Flexbox. `justify-content` lo bên trái-phải, `align-items` lo trên-dưới. Cần đổi sang hàng dọc thì thêm `flex-direction: column;`.

**Thử ngay:** Đổi `justify-content` lần lượt thành `center`, `space-between`, `flex-end` và xem 3 ô menu nhảy chỗ.

## 6. Grid - bố cục dạng lưới (giới thiệu)

Flexbox giỏi xếp **một chiều** (một hàng hoặc một cột). Khi cần bố cục **hai chiều** (hàng và cột cùng lúc, như một bảng tính hay một lưới ảnh), ta dùng **CSS Grid**.

```html
<div class="luoi-anh">
  <div>Ô 1</div>
  <div>Ô 2</div>
  <div>Ô 3</div>
  <div>Ô 4</div>
</div>
```

```css
.luoi-anh {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;  /* 3 cột bằng nhau */
  gap: 12px;
}
```

Đơn vị `fr` (fraction - "phần") chia không gian theo tỉ lệ. `1fr 1fr 1fr` nghĩa là 3 cột chia đều. Còn `2fr 1fr` thì cột đầu rộng gấp đôi cột sau.

> 💡 Ghi nhớ: Quy tắc đơn giản: **xếp thành một hàng → Flexbox**, **xếp thành lưới nhiều hàng nhiều cột → Grid**. Người mới chưa cần thạo Grid ngay, chỉ cần biết nó tồn tại để dùng khi gặp bố cục lưới.

## 7. Responsive & Mobile-first

Trang web phải đẹp trên cả màn hình điện thoại lẫn máy tính. Làm cho trang "co giãn" theo kích thước màn hình gọi là **responsive design** (thiết kế đáp ứng). Công cụ chính là **media query** - một khối quy tắc chỉ áp dụng khi màn hình đạt điều kiện nào đó.

```css
/* Mặc định: dành cho điện thoại (màn hình nhỏ) */
.cot {
  width: 100%;
}

/* Khi màn hình rộng từ 768px trở lên (máy tính bảng, laptop) */
@media (min-width: 768px) {
  .cot {
    width: 50%;
  }
}
```

Cách viết trên gọi là **mobile-first** (ưu tiên điện thoại trước): viết CSS cho màn hình nhỏ làm mặc định, rồi dùng `min-width` để "nâng cấp" giao diện khi màn hình to dần.

> 💡 Ghi nhớ: Vì đa số người dùng vào web bằng điện thoại, viết mobile-first giúp trang nhẹ và đúng ngay với số đông. `min-width` nghĩa là "từ kích thước này trở lên", đọc theo chiều màn hình **to dần**.

> ⚠️ Lỗi người mới hay gặp: Quên thẻ này trong `<head>`. Thiếu nó, điện thoại sẽ "thu nhỏ" cả trang desktop lại, media query không hoạt động đúng:
> ```html
> <meta name="viewport" content="width=device-width, initial-scale=1.0">
> ```

**Thử ngay:** Mở trang trên trình duyệt máy tính, kéo thu hẹp cửa sổ qua mốc 768px và xem `.cot` đổi chiều rộng.

## 8. Biến CSS (CSS Variables)

Khi website dùng đi dùng lại một màu thương hiệu ở 50 chỗ, sửa từng chỗ rất mệt. **Biến CSS** giúp khai báo giá trị một lần, dùng ở mọi nơi.

```css
:root {
  --mau-chinh: #3498db;
  --khoang-cach: 16px;
}

.nut {
  background-color: var(--mau-chinh);
  padding: var(--khoang-cach);
}

.link {
  color: var(--mau-chinh);
}
```

- `:root` là "gốc" của trang - khai báo biến ở đây thì cả trang dùng được.
- Tên biến luôn bắt đầu bằng hai gạch ngang `--`.
- Lấy giá trị ra bằng hàm `var(--ten-bien)`.

> 💡 Ghi nhớ: Đổi `--mau-chinh` một dòng duy nhất ở `:root` là toàn bộ website đổi màu theo. Đây là nền tảng để làm "chế độ tối" (dark mode) sau này.

## 9. Tổ chức style để không bị rối

Khi file CSS lớn dần, dễ thành "mớ bòng bong". Vài nguyên tắc cho người mới:

1. **Dùng class, hạn chế id và inline style.** Class linh hoạt và dễ tái sử dụng nhất.
2. **Đặt tên class theo ý nghĩa, không theo hình dáng.** Nên `.nut-canh-bao` thay vì `.chu-do` - vì sau này màu có thể đổi.
3. **Nhóm CSS theo khu vực** và ghi chú bằng comment:

```css
/* ===== HEADER ===== */
.header { ... }

/* ===== NỘI DUNG ===== */
.bai-viet { ... }
```

4. **Gom giá trị lặp lại vào biến CSS** (màu, khoảng cách, cỡ chữ).
5. **Tránh selector quá dài** kiểu `div .a .b .c span` - vừa khó đọc vừa khó sửa.

> ⚠️ Lỗi người mới hay gặp: Lạm dụng inline style (`style="..."`) cho mọi thứ. Lúc đầu thấy nhanh, nhưng khi cần đổi đồng loạt thì phải sửa từng thẻ. Hãy gom vào file `.css` với class ngay từ đầu.

## Tổng kết

- Gắn CSS qua file `.css` riêng (`<link>`) là cách gọn gàng nhất.
- **Selector**: element (tên thẻ), class (`.`), id (`#`). Dùng class nhiều nhất.
- **Box model**: content → padding → border → margin. Nhớ đặt `box-sizing: border-box`.
- **Flexbox** xếp một hàng; **Grid** xếp lưới hai chiều.
- **Media query** + **mobile-first** giúp trang responsive.
- **Biến CSS** (`--ten`, `var()`) giúp dễ bảo trì.

Ở bài tiếp theo, ta sẽ thổi "sự sống" vào trang bằng JavaScript - để nút bấm có phản ứng, nội dung tự thay đổi. Hẹn gặp lại!
