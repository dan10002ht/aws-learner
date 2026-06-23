# Routing & Data Fetching

Một app frontend thực tế gần như không bao giờ chỉ có một màn hình. Người dùng vào danh sách sản phẩm, bấm vào một sản phẩm để xem chi tiết, rồi quay lại. URL phải đổi theo (`/products` → `/products/42`), nút Back của trình duyệt phải hoạt động, và mỗi màn hình phải tự lấy đúng dữ liệu của mình.

Bài này gồm hai mảnh ghép luôn đi cùng nhau trong app React đi làm:

1. **Client-side routing** với React Router: chuyển màn hình mà không reload cả trang.
2. **Data fetching đúng cách** với TanStack Query (React Query): cache, loading/error, refetch, mutation + invalidate, optimistic update — và vì sao nó tốt hơn hẳn `useEffect + fetch` tự viết.

Xuyên suốt bài ta dựng một ví dụ kinh điển: **list sản phẩm → chi tiết sản phẩm**, gọi tới một backend REST (`GET /products`, `GET /products/:id`, `POST /products`...).

## Client-side routing là gì?

Web "truyền thống" (MPA — multi-page app): mỗi link là một request mới tới server, server trả về một trang HTML mới, trình duyệt **reload toàn bộ**. Màn hình trắng một nhịp, mất state trong JS.

SPA (single-page app) như React: trình duyệt tải **một** file HTML + một bundle JS. Sau đó khi bấm link, React Router **chặn** việc reload, chỉ đổi URL bằng History API và **render component khác** ngay trong trang. Không reload, không màn hình trắng, state giữ nguyên.

> 💡 **Ghi nhớ:** Routing trong SPA = "đổi URL → đổi component đang render", tất cả diễn ra trong trình duyệt. Server thường chỉ trả về cùng một `index.html` cho mọi đường dẫn (điều này quan trọng khi deploy — xem cuối bài).

## Cài & cấu hình React Router

Năm 2025–2026, React Router v6/v7 là lựa chọn phổ biến nhất cho SPA thuần (Next.js có router riêng — bài này nói về SPA Vite + React Router).

```bash
npm install react-router-dom
```

Khai báo route bằng JSX, gói toàn app trong `BrowserRouter`:

```tsx
// main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

```tsx
// App.tsx
import { Routes, Route } from "react-router-dom";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProductList />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="*" element={<NotFound />} />   {/* fallback 404 */}
    </Routes>
  );
}
```

- `path="/products/:id"` — `:id` là **route param** (đoạn động trong URL).
- `path="*"` — bắt mọi URL không khớp, dùng cho trang 404.

## Link & điều hướng

Đừng dùng thẻ `<a href>` cho route nội bộ — nó sẽ reload cả trang và mất hết cái lợi của SPA. Dùng `<Link>`:

```tsx
import { Link } from "react-router-dom";

<Link to={`/products/${product.id}`}>{product.name}</Link>
```

Muốn điều hướng bằng code (sau khi submit form, sau khi login...), dùng hook `useNavigate`:

```tsx
import { useNavigate } from "react-router-dom";

function CreateButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        // ...làm gì đó...
        navigate("/products/42");      // đi tới trang mới
        // navigate(-1);               // quay lại như nút Back
      }}
    >
      Tạo xong
    </button>
  );
}
```

> ⚠️ **Bẫy:** Dùng `<a href="/products/42">` cho link nội bộ. Trình duyệt sẽ tải lại toàn bộ app từ đầu (reset state, mất tốc độ). Quy tắc: link **trong** app dùng `<Link>`/`navigate`, link **ra ngoài** (website khác) mới dùng `<a>`.

## Đọc route param

Trong trang chi tiết, lấy `:id` từ URL bằng `useParams`:

```tsx
// pages/ProductDetail.tsx
import { useParams } from "react-router-dom";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();   // id luôn là string | undefined
  // ...dùng id để fetch sản phẩm tương ứng
}
```

> ⚠️ **Bẫy:** `useParams` luôn trả về **string**, kể cả khi nó nhìn như số. Nếu backend cần number, nhớ `Number(id)`. Và `id` có thể `undefined` (TypeScript sẽ nhắc), nên xử lý trường hợp thiếu.

Ngoài route param, còn có **query string** (`?sort=price&page=2`) đọc bằng `useSearchParams`:

```tsx
import { useSearchParams } from "react-router-dom";

const [searchParams, setSearchParams] = useSearchParams();
const sort = searchParams.get("sort") ?? "name";
// đổi query: setSearchParams({ sort: "price", page: "2" });
```

| Loại | Ví dụ URL | Dùng cho | Hook |
|------|-----------|----------|------|
| Route param | `/products/42` | Định danh tài nguyên (id, slug) | `useParams` |
| Query string | `/products?sort=price` | Lọc, sắp xếp, phân trang (tùy chọn) | `useSearchParams` |

## Nested routes & layout chung

Hầu hết app có phần khung lặp lại: header, sidebar, footer. Đừng copy vào từng trang — dùng **nested route** với `<Outlet />` làm "chỗ cắm" cho route con.

```tsx
// App.tsx
import { Routes, Route, Outlet, Link } from "react-router-dom";

function Layout() {
  return (
    <div>
      <header><Link to="/">Shop</Link></header>
      <main>
        <Outlet />   {/* route con render vào đây */}
      </main>
    </div>
  );
}

<Routes>
  <Route element={<Layout />}>
    <Route index element={<ProductList />} />          {/* path "/" */}
    <Route path="products/:id" element={<ProductDetail />} />
  </Route>
</Routes>
```

`Layout` render một lần; khi đổi route con, chỉ phần trong `<Outlet />` đổi. Header/sidebar giữ nguyên, không re-mount.

> 💡 **Ghi nhớ:** `Outlet` cho route giống như `children` cho component — nó là chỗ React Router "cắm" component của route con vào layout cha.

## Data fetching: cách "ngây thơ" với useEffect + fetch

Trước khi thấy React Query, hãy xem cách ai cũng viết lần đầu — và vì sao nó đau:

```tsx
function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/products")
      .then((res) => {
        if (!res.ok) throw new Error("Lỗi tải dữ liệu");
        return res.json();
      })
      .then((data) => setProducts(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Đang tải...</p>;
  if (error) return <p>Lỗi: {error}</p>;
  return <ul>{products.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

Code này *chạy được*, nhưng thiếu rất nhiều thứ mà app thật cần:

- **Không có cache.** Rời trang rồi quay lại → fetch lại từ đầu, lại thấy spinner. Mỗi component tự fetch, gọi cùng API nhiều lần.
- **Race condition.** Param đổi nhanh (gõ search) → nhiều request đua nhau, response về không đúng thứ tự, hiển thị dữ liệu cũ đè dữ liệu mới.
- **Không tự refetch** khi cần (quay lại tab, mạng có lại).
- **Lặp code.** Bộ ba `loading/error/data` phải viết tay ở *mọi* component fetch.
- **Không dedupe.** Hai component cùng cần `/api/products` → hai request.

> ⚠️ **Bẫy:** `useEffect + fetch` rất hay quên cleanup, dẫn tới race condition và warning "set state trên component đã unmount". Tự xử lý đúng tất cả (cache, dedupe, retry, cancel) là viết lại... gần hết React Query.

## React Query (TanStack Query): công cụ cho server state

Ý tưởng cốt lõi: dữ liệu lấy từ server là một loại state **đặc biệt** (server state) — nó sống ở nơi khác, có thể cũ đi, cần cache và đồng bộ. React Query quản lý riêng loại state này, tách khỏi client state (như `useState` cho form, modal).

```bash
npm install @tanstack/react-query
```

```tsx
// main.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>,
);
```

### Tách hàm fetch (validate bằng Zod)

Tách lời gọi API ra khỏi component, và validate response bằng **Zod** để chắc chắn dữ liệu đúng kiểu lúc runtime (TypeScript chỉ kiểm tra lúc compile, không bảo vệ bạn khỏi backend trả sai).

```typescript
// api/products.ts
import { z } from "zod";

const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  inStock: z.boolean(),
});
export type Product = z.infer<typeof ProductSchema>;   // kiểu TS sinh từ schema

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("Không tải được danh sách sản phẩm");
  const json = await res.json();
  return z.array(ProductSchema).parse(json);   // ném lỗi nếu shape sai
}

export async function fetchProduct(id: number): Promise<Product> {
  const res = await fetch(`/api/products/${id}`);
  if (!res.ok) throw new Error("Không tải được sản phẩm");
  return ProductSchema.parse(await res.json());
}
```

### useQuery — đọc dữ liệu (list)

```tsx
// pages/ProductList.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchProducts } from "../api/products";

export default function ProductList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products"],          // "địa chỉ" của dữ liệu trong cache
    queryFn: fetchProducts,          // hàm trả Promise
  });

  if (isLoading) return <p>Đang tải...</p>;
  if (isError) return <p>Lỗi: {error.message}</p>;

  return (
    <ul>
      {data!.map((p) => (
        <li key={p.id}>
          <Link to={`/products/${p.id}`}>{p.name}</Link> — {p.price}đ
        </li>
      ))}
    </ul>
  );
}
```

So với 20 dòng `useEffect` ở trên: không tự quản `useState`, tự có loading/error, **và** tự có cache, dedupe, retry, refetch — miễn phí.

### useQuery với param (detail)

`queryKey` chứa luôn `id` để mỗi sản phẩm có ô cache riêng:

```tsx
// pages/ProductDetail.tsx
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProduct } from "../api/products";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", productId],     // key gồm id → cache riêng từng sản phẩm
    queryFn: () => fetchProduct(productId),
    enabled: !Number.isNaN(productId),     // chỉ chạy khi id hợp lệ
  });

  if (isLoading) return <p>Đang tải...</p>;
  if (isError) return <p>Lỗi: {error.message}</p>;

  return (
    <article>
      <h1>{data!.name}</h1>
      <p>Giá: {data!.price}đ</p>
      <p>{data!.inStock ? "Còn hàng" : "Hết hàng"}</p>
    </article>
  );
}
```

> 💡 **Ghi nhớ:** `queryKey` là *định danh* của dữ liệu trong cache. Cùng key → dùng chung cache, dedupe request. Key đổi (vd đổi `id`) → React Query coi là dữ liệu khác và fetch mới. Luôn đưa mọi tham số ảnh hưởng tới kết quả vào key.

## Cache, stale & refetch — trái tim của React Query

Mỗi query có một vòng đời cache. Hai mốc thời gian cần nắm:

| Khái niệm | Ý nghĩa | Mặc định |
|-----------|---------|----------|
| `staleTime` | Bao lâu dữ liệu được coi là "còn tươi" (không cần fetch lại) | `0` (tươi tức thì, stale ngay) |
| `gcTime` (cũ: `cacheTime`) | Cache còn được giữ bao lâu sau khi không component nào dùng | 5 phút |

Cơ chế **stale-while-revalidate**: khi dữ liệu đã stale và bạn quay lại trang, React Query **hiển thị ngay dữ liệu cũ từ cache** (không spinner) **rồi âm thầm fetch lại** ở nền, cập nhật khi xong. Người dùng thấy giao diện tức thì, dữ liệu vẫn được làm mới.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời cache của một query trong React Query</title>
  <desc>Sơ đồ trạng thái theo thời gian: fetch xong dữ liệu fresh trong staleTime, hết staleTime chuyển sang stale, khi remount hoặc focus thì hiển thị ngay cache cũ và âm thầm refetch ở nền rồi cập nhật; khi không còn component nào dùng, sau gcTime cache bị dọn; mutation thành công gọi invalidateQueries để đánh dấu stale và refetch.</desc>

  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Vòng đời cache của một query (stale-while-revalidate)</text>

  <defs>
    <marker id="rqArrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
    </marker>
  </defs>

  <!-- FRESH -->
  <rect x="16" y="52" width="200" height="78" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="28" y="64" width="64" height="20" rx="10" fill="#10b981" fill-opacity="0.95"/>
  <text x="60" y="78" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">FRESH</text>
  <text x="28" y="104" font-size="12" font-weight="700" fill="currentColor">Còn tươi</text>
  <text x="28" y="121" font-size="11" fill="currentColor" opacity="0.65">Trong staleTime → KHÔNG refetch</text>

  <!-- STALE -->
  <rect x="262" y="52" width="200" height="78" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="274" y="64" width="64" height="20" rx="10" fill="#f59e0b" fill-opacity="0.95"/>
  <text x="306" y="78" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">STALE</text>
  <text x="274" y="104" font-size="12" font-weight="700" fill="currentColor">Đã cũ</text>
  <text x="274" y="121" font-size="11" fill="currentColor" opacity="0.65">Cache vẫn giữ, chờ dịp refetch</text>

  <!-- REFETCH (revalidate) -->
  <rect x="508" y="52" width="196" height="78" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="520" y="64" width="92" height="20" rx="10" fill="#3b82f6" fill-opacity="0.95"/>
  <text x="566" y="78" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">REFETCHING</text>
  <text x="520" y="104" font-size="11.5" font-weight="700" fill="currentColor">Hiện cache cũ ngay</text>
  <text x="520" y="121" font-size="11" fill="currentColor" opacity="0.65">đồng thời fetch lại ở nền</text>

  <!-- arrows top row -->
  <line x1="216" y1="91" x2="258" y2="91" stroke="currentColor" stroke-opacity="0.75" marker-end="url(#rqArrow)"/>
  <text x="237" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">hết</text>
  <text x="237" y="46" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">staleTime</text>

  <line x1="462" y1="91" x2="504" y2="91" stroke="currentColor" stroke-opacity="0.75" marker-end="url(#rqArrow)"/>
  <text x="483" y="40" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">remount /</text>
  <text x="483" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">focus</text>

  <!-- refetch -> fresh loop (data mới về) -->
  <path d="M606 130 v40 H116 v-40" fill="none" stroke="currentColor" stroke-opacity="0.6" marker-end="url(#rqArrow)"/>
  <text x="360" y="186" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">fetch xong → data mới ghi vào cache, quay lại FRESH (UI cập nhật)</text>

  <!-- gcTime / garbage collection -->
  <rect x="262" y="214" width="200" height="62" rx="10" fill="#8b5cf6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
  <rect x="274" y="224" width="62" height="20" rx="10" fill="#8b5cf6" fill-opacity="0.95"/>
  <text x="305" y="238" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">GC</text>
  <text x="274" y="262" font-size="11" fill="currentColor" opacity="0.7">Hết gcTime → xoá khỏi cache</text>
  <line x1="306" y1="130" x2="306" y2="210" stroke="currentColor" stroke-opacity="0.6" stroke-dasharray="4 3" marker-end="url(#rqArrow)"/>
  <text x="316" y="172" font-size="9.5" fill="currentColor" opacity="0.7">không component nào dùng</text>

  <!-- mutation -> invalidate -->
  <rect x="16" y="320" width="688" height="94" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/>
  <text x="32" y="344" font-size="12.5" font-weight="700" fill="currentColor">Ghi dữ liệu (mutation) → đồng bộ lại cache</text>

  <rect x="32" y="356" width="150" height="42" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="107" y="375" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">useMutation</text>
  <text x="107" y="390" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">POST / PUT / DELETE</text>

  <rect x="248" y="356" width="170" height="42" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="333" y="375" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">invalidateQueries</text>
  <text x="333" y="390" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">trong onSuccess → đánh dấu STALE</text>

  <rect x="484" y="356" width="196" height="42" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="582" y="375" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">refetch → FRESH lại</text>
  <text x="582" y="390" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.65">danh sách tự cập nhật</text>

  <line x1="182" y1="377" x2="244" y2="377" stroke="currentColor" stroke-opacity="0.75" marker-end="url(#rqArrow)"/>
  <text x="213" y="370" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">onSuccess</text>
  <line x1="418" y1="377" x2="480" y2="377" stroke="currentColor" stroke-opacity="0.75" marker-end="url(#rqArrow)"/>
</svg>


React Query tự refetch khi: component mount lại (mà data đã stale), **cửa sổ được focus lại** (`refetchOnWindowFocus`), mạng kết nối lại. Đây là lý do app cảm giác "luôn cập nhật" mà bạn không viết dòng nào.

```tsx
useQuery({
  queryKey: ["products"],
  queryFn: fetchProducts,
  staleTime: 60_000,   // coi là tươi trong 60s → không refetch liên tục
});
```

> 💡 **Ghi nhớ:** `staleTime` cao = ít request hơn nhưng dữ liệu có thể cũ hơn; `staleTime` thấp/0 = luôn mới nhưng nhiều request. Dữ liệu ít đổi (danh mục, hồ sơ) → `staleTime` cao. Dữ liệu sống động (giá real-time, tồn kho) → để thấp.

## Mutation — ghi dữ liệu & invalidate

`useQuery` để **đọc**. Để **ghi** (POST/PUT/DELETE) dùng `useMutation`. Sau khi ghi thành công, dữ liệu cache cũ đã sai → ta **invalidate** để React Query refetch.

```typescript
// api/products.ts
export async function createProduct(input: { name: string; price: number }): Promise<Product> {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Tạo sản phẩm thất bại");
  return ProductSchema.parse(await res.json());
}
```

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createProduct } from "../api/products";

function CreateProductForm() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (newProduct) => {
      // Báo cache "danh sách products đã cũ" → tự refetch
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate(`/products/${newProduct.id}`);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate({ name: "Áo thun", price: 199000 });
      }}
    >
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Đang lưu..." : "Tạo sản phẩm"}
      </button>
      {mutation.isError && <p>Lỗi: {mutation.error.message}</p>}
    </form>
  );
}
```

> 💡 **Ghi nhớ:** Mẫu chuẩn = `useMutation` để ghi, rồi `invalidateQueries` trong `onSuccess` để đồng bộ lại dữ liệu liên quan. Bạn không tự `setState` cập nhật list — chỉ cần báo "key này cũ rồi", React Query lo phần còn lại.

## Optimistic update — UI phản hồi tức thì

Với hành động cần cảm giác nhanh (like, toggle, thêm vào giỏ), đừng đợi server. **Optimistic update**: cập nhật UI ngay *trước khi* server trả lời, và rollback nếu lỗi.

```tsx
const queryClient = useQueryClient();

const toggleStock = useMutation({
  mutationFn: (p: Product) =>
    updateProduct(p.id, { inStock: !p.inStock }),

  // Chạy NGAY khi mutate, trước khi server trả lời
  onMutate: async (p) => {
    await queryClient.cancelQueries({ queryKey: ["products", p.id] });
    const previous = queryClient.getQueryData<Product>(["products", p.id]);
    // Cập nhật lạc quan ngay vào cache
    queryClient.setQueryData<Product>(["products", p.id], {
      ...p,
      inStock: !p.inStock,
    });
    return { previous };   // gửi snapshot cho onError dùng rollback
  },

  // Lỗi → trả lại giá trị cũ
  onError: (_err, p, context) => {
    if (context?.previous) {
      queryClient.setQueryData(["products", p.id], context.previous);
    }
  },

  // Dù thành công hay lỗi, đồng bộ lại với server cho chắc
  onSettled: (_data, _err, p) => {
    queryClient.invalidateQueries({ queryKey: ["products", p.id] });
  },
});
```

> ⚠️ **Bẫy:** Optimistic update *bắt buộc* phải có rollback (`onError`) và đồng bộ lại (`onSettled`). Thiếu rollback, khi request lỗi, UI sẽ kẹt ở trạng thái sai mà người dùng tưởng đã thành công. Chỉ dùng optimistic cho hành động *rất hay thành công* và *dễ đảo ngược*.

## Suspense & Error Boundary

React 19 + React Query hỗ trợ chế độ Suspense: thay vì kiểm tra `isLoading` trong từng component, bạn để `<Suspense>` lo phần loading và `<ErrorBoundary>` lo phần lỗi — tách UI trạng thái ra khỏi logic component.

```tsx
import { useSuspenseQuery } from "@tanstack/react-query";

function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  // Không còn isLoading/isError — component này CHỈ render khi đã có data
  const { data } = useSuspenseQuery({
    queryKey: ["products", Number(id)],
    queryFn: () => fetchProduct(Number(id)),
  });
  return <h1>{data.name}</h1>;
}
```

```tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary fallback={<p>Đã có lỗi xảy ra.</p>}>
  <Suspense fallback={<p>Đang tải...</p>}>
    <ProductDetail />
  </Suspense>
</ErrorBoundary>;
```

- `useSuspenseQuery` "treo" component cho đến khi có data → component bên trong không cần xử lý loading; `<Suspense fallback>` hiện trong lúc chờ.
- Khi `queryFn` ném lỗi, lỗi nổi lên **error boundary** gần nhất → hiện `fallback` lỗi.

> 💡 **Ghi nhớ:** `<Suspense>` xử lý *loading*, `<ErrorBoundary>` xử lý *error*. `Error Boundary` phải là **class component** hoặc dùng thư viện `react-error-boundary`, vì hiện chưa có hook bắt lỗi render. Đặt boundary đủ nhỏ để chỉ một phần UI lỗi, phần còn lại vẫn dùng được.

## React Query vs useEffect+fetch — chốt lại

| Tiêu chí | `useEffect + fetch` | React Query |
|----------|---------------------|-------------|
| Loading / error state | Tự viết `useState` ở mọi nơi | Có sẵn (`isLoading`, `isError`) |
| Cache | Không | Có, theo `queryKey` |
| Dedupe request trùng | Không | Có |
| Refetch (focus, reconnect) | Tự viết | Tự động |
| Race condition | Phải tự cancel | Tự xử lý |
| Retry khi lỗi | Tự viết | Mặc định retry 3 lần |
| Mutation + đồng bộ | Tự `setState` thủ công | `invalidateQueries` |
| Optimistic update | Rất khó tự làm đúng | Có pattern sẵn |
| Lượng code | Nhiều, lặp lại | Ít, khai báo |

> ⚠️ **Bẫy:** Không phải mọi thứ đều là server state. State *thuần client* (form đang nhập, modal mở/đóng, tab đang chọn) vẫn dùng `useState`/Zustand. React Query là cho **dữ liệu thuộc về server**. Đừng nhét mọi state vào React Query.

## Khi nào dùng gì

- **React Router** cho mọi SPA nhiều màn hình. Dự án mới quy mô lớn có thể cân nhắc full-stack framework (Next.js, Remix) với router tích hợp + server rendering.
- **TanStack Query** là mặc định cho data fetching trong SPA React 2025–2026. **SWR** là lựa chọn nhẹ tương đương (cùng triết lý stale-while-revalidate), API gọn hơn nhưng ít tính năng mutation nâng cao.
- **`useEffect + fetch`** chỉ hợp việc một lần, không cần cache (vd: gửi log analytics, gọi một API duy nhất lúc khởi động).
- Nếu đã dùng **Next.js App Router**: data fetching nên ưu tiên Server Components + `fetch` của Next; React Query vẫn dùng cho phần client tương tác (vô hạn cuộn, optimistic...).

## Liên hệ thực tế

Phần routing và data fetching này là nơi frontend **chạm vào backend và hạ tầng** một cách rõ rệt nhất:

- **API của Backend:** mọi `queryFn`/`mutationFn` đều gọi tới REST/GraphQL mà đội backend dựng (Node/Express, NestJS, hay AWS API Gateway + Lambda). `queryKey` của bạn thường ánh xạ 1–1 với endpoint (`["products", id]` ↔ `GET /products/:id`). Thống nhất shape dữ liệu với backend, và **validate bằng Zod** ở ranh giới để frontend không vỡ khi backend đổi field.

- **CORS:** khi frontend (vd `https://shop.example.com`) gọi API ở domain khác (vd `https://api.example.com`), backend phải bật CORS cho đúng origin — nếu không, mọi `fetch` sẽ fail dù URL đúng. Đây là lỗi "request chạy ở Postman nhưng chết trên trình duyệt" rất hay gặp.

- **Deploy SPA lên AWS (S3 + CloudFront):** vì client-side routing nằm hết ở trình duyệt, server chỉ có một `index.html`. Khi người dùng F5 ngay tại `/products/42`, S3 sẽ tìm file `products/42` và trả **404**. Cách sửa: cấu hình CloudFront/S3 **rewrite mọi đường dẫn không tìm thấy về `/index.html`** (error 404 → trả `index.html` với mã 200), để React Router tự lo phần còn lại. Đây là bước cấu hình bắt buộc khi deploy mọi SPA, không riêng React.

- **Caching nhiều tầng:** `staleTime` của React Query là cache **trong trình duyệt**. Phía hạ tầng còn có cache của **CloudFront (CDN)** cho asset tĩnh và đôi khi cho cả API response. Hiểu cả hai tầng giúp bạn trả lời "vì sao dữ liệu vẫn cũ sau khi đã sửa" — có thể không phải lỗi React Query mà là CDN đang giữ bản cũ.
