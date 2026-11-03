# Merge vs Rebase & lịch sử sạch

Bạn đã biết `git merge` để gộp nhánh và mở PR. Nhưng khi đi làm, lịch sử commit của một dự án thật có thể rối như tô mì: hàng trăm "merge branch main into feature", commit "fix typo", "wip", "asdf"... Người làm chủ Git biết cách **giữ lịch sử sạch** để đồng đội đọc `git log` như đọc một câu chuyện. Bài này mổ xẻ `merge` và `rebase` — hai cách gộp code, hai triết lý khác nhau.

## Hai cách merge: fast-forward vs 3-way

Không phải `merge` nào cũng tạo ra "merge commit". Có hai kịch bản.

### Fast-forward merge

Xảy ra khi nhánh đích (ví dụ `main`) **không có commit mới** kể từ lúc bạn tách nhánh. Git chỉ cần "tua nhanh" con trỏ `main` tiến lên — không tạo commit mới.

```text
Trước khi merge:

      A---B---C   feature
     /
*---o            main (đang ở đây)

Sau "git merge feature" (fast-forward):

*---o---A---B---C   main, feature
```

```bash
git switch main
git merge feature
```

```text
Updating o..C
Fast-forward
 src/app.js | 12 ++++++++++++
 1 file changed, 12 insertions(+)
```

Lịch sử thẳng tắp, không có commit thừa. Nhưng cũng vì vậy, **nhìn vào log bạn không còn biết** đoạn `A-B-C` từng là một nhánh riêng.

### 3-way merge (merge commit)

Xảy ra khi **cả hai nhánh đều có commit mới** sau điểm rẽ. Git không tua được, nên nó tạo một **merge commit** có *hai cha* (parent), gộp ba điểm: tổ tiên chung, đỉnh `main`, đỉnh `feature`.

```text
Trước khi merge:

      A---B---C   feature
     /
*---o---D---E   main

Sau "git merge feature":

      A---B---C
     /         \
*---o---D---E---M   main   (M = merge commit, 2 cha: E và C)
```

```bash
git switch main
git merge feature
```

```text
Merge made by the 'ort' strategy.
 src/app.js | 12 ++++++++++++
 1 file changed, 12 insertions(+)
```

> Ghi nhớ: Muốn **luôn** có merge commit (kể cả khi fast-forward được) để giữ dấu vết nhánh, dùng `git merge --no-ff feature`. Nhiều team bắt buộc `--no-ff` cho nhánh feature để dễ `git revert` nguyên cụm sau này.

## Rebase là gì?

`rebase` nghĩa đen là "đổi base" — dời điểm xuất phát của nhánh. Thay vì *gộp* hai dòng lịch sử, rebase **bê từng commit của bạn ra, rồi áp lại lần lượt** lên trên đỉnh mới của nhánh đích. Kết quả: lịch sử **tuyến tính**, như thể bạn vừa mới tách nhánh từ commit mới nhất.

```text
Trước khi rebase:

      A---B---C   feature
     /
*---o---D---E   main

Sau "git rebase main" (đang đứng ở feature):

              A'--B'--C'   feature
             /
*---o---D---E   main
```

```bash
git switch feature
git rebase main
```

```text
Successfully rebased and updated refs/heads/feature.
```

Chú ý `A'`, `B'`, `C'` có dấu phẩy — đây là **commit MỚI** (khác hash) dù nội dung giống `A`, `B`, `C`. Rebase **viết lại lịch sử**: mỗi commit được tái tạo với cha mới nên SHA đổi hoàn toàn.

> Bẫy: Vì rebase tạo commit mới, sau khi rebase lịch sử đã push, push thường bị từ chối vì không fast-forward. Nếu pull rồi merge lịch sử cũ vào nhánh đã rebase, cả commit cũ và bản viết lại có thể cùng nằm trong lịch sử được push. Đây là gốc rễ của golden rule ở cuối bài.

### Quy trình thực chiến: cập nhật feature theo main

Tình huống quen thuộc: bạn làm `feature` được 3 ngày, `main` đã chạy trước cả chục commit. Để PR của bạn merge "sạch", rebase lên main mới nhất:

```bash
git switch main
git pull origin main          # lấy main mới nhất
git switch feature
git rebase main               # áp các commit của bạn lên đỉnh main
# ...giải quyết conflict nếu có...
git push --force-with-lease   # bắt buộc, vì lịch sử đã đổi
```

## Merge hay Rebase — khi nào dùng cái nào?

Hai cách gộp, hai hình hài lịch sử khác hẳn nhau. Bấm qua lại hai tab, cùng một lịch sử ban đầu: merge giữ nguyên hai dòng rồi nối lại bằng commit `M`; rebase phát lại các commit của bạn thành chuỗi thẳng (đổi hash).

<ab-toggle data-labels="git merge|git rebase">
<svg viewBox="0 0 520 330" role="img" aria-labelledby="g06a-t g06a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="g06a-t">git merge feature: lịch sử rẽ nhánh nối lại bằng merge commit M</title><desc id="g06a-d">Hàng dưới là main o, D, E; hàng trên là feature A, B, C tách ra từ o. Sau git merge feature, Git thêm merge commit M có hai cha E và C; main trỏ vào M, feature vẫn ở C. A, B, C giữ nguyên hash, lịch sử rẽ nhánh.</desc><defs><marker id="g06a-m" markerWidth="9" markerHeight="9" refX="7.5" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.7"/></marker></defs><text x="20" y="28" font-size="15" font-weight="700" fill="currentColor">git merge feature</text><text x="20" y="48" font-size="13" fill="currentColor" opacity="0.75">đứng ở main · gộp hai dòng lịch sử</text><line x1="60" y1="212" x2="87" y2="212" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.6" marker-end="url(#g06a-m)"/><line x1="130" y1="212" x2="157" y2="212" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.6" marker-end="url(#g06a-m)"/><circle cx="40" cy="212" r="18" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.45"/><text x="40" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">o</text><circle cx="110" cy="212" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="110" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">D</text><circle cx="180" cy="212" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="180" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">E</text><line x1="51" y1="196" x2="97" y2="131" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.6" marker-end="url(#g06a-m)"/><line x1="130" y1="112" x2="157" y2="112" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.6" marker-end="url(#g06a-m)"/><line x1="200" y1="112" x2="227" y2="112" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.6" marker-end="url(#g06a-m)"/><line x1="200" y1="212" x2="297" y2="212" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.6" marker-end="url(#g06a-m)"/><line x1="261" y1="128" x2="307" y2="193" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.6" marker-end="url(#g06a-m)"/><circle cx="110" cy="112" r="18" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="110" y="117" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">A</text><circle cx="180" cy="112" r="18" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="180" y="117" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">B</text><circle cx="250" cy="112" r="18" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="250" y="117" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">C</text><circle cx="320" cy="212" r="18" fill="#f59e0b" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.45"/><text x="320" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">M</text><rect x="214" y="58" width="71" height="22" rx="11" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.35"/><text x="250" y="74" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">feature</text><rect x="297" y="240" width="47" height="22" rx="11" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.35"/><text x="320" y="256" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">main</text><line x1="20" y1="268" x2="500" y2="268" stroke="currentColor" stroke-opacity="0.15"/><text x="20" y="290" font-size="13" font-weight="700" fill="currentColor">M có 2 cha: E và C (merge commit)</text><text x="20" y="312" font-size="13" fill="currentColor" opacity="0.8">A, B, C giữ NGUYÊN hash · lịch sử rẽ nhánh</text></svg>
<svg viewBox="0 0 520 330" role="img" aria-labelledby="g06b-t g06b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="g06b-t">git rebase main: các commit được phát lại thành A' B' C' nối thẳng sau E</title><desc id="g06b-d">Cùng bố cục. Sau git rebase main, các commit A, B, C được phát lại lên đỉnh main thành A', B', C' nối thẳng sau E trên một hàng; main vẫn ở E, feature trỏ vào C'. A', B', C' là commit mới với hash mới vì có cha mới; A, B, C cũ vẫn còn nhưng không nhánh nào trỏ tới.</desc><defs><marker id="g06b-m" markerWidth="9" markerHeight="9" refX="7.5" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.7"/></marker></defs><text x="20" y="28" font-size="15" font-weight="700" fill="currentColor">git rebase main</text><text x="20" y="48" font-size="13" fill="currentColor" opacity="0.75">đứng ở feature · phát lại commit lên đỉnh main</text><line x1="60" y1="212" x2="87" y2="212" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.6" marker-end="url(#g06b-m)"/><line x1="130" y1="212" x2="157" y2="212" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.6" marker-end="url(#g06b-m)"/><circle cx="40" cy="212" r="18" fill="currentColor" fill-opacity="0.1" stroke="currentColor" stroke-opacity="0.45"/><text x="40" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">o</text><circle cx="110" cy="212" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="110" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">D</text><circle cx="180" cy="212" r="18" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="180" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">E</text><line x1="51" y1="196" x2="97" y2="131" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 3" stroke-opacity="0.3"/><line x1="130" y1="112" x2="157" y2="112" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 3" stroke-opacity="0.3"/><line x1="200" y1="112" x2="227" y2="112" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 3" stroke-opacity="0.3"/><circle cx="110" cy="112" r="18" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3"/><text x="110" y="117" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.4">A</text><circle cx="180" cy="112" r="18" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3"/><text x="180" y="117" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.4">B</text><circle cx="250" cy="112" r="18" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="4 3"/><text x="250" y="117" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.4">C</text><text x="276" y="117" font-size="13" fill="currentColor" opacity="0.6">A B C cũ: không nhánh</text><text x="276" y="135" font-size="13" fill="currentColor" opacity="0.6">nào trỏ tới nữa</text><line x1="200" y1="212" x2="227" y2="212" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.6" marker-end="url(#g06b-m)"/><line x1="270" y1="212" x2="297" y2="212" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.6" marker-end="url(#g06b-m)"/><line x1="340" y1="212" x2="367" y2="212" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.6" marker-end="url(#g06b-m)"/><circle cx="250" cy="212" r="18" fill="#10b981" fill-opacity="0.24" stroke="currentColor" stroke-opacity="0.45"/><text x="250" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">A'</text><circle cx="320" cy="212" r="18" fill="#10b981" fill-opacity="0.24" stroke="currentColor" stroke-opacity="0.45"/><text x="320" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">B'</text><circle cx="390" cy="212" r="18" fill="#10b981" fill-opacity="0.24" stroke="currentColor" stroke-opacity="0.45"/><text x="390" y="217" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">C'</text><rect x="157" y="240" width="47" height="22" rx="11" fill="#3b82f6" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.35"/><text x="180" y="256" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">main</text><rect x="354" y="240" width="71" height="22" rx="11" fill="#10b981" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.35"/><text x="390" y="256" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">feature</text><line x1="20" y1="268" x2="500" y2="268" stroke="currentColor" stroke-opacity="0.15"/><text x="20" y="290" font-size="13" font-weight="700" fill="currentColor">A' B' C' = commit MỚI, hash ĐỔI (cha mới)</text><text x="20" y="312" font-size="13" fill="currentColor" opacity="0.8">feature nối thẳng sau main · lịch sử thẳng</text></svg>
<ab-note>Không commit nào bị viết lại: <code>A</code> <code>B</code> <code>C</code> giữ nguyên hash, Git chỉ thêm <code>M</code> có hai cha để nối hai dòng. Cái giá: log có thêm nhánh rẽ và một commit chỉ để gộp.</ab-note>
<ab-note>Cùng nội dung thay đổi, nhưng mỗi commit được tạo lại với cha mới nên hash đổi hết: <code>A'</code> không còn là <code>A</code>. Lịch sử thẳng như vừa tách nhánh từ <code>E</code>, đổi lại ai đã có <code>A</code> <code>B</code> <code>C</code> cũ sẽ lệch với bạn.</ab-note>
</ab-toggle>

Không có cái nào "đúng tuyệt đối". Đây là kim chỉ nam thực tế:

| Tình huống | Nên dùng | Vì sao |
|---|---|---|
| Cập nhật nhánh feature **riêng của bạn** theo main | `rebase` | Lịch sử thẳng, PR gọn, dễ review |
| Gộp PR đã xong vào `main` (theo policy team) | `merge` (thường `--no-ff`) | Giữ dấu vết PR, dễ revert cả cụm |
| Nhánh **đã share** cho người khác | `merge` | Rebase sẽ phá lịch sử của họ |
| Dọn các commit "wip", "fix typo" trước khi mở PR | `rebase -i` (squash) | Biến 10 commit lộn xộn thành 1-2 commit nghĩa |
| Sợ làm hỏng, chưa tự tin | `merge` | An toàn, không viết lại lịch sử |

> Ghi nhớ: Một quy ước phổ biến — **"rebase để dọn dẹp riêng tư, merge để công bố công khai"**. Rebase trên nhánh cá nhân để làm đẹp, rồi merge vào main để lưu lại sự kiện gộp.

## Interactive rebase — vũ khí dọn lịch sử

`git rebase -i` (interactive) cho phép bạn **chỉnh sửa từng commit** trước khi áp lại: gộp, đổi tên, xoá, sắp xếp lại. Đây là kỹ năng làm bạn trông "pro" nhất.

Giả sử log nhánh feature của bạn đang như mớ bòng bong:

```bash
git log --oneline
```

```text
d4e5f6a (HEAD -> feature) fix typo again
c3d4e5f asdf
b2c3d4e wip add validation
a1b2c3d Add login form
```

Mở interactive rebase cho 4 commit gần nhất (đếm từ HEAD trở về):

```bash
git rebase -i HEAD~4
```

Git mở editor với danh sách (lưu ý: thứ tự **cũ → mới**, ngược với log):

```text
pick a1b2c3d Add login form
pick b2c3d4e wip add validation
pick c3d4e5f asdf
pick d4e5f6a fix typo again

# Rebase a1b2c3d..d4e5f6a onto e5f6a7b (4 commands)
#
# Commands:
# p, pick   = dùng commit này nguyên trạng
# r, reword = dùng commit, nhưng SỬA lời nhắn
# e, edit   = dừng lại để SỬA NỘI DUNG commit
# s, squash = gộp vào commit phía TRÊN, GIỮ cả hai lời nhắn
# f, fixup  = như squash nhưng VỨT lời nhắn của commit này
# d, drop   = XOÁ commit (mất luôn thay đổi)
```

### Các lệnh và ý nghĩa

- **pick**: giữ nguyên commit.
- **reword**: giữ thay đổi, chỉ sửa commit message. Hữu ích khi message viết ẩu.
- **squash (s)**: gộp commit này vào commit ngay phía trên, mở editor để bạn viết lại message gộp.
- **fixup (f)**: như squash nhưng **bỏ luôn** message của commit này — dùng cho mấy commit "fix typo" vô nghĩa.
- **drop (d)**: xoá hẳn commit (kèm thay đổi của nó). Cẩn thận.
- **edit (e)**: dừng lại ngay tại commit đó để bạn sửa file / tách commit, rồi `git rebase --continue`.

### Ví dụ: gộp 4 commit thành 1 sạch sẽ

Sửa danh sách trên thành:

```text
pick   a1b2c3d Add login form
fixup  b2c3d4e wip add validation
fixup  c3d4e5f asdf
fixup  d4e5f6a fix typo again
```

Lưu, đóng editor. Kết quả:

```bash
git log --oneline
```

```text
f9a0b1c (HEAD -> feature) Add login form
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Interactive rebase squash/fixup — bốn commit lộn xộn gộp thành một commit sạch</title>
  <desc>Trước: bốn commit a1b2 (Add login form), b2c3 (wip add validation), c3d4 (asdf), d4e5 (fix typo again). Ba commit sau dùng fixup gộp vào commit đầu, vứt message. Sau: còn một commit f9a0 với message sạch "Add login form".</desc>
  <defs>
    <marker id="sqArr" markerWidth="11" markerHeight="11" refX="8" refY="3.5" orient="auto"><path d="M0 0 L9 3.5 L0 7 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
  <text x="16" y="26" font-size="13" font-weight="700" fill="currentColor">TRƯỚC — 4 commit lộn xộn</text>
  <!-- before commits -->
  <g>
    <rect x="16" y="44" width="150" height="44" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.35"/>
    <rect x="26" y="54" width="58" height="18" rx="9" fill="currentColor" fill-opacity="0.1"/><text x="55" y="67" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.85">pick a1b2</text>
    <text x="26" y="83" font-size="10.5" fill="currentColor">Add login form</text>
  </g>
  <g>
    <rect x="16" y="96" width="150" height="44" rx="9" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="26" y="106" width="68" height="18" rx="9" fill="#f59e0b" fill-opacity="0.85"/><text x="60" y="119" font-size="10" text-anchor="middle" fill="#fff">fixup b2c3</text>
    <text x="26" y="135" font-size="10.5" fill="currentColor" opacity="0.6">wip add validation</text>
  </g>
  <g>
    <rect x="16" y="148" width="150" height="44" rx="9" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="26" y="158" width="68" height="18" rx="9" fill="#f59e0b" fill-opacity="0.85"/><text x="60" y="171" font-size="10" text-anchor="middle" fill="#fff">fixup c3d4</text>
    <text x="26" y="187" font-size="10.5" fill="currentColor" opacity="0.6">asdf</text>
  </g>
  <g>
    <rect x="16" y="200" width="150" height="44" rx="9" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="26" y="210" width="68" height="18" rx="9" fill="#f59e0b" fill-opacity="0.85"/><text x="60" y="223" font-size="10" text-anchor="middle" fill="#fff">fixup d4e5</text>
    <text x="26" y="239" font-size="10.5" fill="currentColor" opacity="0.6">fix typo again</text>
  </g>
  <!-- fixup absorb arrows: 3 lower commits fold up into the first -->
  <g stroke="currentColor" stroke-opacity="0.45" fill="none" stroke-dasharray="3 3">
    <path d="M176 118 q40 -20 0 -42" marker-end="url(#sqArr)"/>
    <path d="M176 170 q70 -55 0 -94" marker-end="url(#sqArr)"/>
    <path d="M176 222 q100 -90 0 -146" marker-end="url(#sqArr)"/>
  </g>
  <text x="250" y="96" font-size="10" fill="#f59e0b" opacity="0.95" font-weight="700">fixup: gộp lên,</text>
  <text x="250" y="110" font-size="10" fill="#f59e0b" opacity="0.95" font-weight="700">vứt message</text>
  <!-- big arrow to after -->
  <line x1="370" y1="130" x2="450" y2="130" stroke="currentColor" stroke-opacity="0.5" stroke-width="2" marker-end="url(#sqArr)"/>
  <text x="410" y="120" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.75">rebase -i</text>
  <text x="490" y="26" font-size="13" font-weight="700" fill="currentColor">SAU — 1 commit sạch</text>
  <g>
    <rect x="490" y="100" width="214" height="60" rx="10" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="502" y="112" width="58" height="20" rx="10" fill="#3b82f6" fill-opacity="0.9"/><text x="531" y="126" font-size="10.5" text-anchor="middle" fill="#fff">f9a0</text>
    <text x="502" y="151" font-size="12" font-weight="700" fill="currentColor">Add login form</text>
  </g>
  <text x="490" y="186" font-size="10.5" fill="currentColor" opacity="0.7">HEAD → feature · lịch sử kể chuyện được</text>
</svg>

Bốn commit lộn xộn giờ thành **một commit gọn gàng**, reviewer của bạn sẽ cảm ơn.

> Ghi nhớ: Có một lối tắt cho fixup: khi đang code bạn nhận ra commit cũ thiếu gì đó, dùng `git commit --fixup <hash>`. Sau đó `git rebase -i --autosquash <base>` sẽ tự xếp các commit fixup vào đúng chỗ. Cực tiện.

### Reword: chỉ sửa message

```text
reword a1b2c3d Add login form
pick   b2c3d4e Add form validation
```

Git sẽ dừng và mở editor cho commit `a1b2c3d` để bạn gõ message mới, ví dụ `feat(auth): add login form with email field`, rồi tự chạy tiếp.

## Golden Rule của rebase

Đây là quy tắc **bất di bất dịch**, sai là gây hoạ cho cả team:

> Bẫy: **KHÔNG BAO GIỜ rebase một nhánh đã được push lên và người khác đang dùng** (nhánh public/shared như `main`, `develop`, hay nhánh feature chung).

Lý do: rebase tạo commit mới (đổi SHA). Nếu đồng nghiệp đã pull các commit cũ, lịch sử của họ và của bạn sẽ "phân nhánh". Khi họ pull lại, Git thấy hai dòng lịch sử khác nhau cho cùng nội dung → conflict hỗn loạn, commit bị nhân đôi, có người vô tình khôi phục lại commit bạn đã bỏ.

```text
Bạn rebase main đã share:

Của bạn:      *---o---A'---B'   (main mới, SHA mới)
Của đồng đội: *---o---A----B    (main cũ, SHA cũ, họ đang đứng đây)
                       ^
              cùng nội dung, KHÁC hash → Git coi là 2 lịch sử khác nhau
```

**Quy tắc đơn giản để nhớ:** chỉ rebase những commit **chỉ mình bạn có** — tức là chưa push, hoặc đã push nhưng nhánh feature riêng tư không ai đụng. Nhánh chung thì **merge**.

## Push sau khi rebase: `--force-with-lease`

Sau khi rebase một nhánh **đã push** (trường hợp hợp lệ: nhánh feature riêng của bạn), `git push` thường sẽ bị từ chối:

```text
! [rejected]        feature -> feature (non-fast-forward)
error: failed to push some refs
hint: Updates were rejected because the tip of your current branch is behind
```

Vì lịch sử đã đổi, bạn buộc phải force push. Nhưng **đừng dùng `--force` trần**:

```bash
# NGUY HIỂM: ghi đè mù quáng, có thể xoá commit người khác vừa push
git push --force

# AN TOÀN: chỉ force nếu remote vẫn ở đúng chỗ bạn nghĩ
git push --force-with-lease
```

`--force-with-lease` kiểm tra: "remote có còn đúng như lần cuối tôi thấy không?". Nếu đồng nghiệp vừa push thêm gì đó mà bạn chưa biết, lệnh sẽ **bị từ chối** thay vì âm thầm xoá việc của họ.

```text
! [rejected]  feature -> feature (stale info)
```

Thấy "stale info" tức là có người vừa đụng nhánh — bạn cần `git fetch` và xem lại, **không** ép push.

> Ghi nhớ: Đặt alias cho an toàn: `git config --global alias.pushf 'push --force-with-lease'`. Từ nay gõ `git pushf`, vừa nhanh vừa khỏi lỡ tay gõ `--force`.

## Lỗi hay gặp & cách thoát

**1. Đang rebase thì dính conflict.** Đừng hoảng. Git dừng lại tại commit gây conflict:

```bash
git status                    # xem file nào conflict
# ...sửa file, bỏ marker <<<<<<< ======= >>>>>>> ...
git add <file>
git rebase --continue         # áp tiếp commit còn lại
```

Lặp lại cho từng commit nếu cần. Muốn bỏ cuộc, quay về nguyên trạng ban đầu:

```bash
git rebase --abort
```

**2. Rebase xong thấy hỏng, muốn quay lại "như cũ".** Git có "phao cứu sinh" `reflog` — nhật ký mọi nơi HEAD từng đứng:

```bash
git reflog
```

```text
f9a0b1c HEAD@{0}: rebase (finish): returning to refs/heads/feature
a1b2c3d HEAD@{1}: rebase (start): checkout main
d4e5f6a HEAD@{2}: commit: fix typo again   <-- đây là trạng thái trước rebase
```

```bash
git reset --hard HEAD@{2}     # nhảy về đúng trước khi rebase
```

> Ghi nhớ: `git reflog` cứu bạn khỏi gần như mọi "thảm hoạ" rebase/reset. Commit không thực sự mất ngay — Git giữ chúng vài tuần. Cứ bình tĩnh tra reflog.

**3. Lỡ `git rebase -i` quá nhiều commit, choáng.** Trong editor, cứ xoá hết các dòng và lưu file rỗng → rebase **abort** an toàn, không có gì thay đổi.

**4. Squash nhầm, message gộp lung tung.** Đang ở editor message? Xoá sạch và lưu rỗng để huỷ commit đang gộp, hoặc dùng `git rebase --abort` nếu vẫn còn trong tiến trình rebase.

## Tổng kết

- **Fast-forward**: tua nhanh, không tạo commit; **3-way**: tạo merge commit 2 cha khi cả hai nhánh đều tiến.
- **Rebase**: dời base, lịch sử tuyến tính, nhưng **viết lại commit** (đổi SHA).
- **Rebase để dọn riêng tư, merge để công bố công khai.**
- `rebase -i` với pick/reword/squash/fixup/drop/edit để biến lịch sử rác thành lịch sử kể chuyện được.
- **Golden rule**: không rebase nhánh đã share. Đụng đến nhánh chung thì merge.
- Force push sau rebase luôn dùng `--force-with-lease`, không bao giờ `--force` trần.
- Lỡ tay? `git rebase --abort` hoặc `git reflog` + `git reset --hard` luôn kéo bạn về bờ.
