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
Merge made by the 'recursive' strategy.
 src/app.js | 12 ++++++++++++
 1 file changed, 12 insertions(+)
```

> 💡 Ghi nhớ: Muốn **luôn** có merge commit (kể cả khi fast-forward được) để giữ dấu vết nhánh, dùng `git merge --no-ff feature`. Nhiều team bắt buộc `--no-ff` cho nhánh feature để dễ `git revert` nguyên cụm sau này.

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

> ⚠️ Bẫy: Vì rebase tạo commit mới, nếu bạn rebase rồi push, commit cũ và commit mới **cùng tồn tại** trên remote nếu push không đúng cách. Đây là gốc rễ của golden rule ở cuối bài.

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

Không có cái nào "đúng tuyệt đối". Đây là kim chỉ nam thực tế:

| Tình huống | Nên dùng | Vì sao |
|---|---|---|
| Cập nhật nhánh feature **riêng của bạn** theo main | `rebase` | Lịch sử thẳng, PR gọn, dễ review |
| Gộp PR đã xong vào `main` (theo policy team) | `merge` (thường `--no-ff`) | Giữ dấu vết PR, dễ revert cả cụm |
| Nhánh **đã share** cho người khác | `merge` | Rebase sẽ phá lịch sử của họ |
| Dọn các commit "wip", "fix typo" trước khi mở PR | `rebase -i` (squash) | Biến 10 commit lộn xộn thành 1-2 commit nghĩa |
| Sợ làm hỏng, chưa tự tin | `merge` | An toàn, không viết lại lịch sử |

> 💡 Ghi nhớ: Một quy ước phổ biến — **"rebase để dọn dẹp riêng tư, merge để công bố công khai"**. Rebase trên nhánh cá nhân để làm đẹp, rồi merge vào main để lưu lại sự kiện gộp.

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

```text
Trước:                          Sau:

a1b2 --- b2c3 --- c3d4 --- d4e5   →   f9a0   (1 commit gộp, message sạch)
"login" "wip"   "asdf"  "typo"        "Add login form"
```

Bốn commit lộn xộn giờ thành **một commit gọn gàng**, reviewer của bạn sẽ cảm ơn.

> 💡 Ghi nhớ: Có một lối tắt cho fixup: khi đang code bạn nhận ra commit cũ thiếu gì đó, dùng `git commit --fixup <hash>`. Sau đó `git rebase -i --autosquash <base>` sẽ tự xếp các commit fixup vào đúng chỗ. Cực tiện.

### Reword: chỉ sửa message

```text
reword a1b2c3d Add login form
pick   b2c3d4e Add form validation
```

Git sẽ dừng và mở editor cho commit `a1b2c3d` để bạn gõ message mới, ví dụ `feat(auth): add login form with email field`, rồi tự chạy tiếp.

## Golden Rule của rebase

Đây là quy tắc **bất di bất dịch**, sai là gây hoạ cho cả team:

> ⚠️ Bẫy: **KHÔNG BAO GIỜ rebase một nhánh đã được push lên và người khác đang dùng** (nhánh public/shared như `main`, `develop`, hay nhánh feature chung).

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

> 💡 Ghi nhớ: Đặt alias cho an toàn: `git config --global alias.pushf 'push --force-with-lease'`. Từ nay gõ `git pushf`, vừa nhanh vừa khỏi lỡ tay gõ `--force`.

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

> 💡 Ghi nhớ: `git reflog` cứu bạn khỏi gần như mọi "thảm hoạ" rebase/reset. Commit không thực sự mất ngay — Git giữ chúng vài tuần. Cứ bình tĩnh tra reflog.

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
