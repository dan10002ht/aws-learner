# Frontend Testing

Frontend có một sự thật khó chịu: code chạy "đúng" trên máy bạn không có nghĩa nó đúng với người dùng. User click sai chỗ, gõ chữ vào ô number, mạng chậm khiến nút submit bị bấm hai lần, screen reader đọc nhầm label. Test frontend tồn tại để **mô phỏng người dùng thật** và bắt những lỗi này trước khi production làm điều đó cho bạn.

Bài này nói về cách test một app React/TypeScript hiện đại sao cho test **không gãy mỗi lần đổi class CSS hay refactor component**, mà chỉ gãy khi hành vi thật sự thay đổi. Triết lý xuyên suốt một câu của Kent C. Dodds: *"The more your tests resemble the way your software is used, the more confidence they can give you."*

## 1. Test pyramid cho frontend

Pyramid kinh điển (nhiều unit, ít E2E) vẫn đúng về tinh thần "càng lên cao càng chậm và đắt", nhưng với frontend, tầng có giá trị nhất lại là **component test** ở giữa — render component thật, tương tác như user, assert lên UI. Đây là lý do cộng đồng FE thiên về mô hình "**Testing Trophy**" hơn là pyramid:

| Tầng | Công cụ | Tốc độ | Bắt được gì | Tỉ trọng gợi ý |
|---|---|---|---|---|
| Static | TypeScript, ESLint | tức thì | Typo, sai kiểu, prop thiếu | Nền móng, "miễn phí" |
| Unit | Vitest/Jest | mili-giây | Pure function: format tiền, validate, reducer | ~25% |
| Component | Vitest + React Testing Library | ms–giây | Render, click, nhập liệu, hiển thị state/error | ~50% (dày nhất) |
| E2E | Playwright | giây–phút | Cả luồng thật qua browser thật + backend | ~15% |

Vì sao component test là tầng dày nhất với FE? Vì phần lớn bug FE không nằm ở pure logic (cái đó TypeScript + unit lo gần hết) mà nằm ở **wiring giữa state, event và DOM**: bấm nút mà handler không chạy, error không hiển thị, disabled không đúng lúc. Component test bắt đúng loại bug đó với chi phí thấp hơn E2E nhiều lần.

> 💡 Ghi nhớ: Đừng tranh cãi "pyramid hay trophy". Câu hỏi đúng là *bug FE của bạn thường nằm ở đâu?* — gần như luôn là ở chỗ state gặp DOM. Đặt phần lớn test ở tầng component, và để TypeScript làm tầng đáy miễn phí.

Hình dạng cần tránh: **ice cream cone** — vài unit test, còn lại nhồi hết vào E2E qua browser. Triệu chứng: CI 30 phút, "re-run vì flaky" mỗi ngày, không ai tin màu đỏ nữa.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ba hình dạng chiến lược test: Pyramid, Testing Trophy và anti-pattern Ice cream cone</title>
  <desc>So sánh tỉ trọng các tầng test. Pyramid: đáy unit rộng, lên cao hẹp dần, E2E đỉnh nhỏ. Testing Trophy: tầng component ở giữa phình to nhất, có nền static. Ice cream cone là anti-pattern lật ngược: ít unit ở đáy, E2E phình to ở trên.</desc>
  <g>
    <text x="120" y="24" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Pyramid</text>
    <text x="120" y="40" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">kinh điển</text>
    <polygon points="120,58 158,108 82,108" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="120" y="92" font-size="10" text-anchor="middle" fill="currentColor">E2E</text>
    <polygon points="82,112 158,112 188,176 52,176" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="120" y="150" font-size="10.5" text-anchor="middle" fill="currentColor">Component</text>
    <polygon points="52,180 188,180 224,250 16,250" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="120" y="221" font-size="10.5" text-anchor="middle" fill="currentColor">Unit</text>
    <text x="120" y="290" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">nhiều unit,</text>
    <text x="120" y="304" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">ít E2E</text>
  </g>
  <g>
    <text x="360" y="24" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Testing Trophy</text>
    <text x="360" y="40" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.6">ưu tiên cho frontend</text>
    <polygon points="338,58 382,58 372,98 348,98" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="83" font-size="9.5" text-anchor="middle" fill="currentColor">E2E ~15%</text>
    <path d="M300 102 q-14 36 24 44 h72 q38 -8 24 -44 z" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.28"/>
    <text x="360" y="132" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">Component</text>
    <text x="360" y="147" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">~50% (dày nhất)</text>
    <rect x="338" y="152" width="44" height="40" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="176" font-size="9.5" text-anchor="middle" fill="currentColor">Unit ~25%</text>
    <rect x="316" y="196" width="88" height="22" rx="5" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="360" y="211" font-size="10" text-anchor="middle" fill="currentColor">Static (TS/ESLint)</text>
    <text x="360" y="290" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">component giữa</text>
    <text x="360" y="304" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">phình to nhất</text>
  </g>
  <g>
    <text x="600" y="24" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Ice cream cone</text>
    <text x="600" y="40" font-size="10.5" text-anchor="middle" fill="#f59e0b" opacity="0.95">anti-pattern, cần tránh</text>
    <ellipse cx="600" cy="70" rx="60" ry="16" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="600" y="74" font-size="10" text-anchor="middle" fill="currentColor">E2E (nhiều)</text>
    <polygon points="540,76 660,76 632,140 568,140" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="600" y="112" font-size="10" text-anchor="middle" fill="currentColor">Component</text>
    <polygon points="568,144 632,144 600,250" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="600" y="180" font-size="9.5" text-anchor="middle" fill="currentColor">Unit</text>
    <text x="600" y="200" font-size="8.5" text-anchor="middle" fill="currentColor" opacity="0.6">(ít)</text>
    <text x="600" y="290" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">lật ngược: nhồi E2E,</text>
    <text x="600" y="304" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">CI chậm, flaky</text>
  </g>
</svg>

## 2. Dựng môi trường: Vitest + React Testing Library

Năm 2025, với dự án Vite, **Vitest** là lựa chọn mặc định: cùng config với Vite (không cần Babel riêng), nhanh, API gần như tương thích Jest (`describe/it/expect`). Jest vẫn phổ biến ở dự án Next.js/CRA cũ; mọi nguyên tắc trong bài áp dụng được cho cả hai.

```bash
npm i -D vitest @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom jsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",        // giả lập DOM cho component test
    globals: true,                // dùng describe/it/expect không cần import
    setupFiles: "./src/test/setup.ts",
  },
});
```

```typescript
// src/test/setup.ts — nạp matcher như toBeInTheDocument, toBeDisabled
import "@testing-library/jest-dom/vitest";
```

> ⚠️ Bẫy: jsdom **không phải browser thật**. Nó không có layout engine, không tính được kích thước, không chạy CSS animation, `scrollIntoView`/`IntersectionObserver` phải tự mock. Những thứ phụ thuộc rendering thật (vị trí tooltip, visual regression) hãy để Playwright lo, đừng cố ép vào jsdom.

## 3. Test hành vi người dùng, KHÔNG test implementation detail

Đây là kỹ năng quan trọng nhất và bị làm sai nhiều nhất. Nguyên tắc của React Testing Library (RTL): **truy vấn DOM theo cách người dùng nhìn thấy nó**, không theo cách bạn viết code.

```tsx
// ❌ Test implementation — gắn chặt vào class CSS, cấu trúc DOM, state nội bộ
const btn = container.querySelector(".btn-primary");
expect(wrapper.state("isOpen")).toBe(true);   // enzyme cũ — soi state nội bộ

// ✅ Test hành vi — gắn vào điều user thật sự trải nghiệm
const btn = screen.getByRole("button", { name: /đăng nhập/i });
expect(screen.getByText(/chào mừng/i)).toBeInTheDocument();
```

Test thứ nhất gãy khi bạn đổi `.btn-primary` thành `.btn-main`, đổi `<div>` thành `<section>`, hay refactor `useState` thành `useReducer` — toàn những thay đổi **không đổi hành vi**. Test thứ hai chỉ gãy khi user không còn thấy nút "Đăng nhập" hoặc lời chào — tức là khi **có chuyện thật**.

### Thứ tự ưu tiên query của RTL

RTL cố tình thiết kế để query "đúng a11y" thì dễ, query "sai" thì khó. Dùng theo thứ tự này:

| Ưu tiên | Query | Khi nào dùng |
|---|---|---|
| 1 (tốt nhất) | `getByRole` (kèm `name`) | Hầu hết phần tử: button, link, heading, textbox, checkbox |
| 2 | `getByLabelText` | Form field gắn `<label>` |
| 3 | `getByPlaceholderText` | Khi không có label (nên thêm label thì hơn) |
| 4 | `getByText` | Nội dung không tương tác: thông báo, đoạn văn |
| Cuối | `getByTestId` | Lối thoát hiểm khi không còn cách nào ngữ nghĩa |

`getByRole` được ưu tiên vì nó **đồng thời test accessibility**: nếu RTL không tìm thấy `role="button"` với tên "Đăng nhập", rất có thể screen reader cũng không — test fail là tín hiệu đúng.

Phân biệt ba họ query (sai cái này gây flaky):

| Tiền tố | Không tìm thấy | Tìm thấy nhiều | Dùng khi |
|---|---|---|---|
| `getBy...` | **throw** ngay | throw | Phần tử **phải** có mặt |
| `queryBy...` | trả `null` | throw | Assert phần tử **không** tồn tại |
| `findBy...` | throw sau timeout | throw | Phần tử xuất hiện **bất đồng bộ** (sau fetch) |

```tsx
// Khẳng định KHÔNG có → queryBy (getBy sẽ throw, test fail sai lý do)
expect(screen.queryByText(/lỗi/i)).not.toBeInTheDocument();
// Đợi dữ liệu async hiện ra → findBy (tự retry tới khi có hoặc timeout)
expect(await screen.findByText(/đã lưu/i)).toBeInTheDocument();
```

> 💡 Ghi nhớ: Nếu test của bạn dùng nhiều `getByTestId` và `container.querySelector`, đó là mùi của việc đang test implementation. Test tốt đọc gần như một kịch bản user: "tìm ô email, gõ vào, bấm nút, thấy thông báo".

## 4. user-event thay vì fireEvent

`fireEvent.click(el)` chỉ bắn đúng **một** DOM event. Người dùng thật thì không: bấm phím gây `keydown` → `keypress` → `input` → `keyup`; click gây `pointerdown` → `mousedown` → `focus` → `mouseup` → `click`. `@testing-library/user-event` mô phỏng đầy đủ chuỗi đó, nên bắt được bug mà `fireEvent` bỏ sót (ví dụ nút chỉ submit khi field đã `blur` để validate).

```tsx
import userEvent from "@testing-library/user-event";

it("gõ và submit như user thật", async () => {
  const user = userEvent.setup();          // gọi MỘT lần đầu mỗi test
  render(<LoginForm />);

  await user.type(screen.getByLabelText(/email/i), "an@example.com");
  await user.click(screen.getByRole("button", { name: /đăng nhập/i }));
});
```

> ⚠️ Bẫy: `user-event` (v14+) trả về **Promise** — luôn `await`. Quên `await` thì assertion chạy trước khi tương tác xong → test "thỉnh thoảng pass". Và gọi `userEvent.setup()` đúng một lần đầu test, đừng setup lại giữa chừng.

## 5. Ví dụ đầy đủ: test một component form

Đây là phần lõi của bài. Một form đăng ký với react-hook-form + Zod (xem bài Forms), gọi API khi submit. Ta test **hành vi user nhìn thấy**: validate, hiển thị lỗi, gọi đúng API, hiện trạng thái loading/thành công.

```tsx
// SignupForm.tsx — component cần test
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
});
type FormValues = z.infer<typeof schema>;

export function SignupForm({ onSuccess }: { onSuccess?: () => void }) {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const { errors, isSubmitting } = formState;

  async function onSubmit(values: FormValues) {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) throw new Error("Đăng ký thất bại");
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" {...register("email")} />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <label htmlFor="password">Mật khẩu</label>
      <input id="password" type="password" {...register("password")} />
      {errors.password && <p role="alert">{errors.password.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Đang xử lý..." : "Đăng ký"}
      </button>
    </form>
  );
}
```

Test các hành vi quan trọng. Lưu ý: **không** test "react-hook-form có được gọi không" hay "state form là gì" — chỉ test điều user trải nghiệm.

```tsx
// SignupForm.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignupForm } from "./SignupForm";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("SignupForm", () => {
  it("hiện lỗi validation khi email sai và mật khẩu ngắn", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/email/i), "khong-phai-email");
    await user.type(screen.getByLabelText(/mật khẩu/i), "123");
    await user.click(screen.getByRole("button", { name: /đăng ký/i }));

    // user thấy thông báo lỗi — không quan tâm state nội bộ
    expect(await screen.findByText(/email không hợp lệ/i)).toBeInTheDocument();
    expect(screen.getByText(/tối thiểu 8 ký tự/i)).toBeInTheDocument();
  });

  it("không gọi API khi form không hợp lệ", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/email/i), "sai");
    await user.click(screen.getByRole("button", { name: /đăng ký/i }));

    await screen.findByText(/email không hợp lệ/i);
    expect(fetchSpy).not.toHaveBeenCalled();   // không submit dữ liệu rác
  });

  it("submit thành công thì gọi onSuccess", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(null, { status: 201 }),
    );
    render(<SignupForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/email/i), "an@example.com");
    await user.type(screen.getByLabelText(/mật khẩu/i), "matkhau123");
    await user.click(screen.getByRole("button", { name: /đăng ký/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });
});
```

Vì sao test này tốt? Refactor `useState` → `useReducer`, đổi class CSS, đổi `<div>` thành `<fieldset>`, đổi thư viện form — **mọi test trên vẫn xanh** miễn là user vẫn nhập được, vẫn thấy lỗi, vẫn submit được. Test chỉ đỏ khi một hành vi cam kết thật sự gãy.

> 💡 Ghi nhớ: Test một field bằng `getByLabelText` còn buộc bạn gắn `<label htmlFor>` đúng. Test hành vi và test accessibility ở frontend gần như là **một việc** — đó là phần thưởng kép của RTL.

## 6. Mock API với MSW

Trong test thành công ở trên ta đã `vi.spyOn(fetch)` — ổn cho một lời gọi đơn giản, nhưng khi component gọi nhiều endpoint, có loading/error/retry, mock từng `fetch` thành mớ bòng bong. **MSW (Mock Service Worker)** giải quyết bằng cách chặn ở **tầng network**: code của bạn gọi `fetch` thật, MSW đứng giữa trả response. Component không hề biết mình đang bị mock — đó chính là điều ta muốn.

```typescript
// src/test/server.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const server = setupServer(
  http.post("/api/signup", async ({ request }) => {
    const body = (await request.json()) as { email: string };
    if (body.email === "ton-tai@example.com") {
      return HttpResponse.json({ message: "Email đã tồn tại" }, { status: 409 });
    }
    return HttpResponse.json({ id: "u_1" }, { status: 201 });
  }),
);
```

```typescript
// thêm vào src/test/setup.ts
import { server } from "./server";
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());   // reset override giữa các test
afterAll(() => server.close());
```

Giờ test luồng lỗi từ server (case mà spyOn fetch làm rất gượng) trở nên tự nhiên — và `server.use(...)` cho phép **override một handler cho riêng một test**:

```tsx
import { server } from "../test/server";
import { http, HttpResponse } from "msw";

it("hiện lỗi server khi email đã tồn tại", async () => {
  server.use(
    http.post("/api/signup", () =>
      HttpResponse.json({ message: "Email đã tồn tại" }, { status: 409 }),
    ),
  );
  const user = userEvent.setup();
  render(<SignupForm />);

  await user.type(screen.getByLabelText(/email/i), "an@example.com");
  await user.type(screen.getByLabelText(/mật khẩu/i), "matkhau123");
  await user.click(screen.getByRole("button", { name: /đăng ký/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/đã tồn tại/i);
});
```

Lợi ích lớn của MSW: **cùng một mock dùng được cho cả test lẫn local dev** (chạy trong browser qua service worker) và cả Storybook. Bạn định nghĩa "backend giả" một lần, dùng khắp nơi.

> ⚠️ Bẫy: Đặt `onUnhandledRequest: "error"`. Nếu không, một request bị gõ sai URL (`/api/singup`) sẽ lọt qua âm thầm, trả về kết quả khó đoán, và bạn debug nhầm cả buổi. Cho nó **fail to loud** ngay khi có request không được mock.

## 7. Snapshot test — dùng rất cẩn thận

Snapshot test render component ra chuỗi, lưu lại, lần sau diff. Nghe tiện nhưng đây là loại test **dễ thoái hoá nhất** ở frontend:

```tsx
// ❌ Snapshot toàn bộ component — cám dỗ nhưng nguy hiểm
expect(container).toMatchSnapshot();
```

Vấn đề: đổi một class Tailwind, thêm một `<div>` wrapper, đổi thứ tự attribute → snapshot fail. Developer nhìn diff 200 dòng, không hiểu gì, bấm `vitest -u` (update) theo phản xạ. Từ đó snapshot không còn kiểm tra gì cả — nó chỉ **ghi nhận mọi thay đổi** thay vì bảo vệ hành vi. Tệ hơn: một bug thật (mất nút submit) trộn lẫn trong diff khổng lồ sẽ được "update" cho qua luôn.

Khi nào snapshot **đáng** dùng:

- Output **nhỏ, ổn định, đọc được trong review**: kết quả một hàm format, cây của một component thuần presentational nhỏ. Ưu tiên **inline snapshot** (`toMatchInlineSnapshot`) để diff nằm ngay trong file test, review thấy ngay.
- Mọi update snapshot phải được **review như code**, không bao giờ `-u` mù.

Với hầu hết component, một assertion tường minh `expect(screen.getByRole("button")).toBeDisabled()` luôn tốt hơn `toMatchSnapshot()`: nó nói rõ *bạn quan tâm điều gì*.

> 💡 Ghi nhớ: Snapshot trả lời "có gì thay đổi không?" — câu hỏi yếu. Assertion tường minh trả lời "hành vi tôi cam kết còn đúng không?" — câu hỏi mạnh. Mặc định chọn assertion, chỉ dùng snapshot cho output nhỏ và ổn định.

## 8. E2E với Playwright

Component test chạy trong jsdom — nhanh nhưng giả. Có những thứ chỉ browser thật mới kiểm được: routing thật, redirect sau login, cookie/session, file upload, nhiều tab, responsive thật, và **toàn bộ luồng nối với backend thật**. Đó là việc của E2E. Năm 2025 **Playwright** là lựa chọn mặc định (nhanh, đa trình duyệt Chromium/Firefox/WebKit, auto-wait thông minh, codegen, trace viewer).

```bash
npm init playwright@latest
```

```typescript
// e2e/signup.spec.ts
import { test, expect } from "@playwright/test";

test("user đăng ký thành công và vào dashboard", async ({ page }) => {
  await page.goto("/signup");

  // Playwright cũng khuyến khích locator theo role/label như RTL
  await page.getByLabel("Email").fill("an@example.com");
  await page.getByLabel("Mật khẩu").fill("matkhau123");
  await page.getByRole("button", { name: "Đăng ký" }).click();

  // auto-wait: Playwright tự đợi điều hướng + element xuất hiện
  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByRole("heading", { name: /chào mừng/i })).toBeVisible();
});
```

Điểm mạnh sống còn: **auto-waiting**. Playwright tự đợi element actionable (visible, enabled, ổn định) trước khi tương tác, và `expect(...).toBeVisible()` tự retry tới timeout — nên bạn **không bao giờ viết `sleep`** (kẻ thù số một của E2E flaky).

So sánh nhanh component test và E2E để biết viết loại nào:

| | Component (RTL) | E2E (Playwright) |
|---|---|---|
| Môi trường | jsdom (giả lập) | Browser thật |
| Tốc độ | mili-giây | giây |
| Backend | mock (MSW) | thường là thật/staging |
| Bắt được | logic UI, state, render | routing, auth, tích hợp đầu-cuối |
| Số lượng nên có | nhiều | ít (3–8 happy path quan trọng) |
| Khi nào viết | mọi component có logic | luồng nghiệp vụ then chốt (login, checkout) |

> ⚠️ Bẫy: Đừng dùng E2E để test mọi nhánh validation (sai email, sai password, field rỗng...). Mỗi case như vậy là một lần khởi động browser — chậm gấp trăm lần. Test validation ở tầng **component**, để E2E lo đúng vài luồng xuyên hệ thống quan trọng nhất. Đây là cách tránh "ice cream cone".

Khi E2E vẫn flaky dù đã auto-wait: bật **trace** (`--trace on`) để xem lại từng bước kèm screenshot/DOM, dùng `data-testid` cho element động khó định danh, và **không** assert dựa vào thời gian thật hay thứ tự network không xác định.

## 9. Chống flaky & những thói quen tốt

| Triệu chứng | Nguyên nhân thường gặp | Cách trị |
|---|---|---|
| Test "thỉnh thoảng" fail | Quên `await` user-event / async query | `await` mọi tương tác; dùng `findBy`/`waitFor` |
| `act(...) warning` | Cập nhật state sau khi test kết thúc | Đợi đúng async bằng `findBy`/`waitFor` |
| Request lọt mock | URL gõ sai, thiếu handler MSW | `onUnhandledRequest: "error"` |
| Test gãy sau refactor CSS | Đang test implementation | Đổi sang `getByRole`/`getByLabelText` |
| E2E flaky | Có `sleep`, đợi cứng | Dùng auto-wait của Playwright, bỏ `sleep` |
| Test phụ thuộc nhau | Mock/state rò rỉ giữa test | `resetHandlers`/`restoreAllMocks` trong `afterEach` |

Một con số cần tỉnh táo: **coverage cao không phải bằng chứng test tốt**. Một test render component rồi không assert gì vẫn cho coverage 100% file đó. Coverage thấp là tín hiệu xấu đáng tin; coverage cao thì chưa nói lên gì về chất lượng assert. Hỏi đúng câu: *"nếu tôi cố tình làm hỏng nút submit, có test nào đỏ không?"*

> 💡 Ghi nhớ cuối: Chiến lược test FE tốt là chiến lược cả team **tin vào màu đỏ** — đỏ nghĩa user thật sẽ gặp lỗi, xanh nghĩa deploy được. Mọi nguyên tắc ở đây (query theo role, test hành vi không test detail, MSW ở boundary, dè chừng snapshot, bỏ `sleep`) đều phục vụ một chữ: **niềm tin**.

## Liên hệ thực tế

- **Nối với Backend**: ranh giới frontend ↔ backend chính là HTTP API. MSW ở FE và contract test ở BE (bài *Testing Strategy cho Backend*) cùng giải một bài toán — *"hai bên còn hiểu nhau không?"*. Tốt nhất: backend xuất **OpenAPI spec**, frontend sinh type TypeScript từ spec đó (`openapi-typescript`), và MSW handler bám theo cùng spec. Khi BE đổi response, type FE đỏ ngay lúc compile — bắt breaking change trước cả khi chạy test.
- **CI/CD (GitHub Actions / CodeBuild)**: tách stage cho nhanh — `typecheck + lint + unit + component` chạy mỗi push (vài chục giây), `playwright` chạy mỗi PR (vài phút). Playwright cần browser → dùng official Docker image của Playwright trong CI để không phải cài thủ công. Chặn merge khi đỏ.
- **Deploy lên AWS (S3 + CloudFront)**: sau khi build và đẩy bản static lên S3 + invalidate CloudFront (bài *Build, Deploy & Performance*), chạy một bộ **Playwright smoke test** trỏ vào URL CloudFront thật — 3–5 happy path xác nhận "bản vừa deploy còn sống": trang load, login được, route chính render. Đây là tuyến phòng thủ cuối ngay sau deploy.
- **Synthetic monitoring trên production**: dùng **CloudWatch Synthetics (Canary)** chạy kịch bản Playwright/Puppeteer định kỳ trên môi trường thật — phát hiện sự cố (API backend chết, CDN lỗi, cert hết hạn) trước khi user báo. Cùng kịch bản happy path, chạy mãi mãi sau khi deploy xong.
- **Preview deploy**: với Vercel/Amplify, mỗi PR có một URL preview riêng — cấu hình Playwright trỏ vào URL preview đó để E2E chạy trên đúng artifact sắp lên production, không phải `localhost`.
