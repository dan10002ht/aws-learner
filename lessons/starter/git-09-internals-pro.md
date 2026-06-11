# Git internals & công cụ pro

Bạn đã add/commit/branch/PR thành thạo. Nhưng khi đi làm thật, sẽ có ngày bạn gặp những thứ "ngoài giáo trình": một dòng `detached HEAD` đỏ lòm khiến cả văn phòng hốt hoảng, một file binary 200MB làm repo phình to mãi mãi, một commit bị từ chối vì "không ký GPG", hay một thư mục `vendor/` lạ hoắc gọi là `submodule`. Bài này mổ xẻ **Git từ bên trong** — hiểu bản chất rồi thì mọi "phép màu" trở thành logic, và bạn sẽ cầm trong tay bộ công cụ của dân pro.

> 💡 Ghi nhớ: 90% sự sợ hãi với Git đến từ việc coi nó như "hộp đen ma thuật". Sự thật, Git chỉ là **một cơ sở dữ liệu key-value đơn giản** lưu các "ảnh chụp" file. Hiểu đúng 4 loại object dưới đây, bạn sẽ ngừng sợ Git mãi mãi.

## 1. Object model: Git thật ra lưu cái gì?

Mở `.git/objects` ra, bạn sẽ thấy Git **không** lưu "diff" (khác biệt giữa các phiên bản) như nhiều người tưởng. Git lưu **toàn bộ ảnh chụp (snapshot)** dưới dạng 4 loại object, mỗi object được định danh bằng một mã băm SHA-1 (40 ký tự hex).

| Object | Lưu cái gì | Ví đời thường |
|---|---|---|
| **blob** | Nội dung *một file* (không gồm tên file) | Một tờ giấy có chữ, chưa dán nhãn |
| **tree** | Danh sách tên + quyền + SHA của blob/tree con | Một thư mục: bảng kê "tên → tờ giấy nào" |
| **commit** | Trỏ tới 1 tree + cha (parent) + tác giả + message | Biên lai: "ảnh chụp này, do ai, lúc nào, vì sao" |
| **tag** (annotated) | Trỏ tới 1 commit + người tạo + message | Con tem dán nhãn "phiên bản v1.0.0" |

### Content-addressable: SHA chính là địa chỉ

Điểm cốt lõi: tên (key) của mỗi object **chính là SHA của nội dung nó**. Cùng một nội dung → cùng một SHA → Git chỉ lưu **một bản duy nhất**. Đó là lý do copy file giống hệt nhau không làm repo phình to.

```bash
# Tự tay tạo một blob để thấy SHA sinh ra thế nào
echo "Xin chào" | git hash-object --stdin
# 8b7a3f... (luôn ra đúng SHA này với đúng nội dung này, trên mọi máy)
```

### Bóc tách một object bằng tay

```bash
git cat-file -t HEAD        # -t: type → "commit"
git cat-file -p HEAD        # -p: pretty print → xem nội dung commit
```

Output mẫu của `git cat-file -p HEAD`:

```
tree   9f1c2a7b...          <- commit này trỏ tới tree (ảnh chụp toàn dự án)
parent 3e4d5c6a...          <- commit cha (commit ngay trước)
author Dan <dan@mail.com> 1718000000 +0700
committer Dan <dan@mail.com> 1718000000 +0700

Thêm trang thanh toán          <- message
```

Đi sâu thêm một tầng — xem tree đó chứa gì:

```bash
git cat-file -p 9f1c2a7b
```

```
100644 blob a1b2c3...  index.html      <- file thường
100755 blob d4e5f6...  build.sh        <- file có quyền execute (755)
040000 tree 7a8b9c...  src             <- thư mục con = một tree khác
```

### Sơ đồ: một commit móc nối ra sao

```
commit  ──trỏ tới──►  tree (root)
  │                     ├── blob   index.html
  │ parent              ├── blob   build.sh
  ▼                     └── tree   src
commit (cha)                  ├── blob  app.js
  │                           └── blob  style.css
  ▼
commit (ông) ...
```

Mỗi commit trỏ về commit cha → cả lịch sử là một **chuỗi liên kết bất biến**. Đổi một byte ở file cũ → đổi SHA của blob → đổi SHA của tree → đổi SHA của mọi commit từ đó về sau. Đây chính là cơ chế khiến lịch sử Git **không thể bị sửa lén** mà không ai biết.

> 💡 Ghi nhớ: Commit **không** lưu "thay đổi", nó lưu **toàn bộ ảnh chụp** (qua tree). "Diff" mà bạn thấy trong `git diff` là Git **tính ra tại chỗ** bằng cách so hai ảnh chụp. Hiểu điều này, bạn sẽ thôi ngạc nhiên vì sao checkout commit cũ lại nhanh đến vậy.

## 2. Refs, HEAD, branch — tất cả chỉ là con trỏ

Đây là kiến thức "bừng tỉnh" của nhiều người. **Branch không phải là một bản sao code.** Một branch chỉ là **một file text 41 byte chứa SHA của commit cuối cùng**.

```bash
cat .git/refs/heads/main
# 3e4d5c6a9f1b2c... (chỉ là một dòng SHA!)
```

- **ref** (reference): một cái tên dễ nhớ trỏ tới một SHA. `main`, `v1.0.0`, `origin/main` đều là ref.
- **HEAD**: con trỏ "bạn đang đứng ở đâu". Bình thường HEAD trỏ tới *tên một branch*, chứ không trỏ thẳng vào commit.

```bash
cat .git/HEAD
# ref: refs/heads/main   <- HEAD trỏ tới branch main, main trỏ tới commit
```

### Sơ đồ: HEAD → branch → commit

```
HEAD ──► main ──►  C3 ──► C2 ──► C1
                   (commit mới nhất)

# Khi bạn commit: tạo C4, rồi CHỈ cần dời con trỏ main sang C4.
HEAD ──► main ──►  C4 ──► C3 ──► C2 ──► C1
```

Tạo branch mới chỉ là **ghi thêm một file 41 byte** → đó là lý do branch trong Git nhanh và rẻ đến mức "vô hạn", khác hẳn các hệ cũ phải copy cả thư mục.

### Detached HEAD: khi HEAD trỏ thẳng vào commit

Khi bạn `git checkout <SHA>` (hay checkout một tag), HEAD **trỏ thẳng vào commit** thay vì trỏ qua branch. Git gọi đây là *detached HEAD* (HEAD "rời nhánh").

```bash
git checkout 3e4d5c6
# Note: switching to '3e4d5c6'.
# You are in 'detached HEAD' state...
```

```
# Bình thường:        HEAD ──► main ──► C3
# Detached HEAD:       HEAD ──────────► C2     (không qua branch nào)
                              main ──► C3
```

Detached HEAD **không phải lỗi** — nó hữu ích để xem lại code cũ, thử nghiệm. Nguy hiểm duy nhất: nếu bạn **commit** trong trạng thái này rồi `switch` sang nhánh khác, các commit mới *không có nhánh nào trỏ tới* → dễ bị "lạc" (nhưng vẫn cứu được bằng `reflog`, đã học ở bài trước).

```bash
# Lỡ commit trong detached HEAD và muốn giữ lại:
git switch -c nhanh-cuu-vot    # gắn một branch mới vào đúng chỗ đang đứng
```

> ⚠️ Bẫy: Thấy `detached HEAD` đừng hoảng. Nó **không** mất data. Nếu chưa commit gì thì cứ `git switch main` là về bình thường. Chỉ cần nhớ: muốn giữ commit tạo ra ở đây thì **gắn branch trước khi rời đi**.

## 3. Bên trong thư mục `.git`

```
.git/
├── HEAD            # bạn đang đứng ở đâu
├── config          # cấu hình riêng của repo này (remote, user...)
├── objects/        # toàn bộ blob/tree/commit/tag (cái "database")
├── refs/
│   ├── heads/      # các branch local
│   └── tags/       # các tag
├── logs/           # reflog nằm ở đây
├── hooks/          # script tự động (mục 4)
└── index           # staging area (khu chờ) — KHÔNG phải file text
```

Xoá `.git` = biến dự án thành thư mục thường, **mất toàn bộ lịch sử**. Ngược lại, chỉ cần `.git` là đủ tái dựng mọi file (đó là cách `git clone` hoạt động).

## 4. Git hooks — tự động hoá tại chỗ then chốt

**Hook** là các script Git tự chạy tại những thời điểm nhất định. Chúng nằm trong `.git/hooks/`. Hook hữu ích nhất là **pre-commit** — chạy *trước khi* commit hoàn tất; nếu script trả về mã khác 0 thì commit bị chặn.

```bash
# .git/hooks/pre-commit  (nhớ chmod +x)
#!/bin/sh
npm run lint || exit 1     # lint fail thì chặn commit
```

> ⚠️ Bẫy: Thư mục `.git/hooks/` **không được commit** lên repo → đồng đội không tự có hook của bạn. Vì thế thực tế người ta dùng công cụ quản lý hook bên ngoài, phổ biến nhất là **husky** (cho dự án JS/Node).

### husky + lint-staged: combo chuẩn công nghiệp

- **husky**: cài hook vào repo theo cách *commit được, chia sẻ được* cho cả team.
- **lint-staged**: chỉ chạy linter/formatter trên **các file đang staged**, không quét cả dự án → nhanh.

```bash
npm install -D husky lint-staged
npx husky init                 # tạo .husky/ và hook pre-commit
```

```json
// package.json
"lint-staged": {
  "*.{js,ts,tsx}": ["eslint --fix", "prettier --write"]
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

Kết quả: mỗi `git commit`, chỉ các file vừa sửa được tự động lint + format. Code bẩn không lọt vào lịch sử.

> 💡 Ghi nhớ: Hook chạy **ở máy local** nên có thể bị bỏ qua (`git commit --no-verify`). Vì vậy hook chỉ là "tuyến phòng thủ đầu" cho tiện; tuyến phòng thủ thật, bắt buộc, phải đặt ở **CI trên server** (sẽ học ở khoá CI/CD).

## 5. Tag & semantic release

**Tag** là cái nhãn cố định gắn vào một commit, thường dùng đánh dấu phiên bản phát hành (release). Có hai loại:

```bash
git tag v1.0.0                          # lightweight: chỉ là con trỏ, như branch không di chuyển
git tag -a v1.0.0 -m "Bản phát hành đầu" # annotated: là một OBJECT thật, có tác giả + ngày + message
```

| | Lightweight | Annotated |
|---|---|---|
| Bản chất | Chỉ một ref trỏ tới commit | Một git object đầy đủ |
| Lưu tác giả/ngày/message? | Không | Có |
| Dùng cho | Đánh dấu tạm cá nhân | **Release chính thức** (nên dùng cái này) |

```bash
git tag                       # liệt kê tag
git push origin v1.0.0        # tag KHÔNG tự push, phải đẩy riêng
git push origin --tags        # đẩy hết tag
```

### Semantic Versioning (semver): `MAJOR.MINOR.PATCH`

- **MAJOR** (1.x.x): thay đổi phá vỡ tương thích (breaking change).
- **MINOR** (x.1.x): thêm tính năng, vẫn tương thích ngược.
- **PATCH** (x.x.1): sửa lỗi nhỏ.

Công cụ như **semantic-release** đọc các commit message (theo Conventional Commits: `feat:`, `fix:`, `BREAKING CHANGE:`) để **tự động** quyết định version mới, tạo tag, sinh changelog và publish — không cần ai bấm tay.

> 💡 Ghi nhớ: Release chính thức luôn dùng **annotated tag** (`-a`). Nó mang đủ thông tin "ai đóng dấu, lúc nào, vì sao", và là thứ mà `git describe` cùng các pipeline phát hành dựa vào.

## 6. Submodule vs Subtree vs Monorepo

Khi dự án cần dùng *một repo khác bên trong nó* (thư viện nội bộ, theme dùng chung...), có ba hướng đi:

### Submodule — repo lồng trong repo

Repo cha chỉ lưu **một con trỏ SHA** tới commit của repo con, không lưu code con.

```bash
git submodule add https://github.com/cty/thu-vien.git vendor/thu-vien
git clone --recurse-submodules <url>      # clone phải kèm cờ này, nếu không vendor/ rỗng
git submodule update --init --recursive   # lỡ quên thì chạy cái này
```

```
repo-cha
├── src/
└── vendor/thu-vien  ──► (chỉ là con trỏ tới commit abc123 của repo con)
```

> ⚠️ Bẫy: Submodule nổi tiếng "khó nhằn". Lỗi kinh điển: clone xong thấy `vendor/` **rỗng** vì quên `--recurse-submodules`. Cập nhật submodule cũng phải làm hai bước (vào repo con pull, rồi commit con trỏ mới ở repo cha) — quên là cả team kéo về sai phiên bản.

### Subtree — nhập code con thành một phần repo cha

```bash
git subtree add --prefix=vendor/thu-vien <url> main --squash
```

Code con được **copy thẳng** vào repo cha. Người clone không cần biết subtree là gì (clone bình thường là có đủ code), nhưng lịch sử trộn lẫn và lệnh đồng bộ ngược lên phức tạp hơn.

### Monorepo — một repo chứa tất cả

Nhiều dự án/package sống chung trong **một** repo (Google, Meta dùng cách này). Quản lý bằng công cụ như Nx, Turborepo, pnpm workspaces. Đơn giản về mặt Git, đổi lại repo to và cần tooling để build/test chọn lọc.

| | Submodule | Subtree | Monorepo |
|---|---|---|---|
| Code con nằm trong repo cha? | Không (chỉ con trỏ) | Có (copy vào) | Có (cùng repo) |
| Clone cần thao tác đặc biệt? | Có (`--recurse`) | Không | Không |
| Độ phức tạp vận hành | Cao | Trung bình | Thấp (về Git), cần tooling |
| Hợp khi nào | Chia sẻ lib có version riêng chặt | Hiếm, dự án nhỏ | Đa số team hiện đại |

## 7. Git LFS — chứa file lớn cho đúng cách

Git được sinh ra cho **file text nhỏ**. Bỏ file binary lớn (video, .psd, dataset, model AI) vào commit là thảm hoạ: vì mỗi phiên bản là một blob mới, sửa file 100MB mười lần → repo phình **1GB** và clone chậm vĩnh viễn (lịch sử rất khó xoá).

**Git LFS** (Large File Storage) giải bài này: trong repo, file lớn được thay bằng một **con trỏ text nhỏ xíu**; nội dung thật nằm trên server LFS riêng, chỉ tải về khi cần.

```bash
git lfs install
git lfs track "*.psd"          # khai báo loại file dùng LFS
git lfs track "*.mp4"
git add .gitattributes         # LFS ghi luật vào file này — PHẢI commit nó
git add video.mp4 && git commit -m "Thêm video demo"
```

> ⚠️ Bẫy: LFS phải bật **trước khi** commit file lớn. Nếu file bự đã lỡ vào lịch sử, gỡ ra rất đau (phải `git filter-repo` viết lại toàn bộ lịch sử). Quy tắc: dự án có asset lớn → cấu hình LFS ngay từ commit đầu tiên.

## 8. Ký commit bằng GPG / SSH

Mặc định, trường `author` trong commit là **text tự khai** — bất kỳ ai cũng có thể đặt `user.name`/`user.email` thành tên bạn và "giả mạo" commit. Ký commit (signing) dùng khoá mật mã để chứng minh **commit này thật sự do bạn tạo**. GitHub hiển thị nhãn **"Verified"** màu xanh cho commit đã ký.

```bash
# Cách hiện đại, dễ nhất: ký bằng SSH key (chính key bạn đã dùng để push)
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true     # tự ký mọi commit

git commit -m "Sửa lỗi bảo mật"             # giờ commit này được ký
git log --show-signature -1                 # kiểm tra chữ ký
```

(Cách truyền thống dùng **GPG key** cũng tương tự, chỉ khác `gpg.format`.) Sau khi tạo key, nhớ **dán public key vào GitHub** ở mục *SSH and GPG keys* loại "Signing Key" thì nhãn Verified mới hiện.

> 💡 Ghi nhớ: Nhiều công ty bật rule **bắt buộc commit phải ký** mới được merge. Ký commit không mã hoá code — nó chỉ **xác thực danh tính**, chống mạo danh trong lịch sử.

## 9. `.gitignore` & `.gitattributes` nâng cao

### `.gitignore` — đừng để file rác lọt vào

```gitignore
node_modules/          # thư mục dependency, không bao giờ commit
.env                   # SECRET — commit lên là rò rỉ, cực nguy hiểm
dist/                  # output build, sinh lại được
*.log
!important.log         # dấu ! = ngoại lệ: file này VẪN theo dõi
```

> ⚠️ Bẫy: `.gitignore` chỉ có tác dụng với file **chưa từng được track**. File đã lỡ commit rồi thì thêm vào `.gitignore` *vô dụng* — phải gỡ khỏi tracking: `git rm --cached .env` rồi commit. (Và nếu `.env` đã từng push, coi như secret đã lộ → phải đổi secret ngay, không chỉ xoá file.)

### `.gitattributes` — điều khiển cách Git xử lý file

```gitattributes
* text=auto                       # tự chuẩn hoá xuống dòng (line ending)
*.sh text eol=lf                  # script luôn dùng LF (tránh lỗi trên Linux)
*.png binary                      # đánh dấu binary: không cố diff/merge
*.psd filter=lfs diff=lfs -text   # giao cho Git LFS xử lý
package-lock.json -diff           # đừng hiển thị diff khổng lồ của file này
*.rb linguist-language=Ruby       # ghi đè cách GitHub nhận diện ngôn ngữ
```

`.gitattributes` giải triệt để cái bệnh kinh điển của team đa hệ điều hành: Windows dùng CRLF, Linux/macOS dùng LF, khiến `git diff` báo "cả file thay đổi" dù chẳng ai sửa gì. Đặt `* text=auto` là dẹp loạn.

> 💡 Ghi nhớ: `.gitignore` quyết định **file nào được theo dõi**; `.gitattributes` quyết định **file được theo dõi sẽ xử lý ra sao** (line ending, diff, merge, LFS). Hai file này khác nhau, dân pro dùng cả hai.

## 10. Git worktree — nhiều nhánh, nhiều thư mục, một repo

Tình huống thật: bạn đang code dở nhánh `feature` thì cần *gấp* review một PR ở nhánh khác. Cách cũ: `stash`, `switch`, xong `switch` lại, `stash pop` — phiền và dễ rối. **git worktree** cho phép **checkout nhiều nhánh ra nhiều thư mục cùng lúc**, dùng chung một kho `.git`.

```bash
git worktree add ../duan-hotfix hotfix   # tạo thư mục mới checkout sẵn nhánh hotfix
cd ../duan-hotfix                         # qua đây sửa, không đụng gì code đang dở
# ... sửa, commit, push ...
git worktree remove ../duan-hotfix        # xong thì dọn
git worktree list                         # xem các worktree đang có
```

```
my-repo/            (worktree chính, nhánh feature — code đang dở yên nguyên)
duan-hotfix/        (worktree phụ, nhánh hotfix — sửa song song)
        └── cả hai dùng chung MỘT .git, không clone lại, không tốn dung lượng nhân đôi
```

So với clone lần hai: worktree **dùng chung object database** nên nhẹ hơn nhiều, và các nhánh đồng bộ tức thì.

> ⚠️ Bẫy: Một nhánh **không thể** được checkout ở hai worktree cùng lúc — Git sẽ chặn để tránh hai nơi giẫm chân nhau. Mỗi worktree giữ một nhánh riêng.

## 11. Tổng kết

| Khái niệm | Một câu cốt lõi |
|---|---|
| Object model | Git lưu **ảnh chụp** qua blob/tree/commit, định danh bằng **SHA của nội dung** |
| Refs / HEAD / branch | Tất cả chỉ là **con trỏ tới SHA**; branch là file 41 byte |
| Detached HEAD | HEAD trỏ thẳng commit; không mất data, nhớ **gắn branch trước khi rời** |
| Hooks (husky/lint-staged) | Script tự chạy lúc commit; tuyến phòng thủ tiện lợi, **thật sự nằm ở CI** |
| Tag & semver | **Annotated tag** cho release; semantic-release tự hoá version |
| Submodule/Subtree/Monorepo | Ba cách lồng repo; đa số team hiện đại chọn **monorepo** |
| Git LFS | File lớn → **con trỏ + server riêng**; bật từ commit đầu |
| Ký commit | GPG/SSH → nhãn **Verified**, chống mạo danh, không mã hoá code |
| .gitignore / .gitattributes | "Track file nào" vs "xử lý file ra sao" |
| Worktree | Nhiều nhánh ra nhiều thư mục, **chung một `.git`** |

> 💡 Ghi nhớ cuối bài: Cái khiến bạn từ "biết dùng Git" lên "làm chủ Git" không phải thuộc thêm lệnh, mà là **mô hình tư duy đúng**: Git là database các ảnh chụp bất biến, mọi tên gọi chỉ là con trỏ tới SHA. Khi đã thấy bức tranh đó, bạn đọc được mọi trạng thái lạ, và không lệnh nào còn làm bạn hoảng nữa.
