# TypeScript cho Frontend

Bạn đã viết JavaScript thành thạo. Code chạy được, nhưng càng lớn càng nhiều lỗi kiểu "Cannot read properties of undefined", `user.adress` (gõ sai tên trường mà không ai báo), hay gọi `total.toFixed()` trong khi `total` thực ra là string. Những lỗi này chỉ nổ **lúc runtime**, trên máy người dùng.

**TypeScript (TS)** là JavaScript có thêm hệ thống kiểu (type). Bạn viết `.ts`/`.tsx`, compiler kiểm tra kiểu lúc bạn gõ, rồi "biên dịch" (thực chất là xoá hết phần type) ra JS thường để trình duyệt chạy. TS đã trở thành **mặc định** của frontend hiện đại 2025-2026: React, Vite, Next.js, mọi thư viện lớn đều ship sẵn type. Đi làm frontend mà không biết TS gần như không còn lựa chọn.

Bài này dạy đủ TS để bạn đọc và viết code React/TS thật, không sa đà vào type-level programming hàn lâm.

## Vì sao TypeScript: type safety + DX

Hai lợi ích lớn nhất:

1. **Type safety** — bắt lỗi lúc *compile*, trước khi code chạy. Gõ sai tên field, thiếu tham số, dùng sai kiểu... đều đỏ ngay trong editor.
2. **DX (Developer Experience)** — autocomplete chính xác, đi tới định nghĩa (go-to-definition), refactor đổi tên an toàn cả codebase, và type chính là tài liệu sống.

```typescript
// JavaScript: chạy mới biết sai
function getDiscount(price) {
  return price * 0.9;
}
getDiscount("100"); // "100" * 0.9 = 90? Không — ra NaN, im lặng

// TypeScript: đỏ ngay khi gõ
function getDiscount(price: number): number {
  return price * 0.9;
}
getDiscount("100");
// ❌ Argument of type 'string' is not assignable to parameter of type 'number'
```

> 💡 Ghi nhớ: TS không làm app chạy nhanh hơn hay an toàn hơn lúc runtime. Type bị **xoá hoàn toàn** khi build (type erasure). Giá trị của TS nằm ở lúc *viết code* và *bảo trì*.

## Kiểu cơ bản & inference

Các kiểu nền tảng: `string`, `number`, `boolean`, `null`, `undefined`, mảng `T[]`, và `object`.

```typescript
let title: string = "Frontend";
let count: number = 10;
let isActive: boolean = true;
let tags: string[] = ["react", "ts"];
let scores: number[] = [9, 8, 10];
```

Nhưng bạn **không cần annotate mọi thứ**. TS suy luận kiểu (type inference) rất giỏi:

```typescript
let title = "Frontend"; // TS tự hiểu: string
let count = 10;         // number
const tags = ["a", "b"]; // string[]

// Hàm: annotate tham số, để TS suy return
function add(a: number, b: number) {
  return a + b; // TS biết return là number
}
```

Quy tắc thực dụng: **annotate tham số hàm và ranh giới (props, API), để TS tự suy luận biến cục bộ.** Viết `const x: number = 5` là thừa.

> ⚠️ Bẫy: Tránh annotate kiểu rộng hơn cần thiết. `const color: string = "red"` làm mất literal type; để TS suy `"red"` (literal) thường hữu ích hơn — xem phần union & literal.

## interface vs type

Cả hai đều mô tả "hình dạng" của object. Trong thực tế chúng thay thế nhau được ~90% trường hợp.

```typescript
interface User {
  id: number;
  name: string;
  email?: string;       // ? = optional
  readonly createdAt: Date; // readonly = không gán lại được
}

type Product = {
  id: number;
  price: number;
};
```

Khác biệt cốt lõi:

| Tiêu chí | `interface` | `type` |
|---|---|---|
| Mô tả object/shape | ✅ | ✅ |
| Mở rộng (extends) | `extends` | `&` (intersection) |
| Union (`A \| B`) | ❌ | ✅ |
| Tuple, primitive alias, mapped type | ❌ | ✅ |
| Declaration merging (khai báo trùng tên gộp lại) | ✅ | ❌ |

```typescript
// interface mở rộng
interface Admin extends User {
  role: "admin";
}

// type kết hợp bằng intersection
type AdminT = User & { role: "admin" };

// union CHỈ type làm được
type Status = "idle" | "loading" | "error";
```

> 💡 Ghi nhớ: Quy ước phổ biến: dùng `interface` cho object/props của component (dễ extend, dễ đọc), dùng `type` cho union, tuple, hoặc alias phức tạp. Chọn một quy ước trong team rồi nhất quán — đừng tranh cãi.

## Union & literal type

**Union** (`|`) nghĩa là "một trong các kiểu". **Literal type** là kiểu chỉ nhận đúng một giá trị cụ thể. Kết hợp lại tạo ra "enum nhẹ" cực mạnh cho frontend:

```typescript
type Theme = "light" | "dark";       // literal union
type Id = string | number;           // union kiểu

function setTheme(theme: Theme) { /* ... */ }
setTheme("dark");   // OK
setTheme("blue");   // ❌ '"blue"' không gán được cho Theme
```

Đây là cách model state UI rất chuẩn — thay cho boolean rời rạc dễ rơi vào trạng thái vô lý:

```typescript
// ❌ dễ sai: có thể vừa loading vừa error?
type BadState = { isLoading: boolean; isError: boolean; data?: User };

// ✅ discriminated union — chỉ một trạng thái tại một thời điểm
type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; message: string };
```

## Narrowing — thu hẹp kiểu

Khi biến là union, TS chưa biết nhánh nào. **Narrowing** là dùng kiểm tra runtime để TS "thu hẹp" về kiểu cụ thể, sau đó autocomplete và type đúng theo nhánh.

```typescript
function format(value: string | number) {
  if (typeof value === "string") {
    return value.toUpperCase(); // ở đây TS biết value là string
  }
  return value.toFixed(2);      // còn lại chắc chắn là number
}
```

Với discriminated union, narrow theo trường phân biệt (ở đây là `status`):

```typescript
function render(state: FetchState) {
  switch (state.status) {
    case "loading":
      return "Đang tải...";
    case "success":
      return state.data.name; // TS biết có .data
    case "error":
      return state.message;   // TS biết có .message
    case "idle":
      return null;
  }
}
```

> 💡 Ghi nhớ: Các công cụ narrow thường gặp: `typeof`, `Array.isArray()`, `in` (kiểm tra có property), so sánh literal (`state.status === "..."`), và `instanceof`. Sau khi narrow, đừng ép kiểu `as` nữa — TS đã đúng rồi.

## Generics — kiểu tham số hoá

Generic giúp viết hàm/kiểu **tái dùng được với nhiều kiểu khác nhau mà vẫn giữ type chính xác**. `<T>` là một "biến kiểu".

```typescript
// Không generic: phải viết lại cho mỗi kiểu, hoặc dùng any (mất type)
function firstString(arr: string[]): string { return arr[0]; }

// Generic: dùng cho mọi kiểu, vẫn giữ đúng type trả về
function first<T>(arr: T[]): T {
  return arr[0];
}

const a = first([1, 2, 3]);       // a: number
const b = first(["x", "y"]);      // b: string
```

Generic xuất hiện khắp nơi trong frontend: `useState<T>`, `Array<T>`, `Promise<T>`, và đặc biệt là kiểu trả về của API:

```typescript
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const user = await fetchJson<User>("/api/users/1"); // user: User
```

> ⚠️ Bẫy: `res.json()` trả về `any` (hay `unknown`) — TS *tin* bạn rằng dữ liệu đúng kiểu `T`, nhưng **không kiểm tra runtime**. Nếu API trả sai shape, type "đúng" nhưng app vẫn nổ. Giải pháp đúng đắn là validate bằng **Zod** (bài Forms & Validation).

## Utility types: Partial, Pick, Omit, Record

TS có sẵn các utility type biến đổi kiểu khác — dùng cực nhiều khi làm frontend, đỡ phải viết tay.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// Partial<T>: tất cả field thành optional — dùng cho update/patch
type UserUpdate = Partial<User>;
// { id?: number; name?: string; email?: string; age?: number }

// Pick<T, K>: chỉ lấy một số field
type UserPreview = Pick<User, "id" | "name">;
// { id: number; name: string }

// Omit<T, K>: bỏ một số field — dùng cho input tạo mới (chưa có id)
type CreateUser = Omit<User, "id">;
// { name: string; email: string; age: number }

// Record<K, V>: object có key K, value V — dùng cho map/dictionary
type RoleLabels = Record<"admin" | "user" | "guest", string>;
const labels: RoleLabels = { admin: "Quản trị", user: "Người dùng", guest: "Khách" };
```

| Utility | Công dụng | Use case frontend |
|---|---|---|
| `Partial<T>` | Mọi field optional | Form update, PATCH payload |
| `Required<T>` | Mọi field bắt buộc | Ép đủ field sau khi merge default |
| `Pick<T, K>` | Giữ vài field | Props rút gọn, preview |
| `Omit<T, K>` | Bỏ vài field | Input tạo mới (bỏ `id`, `createdAt`) |
| `Record<K, V>` | Object key→value | Map config, lookup table |
| `ReturnType<F>` | Kiểu trả về của hàm | Suy type từ hook/selector |

> 💡 Ghi nhớ: Đừng định nghĩa lại kiểu na ná nhau. Có một `interface User` "nguồn", rồi suy ra `CreateUser = Omit<User, "id">`, `UserUpdate = Partial<User>`. Sửa một chỗ, cả hệ thống đồng bộ.

## Typing props của component

Đây là phần dùng hàng ngày khi viết React. Định nghĩa kiểu cho props bằng `interface`, rồi gắn vào component.

```tsx
interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary"; // optional + literal union
  disabled?: boolean;
  onClick: () => void;
  children?: React.ReactNode;         // mọi thứ render được: text, JSX...
}

function Button({ label, variant = "primary", disabled, onClick, children }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} disabled={disabled} onClick={onClick}>
      {label}
      {children}
    </button>
  );
}

// Dùng:
<Button label="Lưu" variant="primary" onClick={() => save()} />;
<Button label="Xoá" variant="danger" onClick={() => {}} />;
// ❌ '"danger"' không gán được cho '"primary" | "secondary"'
```

Component nhận dữ liệu thật từ API:

```tsx
interface UserCardProps {
  user: User;
  onSelect?: (id: number) => void;
}

function UserCard({ user, onSelect }: UserCardProps) {
  return (
    <div onClick={() => onSelect?.(user.id)}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
}
```

> 💡 Ghi nhớ: React 19 bỏ `React.FC` khỏi khuyến nghị. Cứ viết function thường `function C(props: Props)` — gọn hơn, không bị `React.FC` ngầm thêm `children` không mong muốn.

## Typing event handler

Đừng đoán kiểu event — để TS cho biết. Mẹo: hover vào prop `onChange`/`onClick` trong JSX, editor sẽ hiện đúng kiểu.

```tsx
function SearchInput() {
  // event của input là React.ChangeEvent<HTMLInputElement>
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value); // value là string
  };

  // submit form
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  // click button
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log(e.currentTarget);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleChange} />
      <button onClick={handleClick}>OK</button>
    </form>
  );
}
```

> 💡 Ghi nhớ: Nếu handler được khai báo **inline** ngay trong JSX, TS tự suy kiểu event — không cần annotate: `onChange={(e) => setName(e.target.value)}` là đủ. Chỉ annotate khi tách hàm ra ngoài.

## Typing API response

Kết hợp generic + utility type để model dữ liệu backend trả về:

```typescript
interface ApiResponse<T> {
  data: T;
  meta: { page: number; total: number };
}

interface Post {
  id: number;
  title: string;
  authorId: number;
}

async function getPosts(): Promise<ApiResponse<Post[]>> {
  const res = await fetch("/api/posts");
  return res.json();
}

const result = await getPosts();
result.data[0].title; // ✅ TS biết là string
result.meta.page;     // ✅ number
```

## tsconfig: bật `strict`

`tsconfig.json` cấu hình compiler. Quan trọng nhất: bật `strict`. Vite/Next.js scaffold sẵn cho bạn, nhưng phải hiểu để không lỡ tay tắt.

```jsonc
{
  "compilerOptions": {
    "strict": true,              // bật cả cụm check nghiêm ngặt — BẮT BUỘC
    "noUncheckedIndexedAccess": true, // arr[i] có thể undefined — an toàn hơn
    "target": "ES2022",
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "skipLibCheck": true
  }
}
```

`strict: true` bật một loạt cờ, đáng giá nhất là `strictNullChecks` — `null`/`undefined` không còn lén lút gán vào mọi kiểu:

```typescript
function greet(name: string) { return `Hi ${name}`; }
greet(null);
// strict OFF: chạy ra "Hi null" (bug im lặng)
// strict ON: ❌ 'null' không gán được cho 'string'
```

> ⚠️ Bẫy: Dự án mới luôn bật `strict` từ đầu. Tắt rồi bật lại sau sẽ lòi ra hàng trăm lỗi cùng lúc, không ai muốn fix. Đau một lần lúc đầu, sướng cả vòng đời dự án.

## `any` vs `unknown`

`any` = "tắt type-checking cho biến này". Nó lây lan và vô hiệu hoá toàn bộ lợi ích của TS. `unknown` = "chưa biết kiểu gì, nhưng buộc bạn kiểm tra trước khi dùng" — an toàn.

```typescript
let a: any = JSON.parse(input);
a.foo.bar.baz();   // ✅ TS im lặng — và app nổ lúc runtime

let u: unknown = JSON.parse(input);
u.foo;             // ❌ TS chặn: phải narrow trước
if (typeof u === "object" && u !== null && "foo" in u) {
  // ở đây mới dùng được, sau khi đã kiểm tra
}
```

| | `any` | `unknown` |
|---|---|---|
| Gán giá trị bất kỳ vào | ✅ | ✅ |
| Dùng trực tiếp (gọi method, truy cập field) | ✅ (nguy hiểm) | ❌ phải narrow |
| Lây type-unsafe ra xung quanh | ✅ | ❌ |
| Khi nào dùng | gần như không bao giờ | ranh giới dữ liệu chưa rõ kiểu |

> 💡 Ghi nhớ: Coi `any` như "thoát hiểm khẩn cấp" — chỉ dùng tạm khi migrate code cũ. Với dữ liệu từ bên ngoài (API, `JSON.parse`, `localStorage`), dùng `unknown` rồi validate bằng Zod. Bật cờ `noImplicitAny` (đã nằm trong `strict`) để TS báo khi `any` lén vào.

## Tổng kết

- TS thêm type cho JS: bắt lỗi lúc compile + DX (autocomplete, refactor, tài liệu sống). Type bị xoá khi build.
- Annotate tham số hàm và ranh giới (props, API); để TS tự suy biến cục bộ.
- `interface` cho object/props (dễ extend), `type` cho union/tuple/alias.
- Union + literal model state UI chuẩn; narrowing (`typeof`, `in`, so sánh literal) thu hẹp kiểu an toàn.
- Generic `<T>` tái dùng logic giữ nguyên type; utility type (`Partial`/`Pick`/`Omit`/`Record`) suy kiểu từ một "nguồn" duy nhất.
- Typing props bằng `interface`, event bằng `React.ChangeEvent<...>`; inline handler thì để TS tự suy.
- Luôn bật `strict`; tránh `any`, ưu tiên `unknown` ở ranh giới dữ liệu.

## Liên hệ thực tế

- **Nối với Backend**: type response API ở frontend nên *khớp với contract* của backend. Khi backend đổi shape (đổi tên field, thêm field bắt buộc), frontend bật strict sẽ đỏ ngay chỗ liên quan — đây là "early warning". Nếu backend có **OpenAPI spec**, dùng codegen (`openapi-typescript`) sinh thẳng type từ spec, hai bên không lệch nhau. Backend dùng cùng schema Zod/JSON Schema thì frontend tái dùng được luôn.
- **Validate ở ranh giới**: type của TS *không* bảo vệ lúc runtime. Dữ liệu thật từ API/`localStorage` luôn là `unknown` cho tới khi validate (Zod) — sẽ học kỹ ở bài Forms & Validation. Đây là lớp phòng thủ thật, khác với type chỉ là "lời hứa lúc compile".
- **Khi deploy lên AWS**: TS được build (qua Vite/esbuild) thành JS tĩnh rồi đẩy lên **S3 + CloudFront** — type không tồn tại ở production, nên bug type bỏ sót sẽ chỉ lộ ở runtime trên trình duyệt người dùng. Vì vậy hãy chạy `tsc --noEmit` trong **CI/CD** (GitHub Actions / CodePipeline) như một cổng chặn: type-check fail thì không cho deploy. Đây là chốt chặn rẻ và hiệu quả nhất trong pipeline frontend.
