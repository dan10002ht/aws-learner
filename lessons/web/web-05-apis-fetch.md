# Gọi API: fetch, JSON & async

Bạn đã biết viết HTML, CSS, JavaScript để làm trang web "đẹp" và "có tương tác". Nhưng tất cả dữ liệu cho tới giờ đều do **bạn tự gõ tay** vào code. Vậy làm sao trang web lấy được thời tiết hôm nay, danh sách sản phẩm, hay tỉ giá USD mới nhất? Câu trả lời là: nó **gọi API** để lấy dữ liệu từ server. Bài này dạy bạn làm đúng việc đó.

## API là gì? (góc nhìn người dùng)

API (Application Programming Interface — giao diện lập trình ứng dụng) nghe rất "to", nhưng với người mới bạn chỉ cần hiểu một câu:

> API là **một địa chỉ (URL) mà bạn gửi yêu cầu tới, và nó trả về dữ liệu cho bạn.**

Hãy tưởng tượng bạn vào **quán cà phê**:

- Bạn (trang web) không tự đi vào bếp pha cà phê.
- Bạn đưa **tờ menu** cho **người phục vụ** (API): "Cho tôi 1 cà phê sữa".
- Người phục vụ vào bếp (server + database), rồi mang ly cà phê (dữ liệu) ra cho bạn.

Bạn không cần biết bếp pha thế nào, dùng máy gì. Bạn chỉ cần biết **gọi món đúng cách** và **nhận kết quả**. API chính là "người phục vụ" đó — nó che giấu sự phức tạp bên trong và cho bạn một cách gọi đơn giản.

Ví dụ thật: có một API miễn phí trả về số liệu giả lập về người dùng. Bạn mở thử URL này ngay trên trình duyệt:

```
https://jsonplaceholder.typicode.com/users/1
```

Trình duyệt sẽ hiện ra một đống chữ có dấu ngoặc nhọn `{ }`. Đó chính là **dữ liệu** mà API trả về. Định dạng của nó gọi là JSON.

> 💡 Ghi nhớ: Gọi API = gửi yêu cầu tới một URL → nhận về dữ liệu. Bạn không cần biết server làm gì bên trong, chỉ cần biết gọi và đọc kết quả.

## JSON — ngôn ngữ chung để trao đổi dữ liệu

JSON (JavaScript Object Notation) là **định dạng văn bản** để biểu diễn dữ liệu. Nó trông gần giống y hệt object trong JavaScript mà bạn đã học:

```json
{
  "id": 1,
  "name": "Nguyễn Văn A",
  "email": "vana@example.com",
  "isActive": true,
  "hobbies": ["đọc sách", "đá bóng"],
  "address": {
    "city": "Hà Nội",
    "zipcode": "100000"
  }
}
```

Quy tắc của JSON:

| Kiểu dữ liệu | Ví dụ |
|---|---|
| Chuỗi (string) | `"Hà Nội"` — **luôn** trong dấu nháy kép |
| Số (number) | `1`, `3.14` — không có nháy |
| Boolean | `true`, `false` |
| Mảng (array) | `["a", "b"]` |
| Object lồng nhau | `{ "city": "Hà Nội" }` |
| Rỗng | `null` |

Khác biệt quan trọng so với object JS: **tên thuộc tính (key) trong JSON luôn phải có nháy kép**, và không được có dấu phẩy thừa ở cuối.

Vì JSON chỉ là **văn bản (text)**, máy tính nào cũng đọc được — dù server viết bằng Java, Python hay PHP. Đó là lý do JSON trở thành "ngôn ngữ chung" cho mọi API. Giống như tiếng Anh trong sân bay: ai cũng dùng được để giao tiếp.

Khi nhận text JSON, JavaScript cần "dịch" nó thành object thật để dùng được. Việc dịch đó do hàm `response.json()` lo (xem bên dưới).

> ⚠️ Lỗi người mới hay gặp: Nhầm JSON với object JS. JSON là **text** (chuỗi ký tự). Bạn không thể viết `jsonText.name` để lấy tên — phải "parse" (chuyển) nó thành object trước.

## fetch() — gửi yêu cầu lên server

`fetch()` là hàm có sẵn của trình duyệt để **gọi tới một URL**. Cách dùng đơn giản nhất:

```javascript
fetch("https://jsonplaceholder.typicode.com/users/1");
```

Nhưng có một vấn đề: gọi server mất **thời gian** (vài chục mili-giây tới vài giây). JavaScript không thể "đứng đợi và đóng băng cả trang" trong lúc chờ. Vì vậy `fetch()` trả về ngay một **lời hứa (Promise)** — nghĩa là: "Tôi chưa có kết quả ngay, nhưng tôi **hứa** sẽ có sau. Bạn cứ làm việc khác đi, xong tôi báo".

Hãy tưởng tượng bạn đặt đồ ăn qua app:

- Bạn bấm "Đặt món" → app đưa ngay cho bạn một **mã đơn hàng** (Promise).
- Bạn không phải đứng im trước cửa quán. Bạn đi làm việc khác.
- Lát sau shipper giao đồ (Promise hoàn thành) → bạn nhận món (dữ liệu).

## async / await — viết code chờ đợi cho dễ đọc

Để "đợi" một Promise mà code vẫn dễ đọc như thường, ta dùng cặp từ khóa `async` và `await`:

- `async` đặt trước hàm → đánh dấu "hàm này có việc cần chờ".
- `await` đặt trước lời gọi → "dừng ở đây, **đợi** có kết quả rồi mới đi tiếp".

```javascript
async function layNguoiDung() {
  // await: đợi server trả lời rồi mới chạy dòng tiếp theo
  const response = await fetch("https://jsonplaceholder.typicode.com/users/1");

  // response.json() cũng mất thời gian → cũng phải await
  const data = await response.json();

  console.log(data.name); // Bây giờ data đã là object thật, dùng .name được
}

layNguoiDung();
```

Đọc đoạn trên gần giống văn xuôi: "Đợi gọi URL → đợi chuyển thành object → in ra tên". Rất tự nhiên.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Luồng gọi API bất đồng bộ trên trục thời gian</title>
  <desc>Client gửi fetch và nhận ngay một Promise để làm việc khác; server xử lý rồi trả response sau; client await response.json() để có data. Ví như đặt đồ ăn: bấm đặt nhận mã đơn, làm việc khác, lát sau shipper giao món.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Gọi API bất đồng bộ — theo trục thời gian</text>
  <line x1="120" y1="60" x2="120" y2="270" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
  <line x1="600" y1="60" x2="600" y2="270" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
  <text x="120" y="52" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Client (JS)</text>
  <text x="600" y="52" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Server (API)</text>
  <text x="700" y="78" font-size="11" text-anchor="end" fill="currentColor" opacity="0.55">thời gian ↓</text>
  <g stroke="currentColor" fill="currentColor">
    <line x1="120" y1="90" x2="592" y2="90" stroke-width="1.6"/>
    <path d="M600 90 l-10 -5 v10 z"/>
  </g>
  <text x="356" y="84" font-size="11.5" text-anchor="middle" fill="currentColor">fetch(url) — gửi yêu cầu</text>
  <rect x="40" y="104" width="170" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="125" y="121" font-size="11" text-anchor="middle" fill="currentColor">nhận NGAY một Promise</text>
  <text x="125" y="136" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">(= mã đơn hàng)</text>
  <rect x="36" y="152" width="178" height="40" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="125" y="169" font-size="11" text-anchor="middle" fill="currentColor">JS đi làm việc khác</text>
  <text x="125" y="184" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">không đứng đợi, không treo</text>
  <rect x="510" y="108" width="180" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="600" y="125" font-size="11" text-anchor="middle" fill="currentColor">server xử lý</text>
  <text x="600" y="140" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">(bếp pha món)</text>
  <g stroke="currentColor" fill="currentColor">
    <line x1="600" y1="210" x2="128" y2="210" stroke-width="1.6"/>
    <path d="M120 210 l10 -5 v10 z"/>
  </g>
  <text x="356" y="204" font-size="11.5" text-anchor="middle" fill="currentColor">response về (shipper giao món)</text>
  <rect x="40" y="224" width="200" height="44" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="140" y="241" font-size="11" text-anchor="middle" fill="currentColor">await response.json()</text>
  <text x="140" y="256" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">→ có data, dùng được</text>
</svg>

> 💡 Ghi nhớ: `await` chỉ dùng được **bên trong** hàm có `async`. Có hai chỗ cần `await` khi gọi API: một cho `fetch()` (chờ server trả lời), một cho `.json()` (chờ đọc xong dữ liệu).

## Đọc response: status và dữ liệu

Khi `fetch()` trả về, bạn nhận một object `response`. Nó **chưa phải** là dữ liệu — nó là "cái phong bì" chứa thông tin về phản hồi:

- `response.ok` — `true` nếu mọi thứ ổn (mã trạng thái 200–299).
- `response.status` — **mã trạng thái HTTP** (con số). Vài mã hay gặp:

| Mã | Ý nghĩa |
|---|---|
| 200 | OK — thành công |
| 404 | Not Found — không tìm thấy (sai URL?) |
| 401 | Unauthorized — chưa đăng nhập / thiếu quyền |
| 500 | Server Error — server bị lỗi |

Muốn lấy **nội dung** bên trong phong bì, bạn gọi `response.json()` để chuyển text JSON thành object JavaScript.

## Ví dụ hoàn chỉnh: lấy và hiển thị lên trang

Đây là một file HTML **chạy được ngay**. Lưu thành `index.html`, mở bằng trình duyệt và bấm nút.

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Thử gọi API</title>
  <style>
    body { font-family: sans-serif; max-width: 500px; margin: 40px auto; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-top: 16px; }
    .loading { color: #888; }
    .error { color: #c00; }
  </style>
</head>
<body>
  <h1>Danh bạ người dùng</h1>
  <button id="btn">Tải dữ liệu</button>
  <div id="ketqua"></div>

  <script>
    const btn = document.getElementById("btn");
    const box = document.getElementById("ketqua");

    async function taiDuLieu() {
      // 1. Loading state: báo cho người dùng "đang chờ"
      box.innerHTML = '<p class="loading">Đang tải...</p>';

      const url = "https://jsonplaceholder.typicode.com/users";
      const response = await fetch(url);
      const danhSach = await response.json(); // danhSach là một MẢNG object

      // 2. Render: dựng HTML từ dữ liệu
      box.innerHTML = danhSach
        .map(u => `
          <div class="card">
            <strong>${u.name}</strong><br>
            Email: ${u.email}<br>
            Thành phố: ${u.address.city}
          </div>
        `)
        .join("");
    }

    btn.addEventListener("click", taiDuLieu);
  </script>
</body>
</html>
```

**Thử ngay:** Mở file, bấm "Tải dữ liệu". Bạn sẽ thấy 10 thẻ thông tin hiện ra. Toàn bộ dữ liệu này **không nằm trong code của bạn** — nó đến từ server qua API. Hãy đổi URL thành `.../users/1` (một người) và sửa code để in một người duy nhất.

Lưu ý kỹ thuật `.map()`: API trả về một **mảng**, ta dùng `.map()` để biến mỗi phần tử thành một đoạn HTML, rồi `.join("")` nối tất cả lại thành một chuỗi để gán vào `innerHTML`.

## Xử lý lỗi: try / catch và kiểm tra status

Đoạn code trên có một điểm yếu chết người: **nó giả định mọi thứ luôn thành công**. Đời thực thì không. Mạng có thể rớt, URL có thể sai, server có thể chết. Nếu không xử lý, trang sẽ "đứng hình" và người dùng chỉ thấy chữ "Đang tải..." mãi mãi.

Ta dùng `try / catch` — cơ chế "thử và bắt lỗi" của JavaScript:

- Code trong `try` chạy bình thường.
- Nếu **bất kỳ dòng nào lỗi**, JS nhảy ngay xuống `catch` để bạn xử lý.

Một bẫy quan trọng: **`fetch()` KHÔNG tự coi 404 hay 500 là lỗi.** Với fetch, miễn là server có trả lời (dù trả lời "không tìm thấy") thì nó vẫn coi là "thành công". Vì vậy **bạn phải tự kiểm tra `response.ok`** và tự ném lỗi.

```javascript
async function taiDuLieuAnToan() {
  box.innerHTML = '<p class="loading">Đang tải...</p>';

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    // Tự kiểm tra status — fetch không tự báo lỗi 404/500
    if (!response.ok) {
      throw new Error(`Server trả về lỗi ${response.status}`);
    }

    const danhSach = await response.json();

    box.innerHTML = danhSach
      .map(u => `<div class="card"><strong>${u.name}</strong></div>`)
      .join("");

  } catch (loi) {
    // Bắt mọi lỗi: mất mạng, sai URL, status không ok...
    box.innerHTML = `<p class="error">Có lỗi: ${loi.message}</p>`;
    console.error(loi);
  }
}
```

> ⚠️ Lỗi người mới hay gặp: Tưởng `fetch()` tự báo lỗi khi gặp 404/500. **KHÔNG.** Bạn phải tự `if (!response.ok) throw new Error(...)`, nếu không code sẽ chạy tiếp với dữ liệu rỗng/sai và sinh ra lỗi khó hiểu ở dòng khác.

> 💡 Ghi nhớ: Mọi lần gọi API thật đều nên có đủ 3 thứ: **loading state** (báo đang chờ), **kiểm tra status** (`response.ok`), và **try/catch** (bắt lỗi mạng). Thiếu một cái là trải nghiệm người dùng sẽ tệ khi có sự cố.

## Loading state — đừng để người dùng "mù"

Bạn đã thấy ở trên: ngay đầu hàm, ta đặt `box.innerHTML = 'Đang tải...'`. Đây là **loading state** (trạng thái đang tải). Vì gọi API mất thời gian, nếu màn hình **không thay đổi gì** sau khi bấm nút, người dùng sẽ tưởng nút hỏng và bấm liên tục.

Vòng đời chuẩn của một lần gọi API gồm 3 trạng thái:

1. **Đang tải** → hiện "Đang tải..." hoặc spinner.
2. **Thành công** → hiện dữ liệu.
3. **Lỗi** → hiện thông báo lỗi rõ ràng.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời 3 trạng thái của một lần gọi API</title>
  <desc>Bắt đầu ở trạng thái Đang tải (loading); từ đó rẽ nhánh thành Thành công (hiện dữ liệu) nếu nhận được dữ liệu hợp lệ, hoặc Lỗi (hiện thông báo) nếu mạng rớt, sai URL hay status không ok.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Vòng đời một lần gọi API — 3 trạng thái</text>
  <circle cx="80" cy="135" r="9" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="80" y="165" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">bấm gọi</text>
  <g stroke="currentColor" fill="currentColor">
    <line x1="89" y1="135" x2="158" y2="135" stroke-width="1.6"/>
    <path d="M166 135 l-10 -5 v10 z"/>
  </g>
  <rect x="166" y="108" width="156" height="54" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="244" y="132" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Đang tải (loading)</text>
  <text x="244" y="150" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">hiện "Đang tải..." / spinner</text>
  <g stroke="currentColor" fill="currentColor">
    <path d="M322 122 C 400 88, 430 70, 488 70" fill="none" stroke-width="1.6"/>
    <path d="M496 70 l-11 -4 v9 z"/>
    <path d="M322 148 C 400 182, 430 200, 488 200" fill="none" stroke-width="1.6"/>
    <path d="M496 200 l-11 -4 v9 z"/>
  </g>
  <text x="404" y="92" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">nhận được dữ liệu</text>
  <text x="404" y="178" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">mạng rớt / !response.ok</text>
  <rect x="500" y="44" width="200" height="54" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="600" y="68" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Thành công</text>
  <text x="600" y="86" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">hiện dữ liệu lên trang</text>
  <rect x="500" y="174" width="200" height="54" rx="10" fill="#ef4444" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="600" y="198" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Lỗi</text>
  <text x="600" y="216" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">hiện thông báo lỗi rõ ràng</text>
</svg>

Hãy luôn nghĩ đủ cả 3 trạng thái này mỗi khi gọi API. Đó là khác biệt giữa một trang "demo cho vui" và một trang "dùng thật được".

## CORS — con lỗi bạn chắc chắn sẽ gặp

Sớm muộn, khi gọi một API nào đó, bạn sẽ thấy lỗi đỏ trong Console kiểu:

```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

CORS (Cross-Origin Resource Sharing — chia sẻ tài nguyên giữa các nguồn khác nhau) là một **cơ chế bảo mật của trình duyệt**. Hiểu đơn giản:

> Trình duyệt **không cho** trang web của bạn (ví dụ ở `my-site.com`) tự do lấy dữ liệu từ một server khác (`api-khac.com`), **trừ khi server đó cho phép** một cách rõ ràng.

Analogy: bạn (trang web) muốn vào nhà hàng xóm (server khác) lấy đồ. Bảo vệ (trình duyệt) chặn lại: "Chủ nhà kia có ghi tên anh vào danh sách khách mời không?". Nếu server không "ghi tên" trang của bạn vào danh sách cho phép, trình duyệt sẽ chặn.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>CORS như người gác cổng giữa trang web, trình duyệt và server khác</title>
  <desc>Trang my-site.com xin dữ liệu từ api-khac.com. Trình duyệt đóng vai bảo vệ: gửi yêu cầu sang server kia, nếu response có header cho phép nguồn của bạn thì trả dữ liệu, nếu không có thì trình duyệt chặn. Quyết định cho phép do server kia, JavaScript không tắt được.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">CORS — người gác cổng giữa các nguồn</text>
  <rect x="20" y="44" width="170" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="105" y="62" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">my-site.com</text>
  <text x="105" y="77" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">trang web (JS)</text>
  <rect x="275" y="44" width="170" height="40" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="62" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Trình duyệt</text>
  <text x="360" y="77" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">(bảo vệ / gác cổng)</text>
  <rect x="530" y="44" width="170" height="40" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="615" y="62" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">api-khac.com</text>
  <text x="615" y="77" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">server khác</text>
  <g stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4">
    <line x1="105" y1="84" x2="105" y2="320"/>
    <line x1="360" y1="84" x2="360" y2="320"/>
    <line x1="615" y1="84" x2="615" y2="320"/>
  </g>
  <g stroke="currentColor" fill="currentColor">
    <line x1="105" y1="112" x2="352" y2="112" stroke-width="1.6"/>
    <path d="M360 112 l-10 -5 v10 z"/>
  </g>
  <text x="232" y="106" font-size="11" text-anchor="middle" fill="currentColor">fetch("api-khac.com")</text>
  <g stroke="currentColor" fill="currentColor">
    <line x1="360" y1="142" x2="607" y2="142" stroke-width="1.6"/>
    <path d="M615 142 l-10 -5 v10 z"/>
  </g>
  <text x="488" y="136" font-size="11" text-anchor="middle" fill="currentColor">xin dữ liệu (kèm Origin)</text>
  <g stroke="currentColor" fill="currentColor">
    <line x1="615" y1="172" x2="368" y2="172" stroke-width="1.6"/>
    <path d="M360 172 l10 -5 v10 z"/>
  </g>
  <text x="488" y="166" font-size="11" text-anchor="middle" fill="currentColor">response + header cho phép?</text>
  <rect x="250" y="190" width="220" height="46" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="208" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">CÓ ghi tên nguồn vào DS</text>
  <text x="360" y="224" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">→ trình duyệt cho qua, JS có data</text>
  <rect x="250" y="246" width="220" height="46" rx="8" fill="#ef4444" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="264" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">KHÔNG có header cho phép</text>
  <text x="360" y="280" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">→ trình duyệt CHẶN (blocked by CORS)</text>
  <text x="16" y="318" font-size="10.5" fill="currentColor" opacity="0.7">Do server kia quyết định cho phép — JavaScript phía bạn không tắt được CORS.</text>
</svg>

Điều quan trọng cần nhớ với người mới:

- Lỗi CORS là do **server** quyết định cho phép hay không — **bạn không sửa được từ phía code JavaScript của mình**. Không có dòng JS nào "tắt CORS" được.
- Các public API tử tế (như `jsonplaceholder`) đã bật CORS sẵn, nên ví dụ trong bài chạy ngon.
- Nếu gặp CORS với API của người khác: hoặc dùng API có hỗ trợ CORS, hoặc cần một **server trung gian (proxy)** của riêng bạn gọi hộ — đây là chủ đề nâng cao hơn.

> ⚠️ Lỗi người mới hay gặp: Thấy lỗi CORS rồi loay hoay sửa JavaScript hàng giờ. Vô ích — CORS do server bên kia kiểm soát. Hãy kiểm tra: API này có công khai và hỗ trợ CORS không? Nếu không, đổi API hoặc dùng proxy.

## Tóm tắt

- **API** là một URL bạn gửi yêu cầu tới để nhận dữ liệu từ server — như gọi món qua người phục vụ.
- **JSON** là định dạng text để trao đổi dữ liệu; phải `response.json()` để chuyển thành object dùng được.
- **fetch()** trả về một **Promise** vì gọi server mất thời gian; dùng **async/await** để chờ một cách dễ đọc.
- Luôn kiểm tra **`response.ok` / `response.status`** — fetch không tự báo lỗi 404/500.
- Bọc trong **try/catch** để bắt lỗi mạng, và luôn có **loading state**.
- **CORS** là cơ chế bảo mật của trình duyệt; do server quyết định, không sửa được từ JS phía bạn.

**Bài tập:** Dùng API `https://jsonplaceholder.typicode.com/posts` (trả về danh sách bài viết, mỗi bài có `title` và `body`). Hãy viết một trang hiển thị 10 bài viết đầu tiên dưới dạng thẻ card, có đủ loading state và try/catch xử lý lỗi.
