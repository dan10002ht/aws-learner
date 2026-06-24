# Forms & Validation

Form là nơi frontend chạm vào dữ liệu thật của người dùng, và cũng là nơi sinh ra nhiều bug nhất: state lệch, validate sai lúc, re-render giật, submit khi đang loading, người dùng không biết lỗi ở đâu. Làm form "cho chạy" thì dễ, làm form **đúng và dễ chịu** mới khó. Bài này đi từ controlled/uncontrolled, qua `react-hook-form` + `Zod` (combo gần như mặc định 2025), tới error UX, async validation và accessibility — kết thúc bằng một form đăng ký hoàn chỉnh.

## 1. Controlled vs Uncontrolled

Đây là khái niệm nền tảng. Mọi thứ phía sau chỉ là cách quản lý hai mô hình này cho gọn.

**Controlled component**: React giữ giá trị input trong state, mỗi lần gõ phím là một lần `setState` → re-render.

```tsx
function ControlledInput() {
  const [email, setEmail] = useState("");
  return (
    <input
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />
  );
}
```

**Uncontrolled component**: DOM tự giữ giá trị, React chỉ đọc khi cần (qua `ref` hoặc lúc submit). Không re-render mỗi lần gõ.

```tsx
function UncontrolledInput() {
  const ref = useRef<HTMLInputElement>(null);
  const onSubmit = () => console.log(ref.current?.value);
  return <input ref={ref} defaultValue="" />;
}
```

| Tiêu chí | Controlled | Uncontrolled |
|---|---|---|
| Nguồn sự thật | React state | DOM |
| Re-render khi gõ | Có (mỗi ký tự) | Không |
| Validate realtime / format khi gõ | Dễ | Khó |
| Hiệu năng form lớn | Kém nếu không tối ưu | Tốt |
| Set giá trị động từ code | Dễ | Phải dùng ref |
| File input | Bắt buộc uncontrolled | — |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Controlled vs Uncontrolled — hai mô hình quản lý giá trị input</title>
  <desc>Bên trái controlled: gõ phím gọi onChange, setState, React state là nguồn sự thật, re-render rồi value đổ ngược về input thành vòng tròn re-render mỗi ký tự. Bên phải uncontrolled: DOM tự giữ value là nguồn sự thật, React chỉ đọc qua ref khi submit, không re-render khi gõ. react-hook-form kết hợp hiệu năng uncontrolled với tiện ích controlled.</desc>
  <defs>
    <marker id="fmArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="180" y="24" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Controlled</text>
  <text x="180" y="40" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">React state = nguồn sự thật · re-render mỗi ký tự</text>
  <rect x="16" y="48" width="328" height="244" rx="12" fill="#3b82f6" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.18"/>
  <rect x="44" y="64" width="120" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="104" y="82" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">input</text>
  <text x="104" y="97" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">gõ phím</text>
  <rect x="196" y="64" width="120" height="40" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="256" y="82" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">onChange</text>
  <text x="256" y="97" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">setState</text>
  <rect x="196" y="148" width="120" height="44" rx="9" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="256" y="167" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">React state</text>
  <text x="256" y="182" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">nguồn sự thật</text>
  <rect x="44" y="148" width="120" height="44" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="104" y="167" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">re-render</text>
  <text x="104" y="182" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">value đổ về input</text>
  <line x1="164" y1="84" x2="192" y2="84" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#fmArr)"/>
  <line x1="256" y1="104" x2="256" y2="144" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#fmArr)"/>
  <line x1="196" y1="170" x2="168" y2="170" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#fmArr)"/>
  <line x1="104" y1="148" x2="104" y2="108" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#fmArr)"/>
  <text x="180" y="232" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">vòng tròn: 1 ký tự = 1 re-render</text>
  <text x="540" y="24" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Uncontrolled</text>
  <text x="540" y="40" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">DOM = nguồn sự thật · không re-render khi gõ</text>
  <rect x="376" y="48" width="328" height="244" rx="12" fill="#10b981" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.18"/>
  <rect x="420" y="80" width="240" height="48" rx="9" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.28"/>
  <text x="540" y="100" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">DOM giữ value</text>
  <text x="540" y="116" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">nguồn sự thật · gõ không re-render</text>
  <rect x="420" y="206" width="240" height="48" rx="9" fill="#10b981" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="540" y="226" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">React đọc qua ref</text>
  <text x="540" y="242" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">chỉ lúc submit</text>
  <line x1="540" y1="206" x2="540" y2="132" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#fmArr)"/>
  <text x="556" y="172" font-size="10" fill="currentColor" opacity="0.7">read on submit</text>
  <rect x="92" y="308" width="536" height="38" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.24"/>
  <text x="360" y="331" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">react-hook-form = hiệu năng uncontrolled + tiện ích controlled</text>
</svg>

> 💡 Ghi nhớ: đừng tự dựng controlled form thủ công với một đống `useState` cho form thật. `react-hook-form` cho bạn **hiệu năng của uncontrolled** (ít re-render) nhưng vẫn có validate/error/submit như controlled. Đó là lý do nó thắng.

## 2. react-hook-form: register & handleSubmit

`react-hook-form` (RHF) mặc định chạy theo mô hình **uncontrolled** + ref, nên gõ phím không làm cả form re-render. API cốt lõi chỉ vài hàm.

```bash
npm install react-hook-form
```

```tsx
import { useForm } from "react-hook-form";

type FormValues = { email: string; password: string };

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    await api.login(data); // data đã có kiểu FormValues
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register("email", { required: "Email là bắt buộc" })}
        type="email"
      />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <input {...register("password", { required: true })} type="password" />

      <button disabled={isSubmitting}>Đăng nhập</button>
    </form>
  );
}
```

- `register("email")` trả về `{ name, onChange, onBlur, ref }` — spread vào input là RHF tự gắn ref, không cần `value`/`onChange` thủ công.
- `handleSubmit(onSubmit)` chạy validate trước; chỉ gọi `onSubmit` khi **toàn bộ** hợp lệ, và tự chặn `e.preventDefault()`.
- `formState` cho sẵn các cờ quan trọng: `isSubmitting`, `isValid`, `isDirty`, `errors`, `touchedFields`.

### Vì sao RHF nhanh

Vì input là uncontrolled, gõ vào field A **không** re-render field B. So với form controlled thủ công (mọi `setState` re-render cả cây form), khác biệt rất lớn khi form có 20-30 field.

> ⚠️ Bẫy: khi cần input **controlled** (component thư viện như MUI Select, react-select, date picker không nhận ref), đừng dùng `register`. Dùng `<Controller>`:

```tsx
import { Controller } from "react-hook-form";

<Controller
  name="country"
  control={control}
  rules={{ required: "Chọn quốc gia" }}
  render={({ field }) => <CustomSelect {...field} options={countries} />}
/>;
```

## 3. Validation với Zod

Validate bằng object `rules` của RHF ổn cho form nhỏ, nhưng nhanh chóng lặp lại và **không share được với backend**. `Zod` là schema validation library: viết schema một lần, vừa validate runtime vừa **suy ra TypeScript type** từ chính schema đó.

```bash
npm install zod @hookform/resolvers
```

```typescript
import { z } from "zod";

const signupSchema = z
  .object({
    email: z.string().min(1, "Email là bắt buộc").email("Email không hợp lệ"),
    password: z
      .string()
      .min(8, "Mật khẩu tối thiểu 8 ký tự")
      .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa")
      .regex(/[0-9]/, "Cần ít nhất 1 chữ số"),
    confirmPassword: z.string(),
    age: z.coerce.number().int().min(18, "Phải đủ 18 tuổi"),
    terms: z.literal(true, { message: "Bạn phải đồng ý điều khoản" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"], // gắn lỗi vào đúng field
  });
```

### infer type — không khai báo type thủ công nữa

```typescript
type SignupValues = z.infer<typeof signupSchema>;
// {
//   email: string; password: string; confirmPassword: string;
//   age: number; terms: true;
// }
```

Schema là **nguồn sự thật duy nhất**: sửa schema thì type tự đổi theo, không bao giờ lệch.

> 💡 Ghi nhớ: `z.coerce.number()` ép `"18"` (string từ input) thành `18`. Input HTML luôn trả string, nên dùng `coerce` thay vì để type là string rồi tự `parseInt`.

### Tích hợp Zod vào react-hook-form

`@hookform/resolvers` là cầu nối: đưa schema vào `resolver`, RHF dùng nó để validate, và `useForm<SignupValues>` lấy type từ chính `infer`.

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<SignupValues>({
  resolver: zodResolver(signupSchema),
  mode: "onTouched", // validate sau khi field bị blur lần đầu
});
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Pipeline react-hook-form + Zod — từ input tới onSubmit</title>
  <desc>Các input register/ref đi vào handleSubmit chặn preventDefault và chạy validate qua zodResolver parse dữ liệu theo schema. Nếu sai thì errors gắn vào từng field hiện dưới input; nếu đúng thì gọi onSubmit với data. Schema dùng z.infer suy ra TypeScript type FormValues làm một nguồn sự thật cho cả validate runtime lẫn type compile-time. Lỗi server đưa vào đúng field qua setError.</desc>
  <defs>
    <marker id="zArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="16" y="56" width="120" height="56" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="76" y="80" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">inputs</text>
  <text x="76" y="96" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">register / ref</text>
  <rect x="172" y="48" width="148" height="72" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.24"/>
  <text x="246" y="72" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">handleSubmit()</text>
  <text x="246" y="89" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">chặn preventDefault</text>
  <text x="246" y="103" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">chạy validate</text>
  <rect x="356" y="48" width="160" height="72" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.24"/>
  <text x="436" y="72" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">zodResolver</text>
  <text x="436" y="89" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">schema.parse</text>
  <text x="436" y="103" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">(dữ liệu form)</text>
  <line x1="136" y1="84" x2="168" y2="84" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#zArr)"/>
  <line x1="320" y1="84" x2="352" y2="84" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#zArr)"/>
  <rect x="540" y="32" width="164" height="48" rx="9" fill="#ef4444" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.24"/>
  <text x="622" y="52" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">SAI → errors</text>
  <text x="622" y="68" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.72">gắn vào từng field</text>
  <rect x="540" y="92" width="164" height="48" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.26"/>
  <text x="622" y="112" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">ĐÚNG → onSubmit(data)</text>
  <text x="622" y="128" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.72">data có kiểu FormValues</text>
  <line x1="516" y1="74" x2="536" y2="58" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#zArr)"/>
  <line x1="516" y1="94" x2="536" y2="112" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#zArr)"/>
  <rect x="540" y="168" width="164" height="40" rx="9" fill="#ef4444" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="622" y="185" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">hiện dưới input</text>
  <text x="622" y="199" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">role="alert"</text>
  <path d="M540 56 L524 56 L524 188 L536 188" fill="none" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#zArr)"/>
  <rect x="356" y="168" width="160" height="40" rx="9" fill="#8b5cf6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="436" y="185" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">setError("email")</text>
  <text x="436" y="199" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">lỗi server → đúng field</text>
  <line x1="516" y1="188" x2="536" y2="188" stroke="currentColor" stroke-opacity="0.5" stroke-dasharray="4 3" marker-end="url(#zArr)"/>
  <rect x="356" y="280" width="160" height="56" rx="9" fill="#f59e0b" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="436" y="304" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Zod schema</text>
  <text x="436" y="321" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">một nguồn sự thật</text>
  <line x1="436" y1="280" x2="436" y2="124" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3" marker-end="url(#zArr)"/>
  <text x="445" y="252" font-size="9.5" fill="currentColor" opacity="0.6">dùng để validate</text>
  <rect x="172" y="280" width="148" height="56" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="246" y="304" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">type FormValues</text>
  <text x="246" y="321" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">compile-time</text>
  <line x1="356" y1="308" x2="324" y2="308" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#zArr)"/>
  <text x="340" y="298" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.75">z.infer</text>
  <text x="436" y="362" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">một schema → validate runtime + type compile-time, không bao giờ lệch</text>
</svg>

| `mode` | Validate khi nào | Cảm giác |
|---|---|---|
| `onSubmit` (mặc định) | Lúc bấm submit | Ít phiền, nhưng dồn lỗi cuối |
| `onBlur` | Khi rời field | Cân bằng |
| `onTouched` | Sau blur lần đầu, rồi onChange | **Khuyên dùng** — tự nhiên nhất |
| `onChange` | Mỗi ký tự | Realtime nhưng dễ "la mắng" người dùng quá sớm |

> ⚠️ Bẫy: `mode: "onChange"` validate mỗi lần gõ làm field bật đỏ khi người dùng **mới gõ được 2 ký tự** email — gây khó chịu. Nguyên tắc UX: **đừng báo lỗi field người dùng còn đang nhập dở**. `onTouched` (lỗi xuất hiện sau khi blur, rồi mới cập nhật realtime) là điểm cân bằng tốt nhất.

## 4. Error UX

Validate đúng nhưng hiển thị lỗi tệ thì người dùng vẫn bỏ form. Vài nguyên tắc thực chiến:

- **Lỗi ở ngay dưới field**, không phải gom hết lên đầu form (trừ lỗi tổng từ server).
- **Đừng báo lỗi khi đang gõ field đó** — chờ blur (`onTouched`).
- **Đỏ + icon + text**, không chỉ màu đỏ (người mù màu không thấy).
- **Disable nút submit khi đang gửi**, hiện spinner — và **không** disable nút chỉ vì form chưa hợp lệ (người dùng bấm để thấy lỗi ở đâu).
- Khi submit fail, **focus vào field lỗi đầu tiên** (RHF có `shouldFocusError: true` mặc định).

```tsx
function Field({ label, error, children }: FieldProps) {
  return (
    <div>
      <label>{label}</label>
      {children}
      {error && (
        <p role="alert" className="text-red-600">
          <ExclamationIcon aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}
```

> 💡 Ghi nhớ: lỗi tốt là lỗi **nói cho người dùng cách sửa**, không phải mô tả kỹ thuật. "Mật khẩu tối thiểu 8 ký tự" tốt hơn "Validation failed: minLength". Viết message này ngay trong Zod schema để chỗ nào cũng nhất quán.

## 5. Async validation

Có những thứ chỉ server biết: email đã tồn tại chưa, username còn trống không. Cần gọi API trong lúc validate.

```typescript
const usernameSchema = z.object({
  username: z
    .string()
    .min(3, "Tối thiểu 3 ký tự")
    .refine(
      async (val) => {
        const res = await fetch(`/api/check-username?u=${val}`);
        const { available } = await res.json();
        return available;
      },
      { message: "Username đã được dùng" }
    ),
});
```

- `refine` nhận hàm async — Zod chờ Promise. Nhớ dùng `schema.parseAsync()` / RHF tự gọi `safeParseAsync`.
- **Debounce** lời gọi async, đừng gọi mỗi ký tự — bạn sẽ spam server. Validate async chỉ nên chạy ở `onBlur`.

> ⚠️ Bẫy: async validate trong schema dễ tạo race condition và spam request. Cho check-as-you-type, pattern tốt hơn là tách riêng: dùng `react-query` (xem [[fe-05-routing-data]]) với `enabled` + debounce để check username, rồi merge kết quả vào lỗi của RHF bằng `setError`. Schema-level async để dành cho validate cuối lúc submit.

## 6. Accessibility của form (a11y)

Form không accessible = loại bỏ người dùng screen reader, người dùng bàn phím, và thường cũng tệ cho mọi người. Các điểm bắt buộc:

- **Mỗi input có `<label>` liên kết** qua `htmlFor`/`id` — bấm vào label focus được input, screen reader đọc đúng tên field. `placeholder` **không** thay được label (mất khi gõ, contrast kém).
- **Thông báo lỗi nối với input** qua `aria-describedby`, và `aria-invalid` khi sai.
- **Vùng lỗi có `role="alert"`** (hoặc `aria-live="polite"`) để screen reader đọc lỗi ngay khi xuất hiện.
- **Focus về field lỗi đầu tiên** khi submit fail.
- Field bắt buộc đánh dấu `aria-required` (và dấu * trực quan).

```tsx
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
  {...register("email")}
/>
{errors.email && (
  <p id="email-error" role="alert">
    {errors.email.message}
  </p>
)}
```

> 💡 Ghi nhớ: test nhanh a11y bằng cách **chỉ dùng bàn phím** (Tab/Shift+Tab/Enter) hoàn thành form, và bật screen reader (VoiceOver: ⌘+F5) nghe nó đọc label + lỗi. Nếu không nghe được lỗi → thiếu `role="alert"`/`aria-describedby`.

## 7. Form đăng ký hoàn chỉnh

Ghép tất cả: Zod schema + RHF + error UX + a11y + trạng thái submit + lỗi từ server.

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z
  .object({
    email: z.string().min(1, "Email là bắt buộc").email("Email không hợp lệ"),
    password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
    confirmPassword: z.string(),
    terms: z.literal(true, { message: "Bạn phải đồng ý điều khoản" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

export function SignupForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: "onTouched" });

  const onSubmit = async (data: Values) => {
    try {
      await api.signup(data);
    } catch (err) {
      // Lỗi nghiệp vụ từ backend (vd email đã tồn tại -> 409)
      if (err.status === 409) {
        setError("email", { message: "Email đã được đăng ký" });
      } else {
        // Lỗi tổng, gắn vào "root" để hiện trên đầu form
        setError("root", { message: "Có lỗi xảy ra, thử lại sau." });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {errors.root && <p role="alert">{errors.root.message}</p>}

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-err" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-err" role="alert">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password">Mật khẩu</label>
        <input id="password" type="password" {...register("password")} />
        {errors.password && <p role="alert">{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="confirm">Nhập lại mật khẩu</label>
        <input id="confirm" type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && (
          <p role="alert">{errors.confirmPassword.message}</p>
        )}
      </div>

      <label>
        <input type="checkbox" {...register("terms")} /> Tôi đồng ý điều khoản
      </label>
      {errors.terms && <p role="alert">{errors.terms.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
      </button>
    </form>
  );
}
```

Điểm đáng chú ý:
- `noValidate` trên `<form>` để tắt validate mặc định của browser (mình tự lo, message tiếng Việt nhất quán).
- `setError("email", ...)` đưa lỗi **từ server** vào đúng field — không chỉ alert chung chung.
- `setError("root", ...)` cho lỗi tổng (network, 500) hiển thị đầu form.
- `isSubmitting` chặn double-submit và đổi label nút.

## 8. Những lỗi thực tế hay gặp

| Lỗi | Hậu quả | Cách đúng |
|---|---|---|
| Một `useState` cho mỗi field | Re-render toàn form, code dài | Dùng RHF (uncontrolled) |
| `mode: "onChange"` cho mọi form | Báo lỗi khi đang gõ → khó chịu | `onTouched` |
| Khai báo TS type **và** Zod schema riêng | Hai chỗ lệch nhau | `z.infer` từ schema |
| Validate chỉ ở frontend | Backend nhận data rác | Validate **cả** hai phía |
| `placeholder` thay `label` | Hỏng a11y, mất context | Luôn có `<label htmlFor>` |
| Không disable nút khi submit | Double-submit, tạo 2 record | `disabled={isSubmitting}` |
| Quên `path` trong `.refine` | Lỗi cross-field không gắn vào field nào | Khai báo `path: [...]` |

> ⚠️ Bẫy lớn nhất: **tin tưởng validate phía client**. Client validate là cho UX (phản hồi nhanh), **không phải bảo mật**. Ai cũng có thể bypass JS và gọi thẳng API. Backend **bắt buộc** validate lại — và đây chính là lý do dùng Zod đẹp ở chỗ tiếp theo.

## Liên hệ thực tế

- **Share schema FE ↔ BE**: nếu backend dùng Node/TypeScript, bạn có thể đặt Zod schema vào package dùng chung (monorepo), import ở cả frontend (validate form) lẫn backend (validate request body). Một nguồn sự thật cho cả hai phía — đúng tinh thần "API là hợp đồng" trong bài Backend [[be-01-api-design]]. Khi backend trả lỗi validate theo chuẩn (RFC 9457 `problem+json`), frontend map từng `errors[].field` vào `setError` để hiện đúng chỗ.
- **Status code điều khiển error UX**: form phải hiểu hợp đồng status code của backend — `409` (email trùng) → gắn lỗi vào field email; `422` (sai nghiệp vụ) → hiện message; `429` (rate limit) → "thử lại sau" + tôn trọng `Retry-After`; `401` → redirect login. Đây là lý do bài Backend nhấn mạnh status code là một phần hợp đồng.
- **Async validation gọi API**: check-username/check-email gọi đúng các endpoint backend, nên debounce + cache bằng react-query để không spam — và nhớ backend vẫn có rate limit của riêng nó.
- **Upload file**: form có file input là uncontrolled bắt buộc; lên AWS thường dùng **S3 presigned URL** — backend ký URL, frontend `PUT` thẳng file lên S3 không qua server, tránh nghẽn băng thông và giới hạn payload của API Gateway.
- **Bảo mật khi deploy**: client validate chỉ là lớp UX; sau khi deploy (S3 + CloudFront cho static, API qua API Gateway → Lambda), **WAF + validate ở backend** mới là lớp chặn thật. Đừng bao giờ coi form đã validate ở client là dữ liệu sạch.
