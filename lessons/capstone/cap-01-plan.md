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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 470" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kiến trúc 3-tier TaskShare: Browser → Frontend → Backend → Database, kèm CI/CD và trust boundary</title>
  <desc>Browser gọi Frontend (Vercel/CDN) qua HTTPS; Frontend gọi Backend (AWS, có JWT auth middleware) bằng fetch JSON kèm Bearer token; Backend nối Database RDS Postgres trong private subnet bằng SQL. Một đường nét đứt là trust boundary giữa browser và backend: mọi thứ từ browser đều không đáng tin. Nhánh CI/CD từ GitHub qua GitHub Actions deploy FE lên Vercel và BE lên AWS.</desc>
  <defs>
    <marker id="archArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>

  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Kiến trúc 3-tier TaskShare + CI/CD</text>

  <rect x="252" y="38" width="216" height="48" rx="9" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="60" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Người dùng (Browser)</text>
  <text x="360" y="77" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">SPA chạy trong trình duyệt</text>

  <line x1="360" y1="86" x2="360" y2="118" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#archArr)"/>
  <text x="370" y="106" font-size="10.5" fill="currentColor" opacity="0.7">HTTPS</text>

  <rect x="234" y="120" width="252" height="56" rx="9" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="142" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">FRONTEND — React + TS (SPA)</text>
  <text x="360" y="160" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.68">Host: Vercel (CDN + build, preview/PR)</text>

  <line x1="360" y1="176" x2="360" y2="240" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#archArr)"/>
  <text x="370" y="200" font-size="10.5" fill="currentColor" opacity="0.7">fetch() JSON / HTTPS</text>
  <text x="370" y="216" font-size="10.5" fill="currentColor" opacity="0.7">Authorization: Bearer JWT</text>

  <g stroke="#f59e0b" stroke-opacity="0.85" stroke-dasharray="6 4" fill="none">
    <line x1="40" y1="208" x2="680" y2="208"/>
  </g>
  <rect x="40" y="196" width="190" height="22" rx="11" fill="#f59e0b" fill-opacity="0.9"/>
  <text x="135" y="211" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">TRUST BOUNDARY</text>
  <text x="248" y="232" font-size="10" fill="#f59e0b" opacity="0.95">mọi thứ từ browser đều không đáng tin → validate ở BE</text>

  <rect x="216" y="242" width="288" height="74" rx="9" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="263" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">BACKEND — Node/Express + TS</text>
  <text x="360" y="281" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">JWT auth middleware · REST · validate</text>
  <text x="360" y="298" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">Host: AWS (App Runner / ECS Fargate / EC2)</text>

  <line x1="360" y1="316" x2="360" y2="348" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#archArr)"/>
  <text x="370" y="336" font-size="10.5" fill="currentColor" opacity="0.7">SQL (TCP, trong VPC)</text>

  <rect x="234" y="350" width="252" height="56" rx="9" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="372" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">DATABASE — PostgreSQL</text>
  <text x="360" y="390" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.68">Host: AWS RDS (private subnet)</text>

  <g>
    <rect x="528" y="120" width="176" height="196" rx="9" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="5 4"/>
    <text x="616" y="140" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">CI/CD</text>
    <rect x="544" y="150" width="144" height="30" rx="7" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="616" y="169" font-size="10.5" text-anchor="middle" fill="currentColor">GitHub (push)</text>
    <line x1="616" y1="180" x2="616" y2="196" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#archArr)"/>
    <rect x="544" y="198" width="144" height="30" rx="7" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="616" y="217" font-size="10.5" text-anchor="middle" fill="currentColor">Actions: build/test</text>
    <line x1="616" y1="228" x2="616" y2="244" stroke="currentColor" stroke-opacity="0.5" marker-end="url(#archArr)"/>
    <rect x="544" y="246" width="144" height="28" rx="7" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="616" y="264" font-size="10" text-anchor="middle" fill="currentColor">deploy FE → Vercel</text>
    <rect x="544" y="280" width="144" height="28" rx="7" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="616" y="298" font-size="10" text-anchor="middle" fill="currentColor">deploy BE → AWS</text>
  </g>
  <line x1="544" y1="262" x2="486" y2="150" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3" marker-end="url(#archArr)"/>
  <line x1="544" y1="294" x2="504" y2="290" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3" marker-end="url(#archArr)"/>

  <text x="16" y="440" font-size="10.5" fill="currentColor" opacity="0.6">FE và BE khác origin → cần cấu hình CORS; DB không có public access, chỉ BE trong VPC truy cập.</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 430" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>ERD TaskShare: users, project_members (bảng nối), projects, tasks với quan hệ many-to-many và one-to-many</title>
  <desc>Bốn thực thể. users và projects nối many-to-many qua bảng nối project_members có composite primary key (project_id, user_id) và cột role. projects.owner_id là khoá ngoại tới users (one-to-many: một user sở hữu nhiều project). tasks.project_id là khoá ngoại tới projects (một project có nhiều task).</desc>
  <defs>
    <marker id="erdArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
  </defs>

  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">ERD TaskShare — many-to-many qua bảng nối, one-to-many owner</text>

  <g>
    <rect x="24" y="120" width="160" height="118" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="24" y="120" width="160" height="24" rx="8" fill="#3b82f6" fill-opacity="0.85"/>
    <text x="104" y="137" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">users</text>
    <text x="36" y="164" font-size="11" font-weight="700" fill="currentColor">id  PK</text>
    <text x="36" y="183" font-size="11" fill="currentColor" opacity="0.8">email  UQ</text>
    <text x="36" y="202" font-size="11" fill="currentColor" opacity="0.8">password_hash</text>
    <text x="36" y="221" font-size="11" fill="currentColor" opacity="0.8">created_at</text>
  </g>

  <g>
    <rect x="280" y="104" width="176" height="150" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="280" y="104" width="176" height="24" rx="8" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="368" y="121" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">project_members</text>
    <text x="292" y="148" font-size="11" font-weight="700" fill="currentColor">project_id  FK,PK</text>
    <text x="292" y="167" font-size="11" font-weight="700" fill="currentColor">user_id  FK,PK</text>
    <text x="292" y="186" font-size="11" fill="currentColor" opacity="0.85">role (owner|member)</text>
    <text x="292" y="205" font-size="11" fill="currentColor" opacity="0.8">created_at</text>
    <text x="292" y="234" font-size="9.5" fill="#f59e0b" opacity="0.95" font-weight="700">composite PK:</text>
    <text x="292" y="247" font-size="9.5" fill="#f59e0b" opacity="0.95">(project_id, user_id)</text>
  </g>

  <g>
    <rect x="544" y="120" width="160" height="118" rx="8" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="544" y="120" width="160" height="24" rx="8" fill="#10b981" fill-opacity="0.9"/>
    <text x="624" y="137" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">projects</text>
    <text x="556" y="164" font-size="11" font-weight="700" fill="currentColor">id  PK</text>
    <text x="556" y="183" font-size="11" fill="currentColor" opacity="0.8">name</text>
    <text x="556" y="202" font-size="11" font-weight="700" fill="currentColor">owner_id  FK</text>
    <text x="556" y="221" font-size="11" fill="currentColor" opacity="0.8">created_at</text>
  </g>

  <g>
    <rect x="544" y="290" width="160" height="124" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <rect x="544" y="290" width="160" height="24" rx="8" fill="#8b5cf6" fill-opacity="0.9"/>
    <text x="624" y="307" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">tasks</text>
    <text x="556" y="333" font-size="11" font-weight="700" fill="currentColor">id  PK</text>
    <text x="556" y="350" font-size="11" font-weight="700" fill="currentColor">project_id  FK</text>
    <text x="556" y="367" font-size="11" fill="currentColor" opacity="0.8">title · description</text>
    <text x="556" y="384" font-size="11" fill="currentColor" opacity="0.8">status · due_date</text>
    <text x="556" y="401" font-size="11" fill="currentColor" opacity="0.8">created_by · created_at</text>
  </g>

  <line x1="280" y1="158" x2="186" y2="172" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#erdArr)"/>
  <line x1="456" y1="148" x2="542" y2="160" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#erdArr)"/>
  <text x="200" y="285" font-size="11" font-weight="700" fill="#f59e0b" opacity="0.95">M : N (users ↔ projects qua bảng nối)</text>

  <path d="M624 238 v52" fill="none" stroke="currentColor" stroke-opacity="0.55" marker-end="url(#erdArr)"/>
  <text x="634" y="268" font-size="10.5" fill="currentColor" opacity="0.8">1 : N</text>
  <text x="634" y="283" font-size="9.5" fill="currentColor" opacity="0.65">project có N task</text>

  <path d="M544 200 q-30 30 -10 90" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="4 3" marker-end="url(#erdArr)"/>
  <text x="470" y="60" font-size="10.5" fill="currentColor" opacity="0.75">projects.owner_id → users.id</text>
  <path d="M520 64 q-160 -10 -380 50" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="4 3" marker-end="url(#erdArr)"/>
  <text x="470" y="46" font-size="10" fill="currentColor" opacity="0.6">one-to-many: 1 user sở hữu N project</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Roadmap milestone M0–M5 dạng timeline; M1 là vertical slice mỏng xuyên FE-BE-DB cho auth</title>
  <desc>Timeline ngang sáu mốc M0 đến M5. M1 được làm nổi bật là lát cắt dọc (vertical slice) mỏng xuyên cả ba tầng Frontend, Backend, Database chỉ cho tính năng auth, thay vì làm xong từng tầng theo chiều ngang. Phía dưới so sánh cách vertical với cách horizontal.</desc>

  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">Roadmap M0 → M5 — và vì sao M1 là lát cắt DỌC</text>

  <line x1="40" y1="60" x2="700" y2="60" stroke="currentColor" stroke-opacity="0.4"/>
  <defs>
    <marker id="msArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.5"/></marker>
  </defs>
  <line x1="40" y1="60" x2="700" y2="60" stroke="currentColor" stroke-opacity="0.4" marker-end="url(#msArr)"/>

  <g font-size="10.5" text-anchor="middle">
    <circle cx="70" cy="60" r="6" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="70" y="44" font-weight="700" fill="currentColor">M0</text>
    <text x="70" y="80" fill="currentColor" opacity="0.7">Setup</text>

    <circle cx="190" cy="60" r="9" fill="#f59e0b" fill-opacity="0.95"/>
    <text x="190" y="42" font-weight="700" fill="#f59e0b">M1</text>
    <text x="190" y="80" fill="#f59e0b" opacity="0.95" font-weight="700">Auth (dọc)</text>

    <circle cx="320" cy="60" r="6" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="320" y="44" font-weight="700" fill="currentColor">M2</text>
    <text x="320" y="80" fill="currentColor" opacity="0.7">Core CRUD</text>

    <circle cx="440" cy="60" r="6" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="440" y="44" font-weight="700" fill="currentColor">M3</text>
    <text x="440" y="80" fill="currentColor" opacity="0.7">Chia sẻ</text>

    <circle cx="560" cy="60" r="6" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="560" y="44" font-weight="700" fill="currentColor">M4</text>
    <text x="560" y="80" fill="currentColor" opacity="0.7">Deploy</text>

    <circle cx="670" cy="60" r="6" fill="#3b82f6" fill-opacity="0.9"/>
    <text x="670" y="44" font-weight="700" fill="currentColor">M5</text>
    <text x="670" y="80" fill="currentColor" opacity="0.7">Polish</text>
  </g>

  <g>
    <rect x="24" y="120" width="320" height="210" rx="10" fill="#10b981" fill-opacity="0.10" stroke="#10b981" stroke-opacity="0.5"/>
    <text x="184" y="142" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">VERTICAL SLICE (M1) — nên làm</text>
    <text x="184" y="159" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">lát mỏng xuyên cả 3 tầng cho 1 tính năng (auth)</text>

    <rect x="48" y="172" width="272" height="34" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="60" y="193" font-size="10.5" fill="currentColor">FE: màn login gọi API thật</text>
    <rect x="48" y="212" width="272" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="60" y="233" font-size="10.5" fill="currentColor">BE: register/login + 1 route bảo vệ</text>
    <rect x="48" y="252" width="272" height="34" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="60" y="273" font-size="10.5" fill="currentColor">DB: bảng users + migration</text>

    <rect x="150" y="166" width="22" height="126" rx="5" fill="#10b981" fill-opacity="0.22" stroke="#10b981" stroke-opacity="0.6"/>
    <text x="184" y="312" font-size="10" text-anchor="middle" fill="#10b981" opacity="0.95" font-weight="700">cắt dọc 1 lần → end-to-end chạy</text>
  </g>

  <g>
    <rect x="372" y="120" width="324" height="210" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-opacity="0.45"/>
    <text x="534" y="142" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">HORIZONTAL — tránh</text>
    <text x="534" y="159" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">xong hết 1 tầng rồi mới sang tầng khác</text>

    <rect x="396" y="172" width="276" height="34" rx="6" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="408" y="193" font-size="10.5" fill="currentColor">① xong TOÀN BỘ DB</text>
    <rect x="396" y="212" width="276" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="408" y="233" font-size="10.5" fill="currentColor">② xong TOÀN BỘ BE</text>
    <rect x="396" y="252" width="276" height="34" rx="6" fill="#3b82f6" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="408" y="273" font-size="10.5" fill="currentColor">③ mới ghép FE — tích hợp dồn cuối</text>
    <text x="534" y="312" font-size="10" text-anchor="middle" fill="#f59e0b" opacity="0.95" font-weight="700">CORS / shape JSON / auth flow vỡ ở phút chót</text>
  </g>
</svg>

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
