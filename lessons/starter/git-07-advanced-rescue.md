# Cứu hộ nâng cao: reflog, bisect, cherry-pick

Đây là bài "lính cứu hỏa" của khoá. Khi bạn `reset --hard` nhầm, rebase hỏng, mất commit, hoặc cần truy lùng commit gây bug giữa 500 commit — những lệnh trong bài này là thứ phân biệt người "biết Git" với người "làm chủ Git".

## 1. git reflog — không gì thực sự mất

Mỗi khi `HEAD` di chuyển (commit, checkout, reset, rebase, merge), Git ghi lại vào **reflog**. Đây là nhật ký riêng của máy bạn, không push lên remote. Commit "mất" sau `reset --hard` thực ra vẫn nằm trong kho object khoảng 30–90 ngày — reflog cho bạn địa chỉ để quay lại.

```bash
git reflog
```

Output mẫu:

```
9a1f2c3 (HEAD -> main) HEAD@{0}: reset: moving to HEAD~3
7b4d5e6 HEAD@{1}: commit: them validate email
c2e8f01 HEAD@{2}: commit: refactor service user
3d9a0b7 HEAD@{3}: commit: fix bug login
9a1f2c3 HEAD@{4}: commit: setup project
```

Cú pháp `HEAD@{n}` nghĩa là "vị trí HEAD cách đây n bước". Cột bên trái là hash của commit tại thời điểm đó.

### Tình huống thật: lỡ tay `git reset --hard HEAD~3`

Bạn vừa xoá sạch 3 commit chưa push. Hoảng loạn? Đừng.

```bash
# Xem mình vừa ở đâu trước khi reset
git reflog
# 7b4d5e6 HEAD@{1}: commit: them validate email   <-- day la dinh truoc khi xoa

# Quay lai dung diem do
git reset --hard 7b4d5e6
```

Hoặc nếu chỉ muốn "nhặt" lại các commit mà không reset cả branch:

```bash
git cherry-pick 7b4d5e6
```

Sơ đồ điều xảy ra:

```
Truoc reset:   A---B---C---D   (main, HEAD)
                       reset --hard HEAD~3
Sau reset:     A               (main, HEAD)   B,C,D "mat" khoi nhanh
                       reset --hard 7b4d5e6 (= D)
Phuc hoi:      A---B---C---D   (main, HEAD)   B,C,D quay lai
```

> 💡 Ghi nhớ: Trước mọi thao tác "nguy hiểm" (`reset --hard`, `rebase`, `filter-branch`), cứ chạy `git reflog` một lần để nhớ điểm hiện tại. Reflog là phao cứu sinh — nhưng nó là **local**, clone mới sẽ không có.

### Rebase hỏng — quay về trước rebase

```bash
git rebase -i HEAD~5
# ... ban giai quyet conflict sai, lich su loan het
git rebase --abort        # neu dang con giua chung
```

Nếu rebase đã "xong" nhưng kết quả sai, reflog có một mục đặc biệt là `ORIG_HEAD`:

```bash
git reset --hard ORIG_HEAD
# hoac
git reflog
# tim dong "rebase (finish)" / "rebase -i (start)", lay hash NGAY TRUOC do
git reset --hard HEAD@{7}
```

> ⚠️ Bẫy: `ORIG_HEAD` chỉ lưu **một** thao tác gần nhất (reset/rebase/merge). Nếu sau rebase bạn lại làm thêm reset, `ORIG_HEAD` đã bị ghi đè — lúc đó phải dùng `git reflog` để tìm tay.

## 2. git bisect — truy lùng commit gây bug bằng binary search

Bug xuất hiện đâu đó trong 200 commit gần nhất. Code review từng commit = mất cả ngày. `git bisect` chia đôi liên tục: với 200 commit chỉ cần kiểm tra ~8 lần (log₂200 ≈ 7.6).

Ý tưởng: bạn chỉ cho Git biết một commit **tốt** (bug chưa có) và một commit **xấu** (bug đã có). Git tự checkout commit ở giữa, bạn test rồi báo good/bad, nó thu hẹp dần.

```bash
git bisect start
git bisect bad                 # commit hien tai (HEAD) co bug
git bisect good v1.4.0         # ban tag/commit nay chua co bug
```

Output:

```
Bisecting: 96 revisions left to test after this (roughly 7 steps)
[c0ffee1] them tinh nang export CSV
```

Git vừa checkout `c0ffee1`. Bạn chạy app/test, rồi báo kết quả:

```bash
# Neu commit nay van loi:
git bisect bad
# Neu commit nay khong loi:
git bisect good
```

Lặp lại đến khi Git in ra thủ phạm:

```
b4dc0de is the first bad commit
commit b4dc0de
Author: Lan Nguyen <lan@team.vn>
    refactor: doi cach tinh tong gio lam

 src/payroll.ts | 14 +++++---
```

Kết thúc — **bắt buộc** trả về branch ban đầu:

```bash
git bisect reset
```

### bisect run — tự động hoá hoàn toàn

Nếu bạn có một lệnh test cho biết good/bad (exit code 0 = good, khác 0 = bad), để Git tự chạy:

```bash
git bisect start HEAD v1.4.0   # bad truoc, good sau (rut gon)
git bisect run npm test -- payroll.spec.ts
```

Git tự checkout từng commit giữa, chạy test, đọc exit code, và in ra thủ phạm mà bạn đi pha cà phê. Một script tuỳ biến cũng được:

```bash
git bisect run ./scripts/check-bug.sh
```

```bash
#!/bin/bash
# check-bug.sh: exit 0 neu OK, exit 1 neu co bug
npm run build || exit 125   # 125 = "khong test duoc commit nay, bo qua"
node dist/check.js
```

Sơ đồ binary search trên 8 commit:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>git bisect — binary search thu hẹp một nửa mỗi vòng tới khi tìm thủ phạm</title>
  <desc>Dải 8 commit từ A (good) đến H (bad). Vòng 1 test E ra bad nên bug nằm trong A đến E. Vòng 2 test C ra good nên bug nằm trong C đến E. Vòng 3 test D ra bad nên D là thủ phạm. Mỗi vòng số commit cần xét giảm một nửa.</desc>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">git bisect — chia đôi liên tục tới khi bắt được commit lỗi</text>
  <g font-size="11.5" fill="currentColor">
    <text x="16" y="62" font-weight="700">Vòng 1</text>
    <text x="16" y="78" font-size="10" opacity="0.7">test E → bad</text>
    <g font-size="12.5" font-weight="700">
      <rect x="92" y="46" width="40" height="30" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="112" y="66" text-anchor="middle" fill="currentColor">A</text>
      <rect x="138" y="46" width="40" height="30" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/><text x="158" y="66" text-anchor="middle" fill="currentColor">B</text>
      <rect x="184" y="46" width="40" height="30" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/><text x="204" y="66" text-anchor="middle" fill="currentColor">C</text>
      <rect x="230" y="46" width="40" height="30" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/><text x="250" y="66" text-anchor="middle" fill="currentColor">D</text>
      <rect x="276" y="46" width="40" height="30" rx="6" fill="#f59e0b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/><text x="296" y="66" text-anchor="middle" fill="currentColor">E</text>
      <rect x="322" y="46" width="40" height="30" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/><text x="342" y="66" text-anchor="middle" fill="currentColor">F</text>
      <rect x="368" y="46" width="40" height="30" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/><text x="388" y="66" text-anchor="middle" fill="currentColor">G</text>
      <rect x="414" y="46" width="40" height="30" rx="6" fill="#ef4444" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/><text x="434" y="66" text-anchor="middle" fill="currentColor">H</text>
    </g>
    <text x="112" y="38" font-size="9.5" text-anchor="middle" fill="#10b981" font-weight="700">good</text>
    <text x="434" y="38" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.8" font-weight="700">bad</text>
    <text x="296" y="92" font-size="9" text-anchor="middle" fill="#f59e0b" font-weight="700">↑ giữa</text>
    <text x="478" y="66" font-size="10.5" fill="currentColor" opacity="0.8">⇒ bug trong A…E</text>
  </g>
  <g font-size="11.5" fill="currentColor">
    <text x="16" y="156" font-weight="700">Vòng 2</text>
    <text x="16" y="172" font-size="10" opacity="0.7">test C → good</text>
    <g font-size="12.5" font-weight="700">
      <rect x="92" y="140" width="40" height="30" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="112" y="160" text-anchor="middle" fill="currentColor">A</text>
      <rect x="138" y="140" width="40" height="30" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/><text x="158" y="160" text-anchor="middle" fill="currentColor">B</text>
      <rect x="184" y="140" width="40" height="30" rx="6" fill="#f59e0b" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.3"/><text x="204" y="160" text-anchor="middle" fill="currentColor">C</text>
      <rect x="230" y="140" width="40" height="30" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/><text x="250" y="160" text-anchor="middle" fill="currentColor">D</text>
      <rect x="276" y="140" width="40" height="30" rx="6" fill="#ef4444" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/><text x="296" y="160" text-anchor="middle" fill="currentColor">E</text>
    </g>
    <text x="204" y="186" font-size="9" text-anchor="middle" fill="#f59e0b" font-weight="700">↑ giữa</text>
    <text x="340" y="160" font-size="10.5" fill="currentColor" opacity="0.8">⇒ bug trong C…E</text>
  </g>
  <g font-size="11.5" fill="currentColor">
    <text x="16" y="250" font-weight="700">Vòng 3</text>
    <text x="16" y="266" font-size="10" opacity="0.7">test D → bad</text>
    <g font-size="12.5" font-weight="700">
      <rect x="92" y="234" width="40" height="30" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.12"/><text x="112" y="254" text-anchor="middle" fill="currentColor" opacity="0.45">A</text>
      <rect x="138" y="234" width="40" height="30" rx="6" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.12"/><text x="158" y="254" text-anchor="middle" fill="currentColor" opacity="0.45">B</text>
      <rect x="184" y="234" width="40" height="30" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="204" y="254" text-anchor="middle" fill="currentColor">C</text>
      <rect x="230" y="234" width="40" height="30" rx="7" fill="#ef4444" fill-opacity="0.28" stroke="currentColor" stroke-opacity="0.4"/><text x="250" y="254" text-anchor="middle" fill="currentColor">D</text>
      <rect x="276" y="234" width="40" height="30" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.18"/><text x="296" y="254" text-anchor="middle" fill="currentColor">E</text>
    </g>
    <text x="250" y="280" font-size="9" text-anchor="middle" fill="#ef4444" font-weight="700">↑ thủ phạm</text>
    <text x="340" y="254" font-size="10.5" fill="currentColor" opacity="0.85" font-weight="700">⇒ D là first bad commit</text>
  </g>
</svg>

> 💡 Ghi nhớ: exit code `125` trong `bisect run` nghĩa "commit này không kiểm tra được, bỏ qua" (ví dụ build lỗi vì lý do khác). Đừng dùng nó cho kết quả good/bad.

> ⚠️ Bẫy: bisect cần bug **tái hiện ổn định**. Bug chập chờn (flaky) sẽ khiến bisect chỉ sai thủ phạm. Và đừng quên `git bisect reset` — quên là bạn đang lập lờ ở một commit detached HEAD giữa lịch sử.

## 3. git cherry-pick — lấy đúng commit cần, sang branch khác

`cherry-pick` sao chép nội dung của một (hoặc vài) commit và áp lên branch hiện tại, tạo commit **mới** với hash mới.

```bash
git checkout main
git cherry-pick a1b2c3d            # ap 1 commit
git cherry-pick a1b2c3d f4e5d6c    # ap nhieu commit theo thu tu
git cherry-pick a1b2c3d^..f4e5d6c  # ap mot khoang commit
```

Sơ đồ:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>git cherry-pick — sao chép commit E của nhánh feature thành E' áp lên main</title>
  <desc>Nhánh feature có chuỗi commit D, E, F tách ra từ B. Nhánh main có A, B, C. cherry-pick E tạo một commit mới E' nội dung giống E nhưng hash khác, nối thêm sau C trên main.</desc>
  <text x="16" y="22" font-size="13.5" font-weight="700" fill="currentColor">git cherry-pick — bê đúng commit E sang main (thành E', hash khác)</text>
  <defs>
    <marker id="cpArr" markerWidth="9" markerHeight="9" refX="7.5" refY="3" orient="auto"><path d="M0 0 L7.5 3 L0 6 z" fill="currentColor" fill-opacity="0.55"/></marker>
    <marker id="cpCopy" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="#8b5cf6"/></marker>
  </defs>
  <!-- feature branch (top) -->
  <text x="40" y="68" font-size="11.5" font-weight="700" fill="currentColor" opacity="0.85">feature</text>
  <g stroke="currentColor" stroke-opacity="0.4" stroke-width="2" fill="none">
    <line x1="372" y1="84" x2="430" y2="84" marker-end="url(#cpArr)"/>
    <line x1="476" y1="84" x2="534" y2="84" marker-end="url(#cpArr)"/>
  </g>
  <g font-size="13" font-weight="700">
    <circle cx="352" cy="84" r="20" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/><text x="352" y="89" text-anchor="middle" fill="currentColor">D</text>
    <circle cx="456" cy="84" r="20" fill="#8b5cf6" fill-opacity="0.22" stroke="#8b5cf6" stroke-opacity="0.7"/><text x="456" y="89" text-anchor="middle" fill="currentColor">E</text>
    <circle cx="556" cy="84" r="20" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/><text x="556" y="89" text-anchor="middle" fill="currentColor">F</text>
  </g>
  <!-- main branch (bottom) -->
  <text x="40" y="205" font-size="11.5" font-weight="700" fill="currentColor" opacity="0.85">main</text>
  <g stroke="currentColor" stroke-opacity="0.4" stroke-width="2" fill="none">
    <line x1="120" y1="192" x2="178" y2="192" marker-end="url(#cpArr)"/>
    <line x1="224" y1="192" x2="282" y2="192" marker-end="url(#cpArr)"/>
    <line x1="320" y1="192" x2="430" y2="192" marker-end="url(#cpArr)"/>
  </g>
  <g font-size="13" font-weight="700">
    <circle cx="100" cy="192" r="20" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/><text x="100" y="197" text-anchor="middle" fill="currentColor">A</text>
    <circle cx="200" cy="192" r="20" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/><text x="200" y="197" text-anchor="middle" fill="currentColor">B</text>
    <circle cx="300" cy="192" r="20" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.3"/><text x="300" y="197" text-anchor="middle" fill="currentColor">C</text>
    <circle cx="456" cy="192" r="21" fill="#8b5cf6" fill-opacity="0.22" stroke="#8b5cf6" stroke-opacity="0.7"/><text x="456" y="197" text-anchor="middle" fill="currentColor">E'</text>
  </g>
  <!-- branch point B -> D -->
  <line x1="214" y1="180" x2="332" y2="96" stroke="currentColor" stroke-opacity="0.4" stroke-width="2" fill="none" marker-end="url(#cpArr)"/>
  <!-- copy arrow E -> E' -->
  <path d="M456 106 v62" stroke="#8b5cf6" stroke-width="2.2" stroke-dasharray="5 4" fill="none" marker-end="url(#cpCopy)"/>
  <text x="466" y="142" font-size="10.5" fill="#8b5cf6" font-weight="700">cherry-pick E</text>
  <text x="456" y="240" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.8">E' = nội dung của E, hash MỚI · D và F không theo sang</text>
  <text x="556" y="56" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">(HEAD feature)</text>
  <text x="456" y="222" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">(HEAD main)</text>
</svg>

### Tình huống thật: hotfix nằm nhầm branch

Bạn đã commit bản vá khẩn `fix tinh tien sai` lên branch `feature/dashboard`, nhưng production cần nó **ngay** trên `main`, chưa thể merge cả feature.

```bash
git log feature/dashboard --oneline
# 8e7f6a5 fix tinh tien sai   <-- can cai nay
# 2d1c0b9 them bieu do tron   <-- chua xong, khong lay

git checkout main
git cherry-pick 8e7f6a5
git push
```

Nếu cherry-pick gặp conflict:

```bash
# Sua file conflict, roi:
git add .
git cherry-pick --continue
# Hoac bo cuoc:
git cherry-pick --abort
```

Cờ hữu ích: `-x` ghi chú "(cherry picked from commit ...)" vào message để truy vết:

```bash
git cherry-pick -x 8e7f6a5
```

> ⚠️ Bẫy: cherry-pick tạo commit **trùng nội dung nhưng khác hash**. Nếu sau này bạn merge cả `feature/dashboard` vào `main`, commit đó có thể xuất hiện hai lần (hoặc gây conflict thừa). Với hotfix, chiến lược sạch hơn là vá trên `main` rồi merge `main` ngược vào feature.

## 4. git stash — cất việc dang dở tạm thời

Đang code dở thì sếp bảo "fix gấp branch khác". Chưa muốn commit code nửa vời? `stash` cất nó vào ngăn kéo, trả working directory về sạch.

```bash
git stash                      # cat tat ca thay doi (tracked)
git stash push -m "dang lam form login"   # cat kem ghi chu
git stash -u                   # cat ca file moi (untracked)
```

Quản lý ngăn kéo:

```bash
git stash list
# stash@{0}: On feature/login: dang lam form login
# stash@{1}: WIP on main: 9a1f2c3 setup

git stash show -p stash@{0}     # xem noi dung stash
git stash pop                   # lay lai + xoa khoi list (apply + drop)
git stash apply stash@{1}       # lay lai nhung GIU trong list
git stash drop stash@{0}        # xoa 1 stash
git stash clear                 # xoa sach
```

### Stash một phần — chỉ cất vài thay đổi

```bash
git stash push -p               # tuong tac: chon tung hunk de cat (y/n)
git stash push src/auth.ts      # chi stash dung file nay
```

### Tình huống thật: pull bị chặn vì có thay đổi local

```bash
git pull
# error: Your local changes would be overwritten by merge.
git stash
git pull
git stash pop
# Neu pop gay conflict, sua file roi `git add`, stash van con trong list cho an toan
```

> 💡 Ghi nhớ: `pop` = `apply` + `drop`. Khi pop gặp conflict, Git **không** tự drop — stash vẫn nằm trong list, bạn xử lý xong rồi `git stash drop` thủ công.

> ⚠️ Bẫy: `git stash` mặc định **bỏ qua file untracked** và file đã `.gitignore`. Code mới toanh chưa `git add` sẽ không được cất — nhớ `-u` (untracked) hoặc `-a` (cả ignored).

## 5. git commit --amend — sửa commit gần nhất

Vừa commit xong phát hiện sai message, hoặc quên thêm một file:

```bash
git commit --amend -m "fix: sua dung chinh ta message"

# Quen them file:
git add quen_file.ts
git commit --amend --no-edit       # giu nguyen message cu
```

Sơ đồ — amend **thay thế** commit cũ bằng commit mới (hash khác):

```
Truoc:  A---B---C       (HEAD)   C = "fix bgu login" (sai chinh ta)
              amend
Sau:    A---B---C'      (HEAD)   C' = "fix bug login", C bi bo
```

> ⚠️ Bẫy: amend tạo commit **mới hoàn toàn** (hash đổi). Nếu commit cũ đã `push`, amend rồi push thường sẽ bị từ chối — phải `git push --force-with-lease`. **Đừng amend** commit đã chia sẻ với người khác trên branch chung; chỉ amend khi commit còn nằm local hoặc trên branch riêng của bạn.

`--force-with-lease` an toàn hơn `--force`: nó từ chối ghi đè nếu remote có commit mới mà bạn chưa thấy (tránh xoá việc của đồng đội).

## 6. Bảng phân biệt: restore vs checkout vs revert vs reset

Đây là chỗ gây nhầm lẫn nhất. Câu hỏi cốt lõi: **bạn muốn tác động lên cái gì** — file trong thư mục, vùng staging, hay con trỏ branch/lịch sử?

| Lệnh | Tác động lên | Có đổi lịch sử? | An toàn khi đã push? | Dùng khi |
|------|--------------|-----------------|----------------------|----------|
| `git restore <file>` | Nội dung file (working dir) | Không | — (chỉ file local) | Bỏ thay đổi chưa stage của 1 file |
| `git restore --staged <file>` | Vùng staging | Không | — | Bỏ `git add` (unstage), giữ thay đổi |
| `git checkout <branch>` | Chuyển HEAD sang branch | Không | An toàn | Đổi branch / commit để xem |
| `git revert <commit>` | Tạo commit MỚI đảo ngược | Không (thêm vào) | **An toàn** | Hoàn tác commit đã push, giữ lịch sử |
| `git reset --soft <c>` | Con trỏ branch | Có | Không | Gộp/sửa commit, giữ thay đổi đã stage |
| `git reset --mixed <c>` (mặc định) | Branch + staging | Có | Không | Bỏ commit nhưng giữ code (unstage) |
| `git reset --hard <c>` | Branch + staging + working dir | Có | **Không** | Xoá sạch về 1 điểm (nguy hiểm) |

Minh hoạ ba mức của `reset` về `HEAD~1`:

```
                 --soft     --mixed    --hard
commit (branch)  lui 1      lui 1      lui 1
staging          GIU        BO         BO
working dir      GIU        GIU        BO  <-- mat code that su
```

### Cách chọn nhanh

```bash
# Bo thay doi 1 file chua commit, ve nhu commit cuoi:
git restore src/app.ts

# Da `git add` nham, muon unstage (giu code):
git restore --staged src/app.ts

# Da commit + da PUSH, can hoan tac an toan cho team:
git revert 8e7f6a5            # tao commit dao nguoc, ai cung pull binh thuong

# Commit local chua push, muon go ra lam lai:
git reset --soft HEAD~1       # commit bi go, code van con o staging

# Muon vut sach moi thu ve diem cu (CHUA push):
git reset --hard HEAD~1       # mat code chua commit -> nho reflog cuu neu lo
```

> 💡 Ghi nhớ: Quy tắc vàng — **lịch sử đã push thì dùng `revert`, lịch sử còn local thì mới `reset`**. `revert` thêm commit (an toàn, ai cũng pull được); `reset` viết lại con trỏ (gây lệch lịch sử với người khác).

> ⚠️ Bẫy: Trong Git mới, `git checkout` bị tách thành `git switch` (đổi branch) và `git restore` (khôi phục file) cho rõ nghĩa. `git checkout -- file` cũ tương đương `git restore file`. Nếu thấy tài liệu dùng `checkout` để bỏ thay đổi file, đó là cách viết cũ.

## 7. Cheat-sheet cứu hộ — khi hoảng loạn, mở bài này

```bash
# "Toi vua reset --hard mat commit!"
git reflog                       # tim hash cu
git reset --hard <hash>

# "Rebase hong het roi!"
git rebase --abort               # neu dang giua chung
git reset --hard ORIG_HEAD       # neu da xong nhung sai

# "Toi commit nham vao main thay vi feature!"
git reset --soft HEAD~1          # go commit, giu code
git switch -c feature/dung-branch
git commit -c ORIG_HEAD          # commit lai vao branch dung

# "Commit nay tren production gay loi, da push roi!"
git revert <hash> && git push    # khong reset, dung revert

# "Bug o dau do trong 100 commit?"
git bisect start HEAD <commit-tot>
git bisect run npm test

# "Can ban va nay sang main ngay!"
git cherry-pick <hash>

# "Dang dở thi phai doi viec gap!"
git stash -u && git switch hotfix
# ... xong viec ...
git switch - && git stash pop
```

> 💡 Ghi nhớ: 90% "thảm hoạ" Git đều cứu được nhờ `reflog` — vì Git gần như không bao giờ thực sự xoá object ngay. Bình tĩnh, đọc reflog, tìm điểm tốt cuối cùng, `reset --hard` về đó. Chỉ thật sự mất khi: chưa từng `add`/`commit` (Git không biết tới nó), hoặc đã quá hạn garbage collection (`git gc` sau ~30–90 ngày).

## Tổng kết

- **reflog**: nhật ký HEAD cục bộ, cứu commit "mất" sau reset/rebase. Phao cứu sinh số một.
- **bisect**: binary search tìm commit gây bug; `bisect run` tự động hoá theo exit code. Nhớ `bisect reset`.
- **cherry-pick**: bê đúng commit cần sang branch khác; cẩn thận trùng commit khi merge sau này.
- **stash**: cất việc dang dở; nhớ `-u` cho file mới, `pop` không tự drop khi conflict.
- **amend**: sửa commit gần nhất; đã push thì cần `--force-with-lease` và tránh trên branch chung.
- **restore/checkout/revert/reset**: đã push dùng `revert`, còn local mới `reset`; `--hard` là lệnh nguy hiểm nhất, luôn có reflog đỡ phía sau.

Làm chủ sáu công cụ này, bạn không còn sợ Git — bạn điều khiển nó.
