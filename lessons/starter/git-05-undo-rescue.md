# Cứu hộ: hoàn tác & sửa sai

Ai dùng Git cũng có lúc "lỡ tay": xoá nhầm code, commit thiếu file, gõ sai message, hoặc tệ hơn là tưởng mình đã xoá mất cả ngày làm việc. Tin tốt: **Git được thiết kế để gần như không bao giờ mất dữ liệu đã commit**. Bài này là "bộ đồ nghề cứu hộ" — học xong, bạn sẽ biết bình tĩnh thoát khỏi mọi tình huống thường gặp.

> 💡 Ghi nhớ: Quy tắc vàng khi gặp sự cố với Git — **DỪNG LẠI, đừng gõ thêm lệnh bừa**. Hầu hết mọi thứ đều cứu được, trừ khi bạn hoảng loạn và chạy thêm các lệnh xoá khác.

## 1. Ôn nhanh: 3 "khu vực" của Git

Để hiểu các lệnh hoàn tác, hãy nhớ Git có 3 khu vực, giống quy trình gửi đồ ở bưu điện:

| Khu vực | Tên tiếng Anh | Ví đời thường |
|---|---|---|
| Thư mục làm việc | Working Directory | Bàn làm việc — nơi bạn đang viết, sửa đồ |
| Khu chờ | Staging Area (Index) | Thùng hàng đã đóng gói, chờ dán tem |
| Kho lưu trữ | Repository (các commit) | Hàng đã gửi đi, có biên lai (mã commit) |

Mỗi lệnh "hoàn tác" thực chất chỉ là **di chuyển hoặc khôi phục dữ liệu giữa 3 khu vực này**. Hiểu điều đó, bạn sẽ không còn thấy các lệnh dưới đây bí hiểm nữa.

## 2. Lỡ sửa file sai — `git restore`

### Tình huống

Bạn sửa file `index.html` lung tung, giờ muốn quay về **bản như lần commit gần nhất** (vứt hết thay đổi chưa lưu).

### Cách làm

```bash
git restore index.html        # khôi phục 1 file
git restore .                 # khôi phục TẤT CẢ file đã sửa (cẩn thận!)
```

`restore` nghĩa là "khôi phục". Lệnh này lấy phiên bản file từ kho (commit gần nhất) đè lên bản trên bàn làm việc của bạn.

> ⚠️ Lỗi người mới hay gặp: `git restore` **xoá vĩnh viễn** thay đổi chưa commit — đây là một trong số ít lệnh Git thật sự làm mất dữ liệu, vì thay đổi đó chưa từng được Git "chụp ảnh" lưu lại. Hãy chắc chắn bạn muốn vứt nó đi.

### Lỡ `git add` rồi, muốn rút file khỏi khu chờ?

```bash
git restore --staged index.html
```

Lệnh này chỉ rút file ra khỏi Staging Area (khu chờ), **không** đụng vào nội dung file trên bàn làm việc. Giống như lấy món hàng ra khỏi thùng nhưng món hàng vẫn nguyên vẹn.

### Còn `git checkout` thì sao?

Trước đây (Git cũ), người ta dùng `git checkout -- index.html` để làm việc tương tự. Bạn sẽ gặp lệnh này trong các bài viết cũ trên mạng. `checkout` (tạm dịch: "lấy ra") bị ôm quá nhiều việc — vừa chuyển nhánh, vừa khôi phục file — nên Git tách ra thành `git restore` (khôi phục file) và `git switch` (chuyển nhánh) cho dễ hiểu. **Hãy ưu tiên dùng `restore`.**

## 3. Sửa commit cuối cùng — `git commit --amend`

`amend` nghĩa là "tu chỉnh, sửa đổi". Lệnh này cho phép bạn **làm lại commit gần nhất** như chưa từng có chuyện gì xảy ra.

### Tình huống A: gõ sai message

```bash
git commit --amend -m "Sửa lỗi đăng nhập (message đúng)"
```

### Tình huống B: commit xong mới nhớ ra quên 1 file

```bash
git add file-bi-quen.css
git commit --amend --no-edit
```

`--no-edit` nghĩa là "giữ nguyên message cũ, chỉ bổ sung nội dung". Git sẽ gộp file mới vào commit cuối, như thể bạn chưa từng quên.

> 💡 Ghi nhớ: `--amend` không "sửa" commit cũ mà **tạo một commit mới thay thế** (mã commit sẽ đổi). Commit cũ vẫn nằm đâu đó trong kho — ta sẽ gặp lại nó ở phần reflog.

> ⚠️ Lỗi người mới hay gặp: **Đừng amend commit đã push lên GitHub** mà người khác đã kéo về. Vì mã commit thay đổi, lịch sử của bạn và đồng đội sẽ "lệch pha", gây xung đột khó chịu. Amend chỉ an toàn khi commit còn nằm riêng trên máy bạn.

## 4. Hoàn tác một commit: `revert` vs `reset`

Đây là cặp lệnh gây nhầm lẫn nhất. Hãy hình dung lịch sử commit như **sổ kế toán**:

- `git revert` = ghi thêm một **bút toán đảo ngược** ("hôm qua ghi nhầm +5 triệu, hôm nay ghi -5 triệu"). Sổ vẫn đầy đủ, minh bạch, ai cũng thấy.
- `git reset` = **xé trang sổ**. Sạch sẽ, nhưng nếu người khác đã photo trang đó thì rắc rối to.

### `git revert` — hoàn tác an toàn

```bash
git revert abc1234     # tạo commit MỚI đảo ngược thay đổi của commit abc1234
```

Lịch sử không bị xoá gì cả, chỉ thêm một commit "đảo ngược". Vì vậy **luôn an toàn với code đã push lên GitHub**.

### `git reset` — kéo lịch sử lùi lại

```bash
git reset --soft HEAD~1    # bỏ commit cuối, GIỮ thay đổi trong khu chờ
git reset --mixed HEAD~1   # bỏ commit cuối, thay đổi về bàn làm việc (mặc định)
git reset --hard HEAD~1    # bỏ commit cuối, XOÁ SẠCH thay đổi — nguy hiểm!
```

Giải nghĩa: `HEAD` là "vị trí hiện tại" (commit mới nhất bạn đang đứng), `HEAD~1` là "lùi 1 commit". Ba mức độ giống 3 cách dọn bàn:

| Mức | Commit cuối | Khu chờ (staging) | Bàn làm việc | Ví von |
|---|---|---|---|---|
| `--soft` | Bị gỡ | Giữ nguyên thay đổi | Giữ nguyên | Mở thùng hàng ra nhưng đồ vẫn đóng gói sẵn |
| `--mixed` | Bị gỡ | Dọn trống | Giữ nguyên | Mở thùng, đồ bày lại lên bàn |
| `--hard` | Bị gỡ | Dọn trống | **Xoá sạch** | Vứt cả thùng lẫn đồ vào lò đốt |

### Bảng quyết định: khi nào dùng gì?

| Tình huống | Dùng lệnh | Độ nguy hiểm |
|---|---|---|
| Commit lỗi **đã push** lên GitHub, người khác có thể đã kéo về | `git revert` | 🟢 An toàn — không sửa lịch sử |
| Commit còn **trên máy mình**, muốn gỡ ra làm lại nhưng giữ code | `git reset --soft` / `--mixed` | 🟡 Vừa — code vẫn còn |
| Muốn vứt sạch cả commit lẫn mọi thay đổi, quay về quá khứ | `git reset --hard` | 🔴 Cao — mất thay đổi chưa commit |
| Chỉ sai message hoặc thiếu file ở commit cuối (chưa push) | `git commit --amend` | 🟡 Vừa — đừng dùng sau khi push |
| Chỉ muốn vứt thay đổi chưa commit của 1 file | `git restore <file>` | 🔴 Mất thay đổi chưa lưu của file đó |

> 💡 Ghi nhớ: Câu thần chú — **"Đã push thì revert, chưa push thì reset"**. Khi phân vân, chọn `revert`: chậm hơn một chút nhưng không bao giờ phá lịch sử chung.

## 5. Cất tạm công việc dở dang — `git stash`

### Tình huống

Bạn đang sửa dở tính năng A (code còn ngổn ngang, chưa muốn commit) thì sếp nhắn: "Sửa gấp lỗi B trên nhánh khác!". Git không cho chuyển nhánh khi bàn làm việc bừa bộn. Làm sao?

`stash` nghĩa là "giấu/cất tạm". Hãy tưởng tượng nó là **ngăn kéo bí mật**: bạn quét hết đồ trên bàn vào ngăn kéo, bàn sạch sẽ để làm việc khác, xong quay lại mở ngăn kéo lấy đồ ra bày tiếp.

### Các lệnh chính

```bash
git stash                          # cất hết thay đổi, bàn làm việc sạch sẽ
git stash push -m "dở dang form đăng ký"   # cất kèm ghi chú cho dễ nhớ
git stash list                     # xem danh sách các "gói" đã cất
git stash pop                      # lấy gói mới nhất ra và XOÁ khỏi ngăn kéo
git stash apply                    # lấy ra nhưng VẪN GIỮ bản sao trong ngăn kéo
git stash drop stash@{0}           # vứt gói số 0
```

Quy trình cứu hộ điển hình:

```bash
git stash push -m "đang làm dở tính năng A"
git switch main          # chuyển sang nhánh khác sửa lỗi gấp
# ... sửa, commit, push ...
git switch tinh-nang-a
git stash pop            # lấy lại đồ, làm tiếp như chưa có gì xảy ra
```

> ⚠️ Lỗi người mới hay gặp: (1) Cất stash rồi… quên luôn, vài tuần sau `git stash list` thấy 7 gói không nhớ gói nào là gì — hãy luôn dùng `-m` để ghi chú. (2) Mặc định `git stash` **không cất file mới tạo chưa từng `git add`** (gọi là untracked file — file Git chưa theo dõi); muốn cất cả chúng, dùng `git stash -u`.

## 6. Phao cứu sinh cuối cùng — `git reflog`

Đây là lệnh quan trọng nhất bài, thứ biến "thảm hoạ" thành "hú hồn".

### Reflog là gì?

`reflog` (reference log — nhật ký tham chiếu) là **camera an ninh của Git**: nó ghi lại *mọi* lần con trỏ `HEAD` di chuyển trên máy bạn — mỗi commit, mỗi reset, mỗi lần chuyển nhánh, mỗi amend. Kể cả khi bạn `reset --hard` "xoá" một commit, commit đó **vẫn nằm trong kho**, chỉ là không còn nhãn nào trỏ tới. Reflog cho bạn xem lại băng ghi hình để tìm địa chỉ của nó.

```bash
git reflog
```

Kết quả trông như:

```
f3ab12c HEAD@{0}: reset: moving to HEAD~1
9d8e7f6 HEAD@{1}: commit: hoàn thành trang thanh toán
1c2d3e4 HEAD@{2}: commit: thêm giỏ hàng
```

Đọc từ trên xuống = từ mới về cũ. Ở ví dụ trên: bạn vừa lỡ `reset` mất commit "hoàn thành trang thanh toán" (mã `9d8e7f6`). Cứu nó:

```bash
git reset --hard 9d8e7f6
```

Xong. Cả commit "đã mất" quay về nguyên vẹn.

> 💡 Ghi nhớ: **Mọi thứ đã từng commit đều cứu được bằng reflog** (trong vòng ~90 ngày trước khi Git dọn rác). Thứ duy nhất reflog KHÔNG cứu được là thay đổi **chưa bao giờ commit** — đó là lý do nên commit nhỏ và thường xuyên, như lưu game trước mỗi trận boss.

> ⚠️ Lỗi người mới hay gặp: reflog là nhật ký **riêng của từng máy** — nó không được push lên GitHub. Bạn không thể dùng reflog của mình để cứu thao tác lỡ tay trên máy đồng nghiệp.

## 7. Sổ tay "Chết rồi, lỡ…" — thoát hiểm từng bước

In phần này ra dán cạnh màn hình.

### 7.1. "Lỡ sửa nát một file, muốn về bản cũ"

1. Kiểm tra mình định vứt gì: `git diff ten-file`
2. Khôi phục: `git restore ten-file`

### 7.2. "Lỡ `git add` file không muốn commit"

1. `git restore --staged ten-file`
2. File vẫn nguyên trên bàn làm việc, chỉ rút khỏi khu chờ.

### 7.3. "Lỡ commit mà quên file / sai message (CHƯA push)"

1. Thiếu file: `git add file-thieu`
2. `git commit --amend` (sửa message) hoặc `git commit --amend --no-edit` (giữ message).

### 7.4. "Lỡ push một commit có lỗi lên GitHub"

1. **Đừng** reset hay amend — lịch sử đã công khai.
2. Xem mã commit lỗi: `git log --oneline`
3. `git revert <mã-commit>` → Git tạo commit đảo ngược.
4. `git push` như bình thường. Lịch sử minh bạch, đồng đội bình an.

### 7.5. "Lỡ `reset --hard`, mất tiêu commit cả buổi chiều"

1. Hít thở. Đã commit thì chưa mất.
2. `git reflog` — tìm dòng có message commit của bạn.
3. Chép mã commit (ví dụ `9d8e7f6`).
4. `git reset --hard 9d8e7f6` — về đúng thời điểm đó.

### 7.6. "Lỡ commit nhầm vào nhánh `main` thay vì nhánh tính năng"

1. Đứng tại `main`, đem commit sang nhánh đúng:

```bash
git switch tinh-nang        # sang nhánh đúng (tạo mới: git switch -c tinh-nang)
git cherry-pick <mã-commit> # "gắp" commit đó sang đây
git switch main
git reset --hard HEAD~1     # gỡ commit nhầm khỏi main (nếu main CHƯA push)
```

(`cherry-pick` = "hái quả anh đào": gắp đúng một commit từ nhánh này bỏ sang nhánh khác.)

### 7.7. "Lỡ xoá nhánh chưa merge"

1. `git reflog` — tìm commit cuối của nhánh đã xoá.
2. `git switch -c ten-nhanh-cu <mã-commit>` — dựng lại nhánh tại đúng chỗ đó.

### 7.8. "Đang làm dở thì phải chuyển việc gấp"

1. `git stash push -m "ghi chú dễ nhớ"`
2. Đi làm việc gấp, xong quay lại nhánh cũ.
3. `git stash pop`

### 7.9. "Lỡ `stash pop` bị xung đột, rối tung"

1. Mở các file bị đánh dấu xung đột (conflict — hai phiên bản giẫm chân nhau), sửa tay phần giữa `<<<<<<<` và `>>>>>>>`.
2. Lưu ý: khi `pop` gặp xung đột, gói stash **chưa bị xoá** — sửa xong, xác nhận ổn rồi mới `git stash drop`.

### 7.10. "Không biết mình vừa làm gì, mọi thứ lạ lắm"

1. `git status` — Git luôn nói bạn đang ở đâu và gợi ý lệnh tiếp theo (hãy đọc kỹ, Git rất "nhiều lời" một cách hữu ích).
2. `git log --oneline -10` — xem 10 commit gần nhất.
3. `git reflog` — xem 10 hành động gần nhất.
4. Chưa chắc chắn thì **đừng chạy lệnh có chữ `--hard` hay `--force`**.

## 8. Tổng kết bộ đồ nghề

| Lệnh | Cứu cái gì | Mức nguy hiểm |
|---|---|---|
| `git restore <file>` | Vứt thay đổi chưa commit của file | 🔴 Mất thay đổi chưa lưu |
| `git restore --staged <file>` | Rút file khỏi khu chờ | 🟢 Vô hại |
| `git commit --amend` | Sửa commit cuối (chưa push) | 🟡 Đổi mã commit |
| `git revert <commit>` | Đảo ngược commit đã push | 🟢 An toàn nhất |
| `git reset --soft/--mixed` | Gỡ commit, giữ code | 🟡 Vừa |
| `git reset --hard` | Quay về quá khứ, xoá sạch | 🔴 Cao |
| `git stash` | Cất tạm việc dở dang | 🟢 An toàn (nhớ ghi chú) |
| `git reflog` | Tìm lại mọi thứ "đã mất" | 🟢 Chỉ xem, vô hại |

> 💡 Ghi nhớ cuối bài: Ba thói quen giúp bạn gần như không bao giờ cần "cứu hộ khẩn cấp": (1) **commit nhỏ và thường xuyên** — mỗi commit là một điểm lưu game; (2) **đọc kỹ output của `git status`** trước khi gõ lệnh tiếp; (3) **chưa push thì thoải mái sửa lịch sử, đã push thì chỉ revert**. Git không trừng phạt người lỡ tay — nó chỉ trừng phạt người lỡ tay xong còn cuống.
