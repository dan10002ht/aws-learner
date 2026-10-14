# Bài 15 — Worktree: cho mỗi agent một bàn làm việc

## 1. Mục tiêu

Sau bài này bạn có thể:

- Tạo, liệt kê, khoá, gỡ và dọn **git worktree** bằng đúng các lệnh `git worktree add / list / lock / remove / prune`, và đọc được output `list --porcelain`.
- Chỉ ra **thứ gì tách riêng** cho từng worktree (file làm việc, `HEAD`, index) và **thứ gì vẫn dùng chung** (mọi ref dưới `refs/`, stash, config, cổng mạng, database local) — rồi suy ra chỗ hai agent song song vẫn đụng nhau.
- Chỉ định **một người ghi duy nhất** cho file chung (registry, lockfile) và dựng lại được xung đột merge xảy ra khi bạn không làm vậy.
- Chẩn đoán lỗi "trùng cấu hình / nhiều hơn một X" do worktree nằm **trong** repo, và vá bằng cách khai báo phạm vi cho tool.
- Gỡ worktree bằng một script chỉ gỡ cái **sạch và đã push**, không xoá việc của session khác, không để nhánh bị khoá.
- Chọn chỗ lưu bằng chứng của worker sao cho nó **sống qua reboot và restart session**.

---

## 2. Tình huống

Một repo backend của app SaaS thương mại điện tử. Main agent chạy một skill loop (kiểu `loop-tasks`, sẽ học ở [[ag-19-vong-lap-nhat-task]]): mỗi lượt nhặt vài task rời nhau, mỗi task giao một subagent làm trong worktree riêng. Ba sự cố dưới đây xảy ra trong khoảng một tháng, cùng một người vận hành (kinh nghiệm thực tế, ẩn danh):

**Sự cố 1 — dev server không lên.** Sáng hôm sau, người dev chạy lệnh khởi động dev server của app như mọi ngày. Nó chết trước khi khởi động, kèm thông báo đại ý:

```
Validation error in .claude/worktrees/<ten-task>/<web-config>.toml:
You can only have one "web" configuration file with the backend role in your app.
Conflicting configurations found at:
  .claude/worktrees/agent-<id-1>/<web-config>.toml
  ./<web-config>.toml
  .claude/worktrees/agent-<id-2>/<web-config>.toml
  .claude/worktrees/<ten-task>/<web-config>.toml
```

Không ai sửa code tối qua. Thứ đổi là **hình dạng thư mục**: ba worktree nằm trong `.claude/worktrees/` của chính repo, nên CLI thấy bốn bản của cùng một file cấu hình.

**Sự cố 2 — không checkout được nhánh của chính mình.** Agent cần commit thêm vào một nhánh merge request đang mở mà không động vào working copy chính (đang bẩn khoảng 150 file của việc khác). Nó `git worktree add` vào nhánh đó, commit, push, rồi **quên gỡ**. Người dev gõ checkout nhánh đó thì nhận:

```
fatal: '<nhanh-mr>' is already used by worktree at '.../.claude/worktrees/<ten-worktree>'
```

**Sự cố 3 — worker đứng im vì spec đã bốc hơi.** Trong một phiên migrate kéo dài vài ngày, coordinator để file spec và report của worker trong `/tmp` và trong scratchpad của session. Ba lần mất dữ liệu, ba cơ chế khác nhau: máy reboot dọn `/tmp`; session restart dọn scratchpad; một công cụ quản lý worktree bên ngoài chuyển worktree vào thư mục rác **giữa lúc đang làm**. Hai worker đứng im nhiều lượt vì file chúng cần đọc không còn.

Cả ba đều không phải lỗi code. Cả ba sinh ra từ cùng một quyết định đúng: **cho mỗi agent một worktree**. Bài này dạy cái giá đi kèm quyết định đó và cơ chế để trả giá ít nhất.

---

## ⏸ Dừng lại — đoán trước

Hai agent chạy song song, mỗi agent một worktree trên nhánh riêng. Agent A chạy `git stash` trong worktree của nó. Agent B, ở worktree khác, chạy `git stash pop`.

**Chuyện gì xảy ra?**

```
(a) B báo "No stash entries found" — mỗi worktree có kho stash riêng
(b) B pop được đúng thay đổi của A vào worktree của B
(c) Git chặn, vì stash thuộc nhánh của A
```

Đáp án ở §3.2.

---

## 3. Cơ chế

### 3.1 Worktree là gì, và vì sao nó rẻ hơn clone

**Worktree** là một thư mục làm việc thứ hai (thứ ba, thứ N…) gắn vào **cùng một repo git**: có file riêng, nhánh riêng, nhưng dùng chung kho object và lịch sử. Theo docs git: *"The new worktree is linked to the current repository, sharing everything except per-worktree files such as `HEAD`, `index`, etc."* (nguồn: git-scm.com/docs/git-worktree).

Cú pháp đầy đủ của các lệnh con, chép từ docs:

```
git worktree add [-f] [--detach] [--checkout] [--lock [--reason <string>]]
                 [--orphan] [(-b | -B) <new-branch>] <path> [<commit-ish>]
git worktree list [-v | --porcelain [-z]]
git worktree lock [--reason <string>] <worktree>
git worktree move <worktree> <new-path>
git worktree prune [-n] [-v] [--expire <expire>]
git worktree remove [-f] <worktree>
git worktree repair [<path>…]
git worktree unlock <worktree>
```

Cách git nối hai thư mục (đã chạy thử trên git 2.48, repo tạm): worktree mới có một **file** `.git` (không phải thư mục) chứa một dòng trỏ về repo chính:

```
$ cat ../repo-task-a/.git
gitdir: /…/repo/.git/worktrees/repo-task-a
$ ls .git/worktrees
repo-task-a  task-b
```

Mỗi worktree có một thư mục quản trị riêng trong `$GIT_DIR/worktrees/<tên>` (giữ `HEAD`, index của nó). Mọi thứ khác — object, nhánh, tag — nằm ở `.git` chung. Commit ở worktree A thấy ngay ở repo chính, không cần push/fetch:

```
$ cd ../repo-task-a && git commit -qm "task a" && cd ../repo
$ git log --oneline task-a | head -2
2e9f262 task a
89f7264 init
```

Vì kho object dùng chung, chi phí đĩa của một worktree là **bản checkout + thư mục phụ thuộc**, không phải cả lịch sử. Tính thử với số giả định (đo repo của bạn bằng `du -sh .git` và `du -sh node_modules`):

```
# Giả định: .git = 1.5 GB, file nguồn = 0.3 GB, node_modules = 0.8 GB, cần 4 agent song song
repo chính                    = 1.5 + 0.3 + 0.8            = 2.6 GB
4 bản clone thêm              = 4 × (1.5 + 0.3 + 0.8)      = 10.4 GB  → tổng 13.0 GB
4 worktree thêm               = 4 × (0.3 + 0.8)            = 4.4 GB   → tổng 7.0 GB
```

Clone còn có cái giá không nằm trên đĩa: mỗi clone có nhánh riêng, phải push/fetch qua remote mới thấy việc của nhau. Worktree thấy nhau tức thì vì chung ref.

Lưu ý `node_modules` (và mọi file gitignored như `.env`) **không** có sẵn trong worktree mới — nó là checkout sạch. Claude Code docs nói rõ: *"A worktree is a fresh checkout, so initialize your development environment there"* và cho phép chép file gitignored qua file `.worktreeinclude` ở gốc repo, cú pháp `.gitignore`, chỉ chép file vừa khớp mẫu vừa bị gitignore (nguồn: code.claude.com/docs/en/worktrees):

```text
# .worktreeinclude
.env
.env.local
```

### 3.2 Cái gì tách, cái gì chung — bản đồ va chạm

Đây là phần quyết định agent song song còn đụng nhau ở đâu. Docs git về ref: *"In general, all pseudo refs are per-worktree and all refs starting with `refs/` are shared … refs inside `refs/bisect`, `refs/worktree` and `refs/rewritten` are not shared."* Config repo (`.git/config`) mặc định cũng dùng chung.

**Stash** nằm ở `refs/stash` — bắt đầu bằng `refs/`, nên **dùng chung**. Đáp án câu đoán là **(b)**. Đã chạy thử:

```
$ cd ../wt-l02 && echo x >> a.js && git stash -q
$ cd ../repo && git stash list
stash@{0}: WIP on l02: 147d3f6 l02
```

Stash tạo ở worktree `wt-l02` hiện ngay ở repo chính. Agent nào gọi `git stash pop` ở đâu cũng lấy được nó — kể cả khi nó là việc dở của agent khác.

Bảng va chạm, xếp theo cơ chế:

| Tài nguyên | Riêng hay chung | Hậu quả khi hai agent song song |
|---|---|---|
| File làm việc, `HEAD`, index | Riêng mỗi worktree | Không đè file của nhau — đây là lý do dùng worktree |
| Nhánh (`refs/heads/*`) | Chung | Một nhánh chỉ được checkout ở **một** worktree tại một thời điểm (§3.4) |
| Stash (`refs/stash`) | Chung | Agent pop nhầm việc dở của agent khác |
| `.git/config` | Chung (trừ khi bật `extensions.worktreeConfig`) | Agent đổi `user.email`, remote, hook path → mọi worktree đổi theo |
| Cổng mạng, DB/emulator local, cache trong `$HOME` | Chung (nằm ngoài git) | Hai dev server cùng cổng → cái sau lỗi `EADDRINUSE`; hai test suite cùng ghi một DB local |
| File chung trong repo (registry, lockfile) | Riêng lúc sửa, **gặp lại lúc merge** | Xung đột merge (§3.3) |

Dòng cuối là chỗ người mới hay hiểu sai: worktree **hoãn** va chạm chứ không xoá nó. Hai agent sửa cùng một file ở hai worktree thì không ai đè ai — cho tới lúc merge.

### 3.3 File chung: phải có đúng một người ghi

Lấy một file **registry** — danh sách đăng ký kiểu "mỗi bài học/route/migration thêm một dòng". Repo bạn đang đọc có đúng file như vậy: `web/data/lessons.ts`. Khi nhiều agent viết bài song song cho course này, brief cấm worker đụng `web/`; chỉ main agent thêm dòng đăng ký sau khi gom bài.

Lý do, dựng lại trên repo tạm. Registry có một mục, hai agent mỗi người thêm một dòng ngay trước dấu `];`:

```
$ git merge -q l02          # agent 1 thêm l-02 → merge êm
$ git merge l03             # agent 2 thêm l-03 ở cùng chỗ
CONFLICT (content): Merge conflict in registry.js
$ git diff
  export const lessons = [
    { slug: "l-01" },
++<<<<<<< HEAD
 +  { slug: "l-02" },
++=======
+   { slug: "l-03" },
++>>>>>>> l03
  ];
```

Nguyên nhân gốc: merge ba chiều của git làm việc theo **vùng dòng**. Hai nhánh cùng chèn vào giữa hai dòng giống nhau (`{ slug: "l-01" },` và `];`) → cùng một vùng → git không biết thứ tự nào đúng nên dừng. Với N agent, merge thứ hai trở đi đều có thể xung đột ở đúng chỗ đó. Lockfile (`package-lock.json`, `yarn.lock`) còn tệ hơn: hai agent thêm hai dependency khác nhau thì cả cây lockfile bị sinh lại, xung đột hàng trăm dòng và không sửa tay được.

Ba cách chặn, xếp theo độ an toàn:

1. **Một người ghi duy nhất (khuyên dùng).** Brief liệt kê file chung vào danh sách cấm của worker. Worker ghi thứ cần đăng ký vào report ("slug: …, title: …"); main agent gom report, sửa file chung **một lần** sau khi merge. Với lockfile: worker không được `npm install <gói-mới>`; nó báo cần gói gì, main agent cài trên nhánh tích hợp và sinh lockfile một lần.
2. **Thiết kế file để không có vùng chung.** Registry dạng một-file-mỗi-mục (thư mục `registry/l-02.ts`, `registry/l-03.ts` rồi glob), hoặc mỗi mục chèn ở vị trí theo bảng chữ cái thay vì cuối danh sách. Không còn hai nhánh cùng chèn vào một vùng.
3. **Merge driver `union`.** Khai báo trong `.gitattributes`:

   ```
   registry.js merge=union
   ```

   Chạy thử: hai merge trên đi qua không xung đột, kết quả có cả `l-02` và `l-03`. Nhưng docs gitattributes cảnh báo nguyên văn: *"take lines from both versions, instead of leaving conflict markers. This tends to leave the added lines in the resulting file in random order and the user should verify the result. Do not use this if you do not understand the implications."* Tức là xung đột **thật** (hai nhánh sửa cùng một dòng thành hai giá trị khác) cũng bị nuốt im lặng, giữ cả hai dòng. Chỉ dùng cho file thuần "mỗi dòng một mục, thứ tự không quan trọng", và không bao giờ cho JSON hay lockfile.

Một lỗ cùng họ mà worktree tự sinh ra: mỗi worktree chỉ thấy nhánh của chính nó, nên verifier chấm từng task sẽ **không thấy** tương tác giữa hai task cùng landed — hai task đều PASS mà gộp lại thì đỏ. Cách chặn là dựng trạng thái hợp nhất rồi chạy gate một lần trước merge, học ở [[ag-10-done-criteria-va-gate]].

### 3.4 Một nhánh, một worktree — và khoá bị bỏ quên

Git chỉ cho một nhánh được checkout ở **một** worktree tại một thời điểm. Lý do: nếu hai thư mục cùng ở nhánh `X`, commit ở thư mục 1 dời `refs/heads/X` đi, còn index và file của thư mục 2 vẫn ứng với commit cũ → lần commit sau ở thư mục 2 sẽ âm thầm đảo ngược thay đổi của thư mục 1. Git chặn từ gốc. Chạy thử:

```
$ git checkout task-a
fatal: 'task-a' is already used by worktree at '/…/repo-task-a'
$ git worktree add ../repo-dup task-a
fatal: 'task-a' is already used by worktree at '/…/repo-task-a'
$ git branch -D task-c
error: cannot delete branch 'task-c' used by worktree at '/…/repo-c'
```

Docs: *"By default, `add` refuses to create a new worktree when `<commit-ish>` is a branch name and is already checked out by another worktree"*; `--force` vượt được. Đừng dùng `--force` cho việc này — nó tắt đúng cái khoá chống mất commit vừa nói.

Hệ quả cho agent: worktree **sống lâu hơn** việc của agent sẽ khoá nhánh với người. Đó là sự cố 2. Nguyên nhân gốc không phải worktree, mà là `git worktree add` thô **không có gì nhắc dọn**. So với cách công cụ quản lý vòng đời (nguồn: code.claude.com/docs/en/worktrees):

- `claude --worktree <name>` tạo worktree ở `.claude/worktrees/<name>/` trên nhánh mới `worktree-<name>`. Khi thoát phiên tương tác: worktree sạch của phiên không đặt tên thì bị gỡ cùng nhánh; còn việc thì hỏi giữ hay xoá.
- Subagent khai báo `isolation: worktree` chạy trong worktree tạm; *"Claude Code removes automatically when the subagent finishes without changes"*, còn worktree có thay đổi giữ lại tới khi đợt quét định kỳ gỡ được mà không mất việc. Trong lúc agent chạy, Claude Code giữ một `git worktree lock` để việc dọn song song không gỡ nhầm.
- Chạy không tương tác với `-p` thì **không** có bước dọn khi thoát — worktree ở lại.
- Base mặc định là nhánh mặc định trên remote (`worktree.baseRef: "fresh"`), không phải `HEAD` hiện tại. Không đặt được tên nhánh có sẵn; muốn worktree trên nhánh MR đang mở thì phải `git worktree add` tay.

Đúng trường hợp cuối là sự cố 2: buộc phải `add` thô vào nhánh có sẵn → **gỡ ngay trong cùng lượt**, không để tới "lát nữa". Checklist gỡ an toàn (kinh nghiệm thực tế, từng bước đều chạy thử được):

```bash
cd <worktree>
test -z "$(git status --porcelain)"                     # 1. không còn file chưa commit
test "$(git rev-parse HEAD)" = "$(git rev-parse '@{u}')" # 2. HEAD trùng nhánh trên remote = đã push đủ
cd <repo-chinh>
git worktree remove <worktree>                           # 3. gỡ (git tự từ chối nếu bẩn)
git worktree prune                                       # 4. dọn metadata của worktree đã mất thư mục
```

Bước 3 có lưới an toàn sẵn: *"Only clean worktrees (no untracked files and no modification in tracked files) can be removed"*. Chạy thử với một file sửa dở, và với một file mới chưa track — cả hai đều bị từ chối:

```
fatal: '../repo-task-a' contains modified or untracked files, use --force to delete it
```

Worktree đang **lock** thì `remove -f` một lần cũng không qua:

```
$ git worktree lock --reason "worker T1 dang chay" ../repo-task-a
$ git worktree remove -f ../repo-task-a
fatal: cannot remove a locked working tree, lock reason: worker T1 dang chay
use 'remove -f -f' to override or unlock first
```

Đây là cơ chế cho agent đang chạy: **lock lúc bắt đầu, unlock lúc xong**, kèm lý do đọc được. Một script dọn của người hay agent khác sẽ thấy lý do trong `list --porcelain` (dòng `locked <lý do>`) thay vì gỡ mù.

Thư mục bị `rm -rf` thay vì `remove` thì metadata còn lại, `git worktree list` đánh dấu `prunable`, và `prune` dọn nó:

```
$ rm -rf .claude/worktrees/task-b
$ git worktree list
…/repo/.claude/worktrees/task-b  89f7264 [task-b] prunable
$ git worktree prune -v
Removing worktrees/task-b: gitdir file points to non-existent location
```

Gỡ worktree **không** xoá nhánh (`task-a`, `task-b` vẫn còn sau khi gỡ) — việc đã commit an toàn.

### 3.5 Worktree trong repo: tool thấy N bản sao

Sự cố 1 có cơ chế chung cho rất nhiều tool: chúng xác định "dự án gồm những gì" bằng cách **duyệt cả cây thư mục**. Worktree đặt trong repo (`.claude/worktrees/`, mặc định của Claude Code) biến một checkout thành N+1 bản của mọi file.

Thêm `.claude/worktrees/` vào `.gitignore` — đúng như docs Claude Code khuyên — làm sạch `git status`, **nhưng không chặn tool khác**. `.gitignore` là luật của git; tool tự duyệt thư mục không đọc nó. Chạy thử sau khi đã gitignore:

```
$ git status --short
?? .gitignore                 # .claude/worktrees/ đã biến mất khỏi git
$ find . -name app.toml -not -path './.git/*'
./app.toml
./.claude/worktrees/t2/app.toml
./.claude/worktrees/t1/app.toml
```

Một đoạn Node tự duyệt thư mục cũng trả ba file. Với một checkout 3.000 file và 4 worktree trong repo, tool duyệt cây thấy 3.000 × 5 = 15.000 file (phép nhân, không phải số đo).

Tool nào bị ảnh hưởng là chuyện cấu hình mặc định của từng tool — kiểm trong docs của tool bạn dùng, ví dụ:

- TypeScript: thiếu `include`/`files` thì mặc định lấy mọi file dưới thư mục chứa `tsconfig.json` → type-check cả bản sao trong worktree.
- Jest: `testPathIgnorePatterns` mặc định chỉ bỏ `node_modules` → test trong worktree cũng bị chạy.
- Docker: build context là cả thư mục → gửi cả worktree vào daemon nếu `.dockerignore` không loại.
- CLI của Shopify: có khoá `web_directories` ở cấp gốc file cấu hình app (docs Shopify: *"The paths that Shopify CLI will search for the web files of your app"*). Case ở sự cố 1 vá bằng `web_directories = ["."]` trong mọi file cấu hình app; tác giả xác nhận bằng cách đọc bundle của CLI rằng có khai báo thì nó không quét đệ quy nữa (kinh nghiệm thực tế, phụ thuộc phiên bản CLI).

Thứ tự vá (kinh nghiệm thực tế):

1. **Khai báo phạm vi tường minh cho từng tool** (`include`, `roots`/`testPathIgnorePatterns`, `.dockerignore`, `web_directories`). Đây là vá đúng gốc: tool đang đoán phạm vi, bạn cho nó phạm vi.
2. **Không xoá worktree của session khác để "chữa cháy".** Trong sự cố 1, hai trong ba worktree đang giữ file chưa commit của việc khác. Chạy `git worktree list`, rồi `git status` từng cái, rồi mới quyết.
3. Chỉ khi không khai báo được phạm vi mới dời worktree ra ngoài repo (`git worktree add ../repo-<task>`, hoặc hook `WorktreeCreate` của Claude Code để đặt chỗ khác) — và phải sửa mọi skill đang tạo worktree.

Dấu hiệu nhận ra: tool vốn chạy bình thường bỗng báo "trùng", "nhiều hơn một", "duplicate", "naming collision", trong repo có agent chạy nền. Nghi hình dạng thư mục trước khi nghi code.

### 3.6 Bằng chứng phải sống lâu hơn worktree

Worker trong worktree sinh ra ba loại thứ cần giữ: **code** (commit), **bằng chứng** (log gate, ảnh chụp, report verifier) và **kết luận** (quyết định, spec cho lượt sau). Sự cố 3 cho thấy mỗi chỗ ghi có một cách chết riêng:

| Chỗ ghi | Mất khi nào |
|---|---|
| `/tmp/...` | Máy reboot (kinh nghiệm thực tế trên macOS) |
| Scratchpad của session agent | Session restart (kinh nghiệm thực tế) |
| Worktree do công cụ tạo | Công cụ dọn: Claude Code quét worktree subagent quá hạn `cleanupPeriodDays` và gỡ worktree sạch khi subagent xong (docs); một công cụ bên ngoài trong case đã dọn **giữa lúc dùng** |
| File chưa commit trong worktree | Bất kỳ `remove --force` nào của người/script khác |
| Nhánh đã push lên remote | Chỉ khi có người chủ động xoá |
| File đã commit ở repo chính | Chỉ khi có người chủ động xoá |

Nguyên nhân gốc chung: các chỗ ở trên đều do **một tiến trình khác sở hữu vòng đời** (OS, session, công cụ worktree), và tiến trình đó không biết file của bạn quan trọng. Luật rút ra (kinh nghiệm thực tế):

1. **Push nhánh ngay khi có commit sạch**, kể cả nhánh nháp. Remote là bản sao duy nhất không ai tự dọn.
2. **Spec và report của worker để trong repo chính** (thư mục kiểu `reports/` hoặc file `BRIEF.md`), worker đọc bằng đường dẫn tuyệt đối — không để trong scratchpad của coordinator.
3. **Kết luận không nằm trong file tạm.** Quyết định của lượt này vào `BRIEF.md` ngay lượt đó — vì sao và mẫu file ở [[ag-18-brief-la-shared-state]].
4. **Tiến trình con chết theo session.** Dev server, emulator chạy từ session agent sẽ chết khi session restart; "tính năng biến mất sau restart" thường là triệu chứng này, không phải hồi quy code.

Phép thử nhanh cho một kế hoạch lưu trữ: "nếu bây giờ tôi reboot máy và mở session mới, worker lượt sau còn đọc được mọi thứ nó cần không?" Không trả lời "có" được thì kế hoạch đó hỏng.

---

## 4. Làm thử

Mục tiêu: tự dựng lại bốn hiện tượng của §3 trên một repo tạm, rồi cài script dọn worktree an toàn. Cần git ≥ 2.31 (cho `--path-format`, không bắt buộc) và Node chỉ nếu muốn thử bước duyệt cây. Thời gian: tự đo.

**Bước 1 — dựng repo tạm.**

```bash
mkdir -p ~/wt-lab && cd ~/wt-lab
git init -q -b main repo && cd repo
git config user.email you@example.com && git config user.name you
printf 'export const lessons = [\n  { slug: "l-01" },\n];\n' > registry.js
echo 'web = 1' > app.toml
git add . && git commit -qm init
git init -q --bare ../remote.git && git remote add origin ../remote.git && git push -q origin main
```

**Bước 2 — khoá nhánh và stash chung.**

```bash
git worktree add -q ../wt-a -b task-a
git checkout task-a            # kỳ vọng: fatal ... already used by worktree
cd ../wt-a && echo x >> app.toml && git stash -q && cd ../repo
git stash list                 # kỳ vọng: thấy stash tạo ở wt-a
git stash drop -q
```

**Bước 3 — xung đột registry.** Trong hai worktree, mỗi cái thêm một dòng ngay trước `];` (sửa tay bằng editor hoặc `sed`), commit, rồi ở repo chính `git merge` lần lượt hai nhánh. Kỳ vọng: merge thứ hai báo `CONFLICT (content): Merge conflict in registry.js`. `git merge --abort`, rồi làm lại theo cách 1 ở §3.3: hai worker **không** sửa `registry.js`, chỉ ghi slug vào `reports/<task>.md`; bạn đóng vai main agent thêm hai dòng một lần.

**Bước 4 — worktree trong repo.**

```bash
echo ".claude/worktrees/" > .gitignore
git worktree add -q .claude/worktrees/t1 -b t1
git status --short                          # .claude/worktrees/ không còn hiện
find . -name app.toml -not -path './.git/*' # kỳ vọng: 2 dòng — gitignore không chặn tool
```

**Bước 5 — cài script dọn.** Lưu thành `bin/wt-reap.sh` (đã chạy thử trên git 2.48 với sáu ca: lock, detached, thư mục đã mất, bẩn, commit chưa push, sạch-đã-push):

```bash
#!/usr/bin/env bash
# wt-reap.sh — chỉ gỡ worktree AN TOÀN để gỡ. Mặc định chỉ in; thêm --apply để gỡ thật.
set -euo pipefail
APPLY=0; [ "${1:-}" = "--apply" ] && APPLY=1

# Bản ghi đầu tiên của `list --porcelain` luôn là worktree chính -> bỏ qua (n>1).
git worktree list --porcelain | awk '
  /^worktree /{n++; p=substr($0,10); b=""; l="-"}
  /^branch /{b=substr($0,19)}            # bỏ tiền tố "branch refs/heads/"
  /^locked/{l=(length($0)>7)?substr($0,8):"(không lý do)"}
  /^$/{if(n>1) print p "|" b "|" l}
  END{if(n>1 && p!="") print p "|" b "|" l}' | sort -u |
while IFS="|" read -r path branch lock; do
  if [ ! -d "$path" ]; then echo "PRUNE  $path — thư mục đã mất"; continue; fi
  if [ "$lock" != "-" ]; then echo "KEEP   $path — lock: $lock"; continue; fi
  dirty=$(git -C "$path" status --porcelain | wc -l | tr -d ' ')
  if [ "$dirty" != 0 ]; then echo "KEEP   $path — $dirty file chưa commit"; continue; fi
  if [ -z "$branch" ]; then echo "KEEP   $path — detached HEAD, tự xem"; continue; fi
  up=$(git -C "$path" rev-parse --abbrev-ref '@{u}' 2>/dev/null || true)
  if [ -z "$up" ]; then echo "KEEP   $path — nhánh $branch chưa push"; continue; fi
  ahead=$(git -C "$path" rev-list --count "$up..HEAD")
  if [ "$ahead" != 0 ]; then echo "KEEP   $path — $ahead commit chưa push"; continue; fi
  echo "REMOVE $path — $branch sạch, đã push"
  if [ "$APPLY" = 1 ]; then git worktree remove "$path"; fi
done
if [ "$APPLY" = 1 ]; then git worktree prune -v; fi
```

Vì sao dùng `|` làm dấu phân cách: với `IFS=$'\t'`, bash gộp hai tab liền nhau thành một (tab là ký tự khoảng trắng của IFS), nên worktree detached — cột nhánh rỗng — bị lệch cột. Lỗi này xuất hiện ở lần chạy thử đầu tiên của chính script này.

Dựng đủ ca rồi chạy:

```bash
chmod +x bin/wt-reap.sh
git worktree lock --reason "worker T1 dang chay" .claude/worktrees/t1
git worktree add -q ../wt-clean -b clean && (cd ../wt-clean && git push -q -u origin clean)
git worktree add -q ../wt-dirty -b dirty && echo z > ../wt-dirty/z.txt
bin/wt-reap.sh            # chỉ in
bin/wt-reap.sh --apply    # gỡ thật
git worktree list
```

**Tiêu chí xong** — kiểm được bằng lệnh:

- [ ] Bước 2 in đúng `fatal: 'task-a' is already used by worktree at …` và `git stash list` ở repo chính có một dòng.
- [ ] Bước 3 in `CONFLICT (content)` với cách làm sai, và `git merge` cả hai nhánh **không** xung đột với cách một-người-ghi.
- [ ] Bước 4 `find` in đúng 2 dòng dù `git status` sạch.
- [ ] Sau `--apply`: `git worktree list` **còn** `t1` (locked), `wt-dirty`, `wt-a`; **mất** `wt-clean`. `git branch --list clean` vẫn in `clean`.

---

## 5. Bẫy thường gặp

### 🪤 Bẫy 1 — Worker không thấy thay đổi chưa commit

**Triệu chứng.** Bạn sửa dở vài file ở working copy chính, giao subagent "làm tiếp phần còn lại" trong worktree; nó báo không tìm thấy hàm bạn vừa viết, hoặc viết lại từ đầu.

**Nguyên nhân gốc.** Worktree là checkout của một **commit**. Thay đổi chưa commit chỉ nằm trong thư mục của bạn. Thêm vào đó, worktree của Claude Code mặc định branch từ nhánh mặc định trên remote, không phải `HEAD` hiện tại (docs: `worktree.baseRef` mặc định `"fresh"`).

**Chặn bằng cơ chế.** Commit (hoặc tạo nhánh nháp) trước khi giao; với Claude Code đặt `"worktree": { "baseRef": "head" }` trong settings khi subagent cần làm trên việc đang dở. Brief ghi rõ commit gốc (`git rev-parse HEAD`) để worker tự kiểm `git log -1` của nó khớp.

### 🪤 Bẫy 2 — "Dọn rác" xoá việc của session khác

**Triệu chứng.** Thấy `.claude/worktrees/` có năm thư mục, nghĩ là rác, `rm -rf` hoặc `git worktree remove --force` hết. Một session khác đang chạy mất file chưa commit.

**Nguyên nhân gốc.** Không có chỗ nào ghi worktree nào thuộc ai, còn sống hay không; quyết định dựa trên cảm giác.

**Chặn bằng cơ chế.** Agent `lock --reason "<task> <thời điểm>"` khi bắt đầu, `unlock` khi xong. Dọn chỉ bằng script kiểu `wt-reap.sh` (bỏ qua lock, bẩn, chưa push). Cấm `--force` trong skill dọn — có thể chặn hẳn bằng permission deny cho `git worktree remove -f*` theo cách ở [[ag-08-hook-va-chan-bang-cau-hinh]].

### 🪤 Bẫy 3 — Worker tự đổi tên nhánh

**Triệu chứng.** Coordinator checkout nhánh `agent/T3` để chấm thì lỗi; hoặc tệ hơn, checkout thất bại im lặng và verifier chấm lại commit cũ.

**Nguyên nhân gốc.** Tên nhánh là con trỏ ai cũng sửa được. Worker áp một luật đặt tên nhánh chung (vd "tên nhánh ngắn") lên nhánh do harness tạo, dùng `git branch -m`. Coordinator vẫn giữ tên cũ trong record (kinh nghiệm thực tế, cơ chế chi tiết ở [[ag-12-verifier-doc-lap]]).

**Chặn bằng cơ chế.** Coordinator neo vào **SHA**, không vào tên nhánh: chấm bằng `git -C <worktree> rev-parse HEAD` rồi `checkout --detach <sha>`, và kiểm mã thoát. Brief cấm `branch -m` / `checkout -b` và nói rõ tên nhánh là khoá liên kết.

### 🪤 Bẫy 4 — Hai agent cùng cổng, cùng DB

**Triệu chứng.** Test của agent B fail ngẫu nhiên ("bản ghi lạ", "cổng đã dùng") trong khi chạy riêng thì xanh.

**Nguyên nhân gốc.** Worktree chỉ tách file. Cổng mạng, DB/emulator local, cache trong `$HOME` vẫn chung (§3.2).

**Chặn bằng cơ chế.** Brief cấp cho mỗi worker một tài nguyên riêng: cổng = cổng gốc + số thứ tự task, tên DB/namespace có hậu tố task. Không cấp được thì đưa task đó vào nhóm verify **tuần tự** thay vì song song.

### 🪤 Bẫy 5 — Báo cáo "đã gỡ worktree" mà nhánh vẫn khoá

**Triệu chứng.** Agent báo xong, nhưng `git checkout <nhánh>` vẫn `already used by worktree`.

**Nguyên nhân gốc.** Agent xoá thư mục (`rm -rf`) chứ không `git worktree remove`; metadata ở `.git/worktrees/<tên>` còn, nhánh vẫn bị coi là đang checkout tới khi `prune`.

**Chặn bằng cơ chế.** Done-criteria của bước dọn là lệnh, không phải câu báo: `git worktree list --porcelain | grep -c "branch refs/heads/<nhánh>"` phải in `0`. Script dọn luôn kết thúc bằng `git worktree prune -v`.

---

## 6. Chuyển giao

- Bài trước, [[ag-14-subagent-va-brief]], dạy giao việc bằng brief. Bài này cho mỗi người nhận việc một bàn làm việc riêng, và chỉ ra các thứ bàn riêng **không** tách được — chúng phải nằm trong brief: danh sách file cấm (file chung), tài nguyên cấp riêng (cổng, DB), commit gốc, chỗ ghi report.
- [[ag-16-hai-ho-model]]: khi worker là một họ model khác chạy trong worktree, cùng luật lock/SHA/report-trong-repo áp nguyên.
- [[ag-17-soat-cheo-noi-dung]]: worktree tách file nhưng cũng làm agent **không đọc được** phần của nhau — nguồn của lỗi "đúng từng phần, sai tổng thể".
- Level 6, [[ag-18-brief-la-shared-state]] và [[ag-19-vong-lap-nhat-task]]: loop tạo và dọn worktree mỗi lượt, không có người đứng xem. Mọi thứ trong bài này — lock khi bắt đầu, dọn bằng script, bằng chứng vào repo — trở thành bước bắt buộc của vòng lặp. Thứ level 6 bỏ được nhờ đó: người không cần ngồi kiểm `git worktree list` sau mỗi lượt.
- Ôn nhánh và xung đột ở mức git thuần: [[git-02-branches]], [[git-08-branching-conflict]]; cứu commit khi lỡ `--force`: [[git-05-undo-rescue]].

---

## 7. Tóm tắt

- Worktree = thư mục làm việc riêng (file, `HEAD`, index) gắn vào **cùng** kho git; rẻ hơn clone vì không nhân bản lịch sử, và thấy commit của nhau tức thì.
- Mọi ref dưới `refs/` (nhánh, **stash**) và `.git/config` là chung; cổng, DB local, cache cũng chung. Worktree chỉ tách file.
- File chung (registry, lockfile) không va chạm lúc sửa mà va chạm lúc merge → chỉ định **một người ghi**; `merge=union` chỉ cho file thuần mỗi-dòng-một-mục, vì nó nuốt cả xung đột thật.
- Một nhánh chỉ checkout ở một worktree → worktree bỏ quên khoá nhánh của người. `add` thô vào nhánh có sẵn thì gỡ ngay trong cùng lượt.
- Gỡ bằng `remove` (git tự từ chối khi bẩn), dọn bằng `prune`; agent đang chạy thì `lock --reason`. Không bao giờ `--force` trong script dọn.
- Worktree trong repo làm tool duyệt cây thấy N+1 bản; `.gitignore` không cứu được — khai báo phạm vi cho từng tool.
- Bằng chứng và kết luận của worker vào nhánh đã push hoặc file trong repo chính; `/tmp`, scratchpad và worktree đều có chủ khác dọn.
