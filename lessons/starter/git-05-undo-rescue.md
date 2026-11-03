# Cứu hộ: hoàn tác & sửa sai

Ai dùng Git cũng có lúc "lỡ tay": xoá nhầm code, commit thiếu file, gõ sai message, hoặc tệ hơn là tưởng mình đã xoá mất cả ngày làm việc. Tin tốt: **Git được thiết kế để gần như không bao giờ mất dữ liệu đã commit**. Bài này là "bộ đồ nghề cứu hộ" — học xong, bạn sẽ biết bình tĩnh thoát khỏi mọi tình huống thường gặp.

> Ghi nhớ: Quy tắc vàng khi gặp sự cố với Git — **DỪNG LẠI, đừng gõ thêm lệnh bừa**. Hầu hết mọi thứ đều cứu được, trừ khi bạn hoảng loạn và chạy thêm các lệnh xoá khác.

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

> Lỗi người mới hay gặp: `git restore` **xoá vĩnh viễn** thay đổi chưa commit — đây là một trong số ít lệnh Git thật sự làm mất dữ liệu, vì thay đổi đó chưa từng được Git "chụp ảnh" lưu lại. Hãy chắc chắn bạn muốn vứt nó đi.

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

> Ghi nhớ: `--amend` không "sửa" commit cũ mà **tạo một commit mới thay thế** (mã commit sẽ đổi). Commit cũ vẫn nằm đâu đó trong kho — ta sẽ gặp lại nó ở phần reflog.

> Lỗi người mới hay gặp: **Đừng amend commit đã push lên GitHub** mà người khác đã kéo về. Vì mã commit thay đổi, lịch sử của bạn và đồng đội sẽ "lệch pha", gây xung đột khó chịu. Amend chỉ an toàn khi commit còn nằm riêng trên máy bạn.

## 4. Hoàn tác một commit: `revert` vs `reset`

Đây là cặp lệnh gây nhầm lẫn nhất. Hãy hình dung lịch sử commit như **sổ kế toán**:

- `git revert` = ghi thêm một **bút toán đảo ngược** ("hôm qua ghi nhầm +5 triệu, hôm nay ghi -5 triệu"). Sổ vẫn đầy đủ, minh bạch, ai cũng thấy.
- `git reset` = **xé trang sổ**. Sạch sẽ, nhưng nếu người khác đã photo trang đó thì rắc rối to.

<ab-toggle data-labels="revert|reset">
<svg viewBox="0 0 520 280" role="img" aria-labelledby="g05a-t g05a-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="g05a-t">git revert C: thêm commit C' đảo ngược, lịch sử dài ra</title><desc id="g05a-d">Máy bạn: A, B, C rồi thêm C' đảo ngược C; main và HEAD ở C'. Đồng nghiệp đã kéo về A, B, C: chỉ cần kéo thêm C' là khớp. Không commit nào bị xoá nên an toàn khi đã push.</desc><text x="16" y="24" font-size="14" font-weight="700" fill="currentColor" font-family="ui-monospace, monospace">git revert C</text><text x="16" y="56" font-size="13" fill="currentColor" opacity="0.75">Máy bạn</text><text x="16" y="176" font-size="13" fill="currentColor" opacity="0.75">Bản đồng nghiệp đã kéo về</text><line x1="77" y1="104" x2="143" y2="104" stroke="currentColor" stroke-opacity="0.4" stroke-width="2"/><line x1="177" y1="104" x2="243" y2="104" stroke="currentColor" stroke-opacity="0.4" stroke-width="2"/><line x1="277" y1="104" x2="343" y2="104" stroke="currentColor" stroke-opacity="0.4" stroke-width="2"/><circle cx="60" cy="104" r="17" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="60" y="109" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">A</text><circle cx="160" cy="104" r="17" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="160" y="109" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">B</text><circle cx="260" cy="104" r="17" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="260" y="109" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">C</text><circle cx="360" cy="104" r="17" fill="#10b981" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.45"/><text x="360" y="109" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">C'</text><rect x="302.5" y="57" width="115" height="22" rx="11" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/><text x="360" y="73" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">main · HEAD</text><text x="386" y="109" font-size="13" fill="#10b981" font-weight="700">đảo ngược C</text><line x1="77" y1="220" x2="143" y2="220" stroke="currentColor" stroke-opacity="0.4" stroke-width="2"/><line x1="177" y1="220" x2="243" y2="220" stroke="currentColor" stroke-opacity="0.4" stroke-width="2"/><circle cx="60" cy="220" r="17" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="60" y="225" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">A</text><circle cx="160" cy="220" r="17" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="160" y="225" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">B</text><circle cx="260" cy="220" r="17" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="260" y="225" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">C</text><line x1="277" y1="220" x2="343" y2="220" stroke="#10b981" stroke-width="2" stroke-dasharray="4 4"/><circle cx="360" cy="220" r="17" fill="#10b981" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="4 3"/><text x="360" y="225" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">C'</text><text x="386" y="217" font-size="13" fill="#10b981" font-weight="700">✓ kéo thêm C'</text><text x="386" y="234" font-size="13" fill="#10b981" font-weight="700">là khớp</text><text x="16" y="268" font-size="13" font-weight="700" fill="#10b981">Không xoá gì, chỉ thêm: an toàn khi đã push</text></svg>
<svg viewBox="0 0 520 280" role="img" aria-labelledby="g05b-t g05b-d" style="width:100%;max-width:520px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif"><title id="g05b-t">git reset --hard B: kéo HEAD lùi về B, C bị gỡ khỏi nhánh</title><desc id="g05b-d">Máy bạn: main và HEAD lùi về B; C không còn nhãn nào trỏ tới nhưng vẫn nằm trong reflog. Đồng nghiệp đã kéo về vẫn có C nên lịch sử hai bên lệch nhau. Chỉ an toàn khi chưa push.</desc><text x="16" y="24" font-size="14" font-weight="700" fill="currentColor" font-family="ui-monospace, monospace">git reset --hard B</text><text x="16" y="56" font-size="13" fill="currentColor" opacity="0.75">Máy bạn</text><text x="16" y="176" font-size="13" fill="currentColor" opacity="0.75">Bản đồng nghiệp đã kéo về</text><line x1="77" y1="104" x2="143" y2="104" stroke="currentColor" stroke-opacity="0.4" stroke-width="2"/><line x1="177" y1="104" x2="243" y2="104" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" stroke-dasharray="4 4"/><circle cx="60" cy="104" r="17" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="60" y="109" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">A</text><circle cx="160" cy="104" r="17" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="160" y="109" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">B</text><circle cx="260" cy="104" r="17" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="4 3"/><text x="260" y="109" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor" opacity="0.45">C</text><line x1="248" y1="92" x2="272" y2="116" stroke="#f43f5e" stroke-width="2"/><line x1="272" y1="92" x2="248" y2="116" stroke="#f43f5e" stroke-width="2"/><rect x="102.5" y="57" width="115" height="22" rx="11" fill="#8b5cf6" fill-opacity="0.18" stroke="#8b5cf6"/><text x="160" y="73" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">main · HEAD</text><text x="286" y="104" font-size="13" fill="currentColor" opacity="0.8">không nhãn nào trỏ tới</text><text x="286" y="121" font-size="13" fill="currentColor" opacity="0.8">(vẫn trong reflog)</text><line x1="77" y1="220" x2="143" y2="220" stroke="currentColor" stroke-opacity="0.4" stroke-width="2"/><line x1="177" y1="220" x2="243" y2="220" stroke="currentColor" stroke-opacity="0.4" stroke-width="2"/><circle cx="60" cy="220" r="17" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="60" y="225" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">A</text><circle cx="160" cy="220" r="17" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/><text x="160" y="225" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">B</text><circle cx="260" cy="220" r="17" fill="#f43f5e" fill-opacity="0.22" stroke="currentColor" stroke-opacity="0.45"/><text x="260" y="225" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">C</text><text x="286" y="217" font-size="13" fill="#f43f5e" font-weight="700">✗ vẫn còn C:</text><text x="286" y="234" font-size="13" fill="#f43f5e" font-weight="700">hai bên lệch nhau</text><text x="16" y="268" font-size="13" font-weight="700" fill="#f43f5e">Xé trang sổ: chỉ an toàn khi chưa push</text></svg>
<ab-note>Như ghi thêm một bút toán đảo ngược: C vẫn nằm trong sổ, C' xoá tác dụng của nó. Ai đã kéo A, B, C về chỉ việc kéo thêm C'.</ab-note>
<ab-note>Như xé trang sổ: nhánh của bạn sạch, nhưng ai đã kéo C về vẫn giữ C. Hai lịch sử không còn khớp, nên chỉ dùng cho commit chưa push.</ab-note>
</ab-toggle>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Ba mức git reset HEAD~1 ảnh hưởng tới những khu vực nào</title>
  <desc>Sau khi gỡ commit cuối, ba mức reset khác nhau ở chỗ chúng giữ hay xoá hai khu vực: --soft giữ cả khu chờ và bàn làm việc; --mixed xoá khu chờ nhưng giữ bàn làm việc; --hard xoá cả hai. Ô tô lục là giữ thay đổi, ô gạch chéo đỏ là xoá thay đổi.</desc>
  <text x="16" y="24" font-size="13.5" font-weight="700" fill="currentColor">git reset HEAD~1 — ba mức tác động tới đâu</text>
  <text x="16" y="60" font-size="11" font-weight="700" fill="currentColor" opacity="0.8">Mức</text>
  <text x="206" y="60" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.8">Commit cuối</text>
  <text x="396" y="60" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.8">Khu chờ (staging)</text>
  <text x="586" y="60" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor" opacity="0.8">Bàn làm việc</text>
  <g font-size="11">
    <text x="16" y="98" font-size="12" font-weight="700" fill="currentColor">--soft</text>
    <rect x="126" y="80" width="160" height="32" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="206" y="100" text-anchor="middle" fill="currentColor">Bị gỡ</text>
    <rect x="316" y="80" width="160" height="32" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="396" y="100" text-anchor="middle" fill="currentColor">Giữ nguyên</text>
    <rect x="506" y="80" width="160" height="32" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="586" y="100" text-anchor="middle" fill="currentColor">Giữ nguyên</text>
  </g>
  <g font-size="11">
    <text x="16" y="148" font-size="12" font-weight="700" fill="currentColor">--mixed</text>
    <text x="16" y="162" font-size="9.5" fill="currentColor" opacity="0.6">(mặc định)</text>
    <rect x="126" y="130" width="160" height="32" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="206" y="150" text-anchor="middle" fill="currentColor">Bị gỡ</text>
    <rect x="316" y="130" width="160" height="32" rx="7" fill="#ef4444" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="396" y="150" text-anchor="middle" fill="currentColor">Dọn trống</text>
    <rect x="506" y="130" width="160" height="32" rx="7" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="586" y="150" text-anchor="middle" fill="currentColor">Giữ nguyên</text>
  </g>
  <g font-size="11">
    <text x="16" y="198" font-size="12" font-weight="700" fill="#ef4444">--hard</text>
    <rect x="126" y="180" width="160" height="32" rx="7" fill="#f59e0b" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="206" y="200" text-anchor="middle" fill="currentColor">Bị gỡ</text>
    <rect x="316" y="180" width="160" height="32" rx="7" fill="#ef4444" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="396" y="200" text-anchor="middle" fill="currentColor">Dọn trống</text>
    <rect x="506" y="180" width="160" height="32" rx="7" fill="#ef4444" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="586" y="200" text-anchor="middle" font-weight="700" fill="#ef4444">XOÁ SẠCH</text>
  </g>
  <g font-size="10.5" fill="currentColor" opacity="0.8">
    <rect x="126" y="244" width="16" height="16" rx="4" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="150" y="256">Giữ thay đổi (cứu được)</text>
    <rect x="356" y="244" width="16" height="16" rx="4" fill="#ef4444" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
    <text x="380" y="256">Xoá thay đổi — càng sang phải càng nguy hiểm</text>
  </g>
</svg>

| Mức | Commit cuối | Khu chờ (staging) | Bàn làm việc | Ví von |
|---|---|---|---|---|
| `--soft` | Bị gỡ | Giữ nguyên thay đổi | Giữ nguyên | Mở thùng hàng ra nhưng đồ vẫn đóng gói sẵn |
| `--mixed` | Bị gỡ | Dọn trống | Giữ nguyên | Mở thùng, đồ bày lại lên bàn |
| `--hard` | Bị gỡ | Dọn trống | **Xoá sạch** | Vứt cả thùng lẫn đồ vào lò đốt |

### Bảng quyết định: khi nào dùng gì?

| Tình huống | Dùng lệnh | Độ nguy hiểm |
|---|---|---|
| Commit lỗi **đã push** lên GitHub, người khác có thể đã kéo về | `git revert` | An toàn — không sửa lịch sử |
| Commit còn **trên máy mình**, muốn gỡ ra làm lại nhưng giữ code | `git reset --soft` / `--mixed` | Vừa — code vẫn còn |
| Muốn vứt sạch cả commit lẫn mọi thay đổi, quay về quá khứ | `git reset --hard` | Cao — mất thay đổi chưa commit |
| Chỉ sai message hoặc thiếu file ở commit cuối (chưa push) | `git commit --amend` | Vừa — đừng dùng sau khi push |
| Chỉ muốn vứt thay đổi chưa commit của 1 file | `git restore <file>` | Mất thay đổi chưa lưu của file đó |

> Ghi nhớ: Câu thần chú — **"Đã push thì revert, chưa push thì reset"**. Khi phân vân, chọn `revert`: chậm hơn một chút nhưng không bao giờ phá lịch sử chung.

## 5. Cất tạm công việc dở dang — `git stash`

### Tình huống

Bạn đang sửa dở tính năng A (code còn ngổn ngang, chưa muốn commit) thì sếp nhắn: "Sửa gấp lỗi B trên nhánh khác!". Git từ chối chuyển nhánh nếu thao tác đó sẽ ghi đè thay đổi chưa commit (hoặc file untracked) của bạn; nếu không đụng các thay đổi ấy thì vẫn chuyển được. Làm sao?

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

<step-flow>
<svg viewBox="0 0 660 420" role="img" aria-labelledby="g05c-t g05c-d" style="width:100%;max-width:660px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
<title id="g05c-t">git stash: cất đồ dở vào ngăn kéo, sang main sửa gấp, quay lại lấy ra</title>
<desc id="g05c-d">Bốn cột theo thời gian đi xuống: nhánh đang đứng, bàn làm việc, ngăn kéo stash, commit trên main. Ban đầu bàn có đồ dở của tính năng A trên nhánh tinh-nang-a. Bước 1 git stash push cất đồ dở vào ngăn kéo, bàn sạch. Bước 2 git switch main. Bước 3 sửa lỗi B rồi commit lên main. Bước 4 git switch tinh-nang-a. Bước 5 git stash pop đưa đồ dở về bàn và xoá gói khỏi ngăn kéo.</desc>
<defs><marker id="g05c-m" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor"/></marker></defs>
<rect x="6" y="12" width="132" height="34" rx="8" fill="#64748b" fill-opacity="0.16" stroke="#64748b" stroke-opacity="0.5"/>
<text x="72" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Đang ở nhánh</text>
<rect x="204" y="12" width="132" height="34" rx="8" fill="#3b82f6" fill-opacity="0.16" stroke="#3b82f6" stroke-opacity="0.5"/>
<text x="270" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Bàn làm việc</text>
<line x1="270" y1="46" x2="270" y2="410" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<rect x="374" y="12" width="132" height="34" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b" stroke-opacity="0.5"/>
<text x="440" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Ngăn kéo stash</text>
<line x1="440" y1="46" x2="440" y2="410" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<rect x="524" y="12" width="132" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.16" stroke="#8b5cf6" stroke-opacity="0.5"/>
<text x="590" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Commit trên main</text>
<line x1="590" y1="46" x2="590" y2="410" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
<rect x="60" y="56" width="24" height="102" rx="4" fill="#3b82f6" fill-opacity="0.35"/><text x="94" y="74" font-size="12" font-weight="700" fill="#3b82f6">tinh-nang-a</text>
<rect x="195.0" y="57" width="150" height="24" rx="12" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6"/><text x="270" y="74" text-anchor="middle" font-size="12" fill="currentColor">đồ dở tính năng A</text>
<g data-step="1">
<line x1="274" y1="110" x2="436" y2="110" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.8" marker-end="url(#g05c-m)"/><text x="355.0" y="102" text-anchor="middle" font-size="12" fill="currentColor" font-family="ui-monospace, monospace">git stash push -m "…"</text>
<rect x="365.0" y="121" width="150" height="24" rx="12" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b"/><text x="440" y="138" text-anchor="middle" font-size="12" fill="currentColor">stash@{0}: dở A</text>
<rect x="220.0" y="121" width="100" height="24" rx="12" fill="#64748b" fill-opacity="0.2" stroke="#64748b"/><text x="270" y="138" text-anchor="middle" font-size="12" fill="currentColor">bàn sạch</text>
</g>
<g data-step="2">
<rect x="60" y="158" width="24" height="120" rx="4" fill="#8b5cf6" fill-opacity="0.35"/><text x="94" y="176" font-size="12" font-weight="700" fill="#8b5cf6">main</text>
<text x="94" y="194" font-size="12" fill="currentColor" font-family="ui-monospace, monospace">git switch main</text>
</g>
<g data-step="3">
<line x1="274" y1="230" x2="576" y2="230" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.8" marker-end="url(#g05c-m)"/><text x="425.0" y="222" text-anchor="middle" font-size="12" fill="currentColor" font-family="ui-monospace, monospace">sửa lỗi B, commit, push</text>
<circle cx="590" cy="230" r="10" fill="#8b5cf6" fill-opacity="0.3" stroke="#8b5cf6"/>
<text x="574" y="252" text-anchor="end" font-size="12" fill="currentColor">lỗi B đã sửa</text>
</g>
<g data-step="4">
<rect x="60" y="278" width="24" height="132" rx="4" fill="#3b82f6" fill-opacity="0.35"/><text x="94" y="296" font-size="12" font-weight="700" fill="#3b82f6">tinh-nang-a</text>
<text x="94" y="314" font-size="12" fill="currentColor" font-family="ui-monospace, monospace">git switch tinh-nang-a</text>
</g>
<g data-step="5">
<line x1="436" y1="350" x2="274" y2="350" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.8" marker-end="url(#g05c-m)"/><text x="355.0" y="342" text-anchor="middle" font-size="12" fill="currentColor" font-family="ui-monospace, monospace">git stash pop</text>
<rect x="195.0" y="363" width="150" height="24" rx="12" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6"/><text x="270" y="380" text-anchor="middle" font-size="12" fill="currentColor">đồ dở A quay lại</text>
<rect x="380.0" y="363" width="120" height="24" rx="12" fill="#64748b" fill-opacity="0.2" stroke="#64748b"/><text x="440" y="380" text-anchor="middle" font-size="12" fill="currentColor">ngăn kéo trống</text>
</g>
</svg>
<step-note data-step="1">Bàn đang bừa mà chưa muốn commit. <code>stash</code> quét hết vào ngăn kéo, ghi chú <code>-m</code> để vài tuần sau còn nhớ gói này là gì.</step-note>
<step-note data-step="2">Bàn sạch nên đổi nhánh không lo mang theo đồ dở của tính năng A sang <code>main</code>.</step-note>
<step-note data-step="3">Sửa gấp lỗi B và commit trên <code>main</code> như bình thường. Đồ dở của A vẫn nằm yên trong ngăn kéo, không lẫn vào commit này.</step-note>
<step-note data-step="4">Về lại nhánh của tính năng A. Bàn vẫn sạch: đồ dở chưa được lấy ra.</step-note>
<step-note data-step="5"><code>pop</code> lấy gói mới nhất ra bàn rồi xoá khỏi ngăn kéo. Muốn giữ bản sao trong ngăn kéo thì dùng <code>git stash apply</code>.</step-note>
</step-flow>

> Lỗi người mới hay gặp: (1) Cất stash rồi… quên luôn, vài tuần sau `git stash list` thấy 7 gói không nhớ gói nào là gì — hãy luôn dùng `-m` để ghi chú. (2) Mặc định `git stash` **không cất file mới tạo chưa từng `git add`** (gọi là untracked file — file Git chưa theo dõi); muốn cất cả chúng, dùng `git stash -u`.

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

> Ghi nhớ: **Mọi thứ đã từng commit đều cứu được bằng reflog** (trong vòng ~90 ngày trước khi Git dọn rác). Thứ duy nhất reflog KHÔNG cứu được là thay đổi **chưa bao giờ commit** — đó là lý do nên commit nhỏ và thường xuyên, như lưu game trước mỗi trận boss.

> Lỗi người mới hay gặp: reflog là nhật ký **riêng của từng máy** — nó không được push lên GitHub. Bạn không thể dùng reflog của mình để cứu thao tác lỡ tay trên máy đồng nghiệp.

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
| `git restore <file>` | Vứt thay đổi chưa commit của file | Mất thay đổi chưa lưu |
| `git restore --staged <file>` | Rút file khỏi khu chờ | Vô hại |
| `git commit --amend` | Sửa commit cuối (chưa push) | Đổi mã commit |
| `git revert <commit>` | Đảo ngược commit đã push | An toàn nhất |
| `git reset --soft/--mixed` | Gỡ commit, giữ code | Vừa |
| `git reset --hard` | Quay về quá khứ, xoá sạch | Cao |
| `git stash` | Cất tạm việc dở dang | An toàn (nhớ ghi chú) |
| `git reflog` | Tìm lại mọi thứ "đã mất" | Chỉ xem, vô hại |

> Ghi nhớ cuối bài: Ba thói quen giúp bạn gần như không bao giờ cần "cứu hộ khẩn cấp": (1) **commit nhỏ và thường xuyên** — mỗi commit là một điểm lưu game; (2) **đọc kỹ output của `git status`** trước khi gõ lệnh tiếp; (3) **chưa push thì thoải mái sửa lịch sử, đã push thì chỉ revert**. Git không trừng phạt người lỡ tay — nó chỉ trừng phạt người lỡ tay xong còn cuống.
