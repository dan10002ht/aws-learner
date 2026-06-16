# Quản lý state & data flow

Ở bài [[fe-03-hooks-state]] bạn đã biết `useState` để giữ state trong một component. Nhưng app thật không phải một component — nó là hàng chục component lồng nhau, chia sẻ dữ liệu với nhau. Câu hỏi lớn của frontend hiện đại không còn là "làm sao tạo state" mà là **"state nên sống ở đâu, ai sở hữu nó, và dữ liệu chảy từ đâu tới đâu"**.

Trả lời sai câu hỏi này là nguyên nhân số một khiến codebase React trở thành mớ bòng bong: prop drilling 7 tầng, Context khiến nửa app re-render, hoặc nhét cả response API vào Redux rồi tự tay đồng bộ cache. Bài này cho bạn một **bản đồ ra quyết định** rõ ràng: khi nào lift state, khi nào dùng Context, khi nào cần Zustand/Redux, và quan trọng nhất — khi nào **không** cần thư viện nào cả.

## 1. Data flow trong React: một chiều, từ trên xuống

React có một quy tắc nền tảng: **dữ liệu chảy một chiều** (one-way data flow). Component cha truyền dữ liệu xuống con qua **props**; con muốn thay đổi dữ liệu của cha thì gọi **callback** mà cha truyền xuống. Con không bao giờ "với tay" sửa state của cha trực tiếp.

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  // Truyền DATA xuống (count) và CÁCH thay đổi data (callback)
  return <Child count={count} onIncrement={() => setCount((c) => c + 1)} />;
}

function Child({ count, onIncrement }: { count: number; onIncrement: () => void }) {
  return <button onClick={onIncrement}>Đã bấm {count} lần</button>;
}
```

Hiểu mô hình này là chìa khoá: mọi kỹ thuật quản lý state bên dưới chỉ là các cách khác nhau để **đưa dữ liệu xuống đúng component cần nó** mà không phải truyền tay qua từng tầng.

> 💡 Ghi nhớ: State không thuộc về component "hiển thị" nó, mà thuộc về component **thấp nhất chứa tất cả những ai cần nó**. Đây là nguyên tắc đặt state đúng chỗ.

## 2. Lifting state up — nâng state lên cha chung

Khi **hai component anh em** cần dùng chung một mẩu state, bạn không thể để mỗi đứa giữ một bản riêng (chúng sẽ lệch nhau). Giải pháp chuẩn của React: **nâng state lên component cha gần nhất chứa cả hai**, rồi truyền xuống qua props.

Ví dụ một ô tìm kiếm và một danh sách kết quả cùng phụ thuộc vào từ khoá:

```tsx
function ProductPage() {
  // State sống ở cha — single source of truth cho cả hai con
  const [query, setQuery] = useState("");

  return (
    <div>
      <SearchBox value={query} onChange={setQuery} />
      <ProductList query={query} />
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Tìm sản phẩm..." />;
}

function ProductList({ query }: { query: string }) {
  const filtered = PRODUCTS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  return <ul>{filtered.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

`SearchBox` không tự giữ giá trị nữa — nó trở thành **controlled component**, hiển thị `value` từ cha và báo thay đổi qua `onChange`. `ProductPage` là **single source of truth**.

> 💡 Ghi nhớ: Lifting state up là công cụ mặc định, dùng đầu tiên. Đừng vội với tay sang Context hay Zustand khi việc nâng state lên 1-2 tầng đã giải quyết xong.

## 3. Prop drilling — khi lifting state đi quá xa

Lifting state lên cha là tốt, nhưng nếu component cần dữ liệu nằm **sâu 5-6 tầng** dưới chỗ giữ state, bạn phải truyền props qua hàng loạt component trung gian **vốn chẳng dùng tới chúng**. Đó là **prop drilling**.

```tsx
// user phải đi qua Page → Layout → Sidebar → Menu mới tới Avatar,
// dù Layout/Sidebar/Menu hoàn toàn không quan tâm tới user
<Page user={user}>
  <Layout user={user}>
    <Sidebar user={user}>
      <Menu user={user}>
        <Avatar user={user} />
```

Vấn đề của prop drilling:

| Triệu chứng | Hậu quả |
| --- | --- |
| Component trung gian nhận prop chỉ để "chuyển tiếp" | Code rối, khó đọc, khó refactor |
| Đổi shape của dữ liệu | Phải sửa cả chuỗi component dọc đường |
| Thêm một field mới cần dùng ở sâu | Sửa tay từ trên xuống tận đáy |

> ⚠️ Bẫy: Prop drilling 1-2 tầng là **hoàn toàn bình thường**, đừng vội "chữa". Chỉ khi nó vượt 3-4 tầng và lặp lại nhiều nơi thì mới nghĩ tới Context. Lạm dụng Context để né mọi prop drilling còn tệ hơn chính prop drilling.

## 4. Context API — chia sẻ "diện rộng" không qua props

**Context** cho phép một component cha "phát sóng" giá trị xuống **mọi** con cháu bên dưới, bất kể sâu bao nhiêu, mà không cần truyền props tay. Component con "bắt sóng" bằng `useContext`.

Context hợp với dữ liệu **toàn cục, ít đổi**: theme, ngôn ngữ (i18n), thông tin user đã đăng nhập, feature flags.

```tsx
import { createContext, useContext, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type ThemeContextValue = { theme: Theme; toggle: () => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const value = { theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Custom hook: vừa lấy context vừa chặn dùng ngoài Provider
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme phải dùng bên trong <ThemeProvider>");
  return ctx;
}
```

Dùng ở bất kỳ component con cháu nào, không cần truyền props:

```tsx
function ThemeToggle() {
  const { theme, toggle } = useTheme(); // bắt sóng trực tiếp
  return <button onClick={toggle}>Chế độ: {theme}</button>;
}
```

> 💡 Ghi nhớ: Luôn bọc Context bằng một **custom hook** (`useTheme`) thay vì để component tự gọi `useContext(ThemeContext)`. Hook giúp bạn kiểm tra Provider, ẩn chi tiết, và đổi cách lưu state sau này mà không phải sửa nơi dùng.

### 4.1. Bẫy re-render của Context

Đây là cạm bẫy lớn nhất, gần như ai cũng dính: **khi value của Context đổi, MỌI component đang `useContext` nó sẽ re-render** — kể cả khi chúng chỉ dùng một phần value không đổi.

Hai lỗi kinh điển:

```tsx
// ❌ SAI: value là object mới mỗi lần Provider render → mọi consumer re-render liên tục
<ThemeContext.Provider value={{ theme, toggle: () => setTheme(...) }}>

// ✅ Đúng hơn: memo hoá value để giữ tham chiếu ổn định
const value = useMemo(() => ({ theme, toggle }), [theme]);
<ThemeContext.Provider value={value}>
```

Và lỗi gộp quá nhiều thứ vào một Context:

```tsx
// ❌ Nhét user + theme + giỏ hàng + filter vào MỘT context.
//    Giỏ hàng đổi → component chỉ cần theme cũng re-render.

// ✅ Tách thành nhiều context nhỏ theo nhịp thay đổi:
//    AuthContext (đổi rất hiếm), ThemeContext (đổi hiếm), CartContext (đổi thường xuyên)
```

> ⚠️ Bẫy: Đừng dùng Context cho state **đổi liên tục, tần suất cao** (vị trí chuột, giá trị ô input đang gõ, state cập nhật mỗi giây). Mỗi lần đổi là một làn sóng re-render toàn cây con. Loại state đó nên dùng local state hoặc thư viện có selector như Zustand.

## 5. Server state vs client state — khác biệt quan trọng nhất

Đây là phân biệt mà người mới hay bỏ qua nhưng **quyết định toàn bộ kiến trúc state** của app. Không phải mọi state đều giống nhau:

| | **Client state** | **Server state** |
| --- | --- | --- |
| Nguồn sự thật | Trong trình duyệt, do bạn sở hữu | Trên server/database, bạn chỉ "mượn" |
| Ví dụ | Modal đang mở, theme, tab đang chọn, form đang gõ | Danh sách sản phẩm, thông tin user, đơn hàng |
| Tính chất | Đồng bộ, luôn đúng ngay | Bất đồng bộ, có thể **cũ** (stale), người khác sửa được |
| Cần lo | Cập nhật, reset | Loading, error, cache, refetch, đồng bộ lại |
| Công cụ hợp | useState, Context, Zustand | **React Query / SWR** |

Sai lầm phổ biến nhất: nhét **server state vào Redux/Zustand** rồi tự tay viết logic loading, error, cache, refetch. Bạn sẽ tái phát minh — một cách tệ hơn — đúng những gì React Query làm sẵn.

```tsx
// ❌ Cách cũ: dùng useState + useEffect để giữ server state.
//    Tự lo loading/error, không có cache, mỗi lần mount lại fetch.
function UsersBad() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers)
      .catch(setError).finally(() => setLoading(false));
  }, []);
  // ...còn phải tự lo: refetch, cache, dedupe, đồng bộ giữa nhiều component
}

// ✅ React Query: khai báo, có cache + dedupe + refetch + stale tự động
import { useQuery } from "@tanstack/react-query";

function UsersGood() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });
  if (isLoading) return <p>Đang tải...</p>;
  if (error) return <p>Lỗi rồi</p>;
  return <ul>{data.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

> 💡 Ghi nhớ: Quy tắc vàng — **dữ liệu lấy từ API là server state, hãy để React Query/SWR quản lý nó.** Client state mới là phần dùng useState/Context/Zustand. Tách đúng hai loại này, 80% nhu cầu "quản lý state" của bạn biến mất. Chi tiết React Query ở bài [[fe-05-routing-data]].

## 6. Khi nào cần Zustand / Redux Toolkit — và khi nào KHÔNG

Sau khi đã (1) lift state, (2) dùng Context cho dữ liệu toàn cục ít đổi, (3) giao server state cho React Query — phần **client state toàn cục đổi thường xuyên** còn lại mới cần một **state manager** như Zustand hoặc Redux Toolkit.

Ví dụ hợp lý: giỏ hàng truy cập từ nhiều trang, bộ lọc phức tạp dùng chung, trạng thái sidebar/modal toàn app, state của một editor/canvas.

### Cây quyết định

| Tình huống | Dùng gì |
| --- | --- |
| State chỉ một component dùng | `useState` |
| Vài component anh em dùng chung | Lifting state up |
| Dữ liệu toàn cục **ít đổi** (theme, user, locale) | Context API |
| Dữ liệu từ **API** (loading/cache/refetch) | React Query / SWR |
| Client state **toàn cục, đổi thường xuyên**, nhiều nơi đọc/ghi | Zustand (hoặc Redux Toolkit) |
| App rất lớn, cần devtools/middleware/time-travel mạnh, đội đông | Redux Toolkit |

> ⚠️ Bẫy: Đừng cài Redux/Zustand "cho chắc" ngay từ đầu dự án. Phần lớn app vừa và nhỏ năm 2025-2026 chạy tốt **chỉ với useState + Context + React Query**. Thêm state manager khi bạn thực sự thấy đau, không phải vì thói quen. Năm 2026, nếu cần thì Zustand là lựa chọn mặc định gọn nhẹ; Redux Toolkit hợp app lớn cần hệ sinh thái mạnh, KHÔNG dùng Redux "kiểu cũ" với boilerplate `connect`/action creator thủ công.

### Zustand — gọn, không cần Provider

Zustand tạo một "store" là hook bình thường. Không cần bọc Provider, component **chọn lọc** đúng mẩu state mình cần (selector) nên chỉ re-render khi mẩu đó đổi — tránh đúng cái bẫy re-render của Context.

```typescript
// store/cartStore.ts
import { create } from "zustand";

type CartItem = { id: string; name: string; price: number; qty: number };

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (id: string) => void;
  total: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        // Immutable: tạo mảng MỚI, không sửa state cũ tại chỗ
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, qty: i.qty + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, qty: 1 }] };
    }),
  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
}));
```

Dùng trong component — mỗi component chỉ "đăng ký" đúng phần nó cần:

```tsx
function CartBadge() {
  // CHỈ subscribe vào số lượng item → chỉ re-render khi số đó đổi
  const count = useCartStore((s) => s.items.length);
  return <span className="badge">{count}</span>;
}

function AddButton({ product }: { product: { id: string; name: string; price: number } }) {
  // CHỈ lấy action addItem → component này gần như không re-render
  const addItem = useCartStore((s) => s.addItem);
  return <button onClick={() => addItem(product)}>Thêm vào giỏ</button>;
}
```

> 💡 Ghi nhớ: Bí quyết dùng Zustand đúng là **luôn truyền selector** (`useCartStore((s) => s.items.length)`) thay vì lấy cả store (`useCartStore()`). Lấy cả store sẽ khiến component re-render mỗi khi **bất kỳ** field nào trong store đổi — mất sạch lợi thế của Zustand.

### Redux Toolkit — khi cần hệ sinh thái mạnh

Redux Toolkit (RTK) là cách viết Redux **hiện đại, ít boilerplate** — đừng nhầm với Redux cũ. RTK dùng `createSlice` và cho phép viết code **trông như** mutate (nhờ thư viện Immer xử lý immutability bên dưới):

```typescript
// features/counterSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    // Immer cho phép "mutate" state.value — bên dưới vẫn tạo state mới, immutable
    increment: (state) => { state.value += 1; },
    addBy: (state, action: PayloadAction<number>) => { state.value += action.payload; },
  },
});

export const { increment, addBy } = counterSlice.actions;
export default counterSlice.reducer;
```

So với Zustand, RTK nặng tay hơn (cần Provider, store, slice, dispatch) nhưng đổi lại có **DevTools mạnh, middleware, RTK Query, cấu trúc chuẩn hoá** cho đội đông và app phức tạp.

## 7. Immutability — đừng bao giờ sửa state tại chỗ

React (và mọi state manager) phát hiện thay đổi bằng cách **so sánh tham chiếu** (`oldState !== newState`). Nếu bạn sửa object/mảng **tại chỗ** (mutate), tham chiếu không đổi → React tưởng "không có gì thay đổi" → **không re-render**. Đây là bug "đã setState rồi mà UI không cập nhật" kinh điển.

```tsx
const [todos, setTodos] = useState<Todo[]>([]);

// ❌ SAI: mutate mảng cũ — cùng tham chiếu, React không re-render
function addBad(t: Todo) {
  todos.push(t);
  setTodos(todos); // cùng object → React bỏ qua
}

// ✅ Đúng: tạo MẢNG MỚI
function addGood(t: Todo) {
  setTodos((prev) => [...prev, t]);
}

// ✅ Cập nhật 1 phần tử: map ra mảng mới với object mới
function toggle(id: string) {
  setTodos((prev) =>
    prev.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo))
  );
}
```

| Thao tác | Cách immutable |
| --- | --- |
| Thêm vào mảng | `[...arr, item]` |
| Xoá khỏi mảng | `arr.filter((x) => x.id !== id)` |
| Sửa 1 phần tử | `arr.map((x) => x.id === id ? {...x, ...patch} : x)` |
| Sửa field object | `{ ...obj, field: newValue }` |

> ⚠️ Bẫy: `push`, `pop`, `splice`, `sort`, `reverse`, hay gán `obj.field = ...` đều **mutate tại chỗ**. Với state lồng sâu, viết spread tay rất rối — khi đó dùng Immer (`produce`) hoặc Zustand/RTK (đã tích hợp Immer) để viết gọn mà vẫn immutable.

## 8. Single source of truth — một sự thật duy nhất

Nguyên tắc xuyên suốt cả bài: **mỗi mẩu dữ liệu chỉ nên có MỘT nơi sở hữu**. Đừng lưu cùng một thông tin ở hai chỗ rồi tự đồng bộ — chúng chắc chắn sẽ lệch nhau.

```tsx
// ❌ SAI: lưu cả user VÀ fullName — hai nguồn sự thật, dễ lệch
const [user, setUser] = useState({ firstName: "An", lastName: "Le" });
const [fullName, setFullName] = useState("An Le"); // thừa, sẽ out-of-sync!

// ✅ Đúng: chỉ giữ nguồn gốc, phần dẫn xuất thì TÍNH lúc render
const [user, setUser] = useState({ firstName: "An", lastName: "Le" });
const fullName = `${user.firstName} ${user.lastName}`; // derived state
```

Quy tắc đi kèm: **state dẫn xuất (derived state) thì tính khi render, đừng lưu thành state riêng.** Nếu một giá trị có thể suy ra từ state/props khác, nó không nên là state. Tính nặng thì bọc `useMemo`, nhưng vẫn là tính chứ không lưu.

> 💡 Ghi nhớ: Trước khi tạo một `useState` mới, hỏi: "giá trị này có suy ra được từ thứ tôi đã có không?". Nếu có → đừng tạo state, hãy tính nó. Ít state hơn = ít bug đồng bộ hơn.

## 9. Tổng kết: bản đồ ra quyết định

Quy trình suy nghĩ khi gặp một mẩu state mới, theo thứ tự:

1. **Dữ liệu này từ API?** → server state → React Query/SWR. Dừng.
2. **Chỉ một component dùng?** → `useState`. Dừng.
3. **Vài component anh em dùng chung?** → lifting state up. Dừng.
4. **Toàn cục, ít đổi (theme/user/locale)?** → Context (nhớ memo value, tách context nhỏ). Dừng.
5. **Toàn cục, đổi thường xuyên, nhiều nơi đọc/ghi?** → Zustand (mặc định) hoặc Redux Toolkit (app lớn).

Và luôn giữ hai nguyên tắc nền: **immutability** (luôn tạo dữ liệu mới) và **single source of truth** (một nơi sở hữu, phần dẫn xuất thì tính).

> 💡 Ghi nhớ: Phần lớn lỗi state không phải do thiếu thư viện, mà do **đặt state sai chỗ** và **trộn lẫn server state với client state**. Sửa hai điều này trước, đa số dự án không cần Redux.

## Liên hệ thực tế

Việc tách **server state vs client state** không chỉ là chuyện frontend — nó định hình cách bạn làm việc với backend. Server state (danh sách, đơn hàng, profile) là dữ liệu **mượn** từ API mà đội backend phơi ra; React Query giúp bạn cache và đồng bộ lại nó thay vì copy cứng vào store. Khi backend đổi shape response, bạn chỉ chỉnh `queryFn` và schema (kết hợp Zod để validate, xem bài [[fe-06-forms]]), chứ không phải sửa cả một tầng Redux tự viết.

Khi deploy lên AWS, hai loại state này còn ánh xạ rất rõ vào hạ tầng: **client state** sống trong bundle JavaScript tĩnh — file build từ Vite được đẩy lên **S3** và phân phối qua **CloudFront** (xem bài [[fe-09-build-deploy-perf]]). Còn **server state** đến từ API backend chạy trên **API Gateway + Lambda** hoặc **ECS**, đọc/ghi vào **RDS/DynamoDB**. CloudFront cache asset tĩnh ở edge cho nhanh; React Query cache server state trong trình duyệt cho mượt — hai lớp cache ở hai tầng, đúng tinh thần "mỗi loại dữ liệu sống đúng chỗ của nó" mà cả bài này nhấn mạnh.
