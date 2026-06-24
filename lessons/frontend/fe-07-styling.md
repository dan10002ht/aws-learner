# Styling & Design System

Bạn đã biết viết CSS: `color`, `flexbox`, `media query`. Nhưng khi vào dự án thật với 200 component, cách viết CSS "thủ công" sẽ sụp đổ: tên class đụng nhau, sửa một chỗ vỡ ba chỗ, file `styles.css` 8000 dòng không ai dám xoá. Đó là **CSS spaghetti**.

Bài này không dạy lại CSS — nó dạy cách **tổ chức** CSS để một team nhiều người sửa cùng lúc mà không giẫm chân nhau: chọn công cụ styling (CSS Modules vs Tailwind vs CSS-in-JS), tư duy utility-first & mobile-first, **design tokens** qua CSS variables, dark mode, và ý tưởng đằng sau component library kiểu shadcn/Radix.

## Vấn đề gốc: CSS có scope toàn cục

CSS mặc định là **global**. Mọi selector bạn viết đều áp lên toàn trang.

```css
/* card.css */
.title { font-size: 20px; font-weight: bold; }
```

```css
/* article.css — viết bởi đồng nghiệp khác, tuần sau */
.title { font-size: 14px; color: gray; }
```

Hai file `.title` cùng tồn tại. File nào load sau thắng. Card của bạn bỗng đổi font mà bạn không hề đụng tới `card.css`. Bạn không tìm ra lỗi vì lỗi nằm ở file khác.

Đây là lý do mọi giải pháp styling hiện đại đều giải quyết cùng một bài toán: **làm sao để style của component này không rò rỉ sang component khác**. Khác nhau ở cách làm.

> 💡 **Ghi nhớ:** Mọi tranh luận "Tailwind vs CSS Modules vs CSS-in-JS" thực chất là tranh luận về cách **giới hạn phạm vi (scope)** và cách **tổ chức** style. Bản thân CSS thuộc tính (`display`, `color`...) thì giống nhau ở mọi cách.

## Ba trường phái styling

### 1. CSS Modules

Bạn viết CSS bình thường trong file `*.module.css`, nhưng bundler (Vite) **tự đổi tên class** thành duy nhất khi build → hết đụng tên.

```css
/* Button.module.css */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  background: #2563eb;
  color: white;
}
.btn:hover { background: #1d4ed8; }
```

```tsx
import styles from "./Button.module.css";

export function Button({ children }: { children: React.ReactNode }) {
  return <button className={styles.btn}>{children}</button>;
}
```

Lúc build, `styles.btn` biến thành `Button_btn__a1b2c`. Không component nào khác đụng được. Bạn vẫn viết CSS thuần — quen thuộc, không cần học cú pháp mới.

### 2. Tailwind CSS (utility-first)

Thay vì đặt tên class rồi viết CSS riêng, bạn ghép các **class tiện ích (utility)** có sẵn trực tiếp trong JSX. Mỗi class làm đúng một việc.

```tsx
export function Button({ children }: { children: React.ReactNode }) {
  return (
    <button className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
      {children}
    </button>
  );
}
```

Không có file CSS riêng, không phải nghĩ tên class. `px-4` = `padding-left/right: 1rem`, `bg-blue-600` = màu xanh đã định sẵn trong theme. Đây là cách phổ biến nhất năm 2025–2026 (Tailwind v4).

### 3. CSS-in-JS (styled-components / Emotion)

Viết CSS ngay trong file JS/TS, tạo ra component đã gắn style.

```tsx
import styled from "styled-components";

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  background: ${(props) => (props.$primary ? "#2563eb" : "#e5e7eb")};
  color: ${(props) => (props.$primary ? "white" : "black")};
`;

// dùng: <Button $primary>Lưu</Button>
```

Mạnh ở chỗ style nhận **props** động. Nhưng nó có cái giá: tính toán style lúc runtime (chậm hơn), và với React Server Components nó vướng víu. **Xu hướng 2025 đang rời xa CSS-in-JS runtime** (styled-components đã thông báo ngừng phát triển tích cực) — thay bằng các giải pháp build-time (vanilla-extract) hoặc đơn giản là Tailwind.

### Bảng so sánh

| Tiêu chí | CSS Modules | Tailwind | CSS-in-JS (runtime) |
|---|---|---|---|
| Scope tự động | Có | Không cần (utility dùng chung) | Có |
| Học cú pháp mới | Không (CSS thuần) | Có (tên utility) | Có (template/object) |
| Style động theo props | Hơi vụng (toggle class) | Tốt (`clsx`/biến) | Rất tốt (props → CSS) |
| Hiệu năng runtime | Tốt (CSS tĩnh) | Rất tốt (CSS tĩnh) | Kém hơn (tính lúc chạy) |
| Hợp React Server Components | Có | Có | Vướng |
| HTML/JSX gọn | Gọn (1 class) | Rối (nhiều class) | Gọn |
| Phù hợp dự án lớn nhiều người | Khá | Rất tốt | Trung bình |

> 💡 **Ghi nhớ — khi nào dùng gì:** Dự án mới đi làm năm 2025–2026 → **mặc định chọn Tailwind**, nó là tiêu chuẩn thực tế và hợp React hiện đại nhất. Thích tách CSS ra file riêng, đội đã quen CSS thuần → **CSS Modules**. Cần style cực kỳ động theo props và đội đã có sẵn → CSS-in-JS, nhưng đừng chọn mới cho dự án 2025.

## Tailwind: tư duy utility-first

Phản xạ đầu tiên ai cũng có khi nhìn Tailwind: "class dài kinh khủng, đây chẳng phải inline style trá hình sao?". Khác biệt then chốt:

- **Inline style** (`style={{}}`) không có hover, media query, không dùng theme.
- **Utility class** có đủ: `hover:`, `md:`, `dark:`, và lấy giá trị từ một **theme thống nhất** (màu, khoảng cách, font).

```tsx
// Inline style: KHÔNG có hover, KHÔNG responsive
<div style={{ padding: 16, background: "blue" }} />

// Tailwind: có hover, responsive, lấy màu từ theme
<div className="p-4 bg-blue-600 hover:bg-blue-700 md:p-8" />
```

Vì giá trị lấy từ theme, mọi nút trong app dùng `bg-blue-600` đều **cùng một màu** — bạn không gõ `#2563eb` rải rác mỗi nơi một sắc. Đó chính là **design token** (sẽ nói bên dưới).

### Quản lý class dài với `clsx` / `cva`

Khi class đổi theo state, đừng nối chuỗi tay. Dùng `clsx` (gộp class có điều kiện) hoặc `cva` (class-variance-authority — định nghĩa variant kiểu thư viện).

```tsx
import { clsx } from "clsx";

function Tab({ active }: { active: boolean }) {
  return (
    <button
      className={clsx(
        "px-3 py-2 text-sm font-medium",       // luôn có
        active ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
      )}
    >
      Tab
    </button>
  );
}
```

> ⚠️ **Bẫy:** Đừng ghép class Tailwind bằng template string thô (`` `px-4 ${active && "bg-blue-600"}` ``). Khi `active` là `false`, bạn nhét chuỗi `"false"` vào className. Luôn dùng `clsx`/`cn` để xử lý điều kiện sạch sẽ.

## Responsive & mobile-first

Tailwind (và CSS hiện đại nói chung) theo triết lý **mobile-first**: viết style cho màn hình nhỏ trước, rồi *thêm* điều chỉnh cho màn hình lớn.

```tsx
// Mặc định (mobile): 1 cột. Từ md trở lên: 2 cột. Từ lg: 3 cột.
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map((it) => <Card key={it.id} {...it} />)}
</div>
```

Các prefix `sm: md: lg: xl:` là các **breakpoint** ngưỡng tối thiểu (`min-width`). Quy tắc: class **không prefix** áp cho mọi kích thước; class **có prefix** chỉ áp *từ* ngưỡng đó *trở lên*.

| Prefix | min-width | Thiết bị điển hình |
|---|---|---|
| (none) | 0 | Điện thoại |
| `sm:` | 640px | Điện thoại ngang / tablet nhỏ |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Laptop |
| `xl:` | 1280px | Desktop |

> ⚠️ **Bẫy:** `md:flex` **không** có nghĩa "chỉ trên tablet". Nó nghĩa là "từ 768px trở lên". Nhiều người mới tưởng prefix giới hạn một dải màn hình — không, nó là ngưỡng sàn. Muốn style *chỉ* cho mobile thì viết không prefix, rồi *ghi đè* ở `md:`.

## Design tokens & theme với CSS variables

**Design token** là các "biến thiết kế" — màu, khoảng cách, bo góc, font — đặt tên có nghĩa và dùng lại khắp app, thay vì rải giá trị thô. Khi designer đổi màu thương hiệu, bạn sửa **một chỗ**.

Cách triển khai chuẩn 2025 là **CSS variables** (custom properties). Chúng sống ngay trong CSS, đổi được lúc runtime (quan trọng cho dark mode), và độc lập framework.

```css
/* globals.css */
:root {
  --color-bg: #ffffff;
  --color-text: #111827;
  --color-primary: #2563eb;
  --radius: 8px;
  --space-md: 16px;
}
```

Dùng trong CSS thuần hoặc trong Tailwind v4 (Tailwind v4 cấu hình theme bằng `@theme` và đọc trực tiếp CSS variables):

```css
/* @theme trong Tailwind v4: biến này tạo ra utility tương ứng */
@theme {
  --color-primary: #2563eb;   /* -> class bg-primary, text-primary... */
  --radius-card: 12px;        /* -> rounded-card */
}
```

Token nên có **2 tầng**: token nguyên thuỷ (`--blue-600`) và token ngữ nghĩa (`--color-primary` trỏ vào `--blue-600`). Component chỉ dùng tầng ngữ nghĩa — nhờ vậy đổi `--color-primary` sang màu khác là cả app theo, mà không cần biết màu thật là gì.

> 💡 **Ghi nhớ:** Component nên hỏi "đây là màu *primary*" chứ không phải "đây là màu *xanh #2563eb*". Token ngữ nghĩa tách *ý định* khỏi *giá trị* — đó là toàn bộ tinh thần của design system.

Sơ đồ dưới thể hiện luồng 3 chặng và cơ chế dark mode chỉ "gán lại" tầng ngữ nghĩa:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Design token 2 tầng và cơ chế đổi theme dark mode</title>
  <desc>Token nguyên thuỷ (blue-600, gray-900) được token ngữ nghĩa (color-primary, color-bg, color-text) trỏ vào; component chỉ tiêu thụ tầng ngữ nghĩa. Khi class dark xuất hiện trên html, chỉ tầng ngữ nghĩa được gán lại giá trị nên mọi component tự đổi màu mà không sửa dòng nào.</desc>
  <text x="16" y="26" font-size="15" font-weight="700" fill="currentColor">Token 2 tầng → component, và cách dark mode gán lại biến</text>
  <text x="86" y="58" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.75">Tầng 1 — Nguyên thuỷ</text>
  <text x="320" y="58" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.75">Tầng 2 — Ngữ nghĩa</text>
  <text x="615" y="58" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.75">Component</text>
  <g>
    <rect x="16" y="72" width="140" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="86" y="93" font-size="12" text-anchor="middle" fill="currentColor">--blue-600 = #2563eb</text>
    <rect x="16" y="114" width="140" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="86" y="135" font-size="12" text-anchor="middle" fill="currentColor">--gray-900 = #111827</text>
    <rect x="16" y="156" width="140" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="86" y="177" font-size="12" text-anchor="middle" fill="currentColor">--white = #ffffff</text>
  </g>
  <g>
    <rect x="246" y="72" width="148" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="320" y="93" font-size="12" text-anchor="middle" fill="currentColor">--color-primary</text>
    <rect x="246" y="114" width="148" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="320" y="135" font-size="12" text-anchor="middle" fill="currentColor">--color-text</text>
    <rect x="246" y="156" width="148" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="320" y="177" font-size="12" text-anchor="middle" fill="currentColor">--color-bg</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M246 89 H156" marker-end="url(#ar)"/>
    <path d="M246 131 H156" marker-end="url(#ar)"/>
    <path d="M246 173 H156" marker-end="url(#ar)"/>
  </g>
  <text x="201" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">trỏ vào</text>
  <g>
    <rect x="500" y="100" width="204" height="62" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="602" y="124" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">&lt;Button&gt;</text>
    <text x="602" y="143" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">bg-primary</text>
    <text x="602" y="157" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">text-foreground</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M394 100 Q450 100 450 131 T500 131" marker-end="url(#ar)"/>
  </g>
  <text x="447" y="96" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">tiêu thụ</text>
  <line x1="16" y1="222" x2="704" y2="222" stroke="currentColor" stroke-opacity="0.15"/>
  <text x="16" y="252" font-size="13" font-weight="700" fill="currentColor">Đổi theme = chỉ gán lại tầng ngữ nghĩa</text>
  <g>
    <rect x="16" y="268" width="200" height="120" rx="10" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="116" y="290" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">:root  (sáng)</text>
    <text x="116" y="312" font-size="11.5" text-anchor="middle" fill="currentColor">--color-bg = --white</text>
    <text x="116" y="332" font-size="11.5" text-anchor="middle" fill="currentColor">--color-text = --gray-900</text>
    <text x="116" y="368" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">nền sáng · chữ tối</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M216 328 H300" marker-end="url(#ar)"/>
  </g>
  <text x="258" y="320" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">.dark trên &lt;html&gt;</text>
  <g>
    <rect x="300" y="268" width="200" height="120" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="400" y="290" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">.dark  (tối)</text>
    <text x="400" y="312" font-size="11.5" text-anchor="middle" fill="currentColor">--color-bg = #0b1120</text>
    <text x="400" y="332" font-size="11.5" text-anchor="middle" fill="currentColor">--color-text = #f3f4f6</text>
    <text x="400" y="368" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">nền tối · chữ sáng</text>
  </g>
  <g stroke="currentColor" stroke-opacity="0.5" fill="none">
    <path d="M500 328 H584" marker-end="url(#ar)"/>
  </g>
  <g>
    <rect x="584" y="298" width="120" height="60" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="644" y="324" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Component</text>
    <text x="644" y="343" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">tự đổi màu</text>
  </g>
  <text x="644" y="378" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">không sửa 1 dòng</text>
  <defs>
    <marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" fill-opacity="0.6"/>
    </marker>
  </defs>
</svg>

## Dark mode

Vì token là CSS variable, dark mode chỉ là **gán lại biến** khi có class `dark` trên thẻ gốc. Không component nào phải biết nó đang ở chế độ nào.

```css
:root {
  --color-bg: #ffffff;
  --color-text: #111827;
}
.dark {
  --color-bg: #0b1120;
  --color-text: #f3f4f6;
}
```

Component dùng `bg-[var(--color-bg)]` (hoặc utility ánh xạ tới token) sẽ tự đổi màu khi class `dark` xuất hiện. Một toggle nhỏ bật/tắt class trên `<html>`:

```tsx
import { useState, useEffect } from "react";

function useTheme() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} className="rounded-md border px-3 py-1.5 text-sm">
      {dark ? "Sáng" : "Tối"}
    </button>
  );
}
```

> ⚠️ **Bẫy — FOUC (Flash of Unstyled Content):** Nếu đọc `localStorage` trong `useEffect`, trang loads ở chế độ sáng *rồi mới* nhảy sang tối → một cú nháy chói mắt. Cách xử lý: chạy một đoạn script nhỏ đặt class `dark` **trước khi** React render (trong Next.js là script trong `<head>`, hoặc dùng thư viện `next-themes`).

## Ý tưởng đằng sau shadcn / Radix

Khi cần `<Dialog>`, `<Dropdown>`, `<Tooltip>`, đừng tự viết từ đầu — chúng có vô số cạm bẫy về accessibility (focus trap, phím Escape, `aria-*`, đọc màn hình). Hai mảnh ghép phổ biến:

- **Radix UI** (hoặc React Aria): cung cấp component **headless** — lo toàn bộ *hành vi* và *accessibility*, **không kèm style**. Bạn tự tô.
- **shadcn/ui**: *không* phải thư viện cài qua `npm`. Nó **copy code component** (Radix + Tailwind) thẳng vào dự án bạn. Bạn **sở hữu** code đó, sửa thoải mái.

```tsx
// Component shadcn được copy vào src/components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: { sm: "h-8 px-3", md: "h-10 px-4", lg: "h-12 px-6" },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
```

Dùng: `<Button variant="outline" size="sm">Huỷ</Button>`. Để ý `bg-primary`, `text-primary-foreground` — đó là **token ngữ nghĩa**. Nút này tự đổi màu theo theme và dark mode mà không sửa một dòng.

> 💡 **Ghi nhớ:** "Headless" = tách *hành vi/accessibility* khỏi *giao diện*. Radix lo phần khó (a11y), bạn chỉ lo phần đẹp. Đây là kiến trúc component library hiện đại — và lý do shadcn thắng lớn 2024–2026.

## Tránh CSS spaghetti — quy tắc thực chiến

1. **Style theo component, không theo trang.** Mỗi component tự chứa style của nó. Không có file `home.css` chỉnh sửa lung tung mọi nơi.
2. **Không dùng giá trị thô (magic number).** Đừng `margin-top: 13px` ngẫu hứng. Lấy từ thang token (`space-md`...). Nhất quán quan trọng hơn hoàn hảo.
3. **Hạn chế ghi đè (override) và `!important`.** Cần `!important` để thắng selector khác là dấu hiệu scope đang rò rỉ — sửa gốc, đừng vá.
4. **Tránh selector lồng sâu** (`.card .body .title span`). Selector càng cụ thể càng khó ghi đè, càng dễ vỡ. Class phẳng (Tailwind) hoặc CSS Modules giải quyết tận gốc.
5. **Một nguồn sự thật cho design.** Token là nơi duy nhất định nghĩa màu/khoảng cách. Component *tiêu thụ* token, không tự chế giá trị.

> ⚠️ **Bẫy:** Trộn nhiều giải pháp styling trong cùng dự án (vài chỗ Tailwind, vài chỗ CSS Modules, vài chỗ inline style) tạo ra mớ hỗn loạn tệ hơn cả spaghetti — vì giờ không ai biết style một phần tử đến từ đâu. Chọn **một** cách chủ đạo và tuân thủ.

## Component có theme hoàn chỉnh

Gộp tất cả: một `Card` dùng token ngữ nghĩa, tự responsive, tự hỗ trợ dark mode, có variant.

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  // dùng token ngữ nghĩa -> tự đổi theo light/dark
  "rounded-lg border bg-card text-card-foreground p-4 md:p-6 transition-shadow",
  {
    variants: {
      tone: {
        default: "border-border",
        primary: "border-primary/40 bg-primary/5",
        danger: "border-destructive/40 bg-destructive/5",
      },
      hover: { true: "hover:shadow-md", false: "" },
    },
    defaultVariants: { tone: "default", hover: false },
  }
);

type CardProps = React.ComponentProps<"div"> & VariantProps<typeof cardVariants>;

export function Card({ className, tone, hover, ...props }: CardProps) {
  return <div className={cn(cardVariants({ tone, hover }), className)} {...props} />;
}

// Sử dụng — responsive lưới + variant, không hề đụng tới màu cứng
export function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card hover>
        <h3 className="font-semibold">Doanh thu</h3>
        <p className="text-muted-foreground text-sm">Tháng này: 42.000.000đ</p>
      </Card>
      <Card tone="primary" hover>
        <h3 className="font-semibold">Đơn mới</h3>
        <p className="text-muted-foreground text-sm">128 đơn chờ xử lý</p>
      </Card>
      <Card tone="danger">
        <h3 className="font-semibold">Cảnh báo tồn kho</h3>
        <p className="text-muted-foreground text-sm">3 sản phẩm sắp hết</p>
      </Card>
    </div>
  );
}
```

Bật dark mode (thêm class `dark` lên `<html>`): mọi `Card` đổi nền/chữ tức thì vì chúng đọc token, không màu cứng. Đổi màu thương hiệu: sửa `--color-primary` một dòng, mọi `tone="primary"` theo. Đó là một design system thu nhỏ.

## Liên hệ thực tế

- **Nối với Backend & Forms:** Component có theme ở đây sẽ bọc dữ liệu lấy từ API (bài React Query) và các form (bài react-hook-form + Zod). Trạng thái `loading`/`error`/`disabled` của form nên là **variant** trong design system (`<Button disabled>`, `<Card tone="danger">` cho lỗi validation) — đừng tô màu lỗi rải rác mỗi form một kiểu.

- **Build & bundle (deploy AWS):** Tailwind và CSS Modules tạo CSS **tĩnh** lúc build — Vite gom thành một file `.css` nhỏ, được nén và băm tên (content hash). CSS-in-JS runtime thì tính style lúc chạy, làm tăng JS bundle và chậm hơn — một lý do nữa để ưu tiên giải pháp build-time khi bạn quan tâm Core Web Vitals.

- **Triển khai lên AWS:** Bản build tĩnh (`dist/`) gồm HTML + JS + CSS đã tối ưu, đẩy lên **Amazon S3** và phân phối qua **CloudFront** (CDN). File CSS có content hash nên đặt header `Cache-Control: max-age=1 năm` an toàn — đổi style thì hash đổi, CloudFront tự phục vụ file mới. Vì style là tĩnh, trình duyệt không phải đợi JS chạy mới có giao diện → trang hiện ra nhanh, điểm **LCP** (Largest Contentful Paint) tốt hơn. Bài "Build, Deploy & Performance" sẽ đi sâu phần này.
