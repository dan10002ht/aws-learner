# JavaScript & DOM: làm trang động

Cho đến giờ, bạn đã biết HTML dựng cấu trúc trang và CSS làm trang đẹp. Nhưng cả hai đều **tĩnh** — trang hiển thị ra sao thì giữ nguyên như vậy. Muốn trang **phản ứng** lại người dùng (bấm nút, gõ phím, gửi form) thì bạn cần **JavaScript**.

Trong bài này, bạn sẽ học cách JavaScript "với tay" vào trang HTML để đọc, sửa, thêm và xoá nội dung — biến một trang đứng yên thành trang động.

## JavaScript chạy ở đâu?

JavaScript (JS) là ngôn ngữ lập trình chạy **bên trong trình duyệt** (browser). Mỗi trình duyệt (Chrome, Firefox, Safari...) có một bộ máy chạy JS, nên khi người dùng mở trang web, đoạn code JS của bạn chạy ngay trên máy của họ.

Cách nhúng JS vào trang HTML phổ biến nhất là dùng thẻ `<script>`:

```html
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Trang đầu tiên có JS</title>
  </head>
  <body>
    <h1 id="tieu-de">Xin chào</h1>

    <!-- Đặt script ở CUỐI body -->
    <script>
      console.log("JavaScript đang chạy!");
    </script>
  </body>
</html>
```

> 💡 Ghi nhớ: Mở **Developer Tools** (phím `F12` hoặc chuột phải → Inspect → tab **Console**) để xem kết quả `console.log` và thử code JS trực tiếp. Đây là người bạn thân nhất của bạn khi học JS.

## DOM là gì?

Khi trình duyệt đọc file HTML, nó không giữ HTML dưới dạng văn bản thô. Nó dựng lên một **cây các đối tượng** trong bộ nhớ, gọi là **DOM** (Document Object Model). Mỗi thẻ HTML trở thành một **node** (nút) trong cây này.

Ví dụ đoạn HTML sau:

```html
<body>
  <h1>Tiêu đề</h1>
  <p>Một <strong>đoạn</strong> văn.</p>
</body>
```

Sẽ tạo ra cây DOM như sau:

```
body
├── h1
│   └── "Tiêu đề"
└── p
    ├── "Một "
    ├── strong
    │   └── "đoạn"
    └── " văn."
```

JavaScript truy cập cây này qua một đối tượng toàn cục tên là `document`. Từ `document`, bạn có thể tìm bất kỳ phần tử nào, đọc nó, sửa nó, hay tạo node mới.

> 💡 Ghi nhớ: HTML là **bản vẽ ban đầu**, còn DOM là **bản dựng sống** trong bộ nhớ trình duyệt. JS sửa DOM, và trình duyệt vẽ lại trang theo DOM mới — đó là cách trang "động".

## Chọn phần tử

Trước khi sửa một phần tử, bạn phải **chọn** (select) được nó. Có vài cách thông dụng:

| Phương thức | Trả về | Ví dụ |
| --- | --- | --- |
| `getElementById("id")` | 1 phần tử có `id` đó | `document.getElementById("tieu-de")` |
| `querySelector("css")` | phần tử **đầu tiên** khớp CSS selector | `document.querySelector(".item")` |
| `querySelectorAll("css")` | **tất cả** phần tử khớp (dạng danh sách) | `document.querySelectorAll("li")` |

`querySelector` mạnh và linh hoạt nhất vì nó dùng đúng cú pháp **CSS selector** mà bạn đã học:

```javascript
// Chọn theo id (dấu #)
const tieuDe = document.querySelector("#tieu-de");

// Chọn theo class (dấu .)
const nut = document.querySelector(".btn-primary");

// Chọn theo thẻ
const doanVan = document.querySelector("p");

// Chọn tất cả các <li>
const danhSach = document.querySelectorAll("li");
```

> ⚠️ Lỗi người mới hay gặp: Nếu chọn không trúng phần tử nào, `querySelector` trả về `null`. Khi đó mọi thao tác tiếp theo (như `null.textContent`) sẽ báo lỗi `Cannot read properties of null`. Luôn kiểm tra lại selector và xem phần tử đã tồn tại chưa.

## Sửa nội dung, style và class

Khi đã có phần tử, bạn có thể thay đổi nó qua các thuộc tính (property).

### Sửa nội dung văn bản với `textContent`

```javascript
const tieuDe = document.querySelector("#tieu-de");
tieuDe.textContent = "Xin chào, thế giới!";
```

Dòng trên đổi luôn chữ hiển thị trên trang. **Thử ngay**: mở Console, gõ lệnh trên với một id có thật trong trang của bạn và xem tiêu đề đổi.

### Sửa style trực tiếp

```javascript
const tieuDe = document.querySelector("#tieu-de");
tieuDe.style.color = "tomato";
tieuDe.style.fontSize = "32px";
```

Lưu ý: trong JS, tên thuộc tính CSS viết theo kiểu **camelCase**. `font-size` (CSS) trở thành `fontSize` (JS), `background-color` trở thành `backgroundColor`.

### Thêm/bớt class với `classList`

Sửa `style` trực tiếp tiện cho thay đổi nhỏ, nhưng cách **tốt hơn** là định nghĩa class trong CSS rồi bật/tắt class bằng JS:

```css
.active {
  background-color: gold;
  font-weight: bold;
}
```

```javascript
const nut = document.querySelector(".btn");

nut.classList.add("active");     // thêm class
nut.classList.remove("active");  // bớt class
nut.classList.toggle("active");  // có thì bỏ, không có thì thêm
nut.classList.contains("active"); // true/false
```

> 💡 Ghi nhớ: Ưu tiên `classList` hơn `style`. CSS lo phần "trông như thế nào", JS chỉ lo "khi nào bật class". Code sạch hơn và dễ bảo trì hơn nhiều.

## Sự kiện (Events)

Trang động nghĩa là trang **phản ứng** với hành động của người dùng: bấm chuột, gõ phím, gửi form... Mỗi hành động đó tạo ra một **event** (sự kiện). Bạn dùng `addEventListener` để "lắng nghe" sự kiện và chạy một hàm khi nó xảy ra.

Cú pháp:

```javascript
phanTu.addEventListener("tên-sự-kiện", function (event) {
  // code chạy khi sự kiện xảy ra
});
```

Một số sự kiện thường gặp:

| Sự kiện | Xảy ra khi |
| --- | --- |
| `click` | người dùng bấm vào phần tử |
| `submit` | một `<form>` được gửi đi |
| `input` | giá trị ô nhập (`<input>`, `<textarea>`) thay đổi |
| `keydown` | một phím được nhấn xuống |

### Ví dụ: click

```javascript
const nut = document.querySelector("#nut-chao");

nut.addEventListener("click", function () {
  alert("Bạn vừa bấm nút!");
});
```

### Ví dụ: input (đọc giá trị người dùng gõ)

```javascript
const o = document.querySelector("#o-nhap");

o.addEventListener("input", function (event) {
  console.log("Đang gõ:", event.target.value);
});
```

`event.target` chính là phần tử gây ra sự kiện, và `.value` là nội dung hiện tại của ô nhập.

### Ví dụ: submit (và chặn reload)

Mặc định, khi gửi một `<form>`, trình duyệt **tải lại trang**. Để xử lý form bằng JS, ta gọi `event.preventDefault()` để chặn hành vi mặc định đó:

```javascript
const form = document.querySelector("#form-ten");

form.addEventListener("submit", function (event) {
  event.preventDefault(); // chặn reload trang
  const o = document.querySelector("#o-ten");
  console.log("Tên đã nhập:", o.value);
});
```

> ⚠️ Lỗi người mới hay gặp: Quên `event.preventDefault()` trong sự kiện `submit`. Trang sẽ reload ngay lập tức, mọi thứ JS làm bị "xoá sạch", và bạn tưởng code mình sai trong khi thực ra nó chạy đúng nhưng trang đã nạp lại.

## Tạo và xoá phần tử

JS không chỉ sửa phần tử có sẵn, mà còn tạo ra phần tử mới và gắn vào DOM.

```javascript
// 1. Tạo một phần tử mới (chưa nằm trên trang)
const li = document.createElement("li");

// 2. Đặt nội dung
li.textContent = "Mục mới";

// 3. Gắn vào một phần tử cha đang có trên trang
const danhSach = document.querySelector("#ds");
danhSach.appendChild(li);
```

Để **xoá** một phần tử:

```javascript
li.remove(); // xoá chính nó khỏi DOM
```

> 💡 Ghi nhớ: 3 bước tạo phần tử luôn là **create → set content → append**. Nếu quên bước `appendChild`, phần tử có tồn tại trong bộ nhớ nhưng **không hiện trên trang**, vì nó chưa được gắn vào cây DOM.

## Ví dụ hoàn chỉnh 1: Nút đếm

Ghép tất cả lại. Đây là một nút bấm để đếm số lần click. Tạo file HTML và mở bằng trình duyệt để **thử ngay**:

```html
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Nút đếm</title>
  </head>
  <body>
    <h1>Bạn đã bấm <span id="so">0</span> lần</h1>
    <button id="nut">Bấm tôi</button>

    <script>
      let demSo = 0;
      const span = document.querySelector("#so");
      const nut = document.querySelector("#nut");

      nut.addEventListener("click", function () {
        demSo = demSo + 1;
        span.textContent = demSo;
      });
    </script>
  </body>
</html>
```

Cách hoạt động:
1. Biến `demSo` lưu số lần bấm, bắt đầu từ `0`.
2. Mỗi lần `click`, ta tăng `demSo` lên 1.
3. Cập nhật `span.textContent` để hiển thị số mới lên trang.

## Ví dụ hoàn chỉnh 2: Mini todo list

Ví dụ kinh điển khi học DOM: nhập một việc cần làm, bấm Thêm (hoặc Enter) để đưa vào danh sách, và bấm vào một việc để xoá nó.

```html
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>Mini Todo</title>
    <style>
      .xong {
        text-decoration: line-through;
        color: gray;
      }
      li {
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <h1>Việc cần làm</h1>

    <form id="form-todo">
      <input id="o-viec" type="text" placeholder="Nhập việc..." />
      <button type="submit">Thêm</button>
    </form>

    <ul id="ds-todo"></ul>

    <script>
      const form = document.querySelector("#form-todo");
      const o = document.querySelector("#o-viec");
      const ds = document.querySelector("#ds-todo");

      form.addEventListener("submit", function (event) {
        event.preventDefault(); // chặn reload

        const noiDung = o.value.trim();
        if (noiDung === "") return; // bỏ qua nếu rỗng

        // Tạo phần tử <li>
        const li = document.createElement("li");
        li.textContent = noiDung;

        // Bấm vào việc -> gạch ngang (đánh dấu xong)
        li.addEventListener("click", function () {
          li.classList.toggle("xong");
        });

        // Bấm nút xoá bên trong li
        const nutXoa = document.createElement("button");
        nutXoa.textContent = "Xoá";
        nutXoa.addEventListener("click", function (event) {
          event.stopPropagation(); // không kích hoạt click của li
          li.remove();
        });

        li.appendChild(nutXoa);
        ds.appendChild(li);

        o.value = ""; // xoá ô nhập để gõ việc tiếp theo
        o.focus();
      });
    </script>
  </body>
</html>
```

Các kỹ thuật xuất hiện trong ví dụ này:

| Kỹ thuật | Vai trò |
| --- | --- |
| `event.preventDefault()` | chặn form reload trang |
| `o.value.trim()` | đọc và làm sạch chuỗi người dùng nhập |
| `createElement` + `appendChild` | tạo và gắn `<li>` mới |
| `classList.toggle("xong")` | bật/tắt trạng thái đã xong |
| `li.remove()` | xoá việc khỏi danh sách |
| `event.stopPropagation()` | tránh click nút xoá lại lan ra click của `<li>` |

**Thử ngay**: thêm vài việc, bấm vào một việc để gạch ngang, rồi bấm Xoá. Bạn vừa làm xong một ứng dụng tương tác thật sự chỉ với HTML + JS.

## Lỗi kinh điển: script chạy trước khi DOM load

Đây là lỗi gần như ai mới học cũng dính. Hãy xem đoạn code sau:

```html
<head>
  <script>
    // Chạy NGAY khi trình duyệt đọc tới đây
    const nut = document.querySelector("#nut");
    nut.addEventListener("click", function () {
      alert("hi");
    });
  </script>
</head>
<body>
  <button id="nut">Bấm</button>
</body>
```

Đoạn này **sẽ báo lỗi**. Vì sao? Trình duyệt đọc HTML từ trên xuống. Khi chạy tới `<script>` trong `<head>`, phần `<button>` **chưa được dựng**, nên `document.querySelector("#nut")` trả về `null`, và `null.addEventListener` báo lỗi.

Có **hai cách sửa** phổ biến:

### Cách 1: Đặt script ở cuối `<body>`

Đặt thẻ `<script>` ngay trước `</body>`. Lúc đó toàn bộ phần tử phía trên đã được dựng xong:

```html
<body>
  <button id="nut">Bấm</button>

  <!-- script ở đây, sau khi nút đã tồn tại -->
  <script>
    const nut = document.querySelector("#nut");
    nut.addEventListener("click", function () {
      alert("hi");
    });
  </script>
</body>
```

### Cách 2: Đợi sự kiện `DOMContentLoaded`

Nếu buộc phải để script trong `<head>` (hoặc trong file `.js` riêng nạp ở `<head>`), hãy bọc code trong sự kiện `DOMContentLoaded` — sự kiện này bắn ra khi DOM đã dựng xong:

```javascript
document.addEventListener("DOMContentLoaded", function () {
  const nut = document.querySelector("#nut");
  nut.addEventListener("click", function () {
    alert("hi");
  });
});
```

> ⚠️ Lỗi người mới hay gặp: Code đúng nhưng "không chạy" và Console báo `null`. 90% trường hợp là do script chạy trước khi DOM load. Hãy kiểm tra: script có nằm cuối `<body>` không, hoặc đã bọc trong `DOMContentLoaded` chưa.

## Tóm tắt

| Việc cần làm | Công cụ |
| --- | --- |
| Chọn 1 phần tử | `getElementById`, `querySelector` |
| Chọn nhiều phần tử | `querySelectorAll` |
| Đổi nội dung | `textContent` |
| Đổi giao diện | `style.*`, `classList.add/remove/toggle` |
| Phản ứng người dùng | `addEventListener("click" / "submit" / "input", ...)` |
| Chặn form reload | `event.preventDefault()` |
| Tạo phần tử | `createElement` + `appendChild` |
| Xoá phần tử | `.remove()` |
| Tránh lỗi DOM chưa load | script cuối `<body>` hoặc `DOMContentLoaded` |

Bạn vừa nắm những viên gạch cốt lõi để làm trang web tương tác. Mọi framework hiện đại (React, Vue...) đều dựng trên đúng những khái niệm này. Hãy mở Console lên và **thử ngay** từng đoạn code trong bài, đó là cách học JS nhanh nhất.
