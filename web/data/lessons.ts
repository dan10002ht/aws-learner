import type { Lesson, Chapter, CourseId } from "@/lib/types";

// =====================================================================
// STARTER TIER — Tech 101, Lập trình nhập môn, Git & GitHub
// =====================================================================
const techLessons: Lesson[] = [
  { slug: "pc-01-how-computers-work", courseId: "TECH-101", title: "Máy tính hoạt động thế nào", shortTitle: "Máy tính 101", chapter: "tech-ch1", order: 1, available: true,
    description: "CPU, RAM vs ổ cứng, hệ điều hành, chương trình & tiến trình, bit/byte.", file: "starter/pc-01-how-computers-work.md" },
  { slug: "pc-02-how-internet-works", courseId: "TECH-101", title: "Internet hoạt động thế nào", shortTitle: "Internet 101", chapter: "tech-ch1", order: 2, available: true,
    description: "Gõ URL thì chuyện gì xảy ra, IP & DNS, client/server, HTTP, HTTPS.", file: "starter/pc-02-how-internet-works.md" },
  { slug: "pc-03-software-types", courseId: "TECH-101", title: "Phần mềm: từ app điện thoại đến server", shortTitle: "Phần mềm 101", chapter: "tech-ch1", order: 3, available: true,
    description: "Frontend vs backend, database, API là gì, cloud ở mức người thường.", file: "starter/pc-03-software-types.md" },
  { slug: "pc-04-roles-in-tech", courseId: "TECH-101", title: "Ngành tech có những nghề gì", shortTitle: "Nghề trong tech", chapter: "tech-ch1", order: 4, available: true,
    description: "Dev/DevOps/Data/QA/PM làm gì hằng ngày, lộ trình này hợp nghề nào.", file: "starter/pc-04-roles-in-tech.md" },
  { slug: "pc-05-setup-tools", courseId: "TECH-101", title: "Chuẩn bị đồ nghề: cài môi trường học", shortTitle: "Cài đồ nghề", chapter: "tech-ch1", order: 5, available: true,
    description: "VS Code, terminal đầu tiên, cài Python & Git, chạy chương trình đầu đời.", file: "starter/pc-05-setup-tools.md" },
];
const techChapters: Chapter[] = [
  { id: "tech-ch1", courseId: "TECH-101", title: "Hiểu thế giới số", lessonSlugs: ["pc-01-how-computers-work", "pc-02-how-internet-works", "pc-03-software-types", "pc-04-roles-in-tech", "pc-05-setup-tools"], category: "foundation" },
];

const progLessons: Lesson[] = [
  { slug: "prog-01-first-program", courseId: "PROGRAMMING", title: "Chương trình đầu tiên: biến & kiểu dữ liệu", shortTitle: "Biến & kiểu", chapter: "prog-ch1", order: 1, available: true,
    description: "In ra màn hình, biến, số/chuỗi/boolean, nhập liệu, đọc lỗi syntax.", file: "starter/prog-01-first-program.md" },
  { slug: "prog-02-control-flow", courseId: "PROGRAMMING", title: "Rẽ nhánh & vòng lặp", shortTitle: "If & vòng lặp", chapter: "prog-ch1", order: 2, available: true,
    description: "if/else, and/or/not, for & while, break/continue, FizzBuzz.", file: "starter/prog-02-control-flow.md" },
  { slug: "prog-03-functions", courseId: "PROGRAMMING", title: "Hàm: đóng gói logic", shortTitle: "Hàm", chapter: "prog-ch1", order: 3, available: true,
    description: "Tham số, giá trị trả về, scope, DRY, refactor thành hàm.", file: "starter/prog-03-functions.md" },
  { slug: "prog-04-collections", courseId: "PROGRAMMING", title: "Mảng, danh sách & từ điển", shortTitle: "Collections", chapter: "prog-ch2", order: 4, available: true,
    description: "List/array, index từ 0, dictionary/map, set, đếm tần suất.", file: "starter/prog-04-collections.md" },
  { slug: "prog-05-strings-errors", courseId: "PROGRAMMING", title: "Chuỗi & xử lý lỗi", shortTitle: "Chuỗi & lỗi", chapter: "prog-ch2", order: 5, available: true,
    description: "Thao tác chuỗi, đọc/ghi file, try/catch, validate input.", file: "starter/prog-05-strings-errors.md" },
  { slug: "prog-06-oop-basics", courseId: "PROGRAMMING", title: "Hướng đối tượng cơ bản", shortTitle: "OOP", chapter: "prog-ch2", order: 6, available: true,
    description: "Class & object, thuộc tính/phương thức, constructor, kế thừa giới thiệu.", file: "starter/prog-06-oop-basics.md" },
  { slug: "prog-07-debugging", courseId: "PROGRAMMING", title: "Debug & đọc code người khác", shortTitle: "Debug", chapter: "prog-ch3", order: 7, available: true,
    description: "Tư duy debug, stack trace, debugger VS Code, dùng AI để học đúng cách.", file: "starter/prog-07-debugging.md" },
  { slug: "prog-08-mini-project", courseId: "PROGRAMMING", title: "Mini project: quản lý chi tiêu CLI", shortTitle: "Mini project", chapter: "prog-ch3", order: 8, available: true,
    description: "Ghép tất cả thành ứng dụng hoàn chỉnh chạy terminal, theo milestone.", file: "starter/prog-08-mini-project.md" },
  { slug: "prog-09-modules-testing", courseId: "PROGRAMMING", title: "Module, package & viết test", shortTitle: "Module & Test", chapter: "prog-ch4", order: 9, available: true,
    description: "Tách code thành module, import/export, package manager (pip/npm), viết unit test & assertion, vì sao test.", file: "starter/prog-09-modules-testing.md" },
  { slug: "prog-10-files-data", courseId: "PROGRAMMING", title: "Làm việc với file & dữ liệu", shortTitle: "File & Data", chapter: "prog-ch4", order: 10, available: true,
    description: "Đọc/ghi file, JSON & CSV, datetime, biến môi trường, tham số dòng lệnh (CLI args), xử lý dữ liệu thực tế.", file: "starter/prog-10-files-data.md" },
];
const progChapters: Chapter[] = [
  { id: "prog-ch1", courseId: "PROGRAMMING", title: "Tư duy lập trình", lessonSlugs: ["prog-01-first-program", "prog-02-control-flow", "prog-03-functions"], category: "foundation" },
  { id: "prog-ch2", courseId: "PROGRAMMING", title: "Dữ liệu & cấu trúc", lessonSlugs: ["prog-04-collections", "prog-05-strings-errors", "prog-06-oop-basics"], category: "database" },
  { id: "prog-ch3", courseId: "PROGRAMMING", title: "Kỹ năng thực chiến", lessonSlugs: ["prog-07-debugging", "prog-08-mini-project"], category: "compute" },
  { id: "prog-ch4", courseId: "PROGRAMMING", title: "Trung cấp", lessonSlugs: ["prog-09-modules-testing", "prog-10-files-data"], category: "security" },
];

const gitLessons: Lesson[] = [
  { slug: "git-01-why-version-control", courseId: "GIT", title: "Vì sao cần Git: quản lý phiên bản", shortTitle: "Git là gì", chapter: "git-ch1", order: 1, available: true,
    description: "Snapshot & lịch sử, repo, init/status/add/commit, .gitignore.", file: "starter/git-01-why-version-control.md" },
  { slug: "git-02-branches", courseId: "GIT", title: "Branch: làm việc song song", shortTitle: "Branch & merge", chapter: "git-ch1", order: 2, available: true,
    description: "Tạo/chuyển branch, merge, giải conflict từng bước không hoảng.", file: "starter/git-02-branches.md" },
  { slug: "git-03-github-remote", courseId: "GIT", title: "GitHub & remote: đưa code lên mây", shortTitle: "GitHub", chapter: "git-ch1", order: 3, available: true,
    description: "Clone/push/pull, SSH key, README, fork, portfolio xin việc.", file: "starter/git-03-github-remote.md" },
  { slug: "git-04-team-workflow", courseId: "GIT", title: "Làm việc nhóm: Pull Request & code review", shortTitle: "PR & review", chapter: "git-ch2", order: 4, available: true,
    description: "Branch → PR → review → merge, viết PR tốt, commit message tốt.", file: "starter/git-04-team-workflow.md" },
  { slug: "git-05-undo-rescue", courseId: "GIT", title: "Cứu hộ: hoàn tác & sửa sai", shortTitle: "Cứu hộ Git", chapter: "git-ch2", order: 5, available: true,
    description: "restore, amend, revert vs reset, stash, reflog — thoát mọi tình huống 'chết rồi'.", file: "starter/git-05-undo-rescue.md" },
  { slug: "git-06-rebase-merge", courseId: "GIT", title: "Merge vs Rebase & lịch sử sạch", shortTitle: "Rebase", chapter: "git-ch3", order: 6, available: true,
    description: "Fast-forward, merge vs rebase, interactive rebase (squash/reword/fixup), khi nào dùng cái nào, golden rule.", file: "starter/git-06-rebase-merge.md" },
  { slug: "git-07-advanced-rescue", courseId: "GIT", title: "Cứu hộ nâng cao: reflog, bisect, cherry-pick", shortTitle: "Cứu hộ Pro", chapter: "git-ch3", order: 7, available: true,
    description: "reflog tìm lại commit mất, git bisect truy bug, cherry-pick, stash, amend, restore/revert đúng cách.", file: "starter/git-07-advanced-rescue.md" },
  { slug: "git-08-branching-conflict", courseId: "GIT", title: "Branching strategy & xử lý conflict", shortTitle: "Strategy & Conflict", chapter: "git-ch3", order: 8, available: true,
    description: "Trunk-based vs GitFlow vs GitHub Flow, giải merge conflict phức tạp, rerere, commit convention, PR sạch.", file: "starter/git-08-branching-conflict.md" },
  { slug: "git-09-internals-pro", courseId: "GIT", title: "Git internals & công cụ pro", shortTitle: "Internals", chapter: "git-ch3", order: 9, available: true,
    description: "Object model (blob/tree/commit), refs/HEAD/detached, hooks, tag & release, submodule vs monorepo, LFS, GPG sign.", file: "starter/git-09-internals-pro.md" },
];
const gitChapters: Chapter[] = [
  { id: "git-ch1", courseId: "GIT", title: "Làm chủ Git một mình", lessonSlugs: ["git-01-why-version-control", "git-02-branches", "git-03-github-remote"], category: "foundation" },
  { id: "git-ch2", courseId: "GIT", title: "Git trong đội nhóm", lessonSlugs: ["git-04-team-workflow", "git-05-undo-rescue"], category: "security" },
  { id: "git-ch3", courseId: "GIT", title: "Git nâng cao", lessonSlugs: ["git-06-rebase-merge", "git-07-advanced-rescue", "git-08-branching-conflict", "git-09-internals-pro"], category: "compute" },
];


// =====================================================================
// WEB — Web Fundamentals (knowledge, starter)
// =====================================================================
const webLessons: Lesson[] = [
  { slug: "web-01-how-web-works", courseId: "WEB", title: "Web hoạt động thế nào", shortTitle: "Web 101", chapter: "web-ch1", order: 1, available: true,
    description: "Client/server, request/response, trình duyệt render, status code, frontend vs backend.", file: "web/web-01-how-web-works.md" },
  { slug: "web-02-html", courseId: "WEB", title: "HTML: bộ khung trang web", shortTitle: "HTML", chapter: "web-ch1", order: 2, available: true,
    description: "Thẻ, cấu trúc tài liệu, semantic HTML, form, link, ảnh, accessibility cơ bản.", file: "web/web-02-html.md" },
  { slug: "web-03-css", courseId: "WEB", title: "CSS: tạo kiểu & bố cục", shortTitle: "CSS", chapter: "web-ch1", order: 3, available: true,
    description: "Selector, box model, flexbox/grid, responsive, biến CSS, cách tổ chức style.", file: "web/web-03-css.md" },
  { slug: "web-04-javascript-dom", courseId: "WEB", title: "JavaScript & DOM: làm trang động", shortTitle: "JS & DOM", chapter: "web-ch2", order: 4, available: true,
    description: "JS trên trình duyệt, chọn & sửa DOM, event, sự kiện click/submit, async cơ bản.", file: "web/web-04-javascript-dom.md" },
  { slug: "web-05-apis-fetch", courseId: "WEB", title: "Gọi API: fetch, JSON & async", shortTitle: "API & fetch", chapter: "web-ch2", order: 5, available: true,
    description: "API là gì (góc người dùng), JSON, fetch/async-await, xử lý lỗi, CORS cơ bản.", file: "web/web-05-apis-fetch.md" },
  { slug: "web-06-modern-js", courseId: "WEB", title: "JavaScript hiện đại (ES6+) & tooling", shortTitle: "Modern JS", chapter: "web-ch3", order: 6, available: true,
    description: "let/const, arrow function, destructuring, spread, template literal, module ES6, npm, async/await sâu hơn.", file: "web/web-06-modern-js.md" },
  { slug: "web-07-components-spa", courseId: "WEB", title: "Tư duy component & SPA", shortTitle: "Components & SPA", chapter: "web-ch3", order: 7, available: true,
    description: "Component & tái sử dụng UI, state, vì sao SPA, virtual DOM ý tưởng, khi nào cần framework (React/Vue).", file: "web/web-07-components-spa.md" },
];
const webChapters: Chapter[] = [
  { id: "web-ch1", courseId: "WEB", title: "Trang web tĩnh", lessonSlugs: ["web-01-how-web-works", "web-02-html", "web-03-css"], category: "foundation" },
  { id: "web-ch2", courseId: "WEB", title: "Trang web động & API", lessonSlugs: ["web-04-javascript-dom", "web-05-apis-fetch"], category: "compute" },
  { id: "web-ch3", courseId: "WEB", title: "Web hiện đại", lessonSlugs: ["web-06-modern-js", "web-07-components-spa"], category: "security" },
];

// =====================================================================
// SQL — SQL & Databases hands-on (knowledge, starter)
// =====================================================================
const sqlLessons: Lesson[] = [
  { slug: "sql-01-select-basics", courseId: "SQL", title: "SELECT cơ bản: lấy dữ liệu", shortTitle: "SELECT", chapter: "sql-ch1", order: 1, available: true,
    description: "Bảng/cột/hàng, SELECT, WHERE, ORDER BY, LIMIT, toán tử, NULL, DISTINCT.", file: "sql/sql-01-select-basics.md" },
  { slug: "sql-02-joins", courseId: "SQL", title: "JOIN: kết nối nhiều bảng", shortTitle: "JOIN", chapter: "sql-ch1", order: 2, available: true,
    description: "Khoá chính/ngoại, INNER/LEFT/RIGHT/FULL JOIN, self join, bẫy fan-out.", file: "sql/sql-02-joins.md" },
  { slug: "sql-03-aggregation", courseId: "SQL", title: "Tổng hợp: GROUP BY & subquery", shortTitle: "GROUP BY", chapter: "sql-ch1", order: 3, available: true,
    description: "COUNT/SUM/AVG, GROUP BY, HAVING, subquery, CTE, window function giới thiệu.", file: "sql/sql-03-aggregation.md" },
  { slug: "sql-04-schema-design", courseId: "SQL", title: "Thiết kế schema & chuẩn hoá", shortTitle: "Schema design", chapter: "sql-ch2", order: 4, available: true,
    description: "Kiểu dữ liệu, khoá, quan hệ 1-n/n-n, normalization (1NF-3NF), khi nào denormalize.", file: "sql/sql-04-schema-design.md" },
  { slug: "sql-05-indexes-performance", courseId: "SQL", title: "Index & hiệu năng truy vấn", shortTitle: "Index & EXPLAIN", chapter: "sql-ch2", order: 5, available: true,
    description: "B-tree index, composite, EXPLAIN đọc query plan, N+1, khi nào index làm chậm.", file: "sql/sql-05-indexes-performance.md" },
  { slug: "sql-06-transactions", courseId: "SQL", title: "Transaction & SQL nâng cao", shortTitle: "Transactions", chapter: "sql-ch2", order: 6, available: true,
    description: "ACID, BEGIN/COMMIT/ROLLBACK, isolation levels, UPSERT, view, SQL vs NoSQL.", file: "sql/sql-06-transactions.md" },
];
const sqlChapters: Chapter[] = [
  { id: "sql-ch1", courseId: "SQL", title: "Truy vấn dữ liệu", lessonSlugs: ["sql-01-select-basics", "sql-02-joins", "sql-03-aggregation"], category: "database" },
  { id: "sql-ch2", courseId: "SQL", title: "Thiết kế & vận hành", lessonSlugs: ["sql-04-schema-design", "sql-05-indexes-performance", "sql-06-transactions"], category: "storage" },
];

// =====================================================================
// SYSTEM-DESIGN — lessons (knowledge, architecture)
// =====================================================================
const sysdLessons: Lesson[] = [
  { slug: "sd-01-requirements", courseId: "SYSTEM-DESIGN", title: "Tiếp cận bài toán & ước lượng quy mô", shortTitle: "Requirements & Estimation", chapter: "sysd-ch1", order: 1, available: true,
    description: "Functional vs non-functional, làm rõ yêu cầu, back-of-envelope estimation (QPS, storage, bandwidth).", file: "system-design/sd-01-requirements.md" },
  { slug: "sd-02-building-blocks", courseId: "SYSTEM-DESIGN", title: "Các khối xây dựng & trade-off", shortTitle: "Building Blocks", chapter: "sysd-ch1", order: 2, available: true,
    description: "Load balancer, cache, queue, CDN, replication, sharding, CAP — ghép thành kiến trúc, mỗi lựa chọn đánh đổi gì.", file: "system-design/sd-02-building-blocks.md" },
  { slug: "sd-03-url-shortener", courseId: "SYSTEM-DESIGN", title: "Case study: URL Shortener & Rate Limiter", shortTitle: "URL Shortener", chapter: "sysd-ch2", order: 3, available: true,
    description: "Thiết kế từ A-Z: API, sinh mã, lưu trữ, cache, scale đọc, rate limiting algorithms.", file: "system-design/sd-03-url-shortener.md" },
  { slug: "sd-04-news-feed", courseId: "SYSTEM-DESIGN", title: "Case study: News Feed / Timeline", shortTitle: "News Feed", chapter: "sysd-ch2", order: 4, available: true,
    description: "Fan-out on write vs read, hot user, ranking, cache, pagination — đánh đổi của mỗi cách.", file: "system-design/sd-04-news-feed.md" },
  { slug: "sd-05-chat", courseId: "SYSTEM-DESIGN", title: "Case study: Chat / Messaging realtime", shortTitle: "Chat System", chapter: "sysd-ch2", order: 5, available: true,
    description: "WebSocket, presence, delivery & ordering, lưu lịch sử, group chat, scale connection.", file: "system-design/sd-05-chat.md" },
  { slug: "sd-06-data-pipeline", courseId: "SYSTEM-DESIGN", title: "Hệ thống data-intensive: search & analytics", shortTitle: "Data-Intensive", chapter: "sysd-ch3", order: 6, available: true,
    description: "Batch vs stream, search index, data lake/warehouse, lambda/kappa, eventual consistency.", file: "system-design/sd-06-data-pipeline.md" },
  { slug: "sd-07-multi-account-cost", courseId: "SYSTEM-DESIGN", title: "Kiến trúc multi-account & tối ưu chi phí", shortTitle: "Multi-account & Cost", chapter: "sysd-ch3", order: 7, available: true,
    description: "AWS Organizations, landing zone, blast radius, cost-aware design, FinOps, well-architected.", file: "system-design/sd-07-multi-account-cost.md" },
  { slug: "sd-08-tradeoff-strategy", courseId: "SYSTEM-DESIGN", title: "Build vs Buy & Technology Strategy", shortTitle: "Strategy", chapter: "sysd-ch4", order: 8, available: true,
    description: "Khung ra quyết định build vs buy, tech radar, nợ kỹ thuật, tư duy CTO về đánh đổi dài hạn.", file: "system-design/sd-08-tradeoff-strategy.md" },
];


const csLessons: Lesson[] = [
  { slug: "cs-01-data-representation", courseId: "CS", title: "Biểu diễn dữ liệu: binary, số & ký tự", shortTitle: "Data Representation", chapter: "cs-ch1", order: 1, available: true,
    description: "Hệ nhị phân & hex, byte/bit, two's complement (số âm), số thực (float, vì sao 0.1+0.2 != 0.3), overflow, ASCII & Unicode/UTF-8.", file: "cs/cs-01-data-representation.md" },
  { slug: "cs-02-architecture-memory", courseId: "CS", title: "Kiến trúc máy tính & Memory Hierarchy", shortTitle: "Architecture & Cache", chapter: "cs-ch1", order: 2, available: true,
    description: "CPU instruction cycle, register, RAM, cache L1/L2/L3 & locality, vì sao cache quyết định hiệu năng, bus, I/O, latency numbers.", file: "cs/cs-02-architecture-memory.md" },
  { slug: "cs-03-how-code-runs", courseId: "CS", title: "Cách code chạy: compile, stack/heap & GC", shortTitle: "How Code Runs", chapter: "cs-ch1", order: 3, available: true,
    description: "Compiled vs interpreted vs bytecode/JIT, stack vs heap, pointer vs reference, value vs reference, garbage collection, stack overflow & memory leak.", file: "cs/cs-03-how-code-runs.md" },
  { slug: "cs-04-operating-systems", courseId: "CS", title: "Hệ điều hành: process, thread & bộ nhớ", shortTitle: "Operating Systems", chapter: "cs-ch2", order: 4, available: true,
    description: "Kernel & syscall, process vs thread, scheduling & context switch, virtual memory & paging, file system, vì sao OS quan trọng với cloud.", file: "cs/cs-04-operating-systems.md" },
  { slug: "cs-05-concurrency", courseId: "CS", title: "Concurrency & Parallelism", shortTitle: "Concurrency", chapter: "cs-ch2", order: 5, available: true,
    description: "Concurrency vs parallelism, race condition, mutex/lock, deadlock, atomic, async vs thread vs process, memory model, các bug khó nhất ở production.", file: "cs/cs-05-concurrency.md" },
  { slug: "cs-06-math-for-engineers", courseId: "CS", title: "Toán cho kỹ sư (thực dụng)", shortTitle: "Math for Engineers", chapter: "cs-ch2", order: 6, available: true,
    description: "Logic & boolean, set, modulo & hashing, graph cơ bản, tổ hợp đếm, xác suất ứng dụng (collision, load balancing, p99), log & growth.", file: "cs/cs-06-math-for-engineers.md" },
];
const csChapters: Chapter[] = [
  { id: "cs-ch1", courseId: "CS", title: "Máy tính & bộ nhớ", lessonSlugs: ["cs-01-data-representation","cs-02-architecture-memory","cs-03-how-code-runs"], category: "compute" },
  { id: "cs-ch2", courseId: "CS", title: "Hệ điều hành, concurrency & toán", lessonSlugs: ["cs-04-operating-systems","cs-05-concurrency","cs-06-math-for-engineers"], category: "foundation" },
];

// ===== DSA / SECURITY / DEVOPS / SRE / AIML knowledge tracks =====
const dsaLessons: Lesson[] = [
  { slug: "dsa-01-complexity", courseId: "DSA", title: "Độ phức tạp Big-O", shortTitle: "Big-O", chapter: "dsa-ch1", order: 1, available: true,
    description: "Đo thời gian/bộ nhớ, O(1)/O(n)/O(log n)/O(n^2), amortized, cách ước lượng nhanh.", file: "dsa/dsa-01-complexity.md" },
  { slug: "dsa-02-arrays-strings", courseId: "DSA", title: "Array, String, Two-pointer & Sliding Window", shortTitle: "Array & String", chapter: "dsa-ch1", order: 2, available: true,
    description: "Thao tác mảng/chuỗi, two-pointer, sliding window, prefix sum.", file: "dsa/dsa-02-arrays-strings.md" },
  { slug: "dsa-03-hashing", courseId: "DSA", title: "Hash Map & Set", shortTitle: "Hash Map", chapter: "dsa-ch1", order: 3, available: true,
    description: "Bảng băm O(1), đếm tần suất, dedup, lookup, collision, bài toán mẫu.", file: "dsa/dsa-03-hashing.md" },
  { slug: "dsa-04-stack-queue", courseId: "DSA", title: "Stack, Queue & Monotonic", shortTitle: "Stack & Queue", chapter: "dsa-ch1", order: 4, available: true,
    description: "LIFO/FIFO, ứng dụng (ngoặc, undo), deque, monotonic stack/queue.", file: "dsa/dsa-04-stack-queue.md" },
  { slug: "dsa-05-linkedlist-tree", courseId: "DSA", title: "Linked List & Tree/BST", shortTitle: "List & Tree", chapter: "dsa-ch2", order: 5, available: true,
    description: "Linked list thao tác, cây nhị phân, BST, duyệt DFS/BFS, độ cao.", file: "dsa/dsa-05-linkedlist-tree.md" },
  { slug: "dsa-06-sorting-searching", courseId: "DSA", title: "Sorting & Binary Search", shortTitle: "Sort & Search", chapter: "dsa-ch2", order: 6, available: true,
    description: "O(n log n) sort, ổn định, binary search & các biến thể (lower/upper bound).", file: "dsa/dsa-06-sorting-searching.md" },
  { slug: "dsa-07-recursion-graph-dp", courseId: "DSA", title: "Recursion, Graph & DP cơ bản", shortTitle: "Recursion & DP", chapter: "dsa-ch2", order: 7, available: true,
    description: "Đệ quy & backtracking, graph BFS/DFS, dynamic programming nhập môn.", file: "dsa/dsa-07-recursion-graph-dp.md" },
  { slug: "dsa-08-heap-priority-queue", courseId: "DSA", title: "Heap & Priority Queue", shortTitle: "Heap & PQ", chapter: "dsa-ch3", order: 8, available: true,
    description: "Heap (min/max), priority queue; dạng Top-K, K frequent, merge K lists, median of stream; cách nhận diện & template.", file: "dsa/dsa-08-heap-priority-queue.md" },
  { slug: "dsa-09-backtracking", courseId: "DSA", title: "Backtracking", shortTitle: "Backtracking", chapter: "dsa-ch3", order: 9, available: true,
    description: "Template choose-explore-unchoose, pruning; dạng subset/permutation/combination, N-queens, word search, sudoku.", file: "dsa/dsa-09-backtracking.md" },
  { slug: "dsa-10-graph-advanced", courseId: "DSA", title: "Graph nâng cao: Topo, Union-Find, Dijkstra", shortTitle: "Graph Pro", chapter: "dsa-ch3", order: 10, available: true,
    description: "BFS/DFS recap, topological sort, Union-Find/DSU, Dijkstra shortest path; dạng connected components, cycle, scheduling, đường ngắn nhất.", file: "dsa/dsa-10-graph-advanced.md" },
  { slug: "dsa-11-dynamic-programming-1", courseId: "DSA", title: "Dynamic Programming I: tư duy & 1D", shortTitle: "DP I", chapter: "dsa-ch3", order: 11, available: true,
    description: "Cách nhận diện DP (state/transition/base), memoization vs tabulation, 1D DP (climbing stairs, house robber, coin change), knapsack 0/1.", file: "dsa/dsa-11-dynamic-programming-1.md" },
  { slug: "dsa-12-dynamic-programming-2", courseId: "DSA", title: "Dynamic Programming II: 2D & string", shortTitle: "DP II", chapter: "dsa-ch3", order: 12, available: true,
    description: "Grid/2D DP, string DP (LCS, edit distance), interval DP, bảng nhận diện pattern DP, tối ưu không gian.", file: "dsa/dsa-12-dynamic-programming-2.md" },
  { slug: "dsa-13-patterns-strategy", courseId: "DSA", title: "Khung giải bài & chiến lược phỏng vấn", shortTitle: "Patterns & Strategy", chapter: "dsa-ch3", order: 13, available: true,
    description: "Bảng thấy-gì-pattern-gì, quy trình clarify-bruteforce-optimize-code-test, độ phức tạp mục tiêu, lộ trình luyện tập.", file: "dsa/dsa-13-patterns-strategy.md" },
];
const dsaChapters: Chapter[] = [
  { id: "dsa-ch1", courseId: "DSA", title: "Nền tảng & cấu trúc tuyến tính", lessonSlugs: ["dsa-01-complexity","dsa-02-arrays-strings","dsa-03-hashing","dsa-04-stack-queue"], category: "foundation" },
  { id: "dsa-ch2", courseId: "DSA", title: "Cấu trúc phi tuyến & giải thuật", lessonSlugs: ["dsa-05-linkedlist-tree","dsa-06-sorting-searching","dsa-07-recursion-graph-dp"], category: "compute" },
  { id: "dsa-ch3", courseId: "DSA", title: "Giải thuật nâng cao (dạng bài & hướng làm)", lessonSlugs: ["dsa-08-heap-priority-queue","dsa-09-backtracking","dsa-10-graph-advanced","dsa-11-dynamic-programming-1","dsa-12-dynamic-programming-2","dsa-13-patterns-strategy"], category: "security" },
];
const secLessons: Lesson[] = [
  { slug: "sec-01-threat-modeling", courseId: "SECURITY", title: "Tư duy bảo mật & Threat Modeling", shortTitle: "Threat Modeling", chapter: "sec-ch1", order: 1, available: true,
    description: "Attack surface, STRIDE, trust boundary, defense in depth, least privilege.", file: "security/sec-01-threat-modeling.md" },
  { slug: "sec-02-owasp-top10-1", courseId: "SECURITY", title: "OWASP Top 10 (phần 1)", shortTitle: "OWASP #1", chapter: "sec-ch1", order: 2, available: true,
    description: "Broken access control, injection (SQLi/XSS), cryptographic failures, auth failures.", file: "security/sec-02-owasp-top10-1.md" },
  { slug: "sec-03-owasp-top10-2", courseId: "SECURITY", title: "OWASP Top 10 (phần 2)", shortTitle: "OWASP #2", chapter: "sec-ch1", order: 3, available: true,
    description: "SSRF, security misconfig, vulnerable components, insecure design, logging failures.", file: "security/sec-03-owasp-top10-2.md" },
  { slug: "sec-04-secure-coding", courseId: "SECURITY", title: "Secure Coding: input, output & data", shortTitle: "Secure Coding", chapter: "sec-ch2", order: 4, available: true,
    description: "Validate input, output encoding, parameterized query, xử lý lỗi an toàn, PII.", file: "security/sec-04-secure-coding.md" },
  { slug: "sec-05-authn-authz", courseId: "SECURITY", title: "Authentication & Authorization trong app", shortTitle: "AuthN/AuthZ", chapter: "sec-ch2", order: 5, available: true,
    description: "Session vs token, OAuth/OIDC/JWT đúng, RBAC/ABAC, password & MFA, passkeys.", file: "security/sec-05-authn-authz.md" },
  { slug: "sec-06-supply-chain", courseId: "SECURITY", title: "Supply Chain & Secrets Security", shortTitle: "Supply Chain", chapter: "sec-ch2", order: 6, available: true,
    description: "Dependency scanning, SBOM, secrets management, CI/CD security, signing artifacts.", file: "security/sec-06-supply-chain.md" },
  { slug: "sec-07-cloud-appsec-ops", courseId: "SECURITY", title: "Cloud AppSec & Incident Response", shortTitle: "AppSec Ops", chapter: "sec-ch2", order: 7, available: true,
    description: "WAF, SAST/DAST, security logging, detection, incident response & postmortem cơ bản.", file: "security/sec-07-cloud-appsec-ops.md" },
];
const secChapters: Chapter[] = [
  { id: "sec-ch1", courseId: "SECURITY", title: "Tư duy & lỗ hổng", lessonSlugs: ["sec-01-threat-modeling","sec-02-owasp-top10-1","sec-03-owasp-top10-2"], category: "security" },
  { id: "sec-ch2", courseId: "SECURITY", title: "Phòng thủ & vận hành", lessonSlugs: ["sec-04-secure-coding","sec-05-authn-authz","sec-06-supply-chain","sec-07-cloud-appsec-ops"], category: "foundation" },
];
const devopsLessons: Lesson[] = [
  { slug: "devops-01-cicd", courseId: "DEVOPS", title: "CI/CD: pipeline & mindset", shortTitle: "CI/CD", chapter: "devops-ch1", order: 1, available: true,
    description: "Build/test/deploy tự động, pipeline stages, artifact, môi trường, trunk-based.", file: "devops/devops-01-cicd.md" },
  { slug: "devops-02-terraform", courseId: "DEVOPS", title: "Terraform & Infrastructure as Code", shortTitle: "Terraform", chapter: "devops-ch1", order: 2, available: true,
    description: "HCL, provider/resource, state & remote backend, module, plan/apply, drift, workspace.", file: "devops/devops-02-terraform.md" },
  { slug: "devops-03-kubernetes-basics", courseId: "DEVOPS", title: "Kubernetes cơ bản", shortTitle: "K8s Basics", chapter: "devops-ch2", order: 3, available: true,
    description: "Pod/Deployment/Service/Namespace, kubectl, ReplicaSet, scheduling, kiến trúc cluster.", file: "devops/devops-03-kubernetes-basics.md" },
  { slug: "devops-04-kubernetes-ops", courseId: "DEVOPS", title: "Kubernetes vận hành", shortTitle: "K8s Ops", chapter: "devops-ch2", order: 4, available: true,
    description: "ConfigMap/Secret, Ingress, HPA autoscaling, probes, resource limits, rollout/rollback.", file: "devops/devops-04-kubernetes-ops.md" },
  { slug: "devops-05-gitops-deploy", courseId: "DEVOPS", title: "GitOps & Deployment Strategies", shortTitle: "GitOps", chapter: "devops-ch2", order: 5, available: true,
    description: "GitOps (ArgoCD/Flux), blue-green/canary/rolling, progressive delivery, feature flags.", file: "devops/devops-05-gitops-deploy.md" },
  { slug: "devops-06-container-security", courseId: "DEVOPS", title: "Container & Image Security", shortTitle: "Container Sec", chapter: "devops-ch1", order: 6, available: true,
    description: "Image scanning, minimal/distroless, non-root, registry, secrets trong container, SBOM.", file: "devops/devops-06-container-security.md" },
];
const devopsChapters: Chapter[] = [
  { id: "devops-ch1", courseId: "DEVOPS", title: "CI/CD & IaC", lessonSlugs: ["devops-01-cicd","devops-02-terraform","devops-06-container-security"], category: "foundation" },
  { id: "devops-ch2", courseId: "DEVOPS", title: "Container Orchestration", lessonSlugs: ["devops-03-kubernetes-basics","devops-04-kubernetes-ops","devops-05-gitops-deploy"], category: "compute" },
];
const sreLessons: Lesson[] = [
  { slug: "sre-01-principles-slo", courseId: "SRE", title: "Nguyên lý SRE: SLI/SLO/Error Budget", shortTitle: "SLO & SRE", chapter: "sre-ch1", order: 1, available: true,
    description: "SRE là gì, SLI/SLO/SLA, error budget, toil, cân bằng tốc độ vs độ tin cậy.", file: "sre/sre-01-principles-slo.md" },
  { slug: "sre-02-observability", courseId: "SRE", title: "Observability sâu", shortTitle: "Observability", chapter: "sre-ch1", order: 2, available: true,
    description: "Metrics/logs/traces, RED & USE method, cardinality, dashboard, distributed tracing.", file: "sre/sre-02-observability.md" },
  { slug: "sre-03-alerting-oncall", courseId: "SRE", title: "Alerting & On-call", shortTitle: "Alerting", chapter: "sre-ch1", order: 3, available: true,
    description: "Symptom-based alert, runbook, alert fatigue, escalation, on-call bền vững.", file: "sre/sre-03-alerting-oncall.md" },
  { slug: "sre-04-incident-postmortem", courseId: "SRE", title: "Incident Management & Postmortem", shortTitle: "Incidents", chapter: "sre-ch2", order: 4, available: true,
    description: "Severity, incident commander, comms, blameless postmortem, action item.", file: "sre/sre-04-incident-postmortem.md" },
  { slug: "sre-05-reliability-patterns", courseId: "SRE", title: "Reliability Patterns & Testing", shortTitle: "Reliability", chapter: "sre-ch2", order: 5, available: true,
    description: "Capacity planning, load testing, chaos engineering, graceful degradation, DR drill.", file: "sre/sre-05-reliability-patterns.md" },
  { slug: "sre-06-progressive-delivery", courseId: "SRE", title: "Deployment Safety & Progressive Delivery", shortTitle: "Safe Deploy", chapter: "sre-ch2", order: 6, available: true,
    description: "Rollback nhanh, canary/automated rollback, feature flag, error-budget-based release.", file: "sre/sre-06-progressive-delivery.md" },
];
const sreChapters: Chapter[] = [
  { id: "sre-ch1", courseId: "SRE", title: "Độ tin cậy & quan sát", lessonSlugs: ["sre-01-principles-slo","sre-02-observability","sre-03-alerting-oncall"], category: "foundation" },
  { id: "sre-ch2", courseId: "SRE", title: "Sự cố & an toàn vận hành", lessonSlugs: ["sre-04-incident-postmortem","sre-05-reliability-patterns","sre-06-progressive-delivery"], category: "security" },
];
const aimlLessons: Lesson[] = [
  { slug: "aiml-01-landscape", courseId: "AIML", title: "AI/ML landscape cho kỹ sư", shortTitle: "AI Landscape", chapter: "aiml-ch1", order: 1, available: true,
    description: "ML/DL/LLM khác nhau, khi nào dùng ML vs rule, vai trò kỹ sư vs data scientist.", file: "aiml/aiml-01-landscape.md" },
  { slug: "aiml-02-how-llms-work", courseId: "AIML", title: "LLM hoạt động thế nào", shortTitle: "LLM Internals", chapter: "aiml-ch1", order: 2, available: true,
    description: "Token, context window, embedding, temperature, hallucination, model trade-off.", file: "aiml/aiml-02-how-llms-work.md" },
  { slug: "aiml-03-prompt-engineering", courseId: "AIML", title: "Prompt Engineering & patterns", shortTitle: "Prompting", chapter: "aiml-ch1", order: 3, available: true,
    description: "Zero/few-shot, system prompt, chain-of-thought, structured output, đánh giá prompt.", file: "aiml/aiml-03-prompt-engineering.md" },
  { slug: "aiml-04-rag", courseId: "AIML", title: "RAG: Retrieval-Augmented Generation", shortTitle: "RAG", chapter: "aiml-ch2", order: 4, available: true,
    description: "Vector embedding, chunking, vector DB, retrieval, grounding, đánh giá RAG.", file: "aiml/aiml-04-rag.md" },
  { slug: "aiml-05-agents-tools", courseId: "AIML", title: "Agents, Tool Use & Function Calling", shortTitle: "Agents", chapter: "aiml-ch2", order: 5, available: true,
    description: "Tool/function calling, agent loop, structured output, multi-step, MCP ý tưởng.", file: "aiml/aiml-05-agents-tools.md" },
  { slug: "aiml-06-ai-in-production", courseId: "AIML", title: "Đưa AI vào Production", shortTitle: "AI in Prod", chapter: "aiml-ch2", order: 6, available: true,
    description: "Eval & test, guardrails, cost & latency, caching, an toàn/PII, observability LLM, Bedrock.", file: "aiml/aiml-06-ai-in-production.md" },
];
const aimlChapters: Chapter[] = [
  { id: "aiml-ch1", courseId: "AIML", title: "Nền tảng AI ứng dụng", lessonSlugs: ["aiml-01-landscape","aiml-02-how-llms-work","aiml-03-prompt-engineering"], category: "foundation" },
  { id: "aiml-ch2", courseId: "AIML", title: "Xây sản phẩm AI", lessonSlugs: ["aiml-04-rag","aiml-05-agents-tools","aiml-06-ai-in-production"], category: "compute" },
];

// ===== FRONTEND + CAPSTONE tracks =====
const feLessons: Lesson[] = [
  { slug: "fe-01-typescript", courseId: "FRONTEND", title: "TypeScript cho Frontend", shortTitle: "TypeScript", chapter: "fe-ch1", order: 1, available: true,
    description: "Kiểu, interface/type, union/narrowing, generics, utility types, tsconfig — vì sao TS bắt buộc cho FE hiện đại.", file: "frontend/fe-01-typescript.md" },
  { slug: "fe-02-react-basics", courseId: "FRONTEND", title: "React căn bản: component & JSX", shortTitle: "React Basics", chapter: "fe-ch1", order: 2, available: true,
    description: "Component, JSX, props, render & re-render, list & key, conditional, từ DOM thủ công sang declarative.", file: "frontend/fe-02-react-basics.md" },
  { slug: "fe-03-hooks-state", courseId: "FRONTEND", title: "React Hooks & State", shortTitle: "Hooks & State", chapter: "fe-ch1", order: 3, available: true,
    description: "useState, useEffect (dependency, cleanup), useRef, useMemo/useCallback, custom hook, rules of hooks, bẫy stale closure.", file: "frontend/fe-03-hooks-state.md" },
  { slug: "fe-04-state-management", courseId: "FRONTEND", title: "Quản lý state & data flow", shortTitle: "State Management", chapter: "fe-ch2", order: 4, available: true,
    description: "Lifting state, prop drilling, Context API, khi nào cần Zustand/Redux, server state vs client state, immutability.", file: "frontend/fe-04-state-management.md" },
  { slug: "fe-05-routing-data", courseId: "FRONTEND", title: "Routing & Data Fetching", shortTitle: "Routing & Data", chapter: "fe-ch2", order: 5, available: true,
    description: "Client-side routing (React Router), data fetching với React Query/SWR (cache, loading/error, refetch, mutation), Suspense.", file: "frontend/fe-05-routing-data.md" },
  { slug: "fe-06-forms", courseId: "FRONTEND", title: "Forms & Validation", shortTitle: "Forms", chapter: "fe-ch2", order: 6, available: true,
    description: "Controlled vs uncontrolled, react-hook-form, validation với Zod, error UX, accessibility của form.", file: "frontend/fe-06-forms.md" },
  { slug: "fe-07-styling", courseId: "FRONTEND", title: "Styling & Design System", shortTitle: "Styling", chapter: "fe-ch3", order: 7, available: true,
    description: "CSS modules vs Tailwind vs CSS-in-JS, responsive & mobile-first, design tokens, component library, dark mode.", file: "frontend/fe-07-styling.md" },
  { slug: "fe-08-testing", courseId: "FRONTEND", title: "Frontend Testing", shortTitle: "Testing", chapter: "fe-ch3", order: 8, available: true,
    description: "Unit test component (Vitest/Jest + React Testing Library), test hành vi không test implementation, mock API, e2e với Playwright.", file: "frontend/fe-08-testing.md" },
  { slug: "fe-09-build-deploy-perf", courseId: "FRONTEND", title: "Build, Deploy & Performance", shortTitle: "Build & Deploy", chapter: "fe-ch3", order: 9, available: true,
    description: "Vite/bundler, env & code splitting, deploy (Vercel / S3+CloudFront), Core Web Vitals, lazy load, memo, accessibility (a11y).", file: "frontend/fe-09-build-deploy-perf.md" },
];
const feChapters: Chapter[] = [
  { id: "fe-ch1", courseId: "FRONTEND", title: "React & TypeScript", lessonSlugs: ["fe-01-typescript","fe-02-react-basics","fe-03-hooks-state"], category: "compute" },
  { id: "fe-ch2", courseId: "FRONTEND", title: "Ứng dụng thực tế", lessonSlugs: ["fe-04-state-management","fe-05-routing-data","fe-06-forms"], category: "foundation" },
  { id: "fe-ch3", courseId: "FRONTEND", title: "Chất lượng & vận hành", lessonSlugs: ["fe-07-styling","fe-08-testing","fe-09-build-deploy-perf"], category: "security" },
];
const capLessons: Lesson[] = [
  { slug: "cap-01-plan", courseId: "CAPSTONE", title: "Lên kế hoạch & kiến trúc dự án", shortTitle: "Plan & Design", chapter: "cap-ch1", order: 1, available: true,
    description: "Chọn đề bài, yêu cầu, thiết kế kiến trúc full-stack, chọn stack, data model, API contract, chia milestone.", file: "capstone/cap-01-plan.md" },
  { slug: "cap-02-build", courseId: "CAPSTONE", title: "Dựng app: Frontend + Backend + Database", shortTitle: "Build", chapter: "cap-ch1", order: 2, available: true,
    description: "Dựng BE (API + DB), FE (React) gọi API, auth, kết nối end-to-end, từng bước có code.", file: "capstone/cap-02-build.md" },
  { slug: "cap-03-deploy", courseId: "CAPSTONE", title: "Deploy, CI/CD & hoàn thiện", shortTitle: "Deploy & Ship", chapter: "cap-ch1", order: 3, available: true,
    description: "Dockerize, CI/CD pipeline, deploy (Vercel + AWS), env/secrets, monitoring, polish, viết README & demo.", file: "capstone/cap-03-deploy.md" },
];
const capChapters: Chapter[] = [
  { id: "cap-ch1", courseId: "CAPSTONE", title: "Đồ án full-stack end-to-end", lessonSlugs: ["cap-01-plan","cap-02-build","cap-03-deploy"], category: "compute" },
];

// =====================================================================
// FOUNDATIONS — Nền tảng Cloud & Hệ phân tán (knowledge track, không thi)
// =====================================================================
const foundLessons: Lesson[] = [
  // Chương 1 — Nhập môn Cloud
  { slug: "intro-01-virtualization", courseId: "FOUNDATIONS", title: "Từ máy chủ vật lý đến ảo hoá & container", shortTitle: "Ảo hoá & Container", chapter: "found-ch1", order: 1, available: true,
    description: "Datacenter, hypervisor, VM vs container, Docker, orchestration, serverless — và map sang EC2/ECS/Lambda.", file: "foundations/intro-01-virtualization.md" },
  { slug: "intro-02-networking", courseId: "FOUNDATIONS", title: "Mạng cơ bản cho Cloud", shortTitle: "Networking 101", chapter: "found-ch1", order: 2, available: true,
    description: "IP/CIDR, DNS, HTTP/TLS, firewall stateful vs stateless, load balancer L4/L7, CDN.", file: "foundations/intro-02-networking.md" },
  { slug: "intro-03-cloud-101", courseId: "FOUNDATIONS", title: "Cloud Computing 101", shortTitle: "Cloud 101", chapter: "found-ch1", order: 3, available: true,
    description: "IaaS/PaaS/SaaS, region & AZ, elasticity, pay-as-you-go, shared responsibility, multi-tenancy.", file: "foundations/intro-03-cloud-101.md" },
  { slug: "intro-04-storage-db", courseId: "FOUNDATIONS", title: "Lưu trữ & Cơ sở dữ liệu 101", shortTitle: "Storage & DB 101", chapter: "found-ch1", order: 4, available: true,
    description: "Block vs file vs object, durability, SQL vs NoSQL, index, cache, backup vs snapshot.", file: "foundations/intro-04-storage-db.md" },
  // Chương 2 — Thiết kế hệ thống
  { slug: "design-01-scaling", courseId: "FOUNDATIONS", title: "Scaling & Stateless Design", shortTitle: "Scaling", chapter: "found-ch2", order: 5, available: true,
    description: "Vertical vs horizontal, stateless tier, caching layers, read replicas, auto scaling.", file: "foundations/design-01-scaling.md" },
  { slug: "design-02-ha", courseId: "FOUNDATIONS", title: "High Availability & Redundancy", shortTitle: "HA & Redundancy", chapter: "found-ch2", order: 6, available: true,
    description: "SPOF, active-passive vs active-active, health check, nines, RTO/RPO nhập môn.", file: "foundations/design-02-ha.md" },
  { slug: "design-03-messaging", courseId: "FOUNDATIONS", title: "Async & Messaging Patterns", shortTitle: "Messaging", chapter: "found-ch2", order: 7, available: true,
    description: "Queue vs pub/sub, event-driven, backpressure, idempotency, ordering.", file: "foundations/design-03-messaging.md" },
  { slug: "design-04-observability", courseId: "FOUNDATIONS", title: "Observability cơ bản", shortTitle: "Observability", chapter: "found-ch2", order: 8, available: true,
    description: "Logs/metrics/traces, percentile, alerting, SLI/SLO/SLA.", file: "foundations/design-04-observability.md" },
  // Chương 3 — Hệ phân tán (advanced)
  { slug: "foundations-01-cap-theorem", courseId: "FOUNDATIONS", title: "Định lý CAP & PACELC", shortTitle: "CAP Theorem", chapter: "found-ch3", order: 9, available: true,
    description: "CAP, PACELC, map DynamoDB/Aurora/RDS vào CP/AP.", file: "foundations/01-cap-theorem.md" },
  { slug: "foundations-02-consistency-models", courseId: "FOUNDATIONS", title: "Consistency Models", shortTitle: "Consistency", chapter: "found-ch3", order: 10, available: true,
    description: "Strong / eventual / causal / read-your-writes — và mỗi AWS service rơi vào mức nào.", file: "foundations/02-consistency-models.md" },
  { slug: "foundations-03-replication-and-quorum", courseId: "FOUNDATIONS", title: "Replication & Quorum", shortTitle: "Replication", chapter: "found-ch3", order: 11, available: true,
    description: "Single-leader, multi-leader, quorum (W+R>N). Vì sao Aurora dùng 4/6, Raft/Paxos cơ bản.", file: "foundations/03-replication-and-quorum.md" },
  { slug: "foundations-04-latency-vs-consistency", courseId: "FOUNDATIONS", title: "Latency vs Consistency", shortTitle: "Multi-Region", chapter: "found-ch3", order: 12, available: true,
    description: "Vì sao Multi-Region khó: RTT vật lý, spectrum patterns, bẫy active-active.", file: "foundations/04-latency-vs-consistency.md" },
  { slug: "foundations-05-partitioning-and-sharding", courseId: "FOUNDATIONS", title: "Partitioning & Sharding", shortTitle: "Partitioning", chapter: "found-ch3", order: 13, available: true,
    description: "Range/hash/consistent hashing, DynamoDB partition key, hot partition, RDS sharding.", file: "foundations/05-partitioning-and-sharding.md" },
  { slug: "foundations-06-failure-modes", courseId: "FOUNDATIONS", title: "Failure Modes & Cascading", shortTitle: "Failure Modes", chapter: "found-ch3", order: 14, available: true,
    description: "Retry storm, thundering herd, circuit breaker, bulkhead, idempotency, chaos.", file: "foundations/06-failure-modes.md" },
  // Phụ lục
  { slug: "appendix-aws-vs-gcp", courseId: "FOUNDATIONS", title: "AWS ↔ GCP — Bảng đối chiếu", shortTitle: "AWS vs GCP", chapter: "found-ch4", order: 15, available: true,
    description: "Map service AWS sang GCP cho người đã quen GCP — kèm các điểm khác căn bản.", file: "foundations/aws-vs-gcp.md" },
];

const foundChapters: Chapter[] = [
  { id: "found-ch1", courseId: "FOUNDATIONS", title: "Chương 1 — Nhập môn Cloud", lessonSlugs: ["intro-01-virtualization", "intro-02-networking", "intro-03-cloud-101", "intro-04-storage-db"], category: "foundation" },
  { id: "found-ch2", courseId: "FOUNDATIONS", title: "Chương 2 — Thiết kế hệ thống", lessonSlugs: ["design-01-scaling", "design-02-ha", "design-03-messaging", "design-04-observability"], category: "compute" },
  { id: "found-ch3", courseId: "FOUNDATIONS", title: "Chương 3 — Hệ phân tán (nâng cao)", lessonSlugs: ["foundations-01-cap-theorem", "foundations-02-consistency-models", "foundations-03-replication-and-quorum", "foundations-04-latency-vs-consistency", "foundations-05-partitioning-and-sharding", "foundations-06-failure-modes"], category: "database" },
  { id: "found-ch4", courseId: "FOUNDATIONS", title: "Phụ lục", lessonSlugs: ["appendix-aws-vs-gcp"], category: "foundation" },
];


// =====================================================================
// ENGINEER — Kỹ năng nền Kỹ sư Cloud (knowledge track, không thi)
// =====================================================================
const engLessons: Lesson[] = [
  { slug: "eng-01-linux-terminal", courseId: "ENGINEER", title: "Linux & Terminal cho kỹ sư Cloud", shortTitle: "Linux & Terminal", chapter: "eng-ch1", order: 1, available: true,
    description: "Filesystem, permissions, process, systemd, SSH, log & grep/awk, Bash scripting căn bản.", file: "engineering/eng-01-linux-terminal.md" },
  { slug: "eng-osi-model", courseId: "ENGINEER", title: "Mô hình 7 tầng (OSI) — bản đồ mạng & các vấn đề xuyên tầng", shortTitle: "Mô hình 7 tầng", chapter: "eng-ch2", order: 2, available: true,
    description: "Bản đồ OSI 7 tầng & TCP/IP; bù tầng L1/L2 (Ethernet/MAC/ARP/switch/VLAN); encapsulation; bản đồ xuyên tầng caching / security (defense-in-depth) / debug & performance theo từng tầng; ví dụ end-to-end gõ URL.", file: "engineering/eng-osi-model.md" },
  { slug: "eng-02-cidr-subnetting", courseId: "ENGINEER", title: "CIDR & Subnetting thực hành", shortTitle: "CIDR & Subnetting", chapter: "eng-ch2", order: 3, available: true,
    description: "Tính network/broadcast/hosts bằng tay, chia subnet VPC, overlap, longest-prefix match, IPv6 cơ bản.", file: "engineering/eng-02-cidr-subnetting.md" },
  { slug: "eng-03-tcp-tls", courseId: "ENGINEER", title: "TCP/UDP & TLS — HTTPS thật sự hoạt động thế nào", shortTitle: "TCP & TLS", chapter: "eng-ch2", order: 4, available: true,
    description: "TCP vs UDP, HTTP/1.1→/3 (QUIC), TLS 1.3 handshake, certificate chain, SNI, mTLS, debug bằng curl/openssl.", file: "engineering/eng-03-tcp-tls.md" },
  { slug: "eng-04-identity-crypto", courseId: "ENGINEER", title: "Mật mã & Danh tính hiện đại", shortTitle: "Identity & Crypto", chapter: "eng-ch3", order: 5, available: true,
    description: "AES/RSA, hashing, PKI; OAuth 2.1 (Auth Code + PKCE), OIDC, JWT đúng cách, SAML, passkeys/WebAuthn.", file: "engineering/eng-04-identity-crypto.md" },
  { slug: "eng-05-docker", courseId: "ENGINEER", title: "Docker thực hành cho kỹ sư Cloud", shortTitle: "Docker", chapter: "eng-ch4", order: 6, available: true,
    description: "Dockerfile, layer & cache, multi-stage build, compose (LocalStack), healthcheck, best practices bảo mật image.", file: "engineering/eng-05-docker.md" },
  { slug: "eng-06-automation", courseId: "ENGINEER", title: "Scripting & Automation: Bash + Python boto3", shortTitle: "Automation", chapter: "eng-ch4", order: 7, available: true,
    description: "Bash nâng cao (set -euo pipefail, jq), AWS CLI --query, Python boto3 (paginator, waiter), cron vs EventBridge.", file: "engineering/eng-06-automation.md" },
];


const engChapters: Chapter[] = [
  { id: "eng-ch1", courseId: "ENGINEER", title: "Hệ điều hành & Terminal", lessonSlugs: ["eng-01-linux-terminal"], category: "compute" },
  { id: "eng-ch2", courseId: "ENGINEER", title: "Mạng thực hành", lessonSlugs: ["eng-osi-model", "eng-02-cidr-subnetting", "eng-03-tcp-tls"], category: "network" },
  { id: "eng-ch3", courseId: "ENGINEER", title: "Mật mã & Danh tính", lessonSlugs: ["eng-04-identity-crypto"], category: "security" },
  { id: "eng-ch4", courseId: "ENGINEER", title: "Container & Tự động hoá", lessonSlugs: ["eng-05-docker", "eng-06-automation"], category: "compute" },
];

// SYSTEM-DESIGN — outline (coming soon)
const sysdChapters: Chapter[] = [
  { id: "sysd-ch1", courseId: "SYSTEM-DESIGN", title: "Tư duy thiết kế & Trade-off", lessonSlugs: ["sd-01-requirements", "sd-02-building-blocks"], category: "foundation" },
  { id: "sysd-ch2", courseId: "SYSTEM-DESIGN", title: "Case Studies: Scale thực tế", lessonSlugs: ["sd-03-url-shortener", "sd-04-news-feed", "sd-05-chat"], category: "compute" },
  { id: "sysd-ch3", courseId: "SYSTEM-DESIGN", title: "Data, Cost & Multi-account", lessonSlugs: ["sd-06-data-pipeline", "sd-07-multi-account-cost"], category: "billing" },
  { id: "sysd-ch4", courseId: "SYSTEM-DESIGN", title: "Build vs Buy & Strategy", lessonSlugs: ["sd-08-tradeoff-strategy"], category: "security" },
];


// =====================================================================
// BACKEND — Backend Engineering (knowledge track, không thi)
// =====================================================================
const beLessons: Lesson[] = [
  { slug: "be-01-api-design", courseId: "BACKEND", title: "API Design: REST, gRPC, GraphQL & Webhooks", shortTitle: "API Design", chapter: "be-ch1", order: 1, available: true,
    description: "REST đúng nghĩa, pagination, versioning, idempotency key, rate limit, gRPC vs GraphQL, webhooks, OpenAPI.", file: "backend/be-01-api-design.md" },
  { slug: "be-02-database-engineering", courseId: "BACKEND", title: "Database Engineering: Index, Transaction & Migration", shortTitle: "Database Eng", chapter: "be-ch1", order: 2, available: true,
    description: "B-tree index, composite/covering, EXPLAIN, isolation levels, deadlock, optimistic locking, migration expand-contract.", file: "backend/be-02-database-engineering.md" },
  { slug: "be-03-caching", courseId: "BACKEND", title: "Caching Patterns trong thực tế", shortTitle: "Caching", chapter: "be-ch1", order: 3, available: true,
    description: "Cache-aside/write-through, invalidation, stampede, hot key, negative caching, hit ratio.", file: "backend/be-03-caching.md" },
  { slug: "be-04-async-jobs", courseId: "BACKEND", title: "Async Processing & Background Jobs", shortTitle: "Async & Jobs", chapter: "be-ch2", order: 4, available: true,
    description: "Queue worker, at-least-once → idempotent consumer, outbox pattern, saga, DLQ, backpressure.", file: "backend/be-04-async-jobs.md" },
  { slug: "be-07-resilience-code", courseId: "BACKEND", title: "Resilience trong code: Timeout, Retry, Circuit Breaker", shortTitle: "Resilience", chapter: "be-ch2", order: 5, available: true,
    description: "Timeout budget, retry đúng cách, retry storm, circuit breaker, bulkhead, load shedding.", file: "backend/be-07-resilience-code.md" },
  { slug: "be-05-testing", courseId: "BACKEND", title: "Testing Strategy cho Backend", shortTitle: "Testing", chapter: "be-ch3", order: 6, available: true,
    description: "Test pyramid, mock ở ranh giới, integration với testcontainers/LocalStack, contract testing, flaky tests.", file: "backend/be-05-testing.md" },
  { slug: "be-06-twelve-factor", courseId: "BACKEND", title: "12-Factor App & Configuration hiện đại", shortTitle: "12-Factor", chapter: "be-ch3", order: 7, available: true,
    description: "Config qua env, secrets manager, graceful shutdown, liveness vs readiness, feature flags.", file: "backend/be-06-twelve-factor.md" },
  { slug: "be-08-performance", courseId: "BACKEND", title: "Performance & Profiling", shortTitle: "Performance", chapter: "be-ch3", order: 8, available: true,
    description: "p50/p95/p99, profiling, N+1, connection pool sizing, benchmark đúng cách, tail latency.", file: "backend/be-08-performance.md" },
];

const beChapters: Chapter[] = [
  { id: "be-ch1", courseId: "BACKEND", title: "API & Dữ liệu", lessonSlugs: ["be-01-api-design", "be-02-database-engineering", "be-03-caching"], category: "database" },
  { id: "be-ch2", courseId: "BACKEND", title: "Bất đồng bộ & Resilience", lessonSlugs: ["be-04-async-jobs", "be-07-resilience-code"], category: "network" },
  { id: "be-ch3", courseId: "BACKEND", title: "Chất lượng & Vận hành code", lessonSlugs: ["be-05-testing", "be-06-twelve-factor", "be-08-performance"], category: "foundation" },
];


// =====================================================================
// CLF-C02 — Full content available
// =====================================================================
const clfLessons: Lesson[] = [
  { slug: "01-cloud-concepts",       courseId: "CLF-C02", title: "Cloud Concepts",            shortTitle: "Cloud Concepts",       chapter: "clf-d1", order: 1, available: true,
    description: "Cloud computing là gì, 6 lợi ích, IaaS/PaaS/SaaS, deployment models.",
    file: "clf-c02/01-cloud-concepts.md" },
  { slug: "02-shared-responsibility", courseId: "CLF-C02", title: "Shared Responsibility",     shortTitle: "Shared Responsibility", chapter: "clf-d2", order: 4, available: true,
    description: "Security of vs in the cloud — AWS chịu gì, khách hàng chịu gì.",
    file: "clf-c02/02-shared-responsibility.md" },
  { slug: "03-iam",                   courseId: "CLF-C02", title: "IAM",                       shortTitle: "IAM",                   chapter: "clf-d2", order: 5, available: true,
    description: "Users, groups, roles, policies, MFA, best practices.",
    file: "clf-c02/03-iam.md" },
  { slug: "04-ec2",                   courseId: "CLF-C02", title: "EC2",                       shortTitle: "EC2",                   chapter: "clf-d3", order: 8, available: true,
    description: "Virtual machines: instance types, pricing, AMI, EBS, security groups.",
    file: "clf-c02/04-ec2.md" },
  { slug: "05-s3",                    courseId: "CLF-C02", title: "S3",                        shortTitle: "S3",                    chapter: "clf-d3", order: 9, available: true,
    description: "Object storage, buckets, storage classes, lifecycle, versioning.",
    file: "clf-c02/05-s3.md" },
  { slug: "06-vpc",                   courseId: "CLF-C02", title: "VPC",                       shortTitle: "VPC",                   chapter: "clf-d3", order: 10, available: true,
    description: "Subnets, route tables, IGW, NAT, security groups vs NACL.",
    file: "clf-c02/06-vpc.md" },
  { slug: "07-databases",             courseId: "CLF-C02", title: "Databases",                 shortTitle: "Databases",             chapter: "clf-d3", order: 11, available: true,
    description: "RDS, DynamoDB, Aurora, ElastiCache — chọn DB phù hợp use case.",
    file: "clf-c02/07-databases.md" },
  { slug: "08-billing",               courseId: "CLF-C02", title: "Billing & Pricing",         shortTitle: "Billing",               chapter: "clf-d4", order: 18, available: true,
    description: "Pricing models, AWS Budgets, Cost Explorer, Free Tier.",
    file: "clf-c02/08-billing.md" },
  { slug: "09-well-architected",      courseId: "CLF-C02", title: "Well-Architected Framework", shortTitle: "Well-Architected",     chapter: "clf-d1", order: 2, available: true,
    description: "6 pillar: Operational Excellence, Security, Reliability, Performance, Cost, Sustainability + WAF Tool.",
    file: "clf-c02/09-well-architected.md" },
  { slug: "10-migration-caf",         courseId: "CLF-C02", title: "Migration & Cloud Adoption Framework", shortTitle: "Migration & CAF", chapter: "clf-d1", order: 3, available: true,
    description: "CAF 6 perspectives, 7 R migration strategies, Snow Family, MGN, DMS, SCT, DRS, MAP.",
    file: "clf-c02/10-migration-caf.md" },
  { slug: "11-compute-extended",      courseId: "CLF-C02", title: "Compute Extended",          shortTitle: "Compute Extended",      chapter: "clf-d3", order: 12, available: true,
    description: "Containers (ECS/EKS/Fargate), Lambda, Beanstalk, Lightsail, Batch, Auto Scaling, ELB.",
    file: "clf-c02/11-compute-extended.md" },
  { slug: "12-storage-extended",      courseId: "CLF-C02", title: "Storage Extended",          shortTitle: "Storage Extended",      chapter: "clf-d3", order: 13, available: true,
    description: "EBS, Instance Store, EFS, FSx (Windows/Lustre/ONTAP/OpenZFS), Storage Gateway, Backup, DRS.",
    file: "clf-c02/12-storage-extended.md" },
  { slug: "13-deploy-iac",            courseId: "CLF-C02", title: "Deploy & IaC",              shortTitle: "Deploy & IaC",          chapter: "clf-d3", order: 14, available: true,
    description: "Console / CLI / SDK / CloudFormation / CDK / SAM, Systems Manager, deployment models, connectivity.",
    file: "clf-c02/13-deploy-iac.md" },
  { slug: "14-app-integration",       courseId: "CLF-C02", title: "Application Integration",   shortTitle: "App Integration",       chapter: "clf-d3", order: 15, available: true,
    description: "SNS, SQS, EventBridge, Step Functions, Amazon MQ — pattern decouple.",
    file: "clf-c02/14-app-integration.md" },
  { slug: "15-ai-ml",                 courseId: "CLF-C02", title: "AI/ML Services",            shortTitle: "AI/ML",                 chapter: "clf-d3", order: 16, available: true,
    description: "SageMaker, Bedrock, Rekognition, Polly, Transcribe, Translate, Comprehend, Lex, Kendra, Personalize.",
    file: "clf-c02/15-ai-ml.md" },
  { slug: "16-analytics",             courseId: "CLF-C02", title: "Analytics Services",        shortTitle: "Analytics",             chapter: "clf-d3", order: 17, available: true,
    description: "Athena, Redshift, EMR, Glue, Kinesis, MSK, OpenSearch, QuickSight, Data Exchange, Lake Formation.",
    file: "clf-c02/16-analytics.md" },
  { slug: "17-monitoring-governance", courseId: "CLF-C02", title: "Monitoring & Governance",   shortTitle: "Monitoring",            chapter: "clf-d2", order: 6, available: true,
    description: "CloudWatch, CloudTrail, Config, X-Ray, Trusted Advisor, Organizations, Control Tower, Service Catalog, Audit Manager.",
    file: "clf-c02/17-monitoring-governance.md" },
  { slug: "18-security-extended",     courseId: "CLF-C02", title: "Security Extended",         shortTitle: "Security Extended",     chapter: "clf-d2", order: 7, available: true,
    description: "KMS, CloudHSM, Secrets Manager, ACM, Cognito, Directory Service, WAF, Shield, GuardDuty, Inspector, Macie, Detective, Security Hub, RAM, Artifact.",
    file: "clf-c02/18-security-extended.md" },
  { slug: "19-other-services",        courseId: "CLF-C02", title: "Other Services & Support",  shortTitle: "Other Services",        chapter: "clf-d4", order: 19, available: true,
    description: "Dev Tools (Code*), WorkSpaces, AppStream, IoT Core/Greengrass, Amplify, AppSync, SES, Connect, Marketplace, Partner Network.",
    file: "clf-c02/19-other-services.md" },
];

const clfChapters: Chapter[] = [
  { id: "clf-d1", courseId: "CLF-C02", title: "Domain 1 — Cloud Concepts (24%)",            lessonSlugs: ["01-cloud-concepts", "09-well-architected", "10-migration-caf"], category: "foundation" },
  { id: "clf-d2", courseId: "CLF-C02", title: "Domain 2 — Security & Compliance (30%)",      lessonSlugs: ["02-shared-responsibility", "03-iam", "17-monitoring-governance", "18-security-extended"], category: "security" },
  { id: "clf-d3", courseId: "CLF-C02", title: "Domain 3 — Cloud Technology & Services (34%)", lessonSlugs: ["04-ec2", "05-s3", "06-vpc", "07-databases", "11-compute-extended", "12-storage-extended", "13-deploy-iac", "14-app-integration", "15-ai-ml", "16-analytics"], category: "compute" },
  { id: "clf-d4", courseId: "CLF-C02", title: "Domain 4 — Billing, Pricing & Support (12%)", lessonSlugs: ["08-billing", "19-other-services"], category: "billing" },
];

// =====================================================================
// SAA-C03 — Placeholder outline (Coming soon)
// =====================================================================
const saaLessons: Lesson[] = [
  // Domain 2 — Design Resilient Architectures (26%)
  { slug: "resilient-01-decoupling", courseId: "SAA-C03", title: "Decoupling & Loosely Coupled", shortTitle: "Decoupling", chapter: "saa-ch-res", order: 5, available: true,
    description: "SQS, SNS, EventBridge, queue-based load leveling, stateless — thiết kế tách rời, chống lỗi lan.",
    file: "saa-c03/resilient-01-decoupling.md" },
  { slug: "resilient-02-ha-fault-tolerance", courseId: "SAA-C03", title: "High Availability & Fault Tolerance", shortTitle: "HA & FT", chapter: "saa-ch-res", order: 6, available: true,
    description: "Multi-AZ, ELB, Route 53 failover/health checks, Auto Scaling cho HA, phân biệt HA vs fault tolerance.",
    file: "saa-c03/resilient-02-ha-fault-tolerance.md" },
  { slug: "resilient-03-dr-strategies", courseId: "SAA-C03", title: "Disaster Recovery Strategies", shortTitle: "DR Strategies", chapter: "saa-ch-res", order: 7, available: true,
    description: "Backup&Restore, Pilot Light, Warm Standby, Multi-Site theo RTO/RPO; Aurora Global, DynamoDB Global Tables, CRR.",
    file: "saa-c03/resilient-03-dr-strategies.md" },
  { slug: "resilient-04-scalability", courseId: "SAA-C03", title: "Designing for Scalability", shortTitle: "Scalability", chapter: "saa-ch-res", order: 8, available: true,
    description: "Auto Scaling policies, read replicas, caching (CloudFront/ElastiCache/DAX), hấp thụ traffic spike.",
    file: "saa-c03/resilient-04-scalability.md" },
  // Domain 3 — Design High-Performing Architectures (24%)
  { slug: "ch2-01-compute-performance", courseId: "SAA-C03", title: "Compute Performance & Autoscaling", shortTitle: "Compute Perf", chapter: "saa-ch2", order: 9, available: true,
    description: "EC2 family, Lambda, Fargate, purchase options, autoscaling strategies, cold start.",
    file: "saa-c03/ch2-01-compute-performance.md" },
  { slug: "ch2-02-storage-performance", courseId: "SAA-C03", title: "Storage Performance", shortTitle: "Storage Perf", chapter: "saa-ch2", order: 10, available: true,
    description: "EBS gp3/io2, instance store, EFS, FSx Lustre, S3 throughput, lifecycle.",
    file: "saa-c03/ch2-02-storage-performance.md" },
  { slug: "ch2-03-database-performance", courseId: "SAA-C03", title: "Database Performance & Caching", shortTitle: "DB Perf", chapter: "saa-ch2", order: 11, available: true,
    description: "Aurora tuning, DynamoDB throughput, ElastiCache, DAX, RDS Proxy, cache patterns.",
    file: "saa-c03/ch2-03-database-performance.md" },
  { slug: "ch2-04-network-performance", courseId: "SAA-C03", title: "Network & Edge Performance", shortTitle: "Network Perf", chapter: "saa-ch2", order: 12, available: true,
    description: "CloudFront, Global Accelerator, VPC endpoints, Direct Connect, API Gateway.",
    file: "saa-c03/ch2-04-network-performance.md" },
  // Domain 1 — Design Secure Architectures (30%)
  { slug: "ch3-01-iam-deep-dive", courseId: "SAA-C03", title: "IAM Deep Dive & Identity Federation", shortTitle: "IAM Deep", chapter: "saa-ch3", order: 1, available: true,
    description: "Policy evaluation, STS, federation (IdC, SAML, OIDC), Permission Boundary, SCP, ABAC.",
    file: "saa-c03/ch3-01-iam-deep-dive.md" },
  { slug: "ch3-02-network-security", courseId: "SAA-C03", title: "Network Security", shortTitle: "Net Security", chapter: "saa-ch3", order: 2, available: true,
    description: "SG vs NACL deep, WAF, Shield, Network Firewall, VPC endpoint security, defense in depth.",
    file: "saa-c03/ch3-02-network-security.md" },
  { slug: "ch3-03-data-protection", courseId: "SAA-C03", title: "Data Protection & Encryption", shortTitle: "Data Protection", chapter: "saa-ch3", order: 3, available: true,
    description: "KMS envelope encryption, CloudHSM, S3/EBS/RDS encryption, Secrets Manager, ACM.",
    file: "saa-c03/ch3-03-data-protection.md" },
  { slug: "ch3-04-detective-controls", courseId: "SAA-C03", title: "Detective Controls & Compliance", shortTitle: "Detective", chapter: "saa-ch3", order: 4, available: true,
    description: "CloudTrail, Config, GuardDuty, Inspector, Macie, Security Hub, Detective, incident response.",
    file: "saa-c03/ch3-04-detective-controls.md" },
  // Domain 4 — Design Cost-Optimized Architectures (20%)
  { slug: "ch4-01-compute-cost", courseId: "SAA-C03", title: "Compute Cost Optimization", shortTitle: "Compute Cost", chapter: "saa-ch4", order: 13, available: true,
    description: "Savings Plan vs RI vs Spot, right-sizing, Graviton, serverless cost, container cost.",
    file: "saa-c03/ch4-01-compute-cost.md" },
  { slug: "ch4-02-storage-cost", courseId: "SAA-C03", title: "Storage Cost Optimization", shortTitle: "Storage Cost", chapter: "saa-ch4", order: 14, available: true,
    description: "S3 storage classes, lifecycle, Intelligent-Tiering, EBS snapshot, Glacier, EFS cost.",
    file: "saa-c03/ch4-02-storage-cost.md" },
  { slug: "ch4-03-db-network-cost", courseId: "SAA-C03", title: "Database & Network Cost", shortTitle: "DB & Net Cost", chapter: "saa-ch4", order: 15, available: true,
    description: "RDS/Aurora/DynamoDB cost, data transfer trap, CloudWatch cost, NAT/CloudFront optimization.",
    file: "saa-c03/ch4-03-db-network-cost.md" },
  { slug: "ch4-04-cost-visibility", courseId: "SAA-C03", title: "Cost Visibility & Governance", shortTitle: "Cost Visibility", chapter: "saa-ch4", order: 16, available: true,
    description: "Cost Explorer, Budgets, Anomaly Detection, CUR, tagging, SCP guardrail, FinOps basics.",
    file: "saa-c03/ch4-04-cost-visibility.md" },
];

// Xếp theo trọng số blueprint SAA-C03: Secure 30% → Resilient 26% → High-Performing 24% → Cost 20%,
// foundations (lý thuyết hệ phân tán) để cuối làm phụ lục.
const saaChapters: Chapter[] = [
  { id: "saa-ch3", courseId: "SAA-C03", title: "Domain 1 — Design Secure Architectures (30%)", lessonSlugs: ["ch3-01-iam-deep-dive", "ch3-02-network-security", "ch3-03-data-protection", "ch3-04-detective-controls"], category: "security" },
  { id: "saa-ch-res", courseId: "SAA-C03", title: "Domain 2 — Design Resilient Architectures (26%)", lessonSlugs: ["resilient-01-decoupling", "resilient-02-ha-fault-tolerance", "resilient-03-dr-strategies", "resilient-04-scalability"], category: "network" },
  { id: "saa-ch2", courseId: "SAA-C03", title: "Domain 3 — Design High-Performing Architectures (24%)", lessonSlugs: ["ch2-01-compute-performance", "ch2-02-storage-performance", "ch2-03-database-performance", "ch2-04-network-performance"], category: "compute" },
  { id: "saa-ch4", courseId: "SAA-C03", title: "Domain 4 — Design Cost-Optimized Architectures (20%)", lessonSlugs: ["ch4-01-compute-cost", "ch4-02-storage-cost", "ch4-03-db-network-cost", "ch4-04-cost-visibility"], category: "billing" },
];

// DVA-C02 — Developer Associate. Chapters ordered by blueprint weight:
// D1 Development 32% / D2 Security 26% / D3 Deployment 24% / D4 Troubleshooting & Optimization 18%.
const dvaLessons: Lesson[] = [
  // Domain 1 — Development with AWS Services (32%)
  { slug: "dva-d1-01-sdk-api", courseId: "DVA-C02", title: "SDK, CLI & API Calls", shortTitle: "SDK & API", chapter: "dva-ch1", order: 1, available: true,
    description: "AWS SDK & CLI, programmatic access, pagination, retries/exponential backoff, error handling, credential chain.", file: "dva-c02/d1-01-sdk-api.md" },
  { slug: "dva-d1-02-lambda", courseId: "DVA-C02", title: "Developing AWS Lambda", shortTitle: "Lambda", chapter: "dva-ch1", order: 2, available: true,
    description: "Config (memory/timeout/concurrency/layers/extensions/env vars), VPC access, lifecycle, destinations/DLQ, cold start, tuning.", file: "dva-c02/d1-02-lambda.md" },
  { slug: "dva-d1-03-api-gateway", courseId: "DVA-C02", title: "Amazon API Gateway", shortTitle: "API Gateway", chapter: "dva-ch1", order: 3, available: true,
    description: "REST/HTTP/WebSocket, stages, integrations, request/response transform, validation, authorizers, throttling, caching.", file: "dva-c02/d1-03-api-gateway.md" },
  { slug: "dva-d1-04-dynamodb", courseId: "DVA-C02", title: "DynamoDB for Developers", shortTitle: "DynamoDB", chapter: "dva-ch1", order: 4, available: true,
    description: "Partition/sort keys, GSI/LSI, query vs scan, consistency, capacity modes, DAX, Streams, TTL, transactions.", file: "dva-c02/d1-04-dynamodb.md" },
  { slug: "dva-d1-05-app-integration", courseId: "DVA-C02", title: "App Integration & Messaging", shortTitle: "Integration", chapter: "dva-ch1", order: 5, available: true,
    description: "SQS, SNS, EventBridge, Step Functions, Kinesis, fan-out, event-driven & async patterns, Amazon Q Developer.", file: "dva-c02/d1-05-app-integration.md" },
  // Domain 2 — Security (26%)
  { slug: "dva-d2-01-auth", courseId: "DVA-C02", title: "Authentication & Authorization", shortTitle: "Auth", chapter: "dva-ch2", order: 6, available: true,
    description: "Cognito user/identity pools, JWT/bearer tokens, IAM roles, STS AssumeRole, federation, fine-grained access.", file: "dva-c02/d2-01-auth.md" },
  { slug: "dva-d2-02-encryption", courseId: "DVA-C02", title: "Encryption with KMS & ACM", shortTitle: "Encryption", chapter: "dva-ch2", order: 7, available: true,
    description: "KMS envelope encryption, at rest/in transit, client vs server-side, ACM, key rotation, cross-account keys.", file: "dva-c02/d2-02-encryption.md" },
  { slug: "dva-d2-03-secrets", courseId: "DVA-C02", title: "Secrets & Sensitive Data", shortTitle: "Secrets", chapter: "dva-ch2", order: 8, available: true,
    description: "Secrets Manager vs SSM Parameter Store, env var encryption, PII/PHI, masking & sanitization.", file: "dva-c02/d2-03-secrets.md" },
  // Domain 3 — Deployment (24%)
  { slug: "dva-d3-01-packaging-iac", courseId: "DVA-C02", title: "Packaging & IaC", shortTitle: "IaC", chapter: "dva-ch3", order: 9, available: true,
    description: "AWS SAM, CloudFormation, CDK, AppConfig, artifacts, Lambda layers, container images, dependency packaging.", file: "dva-c02/d3-01-packaging-iac.md" },
  { slug: "dva-d3-02-cicd", courseId: "DVA-C02", title: "CI/CD Pipeline", shortTitle: "CI/CD", chapter: "dva-ch3", order: 10, available: true,
    description: "CodePipeline, CodeBuild (buildspec), CodeDeploy (appspec), CodeArtifact, commit-triggered build/test/deploy.", file: "dva-c02/d3-02-cicd.md" },
  { slug: "dva-d3-03-deploy-strategies", courseId: "DVA-C02", title: "Deployment Strategies & Rollbacks", shortTitle: "Deploy Strategies", chapter: "dva-ch3", order: 11, available: true,
    description: "Blue/green, canary, rolling, Lambda versions/aliases, traffic shifting, rollbacks, API Gateway stage variables.", file: "dva-c02/d3-03-deploy-strategies.md" },
  { slug: "dva-d3-04-beanstalk", courseId: "DVA-C02", title: "Elastic Beanstalk & Environments", shortTitle: "Beanstalk", chapter: "dva-ch3", order: 12, available: true,
    description: "Elastic Beanstalk deployment policies (all-at-once, rolling, immutable), environments, .ebextensions.", file: "dva-c02/d3-04-beanstalk.md" },
  // Domain 4 — Troubleshooting & Optimization (18%)
  { slug: "dva-d4-01-observability", courseId: "DVA-C02", title: "Observability: CloudWatch", shortTitle: "Observability", chapter: "dva-ch4", order: 13, available: true,
    description: "CloudWatch Logs, metrics, alarms, EMF custom metrics, Logs Insights, dashboards, structured logging.", file: "dva-c02/d4-01-observability.md" },
  { slug: "dva-d4-02-xray", courseId: "DVA-C02", title: "Tracing with AWS X-Ray", shortTitle: "X-Ray", chapter: "dva-ch4", order: 14, available: true,
    description: "X-Ray segments/subsegments, annotations vs metadata, service map, SDK instrumentation, sampling.", file: "dva-c02/d4-02-xray.md" },
  { slug: "dva-d4-03-optimization", courseId: "DVA-C02", title: "Optimization & Caching", shortTitle: "Optimization", chapter: "dva-ch4", order: 15, available: true,
    description: "Lambda concurrency/performance, ElastiCache, DAX, API Gateway & CloudFront caching, resource optimization.", file: "dva-c02/d4-03-optimization.md" },
];

const dvaChapters: Chapter[] = [
  { id: "dva-ch1", courseId: "DVA-C02", title: "Domain 1 — Development with AWS Services (32%)", lessonSlugs: ["dva-d1-01-sdk-api", "dva-d1-02-lambda", "dva-d1-03-api-gateway", "dva-d1-04-dynamodb", "dva-d1-05-app-integration"], category: "compute" },
  { id: "dva-ch2", courseId: "DVA-C02", title: "Domain 2 — Security (26%)",                       lessonSlugs: ["dva-d2-01-auth", "dva-d2-02-encryption", "dva-d2-03-secrets"], category: "security" },
  { id: "dva-ch3", courseId: "DVA-C02", title: "Domain 3 — Deployment (24%)",                     lessonSlugs: ["dva-d3-01-packaging-iac", "dva-d3-02-cicd", "dva-d3-03-deploy-strategies", "dva-d3-04-beanstalk"], category: "foundation" },
  { id: "dva-ch4", courseId: "DVA-C02", title: "Domain 4 — Troubleshooting & Optimization (18%)", lessonSlugs: ["dva-d4-01-observability", "dva-d4-02-xray", "dva-d4-03-optimization"], category: "billing" },
];

const soaChapters: Chapter[] = [
  { id: "soa-ch1", courseId: "SOA-C02", title: "Monitoring, Logging & Remediation", lessonSlugs: [], category: "foundation" },
  { id: "soa-ch2", courseId: "SOA-C02", title: "Reliability & Business Continuity", lessonSlugs: [], category: "compute" },
  { id: "soa-ch3", courseId: "SOA-C02", title: "Deployment, Provisioning & Automation", lessonSlugs: [], category: "network" },
  { id: "soa-ch4", courseId: "SOA-C02", title: "Security & Compliance",              lessonSlugs: [], category: "security" },
  { id: "soa-ch5", courseId: "SOA-C02", title: "Networking & Content Delivery",      lessonSlugs: [], category: "network" },
  { id: "soa-ch6", courseId: "SOA-C02", title: "Cost & Performance Optimization",    lessonSlugs: [], category: "billing" },
];

const sapChapters: Chapter[] = [
  { id: "sap-ch1", courseId: "SAP-C02", title: "Design Solutions for Organizational Complexity", lessonSlugs: [], category: "foundation" },
  { id: "sap-ch2", courseId: "SAP-C02", title: "Design for New Solutions",                       lessonSlugs: [], category: "compute" },
  { id: "sap-ch3", courseId: "SAP-C02", title: "Continuous Improvement for Existing Solutions",  lessonSlugs: [], category: "billing" },
  { id: "sap-ch4", courseId: "SAP-C02", title: "Accelerate Workload Migration & Modernization",  lessonSlugs: [], category: "network" },
];

// =====================================================================
// BLOCKCHAIN — Từ nền tảng đến chuyên gia (Phase 1: Ch.1–7)
// =====================================================================
const bcLessons: Lesson[] = [
  { slug: "bc-01-what-is-blockchain", courseId: "BLOCKCHAIN", title: "Blockchain là gì? Sổ cái phân tán & double-spending", shortTitle: "Blockchain là gì", chapter: "bc-ch1", order: 1, available: true,
    description: "Vấn đề double-spending, sổ cái phân tán, vì sao cần blockchain, so với DB truyền thống, các loại (public/private/permissioned).", file: "blockchain/bc-01-what-is-blockchain.md" },
  { slug: "bc-02-hashing-merkle", courseId: "BLOCKCHAIN", title: "Hàm băm (SHA-256) & cây Merkle", shortTitle: "Hashing & Merkle", chapter: "bc-ch1", order: 2, available: true,
    description: "Tính chất hàm băm mật mã, SHA-256, tính bất biến; cây Merkle & Merkle proof cho light client.", file: "blockchain/bc-02-hashing-merkle.md" },
  { slug: "bc-03-pubkey-signatures", courseId: "BLOCKCHAIN", title: "Mật mã khóa công khai & chữ ký số", shortTitle: "Chữ ký số", chapter: "bc-ch1", order: 3, available: true,
    description: "Public/private key, chữ ký số ECDSA/EdDSA (secp256k1), xác thực giao dịch, vì sao không lộ private key.", file: "blockchain/bc-03-pubkey-signatures.md" },
  { slug: "bc-04-block-chain-structure", courseId: "BLOCKCHAIN", title: "Cấu trúc block & chain, tính bất biến", shortTitle: "Cấu trúc chain", chapter: "bc-ch1", order: 4, available: true,
    description: "Cấu trúc 1 block (header, prev hash, nonce, Merkle root), liên kết chain, vì sao sửa 1 block phá cả chuỗi.", file: "blockchain/bc-04-block-chain-structure.md" },
  { slug: "bc-05-wallets-keys", courseId: "BLOCKCHAIN", title: "Ví, khóa, địa chỉ & seed phrase", shortTitle: "Ví & khóa", chapter: "bc-ch1", order: 5, available: true,
    description: "Từ private key → public key → address; HD wallet BIP-32/39/44, seed phrase, custodial vs non-custodial, an toàn khóa.", file: "blockchain/bc-05-wallets-keys.md" },
  { slug: "bc-06-distributed-byzantine", courseId: "BLOCKCHAIN", title: "Hệ phân tán & bài toán Byzantine Generals", shortTitle: "Byzantine Generals", chapter: "bc-ch2", order: 6, available: true,
    description: "Vì sao đồng thuận khó, bài toán các tướng Byzantine, BFT, CAP, vì sao blockchain là giải pháp cho niềm tin phi tập trung.", file: "blockchain/bc-06-distributed-byzantine.md" },
  { slug: "bc-07-proof-of-work", courseId: "BLOCKCHAIN", title: "Proof of Work: mining, difficulty, nonce", shortTitle: "Proof of Work", chapter: "bc-ch2", order: 7, available: true,
    description: "Cơ chế PoW, mining, difficulty & target, nonce, hashrate, tấn công 51%, chi phí năng lượng, Nakamoto consensus.", file: "blockchain/bc-07-proof-of-work.md" },
  { slug: "bc-08-proof-of-stake", courseId: "BLOCKCHAIN", title: "Proof of Stake: validator, slashing, finality", shortTitle: "Proof of Stake", chapter: "bc-ch2", order: 8, available: true,
    description: "PoS, validator & staking, slashing, Ethereum Gasper (Casper FFG + LMD-GHOST), finality, so PoW vs PoS.", file: "blockchain/bc-08-proof-of-stake.md" },
  { slug: "bc-09-other-consensus", courseId: "BLOCKCHAIN", title: "Các cơ chế đồng thuận khác", shortTitle: "Consensus khác", chapter: "bc-ch2", order: 9, available: true,
    description: "DPoS, PBFT, Tendermint/CometBFT, Avalanche; BFT vs Nakamoto; đánh đổi throughput/finality/decentralization.", file: "blockchain/bc-09-other-consensus.md" },
  { slug: "bc-10-forks-finality-p2p", courseId: "BLOCKCHAIN", title: "Fork choice, finality, P2P & mempool", shortTitle: "Fork & P2P", chapter: "bc-ch2", order: 10, available: true,
    description: "Fork choice rule, reorg, finality probabilistic vs deterministic, mạng P2P gossip, mempool, lan truyền giao dịch/block.", file: "blockchain/bc-10-forks-finality-p2p.md" },
  { slug: "bc-11-utxo-transactions", courseId: "BLOCKCHAIN", title: "Mô hình UTXO, cấu trúc giao dịch, phí", shortTitle: "UTXO", chapter: "bc-ch3", order: 11, available: true,
    description: "UTXO là gì, input/output, change, phí giao dịch, so UTXO vs account model, coin selection.", file: "blockchain/bc-11-utxo-transactions.md" },
  { slug: "bc-12-bitcoin-script-taproot", courseId: "BLOCKCHAIN", title: "Bitcoin Script, SegWit, Taproot", shortTitle: "Bitcoin Script", chapter: "bc-ch3", order: 12, available: true,
    description: "Bitcoin Script (stack-based), P2PKH/P2SH, multisig, SegWit, Taproot & Schnorr, MAST.", file: "blockchain/bc-12-bitcoin-script-taproot.md" },
  { slug: "bc-13-lightning-network", courseId: "BLOCKCHAIN", title: "Lightning Network (Layer 2 Bitcoin)", shortTitle: "Lightning Network", chapter: "bc-ch3", order: 13, available: true,
    description: "Payment channel, HTLC, định tuyến đa hop, off-chain, trade-off của Lightning; mô hình L2 đầu tiên.", file: "blockchain/bc-13-lightning-network.md" },
  { slug: "bc-14-ethereum-evm", courseId: "BLOCKCHAIN", title: "Ethereum: Account model, EVM, gas & opcode", shortTitle: "Ethereum & EVM", chapter: "bc-ch4", order: 14, available: true,
    description: "Account model (EOA vs contract), state trie, EVM & opcode, gas & gas limit, transaction lifecycle trên Ethereum.", file: "blockchain/bc-14-ethereum-evm.md" },
  { slug: "bc-15-solidity-basics", courseId: "BLOCKCHAIN", title: "Solidity cơ bản: storage/memory/calldata", shortTitle: "Solidity cơ bản", chapter: "bc-ch4", order: 15, available: true,
    description: "Cú pháp Solidity, kiểu dữ liệu, storage vs memory vs calldata, function visibility, modifier, mapping/struct.", file: "blockchain/bc-15-solidity-basics.md" },
  { slug: "bc-16-contract-lifecycle", courseId: "BLOCKCHAIN", title: "Vòng đời contract, ABI, event, deploy", shortTitle: "Contract lifecycle", chapter: "bc-ch4", order: 16, available: true,
    description: "Constructor & deploy, ABI encoding, call vs transaction, event & log, contract interaction, revert & error.", file: "blockchain/bc-16-contract-lifecycle.md" },
  { slug: "bc-17-token-standards", courseId: "BLOCKCHAIN", title: "Chuẩn token: ERC-20/721/1155/4626", shortTitle: "Token standards", chapter: "bc-ch4", order: 17, available: true,
    description: "ERC-20 (fungible), ERC-721 (NFT), ERC-1155 (multi-token), ERC-4626 (vault); interface & implement, approve/transferFrom.", file: "blockchain/bc-17-token-standards.md" },
  { slug: "bc-cap1-erc20-nft", courseId: "BLOCKCHAIN", title: "Capstone 1: Viết & deploy ERC-20 + ERC-721 có test", shortTitle: "Capstone 1: Token", chapter: "bc-ch4", order: 18, available: true,
    description: "Dự án thực chiến: viết token ERC-20 và NFT ERC-721 bằng Foundry, viết test đầy đủ, deploy lên testnet.", file: "blockchain/bc-cap1-erc20-nft.md" },
  { slug: "bc-18-foundry-dev", courseId: "BLOCKCHAIN", title: "Foundry/Hardhat: viết, test, deploy", shortTitle: "Foundry", chapter: "bc-ch5", order: 19, available: true,
    description: "Cài & dùng Foundry (forge/cast/anvil), viết test Solidity, fuzz test, fork test, script deploy; so với Hardhat.", file: "blockchain/bc-18-foundry-dev.md" },
  { slug: "bc-19-design-patterns", courseId: "BLOCKCHAIN", title: "Design patterns: access control & proxy nâng cấp", shortTitle: "Design patterns", chapter: "bc-ch5", order: 20, available: true,
    description: "Ownable/AccessControl, pull-over-push, checks-effects-interactions, proxy nâng cấp (Transparent/UUPS), storage collision.", file: "blockchain/bc-19-design-patterns.md" },
  { slug: "bc-20-oracles-gas", courseId: "BLOCKCHAIN", title: "Oracle (Chainlink) & tối ưu gas", shortTitle: "Oracle & Gas", chapter: "bc-ch5", order: 21, available: true,
    description: "Bài toán oracle & niềm tin dữ liệu ngoài chain, Chainlink price feed/VRF/Automation; kỹ thuật tối ưu gas thực tế.", file: "blockchain/bc-20-oracles-gas.md" },
  { slug: "bc-21-vulnerabilities", courseId: "BLOCKCHAIN", title: "Lỗ hổng smart contract kinh điển", shortTitle: "Lỗ hổng", chapter: "bc-ch6", order: 22, available: true,
    description: "Reentrancy, integer overflow, front-running/MEV, delegatecall, tx.origin, unchecked call, access control; cách phòng.", file: "blockchain/bc-21-vulnerabilities.md" },
  { slug: "bc-22-hacks-casestudy", courseId: "BLOCKCHAIN", title: "Case study các vụ hack lớn", shortTitle: "Hack case study", chapter: "bc-ch6", order: 23, available: true,
    description: "Phân tích The DAO, Parity, Ronin Bridge, Wormhole, Euler...; nguyên nhân gốc & bài học phòng thủ.", file: "blockchain/bc-22-hacks-casestudy.md" },
  { slug: "bc-23-audit-tools", courseId: "BLOCKCHAIN", title: "Quy trình audit: Slither, Echidna, formal verification", shortTitle: "Audit tools", chapter: "bc-ch6", order: 24, available: true,
    description: "Quy trình audit chuyên nghiệp, static analysis (Slither), fuzzing (Echidna/Foundry), invariant testing, formal verification.", file: "blockchain/bc-23-audit-tools.md" },
  { slug: "bc-cap2-audit", courseId: "BLOCKCHAIN", title: "Capstone 2: Audit contract có lỗ hổng, viết report", shortTitle: "Capstone 2: Audit", chapter: "bc-ch6", order: 25, available: true,
    description: "Dự án thực chiến: audit một contract có lỗ hổng cài sẵn, tìm bug, phân loại severity, viết audit report chuẩn.", file: "blockchain/bc-cap2-audit.md" },
  { slug: "bc-24-amm-liquidity", courseId: "BLOCKCHAIN", title: "AMM & liquidity pool (x·y=k), impermanent loss", shortTitle: "AMM", chapter: "bc-ch7", order: 26, available: true,
    description: "Constant product x·y=k, liquidity pool, LP token, slippage, impermanent loss, Uniswap V2/V3 concentrated liquidity.", file: "blockchain/bc-24-amm-liquidity.md" },
  { slug: "bc-25-lending-stablecoins", courseId: "BLOCKCHAIN", title: "Lending/borrowing & stablecoin", shortTitle: "Lending & Stablecoin", chapter: "bc-ch7", order: 27, available: true,
    description: "Over-collateralized lending (Aave/Compound), health factor, thanh lý; stablecoin fiat-backed/crypto-backed (DAI)/algorithmic.", file: "blockchain/bc-25-lending-stablecoins.md" },
  { slug: "bc-26-flashloan-yield", courseId: "BLOCKCHAIN", title: "Flash loan, yield farming, derivatives & rủi ro DeFi", shortTitle: "Flash loan & Yield", chapter: "bc-ch7", order: 28, available: true,
    description: "Flash loan & ứng dụng/tấn công, yield farming & liquidity mining, perps/derivatives, các rủi ro hệ thống DeFi.", file: "blockchain/bc-26-flashloan-yield.md" },
  { slug: "bc-cap3-amm", courseId: "BLOCKCHAIN", title: "Capstone 3: Build AMM mini (Uniswap V2 clone)", shortTitle: "Capstone 3: AMM", chapter: "bc-ch7", order: 29, available: true,
    description: "Dự án thực chiến: xây một AMM tối giản kiểu Uniswap V2 (pool, swap, add/remove liquidity) bằng Foundry + test.", file: "blockchain/bc-cap3-amm.md" },
  { slug: "bc-27-trilemma-scaling", courseId: "BLOCKCHAIN", title: "Blockchain trilemma & tổng quan mở rộng", shortTitle: "Trilemma & Scaling", chapter: "bc-ch8", order: 30, available: true,
    description: "Bộ ba bất khả thi (decentralization/security/scalability), on-chain vs off-chain scaling, sharding, vì sao L1 khó scale trực tiếp.", file: "blockchain/bc-27-trilemma-scaling.md" },
  { slug: "bc-28-rollups", courseId: "BLOCKCHAIN", title: "Rollup: Optimistic vs ZK", shortTitle: "Rollups", chapter: "bc-ch8", order: 31, available: true,
    description: "Rollup là gì, Optimistic (fraud proof, challenge period) vs ZK (validity proof), sequencer, so Arbitrum/Optimism vs zkSync/StarkNet.", file: "blockchain/bc-28-rollups.md" },
  { slug: "bc-29-data-availability", courseId: "BLOCKCHAIN", title: "Data availability, danksharding & modular blockchain", shortTitle: "DA & Modular", chapter: "bc-ch8", order: 32, available: true,
    description: "Bài toán data availability, DAS, EIP-4844 blob & danksharding, modular blockchain (execution/settlement/DA/consensus), Celestia.", file: "blockchain/bc-29-data-availability.md" },
  { slug: "bc-30-zk-proofs", courseId: "BLOCKCHAIN", title: "Zero-knowledge proofs: SNARK vs STARK", shortTitle: "ZK Proofs", chapter: "bc-ch9", order: 33, available: true,
    description: "Bản chất ZKP (completeness/soundness/zero-knowledge), interactive vs non-interactive, ZK-SNARK vs ZK-STARK (trusted setup, kích thước proof), ứng dụng.", file: "blockchain/bc-30-zk-proofs.md" },
  { slug: "bc-31-zk-circuits", courseId: "BLOCKCHAIN", title: "ZK hands-on: viết circuit & verify on-chain", shortTitle: "ZK Circuits", chapter: "bc-ch9", order: 34, available: true,
    description: "Arithmetic circuit & constraint, viết circuit bằng Circom/Noir, sinh proof, verifier contract on-chain; ví dụ chứng minh biết preimage. CODE.", file: "blockchain/bc-31-zk-circuits.md" },
  { slug: "bc-32-advanced-crypto", courseId: "BLOCKCHAIN", title: "Mật mã nâng cao: KZG, MPC, threshold, BLS", shortTitle: "Advanced Crypto", chapter: "bc-ch9", order: 35, available: true,
    description: "Polynomial commitment (KZG), multi-party computation (MPC), threshold signature, BLS signature & aggregation; ứng dụng trong blockchain.", file: "blockchain/bc-32-advanced-crypto.md" },
  { slug: "bc-33-bridges", courseId: "BLOCKCHAIN", title: "Cross-chain bridge & bảo mật bridge", shortTitle: "Bridges", chapter: "bc-ch10", order: 36, available: true,
    description: "Vì sao cần bridge, lock-mint vs burn-mint vs liquidity pool, trust model (validator/oracle/light-client), vì sao bridge hay bị hack (Ronin/Wormhole).", file: "blockchain/bc-33-bridges.md" },
  { slug: "bc-34-cosmos-polkadot", courseId: "BLOCKCHAIN", title: "Cosmos (IBC) & Polkadot (parachain)", shortTitle: "Cosmos & Polkadot", chapter: "bc-ch10", order: 37, available: true,
    description: "App-chain thesis, Cosmos SDK & IBC, Tendermint; Polkadot relay chain & parachain & shared security; multi-chain vs cross-chain, wrapped assets.", file: "blockchain/bc-34-cosmos-polkadot.md" },
  { slug: "bc-35-solana", courseId: "BLOCKCHAIN", title: "Solana: account model, Sealevel & Anchor", shortTitle: "Solana", chapter: "bc-ch10", order: 38, available: true,
    description: "Kiến trúc Solana khác EVM: account model (program tách data), parallel execution Sealevel, Proof of History, phí thấp; viết program bằng Anchor (Rust). CODE.", file: "blockchain/bc-35-solana.md" },
  { slug: "bc-36-move-aptos-sui", courseId: "BLOCKCHAIN", title: "Move: resource model (Aptos & Sui)", shortTitle: "Move / Aptos-Sui", chapter: "bc-ch10", order: 39, available: true,
    description: "Ngôn ngữ Move & tư duy resource (không copy/drop tuỳ tiện), object model của Sui, khác biệt với Solidity, vì sao an toàn hơn cho tài sản. CODE Move.", file: "blockchain/bc-36-move-aptos-sui.md" },
  { slug: "bc-37-tokenomics", courseId: "BLOCKCHAIN", title: "Thiết kế token & cơ chế khuyến khích", shortTitle: "Tokenomics", chapter: "bc-ch11", order: 40, available: true,
    description: "Utility/governance/security token, supply & emission & sink, vesting & unlock, ve-model, incentive alignment, các phản mẫu (ponzi/hyperinflation).", file: "blockchain/bc-37-tokenomics.md" },
  { slug: "bc-38-governance-dao", courseId: "BLOCKCHAIN", title: "Governance, DAO & treasury", shortTitle: "Governance & DAO", chapter: "bc-ch11", order: 41, available: true,
    description: "On-chain vs off-chain governance (Snapshot), token voting & quorum & timelock, ủy quyền, cấu trúc DAO & treasury (Gnosis Safe), tấn công governance.", file: "blockchain/bc-38-governance-dao.md" },
  { slug: "bc-39-nft-metadata", courseId: "BLOCKCHAIN", title: "NFT: chuẩn, metadata & lưu trữ phi tập trung", shortTitle: "NFT & Metadata", chapter: "bc-ch12", order: 42, available: true,
    description: "NFT metadata (tokenURI, JSON schema), on-chain vs off-chain metadata, IPFS (CID, pinning) & Arweave; royalty; ứng dụng ngoài PFP (ticket, RWA).", file: "blockchain/bc-39-nft-metadata.md" },
  { slug: "bc-40-account-abstraction", courseId: "BLOCKCHAIN", title: "Account abstraction (ERC-4337) & Web3 stack", shortTitle: "Account Abstraction", chapter: "bc-ch12", order: 43, available: true,
    description: "EOA vs smart account, ERC-4337 (UserOp, bundler, EntryPoint, paymaster), gasless & social recovery & session key; Web3 stack (RPC, wallet, node provider).", file: "blockchain/bc-40-account-abstraction.md" },
  { slug: "bc-41-did-rwa", courseId: "BLOCKCHAIN", title: "Identity (DID), RWA & CBDC", shortTitle: "DID / RWA / CBDC", chapter: "bc-ch12", order: 44, available: true,
    description: "Decentralized identity (DID, verifiable credentials, soulbound token), tokenization tài sản thực (RWA), stablecoin định chế & CBDC; góc nhìn ứng dụng thật.", file: "blockchain/bc-41-did-rwa.md" },
  { slug: "bc-42-mev", courseId: "BLOCKCHAIN", title: "MEV chuyên sâu: Flashbots & PBS", shortTitle: "MEV", chapter: "bc-ch13", order: 45, available: true,
    description: "MEV là gì (arbitrage/sandwich/liquidation), mempool công khai & bot, Flashbots & MEV-Boost, proposer-builder separation (PBS), tác hại & giảm thiểu.", file: "blockchain/bc-42-mev.md" },
  { slug: "bc-43-restaking-intents", courseId: "BLOCKCHAIN", title: "Restaking (EigenLayer) & intents", shortTitle: "Restaking & Intents", chapter: "bc-ch13", order: 46, available: true,
    description: "Restaking & shared security (EigenLayer AVS), rủi ro cascading slashing; intent-based architecture (solver, order flow) & xu hướng tương lai.", file: "blockchain/bc-43-restaking-intents.md" },
  { slug: "bc-44-privacy-regulatory", courseId: "BLOCKCHAIN", title: "Privacy chains & bối cảnh pháp lý", shortTitle: "Privacy & Regulation", chapter: "bc-ch13", order: 47, available: true,
    description: "Privacy: Monero (ring signature), Zcash (zk-SNARK shielded), mixer (Tornado) & tranh cãi; bối cảnh pháp lý (AML/KYC, travel rule, phân loại token, thuế).", file: "blockchain/bc-44-privacy-regulatory.md" },
  { slug: "bc-45-web3-frontend", courseId: "BLOCKCHAIN", title: "Full-stack Web3: viem/wagmi & kết nối ví", shortTitle: "Web3 Frontend", chapter: "bc-ch14", order: 48, available: true,
    description: "Kết nối frontend với contract: viem/wagmi, provider & signer, đọc (read) & ghi (write) contract, ký message, xử lý tx state & sự kiện. CODE React.", file: "blockchain/bc-45-web3-frontend.md" },
  { slug: "bc-46-indexing-thegraph", courseId: "BLOCKCHAIN", title: "Indexing on-chain data: The Graph & IPFS", shortTitle: "Indexing & The Graph", chapter: "bc-ch14", order: 49, available: true,
    description: "Vì sao cần index, subgraph (schema, mapping, handler), query GraphQL, event-driven indexing; lưu trữ file với IPFS pinning. CODE.", file: "blockchain/bc-46-indexing-thegraph.md" },
  { slug: "bc-cap4-fullstack-dapp", courseId: "BLOCKCHAIN", title: "Capstone 4: Full dApp (contract + frontend + indexer)", shortTitle: "Capstone 4: dApp", chapter: "bc-ch14", order: 50, available: true,
    description: "Dự án thực chiến end-to-end: contract Foundry + frontend React/wagmi + subgraph The Graph, ghép thành một dApp hoàn chỉnh deploy testnet. NHIỀU CODE.", file: "blockchain/bc-cap4-fullstack-dapp.md" },
  { slug: "bc-47-node-validator", courseId: "BLOCKCHAIN", title: "Chạy node & validator, RPC infra, monitoring", shortTitle: "Node & Infra", chapter: "bc-ch15", order: 51, available: true,
    description: "Full/archive node, execution + consensus client (Geth+Lighthouse), chạy validator Ethereum (staking, key, slashing protection), RPC provider, monitoring.", file: "blockchain/bc-47-node-validator.md" },
  { slug: "bc-48-cryptoeconomics", courseId: "BLOCKCHAIN", title: "Cryptoeconomics, mechanism design & on-chain analytics", shortTitle: "Cryptoeconomics", chapter: "bc-ch15", order: 52, available: true,
    description: "Game theory & mechanism design (incentive, Schelling point, staking/slashing econ), token velocity; đọc & điều tra on-chain (Dune, block explorer, trace).", file: "blockchain/bc-48-cryptoeconomics.md" },
  { slug: "bc-cap5-build-blockchain", courseId: "BLOCKCHAIN", title: "Capstone 5: Tự xây blockchain mini từ đầu", shortTitle: "Capstone 5: Build chain", chapter: "bc-ch16", order: 53, available: true,
    description: "Dự án tổng kết: tự code một blockchain tối giản (block, hash link, PoW mining, mempool, P2P đơn giản, ví & chữ ký) — ghép mọi kiến thức đã học. NHIỀU CODE.", file: "blockchain/bc-cap5-build-blockchain.md" },
];

const bcChapters: Chapter[] = [
  { id: "bc-ch1", courseId: "BLOCKCHAIN", title: "Chương 1 — Nền tảng mật mã & cấu trúc", lessonSlugs: ["bc-01-what-is-blockchain", "bc-02-hashing-merkle", "bc-03-pubkey-signatures", "bc-04-block-chain-structure", "bc-05-wallets-keys"], category: "security" },
  { id: "bc-ch2", courseId: "BLOCKCHAIN", title: "Chương 2 — Đồng thuận & Mạng", lessonSlugs: ["bc-06-distributed-byzantine", "bc-07-proof-of-work", "bc-08-proof-of-stake", "bc-09-other-consensus", "bc-10-forks-finality-p2p"], category: "network" },
  { id: "bc-ch3", courseId: "BLOCKCHAIN", title: "Chương 3 — Bitcoin chuyên sâu", lessonSlugs: ["bc-11-utxo-transactions", "bc-12-bitcoin-script-taproot", "bc-13-lightning-network"], category: "foundation" },
  { id: "bc-ch4", courseId: "BLOCKCHAIN", title: "Chương 4 — Ethereum & Smart Contract", lessonSlugs: ["bc-14-ethereum-evm", "bc-15-solidity-basics", "bc-16-contract-lifecycle", "bc-17-token-standards", "bc-cap1-erc20-nft"], category: "compute" },
  { id: "bc-ch5", courseId: "BLOCKCHAIN", title: "Chương 5 — Phát triển Smart Contract", lessonSlugs: ["bc-18-foundry-dev", "bc-19-design-patterns", "bc-20-oracles-gas"], category: "compute" },
  { id: "bc-ch6", courseId: "BLOCKCHAIN", title: "Chương 6 — Bảo mật & Audit", lessonSlugs: ["bc-21-vulnerabilities", "bc-22-hacks-casestudy", "bc-23-audit-tools", "bc-cap2-audit"], category: "security" },
  { id: "bc-ch7", courseId: "BLOCKCHAIN", title: "Chương 7 — DeFi (Tài chính phi tập trung)", lessonSlugs: ["bc-24-amm-liquidity", "bc-25-lending-stablecoins", "bc-26-flashloan-yield", "bc-cap3-amm"], category: "billing" },
  { id: "bc-ch8", courseId: "BLOCKCHAIN", title: "Chương 8 — Mở rộng & Layer 2", lessonSlugs: ["bc-27-trilemma-scaling", "bc-28-rollups", "bc-29-data-availability"], category: "network" },
  { id: "bc-ch9", courseId: "BLOCKCHAIN", title: "Chương 9 — ZK & Mật mã nâng cao", lessonSlugs: ["bc-30-zk-proofs", "bc-31-zk-circuits", "bc-32-advanced-crypto"], category: "security" },
  { id: "bc-ch10", courseId: "BLOCKCHAIN", title: "Chương 10 — Liên thông & Non-EVM", lessonSlugs: ["bc-33-bridges", "bc-34-cosmos-polkadot", "bc-35-solana", "bc-36-move-aptos-sui"], category: "network" },
  { id: "bc-ch11", courseId: "BLOCKCHAIN", title: "Chương 11 — Tokenomics, Governance & DAO", lessonSlugs: ["bc-37-tokenomics", "bc-38-governance-dao"], category: "billing" },
  { id: "bc-ch12", courseId: "BLOCKCHAIN", title: "Chương 12 — NFT, Web3 & Account Abstraction", lessonSlugs: ["bc-39-nft-metadata", "bc-40-account-abstraction", "bc-41-did-rwa"], category: "compute" },
  { id: "bc-ch13", courseId: "BLOCKCHAIN", title: "Chương 13 — Frontier & Chuyên gia", lessonSlugs: ["bc-42-mev", "bc-43-restaking-intents", "bc-44-privacy-regulatory"], category: "security" },
  { id: "bc-ch14", courseId: "BLOCKCHAIN", title: "Chương 14 — Full-stack Web3 dApp", lessonSlugs: ["bc-45-web3-frontend", "bc-46-indexing-thegraph", "bc-cap4-fullstack-dapp"], category: "compute" },
  { id: "bc-ch15", courseId: "BLOCKCHAIN", title: "Chương 15 — Infra & Cryptoeconomics", lessonSlugs: ["bc-47-node-validator", "bc-48-cryptoeconomics"], category: "foundation" },
  { id: "bc-ch16", courseId: "BLOCKCHAIN", title: "Chương 16 — Capstone tổng", lessonSlugs: ["bc-cap5-build-blockchain"], category: "compute" },
];

// =====================================================================
// DISTRIBUTED — Distributed Systems Foundations (Tầng 0)
// =====================================================================
const dsLessons: Lesson[] = [
  { slug: "ds-01-what-is-distributed", courseId: "DISTRIBUTED", title: "Hệ phân tán là gì? Vì sao khó — 8 fallacies", shortTitle: "Hệ phân tán là gì", chapter: "dist-ch1", order: 1, available: true,
    description: "Định nghĩa hệ phân tán, vì sao cần, 8 fallacies of distributed computing, các thách thức cốt lõi (partial failure, concurrency, no global clock).", file: "distributed/ds-01-what-is-distributed.md" },
  { slug: "ds-02-system-models", courseId: "DISTRIBUTED", title: "Mô hình hệ thống & mô hình lỗi", shortTitle: "System & Failure Models", chapter: "dist-ch1", order: 2, available: true,
    description: "Synchronous vs asynchronous vs partial-synchronous, failure models (crash-stop, crash-recovery, omission, Byzantine), giả định mạng.", file: "distributed/ds-02-system-models.md" },
  { slug: "ds-03-rpc-networking", courseId: "DISTRIBUTED", title: "Giao tiếp: RPC, network partition & message anomalies", shortTitle: "RPC & Network", chapter: "dist-ch1", order: 3, available: true,
    description: "RPC & fallacy 'network reliable', message loss/duplication/reordering, network partition, timeout vs failure không phân biệt được, at-least/at-most/exactly-once.", file: "distributed/ds-03-rpc-networking.md" },
  { slug: "ds-04-cap-pacelc", courseId: "DISTRIBUTED", title: "CAP theorem & PACELC", shortTitle: "CAP & PACELC", chapter: "dist-ch2", order: 4, available: true,
    description: "CAP (consistency/availability/partition-tolerance) phát biểu đúng, vì sao P không tránh được, CP vs AP, PACELC bổ sung latency; ví dụ hệ thực tế.", file: "distributed/ds-04-cap-pacelc.md" },
  { slug: "ds-05-consistency-models", courseId: "DISTRIBUTED", title: "Consistency models: từ linearizability tới eventual", shortTitle: "Consistency Models", chapter: "dist-ch2", order: 5, available: true,
    description: "Linearizability, sequential, causal, eventual consistency; read-your-writes/monotonic; đánh đổi giữa mạnh và hiệu năng; ví dụ minh hoạ.", file: "distributed/ds-05-consistency-models.md" },
  { slug: "ds-06-isolation-vs-consistency", courseId: "DISTRIBUTED", title: "Isolation levels (ACID) vs distributed consistency", shortTitle: "Isolation vs Consistency", chapter: "dist-ch2", order: 6, available: true,
    description: "ACID isolation (read committed, snapshot, serializable) khác gì replication consistency, anomalies (dirty/phantom/write skew), vì sao hai trục khác nhau.", file: "distributed/ds-06-isolation-vs-consistency.md" },
  { slug: "ds-07-replication-leader", courseId: "DISTRIBUTED", title: "Replication: leader-follower", shortTitle: "Leader-Follower", chapter: "dist-ch3", order: 7, available: true,
    description: "Single-leader replication, sync vs async, replication lag & eventual consistency, failover & split-brain, đọc từ follower.", file: "distributed/ds-07-replication-leader.md" },
  { slug: "ds-08-multi-leader", courseId: "DISTRIBUTED", title: "Multi-leader & conflict resolution", shortTitle: "Multi-Leader", chapter: "dist-ch3", order: 8, available: true,
    description: "Multi-leader (multi-DC, offline client), write conflict, giải quyết xung đột (LWW, version vector, CRDT ý niệm), topology.", file: "distributed/ds-08-multi-leader.md" },
  { slug: "ds-09-quorum", courseId: "DISTRIBUTED", title: "Leaderless & quorum (Dynamo-style)", shortTitle: "Quorum", chapter: "dist-ch3", order: 9, available: true,
    description: "Leaderless replication, quorum R+W>N, sloppy quorum & hinted handoff, read repair & anti-entropy, đọc/ghi trong khi node lỗi.", file: "distributed/ds-09-quorum.md" },
  { slug: "ds-10-partitioning", courseId: "DISTRIBUTED", title: "Partitioning / Sharding", shortTitle: "Partitioning", chapter: "dist-ch4", order: 10, available: true,
    description: "Vì sao phải partition, range vs hash partitioning, hot spot & skew, secondary index (local vs global), partition + replication kết hợp.", file: "distributed/ds-10-partitioning.md" },
  { slug: "ds-11-consistent-hashing", courseId: "DISTRIBUTED", title: "Consistent hashing & virtual nodes", shortTitle: "Consistent Hashing", chapter: "dist-ch4", order: 11, available: true,
    description: "Bài toán rehash khi thêm/bớt node, consistent hashing ring, virtual node để cân bằng, ứng dụng (Cassandra, Redis Cluster, CDN). CODE minh hoạ.", file: "distributed/ds-11-consistent-hashing.md" },
  { slug: "ds-12-rebalancing-routing", courseId: "DISTRIBUTED", title: "Rebalancing & request routing", shortTitle: "Rebalancing & Routing", chapter: "dist-ch4", order: 12, available: true,
    description: "Chiến lược rebalance (fixed partitions, dynamic), request routing (client-aware, proxy, coordinator), service discovery & gossip.", file: "distributed/ds-12-rebalancing-routing.md" },
  { slug: "ds-13-consensus-flp", courseId: "DISTRIBUTED", title: "Bài toán consensus & FLP impossibility", shortTitle: "Consensus & FLP", chapter: "dist-ch5", order: 13, available: true,
    description: "Consensus là gì (agreement/validity/termination), FLP impossibility (async + 1 lỗi), vì sao cần timeout/randomness, quan hệ với atomic broadcast.", file: "distributed/ds-13-consensus-flp.md" },
  { slug: "ds-14-raft", courseId: "DISTRIBUTED", title: "Raft: leader election & log replication", shortTitle: "Raft", chapter: "dist-ch5", order: 14, available: true,
    description: "Raft từng bước: term, leader election, log replication, commit index, safety (log matching, election restriction), membership change; vì sao dễ hiểu hơn Paxos.", file: "distributed/ds-14-raft.md" },
  { slug: "ds-15-coordination", courseId: "DISTRIBUTED", title: "Paxos ý niệm & coordination (ZooKeeper/etcd)", shortTitle: "Coordination", chapter: "dist-ch5", order: 15, available: true,
    description: "Ý niệm Paxos/Multi-Paxos, coordination service (ZooKeeper, etcd), znode/lease/watch, distributed lock & leader election dùng chúng, chống split-brain.", file: "distributed/ds-15-coordination.md" },
  { slug: "ds-16-clocks", courseId: "DISTRIBUTED", title: "Đồng hồ vật lý, NTP & Lamport clock", shortTitle: "Clocks", chapter: "dist-ch6", order: 16, available: true,
    description: "Vì sao không có global clock, clock skew & NTP, monotonic vs wall clock, Lamport logical clock & happens-before, giới hạn của nó.", file: "distributed/ds-16-clocks.md" },
  { slug: "ds-17-vector-clocks", courseId: "DISTRIBUTED", title: "Vector clock & causal ordering", shortTitle: "Vector Clocks", chapter: "dist-ch6", order: 17, available: true,
    description: "Vector clock phát hiện concurrent vs causal, so với Lamport, ứng dụng phát hiện conflict (Dynamo), version vector; ví dụ tính tay.", file: "distributed/ds-17-vector-clocks.md" },
  { slug: "ds-18-ordering-broadcast", courseId: "DISTRIBUTED", title: "Ordering & total order broadcast", shortTitle: "Ordering & Broadcast", chapter: "dist-ch6", order: 18, available: true,
    description: "FIFO/causal/total order broadcast, quan hệ total order broadcast tương đương consensus, ứng dụng trong replicated state machine & Kafka.", file: "distributed/ds-18-ordering-broadcast.md" },
  { slug: "ds-19-distributed-txn", courseId: "DISTRIBUTED", title: "Distributed transaction: 2PC & 3PC", shortTitle: "Distributed Txn", chapter: "dist-ch7", order: 19, available: true,
    description: "Atomic commit qua nhiều node, two-phase commit (coordinator, prepare/commit), điểm chết coordinator, 3PC, XA; vì sao 2PC hay bị né trong microservices.", file: "distributed/ds-19-distributed-txn.md" },
  { slug: "ds-20-saga", courseId: "DISTRIBUTED", title: "Saga pattern & compensation", shortTitle: "Saga", chapter: "dist-ch7", order: 20, available: true,
    description: "Saga thay 2PC cho long-lived transaction, choreography vs orchestration, compensating action, semantic lock, so trade-off với 2PC. Ví dụ đặt hàng.", file: "distributed/ds-20-saga.md" },
  { slug: "ds-21-idempotency", courseId: "DISTRIBUTED", title: "Idempotency, dedup & exactly-once", shortTitle: "Idempotency", chapter: "dist-ch7", order: 21, available: true,
    description: "Vì sao retry cần idempotent, idempotency key, dedup store, exactly-once là 'effectively-once' (at-least-once + idempotent), outbox/inbox pattern. CODE.", file: "distributed/ds-21-idempotency.md" },
  { slug: "ds-22-reliability-patterns", courseId: "DISTRIBUTED", title: "Reliability patterns: timeout, retry, circuit breaker, backpressure", shortTitle: "Reliability Patterns", chapter: "dist-ch7", order: 22, available: true,
    description: "Timeout & deadline propagation, retry + exponential backoff + jitter, circuit breaker, bulkhead, backpressure & load shedding, rate limiting. CODE minh hoạ.", file: "distributed/ds-22-reliability-patterns.md" },
  { slug: "ds-cap-kvstore", courseId: "DISTRIBUTED", title: "Capstone: Thiết kế một distributed KV store", shortTitle: "Capstone: KV Store", chapter: "dist-ch7", order: 23, available: true,
    description: "Ghép mọi kiến thức: thiết kế & lý luận một distributed key-value store — partition (consistent hashing) + replication (quorum) + consensus (Raft cho metadata) + xử lý lỗi; phân tích trade-off theo CAP.", file: "distributed/ds-cap-kvstore.md" },
];

const dsChapters: Chapter[] = [
  { id: "dist-ch1", courseId: "DISTRIBUTED", title: "Chương 1 — Nền tảng hệ phân tán", lessonSlugs: ["ds-01-what-is-distributed", "ds-02-system-models", "ds-03-rpc-networking"], category: "foundation" },
  { id: "dist-ch2", courseId: "DISTRIBUTED", title: "Chương 2 — Nhất quán & CAP", lessonSlugs: ["ds-04-cap-pacelc", "ds-05-consistency-models", "ds-06-isolation-vs-consistency"], category: "storage" },
  { id: "dist-ch3", courseId: "DISTRIBUTED", title: "Chương 3 — Replication", lessonSlugs: ["ds-07-replication-leader", "ds-08-multi-leader", "ds-09-quorum"], category: "storage" },
  { id: "dist-ch4", courseId: "DISTRIBUTED", title: "Chương 4 — Partitioning & Sharding", lessonSlugs: ["ds-10-partitioning", "ds-11-consistent-hashing", "ds-12-rebalancing-routing"], category: "network" },
  { id: "dist-ch5", courseId: "DISTRIBUTED", title: "Chương 5 — Consensus & Coordination", lessonSlugs: ["ds-13-consensus-flp", "ds-14-raft", "ds-15-coordination"], category: "compute" },
  { id: "dist-ch6", courseId: "DISTRIBUTED", title: "Chương 6 — Thời gian & Thứ tự", lessonSlugs: ["ds-16-clocks", "ds-17-vector-clocks", "ds-18-ordering-broadcast"], category: "foundation" },
  { id: "dist-ch7", courseId: "DISTRIBUTED", title: "Chương 7 — Giao dịch phân tán & Reliability", lessonSlugs: ["ds-19-distributed-txn", "ds-20-saga", "ds-21-idempotency", "ds-22-reliability-patterns", "ds-cap-kvstore"], category: "security" },
];

// =====================================================================
// DATASTORES — Data & Caching Systems (Tầng 1)
// =====================================================================
const dstLessons: Lesson[] = [
  { slug: "dst-01-redis-intro", courseId: "DATASTORES", title: "Redis là gì? In-memory, single-thread & use cases", shortTitle: "Redis là gì", chapter: "dst-ch1", order: 1, available: true,
    description: "Redis in-memory, mô hình single-thread event loop & vì sao vẫn nhanh, so với memcached, các use case (cache, session, queue, rate limit, leaderboard), cài & redis-cli.", file: "datastores/dst-01-redis-intro.md" },
  { slug: "dst-02-redis-datastructures", courseId: "DATASTORES", title: "Redis data structures: string, hash, list, set, zset...", shortTitle: "Redis Data Structures", chapter: "dst-ch1", order: 2, available: true,
    description: "String, Hash, List, Set, Sorted Set (zset), Bitmap, HyperLogLog, Geo, Bitfield; lệnh chính & độ phức tạp, khi nào dùng cấu trúc nào. CODE redis-cli.", file: "datastores/dst-02-redis-datastructures.md" },
  { slug: "dst-03-redis-persistence", courseId: "DATASTORES", title: "Redis persistence, eviction & memory", shortTitle: "Persistence & Eviction", chapter: "dst-ch1", order: 3, available: true,
    description: "RDB snapshot vs AOF (append-only), trade-off durability/performance, hybrid; TTL & expiration; maxmemory & eviction policies (LRU/LFU/TTL); memory optimization.", file: "datastores/dst-03-redis-persistence.md" },
  { slug: "dst-04-redis-pubsub-streams", courseId: "DATASTORES", title: "Redis Pub/Sub & Streams", shortTitle: "Pub/Sub & Streams", chapter: "dst-ch1", order: 4, available: true,
    description: "Pub/Sub (fire-and-forget) vs Streams (bền, consumer group, ack, replay); XADD/XREAD/XACK; so Redis Streams với Kafka nhẹ; keyspace notifications. CODE.", file: "datastores/dst-04-redis-pubsub-streams.md" },
  { slug: "dst-05-redis-cluster", courseId: "DATASTORES", title: "Redis replication, Sentinel & Cluster", shortTitle: "Redis Cluster", chapter: "dst-ch1", order: 5, available: true,
    description: "Replication master-replica, Sentinel (HA & failover), Cluster mode (16384 hash slot, resharding, MOVED/ASK), client-side & smart client; giới hạn multi-key.", file: "datastores/dst-05-redis-cluster.md" },
  { slug: "dst-06-redis-patterns", courseId: "DATASTORES", title: "Redis patterns: lock, rate limiter, leaderboard, cache", shortTitle: "Redis Patterns", chapter: "dst-ch1", order: 6, available: true,
    description: "Distributed lock (SET NX PX, Redlock & tranh cãi), rate limiter (token bucket/sliding window bằng Lua), leaderboard (zset), session store, cache-aside; Lua script atomicity. CODE.", file: "datastores/dst-06-redis-patterns.md" },
  { slug: "dst-07-cache-strategies", courseId: "DATASTORES", title: "Cache strategies: aside, read/write-through, write-behind", shortTitle: "Cache Strategies", chapter: "dst-ch2", order: 7, available: true,
    description: "Cache-aside (lazy), read-through, write-through, write-behind (write-back); TTL & freshness; đặt cache ở đâu (client/CDN/app/DB); trade-off nhất quán vs hiệu năng. Sơ đồ.", file: "datastores/dst-07-cache-strategies.md" },
  { slug: "dst-08-cache-pitfalls", courseId: "DATASTORES", title: "Cache pitfalls: stampede, penetration, avalanche, hot key", shortTitle: "Cache Pitfalls", chapter: "dst-ch2", order: 8, available: true,
    description: "Cache stampede/thundering herd (lock, request coalescing, early recompute), penetration (null cache, bloom filter), avalanche (jitter TTL), hot key & big key; invalidation & consistency. CODE.", file: "datastores/dst-08-cache-pitfalls.md" },
  { slug: "dst-09-nosql-overview", courseId: "DATASTORES", title: "NoSQL taxonomy & khi nào rời bỏ SQL", shortTitle: "NoSQL Overview", chapter: "dst-ch3", order: 9, available: true,
    description: "Vì sao NoSQL ra đời (scale, schema linh hoạt), 4 họ: key-value, document, wide-column, graph; BASE vs ACID; CAP positioning; khi nào KHÔNG nên bỏ SQL. Bảng so sánh.", file: "datastores/dst-09-nosql-overview.md" },
  { slug: "dst-10-document-mongodb", courseId: "DATASTORES", title: "Document DB: MongoDB", shortTitle: "MongoDB", chapter: "dst-ch3", order: 10, available: true,
    description: "Document model (BSON), embedding vs referencing, index (single/compound/multikey), aggregation pipeline, replica set & sharding, transaction; khi nào dùng document. CODE query.", file: "datastores/dst-10-document-mongodb.md" },
  { slug: "dst-11-widecolumn-cassandra", courseId: "DATASTORES", title: "Wide-column: Cassandra & DynamoDB", shortTitle: "Cassandra & DynamoDB", chapter: "dst-ch3", order: 11, available: true,
    description: "Wide-column model, partition key vs clustering key, query-first design, tunable consistency (Cassandra), DynamoDB (on-demand, GSI/LSI); write-optimized (LSM); anti-pattern. CODE CQL.", file: "datastores/dst-11-widecolumn-cassandra.md" },
  { slug: "dst-12-data-modeling-nosql", courseId: "DATASTORES", title: "Data modeling NoSQL: access-pattern first", shortTitle: "NoSQL Data Modeling", chapter: "dst-ch3", order: 12, available: true,
    description: "Tư duy ngược với SQL: thiết kế theo access pattern, denormalization & duplication có chủ đích, single-table design (DynamoDB), xử lý quan hệ many-to-many, khi nào dùng. Ví dụ cụ thể.", file: "datastores/dst-12-data-modeling-nosql.md" },
  { slug: "dst-13-search-elasticsearch", courseId: "DATASTORES", title: "Search: Elasticsearch — inverted index & relevance", shortTitle: "Elasticsearch", chapter: "dst-ch4", order: 13, available: true,
    description: "Vì sao DB kém cho full-text; inverted index, analyzer (tokenize/normalize), relevance scoring (TF-IDF/BM25), mapping & document; Elasticsearch vs OpenSearch. CODE query.", file: "datastores/dst-13-search-elasticsearch.md" },
  { slug: "dst-14-search-operations", courseId: "DATASTORES", title: "Elasticsearch vận hành: query DSL, aggregation, scale", shortTitle: "ES Operations", chapter: "dst-ch4", order: 14, available: true,
    description: "Query DSL (match/term/bool/filter context), aggregation (bucket/metric), shard & replica & routing, index lifecycle, refresh/near-real-time; khi nào ES vs DB, đồng bộ dữ liệu (CDC). CODE.", file: "datastores/dst-14-search-operations.md" },
  { slug: "dst-15-oltp-vs-olap", courseId: "DATASTORES", title: "OLTP vs OLAP: row vs columnar", shortTitle: "OLTP vs OLAP", chapter: "dst-ch5", order: 15, available: true,
    description: "OLTP (giao dịch, nhiều write nhỏ) vs OLAP (phân tích, quét lớn); row-oriented vs columnar storage & vì sao columnar nhanh cho analytics (compression, vectorization); data warehouse vs lake vs lakehouse. Sơ đồ.", file: "datastores/dst-15-oltp-vs-olap.md" },
  { slug: "dst-16-clickhouse", courseId: "DATASTORES", title: "ClickHouse: columnar OLAP tốc độ cao", shortTitle: "ClickHouse", chapter: "dst-ch5", order: 16, available: true,
    description: "ClickHouse kiến trúc columnar, MergeTree engine & primary index thưa, partition, materialized view, vì sao cực nhanh cho aggregation; khi nào dùng ClickHouse vs data warehouse. CODE SQL.", file: "datastores/dst-16-clickhouse.md" },
  { slug: "dst-17-timeseries", courseId: "DATASTORES", title: "Time-series DB: Prometheus TSDB & InfluxDB", shortTitle: "Time-Series DB", chapter: "dst-ch5", order: 17, available: true,
    description: "Đặc thù dữ liệu time-series (append-heavy, time-ordered, downsampling, retention), Prometheus TSDB (labels, chunks) & InfluxDB, so với lưu time-series trong SQL; cardinality problem.", file: "datastores/dst-17-timeseries.md" },
  { slug: "dst-18-polyglot-persistence", courseId: "DATASTORES", title: "Polyglot persistence: chọn đúng store", shortTitle: "Polyglot Persistence", chapter: "dst-ch6", order: 18, available: true,
    description: "Không có store 'một cho tất cả'; framework quyết định theo access pattern + consistency + scale + chi phí; kết hợp nhiều store & giữ đồng bộ (CDC, dual-write & rủi ro, outbox). Bảng decision.", file: "datastores/dst-18-polyglot-persistence.md" },
  { slug: "dst-cap-storage", courseId: "DATASTORES", title: "Capstone: Thiết kế storage layer cho một hệ thực tế", shortTitle: "Capstone: Storage Design", chapter: "dst-ch6", order: 19, available: true,
    description: "Dự án tổng kết: thiết kế tầng lưu trữ cho một hệ (vd e-commerce hoặc news feed) — chọn SQL cho đơn hàng, Redis cache/session, Elasticsearch cho tìm kiếm sản phẩm, ClickHouse cho analytics; giải thích lý do & cách đồng bộ. Sơ đồ kiến trúc.", file: "datastores/dst-cap-storage.md" },
];

const dstChapters: Chapter[] = [
  { id: "dst-ch1", courseId: "DATASTORES", title: "Chương 1 — Redis chuyên sâu", lessonSlugs: ["dst-01-redis-intro", "dst-02-redis-datastructures", "dst-03-redis-persistence", "dst-04-redis-pubsub-streams", "dst-05-redis-cluster", "dst-06-redis-patterns"], category: "storage" },
  { id: "dst-ch2", courseId: "DATASTORES", title: "Chương 2 — Caching strategy & pitfalls", lessonSlugs: ["dst-07-cache-strategies", "dst-08-cache-pitfalls"], category: "compute" },
  { id: "dst-ch3", courseId: "DATASTORES", title: "Chương 3 — NoSQL taxonomy & data modeling", lessonSlugs: ["dst-09-nosql-overview", "dst-10-document-mongodb", "dst-11-widecolumn-cassandra", "dst-12-data-modeling-nosql"], category: "storage" },
  { id: "dst-ch4", courseId: "DATASTORES", title: "Chương 4 — Search (Elasticsearch)", lessonSlugs: ["dst-13-search-elasticsearch", "dst-14-search-operations"], category: "network" },
  { id: "dst-ch5", courseId: "DATASTORES", title: "Chương 5 — Analytics & OLAP", lessonSlugs: ["dst-15-oltp-vs-olap", "dst-16-clickhouse", "dst-17-timeseries"], category: "billing" },
  { id: "dst-ch6", courseId: "DATASTORES", title: "Chương 6 — Chọn đúng store", lessonSlugs: ["dst-18-polyglot-persistence", "dst-cap-storage"], category: "foundation" },
];

// =====================================================================
// MESSAGING — Messaging & Event Streaming (Tầng 2)
// =====================================================================
const msgLessons: Lesson[] = [
  { slug: "msg-01-messaging-intro", courseId: "MESSAGING", title: "Vì sao async messaging? Queue vs Pub/Sub & decoupling", shortTitle: "Messaging là gì", chapter: "msg-ch1", order: 1, available: true,
    description: "Vấn đề gọi đồng bộ chặt (coupling, back-pressure, spike), async messaging giải quyết gì; message queue (point-to-point) vs pub/sub (fan-out); broker, producer, consumer; đánh đổi (độ trễ, phức tạp, eventual).", file: "messaging/msg-01-messaging-intro.md" },
  { slug: "msg-02-delivery-semantics", courseId: "MESSAGING", title: "Delivery semantics, ordering & Dead Letter Queue", shortTitle: "Delivery Semantics", chapter: "msg-ch1", order: 2, available: true,
    description: "At-most-once / at-least-once / exactly-once (và vì sao 'exactly-once' thực chất là idempotent consumer), ack & redelivery, ordering guarantee & khi mất thứ tự, poison message & Dead Letter Queue, retry policy.", file: "messaging/msg-02-delivery-semantics.md" },
  { slug: "msg-03-messaging-patterns", courseId: "MESSAGING", title: "Messaging patterns: work queue, fanout, request-reply", shortTitle: "Messaging Patterns", chapter: "msg-ch1", order: 3, available: true,
    description: "Competing consumers/work queue (chia tải), publish-subscribe fanout, request-reply (correlation id, reply-to), priority queue, delay/scheduled message, claim-check; khi nào dùng pattern nào. Sơ đồ.", file: "messaging/msg-03-messaging-patterns.md" },
  { slug: "msg-04-rabbitmq", courseId: "MESSAGING", title: "RabbitMQ: exchange, queue, binding & routing", shortTitle: "RabbitMQ", chapter: "msg-ch2", order: 4, available: true,
    description: "Mô hình AMQP: producer → exchange → (binding + routing key) → queue → consumer; 4 loại exchange (direct/topic/fanout/headers), ack/nack/reject, prefetch (QoS); ví dụ định tuyến. CODE.", file: "messaging/msg-04-rabbitmq.md" },
  { slug: "msg-05-rabbitmq-reliability", courseId: "MESSAGING", title: "RabbitMQ reliability: confirm, DLX, quorum queue", shortTitle: "RabbitMQ Reliability", chapter: "msg-ch2", order: 5, available: true,
    description: "Publisher confirms & mandatory, consumer ack & requeue, durable queue + persistent message, Dead Letter Exchange & TTL, quorum queue (Raft) vs classic mirrored; khi nào chọn RabbitMQ vs Kafka. CODE.", file: "messaging/msg-05-rabbitmq-reliability.md" },
  { slug: "msg-06-cloud-queues", courseId: "MESSAGING", title: "Cloud queues: SQS, SNS & managed messaging", shortTitle: "SQS & SNS", chapter: "msg-ch2", order: 6, available: true,
    description: "Amazon SQS (standard at-least-once & unordered vs FIFO exactly-once & ordered), visibility timeout, long polling, DLQ; SNS pub/sub & fan-out SNS→SQS; khi nào managed queue thay tự vận hành. CODE.", file: "messaging/msg-06-cloud-queues.md" },
  { slug: "msg-07-kafka-intro", courseId: "MESSAGING", title: "Kafka là gì? Log-based, topic/partition/offset", shortTitle: "Kafka là gì", chapter: "msg-ch3", order: 7, available: true,
    description: "Kafka là distributed commit log, không phải queue truyền thống; topic → partition (đơn vị song song & thứ tự), offset, message được GIỮ LẠI (không xoá khi đọc) → nhiều consumer & replay; vì sao khác RabbitMQ. Sơ đồ log + CODE.", file: "messaging/msg-07-kafka-intro.md" },
  { slug: "msg-08-kafka-producers-consumers", courseId: "MESSAGING", title: "Kafka producer, consumer group & rebalance", shortTitle: "Producer & Consumer", chapter: "msg-ch3", order: 8, available: true,
    description: "Producer: key → partition (hash), acks (0/1/all), batching & linger, idempotent producer; consumer group (mỗi partition 1 consumer trong group), rebalance & partition assignment, offset commit (auto vs manual) & at-least-once. CODE.", file: "messaging/msg-08-kafka-producers-consumers.md" },
  { slug: "msg-09-kafka-storage", courseId: "MESSAGING", title: "Kafka storage: log segment, retention, replication", shortTitle: "Kafka Storage", chapter: "msg-ch3", order: 9, available: true,
    description: "Log segment & index, retention (time/size) & log compaction (giữ bản mới nhất theo key), replication (leader/follower, ISR, min.insync.replicas), durability & high watermark; vì sao Kafka ghi đĩa vẫn nhanh (sequential I/O, page cache, zero-copy). Sơ đồ.", file: "messaging/msg-09-kafka-storage.md" },
  { slug: "msg-10-kafka-delivery", courseId: "MESSAGING", title: "Kafka delivery: exactly-once & ordering", shortTitle: "Kafka Exactly-Once", chapter: "msg-ch3", order: 10, available: true,
    description: "Ordering guarantee (chỉ trong 1 partition), idempotent producer (chống trùng khi retry), transactions (atomic multi-partition write, read-process-write EOS), consumer isolation level; vì sao exactly-once end-to-end khó & khi nào cần. CODE.", file: "messaging/msg-10-kafka-delivery.md" },
  { slug: "msg-11-kafka-connect", courseId: "MESSAGING", title: "Kafka Connect & CDC (Debezium)", shortTitle: "Kafka Connect & CDC", chapter: "msg-ch4", order: 11, available: true,
    description: "Kafka Connect (source & sink connector, không cần code), use case đồng bộ DB↔Kafka↔hệ khác; Change Data Capture với Debezium (đọc WAL/binlog → event), ứng dụng outbox & đồng bộ cache/search. CODE config.", file: "messaging/msg-11-kafka-connect.md" },
  { slug: "msg-12-schema-registry", courseId: "MESSAGING", title: "Schema Registry & schema evolution", shortTitle: "Schema Registry", chapter: "msg-ch4", order: 12, available: true,
    description: "Vì sao cần contract cho message; Avro/Protobuf/JSON Schema, Schema Registry (subject, version, id), compatibility (backward/forward/full) & schema evolution an toàn (thêm field optional...); rủi ro khi đổi schema. CODE.", file: "messaging/msg-12-schema-registry.md" },
  { slug: "msg-13-kafka-streams", courseId: "MESSAGING", title: "Stream processing: Kafka Streams & ksqlDB", shortTitle: "Kafka Streams", chapter: "msg-ch4", order: 13, available: true,
    description: "Xử lý luồng thời gian thực; KStream (event) vs KTable (changelog/state), stateless (map/filter) vs stateful (aggregate/join), windowing (tumbling/hopping/session), state store & exactly-once; ksqlDB; so ý niệm với Apache Flink. CODE.", file: "messaging/msg-13-kafka-streams.md" },
  { slug: "msg-14-event-driven", courseId: "MESSAGING", title: "Event-Driven Architecture: các kiểu event", shortTitle: "Event-Driven", chapter: "msg-ch5", order: 14, available: true,
    description: "Event-driven architecture là gì, event notification vs event-carried state transfer vs event sourcing; command vs event vs message; lợi ích (decoupling, scale) & cái giá (eventual consistency, khó debug, thứ tự); event như API. Sơ đồ.", file: "messaging/msg-14-event-driven.md" },
  { slug: "msg-15-event-sourcing", courseId: "MESSAGING", title: "Event Sourcing: sự thật là chuỗi sự kiện", shortTitle: "Event Sourcing", chapter: "msg-ch5", order: 15, available: true,
    description: "Thay vì lưu trạng thái hiện tại, lưu chuỗi event bất biến; rebuild state bằng replay, snapshot để tăng tốc; lợi ích (audit, time-travel, tách read model), thách thức (schema event evolution, replay cost); event store. Ví dụ tài khoản ngân hàng. Sơ đồ.", file: "messaging/msg-15-event-sourcing.md" },
  { slug: "msg-16-cqrs", courseId: "MESSAGING", title: "CQRS: tách đường ghi và đường đọc", shortTitle: "CQRS", chapter: "msg-ch5", order: 16, available: true,
    description: "Command Query Responsibility Segregation: tách model ghi (command) và model đọc (query/projection); vì sao (tối ưu đọc/ghi riêng, scale riêng), kết hợp Event Sourcing, read model projection & eventual consistency; khi nào KHÔNG nên CQRS (over-engineering). Sơ đồ.", file: "messaging/msg-16-cqrs.md" },
  { slug: "msg-17-saga-outbox", courseId: "MESSAGING", title: "Saga & Outbox pattern trong hệ event-driven", shortTitle: "Saga & Outbox", chapter: "msg-ch5", order: 17, available: true,
    description: "Giao dịch qua nhiều service bằng Saga (orchestration vs choreography, compensating action) — liên hệ [[ds-20-saga]]; bài toán dual-write (ghi DB + publish event không atomic) & Outbox pattern (ghi event vào bảng outbox cùng transaction, relay ra broker), Inbox chống trùng. CODE.", file: "messaging/msg-17-saga-outbox.md" },
  { slug: "msg-18-choosing", courseId: "MESSAGING", title: "Chọn đúng: Kafka vs RabbitMQ vs Pulsar vs NATS", shortTitle: "Chọn Broker", chapter: "msg-ch6", order: 18, available: true,
    description: "So sánh Kafka (streaming, replay, throughput cao) vs RabbitMQ (routing linh hoạt, per-message ack, task queue) vs Pulsar (tách compute/storage, multi-tenant) vs NATS (nhẹ, low-latency); tiêu chí chọn (ordering, retention, throughput, routing, vận hành). Bảng decision.", file: "messaging/msg-18-choosing.md" },
  { slug: "msg-cap-pipeline", courseId: "MESSAGING", title: "Capstone: Thiết kế event-driven order pipeline", shortTitle: "Capstone: Pipeline", chapter: "msg-ch6", order: 19, available: true,
    description: "Dự án tổng kết: thiết kế pipeline xử lý đơn hàng event-driven — service phát event qua Outbox → Kafka (topic orders, partition theo orderId giữ thứ tự) → các consumer (payment, inventory, shipping) idempotent, Saga điều phối + compensation, DLQ cho lỗi, schema registry cho contract; phân tích delivery/ordering/consistency. Sơ đồ kiến trúc.", file: "messaging/msg-cap-pipeline.md" },
];

const msgChapters: Chapter[] = [
  { id: "msg-ch1", courseId: "MESSAGING", title: "Chương 1 — Nền tảng Messaging", lessonSlugs: ["msg-01-messaging-intro", "msg-02-delivery-semantics", "msg-03-messaging-patterns"], category: "foundation" },
  { id: "msg-ch2", courseId: "MESSAGING", title: "Chương 2 — Message Queue (RabbitMQ, SQS)", lessonSlugs: ["msg-04-rabbitmq", "msg-05-rabbitmq-reliability", "msg-06-cloud-queues"], category: "network" },
  { id: "msg-ch3", courseId: "MESSAGING", title: "Chương 3 — Kafka core", lessonSlugs: ["msg-07-kafka-intro", "msg-08-kafka-producers-consumers", "msg-09-kafka-storage", "msg-10-kafka-delivery"], category: "compute" },
  { id: "msg-ch4", courseId: "MESSAGING", title: "Chương 4 — Kafka ecosystem", lessonSlugs: ["msg-11-kafka-connect", "msg-12-schema-registry", "msg-13-kafka-streams"], category: "storage" },
  { id: "msg-ch5", courseId: "MESSAGING", title: "Chương 5 — Event-Driven Architecture", lessonSlugs: ["msg-14-event-driven", "msg-15-event-sourcing", "msg-16-cqrs", "msg-17-saga-outbox"], category: "security" },
  { id: "msg-ch6", courseId: "MESSAGING", title: "Chương 6 — Chọn broker & Capstone", lessonSlugs: ["msg-18-choosing", "msg-cap-pipeline"], category: "billing" },
];

// =====================================================================
// CLOUDNATIVE — Cloud Native & Kubernetes (Tầng 4)
// =====================================================================
const cnLessons: Lesson[] = [
  { slug: "cn-01-why-orchestration", courseId: "CLOUDNATIVE", title: "Vì sao cần orchestration? Kubernetes là gì", shortTitle: "Vì sao K8s", chapter: "cn-ch1", order: 1, available: true,
    description: "Từ container đơn tới hàng trăm container: bài toán scheduling, self-healing, scaling, service discovery; vì sao cần orchestrator; Kubernetes là gì, mô hình declarative & desired state, khi nào KHÔNG cần k8s.", file: "cloudnative/cn-01-why-orchestration.md" },
  { slug: "cn-02-k8s-architecture", courseId: "CLOUDNATIVE", title: "Kiến trúc Kubernetes: control plane & node", shortTitle: "K8s Architecture", chapter: "cn-ch1", order: 2, available: true,
    description: "Control plane (kube-apiserver, etcd, scheduler, controller-manager) & worker node (kubelet, kube-proxy, container runtime); reconciliation loop; luồng một request tạo Pod đi qua đâu. Sơ đồ.", file: "cloudnative/cn-02-k8s-architecture.md" },
  { slug: "cn-03-kubectl-objects", courseId: "CLOUDNATIVE", title: "kubectl, YAML declarative & object model", shortTitle: "kubectl & Objects", chapter: "cn-ch1", order: 3, available: true,
    description: "kubectl (apply/get/describe/logs/exec), manifest YAML (apiVersion/kind/metadata/spec/status), namespace, label & selector & annotation; imperative vs declarative; desired vs actual state. CODE YAML.", file: "cloudnative/cn-03-kubectl-objects.md" },
  { slug: "cn-04-pods", courseId: "CLOUDNATIVE", title: "Pod: đơn vị chạy nhỏ nhất & health probes", shortTitle: "Pods", chapter: "cn-ch2", order: 4, available: true,
    description: "Pod là gì (1+ container chung network/volume), sidecar & init container, pod lifecycle & restart policy, health probe (liveness/readiness/startup) & vì sao quan trọng, resource cơ bản. CODE YAML pod + probe.", file: "cloudnative/cn-04-pods.md" },
  { slug: "cn-05-deployments", courseId: "CLOUDNATIVE", title: "Deployment, ReplicaSet, rolling update & rollback", shortTitle: "Deployments", chapter: "cn-ch2", order: 5, available: true,
    description: "Deployment quản lý ReplicaSet quản lý Pod; desired replicas & self-healing; rolling update (maxSurge/maxUnavailable), rollback, scaling (kubectl scale); vì sao không tạo Pod trần. CODE YAML + lệnh.", file: "cloudnative/cn-05-deployments.md" },
  { slug: "cn-06-statefulset-daemonset-jobs", courseId: "CLOUDNATIVE", title: "StatefulSet, DaemonSet, Job & CronJob", shortTitle: "StatefulSet & Jobs", chapter: "cn-ch2", order: 6, available: true,
    description: "StatefulSet (identity ổn định, stable network id, ordered, cho DB/Kafka) vs Deployment; DaemonSet (một pod mỗi node, cho agent/log); Job (chạy tới hoàn thành) & CronJob (định kỳ). Khi nào dùng cái nào. CODE YAML.", file: "cloudnative/cn-06-statefulset-daemonset-jobs.md" },
  { slug: "cn-07-services", courseId: "CLOUDNATIVE", title: "Service: ClusterIP, NodePort, LoadBalancer & DNS", shortTitle: "Services", chapter: "cn-ch3", order: 7, available: true,
    description: "Vì sao Pod IP ephemeral cần Service; ClusterIP (nội bộ), NodePort, LoadBalancer, Headless; selector & Endpoints, kube-proxy (iptables/IPVS), cluster DNS (CoreDNS), service discovery. Sơ đồ + CODE YAML.", file: "cloudnative/cn-07-services.md" },
  { slug: "cn-08-ingress", courseId: "CLOUDNATIVE", title: "Ingress, Ingress Controller & Gateway API", shortTitle: "Ingress", chapter: "cn-ch3", order: 8, available: true,
    description: "Ingress (định tuyến HTTP L7, host/path, TLS termination) vs Service LoadBalancer L4; Ingress Controller (nginx/Traefik) & vì sao cần; Gateway API (thế hệ mới). CODE YAML ingress + TLS.", file: "cloudnative/cn-08-ingress.md" },
  { slug: "cn-09-config-secret", courseId: "CLOUDNATIVE", title: "ConfigMap, Secret & cấu hình ứng dụng", shortTitle: "ConfigMap & Secret", chapter: "cn-ch3", order: 9, available: true,
    description: "Tách config khỏi image (12-factor); ConfigMap (env, volume mount), Secret (base64, không phải mã hoá mạnh — cần encryption at rest/external secret), downward API; cập nhật config & reload. CODE YAML.", file: "cloudnative/cn-09-config-secret.md" },
  { slug: "cn-10-storage", courseId: "CLOUDNATIVE", title: "Storage: Volume, PV/PVC, StorageClass & CSI", shortTitle: "Storage", chapter: "cn-ch4", order: 10, available: true,
    description: "Ephemeral volume (emptyDir) vs persistent; PersistentVolume & PersistentVolumeClaim (tách provisioning khỏi dùng), StorageClass & dynamic provisioning, access mode (RWO/ROX/RWX), CSI driver; stateful với StatefulSet. CODE YAML.", file: "cloudnative/cn-10-storage.md" },
  { slug: "cn-11-scheduling", courseId: "CLOUDNATIVE", title: "Scheduling & Autoscaling: requests/limits, affinity, HPA", shortTitle: "Scheduling & Autoscale", chapter: "cn-ch4", order: 11, available: true,
    description: "Resource requests & limits & vì sao đặt đúng, QoS class (Guaranteed/Burstable/BestEffort) & OOMKill/eviction; scheduler: nodeSelector, node/pod affinity & anti-affinity, taints & tolerations; autoscaling HPA (theo metric) / VPA / Cluster Autoscaler. CODE YAML.", file: "cloudnative/cn-11-scheduling.md" },
  { slug: "cn-12-rbac-security", courseId: "CLOUDNATIVE", title: "Security: RBAC, ServiceAccount, Network Policy, Pod Security", shortTitle: "K8s Security", chapter: "cn-ch5", order: 12, available: true,
    description: "RBAC (Role/ClusterRole + RoleBinding), ServiceAccount cho pod, security context (runAsNonRoot, readOnlyRootFilesystem, drop capabilities), Pod Security Standards, NetworkPolicy (mặc định flat → hạn chế traffic), secret an toàn. CODE YAML.", file: "cloudnative/cn-12-rbac-security.md" },
  { slug: "cn-13-observability-troubleshoot", courseId: "CLOUDNATIVE", title: "Observability & troubleshooting cluster thực chiến", shortTitle: "Troubleshooting", chapter: "cn-ch5", order: 13, available: true,
    description: "kubectl logs/describe/events/debug, ephemeral container; chẩn đoán lỗi kinh điển: CrashLoopBackOff, ImagePullBackOff, OOMKilled, Pending (không schedule được), Evicted, readiness fail; metrics (metrics-server) & tích hợp Prometheus. Bảng triệu chứng→nguyên nhân + CODE.", file: "cloudnative/cn-13-observability-troubleshoot.md" },
  { slug: "cn-14-helm", courseId: "CLOUDNATIVE", title: "Helm: đóng gói & quản lý ứng dụng k8s", shortTitle: "Helm", chapter: "cn-ch6", order: 14, available: true,
    description: "Vì sao cần Helm (nhiều manifest, môi trường khác nhau); chart structure, template & values, release & revision, helm install/upgrade/rollback, dependency; so với Kustomize. CODE chart + template.", file: "cloudnative/cn-14-helm.md" },
  { slug: "cn-15-operators", courseId: "CLOUDNATIVE", title: "Operators & CRD: mở rộng Kubernetes", shortTitle: "Operators & CRD", chapter: "cn-ch6", order: 15, available: true,
    description: "Custom Resource Definition (CRD) mở rộng API k8s; controller pattern (reconcile loop) & Operator (đóng gói tri thức vận hành một app, vd database operator); khi nào viết operator; hệ sinh thái (Operator SDK). CODE YAML CRD + ý niệm controller.", file: "cloudnative/cn-15-operators.md" },
  { slug: "cn-16-gitops", courseId: "CLOUDNATIVE", title: "GitOps (ArgoCD/Flux) & deployment strategies", shortTitle: "GitOps", chapter: "cn-ch6", order: 16, available: true,
    description: "GitOps: Git là nguồn sự thật, agent đồng bộ cluster về đúng Git (ArgoCD/Flux), drift detection & self-heal; deployment strategy: rolling, blue-green, canary (progressive delivery, Argo Rollouts/Flagger). So với CI push truyền thống. CODE + sơ đồ.", file: "cloudnative/cn-16-gitops.md" },
  { slug: "cn-17-service-mesh", courseId: "CLOUDNATIVE", title: "Service Mesh (Istio/Linkerd): mTLS, traffic, observability", shortTitle: "Service Mesh", chapter: "cn-ch6", order: 17, available: true,
    description: "Bài toán service-to-service (mTLS, retry, traffic split, observability) tách khỏi code; sidecar proxy (Envoy) & data plane vs control plane; Istio/Linkerd tính năng: mTLS tự động, traffic management (canary theo %), telemetry; cái giá (độ phức tạp, overhead), ambient mesh. Sơ đồ.", file: "cloudnative/cn-17-service-mesh.md" },
  { slug: "cn-cap-deploy", courseId: "CLOUDNATIVE", title: "Capstone: Deploy một app production-ready lên K8s", shortTitle: "Capstone: Deploy", chapter: "cn-ch7", order: 18, available: true,
    description: "Dự án tổng kết: đưa một web app (frontend + backend + Redis) lên Kubernetes production-ready — Deployment + probes + resource limits, Service + Ingress + TLS, ConfigMap/Secret, PVC cho state, HPA autoscale, RBAC + NetworkPolicy, đóng gói bằng Helm, deploy qua GitOps; checklist production. NHIỀU CODE YAML đầy đủ.", file: "cloudnative/cn-cap-deploy.md" },
];

const cnChapters: Chapter[] = [
  { id: "cn-ch1", courseId: "CLOUDNATIVE", title: "Chương 1 — Nền tảng & kiến trúc K8s", lessonSlugs: ["cn-01-why-orchestration", "cn-02-k8s-architecture", "cn-03-kubectl-objects"], category: "foundation" },
  { id: "cn-ch2", courseId: "CLOUDNATIVE", title: "Chương 2 — Workloads", lessonSlugs: ["cn-04-pods", "cn-05-deployments", "cn-06-statefulset-daemonset-jobs"], category: "compute" },
  { id: "cn-ch3", courseId: "CLOUDNATIVE", title: "Chương 3 — Networking & Config", lessonSlugs: ["cn-07-services", "cn-08-ingress", "cn-09-config-secret"], category: "network" },
  { id: "cn-ch4", courseId: "CLOUDNATIVE", title: "Chương 4 — Storage & Scheduling", lessonSlugs: ["cn-10-storage", "cn-11-scheduling"], category: "storage" },
  { id: "cn-ch5", courseId: "CLOUDNATIVE", title: "Chương 5 — Security & Operations", lessonSlugs: ["cn-12-rbac-security", "cn-13-observability-troubleshoot"], category: "security" },
  { id: "cn-ch6", courseId: "CLOUDNATIVE", title: "Chương 6 — Ecosystem & Production", lessonSlugs: ["cn-14-helm", "cn-15-operators", "cn-16-gitops", "cn-17-service-mesh"], category: "compute" },
  { id: "cn-ch7", courseId: "CLOUDNATIVE", title: "Chương 7 — Capstone", lessonSlugs: ["cn-cap-deploy"], category: "compute" },
];

// =====================================================================
// Aggregate
// =====================================================================
export const lessons: Lesson[] = [...techLessons, ...progLessons, ...webLessons, ...sqlLessons, ...gitLessons, ...sysdLessons, ...foundLessons, ...engLessons, ...beLessons, ...csLessons, ...dsaLessons, ...secLessons, ...devopsLessons, ...sreLessons, ...aimlLessons, ...feLessons, ...capLessons, ...clfLessons, ...saaLessons, ...dvaLessons, ...bcLessons, ...dsLessons, ...dstLessons, ...msgLessons, ...cnLessons];
export const chapters: Chapter[] = [...techChapters, ...progChapters, ...webChapters, ...sqlChapters, ...gitChapters, ...sysdChapters, ...foundChapters, ...engChapters, ...beChapters, ...csChapters, ...dsaChapters, ...secChapters, ...devopsChapters, ...sreChapters, ...aimlChapters, ...feChapters, ...capChapters, ...clfChapters, ...saaChapters, ...dvaChapters, ...soaChapters, ...sapChapters, ...sysdChapters, ...bcChapters, ...dsChapters, ...dstChapters, ...msgChapters, ...cnChapters];

export function lessonsOfCourse(courseId: CourseId): Lesson[] {
  return lessons.filter((l) => l.courseId === courseId).sort((a, b) => a.order - b.order);
}

export function chaptersOfCourse(courseId: CourseId): Chapter[] {
  return chapters.filter((c) => c.courseId === courseId);
}

export function getLessonBySlug(courseId: CourseId, slug: string): Lesson | undefined {
  return lessons.find((l) => l.courseId === courseId && l.slug === slug);
}

export function getChapterById(id: string): Chapter | undefined {
  return chapters.find((c) => c.id === id);
}
