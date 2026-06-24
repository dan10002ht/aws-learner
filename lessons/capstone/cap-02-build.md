# Dựng app: Frontend + Backend + Database

Ở bài 1 (`cap-01-plan`) ta đã chốt mọi quyết định kiến trúc cho **TaskShare** — app quản lý task có **đăng nhập**, **project**, và **chia sẻ project** để cộng tác — cùng ERD, schema Prisma và API contract. Bài này biến những quyết định đó thành **code chạy thật**, từng bước có code chính, kết nối **end-to-end**: React (FE) → Express + TS (BE) → PostgreSQL (DB). Ta dựng theo **vertical slice** (milestone M1→M3 của bài 1): làm thông lát cắt mỏng (auth) xuyên cả 3 tầng trước rồi mới đắp CRUD và chia sẻ — lát cắt dọc phát hiện sớm lỗi tích hợp (CORS, shape JSON, auth flow), thứ thường giết tiến độ ở phút chót.

> 💡 Ghi nhớ: mục tiêu bài này không phải code đẹp nhất, mà là **một slice chạy thông**: đăng nhập trên FE → gọi API thật → tạo task → reload vẫn còn (đã lưu DB). Đạt được điều đó rồi mới tối ưu.

## 0. Thứ tự dựng & sơ đồ luồng

Ta dùng monorepo đã chốt ở bài 1: `apps/api` (BE), `apps/web` (FE), `packages/shared` (type chung). **BE-first thực dụng hơn** cho người ghép end-to-end: có API thật để FE gọi, không phải viết mock rồi viết lại.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Sơ đồ luồng tổng quan TaskShare — FE, BE, DB và type dùng chung</title>
  <desc>apps/web (React+TS, React Query, axios interceptor) gọi HTTP+JSON kèm Authorization Bearer JWT tới apps/api (Express, zod, JWT middleware, Prisma), apps/api dùng SQL tới PostgreSQL. packages/shared là type dùng chung cho cả FE và BE. Port localhost: FE 5173, BE 4000, DB 5432.</desc>
  <defs>
    <marker id="flowArr" markerWidth="11" markerHeight="11" refX="8" refY="3.5" orient="auto"><path d="M0 0 L8 3.5 L0 7 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="20" y="56" width="190" height="120" rx="11" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="32" y="80" font-size="13" font-weight="700" fill="currentColor">apps/web (Vite)</text>
  <text x="32" y="100" font-size="11" fill="currentColor" opacity="0.78">React + TS</text>
  <text x="32" y="118" font-size="11" fill="currentColor" opacity="0.78">React Query (cache)</text>
  <text x="32" y="136" font-size="11" fill="currentColor" opacity="0.78">React Router</text>
  <text x="32" y="154" font-size="11" fill="currentColor" opacity="0.78">axios (interceptor)</text>
  <rect x="32" y="162" width="120" height="0" />
  <text x="115" y="200" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.62">localhost:5173</text>
  <rect x="266" y="56" width="190" height="120" rx="11" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="278" y="80" font-size="13" font-weight="700" fill="currentColor">apps/api (Express+TS)</text>
  <text x="278" y="100" font-size="11" fill="currentColor" opacity="0.78">/auth /me /projects</text>
  <text x="278" y="118" font-size="11" fill="currentColor" opacity="0.78">/projects/:id/tasks …</text>
  <text x="278" y="136" font-size="11" fill="currentColor" opacity="0.78">zod validate, JWT mw</text>
  <text x="278" y="154" font-size="11" fill="currentColor" opacity="0.78">Prisma ORM</text>
  <text x="361" y="200" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.62">localhost:4000</text>
  <rect x="512" y="56" width="186" height="120" rx="11" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="524" y="80" font-size="13" font-weight="700" fill="currentColor">PostgreSQL</text>
  <text x="524" y="100" font-size="11" fill="currentColor" opacity="0.78">users</text>
  <text x="524" y="118" font-size="11" fill="currentColor" opacity="0.78">projects</text>
  <text x="524" y="136" font-size="11" fill="currentColor" opacity="0.78">project_members</text>
  <text x="524" y="154" font-size="11" fill="currentColor" opacity="0.78">tasks</text>
  <text x="605" y="200" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.62">localhost:5432</text>
  <line x1="210" y1="98" x2="264" y2="98" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#flowArr)"/>
  <line x1="266" y1="128" x2="212" y2="128" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#flowArr)"/>
  <text x="238" y="40" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">HTTP + JSON</text>
  <text x="238" y="52" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.62">CORS · Bearer JWT</text>
  <line x1="456" y1="98" x2="510" y2="98" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#flowArr)"/>
  <line x1="512" y1="128" x2="458" y2="128" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#flowArr)"/>
  <text x="484" y="50" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">SQL (Prisma)</text>
  <rect x="120" y="238" width="480" height="44" rx="10" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="257" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">packages/shared</text>
  <text x="360" y="274" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">type Task · Project · DTO — dùng chung FE + BE (đỏ đèn compile-time cả hai bên)</text>
  <g stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 3" fill="none">
    <path d="M115 176 v40 h130"/>
    <path d="M361 176 v62"/>
  </g>
</svg>

> Luồng: FE (`5173`) gọi HTTP+JSON kèm `Authorization: Bearer <JWT>` qua CORS tới BE (`4000`); BE dùng Prisma sinh SQL tới Postgres (`5432`); `packages/shared` là type chung khiến đổi field sai đỏ đèn compile-time ở cả hai phía.

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>CORS preflight — chuỗi trao đổi giữa Browser và Backend theo thời gian</title>
  <desc>Browser ở localhost:5173 gửi OPTIONS preflight tới Backend ở localhost:4000; Backend trả Access-Control-Allow-Origin, Allow-Methods, Allow-Headers; sau đó Browser mới gửi request thật kèm header Authorization và Backend trả dữ liệu. Thời gian đi từ trên xuống.</desc>
  <defs>
    <marker id="corsArr" markerWidth="11" markerHeight="11" refX="8" refY="3.5" orient="auto"><path d="M0 0 L8 3.5 L0 7 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <rect x="60" y="20" width="200" height="40" rx="10" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="160" y="38" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Browser</text>
  <text x="160" y="53" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">localhost:5173</text>
  <rect x="460" y="20" width="200" height="40" rx="10" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="560" y="38" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Backend (BE)</text>
  <text x="560" y="53" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">localhost:4000</text>
  <line x1="160" y1="60" x2="160" y2="288" stroke="currentColor" stroke-opacity="0.28" stroke-dasharray="3 4"/>
  <line x1="560" y1="60" x2="560" y2="288" stroke="currentColor" stroke-opacity="0.28" stroke-dasharray="3 4"/>
  <line x1="160" y1="96" x2="558" y2="96" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#corsArr)"/>
  <text x="360" y="89" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">preflight: OPTIONS (Origin, Access-Control-Request-*)</text>
  <line x1="560" y1="136" x2="162" y2="136" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#corsArr)"/>
  <text x="360" y="129" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Access-Control-Allow-Origin: http://localhost:5173</text>
  <line x1="560" y1="166" x2="162" y2="166" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#corsArr)"/>
  <text x="360" y="159" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">Allow-Methods / Allow-Headers</text>
  <line x1="160" y1="220" x2="558" y2="220" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" marker-end="url(#corsArr)"/>
  <text x="360" y="213" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">request thật (kèm Authorization: Bearer …)</text>
  <line x1="560" y1="260" x2="162" y2="260" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.6" marker-end="url(#corsArr)"/>
  <text x="360" y="253" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">200 + dữ liệu JSON</text>
  <text x="64" y="192" font-size="10" fill="currentColor" opacity="0.6">— browser duyệt header OK rồi mới gửi tiếp —</text>
</svg>


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

Trước khi đọc code, đây là **vòng đời của token** phía FE — một máy trạng thái (state machine) chạy theo chu kỳ kín: từ trạng thái chưa có token, login thành công đưa token sang trạng thái hợp lệ, hết hạn 30 phút (BE trả `401`) đưa nó về trạng thái không hợp lệ, interceptor dọn token rồi redirect `/login` để quay lại điểm xuất phát. `ProtectedRoute` là **guard** rẽ nhánh theo việc state hiện tại có token hợp lệ hay không.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vòng đời token phía Frontend — máy trạng thái chu kỳ kín</title>
  <desc>Máy trạng thái của token. Trạng thái Chưa đăng nhập (chưa có token), khi login thành công chuyển sang Đã lưu token, hợp lệ. Khi token hết hạn 30 phút thì BE trả 401, chuyển sang Hết hạn hoặc không hợp lệ. Response interceptor dọn token và redirect về /login, đưa về lại trạng thái Chưa đăng nhập — tạo thành vòng kín. ProtectedRoute là guard rẽ nhánh theo state có token hợp lệ hay không.</desc>
  <defs>
    <marker id="authArr" markerWidth="11" markerHeight="11" refX="8" refY="3.5" orient="auto"><path d="M0 0 L8 3.5 L0 7 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <!-- State: chưa có token -->
  <rect x="40" y="44" width="220" height="58" rx="14" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="150" y="69" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Chưa đăng nhập</text>
  <text x="150" y="88" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">localStorage: không có token</text>
  <!-- State: hợp lệ -->
  <rect x="460" y="44" width="220" height="58" rx="14" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="570" y="69" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Đã lưu token · hợp lệ</text>
  <text x="570" y="88" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">setItem("token") · gắn Bearer</text>
  <!-- State: hết hạn -->
  <rect x="460" y="240" width="220" height="58" rx="14" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="570" y="265" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Hết hạn · không hợp lệ</text>
  <text x="570" y="284" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.72">request kế tiếp bị từ chối</text>
  <!-- transition: login thành công -->
  <line x1="260" y1="73" x2="458" y2="73" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#authArr)"/>
  <text x="359" y="64" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.78">login thành công (POST /auth/login)</text>
  <!-- transition: hết hạn -> 401 -->
  <line x1="570" y1="102" x2="570" y2="238" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#authArr)"/>
  <text x="578" y="160" font-size="10.5" fill="currentColor" opacity="0.78">hết hạn 30m</text>
  <text x="578" y="176" font-size="10.5" fill="currentColor" opacity="0.78">→ BE trả 401</text>
  <!-- transition: interceptor dọn token + redirect -> chưa đăng nhập -->
  <path d="M460 269 H150 V104" fill="none" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#authArr)"/>
  <text x="305" y="261" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.78">response interceptor: removeItem("token") → redirect /login</text>
  <!-- ProtectedRoute guard -->
  <rect x="40" y="332" width="640" height="52" rx="12" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.28" stroke-dasharray="5 3"/>
  <text x="58" y="354" font-size="12" font-weight="700" fill="currentColor">ProtectedRoute (guard)</text>
  <text x="58" y="372" font-size="10.5" fill="currentColor" opacity="0.78">state có token hợp lệ → render route con (Outlet); state không có token → Navigate to /login</text>
  <line x1="150" y1="332" x2="150" y2="104" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3"/>
  <line x1="570" y1="332" x2="570" y2="104" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3"/>
</svg>

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
