# Tư duy component & SPA

Bạn đã viết được HTML, style bằng CSS, thao tác DOM bằng JS và gọi `fetch`. Bước tiếp theo để "lên đời" là thay đổi **cách suy nghĩ**: từ việc ra lệnh cho trình duyệt từng bước (imperative) sang mô tả giao diện trông như thế nào (declarative), và tổ chức UI thành các **component** tái sử dụng. Đây chính là tư duy nền tảng của mọi framework hiện đại (React, Vue, Svelte...).

Bài này không dạy sâu React. Mục tiêu là: hiểu **vì sao** framework ra đời, dựng một component nhỏ bằng vanilla JS, rồi đối chiếu với React để bạn "thông" khái niệm trước khi học framework thật.

## Component là gì?

**Component** là một mảnh UI độc lập, tái sử dụng được, gồm: cấu trúc (HTML), giao diện (CSS) và hành vi (JS) — đóng gói chung một chỗ. Bạn truyền dữ liệu vào qua **props** (properties), component trả về phần giao diện tương ứng.

Hãy nghĩ component như một **hàm**: đầu vào là props, đầu ra là UI.

```
UI = f(props, state)
```

Ví dụ một thẻ người dùng (`UserCard`) nhận props là `name` và `role`, rồi vẽ ra giao diện. Cùng một component, đổi props là ra giao diện khác nhau — đó là **tái sử dụng**.

> 💡 Ghi nhớ: Component = hàm nhận `props` → trả về UI. Cùng input thì cùng output. Đây là lý do component dễ test, dễ tái dùng và dễ suy luận.

## Từ DOM thủ công đến declarative UI

Cách bạn đang làm là **imperative** — ra lệnh từng bước: tạo element, set thuộc tính, append vào cha, rồi tự tay cập nhật khi dữ liệu đổi.

```javascript
// IMPERATIVE: tự tay dựng và cập nhật từng node
const card = document.createElement("div");
card.className = "user-card";

const nameEl = document.createElement("h3");
nameEl.textContent = "An Nguyễn";
card.appendChild(nameEl);

const roleEl = document.createElement("p");
roleEl.textContent = "Frontend Dev";
card.appendChild(roleEl);

document.body.appendChild(card);

// Muốn đổi tên? Phải tìm đúng node rồi sửa tay:
nameEl.textContent = "Bình Trần";
```

Vấn đề: khi UI phức tạp (danh sách, form, trạng thái lồng nhau), bạn phải tự nhớ **node nào cần sửa khi dữ liệu nào đổi**. Code rối, dễ sai, khó bảo trì.

**Declarative** đảo ngược: bạn chỉ mô tả "với dữ liệu này, UI trông thế nào", còn việc cập nhật DOM để khớp thì để hệ thống lo.

```javascript
// DECLARATIVE: mô tả UI từ dữ liệu
function UserCard(props) {
  return `
    <div class="user-card">
      <h3>${props.name}</h3>
      <p>${props.role}</p>
    </div>
  `;
}

// Render = lấy mô tả gắn vào DOM
document.querySelector("#app").innerHTML = UserCard({
  name: "An Nguyễn",
  role: "Frontend Dev",
});
```

Đổi dữ liệu? Gọi lại hàm với props mới, không cần biết node nào phải sửa.

| | Imperative (thủ công) | Declarative |
|---|---|---|
| Bạn viết | Từng bước thao tác DOM | UI trông thế nào theo dữ liệu |
| Khi dữ liệu đổi | Tự tìm node để sửa | Render lại từ dữ liệu |
| Độ phức tạp | Tăng nhanh theo UI | Giữ ở mức quản lý được |
| Ví dụ | `appendChild`, `setAttribute` | `return template` |

## State & ý tưởng re-render

**Props** là dữ liệu truyền **từ ngoài vào** (cha → con), component không tự sửa. **State** là dữ liệu **nội bộ** mà component sở hữu và có thể thay đổi theo thời gian (ví dụ: số lần click, nội dung input, đang loading hay không).

Ý tưởng cốt lõi của UI hiện đại:

> Khi **state thay đổi**, UI được **render lại** để khớp với state mới.

Bạn không sửa DOM trực tiếp nữa. Bạn sửa **state**, rồi yêu cầu "vẽ lại". Một component đếm số đơn giản theo tư duy này:

```javascript
function createCounter(mount) {
  let state = { count: 0 }; // state nội bộ

  function setState(next) {
    state = { ...state, ...next };
    render(); // state đổi -> vẽ lại
  }

  function render() {
    mount.innerHTML = `
      <div class="counter">
        <span>Số đếm: ${state.count}</span>
        <button id="inc">+1</button>
      </div>
    `;
    mount.querySelector("#inc").onclick = () =>
      setState({ count: state.count + 1 });
  }

  render(); // render lần đầu
}

createCounter(document.querySelector("#app"));
```

Để ý mẫu hình lặp lại: **đổi state → render lại → giao diện tự khớp**. Bạn không bao giờ viết `span.textContent = ...`. Đây đúng là tư duy mà React/Vue tự động hoá.

> ⚠️ Bẫy: Cách `innerHTML = ...` ở trên **xoá và dựng lại toàn bộ** mỗi lần render. Mọi state của DOM (focus ô input, vị trí cuộn, animation) bị mất, và với danh sách lớn thì rất chậm. Đây chính là vấn đề mà **Virtual DOM** sinh ra để giải quyết.

## Virtual DOM — ý tưởng

Render lại toàn bộ thì đơn giản nhưng tốn kém. Thao tác DOM thật là **chậm** so với chạy JS thuần. Giải pháp của React: dùng **Virtual DOM**.

Virtual DOM là **bản mô tả UI bằng object JS** (nhẹ, nhanh), không phải DOM thật. Quy trình:

1. State đổi → tạo cây Virtual DOM **mới** (chỉ là object JS).
2. **So sánh** (diffing) cây mới với cây cũ.
3. Tính ra **danh sách thay đổi tối thiểu** cần áp dụng.
4. Chỉ chạm vào những **node DOM thật** thực sự đổi (patch).

```javascript
// Virtual DOM chỉ là object mô tả node, KHÔNG phải DOM thật
const vnode = {
  tag: "div",
  props: { class: "user-card" },
  children: [
    { tag: "h3", children: ["An Nguyễn"] },
    { tag: "p", children: ["Frontend Dev"] },
  ],
};
// Framework so sánh object cũ vs mới -> chỉ sửa phần khác biệt trên DOM thật
```

Nhờ đó bạn vẫn viết kiểu declarative "vẽ lại tất cả", nhưng framework chỉ cập nhật phần tối thiểu — vừa dễ viết vừa nhanh.

> 💡 Ghi nhớ: Virtual DOM = "vẽ lại trên giấy nháp (object JS) rồi chỉ sửa đúng chỗ khác biệt trên giấy thật (DOM)". Bạn được sự đơn giản của declarative mà không trả giá hiệu năng.

## SPA vs MPA

**MPA (Multi Page Application)** — kiểu web truyền thống: mỗi lần bấm link, trình duyệt **tải một trang HTML mới** từ server, vẽ lại toàn bộ.

**SPA (Single Page Application)** — tải **một** trang HTML duy nhất lúc đầu, sau đó JS **tự thay đổi nội dung** ngay trên trình duyệt mà không reload. Dữ liệu mới lấy về qua `fetch` (API), JS dựng lại phần UI cần thiết.

| | MPA (đa trang) | SPA (đơn trang) |
|---|---|---|
| Chuyển trang | Server trả HTML mới, reload | JS đổi nội dung, không reload |
| Tải lần đầu | Nhẹ, nhanh | Nặng hơn (tải JS bundle) |
| Sau đó | Mỗi click chờ server | Mượt, như app desktop |
| SEO | Dễ (mặc định) | Cần xử lý thêm (SSR) |
| Ví dụ | Wikipedia, blog | Gmail, Trello, Figma |

SPA cho trải nghiệm mượt như app native, nhưng đổi lại: bundle JS lớn, SEO khó hơn, và bạn phải **tự quản lý việc chuyển trang** — đó là client-side routing.

## Client-side routing

Trong MPA, URL `/about` ứng với một file/route trên server. Trong SPA, **trình duyệt không gọi server** khi bạn đổi route — JS phải nghe URL đổi rồi render component tương ứng. Dùng **History API** (`history.pushState`) để đổi URL mà không reload:

```javascript
const routes = {
  "/": () => "<h1>Trang chủ</h1>",
  "/about": () => "<h1>Giới thiệu</h1>",
  "/contact": () => "<h1>Liên hệ</h1>",
};

function render() {
  const view = routes[location.pathname] || (() => "<h1>404</h1>");
  document.querySelector("#app").innerHTML = view();
}

// Bắt click trên link nội bộ, đổi URL mà KHÔNG reload
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-link]");
  if (!link) return;
  e.preventDefault();
  history.pushState(null, "", link.href); // đổi URL
  render();                               // render lại view
});

// Nút Back/Forward của trình duyệt
window.addEventListener("popstate", render);

render(); // render lần đầu
```

```html
<nav>
  <a href="/" data-link>Trang chủ</a>
  <a href="/about" data-link>Giới thiệu</a>
  <a href="/contact" data-link>Liên hệ</a>
</nav>
<div id="app"></div>
```

> ⚠️ Bẫy: Vì server không biết về route phía client, gõ thẳng `tên-miền/about` rồi Enter sẽ làm server trả 404. Cấu hình server **fallback mọi đường dẫn về `index.html`** để SPA tự xử lý route. Đây là lỗi deploy SPA kinh điển.

Trong React/Vue bạn không tự viết đoạn này — dùng thư viện như **React Router** / **Vue Router** đã đóng gói sẵn.

## Khi nào cần framework, khi nào vanilla JS?

Framework không miễn phí: thêm bundle, thêm khái niệm phải học, thêm bước build. Đừng vác React cho mọi thứ.

**Dùng vanilla JS khi:**
- Trang chủ yếu là nội dung tĩnh, ít tương tác (blog, landing page).
- Chỉ vài widget nhỏ rời rạc (một form, một slider).
- Bạn muốn bundle cực nhẹ, tải nhanh.

**Dùng framework khi:**
- UI phức tạp, nhiều state thay đổi liên tục (dashboard, app realtime).
- Nhiều component tái sử dụng và lồng nhau sâu.
- Nhiều người cùng làm, cần cấu trúc và quy ước chung.
- Bạn thấy mình đang **tự viết lại** state-management, routing, diffing — tức là đang viết lại một framework tồi hơn.

> 💡 Ghi nhớ: Khi code vanilla của bạn bắt đầu chứa "mini framework" tự chế (hệ thống re-render, router, quản lý state), đó là tín hiệu rõ ràng nên chuyển sang framework thật.

## React/Vue ở mức khái niệm

Cả hai đều xoay quanh đúng những ý tưởng trên: **component**, **props**, **state**, **declarative**, **virtual DOM** (hoặc cơ chế tương đương).

- **React**: component là hàm JS trả về JSX (cú pháp giống HTML trong JS). State quản lý bằng "hooks" như `useState`. Dùng Virtual DOM.
- **Vue**: tách template / script / style trong file `.vue`, state phản ứng (reactivity) tự động theo dõi dữ liệu nào được dùng để cập nhật chính xác.

Bạn **không cần** chọn ngay. Hiểu khái niệm chung quan trọng hơn cú pháp cụ thể.

## Đối chiếu: vanilla JS vs React

Cùng một component đếm số. Bản vanilla bạn đã thấy ở trên (tự `setState` rồi tự `render`). Bản React:

```javascript
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0); // state nội bộ

  return (
    <div className="counter">
      <span>Số đếm: {count}</span>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

Hãy đặt cạnh nhau để thấy React chỉ **tự động hoá** những gì bạn vừa làm tay:

| Việc cần làm | Vanilla JS (tự làm) | React (lo giùm) |
|---|---|---|
| Khai báo state | `let state = {...}` | `useState(0)` |
| Đổi state | Tự viết `setState` | `setCount(...)` |
| Render lại khi state đổi | Tự gọi `render()` | Tự động |
| Cập nhật DOM tối thiểu | Tự tay (hoặc không) | Virtual DOM lo |
| Gắn sự kiện | Tự `onclick` sau mỗi render | `onClick` trong JSX |

Điểm mấu chốt: **tư duy hoàn toàn giống nhau** — `UI = f(state)`, đổi state thì UI tự khớp. React chỉ xoá đi phần lặp đi lặp lại và xử lý hiệu năng. Một khi bạn "thấm" mẫu hình này bằng vanilla, học React/Vue chỉ còn là học cú pháp.

> 💡 Ghi nhớ: Framework không phải phép màu — nó là phần "tự động hoá việc re-render và cập nhật DOM" mà bạn vừa tự viết tay. Hiểu cái tay làm trước, framework sẽ trở nên hiển nhiên.

## Tóm tắt

- **Component** = hàm nhận `props` → trả về UI; tái sử dụng được.
- **Declarative** (mô tả UI theo dữ liệu) thay cho **imperative** (thao tác DOM từng bước).
- **State đổi → render lại**: bạn sửa dữ liệu, không sửa DOM trực tiếp.
- **Virtual DOM** cho phép viết kiểu "vẽ lại tất cả" mà chỉ cập nhật phần khác biệt.
- **SPA** đổi nội dung không reload; cần **client-side routing** và fallback `index.html`.
- Chọn **vanilla** cho việc nhỏ, **framework** khi UI phức tạp / nhiều state.
- **React/Vue** tự động hoá đúng mẫu hình `UI = f(state)` bạn vừa dựng tay.

---

Lưu ý: tôi đã viết nội dung bài học dưới dạng Markdown như yêu cầu (không frontmatter, không bọc toàn bài trong code fence). Nội dung này chưa được ghi vào file dữ liệu nào — nếu bạn muốn tôi chèn nó vào `/Users/dantt1002/projects/aws/web/data/lessons.ts` (cần slug, courseId `WEB`, chapter, order), hãy cho biết slug và chương để tôi wire vào đúng chỗ.
