# React Hooks & State

Ở bài [[fe-02-react-basics]] bạn đã thấy component chỉ là một hàm trả về JSX, và mỗi khi "state" đổi thì React render lại. Bài này đào sâu vào *cơ chế* đó: **hooks** là tập hàm cho phép một component (vốn là hàm thuần) "nhớ" được dữ liệu giữa các lần render, chạy side effect, và giữ tham chiếu tới DOM. Hiểu sai hooks là nguồn gốc của 90% bug React thực tế: UI không cập nhật, gọi API hai lần, `useEffect` chạy vô tận, giá trị "cũ" kẹt trong closure. Mục tiêu của bài: bạn viết được hooks **đúng và sạch**, biết *khi nào* cần từng hook, và nhận ra bẫy trước khi nó cắn.

> 💡 Ghi nhớ: Render trong React = **gọi lại hàm component từ đầu**. Mọi biến local sinh ra lại từ con số 0. Thứ duy nhất "sống sót" giữa các render là những gì bạn cất vào hook (`useState`, `useRef`...). Đây là mô hình tư duy nền tảng cho cả bài.

## `useState` — bộ nhớ của component

`useState` trả về một cặp: **giá trị hiện tại** và **hàm setter**. Gọi setter sẽ lên lịch một lần re-render với giá trị mới.

```tsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0); // 0 là giá trị khởi tạo

  return (
    <button onClick={() => setCount(count + 1)}>
      Đã bấm {count} lần
    </button>
  );
}
```

Hai điểm dân mới hay sai:

**1. State là immutable — không được sửa trực tiếp.** React so sánh giá trị cũ và mới bằng `Object.is` (so sánh tham chiếu với object/array). Nếu bạn `push` vào mảng cũ rồi set lại *chính mảng đó*, tham chiếu không đổi → React nghĩ "không có gì thay đổi" → **không render lại**.

```tsx
const [todos, setTodos] = useState<string[]>([]);

// ❌ SAI: mutate mảng cũ, tham chiếu không đổi -> UI đứng im
todos.push("học hooks");
setTodos(todos);

// ✅ ĐÚNG: tạo mảng MỚI
setTodos([...todos, "học hooks"]);

// Object cũng vậy: spread rồi ghi đè field cần đổi
const [user, setUser] = useState({ name: "An", age: 20 });
setUser({ ...user, age: 21 });

// Nested: phải copy từng lớp tới chỗ cần đổi
setUser((u) => ({ ...u, address: { ...u.address, city: "HN" } }));
```

**2. Setter dạng hàm (functional update) khi giá trị mới phụ thuộc giá trị cũ.** Nhiều `setCount(count + 1)` liên tiếp trong cùng một event sẽ dùng *cùng một* `count` (do closure), nên chỉ tăng 1 lần.

```tsx
// ❌ Bấm 1 lần chỉ +1 dù gọi 3 lần (cả 3 đọc count = 0)
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);

// ✅ +3 vì mỗi lần nhận giá trị mới nhất
setCount((c) => c + 1);
setCount((c) => c + 1);
setCount((c) => c + 1);
```

> ⚠️ Bẫy: `setCount` **không** cập nhật biến `count` ngay tại dòng tiếp theo. Nó *lên lịch* render mới; trong lần render đó `count` mới có giá trị mới. Đọc `count` ngay sau `setCount` vẫn ra giá trị cũ — đây là gốc của vô số bug "sao state chưa đổi".

Khởi tạo state nặng thì truyền **hàm** để chỉ chạy một lần (lazy init), thay vì gọi mỗi render:

```tsx
// ❌ readFromLocalStorage() chạy MỖI render rồi bị bỏ
const [v, setV] = useState(readFromLocalStorage());
// ✅ chỉ chạy ở lần mount đầu tiên
const [v2, setV2] = useState(() => readFromLocalStorage());
```

## Derived state — đừng lưu cái có thể tính ra

Lỗi kiến trúc phổ biến: lưu vào state thứ vốn **suy ra được** từ state khác. Nó sinh ra hai nguồn sự thật phải đồng bộ tay → bug lệch dữ liệu.

```tsx
// ❌ fullName là state thừa, phải nhớ cập nhật mỗi khi đổi first/last
const [firstName, setFirstName] = useState("Nguyen");
const [lastName, setLastName] = useState("An");
const [fullName, setFullName] = useState("Nguyen An");

// ✅ Tính thẳng trong lúc render — luôn đúng, không cần đồng bộ
const fullName = `${firstName} ${lastName}`;
```

> 💡 Ghi nhớ: Nguyên tắc — **state càng ít càng tốt**. Trước khi thêm một `useState`, hỏi: "Cái này có tính ra được từ state/props sẵn có không?" Nếu có, đừng lưu, hãy tính trong render. Chỉ những thứ thật sự là *nguồn dữ liệu độc lập* (input của user, kết quả fetch) mới xứng đáng vào state.

## `useEffect` — đồng bộ với thế giới bên ngoài

`useEffect` chạy code **sau khi** React đã render và cập nhật DOM. Dùng nó để làm những việc nằm *ngoài* React: gọi API, đăng ký event listener, set timer, thao tác DOM thủ công, log analytics.

```tsx
useEffect(() => {
  // chạy SAU render
  console.log("count đổi thành", count);
}, [count]); // dependency array
```

**Dependency array quyết định effect chạy khi nào:**

| Dạng | Khi nào effect chạy |
|------|---------------------|
| Không truyền `[]` | Sau **mỗi** render (gần như luôn sai, dễ vòng lặp) |
| `[]` (mảng rỗng) | **Một lần** sau lần mount đầu tiên |
| `[a, b]` | Sau mount + mỗi khi `a` **hoặc** `b` đổi (so sánh `Object.is`) |

**Cleanup function** — trả về một hàm để dọn dẹp trước khi effect chạy lại hoặc khi component unmount. Bắt buộc với subscription, timer, listener nếu không muốn rò rỉ bộ nhớ:

```tsx
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000);
  return () => clearInterval(id); // dọn timer cũ trước khi tạo cái mới / khi unmount
}, []);
```

### Fetch dữ liệu đúng cách (kèm chống race condition)

```tsx
function UserCard({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");

  useEffect(() => {
    let ignore = false; // cờ chống race
    setStatus("loading");

    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data: User) => {
        if (!ignore) {           // chỉ nhận kết quả nếu effect chưa bị thay thế
          setUser(data);
          setStatus("done");
        }
      })
      .catch(() => !ignore && setStatus("error"));

    return () => { ignore = true; }; // userId đổi -> bỏ kết quả request cũ
  }, [userId]);

  if (status === "loading") return <p>Đang tải...</p>;
  if (status === "error") return <p>Lỗi tải dữ liệu.</p>;
  return <h2>{user?.name}</h2>;
}
```

> ⚠️ Bẫy race condition: Không có cờ `ignore`, khi `userId` đổi nhanh (1 → 2), request của user 1 có thể về *sau* request user 2 và ghi đè UI bằng dữ liệu cũ. Cleanup + cờ là cách thủ công xử lý. Trong dự án thật, **đừng tự viết fetch trong `useEffect`** — dùng React Query / SWR (xem [[fe-05-routing-data]]) lo sẵn cache, dedupe, race, retry.

> ⚠️ Bẫy "gọi API hai lần": Ở React 19 với Strict Mode, dev sẽ cố tình mount → unmount → mount lại để lộ effect thiếu cleanup. Thấy effect chạy 2 lần trong `dev` là *tính năng cảnh báo*, không phải bug — chỉ xảy ra ở development.

## `useRef` — giá trị "nhớ" mà không gây render

`useRef` cho một hộp `{ current: ... }` tồn tại suốt vòng đời component. Khác `useState` ở chỗ: **đổi `.current` KHÔNG trigger render**. Hai công dụng chính:

**1. Truy cập phần tử DOM:**

```tsx
function SearchBox() {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []); // tự focus khi mount
  return <input ref={inputRef} placeholder="Tìm..." />;
}
```

**2. Lưu giá trị mutable qua các render mà không cần hiển thị** (id của timer, giá trị trước đó, cờ "đã mount chưa"):

```tsx
const renderCount = useRef(0);
renderCount.current += 1; // tăng được, nhưng không làm component render lại
```

> 💡 Ghi nhớ: Quy tắc chọn — nếu thay đổi giá trị **cần phản ánh lên UI** → `useState`. Nếu chỉ cần "ghi nhớ ngầm" không liên quan render → `useRef`. Đừng đọc/ghi `ref.current` *trong lúc render* (chỉ làm trong event handler hoặc effect).

## `useMemo` / `useCallback` — chỉ dùng khi THỰC SỰ cần

Hai hook này **cache** kết quả tính toán (`useMemo`) hoặc một hàm (`useCallback`) giữa các render, chỉ tính lại khi dependency đổi.

```tsx
// useMemo: nhớ KẾT QUẢ của một phép tính nặng
const sorted = useMemo(
  () => bigList.filter((x) => x.active).sort(byName),
  [bigList]
);

// useCallback: nhớ chính HÀM (để tham chiếu không đổi giữa các render)
const handleClick = useCallback((id: number) => {
  setSelected(id);
}, []);
```

`useCallback(fn, deps)` chỉ là đường tắt của `useMemo(() => fn, deps)`. Vì sao cần giữ tham chiếu hàm/object ổn định? Vì nếu truyền hàm mới mỗi render xuống một component con đã bọc `React.memo`, con đó sẽ render lại vô ích (prop "đổi" do tham chiếu khác).

**Khi nào KHÔNG cần:** Đại đa số trường hợp. Bản thân hai hook này cũng tốn chi phí (lưu, so sánh deps). Tối ưu sớm thường làm code rối mà chẳng nhanh hơn.

| Tình huống | Có nên dùng? |
|------------|--------------|
| Tính toán thật sự nặng (sort/filter list lớn, parse) mỗi render | ✅ `useMemo` |
| Hàm/object truyền xuống con đã `React.memo` | ✅ `useCallback` / `useMemo` |
| Hàm/object là dependency của `useEffect` (tránh effect chạy thừa) | ✅ |
| Bọc mọi hàm, mọi biến "cho chắc" | ❌ Thừa, làm chậm |

> ⚠️ Bẫy: Đừng rải `useMemo`/`useCallback` khắp nơi như phản xạ. Nguyên tắc: **đo trước, tối ưu sau**. React Compiler (ổn định dần từ React 19) còn tự memo hóa giúp bạn, nên nhu cầu tự tay càng giảm. Chỉ thêm khi React DevTools Profiler chỉ ra render chậm thật.

## Rules of Hooks — luật bất di bất dịch

React nhận diện từng hook **theo thứ tự gọi**, không theo tên. Nên thứ tự phải giống hệt ở mọi lần render. Hai luật:

**1. Chỉ gọi hook ở top-level** — không trong `if`, vòng lặp, hàm lồng, hay sau một câu `return` sớm.

```tsx
// ❌ SAI: hook nằm trong điều kiện -> thứ tự hook thay đổi giữa các render
function Bad({ show }: { show: boolean }) {
  if (show) {
    const [x, setX] = useState(0); // 💥 lúc có lúc không
  }
}

// ✅ ĐÚNG: hook ở top-level, điều kiện nằm BÊN TRONG
function Good({ show }: { show: boolean }) {
  const [x, setX] = useState(0);
  if (!show) return null; // return sớm SAU khi đã gọi hết hook
  return <span>{x}</span>;
}
```

**2. Chỉ gọi hook từ React component hoặc custom hook** — không gọi từ hàm JS thường.

> 💡 Ghi nhớ: Cài plugin `eslint-plugin-react-hooks`. Nó tự bắt vi phạm hai luật trên và cảnh báo dependency array thiếu/thừa — bắt bug trước khi chạy. Đây là thứ đầu tiên nên có trong mọi dự án React.

## Bẫy stale closure — "giá trị bị đóng băng"

Đây là bẫy tinh vi nhất. Mỗi render tạo ra closure mới "chụp" lại giá trị state *tại thời điểm đó*. Nếu một callback sống lâu (timer, listener) được tạo ở render cũ, nó vẫn ôm giá trị cũ.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Dòng thời gian render và bẫy stale closure qua các lần render</title>
  <desc>Mỗi lần render chạy hàm component, chụp lại giá trị state hiện tại vào closure, rồi commit DOM, chạy useEffect và cleanup. Effect với mảng phụ thuộc rỗng chỉ chạy một lần nên closure mãi ôm count cũ; thêm count vào deps thì cleanup chạy rồi effect tạo lại với count mới.</desc>
  <text x="16" y="24" font-size="15" font-weight="700" fill="currentColor">Dòng thời gian: render → commit DOM → useEffect → cleanup</text>
  <line x1="16" y1="44" x2="704" y2="44" stroke="currentColor" stroke-opacity="0.5"/>
  <polygon points="704,44 694,40 694,48" fill="currentColor" fill-opacity="0.5"/>
  <text x="700" y="38" font-size="10" text-anchor="end" fill="currentColor" opacity="0.6">thời gian →</text>
  <text x="170" y="68" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">RENDER #1 (count = 0)</text>
  <g>
    <rect x="24" y="78" width="120" height="44" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="84" y="96" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">1. Gọi hàm</text>
    <text x="84" y="112" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">component()</text>
  </g>
  <g>
    <rect x="156" y="78" width="120" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="216" y="96" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">2. Commit DOM</text>
    <text x="216" y="112" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">React cập nhật UI</text>
  </g>
  <g>
    <rect x="288" y="78" width="120" height="44" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="348" y="96" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">3. useEffect</text>
    <text x="348" y="112" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">chạy SAU render</text>
  </g>
  <path d="M144 100 h12" stroke="currentColor" stroke-opacity="0.6" fill="none"/>
  <polygon points="156,100 148,96 148,104" fill="currentColor" fill-opacity="0.6"/>
  <path d="M276 100 h12" stroke="currentColor" stroke-opacity="0.6" fill="none"/>
  <polygon points="288,100 280,96 280,104" fill="currentColor" fill-opacity="0.6"/>
  <rect x="430" y="74" width="266" height="52" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="442" y="92" font-size="11" font-weight="700" fill="currentColor">Closure #1 "chụp" count = 0</text>
  <text x="442" y="108" font-size="10.5" fill="currentColor" opacity="0.78">setInterval(() => setCount(count + 1))</text>
  <text x="442" y="121" font-size="10.5" fill="currentColor" opacity="0.78">count ở đây MÃI là 0</text>
  <line x1="16" y1="150" x2="704" y2="150" stroke="currentColor" stroke-opacity="0.18" stroke-dasharray="4 4"/>
  <text x="200" y="178" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Sau setCount → RENDER #2 (count = 1)</text>
  <g>
    <rect x="24" y="188" width="120" height="44" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="84" y="206" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">1. Gọi lại hàm</text>
    <text x="84" y="222" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">biến local sinh lại</text>
  </g>
  <g>
    <rect x="156" y="188" width="120" height="44" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="216" y="206" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">2. Commit DOM</text>
    <text x="216" y="222" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">UI hiện count = 1</text>
  </g>
  <path d="M144 210 h12" stroke="currentColor" stroke-opacity="0.6" fill="none"/>
  <polygon points="156,210 148,206 148,214" fill="currentColor" fill-opacity="0.6"/>
  <rect x="288" y="184" width="408" height="92" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="300" y="202" font-size="11.5" font-weight="700" fill="currentColor">3. useEffect có chạy lại không? → tuỳ deps</text>
  <rect x="300" y="210" width="186" height="58" rx="8" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="393" y="227" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">deps = [] (rỗng)</text>
  <text x="393" y="242" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.78">effect KHÔNG chạy lại</text>
  <text x="393" y="256" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.78">→ vẫn dùng closure #1 (count=0)</text>
  <rect x="498" y="210" width="186" height="58" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="591" y="227" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">deps = [count]</text>
  <text x="591" y="242" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.78">cleanup #1 → effect chạy lại</text>
  <text x="591" y="256" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.78">→ closure #2 mới (count=1)</text>
  <text x="84" y="306" font-size="12" font-weight="700" fill="currentColor">Cleanup — khi nào dọn closure cũ?</text>
  <g>
    <rect x="24" y="316" width="320" height="48" rx="9" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="36" y="334" font-size="10.5" fill="currentColor" opacity="0.85">deps=[]: cleanup CHỈ chạy khi unmount</text>
    <text x="36" y="350" font-size="10.5" fill="currentColor" opacity="0.85">→ stale closure: count kẹt ở 0</text>
  </g>
  <g>
    <rect x="360" y="316" width="336" height="48" rx="9" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="372" y="334" font-size="10.5" fill="currentColor" opacity="0.85">deps=[count]: cleanup chạy TRƯỚC mỗi lần</text>
    <text x="372" y="350" font-size="10.5" fill="currentColor" opacity="0.85">effect tạo lại → closure luôn thấy count mới</text>
  </g>
  <rect x="24" y="378" width="672" height="40" rx="9" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="396" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Cách chắc ăn: setCount(c => c + 1) — functional update không phụ thuộc count đã chụp</text>
  <text x="360" y="411" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.72">React tự đưa giá trị mới nhất vào c, miễn nhiễm với closure cũ</text>
</svg>


```tsx
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // ❌ count ở đây MÃI là 0 — closure chụp count của render đầu
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []); // [] -> effect chỉ chạy 1 lần, closure không bao giờ thấy count mới

  return <p>{count}</p>; // kẹt ở 1
}
```

Ba cách sửa:

```tsx
// ✅ Cách 1 (tốt nhất): functional update — không phụ thuộc count bên ngoài
setCount((c) => c + 1);

// ✅ Cách 2: khai báo count vào deps để effect tạo lại closure mới
//    (ở ví dụ interval thì kém vì phải reset interval mỗi giây)
}, [count]);

// ✅ Cách 3: dùng useRef giữ giá trị mới nhất cho callback đọc
const countRef = useRef(count);
countRef.current = count; // mỗi render cập nhật
// trong interval: setCount(countRef.current + 1);
```

> ⚠️ Bẫy: Khi một callback "đọc state nhưng luôn ra giá trị cũ", 99% là stale closure. Phản xạ đầu tiên: chuyển sang **functional update** `setX(prev => ...)` — nó luôn nhận giá trị mới nhất, miễn nhiễm với closure cũ.

## Custom hook — đóng gói logic tái dùng

Custom hook chỉ là một hàm tên bắt đầu bằng `use`, bên trong gọi các hook khác. Nó tách *logic* khỏi *giao diện* để tái dùng — không phải tái dùng UI mà là tái dùng *hành vi có state*.

```tsx
// Hook đồng bộ một giá trị với localStorage
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : initial;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const; // as const -> tuple type chuẩn cho destructure
}

// Dùng y như useState, nhưng tự lưu/khôi phục
function Settings() {
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");
  return (
    <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      {theme}
    </button>
  );
}
```

Một custom hook thực dụng khác — gói toàn bộ logic fetch ở trên lại:

```tsx
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");

  useEffect(() => {
    let ignore = false;
    setStatus("loading");
    fetch(url)
      .then((r) => r.json())
      .then((d: T) => {
        if (!ignore) { setData(d); setStatus("done"); }
      })
      .catch(() => !ignore && setStatus("error"));
    return () => { ignore = true; };
  }, [url]);

  return { data, status };
}

// Component giờ gọn còn 1 dòng logic
function Profile({ id }: { id: number }) {
  const { data, status } = useFetch<User>(`/api/users/${id}`);
  if (status === "loading") return <p>Đang tải...</p>;
  return <h2>{data?.name}</h2>;
}
```

> 💡 Ghi nhớ: Mỗi component dùng custom hook nhận **state riêng biệt** — custom hook chia sẻ *logic*, không chia sẻ *dữ liệu*. Muốn nhiều component dùng chung một state thì cần Context hoặc store (xem [[fe-04-state-management]]).

## Liên hệ thực tế

Hooks là "cơ bắp" bạn dùng hằng ngày khi đi làm, nhưng điểm mấu chốt là biết *điểm dừng*: tự viết `useEffect` để fetch chỉ nên dùng cho việc nhỏ. Sang [[fe-05-routing-data]] bạn sẽ thấy **React Query** thay thế gần hết những đoạn `useEffect + useState + ignore` ở trên bằng caching, refetch và xử lý race sẵn — đó là chuẩn 2025-2026, ít ai còn fetch tay trong effect.

Kết nối với phần còn lại của hệ thống:

- **Server state vs client state**: dữ liệu fetch từ backend (qua REST/gRPC như ở [[be-01-api-design]]) là "server state" — nên do React Query quản, đừng nhồi vào `useState`. State của UI (modal mở/đóng, ô input) mới là "client state" hợp với hooks thuần. Bài [[fe-04-state-management]] phân định rạch ròi hai loại này.
- **Form**: input controlled chính là `useState` đồng bộ với `value`/`onChange`. Khi form lớn lên, `react-hook-form` + Zod ([[fe-06-forms]]) sẽ thay việc quản từng `useState` một.
- **Deploy AWS**: app React sau khi build (Vite) ra tập file tĩnh, thường đẩy lên **S3 + CloudFront**. Lúc đó các effect gọi `/api/...` sẽ trỏ về backend (API Gateway / ALB) qua biến môi trường — nên mọi URL trong `useEffect`/`useFetch` cần lấy từ env, đừng hard-code. Phần build và deploy này nằm ở bài cuối track.
