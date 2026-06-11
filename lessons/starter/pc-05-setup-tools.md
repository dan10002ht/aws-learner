# Chuẩn bị đồ nghề: cài môi trường học

Trước khi học nấu ăn, bạn cần có bếp, dao và nồi. Trước khi học lập trình và khám phá máy tính, bạn cũng cần "đồ nghề" riêng. Bài này sẽ dẫn bạn đi từng bước cài đặt mọi thứ cần thiết — kể cả khi bạn chưa từng cài phần mềm nào ngoài Zalo hay trình duyệt web. Đừng lo nếu có từ nào lạ: mọi thuật ngữ đều được giải thích ngay lần đầu xuất hiện.

## Đồ nghề gồm những gì?

| Công cụ | Nó là gì (nói đời thường) | Dùng để làm gì |
|---|---|---|
| **VS Code** | Cuốn sổ tay thông minh để viết code | Soạn thảo, chỉnh sửa mã nguồn |
| **Terminal** | "Cửa sổ chat" để ra lệnh cho máy tính bằng chữ | Điều khiển máy tính nhanh, chạy chương trình |
| **Python** | Một ngôn ngữ để "nói chuyện" với máy tính | Viết chương trình đầu tiên |
| **Git** | Cỗ máy thời gian cho file | Lưu lại lịch sử thay đổi của dự án |
| **DevTools** | Kính hiển vi soi trang web | Xem "bên trong" một trang web |

> 💡 Ghi nhớ: Bạn KHÔNG cần hiểu sâu từng công cụ ngay hôm nay. Mục tiêu của bài này chỉ là **cài xong và chạy thử được** — giống như mua dao về và thử cắt một quả cà chua, chưa cần biết tỉa hoa.

---

## 1. Cài VS Code — cuốn sổ viết code

### VS Code là gì?

**VS Code** (tên đầy đủ: Visual Studio Code) là một **trình soạn thảo mã nguồn** (code editor) — hiểu nôm na là phần mềm giống Microsoft Word, nhưng được thiết kế riêng để viết code: nó tô màu chữ cho dễ đọc, gợi ý khi bạn gõ, và báo lỗi như trình kiểm tra chính tả. VS Code miễn phí, do Microsoft làm, và là editor phổ biến nhất thế giới hiện nay.

### Các bước cài đặt

**Trên Windows:**

1. Mở trình duyệt (Chrome, Edge...), vào địa chỉ: `https://code.visualstudio.com`
2. Bấm nút xanh lớn **"Download for Windows"**. Một file tên kiểu `VSCodeUserSetup-x64-...exe` sẽ được tải về (thường nằm trong thư mục **Downloads**).
3. Nháy đúp vào file vừa tải để chạy trình cài đặt.
4. Bấm **"I accept the agreement"** (tôi đồng ý điều khoản) → **Next**.
5. Ở màn hình "Select Additional Tasks", **tick hết các ô**, đặc biệt là:
   - *"Add 'Open with Code' action..."* — để sau này chuột phải vào thư mục là mở được bằng VS Code.
   - *"Add to PATH"* — để terminal "biết" VS Code tồn tại.
6. Bấm **Install**, đợi vài chục giây, rồi **Finish**.

**Trên macOS:**

1. Vào `https://code.visualstudio.com`, bấm **"Download for Mac"**.
2. Mở file `.zip` vừa tải — nó sẽ giải nén ra biểu tượng **Visual Studio Code**.
3. **Kéo biểu tượng đó vào thư mục Applications** (Ứng dụng). Bước này quan trọng — đừng chạy thẳng từ thư mục Downloads.
4. Mở Launchpad, bấm vào Visual Studio Code. Nếu máy hỏi "ứng dụng tải từ Internet, có chắc muốn mở?", chọn **Open**.

### Kiểm tra: mở VS Code lần đầu

Khi mở lên, bạn sẽ thấy màn hình chào "Welcome". Hãy thử:

1. Bấm menu **File → New File** (tạo file mới).
2. Gõ vài chữ bất kỳ, ví dụ: `Xin chào, đây là file đầu tiên của tôi!`
3. Bấm **File → Save**, đặt tên `ghichu.txt`, lưu vào Desktop (Màn hình nền).

Nếu làm được 3 bước trên — chúc mừng, bạn đã có "cuốn sổ" của lập trình viên!

> 💡 Ghi nhớ: Giao diện VS Code mặc định là tiếng Anh. Nếu muốn tiếng Việt, bấm biểu tượng 4 ô vuông bên trái (Extensions), gõ "Vietnamese", cài **Vietnamese Language Pack**. Tuy nhiên, lời khuyên thật lòng: **nên để tiếng Anh** để quen dần với thuật ngữ — sau này đọc tài liệu sẽ dễ hơn rất nhiều.

> ⚠️ Lỗi người mới hay gặp: Tải nhầm **Visual Studio** (không có chữ "Code") — đó là phần mềm khác, nặng cả chục GB, dành cho mục đích khác. Hãy chắc chắn trang web là `code.visualstudio.com` và tên phần mềm là **Visual Studio Code**.

---

## 2. Terminal — nói chuyện với máy tính bằng chữ

### Terminal là gì?

Bình thường bạn điều khiển máy tính bằng cách **bấm chuột vào hình**: nháy đúp vào thư mục để mở, kéo file vào thùng rác để xoá. Đó gọi là **giao diện đồ hoạ** (GUI — Graphical User Interface).

**Terminal** (còn gọi là "cửa sổ dòng lệnh") là cách điều khiển máy tính **bằng cách gõ chữ**: thay vì nháy đúp vào thư mục, bạn gõ một câu lệnh. Hãy tưởng tượng nó như **nhắn tin cho máy tính**: bạn gõ một "tin nhắn" (lệnh), máy tính đọc, làm theo, rồi "trả lời" lại bằng chữ.

Nghe có vẻ thụt lùi so với bấm chuột? Thực ra terminal **nhanh và mạnh hơn nhiều** khi làm việc với code — đó là lý do mọi lập trình viên đều dùng nó hằng ngày.

### Mở terminal ở đâu?

| Hệ điều hành | Cách mở |
|---|---|
| **Windows** | Bấm phím Windows, gõ `terminal` hoặc `powershell`, Enter |
| **macOS** | Bấm `Cmd + Phím cách`, gõ `terminal`, Enter |
| **Trong VS Code** | Menu **Terminal → New Terminal** (tiện nhất khi học!) |

Khi mở lên, bạn sẽ thấy một dòng chữ kết thúc bằng dấu `>` hoặc `$` và con trỏ nhấp nháy — đó là máy tính đang nói: *"Tôi nghe đây, ra lệnh đi!"*. Dòng đó gọi là **dấu nhắc lệnh** (prompt).

### Ba lệnh đầu tiên trong đời

Hãy gõ từng lệnh dưới đây rồi bấm **Enter** (Enter = "gửi tin nhắn"):

**Lệnh 1 — Xem mình đang đứng ở đâu và có gì xung quanh**

Terminal luôn "đứng" tại một thư mục nào đó, giống như bạn đang đứng trong một căn phòng. Để xem trong phòng có gì:

```
ls
```

(Trên Windows PowerShell, `ls` cũng chạy được; nếu dùng Command Prompt cũ thì gõ `dir`.)

Máy sẽ liệt kê các file và thư mục — bạn sẽ thấy những cái tên quen thuộc như `Desktop`, `Documents`, `Downloads`. `ls` viết tắt của *list* (liệt kê).

**Lệnh 2 — Di chuyển sang "phòng" khác**

```
cd Desktop
```

`cd` viết tắt của *change directory* (đổi thư mục) — giống như bước từ phòng khách sang phòng ngủ. Sau lệnh này, bạn đang "đứng" trên Desktop. Gõ `ls` lần nữa — bạn sẽ thấy đúng những thứ đang nằm trên màn hình nền, kể cả file `ghichu.txt` lúc nãy!

Mẹo: gõ `cd ..` (hai dấu chấm) để **quay ngược ra** thư mục bên ngoài.

**Lệnh 3 — Tạo thư mục mới**

```
mkdir hoc-lap-trinh
```

`mkdir` = *make directory* (tạo thư mục). Nhìn ra màn hình nền — một thư mục tên `hoc-lap-trinh` vừa xuất hiện, do chính bạn tạo bằng lệnh! Giờ bước vào nó:

```
cd hoc-lap-trinh
```

Thư mục này sẽ là "góc học tập" của bạn trong suốt khoá học.

> 💡 Ghi nhớ: Bộ ba `ls` (nhìn quanh) → `cd` (di chuyển) → `mkdir` (tạo phòng mới) là 80% những gì bạn dùng terminal hằng ngày. Cứ luyện đến khi gõ không cần nghĩ.

> ⚠️ Lỗi người mới hay gặp: Tên thư mục có **dấu cách** sẽ làm lệnh hiểu nhầm — `cd hoc lap trinh` bị hiểu là 3 từ riêng. Cách xử lý: đặt tên không dấu cách (dùng gạch ngang `hoc-lap-trinh`), hoặc bọc trong ngoặc kép: `cd "hoc lap trinh"`. Ngoài ra, tránh đặt tên file/thư mục có dấu tiếng Việt (ô, ư, đ...) — một số công cụ cũ sẽ trục trặc.

---

## 3. Cài Python và chạy "Xin chào" đầu tiên

### Python là gì?

Máy tính không hiểu tiếng Việt hay tiếng Anh — nó chỉ hiểu các **ngôn ngữ lập trình** (programming language), tức là những "ngôn ngữ nhân tạo" có quy tắc chặt chẽ để con người viết chỉ dẫn cho máy. **Python** là ngôn ngữ lập trình dễ học nhất cho người mới: câu lệnh gần giống tiếng Anh thường, và được dùng thật ở khắp nơi (Google, NASA, ngân hàng, AI...).

### Cài đặt

**Trên Windows:**

1. Vào `https://www.python.org/downloads` → bấm nút vàng **"Download Python 3.x.x"**.
2. Chạy file `.exe` vừa tải.
3. **QUAN TRỌNG NHẤT BÀI NÀY:** ở màn hình đầu tiên, **tick vào ô "Add python.exe to PATH"** ở dưới cùng trước khi bấm Install. Nếu quên, terminal sẽ không tìm thấy Python và bạn sẽ gặp lỗi khó hiểu.
4. Bấm **Install Now**, đợi, rồi **Close**.

**Trên macOS:**

Máy Mac thường có sẵn Python nhưng bản cũ. Cách sạch nhất: vào `https://www.python.org/downloads`, tải bản cho macOS, mở file `.pkg`, bấm **Continue** vài lần rồi **Install** (máy sẽ hỏi mật khẩu đăng nhập của bạn — đó là bình thường).

### Kiểm tra cài thành công

Mở terminal **mới** (phải mở cửa sổ mới sau khi cài!) và gõ:

```
python --version
```

Nếu trên Mac lệnh trên báo lỗi, thử `python3 --version`. Kết quả mong đợi là một dòng kiểu:

```
Python 3.12.4
```

Thấy số phiên bản hiện ra nghĩa là thành công.

### Chương trình đầu tiên: "Xin chào"

Theo truyền thống, chương trình đầu đời của mọi lập trình viên là in ra một lời chào. Làm theo các bước:

1. Mở VS Code → **File → Open Folder** → chọn thư mục `hoc-lap-trinh` bạn tạo lúc nãy (nếu hỏi "Do you trust...?", chọn **Yes, I trust**).
2. **File → New File**, đặt tên `xinchao.py` (đuôi `.py` báo cho máy biết đây là file Python).
3. Gõ đúng một dòng sau (chữ thường, đủ ngoặc, đủ dấu nháy):

```python
print("Xin chào! Tôi đã sẵn sàng học lập trình.")
```

4. Lưu file (`Ctrl+S` / `Cmd+S`).
5. Mở terminal ngay trong VS Code (**Terminal → New Terminal**) và gõ:

```
python xinchao.py
```

(Mac có thể cần `python3 xinchao.py`.)

Nếu màn hình hiện:

```
Xin chào! Tôi đã sẵn sàng học lập trình.
```

— thì **bạn vừa viết và chạy chương trình máy tính đầu tiên trong đời**. Nghiêm túc đấy: bạn vừa ra lệnh cho máy tính bằng ngôn ngữ lập trình, và nó đã nghe lời. 🎉

> ⚠️ Lỗi người mới hay gặp:
> - `'python' is not recognized...` → bạn quên tick "Add to PATH" khi cài. Cách sửa nhanh nhất: gỡ Python ra, cài lại, lần này nhớ tick.
> - `SyntaxError` → thường do gõ sai một ký tự: thiếu dấu ngoặc `)`, thiếu dấu nháy `"`, hoặc viết hoa `Print` (Python phân biệt hoa/thường — phải là `print`).
> - Dùng dấu nháy "cong" `“ ”` (do gõ trong Word rồi dán sang) thay vì nháy thẳng `" "` → luôn gõ code trực tiếp trong VS Code.

---

## 4. Cài Git — cỗ máy thời gian (chuẩn bị cho khoá Git)

### Git là gì?

Bạn đã bao giờ lưu bài luận thành `baitap_final.docx`, rồi `baitap_final_SUA.docx`, rồi `baitap_final_SUA_THAT.docx` chưa? **Git** sinh ra để chấm dứt cảnh đó. Nó là phần mềm **quản lý phiên bản** (version control): tự động ghi lại lịch sử mọi thay đổi của file, cho phép bạn "tua ngược thời gian" về bất kỳ phiên bản nào, và nhiều người cùng sửa một dự án mà không giẫm chân nhau.

Khoá học Git riêng sẽ dạy kỹ — hôm nay ta **chỉ cài sẵn** để khi đó không phải loay hoay.

### Cài đặt

**Windows:** vào `https://git-scm.com/downloads`, tải bản Windows, chạy file cài. Trình cài sẽ hỏi RẤT nhiều màn hình tuỳ chọn — **cứ bấm Next hết** với lựa chọn mặc định, không sao cả.

**macOS:** mở terminal và gõ:

```
git --version
```

Nếu chưa có Git, máy Mac sẽ tự bật hộp thoại mời cài **Command Line Tools** — bấm **Install** và đợi (có thể hơi lâu).

### Kiểm tra và "khai tên"

Mở terminal mới, gõ:

```
git --version
```

Thấy `git version 2.x.x` là ổn. Sau đó "khai báo danh tính" một lần duy nhất (Git dùng để ký tên vào lịch sử thay đổi của bạn — thay tên và email bằng của bạn):

```
git config --global user.name "Nguyen Van A"
git config --global user.email "email-cua-ban@gmail.com"
```

Hai lệnh này chạy xong **không hiện gì cả** — trong thế giới terminal, im lặng thường có nghĩa là thành công.

> 💡 Ghi nhớ: Git (phần mềm trên máy bạn) khác với **GitHub** (trang web lưu trữ dự án dùng Git, giống "Google Drive cho code"). Khoá Git sẽ làm rõ — hôm nay chỉ cần cài Git là đủ.

---

## 5. DevTools — soi "bên trong" một trang web

Mọi trình duyệt (Chrome, Edge, Firefox...) đều giấu sẵn một bộ đồ nghề tên là **DevTools** (Developer Tools — công cụ cho nhà phát triển). Nó như chiếc kính hiển vi cho phép nhìn xuyên qua giao diện đẹp đẽ của trang web để thấy "bộ xương" bên dưới.

Thử ngay trong 2 phút:

1. Mở Chrome (hoặc Edge), vào một trang bất kỳ, ví dụ `https://vnexpress.net`.
2. Bấm phím **F12** (trên Mac: `Cmd + Option + I`). Một bảng điều khiển sẽ trượt ra.
3. Trong DevTools, bấm biểu tượng **mũi tên trỏ vào ô vuông** ở góc trên trái (hoặc `Ctrl+Shift+C`), rồi rê chuột lên trang web — từng phần của trang sẽ được tô sáng, kèm "mã nguồn" tương ứng. Đó chính là **HTML**, ngôn ngữ tạo nên mọi trang web (sẽ học sau).
4. Trò vui: ở tab **Elements**, nháy đúp vào một dòng chữ tiêu đề bất kỳ và... sửa nó thành chữ khác. Tiêu đề trên trang đổi theo ngay! Đừng lo — bạn chỉ sửa **bản hiển thị trên máy mình**, bấm F5 (tải lại trang) là mọi thứ về như cũ. Trang web thật không hề hấn gì.

Đóng DevTools bằng cách bấm F12 lần nữa. Vậy là bạn đã biết mở "kính hiển vi" — sau này học web sẽ dùng nó liên tục.

---

## 6. Mẹo sống còn: google lỗi và dùng AI assistant đúng cách

### Khi gặp lỗi — đừng hoảng

Sự thật ít ai nói với người mới: **lập trình viên chuyên nghiệp gặp lỗi cả ngày**, và kỹ năng quan trọng nhất của họ không phải là "không bao giờ sai" mà là **biết cách tra cứu**. Quy trình chuẩn:

1. **Đọc thông báo lỗi** — đừng lướt qua. Dòng cuối cùng thường nói thẳng vấn đề (ví dụ `SyntaxError: ...` = lỗi cú pháp, gõ sai gì đó).
2. **Copy nguyên văn dòng lỗi** và dán vào Google, kèm tên công cụ. Ví dụ tìm: `python 'python' is not recognized as an internal or external command`
3. **Bỏ phần riêng tư** khỏi câu tìm kiếm: tên máy, tên thư mục của bạn (`C:\Users\TenBan\...`) — vì người khác gặp lỗi giống bạn nhưng đường dẫn khác.
4. Ưu tiên kết quả từ **Stack Overflow** (diễn đàn hỏi đáp lập trình lớn nhất thế giới) và tài liệu chính thức. Câu trả lời có dấu tick xanh ✓ là câu được kiểm chứng.
5. Tìm bằng **tiếng Anh** thường ra kết quả tốt hơn — nhưng đừng ngại, vì bạn chỉ cần copy-paste lỗi, không cần tự viết.

### Dùng AI assistant (ChatGPT, Claude, Gemini...) khi học

AI là gia sư cực kỳ lợi hại — nếu dùng đúng cách:

**Nên:**
- Hỏi kiểu **"giải thích cho tôi"**: *"Giải thích lỗi này cho người mới học, từng bước: [dán lỗi]"*.
- **Cung cấp ngữ cảnh đầy đủ**: bạn đang dùng Windows hay Mac, gõ lệnh gì, lỗi nguyên văn ra sao. Ngữ cảnh càng rõ, câu trả lời càng trúng.
- Hỏi tiếp khi chưa hiểu: *"Khoan, dòng thứ 2 nghĩa là gì? Cho ví dụ đời thường."* — AI không bao giờ mất kiên nhẫn.
- Nhờ AI **ra bài tập kiểm tra** lại kiến thức vừa học.

**Không nên:**
- Nhờ AI **làm hộ toàn bộ** rồi copy-paste mà không đọc. Code chạy được nhưng bạn không học được gì — giống thuê người tập gym hộ.
- **Tin AI tuyệt đối**: AI đôi khi trả lời sai rất tự tin (hiện tượng gọi là "ảo giác" — hallucination). Luôn chạy thử và kiểm chứng.
- Hỏi quá chung chung kiểu *"code bị lỗi, sửa giùm"* mà không dán lỗi và code — AI không nhìn thấy màn hình của bạn.

> 💡 Ghi nhớ: Công thức hỏi AI hiệu quả = **(1) Tôi đang làm gì + (2) Tôi mong đợi điều gì + (3) Thực tế xảy ra gì (dán nguyên văn lỗi) + (4) Môi trường của tôi (Windows/Mac, phiên bản)**. Áp dụng công thức này, 90% câu hỏi được giải quyết trong một lần hỏi.

> ⚠️ Lỗi người mới hay gặp: Gặp lỗi là xoá hết cài lại Windows, hoặc bỏ cuộc. Hầu hết lỗi khi cài môi trường chỉ thuộc 3 nhóm: (1) quên "Add to PATH", (2) chưa mở lại terminal sau khi cài, (3) gõ sai chính tả lệnh. Kiểm tra 3 thứ đó trước khi hoảng.

---

## Tổng kết: checklist đồ nghề

Đánh dấu từng mục — xong hết là bạn đã sẵn sàng cho cả khoá học:

| ✅ | Hạng mục | Cách kiểm tra |
|---|---|---|
| ☐ | VS Code mở được, tạo và lưu được file | Tạo `ghichu.txt` trên Desktop |
| ☐ | Biết mở terminal và dùng `ls`/`dir`, `cd`, `mkdir` | Tự tạo được thư mục `hoc-lap-trinh` |
| ☐ | Python cài xong | `python --version` hiện số phiên bản |
| ☐ | Chạy được chương trình đầu tiên | `python xinchao.py` in ra lời chào |
| ☐ | Git cài xong và đã khai tên | `git --version` hiện số phiên bản |
| ☐ | Mở được DevTools | Bấm F12 trong trình duyệt |
| ☐ | Biết công thức google lỗi & hỏi AI | Thuộc công thức 4 phần ở trên |

Buổi "sắm đồ nghề" nào cũng hơi lích kích — nhưng bạn chỉ phải làm **một lần duy nhất**. Từ bài sau, mọi thứ đã sẵn sàng: mở VS Code, mở terminal, và bắt tay vào học thật sự. Hẹn gặp ở bài tiếp theo!
