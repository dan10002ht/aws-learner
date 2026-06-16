# Lên kế hoạch & kiến trúc dự án

Bạn đã học **frontend** (React, TypeScript), **backend** (REST API, database) và **cloud** (AWS, deploy). Vấn đề của hầu hết người tự học là kiến thức nằm rời rạc: làm được TODO list React, làm được CRUD API, nhưng chưa từng *ghép* tất cả thành một sản phẩm thật chạy được trên internet, có người dùng đăng nhập, dữ liệu lưu bền vững và deploy qua CI/CD.

Capstone này sửa đúng chỗ đó. Ba bài học là **một dự án duy nhất** đi từ con số 0 tới production:

1. **Bài này** — kế hoạch & kiến trúc: chọn đề, làm rõ yêu cầu, vẽ kiến trúc, chốt tech stack, thiết kế data model + API contract, chia milestone, setup repo.
2. **Bài 2** — dựng app: Backend (API + DB + auth) rồi Frontend (React gọi API), kết nối end-to-end.
3. **Bài 3** — deploy: Dockerize, CI/CD, lên Vercel + AWS, env/secrets, monitoring, README & demo.

Triết lý xuyên suốt: **kiến trúc không phải là vẽ cho đẹp, mà là một chuỗi quyết định có trade-off**. Mỗi lựa chọn (monorepo hay 2 repo? REST hay GraphQL? JWT hay session?) đều có cái giá. Người kỹ sư giỏi không chọn cái "xịn nhất" mà chọn cái **phù hợp với scope, team size và thời gian** của dự án này.

## 1. Chọn đề bài: "TaskShare" — quản lý task có auth & chia sẻ

Một capstone tốt phải đủ nhỏ để hoàn thành, nhưng đủ phức tạp để *chứng minh năng lực full-stack*. Đề được chọn xuyên suốt cả 3 bài:

> **TaskShare** — ứng dụng quản lý task cá nhân, cho phép **đăng nhập**, tạo task theo **project**, và **chia sẻ project** cho người dùng khác cùng cộng tác.

Vì sao đề này tốt cho capstone:

| Yêu cầu | Nó buộc bạn phải làm gì (giá trị học tập) |
|---|---|
| Đăng nhập / đăng ký | **Authentication** thật (hash password, token), bảo vệ route |
| Task thuộc về user | **Authorization** — user A không được thấy task của user B |
| Chia sẻ project | **Quan hệ many-to-many**, kiểm soát quyền (owner vs member) |
| Đánh dấu xong, lọc, sắp xếp | CRUD đầy đủ + query có điều kiện |
| Realtime-ish (nice-to-have) | Cơ hội nâng cấp về sau (polling/websocket) |

> 💡 Ghi nhớ: tiêu chí chọn đề capstone — (1) có **auth + nhiều user** (không phải app 1 người), (2) có **ít nhất một quan hệ many-to-many** (đây là nơi data model thật sự khó), (3) có thể **demo bằng 2 tài khoản** để thấy tính cộng tác. TaskShare thoả cả ba. (Đề thay thế tương đương: *URL shortener có dashboard thống kê* — cũng có auth + analytics.)

## 2. Làm rõ yêu cầu: functional vs non-functional

Trước khi viết một dòng code, viết ra yêu cầu. Đây là bước nhiều người bỏ qua và phải trả giá bằng việc đập đi xây lại.

### Functional requirements (hệ thống *làm gì*)

- FR1: User đăng ký bằng email + password, đăng nhập, đăng xuất.
- FR2: User đã đăng nhập tạo / sửa / xoá **project**.
- FR3: Trong project, user tạo / sửa / xoá / đánh dấu hoàn thành **task** (title, mô tả, due date, trạng thái).
- FR4: User **mời** user khác vào project bằng email; người được mời thấy & sửa task trong project đó.
- FR5: Chỉ **owner** của project được xoá project hoặc xoá thành viên.
- FR6: User chỉ thấy project mình sở hữu hoặc được chia sẻ.

### Non-functional requirements (hệ thống *tốt thế nào*)

| Loại | Yêu cầu cụ thể (đo được) |
|---|---|
| Performance | API p95 < 300ms ở mức dữ liệu nhỏ; trang chính load < 2s |
| Security | Password hash (bcrypt/argon2); HTTPS; không lộ token trong URL; CORS chặt |
| Availability | Chấp nhận downtime cho capstone (không cần multi-AZ HA) |
| Scalability | Mục tiêu thực tế: ~vài trăm user — **không** over-engineer cho 1 triệu |
| Maintainability | Có test cho phần auth & business logic lõi; CI chạy lint + test |
| Cost | Nằm trong **free tier** Vercel + AWS RDS/EC2 nhỏ |

> ⚠️ Bẫy phổ biến: viết non-functional requirement kiểu "phải scale tốt, phải nhanh, phải bảo mật". Vô nghĩa vì không đo được và dẫn tới over-engineering. Hãy ghi **con số** và **giới hạn scope** ("vài trăm user", không phải "vô hạn"). Capstone bị over-engineer (microservices, Kubernetes, event sourcing cho một app TODO) là dấu hiệu *thiếu* trưởng thành kỹ thuật, không phải thừa.

## 3. Sơ đồ kiến trúc (FE — BE — DB — deploy)

Bắt đầu từ kiến trúc đơn giản nhất chạy được. Đây là một **3-tier classic**: client → API → database, cộng thêm lớp deploy.

```
                            Người dùng (browser)
                                    │  HTTPS
                                    ▼
                    ┌───────────────────────────────┐
                    │   FRONTEND  (React + TS, SPA)  │
                    │   Host: Vercel (CDN + build)   │
                    └───────────────┬───────────────┘
                                    │  fetch() JSON over HTTPS
                                    │  Authorization: Bearer <JWT>
                                    ▼
                    ┌───────────────────────────────┐
                    │   BACKEND  (Node/Express + TS) │
                    │   - Auth middleware (JWT)      │
                    │   - REST endpoints             │
                    │   - Business logic / validate  │
                    │   Host: AWS (EC2 hoặc App      │
                    │         Runner / ECS Fargate)  │
                    └───────────────┬───────────────┘
                                    │  SQL (TCP, trong VPC)
                                    ▼
                    ┌───────────────────────────────┐
                    │   DATABASE  (PostgreSQL)       │
                    │   Host: AWS RDS (private subnet)│
                    └───────────────────────────────┘

   CI/CD:  GitHub → GitHub Actions → (build/test) → deploy FE (Vercel)
                                                  └─ deploy BE (AWS)
```

Vì sao tách FE và BE host khác nhau (Vercel cho FE, AWS cho BE)?

- FE là static asset (HTML/JS/CSS sau build) → Vercel/CDN phục vụ cực nhanh, free, deploy preview mỗi PR.
- BE là process chạy lâu (long-running) cần kết nối DB trong VPC → AWS phù hợp hơn.
- Trade-off: phải cấu hình **CORS** vì FE và BE khác origin. Đổi lại được tách biệt rõ ràng, scale độc lập.

> 💡 Ghi nhớ: vẽ kiến trúc trước, code sau. Sơ đồ này trả lời 3 câu hỏi mọi reviewer sẽ hỏi: *dữ liệu chảy thế nào, mỗi thành phần host ở đâu, ranh giới tin cậy (trust boundary) nằm ở đâu*. Trust boundary ở đây là giữa browser và backend — **mọi thứ từ browser đều không đáng tin**, phải validate ở backend.

## 4. Chọn tech stack & vì sao

Quyết định stack là bài tập về trade-off, không phải về "công nghệ hot nhất".

| Tầng | Lựa chọn | Vì sao chọn | Phương án bị loại & lý do |
|---|---|---|---|
| Frontend | **React + TypeScript + Vite** | Bạn đã học; ecosystem lớn; TS bắt bug sớm | Next.js: mạnh nhưng SSR là phức tạp thừa cho một SPA có auth |
| Backend | **Node + Express + TypeScript** | Cùng ngôn ngữ với FE (giảm context switch); Express tối giản, dễ hiểu | FastAPI (Python): xuất sắc, nhưng thêm 1 ngôn ngữ. NestJS: nhiều boilerplate cho scope nhỏ |
| Database | **PostgreSQL** | Quan hệ many-to-many (chia sẻ) cần SQL & foreign key; ACID; free tier RDS | MongoDB: many-to-many + quyền truy cập sẽ thành ác mộng join thủ công |
| ORM / query | **Prisma** | Type-safe, migration tự sinh, hợp TS | SQL thuần: học tốt nhưng tốn thời gian; tự do tùy bạn |
| Auth | **JWT (access token)** stateless | Đơn giản để deploy (không cần session store); FE lưu & gửi token | Session + cookie: an toàn hơn cho XSS nhưng cần server-side store |
| Deploy FE | **Vercel** | Free, CDN, preview deploy theo PR, zero config với Vite | — |
| Deploy BE | **AWS** (App Runner / ECS Fargate / EC2) | Bạn đang học AWS; gần DB (RDS) trong VPC | — |

> ⚠️ Bẫy: đừng chọn stack vì "muốn học thêm cho oai" giữa lúc đang làm capstone. Capstone là lúc *củng cố* thứ đã biết thành sản phẩm, không phải lúc học 5 công nghệ mới cùng lúc. Mỗi công nghệ mới là một rủi ro tiến độ. Nếu muốn học cái mới, giới hạn **đúng một thứ** (ví dụ: Prisma) và dùng lại tất cả phần còn lại.

Lưu ý về JWT: chọn stateless cho đơn giản, nhưng phải biết trade-off — **không revoke được token trước khi hết hạn**. Giảm thiểu bằng access token TTL ngắn (15–60 phút). Refresh token là *nice-to-have*, để dành.

## 5. Thiết kế data model (ERD)

Trái tim của TaskShare là quan hệ **many-to-many**: một user có nhiều project, một project có nhiều user (qua bảng nối `project_members`). Đây là nơi quyết định kiến trúc data quan trọng nhất.

```
┌──────────────┐         ┌────────────────────┐         ┌──────────────┐
│    users     │         │  project_members   │         │   projects   │
├──────────────┤         ├────────────────────┤         ├──────────────┤
│ id      PK   │◄───────┐│ project_id  FK ────┼────────►│ id      PK   │
│ email   UQ   │        ││ user_id     FK ────┼──┐      │ name         │
│ password_hash│        ││ role (owner|member)│  │      │ owner_id  FK │──┐
│ created_at   │        ││ created_at         │  │      │ created_at   │  │
└──────────────┘        │└────────────────────┘  │      └──────┬───────┘  │
       ▲                │   composite PK:         │             │ 1        │
       │                │   (project_id+user_id)  │             │          │
       │                └─────────────────────────┘             │ N        │
       │                                                  ┌──────▼───────┐  │
       │                                                  │    tasks     │  │
       │                                                  ├──────────────┤  │
       └──────────────── created_by (FK, optional) ────── │ id       PK  │  │
                                                          │ project_id FK│  │
                                                          │ title        │  │
                                                          │ description  │  │
                                                          │ status       │  │
                                                          │ due_date     │  │
                                                          │ created_by FK│  │
                                                          │ created_at   │  │
                                                          └──────────────┘  │
                                                                            │
              projects.owner_id ──────────────────────────────────────────┘
              tham chiếu users.id (one-to-many: 1 user sở hữu N project)
```

Các quyết định và lý do:

- **`project_members` là bảng nối** với composite primary key `(project_id, user_id)` → một user chỉ tham gia một project đúng một lần. Cột `role` ('owner' | 'member') để phân quyền FR5.
- **`projects.owner_id`** lưu ai tạo project (thuận tiện query), *đồng thời* owner cũng có một dòng trong `project_members` với role='owner' (nhất quán khi liệt kê thành viên). Đây là một **denormalization có chủ đích** — chấp nhận lặp owner ở 2 chỗ để query đơn giản hơn.
- **`tasks.project_id`** → task luôn thuộc một project; quyền truy cập task *kế thừa* từ quyền truy cập project (không cần bảng quyền riêng cho task ở MVP).
- **Foreign key với `ON DELETE CASCADE`**: xoá project → xoá hết task & member của nó. Quyết định này phải có ý thức: cascade tiện nhưng nguy hiểm, ghi rõ trong migration.

Schema bằng Prisma (sẽ dùng lại ở bài 2):

```prisma
model User {
  id            String          @id @default(uuid())
  email         String          @unique
  passwordHash  String
  createdAt     DateTime        @default(now())
  members       ProjectMember[]
  ownedProjects Project[]       @relation("owner")
}

model Project {
  id        String          @id @default(uuid())
  name      String
  ownerId   String
  owner     User            @relation("owner", fields: [ownerId], references: [id])
  members   ProjectMember[]
  tasks     Task[]
  createdAt DateTime        @default(now())
}

model ProjectMember {
  projectId String
  userId    String
  role      String   @default("member") // "owner" | "member"
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  @@id([projectId, userId])             // composite PK
}

model Task {
  id          String    @id @default(uuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title       String
  description String?
  status      String    @default("todo")  // "todo" | "done"
  dueDate     DateTime?
  createdBy   String?
  createdAt   DateTime  @default(now())
}
```

> 💡 Ghi nhớ: data model là quyết định **khó đảo ngược nhất** trong dự án. Đổi cấu trúc bảng sau khi đã có dữ liệu thật là đau đớn (migration + backfill). Dành thời gian vẽ ERD đúng *trước* khi code. Câu hỏi vàng cho mọi quan hệ: "many-to-many?" — nếu có, gần như chắc chắn cần một bảng nối.

## 6. Thiết kế API contract (REST endpoints)

API là **hợp đồng** giữa FE và BE. Chốt contract trước cho phép bài 2 build FE và BE *song song* mà không chờ nhau. Dùng danh từ cho resource, HTTP method cho hành động.

| Method & Path | Mục đích | Auth | Body / trả về chính |
|---|---|---|---|
| `POST /auth/register` | Đăng ký | Không | `{email, password}` → `{token}` |
| `POST /auth/login` | Đăng nhập | Không | `{email, password}` → `{token}` |
| `GET /me` | Thông tin user hiện tại | JWT | → `{id, email}` |
| `GET /projects` | List project của tôi (owned + shared) | JWT | → `[{id, name, role}]` |
| `POST /projects` | Tạo project | JWT | `{name}` → `{id, name}` |
| `DELETE /projects/:id` | Xoá project | JWT (owner) | → `204` |
| `POST /projects/:id/members` | Mời user qua email | JWT (owner) | `{email}` → `201` |
| `DELETE /projects/:id/members/:userId` | Gỡ thành viên | JWT (owner) | → `204` |
| `GET /projects/:id/tasks` | List task trong project | JWT (member) | → `[task]` |
| `POST /projects/:id/tasks` | Tạo task | JWT (member) | `{title, dueDate?}` → `{task}` |
| `PATCH /tasks/:id` | Sửa / đổi trạng thái task | JWT (member) | `{status?, title?, ...}` → `{task}` |
| `DELETE /tasks/:id` | Xoá task | JWT (member) | → `204` |

Quy ước contract (ghi vào README để FE tuân theo):

- **Status code mang ngữ nghĩa**: `201` Created, `204` No Content, `400` body sai, `401` chưa đăng nhập / token hỏng, `403` đã đăng nhập nhưng không đủ quyền, `404` không tồn tại, `409` trùng (email đã tồn tại).
- **Error format nhất quán**: `{ "error": { "code": "FORBIDDEN", "message": "..." } }`.
- **Auth**: gửi `Authorization: Bearer <JWT>` ở mọi endpoint cần đăng nhập.

```
# Ví dụ một request/response trong contract
POST /projects/abc-123/tasks
Authorization: Bearer eyJhbGciOiJI...
Content-Type: application/json

{ "title": "Viết bài capstone", "dueDate": "2026-06-20" }

→ 201 Created
{ "id": "task-789", "title": "Viết bài capstone",
  "status": "todo", "dueDate": "2026-06-20", "projectId": "abc-123" }
```

> ⚠️ Bẫy: trộn lẫn `401` và `403`. `401` = "tôi không biết bạn là ai" (thiếu/sai token → FE nên đẩy về trang login). `403` = "tôi biết bạn là ai nhưng bạn không được phép" (member cố xoá project → FE hiện thông báo, *không* logout). Lẫn hai cái này làm UX rối và che giấu bug phân quyền. Và: với resource của người khác, cân nhắc trả `404` thay vì `403` để không lộ "resource này tồn tại".

## 7. Scope: MVP vs nice-to-have

Quyết định scope là kỹ năng quan trọng nhất của bài này. **MVP = tập nhỏ nhất chứng minh được giá trị cốt lõi end-to-end.** Mọi thứ ngoài đó để "version sau".

| Trong MVP (bắt buộc) | Nice-to-have (chỉ làm nếu còn thời gian) |
|---|---|
| Đăng ký / đăng nhập (JWT) | Refresh token + đăng xuất phía server |
| CRUD project | Đổi tên / archive project |
| CRUD task + đánh dấu done | Subtask, gắn nhãn (label), độ ưu tiên |
| Mời thành viên qua email | Email thật gửi lời mời (MVP: thêm thẳng nếu user đã tồn tại) |
| Phân quyền owner vs member | Vai trò chi tiết hơn (viewer, admin) |
| List + lọc task theo status | Realtime cập nhật (websocket / polling) |
| Deploy được & demo 2 tài khoản | Activity log, thông báo, dark mode |

> 💡 Ghi nhớ: định nghĩa "**Definition of Done**" cho MVP ngay bây giờ: *"Hai người dùng khác nhau đăng nhập trên 2 trình duyệt, cùng thấy và sửa task trong một project được chia sẻ, mọi thứ chạy trên domain production thật."* Nếu một tính năng không cần thiết để đạt câu đó → nó là nice-to-have. Câu này cũng chính là kịch bản demo ở bài 3.

## 8. Chia milestone

Cắt dự án thành các mốc *chạy được* (mỗi mốc deploy/demo được), không cắt theo tầng kỹ thuật (đừng làm "xong hết BE rồi mới làm FE" — bạn sẽ không biết nó có ghép được không cho tới phút chót).

| Milestone | Nội dung | Bài | Tiêu chí "xong" |
|---|---|---|---|
| **M0 — Setup** | Repo, schema/migration, kiến trúc, contract chốt | Bài 1 (nay) | `prisma migrate` chạy được, repo có CI skeleton |
| **M1 — Auth dọc** | register/login + 1 endpoint bảo vệ + 1 màn login FE gọi thật | Bài 2 | Đăng nhập trên FE → gọi `GET /me` thành công |
| **M2 — Core CRUD** | Project + Task CRUD, FE list/tạo/sửa | Bài 2 | Tạo task trên UI, reload vẫn còn (lưu DB) |
| **M3 — Chia sẻ** | Members + phân quyền owner/member | Bài 2 | Demo 2 tài khoản cùng 1 project |
| **M4 — Deploy** | Dockerize, CI/CD, Vercel + AWS, env/secrets | Bài 3 | App chạy trên URL công khai |
| **M5 — Polish** | README, monitoring, sửa bug, nice-to-have | Bài 3 | Demo mượt, README đầy đủ |

> 💡 Ghi nhớ: làm **"vertical slice"** trước (M1 = một lát cắt mỏng xuyên cả FE → BE → DB cho đúng tính năng auth) thay vì "horizontal" (xong toàn bộ một tầng rồi mới sang tầng khác). Vertical slice phát hiện sớm các vấn đề tích hợp (CORS, shape của JSON, auth flow) — những thứ thường giết tiến độ ở cuối nếu để dồn.

## 9. Setup repo: monorepo vs hai repo

Quyết định cấu trúc repo trước khi `git init`.

| Tiêu chí | Monorepo (1 repo: `apps/web` + `apps/api`) | Hai repo riêng |
|---|---|---|
| Chia sẻ type giữa FE/BE | Dễ (import type chung từ `packages/shared`) | Khó (phải publish package hoặc copy) |
| PR thay đổi cả FE+BE | Một PR atomic | Hai PR phải đồng bộ |
| CI/CD | Một pipeline, cần filter theo path | Hai pipeline độc lập, đơn giản hơn |
| Deploy khác nền tảng (Vercel/AWS) | Cần cấu hình root directory | Tự nhiên |
| Phù hợp khi | Solo / team nhỏ, muốn share type | Team lớn, ownership tách bạch |

**Khuyến nghị cho capstone: monorepo.** Lý do quyết định: bạn sẽ muốn **chia sẻ TypeScript type** của API contract (vd: `type Task`, `type CreateTaskInput`) giữa FE và BE — đây là siêu năng lực của full-stack TS, một bug đổi field sẽ sáng đèn đỏ ở compile-time *cả hai bên*.

Cấu trúc đề xuất:

```
taskshare/
├─ apps/
│  ├─ web/                 # React + TS + Vite (deploy Vercel)
│  │  ├─ src/
│  │  └─ package.json
│  └─ api/                 # Node + Express + TS (deploy AWS)
│     ├─ src/
│     ├─ prisma/schema.prisma
│     └─ package.json
├─ packages/
│  └─ shared/              # type dùng chung (Task, Project, API DTO)
│     └─ src/types.ts
├─ .github/workflows/ci.yml
├─ docker-compose.yml      # postgres local + api (dùng ở bài 2/3)
├─ package.json            # workspaces root
└─ README.md
```

```bash
# Khởi tạo nhanh
mkdir taskshare && git -C taskshare init
# root package.json bật workspaces (npm/pnpm):
#   "workspaces": ["apps/*", "packages/*"]
```

> ⚠️ Bẫy: monorepo deploy lên Vercel/AWS cần chỉ đúng **root directory** cho mỗi app (Vercel: set Root Directory = `apps/web`). Quên bước này → build fail vì tool không tìm thấy `package.json` đúng chỗ. Ghi sẵn điều này vào README để bài 3 không phải dò lại.

> 💡 Ghi nhớ: nếu thấy monorepo + workspaces làm bạn rối ngay từ đầu, **hai repo riêng cũng hoàn toàn ổn** cho capstone — đừng để công cụ chặn bạn bắt đầu. Quyết định này có thể đảo ngược tương đối rẻ; data model thì không. Ưu tiên năng lượng cho cái khó đảo ngược.

## 10. Checklist trước khi sang bài 2

Kết thúc bài này, bạn phải có **tài liệu kế hoạch** (chưa cần nhiều code chạy), đủ để bắt đầu build mà không phải quay lại quyết định kiến trúc:

- [ ] Đề bài & "Definition of Done" của MVP viết thành 1–2 câu rõ ràng
- [ ] Functional requirements (FR1–FR6) + non-functional có **con số đo được**
- [ ] Sơ đồ kiến trúc FE–BE–DB–deploy (vẽ tay/ASCII đều được)
- [ ] Tech stack chốt **kèm lý do** cho từng lựa chọn
- [ ] ERD + schema Prisma (file `schema.prisma` đã viết)
- [ ] API contract: bảng endpoint + quy ước status code & error format
- [ ] Phân định MVP vs nice-to-have
- [ ] Milestone M0–M5 với tiêu chí "xong"
- [ ] Quyết định repo (monorepo / 2 repo) + cấu trúc thư mục khởi tạo
- [ ] `git init` xong, README có sẵn mục Architecture, API Contract, Roadmap

> 💡 Ghi nhớ cốt lõi của bài: **một giờ lên kế hoạch tiết kiệm mười giờ code lại.** Tài liệu bạn vừa tạo không phải để nộp cho ai — nó là *la bàn* để khi đang lạc giữa lúc debug CORS lúc nửa đêm ở bài 2, bạn vẫn biết mình đang đi đâu và vì sao đã quyết định như vậy. Sang **bài 2**, ta biến những quyết định này thành code chạy thật: Backend trước (API + DB + auth), rồi Frontend gọi API, nối thành một lát cắt dọc end-to-end.
