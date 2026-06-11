# Làm việc nhóm: Pull Request & code review

## Mở đầu: tại sao không ai "sửa thẳng" vào code chung?

Hãy tưởng tượng cả nhóm bạn đang cùng viết một cuốn sách. Nếu ai cũng cầm bút sửa thẳng vào bản gốc duy nhất, chuyện gì xảy ra? Người này xoá đoạn người kia vừa viết, lỗi chính tả lọt vào mà không ai kiểm tra, và khi sách in ra sai thì không biết ai sửa chỗ nào.

Trong lập trình cũng vậy. Code chung của cả nhóm (thường nằm ở branch — nhánh — tên là `main`) được coi như **bản gốc thiêng liêng**: luôn phải chạy được, luôn sạch sẽ. Không ai được sửa thẳng vào đó.

Thay vào đó, các công ty dùng một quy trình chuẩn gần như ở mọi nơi:

```
branch → push → Pull Request → review → merge
```

Bài này sẽ đi qua từng bước của quy trình đó, đúng như cách bạn sẽ làm trong ngày đầu đi làm.

> 💡 Ghi nhớ: **Pull Request (PR)** — tạm dịch "yêu cầu kéo code" — là lời đề nghị: *"Tôi đã làm xong phần này trên nhánh riêng, mời mọi người xem xét, nếu ổn thì gộp vào bản chung."* Trên GitLab nó được gọi là **Merge Request (MR)** — cùng một khái niệm.

---

## Bức tranh toàn cảnh: 5 bước của quy trình

| Bước | Tên | Ví đời thường |
|------|-----|----------------|
| 1 | **Branch** (tạo nhánh) | Photo một bản nháp riêng để viết, không đụng bản gốc |
| 2 | **Push** (đẩy lên) | Nộp bản nháp lên "tủ hồ sơ chung" (GitHub) |
| 3 | **Pull Request** | Dán giấy: "Mời mọi người đọc bản nháp của tôi" |
| 4 | **Review** (xem xét) | Đồng nghiệp đọc, góp ý, yêu cầu sửa |
| 5 | **Merge** (gộp) | Bản nháp được duyệt, chính thức nhập vào bản gốc |

Giờ đi vào chi tiết từng bước.

---

## Bước 1 — Tạo branch: làm việc trên "bản nháp riêng"

**Branch** (nhánh) là một bản sao logic của code mà bạn có thể sửa thoải mái, không ảnh hưởng bản chung. Bạn đã học khái niệm này ở bài trước — ở đây ta dùng nó trong ngữ cảnh làm việc nhóm.

Quy tắc ở công ty thường là: **mỗi việc một nhánh**. Sửa nút đăng nhập? Một nhánh. Thêm trang giới thiệu? Một nhánh khác.

```bash
# Đứng ở nhánh main, lấy code mới nhất về trước
git switch main
git pull

# Tạo nhánh mới cho việc của mình
git switch -c fix/nut-dang-nhap-bi-le
```

### Đặt tên nhánh sao cho dễ hiểu

Nhiều team có quy ước tên nhánh, ví dụ:

| Tiền tố | Dùng khi | Ví dụ |
|---------|----------|-------|
| `feature/` | Thêm tính năng mới | `feature/trang-thanh-toan` |
| `fix/` | Sửa lỗi | `fix/sai-gia-gio-hang` |
| `docs/` | Sửa tài liệu | `docs/cap-nhat-readme` |

> ⚠️ Lỗi người mới hay gặp: quên `git pull` trên `main` trước khi tạo nhánh mới. Kết quả là bạn làm việc trên nền code cũ cả tuần trước, sau này dễ bị **conflict** (xung đột — sẽ nói ở phần dưới).

---

## Bước 2 — Push: đẩy nhánh lên GitHub

Bạn sửa code, **commit** (lưu một "mốc thay đổi") như bình thường. Khi muốn chia sẻ, đẩy nhánh lên GitHub:

```bash
git push -u origin fix/nut-dang-nhap-bi-le
```

- `origin` là tên gọi tắt của kho code trên GitHub (kho từ xa — **remote**).
- `-u` chỉ cần dùng lần đầu cho mỗi nhánh; nó "ghi nhớ" liên kết, các lần sau chỉ cần gõ `git push`.

Lúc này nhánh của bạn đã nằm trên GitHub, nhưng **chưa ai bắt buộc phải xem nó** — nó chỉ là bản nháp được lưu lên tủ chung. Muốn mọi người xem xét, bạn cần bước 3.

---

## Bước 3 — Mở Pull Request

Sau khi push, vào trang kho code trên GitHub, bạn sẽ thấy nút màu xanh **"Compare & pull request"**. Bấm vào, GitHub hỏi bạn hai thứ:

1. **Base branch** (nhánh đích): nơi code sẽ được gộp vào — thường là `main`.
2. **Compare branch** (nhánh nguồn): nhánh bạn vừa làm.

Rồi bạn điền **tiêu đề** và **mô tả**. Đây là phần nhiều người làm ẩu nhất — nhưng lại quan trọng nhất.

### Viết mô tả PR tốt: như viết "tờ trình" cho sếp

Người review không ngồi trong đầu bạn. Họ mở PR ra và tự hỏi: *cái này làm gì, tại sao, tôi cần kiểm tra gì?* Mô tả tốt trả lời sẵn ba câu đó.

Một khung mô tả phổ biến:

```markdown
## Vấn đề (Why)
Nút "Đăng nhập" trên điện thoại bị lệch ra ngoài màn hình,
người dùng không bấm được. (Liên quan ticket #123)

## Giải pháp (What)
- Sửa lại cách canh lề của nút trong file login.css
- Thêm kiểm tra hiển thị trên màn hình nhỏ

## Cách kiểm tra (How to test)
1. Mở trang đăng nhập trên điện thoại (hoặc thu nhỏ trình duyệt)
2. Thấy nút nằm gọn giữa màn hình, bấm được bình thường

## Ảnh chụp màn hình
Trước: [ảnh] — Sau: [ảnh]
```

So sánh hai tiêu đề PR:

| ❌ Tệ | ✅ Tốt |
|-------|--------|
| `update code` | `Sửa nút đăng nhập bị lệch trên màn hình điện thoại` |
| `fix bug` | `Fix: giỏ hàng tính sai tổng tiền khi có mã giảm giá` |

> 💡 Ghi nhớ: PR nên **nhỏ**. Một PR 200 dòng được review kỹ trong 15 phút; một PR 2000 dòng thường chỉ được liếc qua rồi bấm duyệt đại — và đó là lúc lỗi lọt lưới. Nếu việc lớn, hãy chia thành nhiều PR nhỏ nối tiếp nhau.

---

## Bước 4 — Code review: nhận và cho feedback

**Code review** là việc đồng nghiệp đọc thay đổi của bạn trước khi nó vào bản chung. Mục đích không phải "bắt lỗi nhau" mà là:

- Phát hiện lỗi sớm (sửa lúc này rẻ hơn nhiều so với khi đã chạy thật).
- Lan toả kiến thức: ít nhất 2 người hiểu đoạn code này.
- Giữ phong cách code thống nhất trong nhóm.

Trên GitHub, người review có thể bình luận vào **từng dòng code cụ thể**, rồi chốt một trong ba trạng thái:

| Trạng thái | Ý nghĩa |
|------------|---------|
| **Approve** | Đồng ý, có thể merge |
| **Request changes** | Cần sửa rồi mới duyệt |
| **Comment** | Góp ý chung, không chặn |

### Khi bạn là người NHẬN feedback

- **Đừng coi đó là công kích cá nhân.** Người ta review *code*, không review *bạn*. Ai cũng từng viết code dở.
- **Trả lời mọi bình luận**: hoặc sửa theo, hoặc giải thích lý do bạn làm khác. Đừng im lặng.
- Sau khi sửa, push commit mới lên **cùng nhánh đó** — PR tự động cập nhật, không cần mở PR mới.
- Không hiểu góp ý thì hỏi lại. Hỏi không phải là dốt; đoán mò mới nguy hiểm.

### Khi bạn là người CHO feedback

- **Góp ý vào code, không vào con người.** ❌ "Bạn viết sai rồi" → ✅ "Đoạn này có vẻ chưa xử lý trường hợp danh sách rỗng, mình nghĩ sẽ lỗi khi..."
- **Đặt câu hỏi thay vì ra lệnh**: "Mình thắc mắc tại sao chọn cách này? Nếu dùng X thì có gọn hơn không?"
- **Khen điều tốt**: thấy đoạn code hay thì nói ra. Review không chỉ để chê.
- **Phân biệt mức độ**: lỗi nghiêm trọng phải chặn (Request changes), còn ý kiến nhỏ kiểu "tên biến này mình sẽ đặt khác" thì ghi rõ là `nit:` (nitpick — góp ý vụn vặt, sửa hay không tuỳ tác giả).

> ⚠️ Lỗi người mới hay gặp: tự ái khi bị "Request changes" và tranh cãi gay gắt trong phần bình luận. Hãy nhớ: PR bị yêu cầu sửa là chuyện **hằng ngày** của cả lập trình viên 10 năm kinh nghiệm. Mục tiêu chung là code tốt hơn, không phải ai thắng ai.

---

## Khi PR bị conflict: xử lý xung đột

Đôi khi GitHub báo đỏ: **"This branch has conflicts that must be resolved"** (nhánh này có xung đột cần giải quyết).

### Conflict là gì, nói kiểu đời thường?

Bạn photo bản gốc ra để sửa trang 5. Trong lúc bạn sửa, một đồng nghiệp khác đã sửa **chính trang 5 đó** và nộp vào bản gốc trước bạn. Giờ Git không biết nên giữ câu chữ của ai — nó bắt **con người quyết định**.

### Cách giải quyết

Cách phổ biến: kéo `main` mới nhất về trộn vào nhánh của mình, sửa xung đột trên máy, rồi push lại.

```bash
# Đang đứng ở nhánh của mình
git switch fix/nut-dang-nhap-bi-le

# Lấy main mới nhất và trộn vào nhánh hiện tại
git pull origin main
```

Git sẽ dừng lại và đánh dấu chỗ xung đột trong file bằng các ký hiệu lạ:

```text
<<<<<<< HEAD
màu nút: xanh dương        ← phiên bản của BẠN
=======
màu nút: xanh lá           ← phiên bản trên MAIN (của người kia)
>>>>>>> main
```

Việc của bạn:

1. Mở file, đọc cả hai phiên bản.
2. **Quyết định giữ cái nào** (hoặc viết lại một phiên bản kết hợp cả hai). Nếu không chắc, hỏi người viết phiên bản kia — đây là quyết định nội dung, không phải kỹ thuật.
3. Xoá sạch các dòng `<<<<<<<`, `=======`, `>>>>>>>`.
4. Lưu file, rồi:

```bash
git add .
git commit          # hoàn tất việc trộn
git push
```

PR trên GitHub sẽ tự chuyển sang màu xanh, sẵn sàng merge.

> ⚠️ Lỗi người mới hay gặp: thấy ký hiệu `<<<<<<<` thì hoảng và xoá đại một bên mà không đọc kỹ — vô tình **xoá mất công sức của đồng nghiệp**. Luôn đọc cả hai phiên bản, và khi nghi ngờ, hỏi.

> 💡 Ghi nhớ: cách phòng conflict tốt nhất là **PR nhỏ + merge sớm + thường xuyên kéo `main` mới về nhánh của mình**. Nhánh sống càng lâu, xung đột càng nhiều.

---

## Bước 5 — Merge: gộp vào bản chung

Khi PR đã được approve và hết conflict, bạn (hoặc người có quyền) bấm nút **Merge**. GitHub đưa ra vài lựa chọn — nghe rối nhưng ý tưởng rất đơn giản.

### Squash vs merge commit — hiểu ở mức ý tưởng

Giả sử nhánh của bạn có 5 commit lặt vặt: "làm dở", "sửa typo", "sửa tiếp", "xong rồi", "à quên 1 chỗ".

| Cách merge | Chuyện gì xảy ra | Ví như |
|------------|------------------|--------|
| **Merge commit** (gộp nguyên) | Cả 5 commit được giữ nguyên trong lịch sử của `main`, kèm 1 commit "gộp" đánh dấu | Đóng cả xấp giấy nháp vào hồ sơ, kèm tờ bìa "đã duyệt" |
| **Squash and merge** (ép thành một) | 5 commit được **nén thành 1 commit duy nhất** rồi mới vào `main` | Chép lại bản sạch cuối cùng vào hồ sơ, vứt giấy nháp |

**Ưu nhược ngắn gọn:**

- **Squash**: lịch sử `main` cực gọn — mỗi PR đúng 1 commit, đọc như mục lục sách. Đổi lại, mất chi tiết từng bước nhỏ. Rất nhiều công ty chọn cách này làm mặc định.
- **Merge commit**: giữ đầy đủ lịch sử từng bước, nhưng `main` dễ thành "rừng" commit vụn khó đọc.

> 💡 Ghi nhớ: bạn **không cần tự quyết** chuyện này khi mới vào công ty — mỗi team đã có quy ước sẵn. Việc của bạn là biết hai khái niệm để không bỡ ngỡ khi thấy nút "Squash and merge".

Sau khi merge, GitHub thường gợi ý **xoá nhánh** (Delete branch). Cứ xoá — nhánh đã hoàn thành sứ mệnh, code của nó đã nằm trong `main`. Lần sau làm việc mới thì tạo nhánh mới từ `main`.

---

## Commit message tốt: viết cho "bạn của 6 tháng sau"

Mỗi commit có một dòng thông điệp (**commit message**). Sáu tháng sau, khi truy tìm "ai đổi cái này, tại sao", lịch sử commit là manh mối duy nhất. Vì vậy message phải có nghĩa.

### Quy tắc thực dụng

1. **Dòng đầu ngắn gọn (~50-72 ký tự)**, tóm tắt thay đổi.
2. **Mô tả việc đã làm**, không mô tả cảm xúc: ❌ `sửa lung tung`, ❌ `cuối cùng cũng chạy!!!` 
3. Nhiều team viết theo kiểu **mệnh lệnh** (quy ước chung của Git): "Thêm...", "Sửa...", "Xoá..." — như đang ra lệnh cho code phải trở thành gì.
4. Cần giải thích *tại sao*? Bỏ qua một dòng trống rồi viết đoạn chi tiết phía dưới.

```text
Sửa giỏ hàng tính sai tổng khi áp mã giảm giá

Trước đây mã giảm giá được trừ trước thuế, dẫn đến tổng
tiền thấp hơn thực tế. Đổi thứ tự: tính thuế trước, trừ
mã giảm giá sau, theo yêu cầu của bộ phận kế toán.
```

### So sánh nhanh

| ❌ Tệ | ✅ Tốt |
|-------|--------|
| `update` | `Thêm trang Câu hỏi thường gặp` |
| `fix` | `Sửa lỗi không gửi được email có dấu tiếng Việt` |
| `asdfgh` | `Xoá đoạn code thanh toán cũ không còn dùng` |

Nhiều công ty còn dùng quy ước **Conventional Commits**: thêm tiền tố loại thay đổi, ví dụ `feat: thêm đăng nhập bằng Google`, `fix: sửa lỗi tràn bộ nhớ`, `docs: cập nhật hướng dẫn cài đặt`. Gặp thì bạn hiểu ngay: `feat` = tính năng, `fix` = sửa lỗi, `docs` = tài liệu.

> ⚠️ Lỗi người mới hay gặp: commit message kiểu `wip`, `test`, `aaa` rồi nghĩ "tí nữa sửa sau" — nhưng không bao giờ sửa. Nếu team dùng **squash merge** thì các message nháp này sẽ bị nén mất nên đỡ hại; nhưng đừng ỷ lại — tập thói quen viết tử tế ngay từ đầu.

---

## Tóm tắt toàn bộ quy trình bằng một phiên làm việc mẫu

```bash
# 1. Cập nhật main và tạo nhánh
git switch main
git pull
git switch -c feature/trang-lien-he

# 2. Làm việc, commit (có thể nhiều lần)
git add .
git commit -m "Thêm trang Liên hệ với form gửi tin nhắn"

# 3. Đẩy lên GitHub
git push -u origin feature/trang-lien-he

# 4. Lên GitHub: bấm "Compare & pull request",
#    viết tiêu đề + mô tả (Why / What / How to test)

# 5. Đồng nghiệp review → bạn sửa theo góp ý → push tiếp
git add .
git commit -m "Sửa theo review: kiểm tra email hợp lệ trước khi gửi"
git push

# 6. Được approve → bấm Merge (theo quy ước team:
#    squash hoặc merge commit) → xoá nhánh

# 7. Quay về main, kéo bản mới nhất, sẵn sàng việc tiếp theo
git switch main
git pull
```

## Bảng thuật ngữ của bài

| Thuật ngữ | Nghĩa |
|-----------|-------|
| Pull Request (PR) | Đề nghị gộp thay đổi từ nhánh của bạn vào nhánh chung, kèm nơi thảo luận |
| Code review | Đồng nghiệp đọc và góp ý thay đổi trước khi gộp |
| Approve / Request changes | Duyệt / Yêu cầu sửa trong review |
| Conflict | Xung đột: hai người sửa cùng một chỗ, Git cần người quyết định |
| Merge commit | Gộp giữ nguyên toàn bộ commit của nhánh |
| Squash and merge | Nén mọi commit của nhánh thành 1 commit duy nhất rồi gộp |
| Commit message | Dòng thông điệp mô tả mỗi lần lưu thay đổi |
| nit | Góp ý vụn vặt trong review, không bắt buộc sửa |

> 💡 Ghi nhớ cuối bài: quy trình **branch → push → PR → review → merge** là "nghi thức giao tiếp" chuẩn của ngành. Thành thạo nó — kèm kỹ năng viết mô tả rõ ràng và nhận góp ý điềm tĩnh — thường gây ấn tượng với đồng nghiệp mới nhiều hơn cả việc code giỏi.
