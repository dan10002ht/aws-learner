# Vì sao cần Git: quản lý phiên bản

## Câu chuyện quen thuộc: "bao_cao_final_v2_THAT.docx"

Hãy bắt đầu bằng một tình huống mà gần như ai cũng từng gặp.

Bạn làm một bản báo cáo. Sửa đi sửa lại nhiều lần, và thư mục của bạn dần trông thế này:

```
bao_cao.docx
bao_cao_v2.docx
bao_cao_final.docx
bao_cao_final_SUA.docx
bao_cao_final_v2.docx
bao_cao_final_v2_THAT.docx
bao_cao_final_v2_THAT_nop_lan_cuoi.docx
```

Và hàng loạt câu hỏi đau đầu xuất hiện:

- File nào mới nhất? `final_v2_THAT` hay `final_v2_THAT_nop_lan_cuoi`?
- Hôm qua mình đã sửa gì so với hôm kia? Không ai nhớ nổi.
- Muốn quay lại bản tuần trước thì mở file nào?
- Nếu hai người cùng sửa một file rồi gửi qua lại bằng email/Zalo thì gộp kiểu gì?

Cách đặt tên file thủ công như trên chính là một dạng **quản lý phiên bản** (version control) — nhưng là dạng thô sơ, dễ nhầm lẫn và không mở rộng được. Khi làm phần mềm, nơi một dự án có hàng trăm file và nhiều người cùng sửa mỗi ngày, cách này sụp đổ hoàn toàn.

**Git** ra đời để giải quyết đúng vấn đề này.

> 💡 Ghi nhớ: Git là một **hệ thống quản lý phiên bản** (Version Control System — VCS): phần mềm giúp ghi lại *toàn bộ lịch sử thay đổi* của các file, để bạn xem lại, quay lui, so sánh và cộng tác mà không cần tạo hàng tá file `_final_v2`.

## Git nghĩ khác: chụp ảnh thay vì nhân bản file

### Analogy: cuốn album ảnh của dự án

Tưởng tượng dự án của bạn là một căn phòng. Mỗi lần bạn sắp xếp lại đồ đạc xong (sửa file xong), bạn **chụp một tấm ảnh toàn cảnh căn phòng** và dán vào album, kèm ghi chú: *"Ngày 11/06 — chuyển bàn ra gần cửa sổ"*.

- Muốn biết căn phòng từng trông thế nào tuần trước? Lật album.
- Muốn khôi phục lại y nguyên trạng thái cũ? Nhìn ảnh và sắp xếp lại theo ảnh — Git làm việc này tự động cho bạn.

Mỗi "tấm ảnh" như vậy trong Git gọi là một **snapshot** (ảnh chụp nhanh trạng thái toàn bộ dự án tại một thời điểm). Hành động chụp và dán vào album gọi là **commit** (cam kết lưu một phiên bản). Cuốn album chính là **lịch sử** (history) của dự án.

### So sánh với cách đặt tên file thủ công

| | Đặt tên file thủ công | Git |
|---|---|---|
| Bản mới nhất | Đoán theo tên file | Luôn rõ ràng, là commit gần nhất |
| Xem ai sửa gì, khi nào | Không biết | Mỗi commit lưu tác giả, thời gian, ghi chú |
| Quay lại bản cũ | Mở từng file mò | Một lệnh là xong |
| So sánh hai phiên bản | Mở 2 file dò bằng mắt | Git chỉ ra từng dòng khác nhau |
| Nhiều người cùng sửa | Gửi file qua lại, dễ ghi đè | Git hỗ trợ gộp thay đổi có kiểm soát |
| Dung lượng | Mỗi bản copy chiếm chỗ | Git lưu rất tiết kiệm |

> 💡 Ghi nhớ: Git không lưu "file_v1, file_v2..." rải rác. Git lưu một chuỗi **snapshot** nối tiếp nhau — như các trang trong album ảnh — và bạn có thể nhảy về bất kỳ trang nào.

## Repo là gì?

**Repository** (kho chứa, gọi tắt là **repo**) là *thư mục dự án của bạn + toàn bộ cuốn album lịch sử* mà Git quản lý.

Cụ thể, khi bạn bảo Git "hãy quản lý thư mục này", Git tạo ra một thư mục ẩn tên `.git` nằm bên trong thư mục dự án. Mọi snapshot, mọi ghi chú lịch sử đều nằm gọn trong `.git`. 

- Thư mục dự án của bạn (các file bạn nhìn thấy, đang sửa) gọi là **working directory** (thư mục làm việc).
- Thư mục ẩn `.git` là "kho lưu trữ album".

> ⚠️ Lỗi người mới hay gặp: tò mò xoá hoặc sửa tay thư mục `.git`. Xoá `.git` = đốt cả cuốn album, toàn bộ lịch sử mất sạch (file hiện tại vẫn còn, nhưng quá khứ thì không). Đừng đụng vào nó — hãy để Git tự quản lý.

Lưu ý: **Git** và **GitHub** là hai thứ khác nhau. Git là phần mềm chạy trên máy bạn. GitHub là một trang web để *lưu trữ và chia sẻ* repo Git lên Internet (sẽ học ở bài sau). Quan hệ giống như: ảnh trong điện thoại (Git) và Google Photos để đồng bộ lên mây (GitHub).

## Cài đặt Git

### Windows

1. Vào trang https://git-scm.com/downloads
2. Tải bản cho Windows, chạy file cài đặt, bấm Next với các lựa chọn mặc định.
3. Sau khi cài xong, bạn có thêm ứng dụng **Git Bash** — một cửa sổ dòng lệnh (nơi gõ lệnh bằng bàn phím thay vì bấm chuột) để dùng Git.

### macOS

Mở ứng dụng **Terminal** (cửa sổ dòng lệnh có sẵn của Mac) và gõ:

```
git --version
```

Nếu chưa có Git, máy sẽ tự đề nghị cài. Hoặc cài qua Homebrew: `brew install git`.

### Linux (Ubuntu/Debian)

```
sudo apt update
sudo apt install git
```

### Kiểm tra cài thành công

Gõ lệnh sau ở cửa sổ dòng lệnh:

```
git --version
```

Nếu thấy hiện ra dạng `git version 2.45.0` (số có thể khác) là thành công.

## Cấu hình lần đầu: khai báo "bạn là ai"

Mỗi tấm ảnh trong album cần ghi rõ *ai* là người chụp. Vì vậy, trước khi dùng Git lần đầu, bạn khai báo tên và email (chỉ cần làm **một lần duy nhất** trên mỗi máy):

```
git config --global user.name "Nguyen Van A"
git config --global user.email "nguyenvana@example.com"
```

Giải thích:

- `git config` — lệnh chỉnh cài đặt của Git.
- `--global` — áp dụng cho *mọi* dự án trên máy này (không cần khai lại từng dự án).
- `user.name` / `user.email` — tên và email sẽ được gắn vào mỗi commit của bạn.

Kiểm tra lại:

```
git config --list
```

> ⚠️ Lỗi người mới hay gặp: gõ thiếu dấu nháy quanh tên có khoảng trắng. `git config --global user.name Nguyen Van A` sẽ sai; phải là `"Nguyen Van A"` trong dấu nháy.

## git init: biến một thư mục thường thành repo

Giả sử bạn có thư mục dự án tên `du-an-dau-tien`. Mở dòng lệnh, di chuyển vào thư mục đó rồi gõ:

```
git init
```

Git trả lời đại loại: `Initialized empty Git repository in .../du-an-dau-tien/.git/`

Vậy là xong — Git đã tạo thư mục ẩn `.git` và bắt đầu "trực sẵn" để ghi lịch sử. Lưu ý: `git init` mới chỉ *mở cuốn album trắng*. Chưa có tấm ảnh nào được chụp cả; bạn phải tự commit.

> 💡 Ghi nhớ: `git init` chỉ chạy **một lần duy nhất** cho mỗi dự án, ở **thư mục gốc** của dự án. Không cần (và không nên) chạy lại nhiều lần hay chạy trong từng thư mục con.

## Quy trình cốt lõi: status → add → commit

Đây là vòng lặp bạn sẽ làm hàng chục lần mỗi ngày khi dùng Git. Để hiểu nó, hãy dùng analogy **đi siêu thị**.

### Analogy giỏ hàng

Trong Git, một file thay đổi phải đi qua 3 "khu vực":

| Khu vực Git | Trong siêu thị | Ý nghĩa |
|---|---|---|
| Working directory (thư mục làm việc) | **Kệ hàng** | Nơi bạn sửa file thoải mái, Git mới chỉ "nhìn thấy" chứ chưa lưu |
| Staging area (vùng chờ, còn gọi là *index*) | **Giỏ hàng** | Nơi bạn *chọn lựa* những thay đổi muốn lưu trong lần này |
| Repository (kho lịch sử) | **Đã thanh toán, có hoá đơn** | Thay đổi được chốt vĩnh viễn thành một commit |

Tại sao cần "giỏ hàng" trung gian? Vì không phải lúc nào bạn cũng muốn lưu *tất cả* những gì vừa sửa. Giống như đi siêu thị: bạn cầm lên 5 món, nhưng chỉ bỏ 3 món vào giỏ để thanh toán đợt này. **Staging area** (vùng chờ trước khi commit) cho bạn quyền chọn lọc: "lần commit này tôi chỉ lưu thay đổi của file A và B, file C để lần sau".

### Bước 1 — `git status`: nhìn quanh xem tình hình

```
git status
```

Lệnh này **không thay đổi gì cả**, chỉ báo cáo: file nào mới sửa, file nào đã bỏ vào giỏ (staged), file nào Git chưa từng biết (untracked — chưa được theo dõi). Hãy tập thói quen gõ `git status` trước và sau mỗi thao tác — nó là "tấm bản đồ bạn đang ở đâu".

Ví dụ bạn vừa tạo file `ghichu.txt`, `git status` sẽ hiện:

```
Untracked files:
  ghichu.txt
```

Nghĩa là: "Tôi thấy file này trên kệ, nhưng bạn chưa bao giờ bảo tôi theo dõi nó."

### Bước 2 — `git add`: bỏ vào giỏ hàng

```
git add ghichu.txt
```

Lệnh này đưa thay đổi của `ghichu.txt` vào **staging area** (giỏ hàng). Muốn bỏ tất cả thay đổi trong thư mục hiện tại vào giỏ một lượt:

```
git add .
```

(dấu chấm `.` nghĩa là "mọi thứ ở thư mục hiện tại trở xuống").

Gõ lại `git status`, bạn sẽ thấy file chuyển sang mục:

```
Changes to be committed:
  new file: ghichu.txt
```

— tức là "đã nằm trong giỏ, sẵn sàng thanh toán".

> ⚠️ Lỗi người mới hay gặp: sửa file *sau khi* đã `git add`. Giỏ hàng chỉ chứa **phiên bản tại thời điểm bạn add**. Nếu sửa tiếp, phần sửa mới vẫn nằm trên kệ — phải `git add` lại lần nữa thì commit mới gồm bản mới nhất.

### Bước 3 — `git commit`: thanh toán, in hoá đơn

```
git commit -m "Them file ghi chu dau tien"
```

- `commit` — chụp snapshot mọi thứ đang nằm trong giỏ và dán vào album lịch sử, vĩnh viễn.
- `-m "..."` — kèm **commit message** (lời nhắn mô tả thay đổi). Bắt buộc phải có lời nhắn; `-m` cho phép viết ngay trên dòng lệnh.

Mỗi commit giống một **hoá đơn**: ghi rõ mua gì (thay đổi nào), ai mua (user.name/email bạn đã config), lúc nào, kèm một mã số định danh duy nhất (chuỗi ký tự dài như `a3f9c12...`, gọi là *hash*).

> 💡 Ghi nhớ: vòng lặp muôn thuở của Git là — **sửa file → `git status` xem tình hình → `git add` chọn vào giỏ → `git commit -m` chốt đơn**. Lặp lại mỗi khi hoàn thành một thay đổi có ý nghĩa.

### Viết commit message thế nào cho tốt?

So sánh hai album ảnh: một cuốn ghi chú "ảnh 1", "ảnh 2"… và một cuốn ghi "Sinh nhật mẹ 2025", "Chuyến đi Đà Lạt". Cuốn nào dễ tra cứu hơn?

- Tệ: `git commit -m "sua bug"`, `git commit -m "update"`, `git commit -m "abc"`
- Tốt: `git commit -m "Sua loi hien sai ngay tren trang chu"`, `git commit -m "Them trang lien he"`

Quy tắc đơn giản: message trả lời câu hỏi *"commit này làm gì?"* — ngắn gọn, cụ thể, người khác (và chính bạn 3 tháng sau) đọc hiểu ngay.

## git log: lật xem cuốn album lịch sử

```
git log
```

Kết quả mỗi commit hiện như sau:

```
commit a3f9c12e8b... (mã định danh)
Author: Nguyen Van A <nguyenvana@example.com>
Date:   Wed Jun 11 10:30:00 2026

    Them file ghi chu dau tien
```

Mẹo hữu ích:

- Nếu lịch sử dài, màn hình sẽ "cuộn trang" — bấm phím mũi tên để xem tiếp, bấm **`q`** (quit) để thoát.
- Xem gọn mỗi commit một dòng:

```
git log --oneline
```

```
a3f9c12 Them file ghi chu dau tien
9b21d05 Khoi tao du an
```

Đây chính là câu trả lời cho vấn đề `bao_cao_final_v2_THAT.docx`: thay vì 7 file tên loạn xạ, bạn có **một** thư mục sạch sẽ và một dòng thời gian rõ ràng ai-làm-gì-khi-nào, có thể quay lại bất kỳ điểm nào.

## .gitignore: những thứ không nên cho vào album

Không phải file nào trong thư mục dự án cũng đáng lưu lịch sử. Ví dụ:

- File tạm, file cache do máy tự sinh ra (`.DS_Store` trên Mac, `Thumbs.db` trên Windows)
- Thư mục thư viện tải về tự động, rất nặng (như `node_modules/` trong dự án web)
- File chứa **mật khẩu, khoá bí mật** (`.env`) — tuyệt đối không được lưu vào lịch sử rồi đẩy lên mạng

Analogy: khi chụp ảnh căn phòng, bạn không muốn rác và đồ riêng tư lọt vào khung hình.

Cách làm: tạo một file tên chính xác là **`.gitignore`** (có dấu chấm ở đầu, không có đuôi mở rộng) ở thư mục gốc dự án, mỗi dòng ghi một thứ cần Git **lờ đi**:

```
# Dòng bắt đầu bằng dấu # là ghi chú
.DS_Store
Thumbs.db

# Bỏ qua cả thư mục (dấu / ở cuối)
node_modules/

# File chứa thông tin bí mật
.env

# Bỏ qua mọi file có đuôi .log
*.log
```

Giải thích ký hiệu:

- `ten_file` — bỏ qua file có tên đó.
- `ten_thu_muc/` — bỏ qua nguyên thư mục.
- `*.log` — dấu `*` là "bất kỳ"; dòng này bỏ qua mọi file kết thúc bằng `.log`.

Sau khi có `.gitignore`, các file/thư mục được liệt kê sẽ **không hiện trong `git status`** và không bao giờ bị `git add .` vô tình gom vào. Bản thân file `.gitignore` thì *nên* được commit, để cả nhóm dùng chung quy tắc.

> ⚠️ Lỗi người mới hay gặp: thêm tên file vào `.gitignore` **sau khi** đã lỡ commit file đó. `.gitignore` chỉ chặn file *chưa từng* được Git theo dõi; file đã commit rồi thì Git vẫn tiếp tục theo dõi. Bài học: tạo `.gitignore` **ngay từ đầu dự án**, đặc biệt trước khi commit file bí mật như `.env`.

## Thực hành trọn vẹn 5 phút

Làm theo đúng thứ tự để trải nghiệm cả bài:

```
mkdir du-an-dau-tien        # tạo thư mục mới (make directory)
cd du-an-dau-tien           # đi vào thư mục đó (change directory)
git init                    # mở "cuốn album" — biến thành repo

echo "Xin chao Git" > README.txt   # tạo file có nội dung
git status                  # thấy README.txt là untracked
git add README.txt          # bỏ vào giỏ hàng
git status                  # thấy "Changes to be committed"
git commit -m "Them file README dau tien"   # chốt đơn — commit đầu tiên!

echo "node_modules/" > .gitignore   # tạo file .gitignore
git add .gitignore
git commit -m "Them gitignore"

git log --oneline           # lật album: thấy 2 commit
```

## Tóm tắt

| Khái niệm / lệnh | Nhớ nhanh |
|---|---|
| Version control | Quản lý lịch sử thay đổi của file, thay cho `final_v2_THAT.docx` |
| Snapshot & commit | Mỗi commit = một tấm ảnh chụp toàn cảnh dự án, dán vào album lịch sử |
| Repo | Thư mục dự án + kho lịch sử nằm trong thư mục ẩn `.git` |
| `git config --global` | Khai báo tên & email một lần cho cả máy |
| `git init` | Biến thư mục thường thành repo (chạy 1 lần/dự án) |
| `git status` | Bản đồ tình hình: file nào sửa, file nào trong giỏ |
| `git add` | Bỏ thay đổi vào **giỏ hàng** (staging area) |
| `git commit -m "..."` | Thanh toán giỏ hàng, in hoá đơn vào lịch sử |
| `git log` / `--oneline` | Lật xem album, bấm `q` để thoát |
| `.gitignore` | Danh sách thứ Git phải lờ đi: file tạm, thư viện nặng, bí mật |

> 💡 Ghi nhớ cuối bài: Git chỉ thực sự "ngấm" khi tay bạn gõ. Hãy lặp vòng **status → add → commit** vài lần với file bất kỳ cho đến khi thành phản xạ — đó là nền móng cho mọi bài tiếp theo về branch và GitHub.
