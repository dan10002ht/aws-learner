# Dựng app: Frontend + Backend + Database

Ở bài 1 (`cap-01-plan`) ta đã chốt mọi quyết định kiến trúc cho **TaskShare** — app quản lý task có **đăng nhập**, **project**, và **chia sẻ project** để cộng tác — cùng ERD, schema Prisma và API contract. Bài này biến những quyết định đó thành **code chạy thật**, từng bước có code chính, kết nối **end-to-end**: React (FE) → Express + TS (BE) → PostgreSQL (DB). Ta dựng theo **vertical slice** (milestone M1→M3 của bài 1): làm thông lát cắt mỏng (auth) xuyên cả 3 tầng trước rồi mới đắp CRUD và chia sẻ — lát cắt dọc phát hiện sớm lỗi tích hợp (CORS, shape JSON, auth flow), thứ thường giết tiến độ ở phút chót.

> 💡 Ghi nhớ: mục tiêu bài này không phải code đẹp nhất, mà là **một slice chạy thông**: đăng nhập trên FE → gọi API thật → tạo task → reload vẫn còn (đã lưu DB). Đạt được điều đó rồi mới tối ưu.

## 0. Thứ tự dựng & sơ đồ luồng

Ta dùng monorepo đã chốt ở bài 1: `apps/api` (BE), `apps/web` (FE), `packages/shared` (type chung). **BE-first thực dụng hơn** cho người ghép end-to-end: có API thật để FE gọi, không phải viết mock rồi viết lại.

```text
                 HTTP + JSON (CORS, Authorization: Bearer <JWT>)
  ┌──────────────────────┐        ┌──────────────────────────┐        ┌──────────────┐
  │  apps/web (Vite)     │        │  apps/api (Express+TS)   │        │  PostgreSQL  │
  │  React + TS          │  --->  │  /auth /me /projects     │  --->  │  users       │
  │  React Query (cache) │        │  /projects/:id/tasks ... │  SQL   │  projects    │
  │  React Router        │  <---  │  zod validate, JWT mw    │  <---  │  project_…   │
  │  axios (interceptor) │        │  Prisma ORM              │        │  tasks       │
  └──────────────────────┘        └──────────────────────────┘        └──────────────┘
     localhost:5173                     localhost:4000                   localhost:5432
            └────────── packages/shared: type Task, Project, DTO ──────────┘
```

Thứ tự: (1) DB chạy + migrate → (2) BE: config env → auth → middleware → CRUD project/task → chia sẻ → error handling → (3) FE: API client → auth flow → routing → list/form → (4) nối CORS + env, test end-to-end.

## 1. Database local & type dùng chung

Chạy Postgres bằng Docker (đừng cài bẩn máy), schema Prisma đã viết ở bài 1:

```bash
# docker-compose.yml đã có ở bài 1; hoặc nhanh gọn:
docker run --name taskshare-db -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=taskshare -p 5432:5432 -d postgres:16

cd apps/api
npx prisma migrate dev --name init   # tạo bảng users/projects/project_members/tasks
```

Siêu năng lực của monorepo TS: **type của API contract dùng chung** giữa FE và BE — đổi field sai là đỏ đèn compile-time cả hai bên.

```typescript
// packages/shared/src/types.ts
export type Task = { id: string; projectId: string; title: string;
  description: string | null; status: "todo" | "done"; dueDate: string | null };
export type Project = { id: string; name: string; role: "owner" | "member" };
export type CreateTaskInput = { title: string; description?: string; dueDate?: string };
export type ApiError = { error: { code: string; message: string } };  // format chốt ở bài 1
```

> 💡 Ghi nhớ: data model là quyết định khó đảo ngược nhất, đã chốt ở bài 1 — đừng sửa schema giữa lúc build trừ khi bắt buộc. Quan hệ then chốt: `Task` thuộc một `Project`, quyền truy cập task **kế thừa** từ quyền truy cập project (không có bảng quyền riêng cho task ở MVP).

## 2. Backend — config từ env, fail nhanh

Validate env **một lần lúc khởi động** để app chết ngay nếu thiếu biến, thay vì lỗi mơ hồ lúc runtime.

```typescript
// apps/api/src/env.ts
import "dotenv/config";
import { z } from "zod";

export const env = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().url(),        // http://localhost:5173
}).parse(process.env);                  // throw nếu thiếu/sai
```

```typescript
// apps/api/src/app.ts
export const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));  // CORS: xem mục 8
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.use(meRouter);
app.use("/projects", projectsRouter);
app.use("/tasks", tasksRouter);
app.use(errorHandler);   // PHẢI đặt cuối cùng, sau mọi route
```

> ⚠️ Bẫy: đừng hard-code connection string / secret trong code. Mọi thứ phụ thuộc môi trường (DB URL, JWT secret, port, origin FE) nằm trong `.env` ngay từ ngày đầu — nếu không, lúc deploy ở bài 3 bạn phải đi sửa rải rác khắp nơi.

## 3. Validation tập trung với zod

Đừng rải `if (!req.body.email)` khắp nơi. Một middleware validate theo schema, trả lỗi đúng format contract:

```typescript
// apps/api/src/middleware/validate.ts
export const validate = (schema: ZodSchema): RequestHandler => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success)
    return res.status(400).json({ error: { code: "BAD_REQUEST",
      message: "Dữ liệu không hợp lệ", fields: r.error.flatten().fieldErrors } });
  req.body = r.data;   // body đã được parse & ép kiểu chuẩn
  next();
};

// apps/api/src/schemas.ts
export const registerSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
export const loginSchema    = z.object({ email: z.string().email(), password: z.string().min(1) });
export const taskSchema     = z.object({ title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(), dueDate: z.string().datetime().optional() });
export const memberSchema   = z.object({ email: z.string().email() });
```

> ⚠️ Bẫy: dùng `400` cho body sai/thiếu field. Trả thêm `fields` để FE highlight đúng ô input. Đừng để zod ném exception thô ra ngoài — bắt và biến thành JSON đúng format `{ error: { code, message } }` đã chốt ở bài 1.

## 4. Auth — register, login, JWT

Bài 1 đã chốt **JWT stateless** (đơn giản để deploy FE Vercel / BE AWS khác domain). Trade-off đã biết: không revoke được token trước hạn → bù bằng TTL ngắn.

```typescript
// apps/api/src/routes/auth.ts
export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);   // KHÔNG lưu plaintext
    const user = await prisma.user.create({ data: { email, passwordHash } });
    res.status(201).json({ token: sign(user.id) });
  } catch (e: any) {
    if (e.code === "P2002")  // unique violation -> email đã tồn tại
      return res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "Email đã được dùng" } });
    next(e);
  }
});

authRouter.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    // so sánh cả khi user null để tránh lộ "email có tồn tại không"
    const ok = user && (await bcrypt.compare(req.body.password, user.passwordHash));
    if (!ok) return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Sai thông tin đăng nhập" } });
    res.json({ token: sign(user.id) });
  } catch (e) { next(e); }
});

const sign = (id: string) => jwt.sign({ sub: id }, env.JWT_SECRET, { expiresIn: "30m" });
```

Middleware xác thực, gắn `req.userId`:

```typescript
// apps/api/src/middleware/auth.ts
export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer /, "");  // "Bearer <token>"
  if (!token) return res.status(401).json({ error: { code: "NO_TOKEN", message: "Chưa đăng nhập" } });
  try {
    const { sub } = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    (req as any).userId = sub;
    next();
  } catch {  // hết hạn / sai chữ ký
    res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token không hợp lệ" } });
  }
};

// apps/api/src/routes/me.ts — endpoint bảo vệ đầu tiên (dùng test M1)
meRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const u = await prisma.user.findUnique({ where: { id: (req as any).userId } });
    res.json({ id: u!.id, email: u!.email });   // KHÔNG trả passwordHash
  } catch (e) { next(e); }
});
```

> 💡 Ghi nhớ: hash password bằng bcrypt (cost ~10–12), không bao giờ lưu/trả plaintext hay `passwordHash` ra response. Login sai trả **401 chung chung** — đừng nói riêng "email không tồn tại" vs "sai mật khẩu", đó là kẽ hở liệt kê user.

## 5. CRUD project + authorization theo resource

Đây là chỗ hay sai: `requireAuth` chỉ chứng minh "bạn là một user đã đăng nhập", **không** chứng minh "bạn được động vào project này". Phải check membership ở **từng resource**.

```typescript
// apps/api/src/routes/projects.ts
export const projectsRouter = Router();
projectsRouter.use(requireAuth);
const uid = (req: any) => req.userId as string;

// LIST: project tôi sở hữu + được chia sẻ (kèm role của tôi)
projectsRouter.get("/", async (req, res, next) => {
  try {
    const rows = await prisma.projectMember.findMany({
      where: { userId: uid(req) },
      include: { project: true },
    });
    res.json(rows.map((m) => ({ id: m.project.id, name: m.project.name, role: m.role })));
  } catch (e) { next(e); }
});

// CREATE: tạo project + thêm chính mình làm owner trong project_members (1 transaction)
projectsRouter.post("/", validate(z.object({ name: z.string().min(1) })), async (req, res, next) => {
  try {
    const p = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({ data: { name: req.body.name, ownerId: uid(req) } });
      await tx.projectMember.create({ data: { projectId: project.id, userId: uid(req), role: "owner" } });
      return project;
    });
    res.status(201).json({ id: p.id, name: p.name, role: "owner" });
  } catch (e) { next(e); }
});

// DELETE: chỉ owner
projectsRouter.delete("/:id", async (req, res, next) => {
  try {
    const role = await roleIn(req.params.id, uid(req));
    if (role === null)    return res.status(404).json({ error: { code: "NOT_FOUND", message: "" } });
    if (role !== "owner") return res.status(403).json({ error: { code: "FORBIDDEN", message: "Chỉ owner được xoá" } });
    await prisma.project.delete({ where: { id: req.params.id } });  // cascade xoá task + member
    res.status(204).end();
  } catch (e) { next(e); }
});

// INVITE: owner mời user khác qua email
projectsRouter.post("/:id/members", validate(memberSchema), async (req, res, next) => {
  try {
    if ((await roleIn(req.params.id, uid(req))) !== "owner")
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Chỉ owner được mời" } });
    const target = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!target) return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "Không tìm thấy user" } });
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: req.params.id, userId: target.id } },
      create: { projectId: req.params.id, userId: target.id, role: "member" },
      update: {},   // đã là member thì bỏ qua
    });
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

// helper dùng chung: role của user trong project, hoặc null nếu không phải member
async function roleIn(projectId: string, userId: string): Promise<"owner" | "member" | null> {
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return (m?.role as "owner" | "member") ?? null;
}
```

> ⚠️ Bẫy authorization phổ biến nhất (IDOR): tin vào `:id` mà không check membership. `prisma.project.delete({ where: { id } })` sẽ xoá project của **bất kỳ ai** nếu biết id. Luôn check `roleIn(...)` trước. Project không phải của mình → trả **404 chứ không 403** để không lộ "project này tồn tại".

## 6. CRUD task — quyền kế thừa từ project

Task không có quyền riêng: ai là member của project thì thao tác được task trong đó. Dùng lại đúng một guard `roleIn` cho mọi cửa.

```typescript
// LIST + CREATE task gắn vào projectsRouter (đường dẫn /projects/:id/tasks)
projectsRouter.get("/:id/tasks", async (req, res, next) => {
  try {
    if ((await roleIn(req.params.id, uid(req))) === null)              // member mới xem được
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "" } });
    res.json(await prisma.task.findMany({ where: { projectId: req.params.id }, orderBy: { createdAt: "desc" } }));
  } catch (e) { next(e); }
});

projectsRouter.post("/:id/tasks", validate(taskSchema), async (req, res, next) => {
  try {
    if ((await roleIn(req.params.id, uid(req))) === null)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "" } });
    const task = await prisma.task.create({ data: { ...req.body, projectId: req.params.id, createdBy: uid(req) } });
    res.status(201).json(task);
  } catch (e) { next(e); }
});

// PATCH/DELETE task: tìm project của task rồi kiểm tra membership qua project đó
tasksRouter.patch("/:id", validate(taskSchema.partial()), async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task || (await roleIn(task.projectId, uid(req))) === null)
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "" } });
    res.json(await prisma.task.update({ where: { id: task.id }, data: req.body }));
  } catch (e) { next(e); }
});
```

> 💡 Ghi nhớ: quyền task **kế thừa** từ membership project — đây là lý do data model để `tasks.project_id` thay vì bảng quyền riêng. Một hàm `roleIn` duy nhất kiểm soát mọi cửa: dễ audit, khó lọt lỗ hổng. DELETE task lặp lại đúng pattern của PATCH.

## 7. Error handling tập trung

Một middleware cuối chuỗi biến mọi exception thành JSON đúng format contract — FE chỉ cần parse một shape.

```typescript
// apps/api/src/middleware/error.ts
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);                          // log đầy đủ ở SERVER
  res.status(err.status ?? 500).json({
    error: { code: err.code ?? "INTERNAL", message: "Có lỗi xảy ra" },
    // KHÔNG leak stack trace ra production
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
```

> ⚠️ Bẫy: log chi tiết ở server, trả message gọn ở client. Đừng bao giờ trả stack trace / SQL error thô ra response production — đó là rò rỉ thông tin và bề mặt tấn công.

## 8. CORS — nguyên nhân lỗi "ghép FE-BE" số 1

FE chạy `localhost:5173`, BE `localhost:4000` → **khác origin** → browser chặn nếu BE không cho phép. Ta đã bật `cors({ origin: env.CORS_ORIGIN })` ở mục 2.

```text
Browser (5173) ── preflight OPTIONS ──> BE (4000)
               <── Access-Control-Allow-Origin: http://localhost:5173
               <── Access-Control-Allow-Methods / Allow-Headers
Browser ──── request thật (kèm Authorization) ────>
```

| Triệu chứng | Nguyên nhân thật | Cách sửa |
|---|---|---|
| "blocked by CORS policy" | BE không trả `Access-Control-Allow-Origin` | Thêm origin FE vào `cors({ origin })` |
| Preflight OPTIONS 404 | Route không xử lý OPTIONS | Đặt `app.use(cors())` **trước** mọi route |
| Header `Authorization` bị chặn | Không nằm trong allowed headers | `cors` mặc định cho phép; nếu custom thì khai báo |

> ⚠️ Bẫy: đừng "fix" CORS bằng `origin: "*"` rồi để lên production. Wildcard không đi cùng `credentials:true` và mở API cho mọi site. Whitelist origin cụ thể đọc từ env (`CORS_ORIGIN`) — mỗi môi trường một giá trị.

## 9. Frontend — API client với axios interceptor

Một lớp client duy nhất: tự gắn token, tự bắt 401 đẩy về login. Cả app chỉ import từ đây.

```typescript
// apps/web/src/lib/api.ts
import axios from "axios";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });  // http://localhost:4000

api.interceptors.request.use((config) => {                 // gắn Bearer token
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((r) => r, (err) => {         // 401 -> dọn token, về login
  if (err.response?.status === 401) {
    localStorage.removeItem("token");
    if (location.pathname !== "/login") location.href = "/login";
  }
  return Promise.reject(err);
});
```

> ⚠️ Bẫy env Vite: biến phải có tiền tố `VITE_` mới lộ ra client, đọc qua `import.meta.env` (không phải `process.env`). Sửa `.env` phải **restart `vite dev`** mới ăn.

## 10. React Query — gọi API, cache, loading/error

React Query lo cache, loading state, refetch và **invalidation** sau khi mutate. Bọc app trong `QueryClientProvider`, viết hook cho từng resource (type lấy từ `packages/shared`).

```typescript
// apps/web/src/queries/tasks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task, CreateTaskInput } from "@taskshare/shared";
import { api } from "../lib/api";

export const useTasks = (projectId: string) =>
  useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => (await api.get<Task[]>(`/projects/${projectId}/tasks`)).data,
  });

export const useCreateTask = (projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      api.post<Task>(`/projects/${projectId}/tasks`, input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),  // refetch list
  });
};
```

```tsx
// apps/web/src/pages/ProjectPage.tsx — hiển thị dữ liệu + loading/error
export function ProjectPage() {
  const { id } = useParams();
  const { data: tasks, isLoading, isError, error } = useTasks(id!);
  const create = useCreateTask(id!);

  if (isLoading) return <p>Đang tải…</p>;
  if (isError)
    return <p role="alert">Lỗi: {(error as any)?.response?.data?.error?.code ?? "UNKNOWN"}</p>;

  return (
    <div>
      <button disabled={create.isPending}
              onClick={() => create.mutate({ title: "Task mới" })}>
        {create.isPending ? "Đang tạo…" : "+ Thêm task"}
      </button>
      <ul>{tasks!.map((t) => <li key={t.id}>{t.status === "done" ? "✓ " : ""}{t.title}</li>)}</ul>
    </div>
  );
}
```

> 💡 Ghi nhớ: chìa khoá React Query là **`queryKey` + `invalidateQueries`**. Mutate xong thì invalidate đúng key để list tự refetch — không tự `setState`, không lo cache stale. Đây là khác biệt lớn nhất so với gọi `fetch` trần.

## 11. Auth flow phía FE — context, protected route, form

```tsx
// apps/web/src/auth/AuthContext.tsx
const Ctx = createContext<{ login: (e: string, p: string) => Promise<void>; logout: () => void } | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  async function login(email: string, password: string) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);   // token cho interceptor dùng
  }
  const logout = () => { localStorage.removeItem("token"); location.href = "/login"; };
  return <Ctx.Provider value={{ login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx)!;

// apps/web/src/auth/ProtectedRoute.tsx — chặn khi chưa đăng nhập
export const ProtectedRoute = () =>
  localStorage.getItem("token") ? <Outlet /> : <Navigate to="/login" replace />;
```

```tsx
// apps/web/src/App.tsx — route công khai vs route được bảo vệ
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/" element={<ProjectsPage />} />
      <Route path="/projects/:id" element={<ProjectPage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

```tsx
// apps/web/src/pages/LoginPage.tsx — form có loading + error handling
export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      await login(email, password);
      nav("/");                                   // thành công -> trang chính
    } catch (e: any) {
      setErr(e.response?.data?.error?.code === "INVALID_CREDENTIALS"
        ? "Email hoặc mật khẩu không đúng" : "Đăng nhập thất bại");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {err && <p role="alert">{err}</p>}
      <button disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
    </form>
  );
}
```

> ⚠️ Bẫy bảo mật JWT ở FE: `localStorage` tiện nhưng dính rủi ro XSS (script lạ đọc được token). Trade-off chấp nhận được cho capstone (đã ghi ở bài 1), nhưng phải biết: production thực thụ thường dùng **httpOnly cookie** + chống CSRF, hoặc access token ngắn hạn trong memory + refresh token httpOnly. Ghi rõ lựa chọn này trong README.

## 12. Nối end-to-end & test luồng

Chạy 3 thành phần, kiểm thử lát cắt dọc (milestone M1→M3):

```bash
docker start taskshare-db                       # DB
cd apps/api && npm run dev                       # BE :4000
cd apps/web && npm run dev                       # FE :5173
```

Test BE bằng curl trước khi mở FE (loại trừ lỗi tầng nào):

```bash
TOKEN=$(curl -s -X POST localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"password123"}' | jq -r .token)

curl -s localhost:4000/me -H "Authorization: Bearer $TOKEN"          # M1: {id,email}
PID=$(curl -s -X POST localhost:4000/projects -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"name":"Capstone"}' | jq -r .id)
curl -s -X POST localhost:4000/projects/$PID/tasks -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"title":"Viết bài"}'      # M2: task lưu DB
```

## 13. Bảng "bẫy tích hợp FE-BE" hay gặp & cách chẩn đoán

| Triệu chứng | Nguyên nhân thường gặp | Cách sửa |
|---|---|---|
| Network tab báo CORS | Origin FE chưa whitelist ở BE | `cors({ origin: env.CORS_ORIGIN })`, đặt trước route |
| 401 ở mọi request dù đã login | Interceptor không gắn token / sai key `localStorage` | Xem header `Authorization: Bearer …` trong Network tab |
| 404 khi gọi `/projects` | Sai `baseURL` (thừa/thiếu `/`) hoặc chưa mount router | So `VITE_API_URL` với route thật |
| Body BE nhận `undefined` | Quên `express.json()` hoặc sai `Content-Type` | Bật `express.json()`; axios tự set JSON header |
| Tạo task xong UI không cập nhật | Quên `invalidateQueries` sau mutation | Invalidate đúng `queryKey` |
| Member sửa được project người khác | Thiếu check `roleIn` / IDOR | Ràng buộc membership ở DB query |
| 401 vs 403 lẫn lộn | Trả sai code → FE logout nhầm | 401 = chưa biết bạn là ai; 403 = biết nhưng không đủ quyền |
| Đổi `.env` không ăn | Chưa restart dev server | Restart `vite` và `nodemon` |

> 💡 Ghi nhớ: khi ghép lỗi, **đọc Network tab trước, terminal BE sau**. 90% lỗi tích hợp lộ ra ở status code + response body của request lỗi. Đừng đoán — nhìn request thật.

## Checklist hoàn thành bài này

- [ ] Postgres chạy (Docker), `prisma migrate dev` tạo đủ 4 bảng
- [ ] `packages/shared` export type contract dùng chung FE + BE
- [ ] `env.ts` validate biến môi trường, app fail nhanh nếu thiếu
- [ ] `POST /auth/register` + `/login` trả JWT; password hash bcrypt; `GET /me` (M1)
- [ ] `requireAuth` chặn route; `roleIn` check membership owner/member theo từng project
- [ ] CRUD project + task hoạt động, quyền task kế thừa từ project; IDOR đã chặn (→ 404)
- [ ] zod validate input (400 + `fields`); `errorHandler` trả đúng format `{error:{code,message}}`
- [ ] FE: axios interceptor gắn token + bắt 401; CORS thông
- [ ] React Query list/create task, `invalidateQueries` sau mutation
- [ ] Auth flow: login form → context → `ProtectedRoute` → routing
- [ ] Test curl + UI: login → tạo project → tạo task → reload còn nguyên (M2)
- [ ] Demo 2 tài khoản cùng một project được chia sẻ (M3 — Definition of Done bài 1)

Khi lát cắt dọc này chạy thông và 2 tài khoản cộng tác được trên cùng project, bạn đã có **full-stack app thật trên local** — đúng "Definition of Done" của MVP. Bài 3 (`cap-03-deploy`) đưa nó lên mây: Dockerize BE, CI/CD bằng GitHub Actions, deploy FE lên Vercel và BE + Postgres lên AWS, quản lý env/secrets và monitoring.
