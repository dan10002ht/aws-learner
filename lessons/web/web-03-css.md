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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 340" role="img" style="width:100%;max-width:560px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Box Model: bốn lớp lồng nhau content, padding, border, margin</title>
  <desc>Mỗi phần tử HTML là một hộp gồm bốn lớp lồng từ trong ra ngoài: content (nội dung) ở giữa, bao quanh là padding (lề trong), rồi border (viền), ngoài cùng là margin (lề ngoài). Ví như bức tranh treo tường: tranh là content, passe-partout là padding, khung gỗ là border, khoảng cách tới tranh kế bên là margin.</desc>
  <rect x="14" y="14" width="532" height="312" rx="6" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="5 4"/>
  <text x="24" y="32" font-size="12" font-weight="700" fill="currentColor">margin — lề ngoài (khoảng tới khung tranh kế bên)</text>
  <rect x="80" y="48" width="400" height="244" rx="5" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.5" stroke-width="3"/>
  <text x="92" y="66" font-size="12" font-weight="700" fill="currentColor">border — viền (cái khung gỗ)</text>
  <rect x="120" y="82" width="320" height="176" rx="4" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>
  <text x="132" y="100" font-size="12" font-weight="700" fill="currentColor">padding — lề trong (passe-partout)</text>
  <rect x="170" y="120" width="220" height="118" rx="4" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="280" y="175" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">content</text>
  <text x="280" y="196" font-size="11.5" text-anchor="middle" fill="currentColor" opacity="0.7">nội dung (bức tranh)</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 300" role="img" style="width:100%;max-width:640px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Hai trục của Flexbox: main axis (justify-content) và cross axis (align-items)</title>
  <desc>Một hộp cha flex xếp các con theo hàng ngang. Main axis (trục chính) chạy ngang, do justify-content điều khiển khoảng cách trái-phải giữa các con. Cross axis (trục chéo) chạy dọc, do align-items điều khiển căn các con trên-dưới.</desc>
  <rect x="40" y="60" width="520" height="170" rx="10" fill="#3b82f6" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="6 4"/>
  <text x="48" y="52" font-size="12.5" font-weight="700" fill="currentColor">display: flex (hộp cha)</text>
  <g>
    <rect x="120" y="120" width="90" height="50" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="165" y="150" font-size="12" text-anchor="middle" fill="currentColor">con 1</text>
    <rect x="255" y="120" width="90" height="50" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="300" y="150" font-size="12" text-anchor="middle" fill="currentColor">con 2</text>
    <rect x="390" y="120" width="90" height="50" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="435" y="150" font-size="12" text-anchor="middle" fill="currentColor">con 3</text>
  </g>
  <defs>
    <marker id="ahx" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker>
  </defs>
  <line x1="60" y1="95" x2="540" y2="95" stroke="currentColor" stroke-opacity="0.85" stroke-width="2" marker-end="url(#ahx)"/>
  <text x="300" y="88" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">main axis → justify-content (căn ngang, trái-phải)</text>
  <line x1="595" y1="70" x2="595" y2="222" stroke="currentColor" stroke-opacity="0.85" stroke-width="2" marker-end="url(#ahx)"/>
  <text x="612" y="150" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor" transform="rotate(90 612 150)">cross axis → align-items (căn dọc, trên-dưới)</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 320" role="img" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Flexbox một chiều so với CSS Grid hai chiều</title>
  <desc>So sánh: Flexbox xếp các con thành một chiều, một hàng nối tiếp nhau. CSS Grid xếp hai chiều thành lưới nhiều hàng nhiều cột. Bên dưới minh hoạ grid-template-columns: ba cột bằng nhau 1fr 1fr 1fr so với 2fr 1fr (cột đầu rộng gấp đôi).</desc>
  <text x="20" y="26" font-size="13" font-weight="700" fill="currentColor">Flexbox — một chiều (1 hàng)</text>
  <g>
    <rect x="20" y="38" width="80" height="44" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="110" y="38" width="80" height="44" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="200" y="38" width="80" height="44" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="290" y="38" width="80" height="44" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  </g>
  <text x="400" y="64" font-size="11.5" fill="currentColor" opacity="0.7">chỉ xếp theo một trục</text>
  <text x="20" y="124" font-size="13" font-weight="700" fill="currentColor">CSS Grid — hai chiều (hàng × cột)</text>
  <text x="360" y="124" font-size="12" font-weight="700" fill="currentColor">2fr 1fr</text>
  <g>
    <text x="20" y="146" font-size="11" fill="currentColor" opacity="0.7">grid-template-columns: 1fr 1fr 1fr</text>
    <rect x="20" y="154" width="100" height="46" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="128" y="154" width="100" height="46" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="236" y="154" width="100" height="46" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="20" y="208" width="100" height="46" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="128" y="208" width="100" height="46" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="236" y="208" width="100" height="46" rx="5" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="178" y="285" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">3 cột bằng nhau × 2 hàng</text>
  </g>
  <g>
    <rect x="380" y="154" width="180" height="46" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="470" y="182" font-size="11.5" text-anchor="middle" fill="currentColor">2fr</text>
    <rect x="568" y="154" width="72" height="46" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="604" y="182" font-size="11.5" text-anchor="middle" fill="currentColor">1fr</text>
    <rect x="380" y="208" width="180" height="46" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="568" y="208" width="72" height="46" rx="5" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.4"/>
    <text x="510" y="285" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">cột đầu rộng gấp đôi</text>
  </g>
</svg>

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
