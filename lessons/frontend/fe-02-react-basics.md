# React căn bản: component & JSX

Bạn đã viết được web bằng HTML/CSS/JS thuần: tạo phần tử bằng `document.createElement`, gắn sự kiện bằng `addEventListener`, cập nhật giao diện bằng `el.innerHTML = ...`. Cách này hoạt động cho trang nhỏ, nhưng khi UI phức tạp lên — list lọc được, modal, form nhiều bước — bạn sẽ dành phần lớn thời gian để **đồng bộ DOM với dữ liệu bằng tay**, và bug "giao diện không khớp với state" xuất hiện liên tục.

React giải quyết đúng nỗi đau đó. Bài này đi từ "vì sao React", qua JSX và component, đến các quy tắc bạn bắt buộc phải nắm (render, key, event) để không vấp những lỗi kinh điển khi đi làm. Code trong bài là React 19 + TypeScript, chạy được trong dự án Vite.

## 1. Vì sao React: imperative vs declarative

Cách viết DOM thủ công là **imperative** — bạn ra lệnh từng bước "tạo cái này, sửa cái kia". React là **declarative** — bạn mô tả "với state X thì UI trông như Y", còn việc cập nhật DOM để khớp là việc của React.

So sánh cùng một nhu cầu: hiện số đếm và nút tăng.

```javascript
// DOM thủ công — imperative
let count = 0;
const span = document.querySelector("#count");
const btn = document.querySelector("#inc");
btn.addEventListener("click", () => {
  count++;
  span.textContent = count; // bạn tự nhớ phải cập nhật DOM
});
```

```tsx
// React — declarative
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Đã bấm {count} lần</button>;
}
```

Trong bản React, bạn không bao giờ chạm vào DOM. Bạn chỉ đổi `count`, và React tự render lại UI cho khớp. Khi UI có hàng chục mảnh phụ thuộc lẫn nhau, sự khác biệt này là sống còn.

Ba trụ cột của React:

| Trụ cột | Nghĩa là gì | Lợi ích thực tế |
|---|---|---|
| **Declarative** | Mô tả UI theo state, không thao tác DOM | Code dễ đọc, ít bug "DOM lệch state" |
| **Component-based** | UI chia thành các khối tái dùng | Tách nhỏ, test riêng, ghép lại |
| **Virtual DOM** | React giữ bản sao UI trong bộ nhớ, so sánh (diff) rồi chỉ sửa phần thay đổi | Bạn "vẽ lại tất cả" về mặt tư duy, nhưng React chỉ cập nhật DOM tối thiểu |

> 💡 Ghi nhớ: Tư tưởng cốt lõi của React gói gọn trong một công thức: **UI = f(state)**. Bạn không cập nhật giao diện, bạn cập nhật state — giao diện là kết quả của một hàm.

## 2. JSX là gì và các quy tắc bắt buộc

JSX là cú pháp cho phép viết "giống HTML" ngay trong JavaScript. Nó **không phải HTML** — build tool (Vite/Babel/SWC) biên dịch nó thành lời gọi hàm tạo React element.

```tsx
const el = <h1 className="title">Xin chào</h1>;
// biên dịch tương đương:
const el = React.createElement("h1", { className: "title" }, "Xin chào");
```

Vì JSX thực ra là JavaScript, có một số quy tắc khác HTML mà người mới hay vấp:

| Quy tắc JSX | Lý do | Ví dụ |
|---|---|---|
| `className` thay cho `class` | `class` là từ khoá JS | `<div className="card">` |
| `htmlFor` thay cho `for` | `for` là từ khoá JS | `<label htmlFor="email">` |
| Thuộc tính dạng camelCase | Đây là property của JS object | `onClick`, `tabIndex`, `onChange` |
| Phải đóng mọi thẻ | JSX cần cây hợp lệ | `<img />`, `<br />` |
| Chỉ trả về **một** phần tử gốc | Hàm trả về một element | Bọc bằng `<div>` hoặc Fragment `<>...</>` |
| Nhúng JS bằng `{ }` | `{ }` mở vùng biểu thức | `<p>{user.name}</p>` |
| `style` là object | Không phải chuỗi CSS | `style={{ color: "red", fontSize: 16 }}` |

Trong `{ }` bạn chỉ đặt được **biểu thức** (cho ra giá trị), không đặt được câu lệnh (`if`, `for`). Đây là lý do conditional rendering hay dùng toán tử ba ngôi và `&&` (xem mục 7).

```tsx
function Greeting() {
  const name = "Lan";
  const hour = new Date().getHours();
  return (
    <>
      <h1>Chào {name}!</h1>
      <p>{hour < 12 ? "Buổi sáng tốt lành" : "Chào buổi chiều"}</p>
    </>
  );
}
```

> ⚠️ Bẫy: Quên rằng JSX chỉ trả về một phần tử gốc. Trả về hai thẻ `<h1>` và `<p>` cạnh nhau sẽ lỗi compile. Bọc trong Fragment `<>...</>` — nó không tạo thẻ DOM thừa như `<div>`.

## 3. Function component & props

Component là một **hàm nhận props và trả về JSX**. Tên component **bắt buộc viết hoa chữ cái đầu** — React phân biệt component (`<Button />`) với thẻ HTML thường (`<button>`) qua điều này.

`props` là dữ liệu cha truyền xuống con — giống tham số của hàm. Với TypeScript, ta khai báo kiểu props bằng `type` hoặc `interface`:

```tsx
type ButtonProps = {
  label: string;
  variant?: "primary" | "ghost"; // ? = optional
  onClick: () => void;
};

function Button({ label, variant = "primary", onClick }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {label}
    </button>
  );
}

// Dùng:
<Button label="Lưu" onClick={() => console.log("clicked")} />
<Button label="Huỷ" variant="ghost" onClick={handleCancel} />
```

Vài điểm quan trọng về props:

- **Props là read-only**. Component **không bao giờ** được sửa props của chính nó (`props.label = "x"` là sai). Dữ liệu chảy một chiều từ cha xuống con.
- Destructuring ngay ở tham số (`{ label, onClick }`) là cách viết phổ biến, gọn và rõ kiểu.
- Đặt giá trị mặc định ngay khi destructure (`variant = "primary"`).

UI React là một **cây component**: một gốc (`App`) phân nhánh xuống các con, mỗi con lại có con của nó. Dữ liệu (`props`) chỉ chảy **một chiều — từ cha xuống con** (one-way data flow); con không bao giờ đẩy ngược dữ liệu lên cha bằng cách sửa props. Khi con cần báo cho cha (vd: bấm nút), cha truyền **một hàm callback** xuống làm prop, con gọi hàm đó — luồng điều khiển đi lên, nhưng dữ liệu vẫn chỉ đi xuống.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 380" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cây component và luồng dữ liệu một chiều trong React</title>
  <desc>Component App ở gốc truyền props xuống các con TodoList, Header, Footer; TodoList truyền tiếp xuống từng TodoItem. Props chảy một chiều từ cha xuống con, còn callback onToggle đi từ con gọi ngược lên cha.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Cây component &amp; luồng dữ liệu một chiều</text>
  <g stroke="currentColor" stroke-opacity="0.4" fill="none" stroke-width="1.5">
    <path d="M360 78 L180 138"/>
    <path d="M360 78 L360 138"/>
    <path d="M360 78 L540 138"/>
    <path d="M180 188 L100 248"/>
    <path d="M180 188 L260 248"/>
  </g>
  <g>
    <rect x="300" y="44" width="120" height="34" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="65" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">App (gốc)</text>
  </g>
  <g>
    <rect x="120" y="138" width="120" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="180" y="158" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">TodoList</text>
    <text x="180" y="175" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">props: todos</text>
    <rect x="300" y="138" width="120" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="158" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Header</text>
    <text x="360" y="175" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">props: title</text>
    <rect x="480" y="138" width="120" height="50" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="540" y="158" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Footer</text>
    <text x="540" y="175" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">props: remaining</text>
  </g>
  <g>
    <rect x="40" y="248" width="120" height="50" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="100" y="268" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">TodoItem</text>
    <text x="100" y="285" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">props: todo, onToggle</text>
    <rect x="200" y="248" width="120" height="50" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="260" y="268" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">TodoItem</text>
    <text x="260" y="285" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">props: todo, onToggle</text>
  </g>
  <defs>
    <marker id="arrDown" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#3b82f6"/>
    </marker>
    <marker id="arrUp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#f59e0b"/>
    </marker>
  </defs>
  <g>
    <path d="M636 70 L636 300" stroke="#3b82f6" stroke-width="2.5" fill="none" marker-end="url(#arrDown)"/>
    <text x="648" y="180" font-size="11" fill="currentColor" transform="rotate(90 648 180)" text-anchor="middle">props chảy xuống (dữ liệu)</text>
    <path d="M674 300 L674 70" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="5 4" fill="none" marker-end="url(#arrUp)"/>
    <text x="690" y="185" font-size="11" fill="currentColor" transform="rotate(90 690 185)" text-anchor="middle">callback gọi lên (sự kiện)</text>
  </g>
  <text x="100" y="330" font-size="10.5" fill="currentColor" opacity="0.7">Tên component viết hoa chữ đầu · props là read-only ở con</text>
</svg>

> 💡 Ghi nhớ: One-way data flow giúp bạn luôn biết dữ liệu **đến từ đâu** — cứ lần ngược lên cha là tìm ra nguồn. Đây là lý do bug "UI lệch state" hiếm hơn hẳn so với DOM thủ công, nơi bất kỳ đoạn code nào cũng có thể sửa bất kỳ phần tử nào.

Việc khai báo kiểu props là lý do TypeScript gần như bắt buộc cho frontend hiện đại — nó bắt lỗi ngay khi bạn truyền sai prop. Xem lại [[fe-01-typescript]] nếu cần nền tảng về `type`, union và optional.

> 💡 Ghi nhớ: Một component tốt là một hàm thuần (pure) đối với props: cùng props vào → cùng UI ra, không side effect lúc render. Side effect (gọi API, đụng DOM) thuộc về hook `useEffect`, không nằm thẳng trong thân hàm.

## 4. Render & re-render — điều khiến React "phản ứng"

Lần đầu component xuất hiện gọi là **render** (mount). React gọi sẽ hàm component, lấy JSX trả về, dựng virtual DOM rồi đẩy ra DOM thật.

**Re-render** xảy ra khi:

1. **State của component thay đổi** (qua `setState`), hoặc
2. **Component cha re-render** (kéo theo con render lại), hoặc
3. **Props thay đổi**.

Mỗi lần re-render, React gọi **lại** hàm component từ đầu, tạo virtual DOM mới, so sánh (diff) với cây cũ, rồi chỉ vá phần khác biệt vào DOM thật. Đây là lý do bạn cảm thấy "vẽ lại tất cả" nhưng performance vẫn ổn.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng render và re-render với diff Virtual DOM</title>
  <desc>State đổi kích hoạt re-render: React gọi lại hàm component tạo Virtual DOM mới, so sánh với Virtual DOM cũ để tìm khác biệt, rồi chỉ vá đúng phần thay đổi vào DOM thật. Quá trình lặp lại theo công thức UI bằng f của state.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Vòng render / re-render → diff Virtual DOM</text>
  <defs>
    <marker id="flowArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <g>
    <rect x="20" y="60" width="150" height="58" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="95" y="84" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">State đổi</text>
    <text x="95" y="103" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">setCount(...) / props mới</text>
  </g>
  <g>
    <rect x="200" y="60" width="150" height="58" rx="10" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="275" y="84" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Gọi lại hàm</text>
    <text x="275" y="103" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">tạo Virtual DOM mới</text>
  </g>
  <g>
    <rect x="380" y="60" width="150" height="58" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="455" y="84" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Diff</text>
    <text x="455" y="103" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">so VDOM mới ↔ cũ</text>
  </g>
  <g>
    <rect x="560" y="60" width="150" height="58" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="635" y="84" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Vá DOM thật</text>
    <text x="635" y="103" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.62">chỉ phần khác biệt</text>
  </g>
  <g stroke="currentColor" stroke-width="2" fill="none">
    <path d="M170 89 L196 89" marker-end="url(#flowArr)"/>
    <path d="M350 89 L376 89" marker-end="url(#flowArr)"/>
    <path d="M530 89 L556 89" marker-end="url(#flowArr)"/>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" stroke-width="1.8" stroke-dasharray="6 4" fill="none">
    <path d="M635 122 L635 150 L95 150 L95 122" marker-end="url(#flowArr)"/>
  </g>
  <text x="365" y="168" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">state đổi lần nữa → lặp lại vòng</text>
  <g>
    <rect x="120" y="196" width="220" height="110" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="230" y="216" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">VDOM cũ (count = 0)</text>
    <text x="230" y="240" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">&lt;button&gt;</text>
    <rect x="160" y="252" width="140" height="24" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="230" y="269" font-size="11" text-anchor="middle" fill="currentColor">"Đã bấm 0 lần"</text>
    <text x="230" y="296" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">&lt;/button&gt;</text>
  </g>
  <g>
    <rect x="380" y="196" width="220" height="110" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="490" y="216" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">VDOM mới (count = 1)</text>
    <text x="490" y="240" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">&lt;button&gt;</text>
    <rect x="420" y="252" width="140" height="24" rx="6" fill="#f59e0b" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="490" y="269" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">"Đã bấm 1 lần"</text>
    <text x="490" y="296" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">&lt;/button&gt;</text>
  </g>
  <text x="635" y="222" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">chỉ ô tô đậm</text>
  <text x="635" y="238" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">được cập nhật</text>
  <path d="M610 250 L300 264" stroke="#f59e0b" stroke-width="1.8" fill="none" stroke-dasharray="4 3"/>
</svg>

> 💡 Ghi nhớ: Công thức **UI = f(state)** chính là vòng này: state đổi → React chạy lại `f` → so sánh kết quả với lần trước → vá tối thiểu vào DOM. Bạn chỉ lo đổi state, không bao giờ tự đụng vào DOM.

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  console.log("render với count =", count); // chạy lại MỖI lần re-render
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

> ⚠️ Bẫy: State trong React là **bất biến (immutable)** về mặt tư duy. Sửa trực tiếp (`count++`, `arr.push(x)`) sẽ KHÔNG kích hoạt re-render vì React so sánh tham chiếu. Luôn tạo giá trị mới: `setCount(count + 1)`, `setItems([...items, x])`. Phần sâu về state/hooks nằm ở [[fe-03-hooks-state]].

## 5. Render list & vì sao cần `key`

Render danh sách = `map` mảng thành mảng JSX:

```tsx
type Todo = { id: number; title: string; done: boolean };

function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          {todo.done ? "✅" : "⬜"} {todo.title}
        </li>
      ))}
    </ul>
  );
}
```

Mỗi phần tử trong list **phải có prop `key`** là một giá trị **duy nhất và ổn định**. `key` là cách React **nhận dạng** từng item giữa các lần re-render: item nào được giữ, thêm, xoá hay đổi vị trí. Không có key, React không biết "li này là cái cũ hay cái mới", buộc phải đoán — dẫn đến vá DOM sai và mất state nội bộ của item.

Vì sao **không** dùng index làm key? Vì index không gắn với dữ liệu. Khi bạn xoá/chèn/sắp xếp lại, index của một item đổi, React tưởng nội dung đổi và gắn nhầm state.

```tsx
// ❌ SAI: index không ổn định khi list thay đổi
{todos.map((todo, i) => <li key={i}>{todo.title}</li>)}

// ✅ ĐÚNG: id gắn chặt với từng item
{todos.map((todo) => <li key={todo.id}>{todo.title}</li>)}
```

Lỗi thực tế kinh điển: mỗi `<li>` có một `<input>` (ô tick hoặc ô sửa). Dùng `key={i}`, khi bạn xoá item đầu danh sách, nội dung gõ dở trong các input bị "trượt" sang item khác — vì React tái dùng nhầm DOM theo index.

> ⚠️ Bẫy: `key` chỉ cần **duy nhất trong cùng một list**, không cần duy nhất toàn app. Và `key` **không phải prop** — component con không đọc được `props.key`; nó chỉ dành cho React. Cần giá trị đó bên trong con thì truyền thêm một prop khác (ví dụ `id={todo.id}`).

## 6. Conditional rendering

Vì `{ }` chỉ nhận biểu thức, ta render có điều kiện bằng:

```tsx
function UserBadge({ user }: { user: { name: string } | null }) {
  // 1) Toán tử && — hiện khi điều kiện đúng
  return (
    <header>
      {user && <span>Xin chào, {user.name}</span>}
      {/* 2) Ba ngôi — chọn 1 trong 2 */}
      {user ? <button>Đăng xuất</button> : <button>Đăng nhập</button>}
    </header>
  );
}

// 3) Early return — cho nhánh hoàn toàn khác
function Page({ loading, error }: { loading: boolean; error?: string }) {
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  return <Content />;
}
```

> ⚠️ Bẫy: `&&` với số `0`. Viết `{items.length && <List />}` — khi `items.length === 0`, React **render ra số `0`** chứ không phải "không hiện gì", vì `0` là falsy nhưng vẫn là giá trị hợp lệ để render. Sửa: `{items.length > 0 && <List />}` hoặc `{items.length ? <List /> : null}`.

## 7. Event handling

Event trong React đặt qua prop camelCase (`onClick`, `onChange`, `onSubmit`), nhận vào một **hàm** (không phải chuỗi như HTML). React bọc event gốc bằng **SyntheticEvent** để chuẩn hoá giữa các trình duyệt — API gần như giống event thật (`e.target`, `e.preventDefault()`).

```tsx
function SearchBox() {
  const [q, setQ] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); // chặn reload trang như form HTML thuần
    console.log("Tìm:", q);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)} // e: React.ChangeEvent<HTMLInputElement>
        placeholder="Tìm kiếm..."
      />
      <button type="submit">Tìm</button>
    </form>
  );
}
```

Lưu ý cách truyền handler — phân biệt **truyền hàm** với **gọi hàm**:

```tsx
<button onClick={handleClick}>OK</button>        // ✅ truyền tham chiếu hàm
<button onClick={() => handleClick(id)}>OK</button> // ✅ cần tham số → bọc arrow
<button onClick={handleClick()}>OK</button>      // ❌ GỌI ngay lúc render → sai
```

> 💡 Ghi nhớ: `onClick={handleClick()}` chạy `handleClick` **ngay khi render** rồi gán giá trị trả về (thường `undefined`) làm handler — đây là lỗi cú pháp logic rất hay gặp ở người mới. Cần tham số thì bọc trong arrow function: `onClick={() => handleClick(id)}`.

## 8. `children` — ghép component như hộp chứa

Mọi thứ bạn đặt **giữa** thẻ mở và đóng của component sẽ tới component qua prop đặc biệt `children`. Đây là chìa khoá để tạo component "khung" (layout, card, modal) tái dùng:

```tsx
type CardProps = {
  title: string;
  children: React.ReactNode; // kiểu chuẩn cho "bất cứ JSX nào"
};

function Card({ title, children }: CardProps) {
  return (
    <section className="card">
      <h3>{title}</h3>
      <div className="card-body">{children}</div>
    </section>
  );
}

// Dùng: phần bên trong chính là children
<Card title="Hồ sơ">
  <p>Tên: Lan</p>
  <Button label="Sửa" onClick={onEdit} />
</Card>
```

`React.ReactNode` là kiểu TypeScript cho "bất cứ thứ gì render được": JSX, chuỗi, số, mảng, `null`. Dùng nó cho prop `children` và các prop nhận JSX.

## 9. Từ DOM thủ công sang React — dịch tư duy

Đây là bảng dịch trực tiếp từ bài web cũ sang React:

| DOM thủ công (cũ) | React (mới) | Ghi chú |
|---|---|---|
| `document.createElement` / `innerHTML` | Trả về JSX | Không tự dựng DOM nữa |
| `el.textContent = x` | `{x}` trong JSX | UI tự cập nhật theo state |
| biến toàn cục giữ trạng thái | `useState` | Đổi state → tự re-render |
| `addEventListener("click", fn)` | `onClick={fn}` | Gắn ngay trong JSX |
| `el.classList.toggle(...)` | `className={cond ? "a" : "b"}` | Theo state, không sửa DOM |
| `for` loop tạo nhiều `<li>` | `arr.map(...)` + `key` | Khai báo, không vòng lặp imperative |
| tự xoá/ghép DOM khi data đổi | đổi state, React diff giùm | Bớt nguồn bug lớn nhất |
| `document.querySelector` để đụng DOM | `useRef` (khi thật sự cần) | Hiếm dùng; ưu tiên state |

Ví dụ hoàn chỉnh — một to-do nhỏ gói gọn mọi thứ trong bài (component, props, state, list + key, conditional, event):

```tsx
import { useState } from "react";

type Todo = { id: number; title: string; done: boolean };

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState("");

  function addTodo(e: React.FormEvent) {
    e.preventDefault();
    const title = text.trim();
    if (!title) return;
    setTodos([...todos, { id: Date.now(), title, done: false }]); // tạo mảng MỚI
    setText("");
  }

  function toggle(id: number) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <div>
      <form onSubmit={addTodo}>
        <input value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit">Thêm</button>
      </form>

      {todos.length === 0 ? (
        <p>Chưa có việc nào.</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id} onClick={() => toggle(todo.id)}>
              {todo.done ? "✅" : "⬜"} {todo.title}
            </li>
          ))}
        </ul>
      )}

      <small>Còn lại: {remaining}</small>
    </div>
  );
}
```

> 💡 Ghi nhớ: Cú "aha" khi chuyển từ JS thuần sang React là bỏ thói quen "đụng vào DOM khi có gì đó xảy ra". Trong React bạn chỉ làm hai việc: (1) giữ dữ liệu trong state, (2) mô tả UI theo state đó. Mọi cập nhật DOM còn lại React lo.

## Liên hệ thực tế

- **Nối với bài tiếp theo**: bài này dừng ở component "tĩnh + một chút state đơn giản". Toàn bộ sức mạnh thật của React — `useState` nâng cao, `useEffect` để gọi API, `useRef`, custom hook, rules of hooks — nằm ở [[fe-03-hooks-state]]. Cách quản lý state chung cho nhiều component thì xem [[fe-04-state-management]].

- **Nối với Backend**: component chỉ là phần hiển thị; dữ liệu thật đến từ API backend. Khi bạn fetch danh sách todo từ một endpoint REST (xem khoá Backend về API design), bạn vẫn `map` mảng JSON đó ra JSX với `key` đúng như bài này — chỉ khác là dữ liệu nay là server state. Việc fetch, cache, loading/error chuẩn chỉnh được tách riêng ở [[fe-05-routing-data]] với React Query.

- **Nối với deploy AWS**: app React sau khi build (Vite tạo ra HTML + JS + CSS tĩnh) là **static assets**. Cách deploy phổ biến trên AWS là đẩy thư mục `dist/` lên **S3** rồi phân phối qua **CloudFront** (CDN) để tải nhanh toàn cầu — không cần server chạy React, vì rendering xảy ra ở trình duyệt. Backend API (chạy trên Lambda/ECS sau API Gateway hoặc ALB) là nơi component gọi để lấy dữ liệu. Chi tiết build & deploy nằm ở [[fe-09-build-deploy-perf]].
