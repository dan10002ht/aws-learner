# Branch: làm việc song song

## Mở đầu: vũ trụ song song trong dự án của bạn

Hãy tưởng tượng bạn đang viết một cuốn tiểu thuyết. Bản chính đang rất ổn, nhưng bạn muốn thử viết lại chương 5 theo hướng hoàn toàn khác. Bạn không dám sửa thẳng vào bản chính — lỡ thử nghiệm thất bại thì sao?

Cách thông minh nhất: **photo một bản ra**, thử nghiệm thoải mái trên bản photo. Nếu hay → chép phần mới vào bản chính. Nếu dở → vứt bản photo đi, bản chính vẫn nguyên vẹn.

**Branch** (nhánh) trong Git chính là "bản photo" đó — nhưng kỳ diệu hơn nhiều: nó không tốn dung lượng gấp đôi, tạo ra trong tích tắc, và Git biết cách **tự động gộp** các thay đổi lại với nhau sau này.

> 💡 Ghi nhớ: Branch là một "vũ trụ song song" của dự án. Mọi thay đổi trong vũ trụ đó KHÔNG ảnh hưởng gì đến vũ trụ chính, cho đến khi bạn chủ động gộp (merge) chúng lại.

## 1. Branch là gì — nhìn sâu hơn một chút

### Dòng thời gian và các nhánh rẽ

Ở các bài trước, bạn đã biết mỗi lần `git commit` là một lần "chụp ảnh" toàn bộ dự án. Các commit nối tiếp nhau tạo thành một **dòng thời gian**:

```
A --- B --- C        ← dòng thời gian chính (branch "main")
```

Mỗi chữ cái là một commit. Branch `main` (nhánh chính — tên mặc định Git đặt cho bạn) thực chất chỉ là **một cái nhãn dán** trỏ vào commit mới nhất.

Khi bạn tạo branch mới tên `thu-nghiem`, Git chỉ làm một việc: dán thêm một cái nhãn nữa vào cùng commit đó. Chưa có gì rẽ nhánh cả:

```
A --- B --- C   ← main, thu-nghiem (cùng trỏ vào C)
```

Bây giờ bạn đứng trên `thu-nghiem` và commit thêm 2 lần (D và E). Dòng thời gian bắt đầu **rẽ đôi**:

```
A --- B --- C          ← main (vẫn đứng yên ở C)
               \
                D --- E   ← thu-nghiem
```

Ai đang làm việc trên `main` vẫn thấy dự án y như ở commit C. Còn bạn, trên `thu-nghiem`, đã đi xa hơn 2 bước. Hai vũ trụ song song, không ai làm phiền ai.

### Vì sao branch lại quan trọng đến vậy?

| Tình huống | Không có branch | Có branch |
|---|---|---|
| Thử tính năng mới | Sửa thẳng bản chính, hỏng là khóc | Thử trên nhánh riêng, hỏng thì xoá nhánh |
| 2 người cùng làm | Giẫm chân lên nhau liên tục | Mỗi người một nhánh, gộp sau |
| Sửa lỗi khẩn cấp | Phải dừng việc đang dở dang | Tạo nhánh sửa lỗi riêng, xong quay lại |
| Code đang chạy tốt | Luôn lo bị phá | `main` luôn sạch, luôn chạy được |

Đây là lý do mọi công ty phần mềm đều có quy tắc bất thành văn: **không bao giờ làm việc trực tiếp trên `main`**.

## 2. Tạo và chuyển branch

### Xem mình đang ở nhánh nào

```bash
git branch
```

Kết quả:

```
* main
```

Dấu `*` cho biết bạn đang đứng ở đâu. Lúc mới tạo dự án, chỉ có một nhánh `main`.

### Tạo branch mới

```bash
git branch them-trang-gioi-thieu
```

Lệnh này **chỉ tạo** nhãn mới, bạn **vẫn đang đứng ở `main`**. Kiểm tra lại:

```
* main
  them-trang-gioi-thieu
```

### Chuyển sang branch khác

```bash
git switch them-trang-gioi-thieu
```

Git trả lời: `Switched to branch 'them-trang-gioi-thieu'`. Bây giờ dấu `*` đã chuyển sang nhánh mới.

> 💡 Ghi nhớ: Bạn có thể gặp lệnh cũ `git checkout ten-nhanh` trong các tài liệu trên mạng — nó làm điều tương tự. `git switch` là lệnh mới hơn, ra đời để dễ hiểu hơn (checkout làm quá nhiều việc khác nhau nên hay gây nhầm lẫn). Hãy quen dùng `switch`.

### Tạo và chuyển trong MỘT lệnh (dùng nhiều nhất)

```bash
git switch -c sua-loi-dang-nhap
```

Chữ `-c` nghĩa là *create* (tạo). Lệnh này = tạo nhánh + nhảy sang nhánh đó luôn. Đây là lệnh bạn sẽ gõ hàng ngày.

### Điều kỳ diệu khi chuyển nhánh

Hãy thử nghiệm này để "ngộ" ra branch:

1. Đứng ở nhánh `thu-nghiem`, tạo file mới `ynew.txt`, rồi `git add` + `git commit`.
2. Gõ `git switch main` → mở thư mục ra nhìn: **file `ynew.txt` biến mất!**
3. Gõ `git switch thu-nghiem` → file **hiện lại**.

Git đang thay đổi nội dung thư mục của bạn để khớp với từng vũ trụ. Như bước qua cánh cửa thần kỳ của Doraemon — mỗi cửa dẫn đến một phiên bản khác nhau của cùng căn phòng.

> ⚠️ Lỗi người mới hay gặp: Sửa file xong **quên commit** rồi chuyển nhánh. Git có thể từ chối chuyển (báo lỗi "your local changes would be overwritten") hoặc mang luôn thay đổi dở dang sang nhánh kia, gây rối. Thói quen tốt: trước khi `git switch`, luôn gõ `git status` — nếu có thay đổi chưa commit, hãy commit (hoặc tạm cất bằng `git stash`) trước.

## 3. Merge: gộp hai vũ trụ làm một

Thử nghiệm thành công! Giờ bạn muốn đem thành quả từ nhánh `them-trang-gioi-thieu` về `main`. Hành động này gọi là **merge** (gộp/hợp nhất).

Quy trình luôn gồm 2 bước:

```bash
git switch main                      # Bước 1: đứng ở nhánh NHẬN (đích đến)
git merge them-trang-gioi-thieu      # Bước 2: kéo nhánh kia VÀO chỗ mình đứng
```

Cách nhớ: merge giống như **mời khách vào nhà**. Bạn phải đứng ở nhà mình (`main`) rồi mời khách (`them-trang-gioi-thieu`) vào — chứ không chạy sang nhà khách.

### Trường hợp 1: Fast-forward — gộp "tua nhanh"

Nếu từ lúc rẽ nhánh đến giờ, `main` **không có commit mới nào**, tình hình trông thế này:

```
A --- B --- C            ← main
               \
                D --- E   ← them-trang-gioi-thieu
```

Để ý: `main` thực ra nằm ngay trên đường thẳng dẫn tới E. Không có gì để "gộp" cả — Git chỉ cần **trượt cái nhãn `main` tiến lên** tới E:

```
A --- B --- C --- D --- E   ← main, them-trang-gioi-thieu
```

Đây gọi là **fast-forward** (tua nhanh — như bấm nút tua trên máy phát video). Git sẽ in dòng chữ `Fast-forward` cho bạn biết. Không tạo commit mới, không thể có xung đột, êm đẹp tuyệt đối.

### Trường hợp 2: Merge thật sự — hai nhánh đều có commit mới

Nếu trong lúc bạn làm việc trên nhánh phụ, `main` cũng có thêm commit (ví dụ đồng nghiệp đẩy code lên):

```
A --- B --- C --- F        ← main
               \
                D --- E    ← them-trang-gioi-thieu
```

Lần này không thể tua nhanh — hai dòng lịch sử đã thực sự tách đôi. Git sẽ tự động trộn thay đổi của cả hai bên và tạo ra một **merge commit** (commit gộp) có hai "cha mẹ":

```
A --- B --- C --- F --------- M    ← main
               \             /
                D --- E ----       ← them-trang-gioi-thieu
```

Git sẽ mở trình soạn thảo cho bạn ghi lời nhắn commit (thường để nguyên dòng mặc định `Merge branch '...'` rồi lưu là xong). Trong đa số trường hợp, Git trộn **tự động và chính xác** — vì hai bên sửa các file khác nhau, hoặc các phần khác nhau của cùng file.

Nhưng đôi khi... Git bó tay. Đó là lúc CONFLICT xuất hiện.

## 4. CONFLICT: vì sao xảy ra và cách giải — KHÔNG HOẢNG

### Vì sao xảy ra?

Conflict (xung đột) xảy ra khi **hai nhánh cùng sửa MỘT chỗ trong MỘT file theo hai cách khác nhau**.

Hình dung: bạn và đồng nghiệp cùng cầm hai bản photo của một tờ thực đơn. Bạn sửa dòng 3 thành "Phở bò - 50.000đ", đồng nghiệp sửa đúng dòng 3 đó thành "Phở bò - 55.000đ". Khi gộp hai tờ lại, máy móc không thể tự quyết định giá nào đúng — **chỉ con người mới biết**. Nên Git dừng lại và hỏi bạn.

> 💡 Ghi nhớ: Conflict KHÔNG phải là lỗi, không phải bạn làm sai gì cả. Nó là Git đang lịch sự nói: "Tôi gặp hai phiên bản trái ngược, bạn là người quyết định nhé." Code của bạn không mất đi đâu cả — cả hai phiên bản đều đang nằm ngay trong file.

### Nhận diện conflict

Khi merge gặp xung đột, Git in ra:

```
Auto-merging menu.txt
CONFLICT (content): Merge conflict in menu.txt
Automatic merge failed; fix conflicts and then commit the result.
```

Đọc kỹ dòng cuối — Git đã chỉ luôn cách giải quyết: *sửa xung đột rồi commit*. Gõ `git status` để xem danh sách file xung đột (mục `both modified`).

### Giải conflict từng bước

**Bước 1 — Hít thở. Mở file bị xung đột ra.** Bạn sẽ thấy Git đã đánh dấu vùng tranh chấp bằng các ký hiệu lạ:

```
<<<<<<< HEAD
Phở bò - 50.000đ
=======
Phở bò - 55.000đ
>>>>>>> nhanh-cap-nhat-gia
```

Giải mã:
- `<<<<<<< HEAD`: từ đây trở xuống là phiên bản của **nhánh bạn đang đứng** (HEAD = vị trí hiện tại của bạn, thường là `main`).
- `=======`: vạch ngăn cách giữa hai phiên bản.
- `>>>>>>> nhanh-cap-nhat-gia`: từ vạch đến đây là phiên bản của **nhánh đang được gộp vào**.

**Bước 2 — Quyết định giữ gì.** Bạn có 3 lựa chọn: giữ bản trên, giữ bản dưới, hoặc tự viết bản kết hợp cả hai. Sửa file bằng tay: xoá hết các dòng ký hiệu `<<<<<<<`, `=======`, `>>>>>>>` và để lại đúng nội dung cuối cùng bạn muốn. Ví dụ quyết định lấy giá mới:

```
Phở bò - 55.000đ
```

File phải trông như chưa từng có chuyện gì xảy ra — sạch sẽ, không còn ký hiệu nào.

**Bước 3 — Báo cho Git biết bạn đã xử lý xong file này:**

```bash
git add menu.txt
```

**Bước 4 — Lặp lại bước 1-3 cho từng file** còn trong danh sách `git status` (nếu có nhiều file xung đột).

**Bước 5 — Hoàn tất cuộc merge bằng một commit:**

```bash
git commit
```

Git tự điền sẵn lời nhắn `Merge branch '...'`, bạn chỉ cần lưu lại. Xong! Xung đột đã được giải, hai nhánh đã hợp nhất.

### Nếu rối quá, muốn làm lại từ đầu?

```bash
git merge --abort
```

Lệnh này **huỷ toàn bộ cuộc merge**, đưa mọi thứ về đúng trạng thái trước khi bạn gõ `git merge`. Đây là nút "thoát hiểm" an toàn tuyệt đối — biết nó tồn tại là đã bớt 90% nỗi sợ conflict.

> ⚠️ Lỗi người mới hay gặp:
> 1. **Quên xoá ký hiệu** `<<<<<<<`, `=======`, `>>>>>>>` rồi commit luôn — các ký hiệu này sẽ nằm chình ình trong code và làm chương trình lỗi. Trước khi `git add`, đọc lại file lần cuối.
> 2. **Xoá nhầm cả hai phiên bản** trong lúc hoảng loạn. Bình tĩnh: phiên bản trên là của mình, dưới là của nhánh kia — đọc kỹ rồi mới xoá.
> 3. **Commit khi chưa giải hết file** — `git status` là bạn thân, gõ nó liên tục để biết còn file nào `both modified`.

## 5. Xoá branch: dọn dẹp sau khi xong việc

Sau khi merge thành công, nhánh phụ đã hoàn thành sứ mệnh. Giữ lại chỉ làm danh sách nhánh dài lê thê. Hãy xoá:

```bash
git branch -d them-trang-gioi-thieu
```

Chữ `-d` = *delete* (xoá). Lưu ý quan trọng: **xoá branch KHÔNG xoá commit** — các commit đã được gộp vào `main` rồi, bạn chỉ đang gỡ cái nhãn dán xuống thôi.

Hai tình huống đặc biệt:

| Tình huống | Chuyện gì xảy ra |
|---|---|
| Nhánh **chưa được merge** mà gõ `-d` | Git từ chối và cảnh báo, vì xoá sẽ làm các commit trên nhánh đó "mồ côi" — đây là Git đang bảo vệ bạn |
| Bạn **chắc chắn muốn vứt bỏ** nhánh thử nghiệm thất bại | Dùng chữ D hoa: `git branch -D ten-nhanh` (ép xoá, mất các commit chưa merge) |

> 💡 Ghi nhớ: `-d` là xoá an toàn (Git kiểm tra giúp bạn), `-D` là xoá bất chấp. Khi phân vân, luôn dùng `-d` trước — nếu Git cho xoá nghĩa là an toàn.

Bạn cũng không thể xoá nhánh mình **đang đứng trên đó** — như không thể cưa cành cây mình đang ngồi. Hãy `git switch main` trước rồi mới xoá.

## 6. Quy ước đặt tên branch

Tên nhánh là cách giao tiếp với đồng đội (và với chính bạn của 3 tháng sau). Cộng đồng lập trình đã hình thành quy ước phổ biến: **`thể-loại/mô-tả-ngắn`**.

| Tiền tố | Dùng khi | Ví dụ |
|---|---|---|
| `feature/` | Làm tính năng mới (feature = tính năng) | `feature/login-google` |
| `fix/` hoặc `bugfix/` | Sửa lỗi (fix = sửa) | `fix/sai-tong-tien-gio-hang` |
| `hotfix/` | Sửa lỗi KHẨN trên bản đang chạy thật | `hotfix/khong-thanh-toan-duoc` |
| `docs/` | Sửa tài liệu (documentation) | `docs/huong-dan-cai-dat` |
| `refactor/` | Sắp xếp lại code, không đổi tính năng | `refactor/tach-ham-tinh-thue` |
| `test/` hoặc `experiment/` | Thử nghiệm, có thể vứt | `experiment/giao-dien-moi` |

Nguyên tắc vàng khi đặt tên:

- **Chữ thường, nối bằng dấu gạch ngang** `-`: `feature/dang-ky-email`, không phải `Feature/DangKyEmail`.
- **Không dấu cách, không tiếng Việt có dấu** trong tên nhánh (Git cho phép nhiều ký tự nhưng tên ASCII đơn giản tránh mọi rắc rối): viết `sua-loi-dang-nhap` thay vì `sửa lỗi đăng nhập`.
- **Ngắn nhưng đủ nghĩa**: đọc tên là biết nhánh làm gì. `fix/bug` là tên tồi; `fix/anh-dai-dien-khong-hien` là tên tốt.
- Nếu nhóm dùng công cụ quản lý việc (Jira, GitHub Issues), gắn mã số vào: `feature/123-thanh-toan-momo`.

> ⚠️ Lỗi người mới hay gặp: Đặt tên kiểu `test`, `abc`, `nhanh-moi`, `final`, `final2-that-su-final`. Một tuần sau chính bạn cũng không nhớ nhánh đó chứa gì. Tốn 10 giây đặt tên tử tế, tiết kiệm 10 phút bối rối sau này.

## 7. Quy trình làm việc chuẩn — ghép tất cả lại

Đây là vòng lặp bạn sẽ thực hiện hàng trăm lần trong sự nghiệp:

```bash
# 1. Bắt đầu từ main, đảm bảo nó mới nhất
git switch main

# 2. Tạo nhánh mới cho công việc sắp làm
git switch -c feature/trang-lien-he

# 3. Làm việc: sửa file → add → commit (lặp lại nhiều lần)
git add .
git commit -m "Thêm form liên hệ"

# 4. Xong việc: quay về main và gộp
git switch main
git merge feature/trang-lien-he

# (4b. Nếu có CONFLICT: mở file sửa → git add → git commit. Bình tĩnh!)

# 5. Dọn dẹp
git branch -d feature/trang-lien-he
```

## Bảng tra cứu nhanh

| Lệnh | Tác dụng |
|---|---|
| `git branch` | Liệt kê các nhánh, dấu `*` là nhánh hiện tại |
| `git branch ten-nhanh` | Tạo nhánh mới (chưa chuyển sang) |
| `git switch ten-nhanh` | Chuyển sang nhánh khác |
| `git switch -c ten-nhanh` | Tạo + chuyển sang nhánh mới (dùng nhiều nhất) |
| `git merge ten-nhanh` | Gộp nhánh kia vào nhánh đang đứng |
| `git merge --abort` | Huỷ cuộc merge đang dang dở, về trạng thái cũ |
| `git branch -d ten-nhanh` | Xoá nhánh đã merge (an toàn) |
| `git branch -D ten-nhanh` | Ép xoá nhánh chưa merge (cẩn thận) |
| `git log --oneline --graph --all` | Vẽ sơ đồ các nhánh ngay trong terminal |

## Tóm tắt bài học

1. **Branch là vũ trụ song song** — thực chất chỉ là cái nhãn trỏ vào một commit, nên tạo nhanh, không tốn chỗ.
2. **Không bao giờ làm việc thẳng trên `main`** — mỗi việc một nhánh, `main` luôn sạch.
3. **Merge** = đứng ở nhánh đích, kéo nhánh kia vào. Nếu nhánh đích chưa đi đâu cả → **fast-forward** (chỉ trượt nhãn, êm đẹp). Nếu cả hai cùng tiến → tạo **merge commit**.
4. **Conflict không phải lỗi** — chỉ là Git hỏi ý kiến bạn khi hai bên sửa cùng một chỗ. Mở file, chọn phiên bản đúng, xoá ký hiệu đánh dấu, `git add`, `git commit`. Rối quá thì `git merge --abort` làm lại.
5. **Xoá nhánh sau khi merge** bằng `-d`; xoá không mất commit đã gộp.
6. **Đặt tên nhánh có quy ước** (`feature/...`, `fix/...`) — chữ thường, gạch ngang, đủ nghĩa.

Ở bài tiếp theo, branch sẽ phát huy sức mạnh thật sự khi kết hợp với GitHub: đẩy nhánh lên mạng, mở **Pull Request** để đồng đội xem xét code trước khi gộp — đúng cách các đội ngũ chuyên nghiệp trên toàn thế giới đang làm việc mỗi ngày.
