# GitHub & Remote: Đưa Code Lên Mây

## Mở đầu: Tại sao phải đưa code "lên mây"?

Hãy tưởng tượng bạn viết một cuốn nhật ký rất quan trọng. Nếu bạn chỉ cất nó trong ngăn kéo ở nhà, chuyện gì xảy ra khi nhà bị cháy, hoặc bạn làm mất cuốn sổ? Toàn bộ công sức biến mất.

Code của bạn cũng vậy. Ở các bài trước, mọi thứ bạn làm với Git đều nằm **trên máy tính của bạn** (gọi là **local** — tức là "tại chỗ", trên máy mình). Nếu máy hỏng, mất trộm, hay lỡ tay xoá nhầm — mất hết.

Giải pháp: gửi một bản sao của kho code lên một máy chủ ở nơi khác — người ta hay gọi là "lên mây" (**cloud** — chỉ những máy tính của các công ty lớn đặt ở trung tâm dữ liệu, bạn truy cập qua Internet). Nơi phổ biến nhất để gửi code lên là **GitHub**.

Bài này sẽ giúp bạn:

- Hiểu GitHub là gì và khác Git ra sao
- Tạo kho chứa code (repo) trên GitHub
- Đẩy code lên (push), kéo code về (pull), sao chép kho về máy (clone)
- Thiết lập SSH key để không phải gõ mật khẩu liên tục
- Viết README đẹp bằng Markdown
- Hiểu fork là gì
- Dùng GitHub làm hồ sơ năng lực (portfolio) khi xin việc

---

## 1. GitHub là gì? Khác Git thế nào?

Đây là câu hỏi khiến người mới bối rối nhất, nên ta làm rõ ngay.

| | Git | GitHub |
|---|---|---|
| Bản chất | Phần mềm cài trên máy bạn | Trang web / dịch vụ trên Internet |
| Vai trò | Ghi lại lịch sử thay đổi code | Nơi **lưu trữ** kho Git trên mây và **cộng tác** với người khác |
| Ai tạo ra | Linus Torvalds (2005) | Công ty GitHub (2008, nay thuộc Microsoft) |
| Dùng không cần cái kia được không? | Có — Git chạy hoàn toàn offline | Không — GitHub được xây dựng để chứa các kho Git |
| Ví von | Cuốn sổ nhật ký + máy chụp ảnh từng trang | Tủ khoá an toàn trên mây để cất bản sao cuốn sổ, ai được phép thì xem chung |

**Ví von dễ nhớ:** Git giống như phần mềm soạn thảo văn bản trên máy bạn, còn GitHub giống Google Drive — nơi bạn tải tài liệu lên để lưu trữ và chia sẻ.

Ngoài GitHub còn có các dịch vụ tương tự: **GitLab**, **Bitbucket**. Nguyên lý giống hệt nhau, nhưng GitHub phổ biến nhất thế giới (hơn 100 triệu lập trình viên dùng), nên ta học GitHub.

> 💡 Ghi nhớ: Git là công cụ, GitHub là dịch vụ. Bạn có thể dùng Git mà không cần GitHub, nhưng không thể dùng GitHub mà không có Git.

### Khái niệm "remote"

Kho code trên máy bạn gọi là **local repository** (kho cục bộ). Bản sao của kho đó nằm trên GitHub gọi là **remote repository** (kho từ xa — "remote" nghĩa là "ở xa").

Hai kho này là hai bản sao **độc lập**. Bạn sửa code trên máy thì bản trên GitHub **không tự cập nhật** — bạn phải chủ động "đẩy" lên. Ngược lại, nếu trên GitHub có thay đổi mới (do đồng nghiệp đẩy lên), máy bạn cũng không tự biết — bạn phải "kéo" về.

```
   Máy của bạn (local)              GitHub (remote)
  ┌─────────────────┐    push →   ┌─────────────────┐
  │   Kho Git của   │ ──────────→ │   Bản sao kho   │
  │      bạn        │ ←────────── │    trên mây     │
  └─────────────────┘   ← pull    └─────────────────┘
```

---

## 2. Tạo tài khoản và tạo repo trên GitHub

### Tạo tài khoản

1. Vào **github.com**, bấm **Sign up** (đăng ký).
2. Nhập email, đặt mật khẩu, chọn **username** (tên người dùng).

> ⚠️ Lỗi người mới hay gặp: chọn username kiểu `gaubeo_cute_2k5`. Hãy nhớ username này sẽ xuất hiện trong **link portfolio bạn gửi nhà tuyển dụng** (ví dụ `github.com/gaubeo_cute_2k5`). Hãy chọn tên nghiêm túc, gần với tên thật: `nguyenvanan`, `andev`, `an-nguyen`...

### Tạo repository (repo)

**Repository** (kho chứa, gọi tắt là **repo**) là một "thư mục dự án" trên GitHub. Mỗi dự án = một repo.

1. Đăng nhập, bấm nút **+** góc trên phải → **New repository**.
2. Điền:
   - **Repository name**: tên dự án, ví dụ `hello-git`. Nên viết thường, dùng dấu gạch ngang thay khoảng trắng.
   - **Description** (mô tả): một câu ngắn về dự án.
   - **Public** (công khai — ai cũng xem được) hoặc **Private** (riêng tư — chỉ bạn và người được mời).
   - Tuỳ chọn **Add a README file**: nếu bạn tạo repo mới tinh chưa có code ở máy, hãy tích. Nếu bạn **đã có** kho Git ở máy và định đẩy lên, **đừng tích** (để tránh xung đột).
3. Bấm **Create repository**.

Xong! Bạn đã có một "tủ khoá trên mây" với địa chỉ dạng `https://github.com/ten-ban/hello-git`.

---

## 3. Kết nối local với remote: clone, push, pull

Có hai tình huống bắt đầu, tuỳ bạn đang có gì.

### Tình huống A: Repo có sẵn trên GitHub → tải về máy bằng `git clone`

**Clone** nghĩa đen là "nhân bản". Lệnh này sao chép toàn bộ repo (cả code lẫn toàn bộ lịch sử commit) từ GitHub về máy bạn:

```bash
git clone https://github.com/ten-ban/hello-git.git
```

Git sẽ tạo thư mục `hello-git` trên máy, bên trong có sẵn mọi thứ. Điểm tiện: clone **tự động thiết lập kết nối** với remote, bạn không cần làm gì thêm.

### Tình huống B: Code có sẵn trên máy → đẩy lên GitHub

Bạn đã có thư mục dự án với kho Git (đã `git init` và commit). Giờ "giới thiệu" địa chỉ remote cho nó:

```bash
git remote add origin https://github.com/ten-ban/hello-git.git
```

Giải nghĩa từng chữ:

- `git remote add` — thêm một kho từ xa.
- `origin` — **biệt danh** bạn đặt cho remote đó. Theo quy ước, remote chính luôn tên là `origin` (gốc). Nhờ biệt danh này, sau này bạn chỉ cần gõ `origin` thay vì cả đường link dài.
- Cuối cùng là địa chỉ repo trên GitHub.

Kiểm tra đã kết nối chưa:

```bash
git remote -v
```

### Đẩy code lên: `git push`

```bash
git push -u origin main
```

- `push` = đẩy các commit ở máy lên remote.
- `origin` = đẩy lên remote tên origin (chính là GitHub).
- `main` = đẩy nhánh tên `main` (nhánh chính).
- `-u` = ghi nhớ cặp "origin/main" này, để **từ lần sau chỉ cần gõ `git push`** là đủ.

Ví von: push giống như bạn photo các trang nhật ký mới viết rồi gửi vào tủ khoá trên mây.

### Kéo thay đổi về: `git pull`

Khi remote có commit mới (đồng nghiệp đẩy lên, hoặc bạn sửa trực tiếp trên web GitHub), kéo về máy:

```bash
git pull
```

Lệnh này tải các commit mới về **và** hoà trộn vào code hiện tại của bạn.

### Tóm tắt bộ ba lệnh

| Lệnh | Hướng đi | Khi nào dùng |
|---|---|---|
| `git clone <link>` | GitHub → máy (lần đầu) | Tải repo về máy lần đầu tiên |
| `git push` | Máy → GitHub | Sau khi commit, muốn lưu lên mây |
| `git pull` | GitHub → máy | Trước khi làm việc, để lấy bản mới nhất |

> 💡 Ghi nhớ: quy trình làm việc hằng ngày là **pull trước, làm việc, commit, rồi push**. Pull trước để chắc chắn bạn đang sửa trên bản mới nhất, tránh "giẫm chân" lên thay đổi của người khác.

> ⚠️ Lỗi người mới hay gặp: `git push` bị từ chối với thông báo `rejected... fetch first`. Nghĩa là trên GitHub có commit mà máy bạn chưa có. Cách xử lý: chạy `git pull` trước, giải quyết xung đột nếu có, rồi push lại. **Đừng** vội dùng `git push --force` (đẩy ép buộc) — lệnh này ghi đè lịch sử trên remote và có thể xoá mất công sức của người khác.

---

## 4. SSH key: đăng nhập không cần mật khẩu

### Vấn đề

Khi push qua đường link `https://...`, GitHub đòi xác thực danh tính. GitHub **không cho dùng mật khẩu thường** nữa (vì kém an toàn) — bạn phải dùng token hoặc cách hay hơn: **SSH key**.

### SSH key là gì?

**SSH** (Secure Shell — "vỏ bọc an toàn") là phương thức kết nối được mã hoá giữa hai máy tính. **SSH key** là một **cặp chìa khoá điện tử**:

- **Private key** (khoá riêng tư): nằm trên máy bạn, **tuyệt đối không đưa cho ai** — như chìa khoá nhà.
- **Public key** (khoá công khai): bạn đưa cho GitHub — như ổ khoá. Ai có chìa (private key) khớp ổ khoá (public key) thì mở được.

Sau khi thiết lập, mỗi lần push/pull, máy bạn tự "chìa chìa khoá" ra, GitHub tự nhận diện — không cần gõ gì cả.

### Các bước thiết lập

**Bước 1 — Tạo cặp khoá** (mở Terminal/Git Bash, thay email của bạn vào):

```bash
ssh-keygen -t ed25519 -C "email-cua-ban@gmail.com"
```

(`ed25519` là tên thuật toán mã hoá hiện đại.) Máy hỏi vài câu — cứ nhấn **Enter** để dùng mặc định. Kết quả: hai file trong thư mục `~/.ssh/`:

- `id_ed25519` → private key (giữ kín)
- `id_ed25519.pub` → public key (`.pub` = public, được phép chia sẻ)

**Bước 2 — Xem và sao chép public key:**

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy toàn bộ dòng hiện ra (bắt đầu bằng `ssh-ed25519`).

**Bước 3 — Dán vào GitHub:**

1. Trên GitHub: bấm ảnh đại diện → **Settings** → **SSH and GPG keys** → **New SSH key**.
2. **Title**: đặt tên gợi nhớ, ví dụ "Laptop cá nhân".
3. **Key**: dán dòng vừa copy → **Add SSH key**.

**Bước 4 — Kiểm tra:**

```bash
ssh -T git@github.com
```

Nếu thấy `Hi ten-ban! You've successfully authenticated...` là thành công.

**Bước 5 — Dùng link SSH thay vì HTTPS.** Từ giờ, khi clone hãy chọn tab **SSH** trên GitHub, link có dạng:

```bash
git clone git@github.com:ten-ban/hello-git.git
```

> ⚠️ Lỗi người mới hay gặp: copy nhầm **private key** (file không có `.pub`) dán lên GitHub, hoặc tệ hơn — đăng private key lên mạng. Nhớ quy tắc: **file có `.pub` mới được chia sẻ**. Lộ private key = người khác mạo danh được bạn.

> 💡 Ghi nhớ: SSH key gắn với **từng máy tính**. Có laptop mới thì tạo cặp khoá mới trên máy đó và thêm public key vào GitHub (một tài khoản chứa được nhiều key).

---

## 5. README & Markdown: bộ mặt của dự án

### README là gì?

Khi ai đó mở repo của bạn, GitHub tự động hiển thị nội dung file **README.md** ngay dưới danh sách file — như **tờ giới thiệu dán ngoài hộp sản phẩm**. README tốt trả lời:

- Dự án này làm gì?
- Cài đặt và chạy thế nào?
- Ảnh chụp màn hình / demo (nếu có)
- Công nghệ sử dụng

### Markdown là gì?

Đuôi `.md` là **Markdown** — ngôn ngữ định dạng văn bản siêu đơn giản: bạn gõ vài ký hiệu, GitHub hiển thị thành văn bản đẹp. Bảng "phiên dịch" nhanh:

| Bạn gõ | Hiển thị thành |
|---|---|
| `# Tiêu đề` | Tiêu đề chữ to nhất |
| `## Mục nhỏ` | Tiêu đề cấp 2 |
| `**đậm**` | **đậm** |
| `*nghiêng*` | *nghiêng* |
| `- mục` | • danh sách gạch đầu dòng |
| `1. mục` | danh sách đánh số |
| `[chữ](link)` | liên kết bấm được |
| `![mô tả](link-ảnh)` | hiển thị hình ảnh |
| `` `code` `` | đoạn code ngắn trong dòng |
| ` ```bash ... ``` ` | khối code nhiều dòng có tô màu |

### Mẫu README đơn giản

```markdown
# Hello Git

Ứng dụng đầu tay của tôi khi học Git & GitHub.

## Cài đặt

1. Clone repo: `git clone git@github.com:ten-ban/hello-git.git`
2. Mở file `index.html` bằng trình duyệt.

## Công nghệ

- HTML, CSS
- Git & GitHub
```

> 💡 Ghi nhớ: repo không có README giống cửa hàng không có biển hiệu. Nhà tuyển dụng mở repo của bạn, thứ đầu tiên họ đọc là README — hãy đầu tư cho nó.

---

## 6. Fork là gì?

**Fork** (nghĩa đen: "cái nĩa", ý chỉ sự rẽ nhánh) là **sao chép repo của người khác về tài khoản GitHub của bạn**.

Ví von: bạn thấy một công thức nấu ăn hay trên mạng nhưng không có quyền sửa bài gốc. Bạn **chép công thức vào sổ của mình** — giờ bạn muốn nêm nếm, biến tấu thế nào tuỳ ý, bản gốc không bị ảnh hưởng.

### Fork khác clone thế nào?

| | Fork | Clone |
|---|---|---|
| Sao chép từ đâu đến đâu | Repo người khác → **tài khoản GitHub của bạn** (vẫn trên mây) | Repo trên GitHub → **máy tính của bạn** |
| Thao tác ở đâu | Bấm nút **Fork** trên trang web GitHub | Gõ lệnh `git clone` trong Terminal |
| Dùng khi nào | Muốn sửa/đóng góp vào dự án không phải của mình | Muốn tải code về máy để làm việc |

### Quy trình đóng góp mã nguồn mở (open source)

Đây là cách hàng triệu người cùng đóng góp vào các dự án lớn:

1. **Fork** repo gốc về tài khoản của bạn.
2. **Clone** bản fork đó về máy.
3. Sửa code, commit, **push** lên bản fork của bạn.
4. Gửi **Pull Request** (yêu cầu kéo — viết tắt **PR**): lời đề nghị "tôi đã sửa thế này, mời chủ dự án xem xét và gộp vào bản gốc".
5. Chủ dự án xem, góp ý, và nếu ưng thì **merge** (gộp) vào.

> 💡 Ghi nhớ: Fork = photo tài liệu của người khác về tủ của mình trên mây. Pull Request = gửi bản sửa kèm lời nhắn "mời anh/chị xem và dùng nếu thấy hay".

---

## 7. GitHub làm portfolio xin việc

Với lập trình viên, **GitHub chính là CV sống**. Nhà tuyển dụng kỹ thuật thường mở GitHub của ứng viên trước cả khi đọc CV giấy. Vì sao? CV nói "tôi biết làm web", còn GitHub **chứng minh** điều đó bằng code thật.

### Những thứ nhà tuyển dụng nhìn vào

1. **Repo dự án cá nhân** — vài dự án hoàn chỉnh, dù nhỏ, vẫn giá trị hơn nhiều dự án bỏ dở.
2. **README của từng repo** — viết rõ ràng chứng tỏ bạn biết giao tiếp, kỹ năng quý không kém viết code.
3. **Contribution graph** (biểu đồ ô vuông xanh trên trang cá nhân) — mỗi ngày có commit là một ô xanh. Ô xanh đều đặn cho thấy bạn học/làm bền bỉ. Đừng ám ảnh việc xanh kín bảng, nhưng nhịp độ đều là điểm cộng.
4. **Lịch sử commit** — commit message rõ ràng ("Thêm chức năng đăng nhập") tạo ấn tượng chuyên nghiệp hơn hẳn "update", "fix", "asdf".

### Việc nên làm ngay

- **Hoàn thiện trang cá nhân**: ảnh đại diện nghiêm túc, tên thật, mô tả ngắn (bio), link liên hệ.
- **Tạo profile README**: tạo repo **trùng tên username** của bạn (ví dụ username là `an-nguyen` thì tạo repo `an-nguyen`), file README.md trong đó sẽ hiển thị ngay đầu trang cá nhân — như lời chào tự giới thiệu.
- **Ghim dự án tốt nhất**: dùng tính năng **Pin** để ghim tối đa 6 repo tâm đắc lên đầu trang.
- **Để Public các dự án học tập** — đừng ngại code chưa hoàn hảo; ai cũng từng bắt đầu, và quá trình tiến bộ qua lịch sử commit cũng là một câu chuyện đẹp.

> ⚠️ Lỗi người mới hay gặp: lỡ push **mật khẩu, API key (chìa khoá truy cập dịch vụ), thông tin nhạy cảm** lên repo public. Một khi đã push, thông tin nằm trong lịch sử Git vĩnh viễn dù bạn xoá file sau đó. Nếu lỡ dính: đổi mật khẩu/khoá đó **ngay lập tức**. Phòng tránh: dùng file `.gitignore` để Git bỏ qua các file chứa bí mật (như `.env`).

---

## Tổng kết

| Khái niệm | Một câu tóm gọn |
|---|---|
| GitHub | Dịch vụ lưu trữ kho Git trên mây và cộng tác |
| Remote / `origin` | Kho từ xa / biệt danh mặc định của nó |
| `git clone` | Tải repo từ GitHub về máy lần đầu |
| `git push` | Đẩy commit từ máy lên GitHub |
| `git pull` | Kéo commit mới từ GitHub về máy |
| SSH key | Cặp chìa khoá điện tử để xác thực không cần mật khẩu |
| README.md | Tờ giới thiệu dự án, viết bằng Markdown |
| Fork | Sao chép repo người khác về tài khoản mình |
| Pull Request | Đề nghị gộp thay đổi của mình vào repo gốc |

### Bài tập thực hành

1. Tạo tài khoản GitHub với username nghiêm túc.
2. Thiết lập SSH key và kiểm tra bằng `ssh -T git@github.com`.
3. Tạo repo `hello-git`, kết nối với kho local và push code đầu tiên.
4. Viết README.md có tiêu đề, mô tả, danh sách, và một khối code.
5. Tạo repo trùng tên username để làm profile README tự giới thiệu bản thân.
6. Tìm một repo bất kỳ bạn thích, thử bấm Fork rồi clone bản fork về máy.

Bài tiếp theo, chúng ta sẽ học về **branch** (nhánh) — cách làm nhiều việc song song mà không sợ làm hỏng code chính.
