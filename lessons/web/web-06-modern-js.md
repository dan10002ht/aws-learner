# JavaScript hiện đại (ES6+) & tooling

Bạn đã biết viết JavaScript "kiểu cũ": `var`, `function`, vòng `for`, gọi `fetch`. Code chạy được, nhưng dài dòng và dễ dính lỗi vặt. Từ năm 2015, JavaScript có một bản nâng cấp lớn gọi là **ES6 (ECMAScript 2015)**, kéo theo hàng loạt bản mới mỗi năm (ES2016, ES2017...). Người ta gọi chung là **ES6+** hay **JavaScript hiện đại**.

Bài này dạy bạn viết JS gọn, an toàn, đúng "chuẩn 2026" — cộng thêm hiểu sơ về **tooling**: npm, bundler, transpile. Đây là những thứ bạn sẽ gặp ngay khi mở bất kỳ dự án React/Vue nào.

Mở DevTools (F12 → tab Console) và gõ thử từng đoạn code bên dưới để cảm nhận.

## `let` / `const` vs `var`

`var` có một đặc tính khó chịu: nó **không tôn trọng block** `{ }` (gọi là *function-scoped*). `let` và `const` thì *block-scoped* — chỉ sống trong cặp ngoặc gần nhất, đúng như trực giác.

```javascript
if (true) {
  var a = 1;   // "rò rỉ" ra ngoài block
  let b = 2;   // chỉ sống trong if
}
console.log(a); // 1
console.log(b); // ReferenceError: b is not defined
```

Quy tắc thực dụng: **mặc định dùng `const`, khi nào cần gán lại thì đổi sang `let`, không bao giờ dùng `var`**.

```javascript
const PI = 3.14;     // không gán lại được
let count = 0;
count = count + 1;   // OK vì là let
// PI = 3.15;        // TypeError: Assignment to constant variable
```

> 💡 Ghi nhớ: `const` không có nghĩa là "giá trị bất biến" mà là "không gán lại biến". Object/array khai báo bằng `const` vẫn sửa nội dung được: `const arr = []; arr.push(1)` hoàn toàn hợp lệ.

> ⚠️ Bẫy: `var` bị "hoisting" — biến được kéo lên đầu hàm với giá trị `undefined`. Đây là nguồn gốc của vô số bug khó hiểu. Bỏ `var` đi là bạn tránh được cả lớp lỗi này.

## Arrow function & `this`

Arrow function (`=>`) là cách viết hàm ngắn gọn hơn:

```javascript
// kiểu cũ
function double(n) {
  return n * 2;
}

// arrow, body một dòng — tự động return
const double = (n) => n * 2;

// nhiều tham số, nhiều dòng cần { } và return
const sum = (a, b) => {
  const total = a + b;
  return total;
};
```

Nhưng arrow function khác `function` thường ở một điểm cực quan trọng: **nó không có `this` riêng**. Nó "mượn" `this` từ nơi bao quanh (lexical `this`). Điều này giải quyết bài toán callback kinh điển:

```javascript
const timer = {
  seconds: 0,
  start() {
    setInterval(() => {
      this.seconds++;          // `this` vẫn là timer — đúng ý ta
      console.log(this.seconds);
    }, 1000);
  },
};
timer.start();
```

Nếu dùng `function () { this.seconds++ }` bên trong `setInterval`, `this` sẽ trỏ tới `window` (hoặc `undefined` ở strict mode) và code sai.

> ⚠️ Bẫy: Đừng dùng arrow function để định nghĩa **method của object** nếu method đó cần `this` trỏ vào chính object. `const obj = { val: 1, get: () => this.val }` sẽ hỏng vì `this` không phải `obj`.

## Template literal

Thay vì nối chuỗi bằng `+`, dùng dấu backtick `` ` `` và `${...}`:

```javascript
const name = "An";
const age = 25;

// kiểu cũ
const s1 = "Xin chào " + name + ", bạn " + age + " tuổi.";

// template literal
const s2 = `Xin chào ${name}, bạn ${age} tuổi.`;

// hỗ trợ xuống dòng & biểu thức bên trong ${}
const html = `
  <div class="card">
    <h2>${name.toUpperCase()}</h2>
    <p>Sinh năm ${2026 - age}</p>
  </div>
`;
```

## Destructuring (object & array)

Destructuring giúp "rút" giá trị ra biến riêng trong một dòng.

```javascript
// Object destructuring
const user = { id: 1, name: "An", city: "Hà Nội" };
const { name, city } = user;
console.log(name, city); // An Hà Nội

// đổi tên & đặt giá trị mặc định
const { name: tenNguoiDung, country = "Việt Nam" } = user;

// Array destructuring — theo vị trí
const colors = ["đỏ", "xanh", "vàng"];
const [first, , third] = colors; // bỏ qua phần tử thứ 2
console.log(first, third);       // đỏ vàng
```

Ứng dụng cực phổ biến: rút field ngay trên tham số hàm.

```javascript
function greet({ name, age }) {
  return `${name} - ${age} tuổi`;
}
greet({ name: "Bình", age: 30 });
```

## Spread & rest (`...`)

Cùng một ký hiệu `...`, hai vai trò ngược nhau.

**Spread** — "trải" các phần tử ra:

```javascript
const a = [1, 2];
const b = [3, 4];
const merged = [...a, ...b];        // [1, 2, 3, 4]

const base = { theme: "dark", lang: "vi" };
const updated = { ...base, lang: "en" }; // copy rồi ghi đè lang

const max = Math.max(...[5, 9, 3]);  // truyền mảng thành đối số rời
```

**Rest** — "gom" nhiều thứ lại thành một mảng:

```javascript
function total(...nums) {        // gom mọi đối số vào mảng nums
  return nums.reduce((s, n) => s + n, 0);
}
total(1, 2, 3, 4); // 10

const [head, ...tail] = [10, 20, 30];
console.log(head); // 10
console.log(tail); // [20, 30]
```

> 💡 Ghi nhớ: Spread tạo **bản sao nông (shallow copy)**. `const copy = [...arr]` là cách gọn để clone mảng/object mà không sửa bản gốc — rất quan trọng trong React.

## Tham số mặc định (default param)

```javascript
function createUser(name, role = "member", active = true) {
  return { name, role, active };
}
createUser("An");                 // role = "member", active = true
createUser("Bình", "admin");      // role = "admin"
createUser("Cường", undefined, false); // dùng mặc định cho role
```

## Optional chaining `?.` & nullish `??`

Trước đây để đọc field lồng sâu mà không crash, bạn phải kiểm tra từng bậc. Giờ chỉ cần `?.`:

```javascript
const res = { data: { user: { profile: null } } };

// kiểu cũ — dài dòng
const cityOld = res && res.data && res.data.user && res.data.user.profile && res.data.user.profile.city;

// optional chaining — gặp null/undefined thì trả về undefined, không lỗi
const city = res?.data?.user?.profile?.city; // undefined, không crash

// gọi hàm có thể không tồn tại
obj?.doSomething?.();
```

Nullish coalescing `??` trả về vế phải **chỉ khi** vế trái là `null` hoặc `undefined` — khác `||` ở chỗ nó **không** coi `0` hay `""` là "rỗng":

```javascript
const count = 0;
console.log(count || 10); // 10  ← sai! 0 bị coi là falsy
console.log(count ?? 10); // 0   ← đúng, vì 0 không phải null/undefined

const name = "" ?? "Khách"; // "" (chuỗi rỗng vẫn được giữ)
```

> ⚠️ Bẫy: Đừng dùng `||` để đặt giá trị mặc định cho số hay boolean. `price || 100` sẽ biến `price = 0` thành `100`. Dùng `??` cho an toàn.

## Array methods: map / filter / reduce / find

Đây là "vũ khí" hằng ngày. Chúng **không sửa mảng gốc** (trừ vài method khác như `push`).

```javascript
const products = [
  { name: "Bàn phím", price: 500, inStock: true },
  { name: "Chuột",    price: 200, inStock: false },
  { name: "Màn hình", price: 3000, inStock: true },
];

// map: biến mỗi phần tử thành thứ khác → mảng mới cùng độ dài
const names = products.map((p) => p.name);
// ["Bàn phím", "Chuột", "Màn hình"]

// filter: giữ lại phần tử thoả điều kiện
const available = products.filter((p) => p.inStock);

// find: lấy phần tử ĐẦU TIÊN thoả điều kiện (hoặc undefined)
const cheap = products.find((p) => p.price < 300);

// reduce: gộp cả mảng về MỘT giá trị
const totalPrice = products.reduce((sum, p) => sum + p.price, 0);
// 3700  ← số 0 là giá trị khởi đầu

// nối chuỗi (chaining) — đọc tự nhiên như câu nói
const cheapNames = products
  .filter((p) => p.inStock)
  .map((p) => p.name);
```

| Method | Trả về | Dùng khi |
|---|---|---|
| `map` | mảng mới cùng độ dài | biến đổi từng phần tử |
| `filter` | mảng mới (ngắn hơn) | lọc theo điều kiện |
| `find` | một phần tử / `undefined` | tìm 1 cái đầu tiên |
| `reduce` | một giá trị bất kỳ | tính tổng, gộp, đếm |
| `some` / `every` | boolean | "có ít nhất 1?" / "tất cả?" |

> 💡 Ghi nhớ: Ưu tiên `map/filter/reduce` thay cho vòng `for` thủ công. Code ngắn hơn, ít lỗi index hơn, và không vô tình sửa mảng gốc.

## ES Module: `import` / `export`

JavaScript hiện đại tách code thành nhiều file (module), mỗi file tự khai báo cái nó **xuất ra** và **nhập vào**.

```javascript
// file: math.js
export const PI = 3.14;
export function area(r) {
  return PI * r * r;
}
export default function greet(name) { // default export — mỗi file tối đa 1
  return `Hi ${name}`;
}
```

```javascript
// file: main.js
import greet, { PI, area } from "./math.js";
//     ^default   ^named exports (đúng tên, trong { })

console.log(area(2));   // 12.56
import * as math from "./math.js"; // gom tất cả vào 1 object
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Quan hệ export/import giữa math.js và main.js</title>
  <desc>math.js có named export PI và area, cùng default export greet. main.js import default greet nằm ngoài cặp ngoặc nhọn, còn PI và area là named import nằm trong cặp ngoặc nhọn; mỗi mũi tên nối đúng export với chỗ import tương ứng.</desc>
  <defs>
    <marker id="mjarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="120" y="26" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">math.js — xuất ra</text>
  <text x="600" y="26" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">main.js — nhập vào</text>

  <rect x="16" y="44" width="208" height="244" rx="10" fill="#3b82f6" fill-opacity="0.10" stroke="currentColor" stroke-opacity="0.18"/>
  <rect x="496" y="44" width="208" height="244" rx="10" fill="#10b981" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.18"/>

  <rect x="36" y="68" width="168" height="44" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="120" y="86" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">default export</text>
  <text x="120" y="103" font-size="12" text-anchor="middle" fill="currentColor">greet</text>

  <rect x="36" y="146" width="168" height="44" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="120" y="164" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">named export</text>
  <text x="120" y="181" font-size="12" text-anchor="middle" fill="currentColor">PI</text>

  <rect x="36" y="218" width="168" height="44" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="120" y="236" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">named export</text>
  <text x="120" y="253" font-size="12" text-anchor="middle" fill="currentColor">area</text>

  <rect x="516" y="68" width="168" height="44" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="600" y="86" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">default (ngoài { })</text>
  <text x="600" y="103" font-size="12" text-anchor="middle" fill="currentColor">greet</text>

  <rect x="516" y="146" width="168" height="116" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="600" y="166" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">named (trong { })</text>
  <text x="600" y="190" font-size="12" text-anchor="middle" fill="currentColor">{ PI,</text>
  <text x="600" y="212" font-size="12" text-anchor="middle" fill="currentColor">area }</text>

  <text x="360" y="60" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">import greet, { PI, area }</text>

  <g stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#mjarrow)">
    <path d="M204 90 H516"/>
    <path d="M204 168 C 360 168, 380 184, 516 188"/>
    <path d="M204 240 C 360 240, 380 210, 516 206"/>
  </g>
</svg>

Trong trình duyệt, dùng module bằng cách thêm `type="module"`:

```html
<script type="module" src="main.js"></script>
```

> ⚠️ Bẫy: Module ES6 chỉ chạy khi trang được phục vụ qua HTTP(S), **không chạy khi mở file bằng `file://`**. Dùng một server tĩnh (ví dụ `npx serve`) khi test cục bộ.

## Promise & async/await sâu hơn

Bạn đã dùng `async/await` để gọi `fetch`. Hiểu thêm vài điểm để xử lý đúng:

```javascript
// Chạy SONG SONG nhiều việc độc lập — nhanh hơn nhiều so với await tuần tự
async function loadAll() {
  const [users, posts] = await Promise.all([
    fetch("/api/users").then((r) => r.json()),
    fetch("/api/posts").then((r) => r.json()),
  ]);
  return { users, posts };
}
```

```javascript
// Bắt lỗi đúng cách: fetch CHỈ reject khi mất mạng,
// còn lỗi 404/500 vẫn coi là "thành công" → phải tự kiểm tra res.ok
async function getUser(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Lỗi tải user:", err.message);
    return null;
  }
}
```

> ⚠️ Bẫy: Dùng `await` trong vòng `for` sẽ chạy **tuần tự** (chậm). Nếu các việc độc lập, gom vào `Promise.all` để chạy song song.

## npm & package.json

Khi dự án cần thư viện ngoài (React, axios, dayjs...), bạn dùng **npm** (Node Package Manager).

```bash
npm init -y            # tạo file package.json
npm install dayjs      # cài thư viện, lưu vào node_modules/
npm install -D vite    # -D = devDependency (chỉ dùng khi dev)
```

File `package.json` là "lý lịch" dự án:

```json
{
  "name": "my-app",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": { "dayjs": "^1.11.0" },
  "devDependencies": { "vite": "^5.0.0" }
}
```

- `npm run dev` chạy lệnh trong `scripts`.
- `node_modules/` **không** commit lên Git (cho vào `.gitignore`).
- `package-lock.json` ghim đúng phiên bản — **phải** commit để mọi người cài giống nhau.

## Bundler (Vite / webpack) & transpile

Trình duyệt không tự gộp hàng trăm file module, và chưa chắc hiểu cú pháp mới nhất. Đó là lúc cần **tooling**:

- **Bundler** (Vite, webpack): gom nhiều file JS/CSS/ảnh thành vài file tối ưu, nén nhỏ, để trang tải nhanh. Vite còn cho **hot reload** — sửa code là trình duyệt cập nhật ngay không cần F5.
- **Transpile** (Babel, esbuild): "dịch" cú pháp JS hiện đại (và JSX/TypeScript) về dạng JS cũ mà **trình duyệt cũ** cũng hiểu. "Transpile" = dịch từ ngôn ngữ này sang phiên bản khác *cùng cấp độ* (JS mới → JS cũ), khác với "compile" thường được hiểu là dịch xuống mã máy.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 230" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Pipeline tooling: từ code nguồn đến file chạy được trên mọi trình duyệt</title>
  <desc>Luồng trái sang phải: nhiều file code nguồn ES6+/JSX qua bước Transpile (Babel/esbuild dịch JS mới sang JS cũ), rồi qua bước Bundle (Vite/webpack gom và nén), cho ra vài file tối ưu chạy được trên mọi trình duyệt.</desc>
  <defs>
    <marker id="tlarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>

  <g>
    <rect x="18" y="60" width="132" height="42" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="26" y="68" width="132" height="42" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
    <rect x="34" y="76" width="132" height="42" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="100" y="94" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Code nguồn</text>
    <text x="100" y="110" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">nhiều file ES6+/JSX</text>
  </g>

  <rect x="218" y="58" width="138" height="78" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="287" y="84" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Transpile</text>
  <text x="287" y="102" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Babel / esbuild</text>
  <text x="287" y="118" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">JS mới → JS cũ</text>

  <rect x="402" y="58" width="138" height="78" rx="9" fill="#8b5cf6" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="471" y="84" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Bundle</text>
  <text x="471" y="102" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Vite / webpack</text>
  <text x="471" y="118" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">gom + nén nhỏ</text>

  <g>
    <rect x="588" y="64" width="118" height="38" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="592" y="106" width="110" height="34" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="647" y="87" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Vài file tối ưu</text>
    <text x="647" y="127" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">mọi trình duyệt chạy</text>
  </g>

  <g stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#tlarrow)" stroke-width="1.5">
    <path d="M174 97 H214"/>
    <path d="M360 97 H398"/>
    <path d="M544 97 H584"/>
  </g>

  <text x="360" y="178" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">Bạn viết code sạch, hiện đại — tooling lo phần "chạy được khắp nơi + tải nhanh"</text>
</svg>

Khởi tạo một dự án hiện đại chỉ mất một lệnh:

```bash
npm create vite@latest my-app
cd my-app
npm install
npm run dev
```

> 💡 Ghi nhớ: Bạn viết code sạch, hiện đại (ES6+, JSX). Bundler + transpiler lo phần "biến nó thành thứ mọi trình duyệt chạy được và tải nhanh". Đây chính là nền móng cho React/Vue ở bài sau.

## Tổng kết

- `const` mặc định, `let` khi cần gán lại, bỏ hẳn `var`.
- Arrow function gọn và "mượn" `this` từ ngoài — đừng dùng làm method cần `this`.
- Template literal, destructuring, spread/rest, default param giúp code ngắn và rõ.
- `?.` và `??` xử lý dữ liệu thiếu an toàn; nhớ `??` không coi `0`/`""` là rỗng.
- `map/filter/reduce/find` thay vòng `for` thủ công.
- ES module tách code; `Promise.all` chạy song song; luôn kiểm tra `res.ok`.
- npm quản lý thư viện qua `package.json`; bundler + transpile biến code hiện đại thành web chạy được khắp nơi.

Bài tiếp theo: dùng những nền tảng này để bước vào **tư duy component & SPA** — cánh cửa tới React/Vue.
