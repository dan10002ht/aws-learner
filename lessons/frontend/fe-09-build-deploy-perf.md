# Build, Deploy & Performance

Code chạy trên máy bạn (`npm run dev`) khác hoàn toàn với code chạy trên trình duyệt của người dùng thật. Lúc dev, trình duyệt nạp hàng nghìn file `.tsx` rời rạc; lúc production, người dùng ở mạng 4G chỉ nên tải vài file đã nén tối ưu. Khoảng cách giữa hai thế giới đó là việc của **bundler** (Vite), và cách bạn **deploy** + **tối ưu hiệu năng** quyết định người dùng thấy trang trong 0.8 giây hay 5 giây.

Bài này khép lại khoá Frontend: từ `dist/` ra sao, đẩy lên đâu (Vercel, hay S3 + CloudFront), làm sao route `/profile` không bị lỗi 404, đo chất lượng trải nghiệm bằng **Core Web Vitals**, và những kỹ thuật tối ưu thật sự đáng làm (chứ không phải `useMemo` rải khắp nơi).

## Vì sao cần bundler (Vite)

Trình duyệt không hiểu `.tsx`, không hiểu `import './styles.css'`, và nếu bạn ship 500 file `import` riêng lẻ thì mỗi file là một request — chậm khủng khiếp. Bundler giải quyết:

- **Biên dịch** TS/JSX → JS thuần (qua esbuild, cực nhanh).
- **Gom (bundle)** nhiều module thành ít file, **tách (split)** thông minh để không tải thừa.
- **Tối ưu**: minify, tree-shaking, băm tên file (content hash) để cache.
- **Dev server** với HMR để vòng lặp sửa-xem gần như tức thì.

Năm 2025–2026 **Vite** là tiêu chuẩn thực tế cho SPA (thay thế Create React App đã ngừng). Webpack vẫn còn nhiều trong dự án cũ; còn dự án mới gần như mặc định Vite (hoặc framework như Next.js dùng bundler riêng).

| | Vite (dev) | Webpack (dev kiểu cũ) |
|---|---|---|
| Khởi động dev server | Gần như tức thì (ESM native) | Phải bundle cả app trước |
| Cập nhật khi sửa file | HMR theo module, < 50ms | Bundle lại phần liên quan, chậm dần khi app to |
| Build production | Rollup (tối ưu) | Webpack |
| Cấu hình | Tối giản, mặc định tốt | Nhiều, dễ rối |

### Dev server & HMR

Lúc `npm run dev`, Vite **không bundle**. Nó tận dụng `import` ESM native của trình duyệt: trình duyệt xin file nào, Vite biên dịch *đúng file đó* on-demand bằng esbuild rồi trả về. Vì vậy app 10 file hay 1000 file thì server khởi động vẫn nhanh như nhau.

**HMR (Hot Module Replacement)**: khi bạn sửa một component, Vite chỉ thay đúng module đó trong trình duyệt mà **không reload cả trang** — state của app (ô input đang gõ, modal đang mở) được giữ nguyên.

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev      # dev server + HMR tại http://localhost:5173
```

> 💡 **Ghi nhớ:** Dev server nhanh **không** nói lên gì về tốc độ production. Dev phục vụ DX (sửa-xem nhanh); production mới là lúc bundle, minify, tree-shake. Luôn đo hiệu năng trên bản `npm run build` + `npm run preview`, đừng đo trên `npm run dev`.

## Env variable & build mode

Mỗi môi trường (local, staging, production) cần cấu hình khác nhau: URL API, key analytics, feature flag. Đừng hard-code — dùng **biến môi trường**.

Vite chỉ phơi ra cho client những biến có tiền tố `VITE_`. Đây là bảo vệ quan trọng: secret **không** vô tình lọt vào bundle.

```bash
# .env.development         (dùng khi npm run dev)
VITE_API_URL=http://localhost:3000

# .env.production          (dùng khi npm run build)
VITE_API_URL=https://api.myapp.com
```

```typescript
// Đọc trong code — TS biết kiểu nhờ vite-env.d.ts
const apiUrl = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;     // boolean, true khi dev
const mode  = import.meta.env.MODE;    // "development" | "production"
```

Khai báo type cho env để có autocomplete và bắt lỗi:

```typescript
// src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

> ⚠️ **Bẫy — secret không có chỗ trên frontend:** Mọi biến `VITE_*` đều bị **nhúng thẳng vào file JS tĩnh** mà ai cũng tải về và mở DevTools đọc được. Không bao giờ để khoá bí mật (DB password, AWS secret key, Stripe secret) ở frontend. Frontend chỉ chứa khoá *công khai* (publishable key). Secret thật phải nằm ở backend.

> ⚠️ **Bẫy:** `import.meta.env` được thay bằng **giá trị thật lúc build**, không phải lúc chạy. Đổi `.env` rồi phải build lại — không thể đổi env của một bản `dist/` đã build sẵn. Muốn cùng một bản build chạy nhiều môi trường thì phải nạp config runtime (ví dụ fetch `/config.json` lúc app khởi động).

## Code splitting & lazy load

Mặc định Vite gom toàn bộ app thành một bundle JS. App lớn → file JS vài MB → người dùng phải tải hết mới thấy trang, dù họ chỉ vào trang chủ. **Code splitting** cắt bundle thành nhiều mảnh, tải mảnh nào khi cần mảnh đó.

Trong React, công cụ là `React.lazy` + `<Suspense>`. Cực hợp với route: mỗi trang là một chunk riêng.

```tsx
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// Mỗi import() là một điểm cắt -> Vite tạo chunk riêng
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings  = lazy(() => import("./pages/Settings"));
const Reports   = lazy(() => import("./pages/Reports"));

export function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
```

Giờ vào `/` chỉ tải chunk `Dashboard`. Khi người dùng bấm sang `/reports`, trình duyệt mới tải chunk `Reports`, `<Suspense fallback>` hiện trong lúc chờ. Người dùng chưa bao giờ vào `/reports` thì không tốn 1 byte cho nó.

Lazy load không chỉ cho route — dùng cho component **nặng và hiếm dùng**: editor markdown, chart library, modal phức tạp, bản đồ.

```tsx
const ChartModal = lazy(() => import("./ChartModal"));

function Report() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Xem biểu đồ</button>
      {open && (
        <Suspense fallback={<Spinner />}>
          <ChartModal />   {/* chunk chart chỉ tải khi bấm */}
        </Suspense>
      )}
    </>
  );
}
```

> 💡 **Ghi nhớ:** Quy tắc cắt chunk: **theo route trước tiên** (hiệu quả nhất), rồi đến component nặng/hiếm. Đừng lazy load component nhỏ dùng ngay trên màn hình đầu — thêm một round-trip mạng để tiết kiệm 2KB là lỗ.

> ⚠️ **Bẫy:** Lazy load thiếu kiểm soát gây **loading waterfall** (chuỗi chờ nối tiếp): trang A tải xong mới biết cần B, tải B xong mới biết cần C. Với dữ liệu, hãy **prefetch** sớm (React Query `prefetchQuery`, React Router loader) để tải song song thay vì tuần tự.

## Tree-shaking

**Tree-shaking** = loại bỏ code không bao giờ được dùng tới khỏi bundle. Nếu một thư viện export 100 hàm mà bạn chỉ `import { debounce }`, bundler chỉ giữ `debounce` (và phần nó phụ thuộc), bỏ 99 hàm kia.

Điều kiện để tree-shaking hoạt động:

```typescript
// ✅ Named import từ ESM -> tree-shake được, chỉ lấy debounce
import { debounce } from "lodash-es";

// ❌ Import cả package -> kéo TOÀN BỘ lodash vào bundle (~70KB)
import _ from "lodash";
_.debounce(fn, 300);
```

- Dùng **ESM** (`import`/`export`), tránh `require` CommonJS — CommonJS khó tree-shake.
- Ưu tiên thư viện có **named export** và đánh dấu `"sideEffects": false`.
- Tránh import "barrel" kéo cả thư viện khi chỉ cần một hàm.

Để biết cái gì đang phình bundle, dùng visualizer:

```bash
npm i -D rollup-plugin-visualizer
# thêm visualizer() vào plugins trong vite.config.ts, rồi:
npm run build      # mở stats.html xem từng chunk nặng bao nhiêu, do thư viện nào
```

> 💡 **Ghi nhớ:** Tree-shaking là tự động, nhưng nó chỉ "thấy" được code khi bạn import đúng cách (ESM, named import). Nguồn phình bundle phổ biến nhất là một thư viện to (moment.js, lodash full, một icon pack import cả bộ). Đo bằng visualizer rồi thay bằng bản nhẹ (`date-fns`/`dayjs`, `lodash-es`, import icon lẻ).

## Deploy: từ `dist/` ra Internet

`npm run build` tạo thư mục `dist/` — toàn **file tĩnh**: `index.html`, các file `.js`/`.css` đã minify và có content hash trong tên (`index-a1b2c3.js`). Một SPA chỉ là static files, host ở đâu cũng được.

### Cách 1: Vercel (nhanh nhất khi học/MVP)

Vercel (hoặc Netlify, Cloudflare Pages) lo gần như mọi thứ: kết nối Git, mỗi push tự build & deploy, có CDN, HTTPS, **SPA fallback tự động**.

```bash
npm i -g vercel
vercel        # lần đầu hỏi cấu hình; sau đó mỗi push tự deploy
```

Ưu điểm: zero config, preview deploy cho mỗi PR. Nhược điểm: ít kiểm soát hạ tầng, chi phí có thể tăng khi scale, và đội ngũ dùng AWS thường muốn gom mọi thứ vào một cloud.

### Cách 2: S3 + CloudFront (chuẩn AWS)

Đây là kiến trúc kinh điển host SPA trên AWS:

- **Amazon S3**: kho chứa file tĩnh (object storage) — đẩy `dist/` lên đây.
- **CloudFront**: CDN của AWS — cache file ở edge location gần người dùng (giảm latency), terminate HTTPS, nén gzip/brotli.

```bash
npm run build
# Đẩy file lên bucket S3
aws s3 sync dist/ s3://my-app-bucket --delete
# Xoá cache CloudFront để phục vụ bản mới ngay
aws cloudfront create-invalidation --distribution-id E123ABC --paths "/*"
```

> ⚠️ **Bẫy — cache `index.html`:** File JS/CSS có content hash nên đặt `Cache-Control: max-age=31536000, immutable` (cache 1 năm) cực an toàn — đổi nội dung thì hash đổi, tên file đổi. **Nhưng `index.html` thì KHÔNG được cache lâu** (đặt `no-cache`/`max-age=0`), vì nó là điểm vào trỏ tới các file hash mới. Cache `index.html` quá lâu = người dùng vẫn nạp HTML cũ trỏ tới JS đã bị xoá → trang trắng. Kèm theo đó, mỗi lần deploy phải **invalidate** CloudFront.

### SPA routing fallback (lỗi 404 kinh điển)

SPA chỉ có **một** file `index.html` thật. Routing do React Router xử lý **phía client**. Khi người dùng gõ thẳng `myapp.com/reports` hoặc F5 tại đó, trình duyệt hỏi server file `/reports` — server **không có** file đó → **404**.

Cách sửa: cấu hình host **trả về `index.html` cho mọi đường dẫn không khớp file tĩnh**. Khi đó React Router nạp lên rồi tự render đúng route.

- **Vercel/Netlify**: tự xử lý (Vercel nhận diện SPA, hoặc thêm rewrite về `/index.html`).
- **CloudFront**: tạo **Custom Error Response** — lỗi 403/404 trả về `/index.html` với mã `200`. (CloudFront Functions hoặc cấu hình error pages.)

```jsonc
// vercel.json — rewrite mọi path về index.html
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

> 💡 **Ghi nhớ:** "F5 trang con bị 404, trang chủ thì ổn" = thiếu SPA fallback. Đây là lỗi deploy SPA phổ biến nhất. Nhớ: client routing cần server (hoặc CDN) trả `index.html` cho mọi route không phải file tĩnh.

## Core Web Vitals: đo trải nghiệm thật

Google đo chất lượng trải nghiệm bằng **Core Web Vitals** — và chúng ảnh hưởng cả SEO. Ba chỉ số chính (2025):

| Chỉ số | Đo cái gì | Tốt | Kém |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | Phần tử lớn nhất hiện ra sau bao lâu (tốc độ thấy nội dung) | ≤ 2.5s | > 4s |
| **INP** (Interaction to Next Paint) | Bấm/gõ xong bao lâu UI phản hồi (độ mượt tương tác) | ≤ 200ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | Layout nhảy lung tung bao nhiêu (độ ổn định) | ≤ 0.1 | > 0.25 |

> 💡 **Ghi nhớ:** **INP đã chính thức thay FID từ 3/2024** — nếu tài liệu nào còn nhắc FID là đã cũ. INP đo *mọi* tương tác trong suốt phiên, khắt khe hơn FID nhiều.

Nguyên nhân & cách chữa thường gặp:

- **LCP kém** → bundle JS quá to (chặn render), ảnh hero không tối ưu, font tải chậm. Chữa: code splitting, tối ưu ảnh, `preload` font/ảnh hero.
- **INP kém** → tay handler chạy quá lâu chặn main thread (tính toán nặng, re-render cả cây). Chữa: bớt re-render thừa, debounce, đẩy việc nặng ra Web Worker.
- **CLS kém** → ảnh/iframe/quảng cáo không đặt sẵn kích thước, nội dung chèn vào đẩy phần khác nhảy. Chữa: luôn khai báo `width`/`height` (hoặc `aspect-ratio`) cho ảnh, chừa chỗ sẵn cho phần tải sau.

```bash
npx lighthouse https://myapp.com --view   # report Core Web Vitals + gợi ý
# Hoặc đo trên user thật bằng thư viện web-vitals và gửi về analytics
```

> ⚠️ **Bẫy — lab vs field:** Lighthouse chạy trên máy bạn (lab data) thường đẹp hơn thực tế. Số liệu **thật** là **field data** từ người dùng (CrUX / `web-vitals` gửi về). Đừng tối ưu mù theo điểm Lighthouse rồi ngạc nhiên vì user vẫn than chậm — họ ở mạng yếu, máy yếu.

## Tối ưu render: memo đúng chỗ

React re-render khi state/props đổi. Phần lớn thời gian điều này **không phải vấn đề** — React rất nhanh. Chỉ tối ưu khi đã *đo* thấy chậm (React DevTools Profiler).

```tsx
import { memo, useMemo, useCallback } from "react";

// memo: bỏ qua re-render nếu props không đổi (so sánh nông)
const Row = memo(function Row({ item, onSelect }: RowProps) {
  return <li onClick={() => onSelect(item.id)}>{item.name}</li>;
});

function List({ items }: { items: Item[] }) {
  // useCallback: giữ nguyên reference của hàm -> memo của Row mới có tác dụng
  const handleSelect = useCallback((id: string) => {
    console.log("selected", id);
  }, []);

  // useMemo: chỉ tính lại khi items đổi, không tính mỗi render
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  return <ul>{sorted.map((it) => <Row key={it.id} item={it} onSelect={handleSelect} />)}</ul>;
}
```

> 💡 **Ghi nhớ — React 19 & React Compiler:** React 19 đi kèm **React Compiler** (đang phổ biến dần) tự động memo hoá phần lớn trường hợp — tức nhu cầu rải `useMemo`/`useCallback`/`memo` bằng tay sẽ **giảm mạnh**. Trước mắt: chỉ memo khi Profiler chỉ ra component đang re-render tốn kém. Memo bừa làm code rối mà chẳng nhanh hơn (so sánh props cũng tốn chi phí).

> ⚠️ **Bẫy:** `memo(Row)` vô dụng nếu prop là **object/function tạo mới mỗi render** (`onSelect={() => ...}` inline, `style={{...}}` inline). Reference luôn khác → `memo` luôn cho qua. Phải bọc bằng `useCallback`/`useMemo` thì memo mới có ý nghĩa.

## Virtualization: danh sách dài

Render 10.000 dòng vào DOM = trình duyệt nghẹt, INP tệ. **Virtualization** chỉ render những dòng *đang trong khung nhìn* (cộng vài dòng đệm), cuộn tới đâu render tới đó.

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

function BigList({ rows }: { rows: Row[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,         // chiều cao mỗi dòng (px)
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: 600, overflow: "auto" }}>
      <div style={{ height: virt.getTotalSize(), position: "relative" }}>
        {virt.getVirtualItems().map((v) => (
          <div
            key={v.key}
            style={{ position: "absolute", top: 0, transform: `translateY(${v.start}px)`, width: "100%" }}
          >
            {rows[v.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

10.000 dòng nhưng DOM chỉ giữ ~20 node. Dùng khi danh sách/bảng dài thật (chat, log, kết quả tìm kiếm). Danh sách ngắn (vài chục dòng) thì không cần — thêm phức tạp vô ích.

## Tối ưu ảnh

Ảnh thường là tài nguyên nặng nhất trang và là thủ phạm LCP/CLS số một.

- **Định dạng hiện đại**: WebP/AVIF nhẹ hơn JPEG/PNG nhiều.
- **Kích thước đúng**: đừng nhồi ảnh 4000px vào ô 400px. Dùng `srcset`/`sizes` để trình duyệt chọn.
- **Lazy load** ảnh ngoài màn hình: `loading="lazy"`.
- **Chống CLS**: luôn đặt `width`/`height` (hoặc `aspect-ratio`) để trình duyệt chừa chỗ trước.

```tsx
<img
  src="/hero-800.webp"
  srcSet="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
  sizes="(max-width: 768px) 100vw, 800px"
  width={800}
  height={450}          // chừa chỗ -> không nhảy layout (CLS tốt)
  loading="lazy"
  alt="Bảng điều khiển doanh thu"
/>
```

> 💡 **Ghi nhớ:** Ảnh hero (LCP) thì **đừng** `loading="lazy"` — nó cần hiện sớm; thậm chí nên `fetchpriority="high"`/`preload`. Lazy chỉ dành cho ảnh nằm dưới màn hình đầu.

## Accessibility (a11y) checklist

Accessibility = ai cũng dùng được (khiếm thị, dùng bàn phím, screen reader). Đây không phải "tính năng thêm" — nhiều nơi là yêu cầu pháp lý, và làm đúng a11y thường cũng cải thiện SEO + UX cho mọi người.

Checklist thực chiến cho mỗi PR:

- **HTML có nghĩa (semantic)**: `<button>` cho hành động, `<a>` cho điều hướng, `<nav>/<main>/<header>`. Đừng `<div onClick>` thay nút — mất focus, mất phím Enter/Space.
- **Bàn phím dùng được**: Tab tới mọi phần tử tương tác, có viền focus rõ (đừng `outline: none` mà không thay thế). Modal phải bẫy focus (focus trap) và đóng bằng Escape.
- **Ảnh có `alt`**: mô tả nội dung; ảnh trang trí thì `alt=""`.
- **Form có `<label>`** gắn với input (`htmlFor`/`id`); báo lỗi liên kết bằng `aria-describedby`, `aria-invalid`.
- **Tương phản màu** đủ (WCAG AA: chữ thường ≥ 4.5:1).
- **`aria-*` chỉ khi cần**: ưu tiên HTML semantic trước; `aria-label` cho nút chỉ có icon (`<button aria-label="Đóng">✕</button>`).
- **Không chỉ dựa vào màu**: lỗi đỏ phải kèm chữ/icon, kẻo người mù màu không thấy.

```tsx
// ❌ div giả nút: không Tab tới, không Enter, screen reader không hiểu
<div onClick={save}>Lưu</div>

// ✅ button thật: focus, phím, semantic miễn phí
<button onClick={save}>Lưu</button>

// Nút chỉ icon -> cần nhãn cho screen reader
<button onClick={close} aria-label="Đóng hộp thoại">✕</button>
```

```bash
npm i -D eslint-plugin-jsx-a11y    # bắt lỗi a11y ngay khi viết
# Audit nhanh: tab a11y trong Lighthouse, hoặc extension axe DevTools
```

> ⚠️ **Bẫy:** `<div onClick>` là lỗi a11y phổ biến nhất. Nó trông giống nút nhưng không Tab tới được, không kích hoạt bằng phím, screen reader không đọc là "nút". Quy tắc vàng: dùng đúng thẻ HTML, đừng giả lập hành vi gốc bằng `<div>`.

## Tổng kết

- **Bundler (Vite)** biến TS/JSX + import thành file tĩnh tối ưu; dev server + HMR cho DX nhanh, nhưng phải đo hiệu năng trên bản build.
- **Env** `VITE_*` nhúng lúc build, ai cũng đọc được → tuyệt đối không để secret ở frontend.
- **Code splitting** (`React.lazy` + `Suspense`) theo route trước; **tree-shaking** cần ESM + named import; đo bundle bằng visualizer.
- **Deploy SPA**: Vercel (nhanh) hoặc S3 + CloudFront (chuẩn AWS); nhớ **SPA fallback** trả `index.html` cho mọi route, và cache JS/CSS lâu nhưng `index.html` thì không.
- **Core Web Vitals**: LCP (thấy nội dung), INP (mượt tương tác, thay FID), CLS (ổn định layout).
- **Tối ưu khi đã đo**: `memo`/`useMemo`/`useCallback` đúng chỗ (React 19 Compiler giảm nhu cầu), virtualization cho list dài, tối ưu ảnh.
- **a11y**: HTML semantic, dùng được bằng bàn phím, `alt`/`label`, tương phản — checklist mỗi PR.

## Liên hệ thực tế

- **Nối với Backend & data fetching:** `VITE_API_URL` chính là điểm frontend trỏ về backend (bài Routing & Data). Khi deploy, nhớ cấu hình **CORS** ở backend cho domain CloudFront/Vercel, nếu không request bị chặn ngay trên production dù local chạy ngon. Prefetch dữ liệu (React Query) song song với lazy-load chunk để tránh waterfall — hai thứ phối hợp quyết định LCP của trang đầu.

- **Triển khai trên AWS — S3 + CloudFront:** Đẩy `dist/` lên **S3** (object storage), phân phối qua **CloudFront** (CDN edge gần người dùng → LCP tốt hơn). Tự động hoá bằng **CI/CD** (GitHub Actions / CodePipeline): chạy `tsc --noEmit` + test + `npm run build`, rồi `aws s3 sync` và `cloudfront create-invalidation`. Đừng quên Custom Error Response cho **SPA fallback** và chiến lược cache (JS/CSS 1 năm `immutable`, `index.html` `no-cache`).

- **AWS Amplify — lối tắt:** Nếu muốn trải nghiệm kiểu Vercel nhưng ở trong AWS, **Amplify Hosting** gói sẵn S3 + CloudFront + CI/CD + SPA fallback + HTTPS chỉ với vài cú click kết nối Git. Phù hợp khi đội đã ở AWS và không muốn tự dựng pipeline. Đánh đổi: ít kiểm soát hạ tầng hơn so với tự cấu hình S3 + CloudFront trực tiếp.

- **CI/CD là cổng chất lượng:** Type-check (TS), test (bài Testing), và kiểm tra hiệu năng/a11y (Lighthouse CI) nên là **bước chặn** trong pipeline — fail thì không deploy. Đây là cách rẻ nhất để bug, regression hiệu năng và lỗi a11y không bao giờ ra tới người dùng thật.
