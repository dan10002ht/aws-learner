# Máy tính hoạt động thế nào

Bạn đã bao giờ tự hỏi: khi bấm vào một biểu tượng trên màn hình, chuyện gì thực sự xảy ra bên trong chiếc máy tính? Bài học này sẽ "mổ xẻ" chiếc máy tính theo cách dễ hiểu nhất — không cần biết trước bất cứ điều gì về công nghệ. Chúng ta sẽ dùng một hình ảnh xuyên suốt: **máy tính giống như một văn phòng làm việc**, với nhân viên, bàn làm việc, tủ hồ sơ và người quản lý.

## Bức tranh tổng thể: máy tính là một văn phòng

Hãy tưởng tượng một văn phòng nhỏ:

| Trong văn phòng | Trong máy tính | Vai trò |
|---|---|---|
| Nhân viên siêu nhanh | **CPU** (bộ xử lý) | Người thực sự làm mọi việc |
| Bàn làm việc | **RAM** (bộ nhớ tạm) | Chỗ bày giấy tờ đang làm dở |
| Tủ hồ sơ | **Ổ cứng** (storage) | Nơi cất giữ lâu dài |
| Người quản lý văn phòng | **Hệ điều hành** (Operating System) | Điều phối ai làm gì, dùng gì |
| Các đầu việc | **Chương trình & tiến trình** | Công việc cần hoàn thành |
| Giấy tờ, tài liệu | **File & thư mục** | Dữ liệu được lưu trữ |

Toàn bộ bài học chỉ là đi sâu vào từng nhân vật trong văn phòng này. Nắm được bảng trên là bạn đã nắm được 80% bài.

---

## 1. CPU — "bộ não" của máy tính

**CPU** (Central Processing Unit — bộ xử lý trung tâm) là con chip nhỏ nằm giữa máy, và là nơi *mọi* tính toán diễn ra. Trong văn phòng của chúng ta, CPU là **nhân viên duy nhất thực sự làm việc**: cộng số, so sánh, di chuyển dữ liệu. Mọi thứ khác chỉ phục vụ cho nhân viên này.

Điều thú vị: CPU thực ra rất "ngốc". Nó chỉ biết làm những việc cực kỳ đơn giản, kiểu:

- Lấy hai con số, cộng lại
- So sánh xem số này có lớn hơn số kia không
- Chuyển một mẩu dữ liệu từ chỗ này sang chỗ khác

Vậy tại sao máy tính làm được những việc phức tạp như phát video, chơi game? Vì CPU làm những việc đơn giản đó **nhanh đến mức không tưởng tượng nổi** — hàng tỷ phép tính mỗi giây.

### Xung nhịp — nhịp trống của dàn nhạc

**Xung nhịp** (clock speed) là tốc độ "gõ nhịp" của CPU, đo bằng **GHz** (gigahertz). 1 GHz = 1 tỷ nhịp mỗi giây. Mỗi nhịp, CPU làm được một (hoặc vài) bước công việc nhỏ.

Hãy tưởng tượng một người gõ trống cho đội chèo thuyền: trống gõ càng nhanh, đội chèo càng nhanh. CPU 3 GHz nghĩa là "trống" gõ 3 tỷ lần mỗi giây.

### Nhân CPU — nhiều nhân viên hơn

CPU hiện đại thường có nhiều **nhân** (core) — giống như văn phòng thuê thêm nhân viên. CPU 4 nhân = 4 nhân viên có thể làm 4 việc *cùng lúc*. Đó là lý do bạn có thể vừa nghe nhạc vừa lướt web mà máy không "nghẹn".

> 💡 **Ghi nhớ**: CPU = bộ não làm mọi phép tính. Xung nhịp (GHz) = tốc độ làm việc. Số nhân (core) = số việc làm được cùng lúc.

> ⚠️ **Lỗi người mới hay gặp**: Nghĩ rằng "GHz càng cao thì máy chắc chắn càng nhanh". Không hẳn! Một CPU 8 nhân chạy 2.5 GHz có thể mạnh hơn nhiều CPU 2 nhân chạy 3.5 GHz — giống như 8 nhân viên làm việc đều tay thường thắng 2 nhân viên làm hơi nhanh hơn một chút.

---

## 2. RAM vs Ổ cứng — bàn làm việc vs tủ hồ sơ

Đây là cặp khái niệm người mới hay nhầm lẫn nhất, nên hãy đi chậm.

### Tủ hồ sơ: Ổ cứng

**Ổ cứng** (hard drive / SSD) là nơi lưu trữ **lâu dài**: ảnh, video, tài liệu, phần mềm đã cài. Giống tủ hồ sơ trong văn phòng:

- **Chứa được rất nhiều** (hàng trăm GB đến vài TB)
- **Tắt máy không mất gì** — hồ sơ vẫn nằm yên trong tủ
- Nhưng **lấy ra hơi chậm** — phải đứng dậy, đi tới tủ, lục tìm

### Bàn làm việc: RAM

**RAM** (Random Access Memory — bộ nhớ truy cập ngẫu nhiên) là nơi để dữ liệu **đang được dùng ngay lúc này**. Giống mặt bàn làm việc:

- **Lấy cực nhanh** — giấy tờ ngay trước mặt, với tay là tới
- Nhưng **diện tích nhỏ** (thường 8–32 GB)
- Và quan trọng nhất: **tắt máy là mất sạch** — như cuối ngày dọn bàn, mọi thứ trên bàn bị quét đi

### Hai bên phối hợp thế nào?

Khi bạn mở một file Word:

1. File đó đang nằm trong **tủ hồ sơ** (ổ cứng)
2. Máy **sao chép** nó lên **bàn làm việc** (RAM) để bạn chỉnh sửa nhanh
3. Bạn gõ, sửa — tất cả diễn ra trên RAM (nhanh)
4. Khi bạn bấm **Lưu (Save)** — bản mới được chép ngược vào tủ hồ sơ (ổ cứng)

| Tiêu chí | RAM (bàn làm việc) | Ổ cứng (tủ hồ sơ) |
|---|---|---|
| Tốc độ | Rất nhanh | Chậm hơn nhiều |
| Dung lượng | Nhỏ (8–32 GB) | Lớn (256 GB – vài TB) |
| Tắt máy | **Mất hết** | **Giữ nguyên** |
| Dùng để | Việc đang làm dở | Cất giữ lâu dài |

> 💡 **Ghi nhớ**: RAM = bàn làm việc (nhanh, nhỏ, tắt máy là mất). Ổ cứng = tủ hồ sơ (chậm hơn, to, giữ mãi). Đây là lý do bạn phải **Save** file: chưa Save nghĩa là tài liệu mới chỉ nằm trên "bàn", chưa được cất vào "tủ".

> ⚠️ **Lỗi người mới hay gặp**: Nói "máy em có 500 GB RAM". Gần như chắc chắn đó là dung lượng **ổ cứng**, không phải RAM. Khi nghe con số hàng trăm GB trở lên — đó là tủ hồ sơ. RAM thường chỉ 4, 8, 16, 32 GB.

### SSD vs HDD — tủ hồ sơ đời mới

Có hai loại "tủ hồ sơ":

- **HDD** (Hard Disk Drive): ổ cứng cơ, có đĩa quay bên trong như đĩa than — rẻ, nhưng chậm.
- **SSD** (Solid State Drive): ổ cứng thể rắn, không có bộ phận chuyển động — nhanh gấp nhiều lần. Như thay tủ hồ sơ bình thường bằng tủ có ngăn kéo tự động bật ra.

Nâng từ HDD lên SSD là cách "hồi sinh" máy cũ hiệu quả nhất.

---

## 3. Hệ điều hành — người quản lý văn phòng

**Hệ điều hành** (Operating System, viết tắt **OS**) là phần mềm nền tảng chạy ngay khi bật máy: **Windows**, **macOS** (trên máy Mac), **Linux**, hay **Android/iOS** trên điện thoại.

Hãy nghĩ về văn phòng: nếu chỉ có nhân viên (CPU), bàn (RAM), tủ (ổ cứng) mà không có ai quản lý, sẽ loạn ngay. Người quản lý — tức hệ điều hành — lo:

1. **Phân chia thời gian của nhân viên**: CPU chỉ có vài nhân nhưng bạn mở 20 thứ cùng lúc. OS quyết định "việc nào làm trước, mỗi việc được làm bao lâu" — chuyển qua lại nhanh đến mức bạn tưởng mọi thứ chạy đồng thời.
2. **Phân chỗ trên bàn**: Mỗi chương trình được cấp một góc RAM riêng, không được lấn sang góc của chương trình khác.
3. **Quản lý tủ hồ sơ**: Khi bạn lưu file, OS quyết định cất vào đâu và ghi sổ để lần sau tìm lại được.
4. **Làm phiên dịch với thiết bị**: Bàn phím, chuột, máy in, màn hình — mỗi thứ "nói một thứ tiếng" khác nhau. OS dùng các **driver** (trình điều khiển — phần mềm phiên dịch cho từng thiết bị) để giao tiếp với chúng.
5. **Cung cấp giao diện cho bạn**: Màn hình desktop, các cửa sổ, biểu tượng — đó là "bộ mặt" của hệ điều hành.

> 💡 **Ghi nhớ**: Bạn không bao giờ nói chuyện trực tiếp với phần cứng. Mọi thao tác của bạn đều đi qua "người quản lý" — hệ điều hành.

---

## 4. Chương trình và tiến trình — bản kế hoạch vs công việc đang chạy

Hai từ này nghe giống nhau nhưng khác nhau quan trọng:

- **Chương trình** (program) = phần mềm **nằm yên trong ổ cứng**. Giống một **cuốn công thức nấu ăn** trên kệ — nó chỉ là hướng dẫn, chưa có gì xảy ra.
- **Tiến trình** (process) = chương trình **đang chạy**. Giống lúc đầu bếp mở công thức ra, bày nguyên liệu lên bàn và **bắt đầu nấu**.

Khi bạn nháy đúp vào biểu tượng Chrome:

1. OS tìm chương trình Chrome trong ổ cứng (lấy cuốn công thức từ kệ)
2. Nạp nó vào RAM (bày lên bàn làm việc)
3. Bảo CPU bắt đầu thực hiện từng dòng lệnh (đầu bếp bắt đầu nấu)
4. Từ giây phút đó, Chrome trở thành một **tiến trình**

Một chương trình có thể sinh ra nhiều tiến trình cùng lúc — mở 2 cửa sổ Word là có thể có 2 tiến trình từ cùng một "cuốn công thức". Trên Windows, bấm `Ctrl + Shift + Esc` mở **Task Manager** (trình quản lý tác vụ) là bạn thấy danh sách tất cả tiến trình đang chạy — đông hơn bạn tưởng nhiều, vì OS cũng chạy hàng chục tiến trình ngầm của riêng nó.

> ⚠️ **Lỗi người mới hay gặp**: Tắt cửa sổ nhưng tưởng chương trình đã tắt hẳn. Nhiều ứng dụng (Zalo, Skype...) vẫn chạy ngầm dưới dạng tiến trình, tiếp tục chiếm RAM và CPU. Muốn tắt hẳn phải thoát từ khay hệ thống hoặc Task Manager.

---

## 5. File và thư mục — giấy tờ và ngăn kéo

- **File** (tệp) = một đơn vị dữ liệu hoàn chỉnh: một bức ảnh, một bài hát, một văn bản. Giống **một tờ/một tập giấy tờ** trong văn phòng.
- **Thư mục** (folder) = chiếc **ngăn kéo/bìa kẹp** để gom các file liên quan vào một chỗ. Thư mục có thể chứa thư mục con — như bìa kẹp lớn chứa bìa kẹp nhỏ.

### Phần mở rộng — "nhãn dán" trên hồ sơ

Tên file thường có phần đuôi sau dấu chấm, gọi là **phần mở rộng** (extension): `baocao.docx`, `anh-cuoi.jpg`, `nhac.mp3`. Đuôi này như nhãn dán cho biết loại hồ sơ, để OS biết mở bằng chương trình nào:

| Đuôi file | Loại | Thường mở bằng |
|---|---|---|
| `.docx` | Văn bản | Word |
| `.jpg`, `.png` | Ảnh | Trình xem ảnh |
| `.mp3` | Âm thanh | Trình nghe nhạc |
| `.mp4` | Video | Trình xem phim |
| `.exe` | Chương trình (Windows) | Chạy trực tiếp |

### Đường dẫn — địa chỉ của hồ sơ

Mỗi file có một **đường dẫn** (path) — như địa chỉ nhà: `C:\Users\Lan\Documents\baocao.docx` nghĩa là: ổ đĩa C → ngăn Users → ngăn Lan → ngăn Documents → tờ giấy tên baocao.docx.

> 💡 **Ghi nhớ**: File = giấy tờ, thư mục = ngăn kéo, đường dẫn = địa chỉ chỉ chỗ cất. Đặt tên thư mục có hệ thống ngay từ đầu sẽ tiết kiệm cho bạn hàng giờ tìm kiếm sau này.

---

## 6. Bit, Byte, KB, MB, GB — đơn vị đo của thế giới số

Máy tính, tận sâu bên trong, chỉ hiểu **hai trạng thái**: có điện / không có điện — biểu diễn bằng **1** và **0**. Mỗi con số 0 hoặc 1 đó gọi là một **bit** — đơn vị thông tin nhỏ nhất, như một công tắc đèn bật/tắt.

Một bit quá nhỏ để chứa thông tin gì hữu ích, nên người ta gom **8 bit = 1 byte**. Một byte đủ để lưu một ký tự, ví dụ chữ "A".

Từ đó nhân lên khoảng 1.000 lần mỗi bậc (chính xác là 1.024, nhưng nhớ 1.000 cho dễ):

| Đơn vị | Bằng | Hình dung |
|---|---|---|
| 1 bit | 0 hoặc 1 | Một công tắc bật/tắt |
| 1 byte | 8 bit | Một chữ cái |
| 1 KB (kilobyte) | ~1.000 byte | Một đoạn văn ngắn |
| 1 MB (megabyte) | ~1.000 KB | Một bức ảnh chụp điện thoại ~2–5 MB |
| 1 GB (gigabyte) | ~1.000 MB | Khoảng 1 giờ video chất lượng thường |
| 1 TB (terabyte) | ~1.000 GB | Khoảng 250.000 bức ảnh |

Vài con số đời thường để có cảm giác:

- Một bài hát MP3: ~5 MB
- Một bộ phim HD: ~2–4 GB
- Hệ điều hành Windows: ~25–30 GB
- Ổ cứng laptop phổ biến: 256 GB – 1 TB

> ⚠️ **Lỗi người mới hay gặp**: Nhầm **bit** với **byte** khi nói về tốc độ mạng. Nhà mạng quảng cáo "100 Mbps" — đó là 100 **megabit**/giây, tức chỉ ~12,5 **megabyte**/giây (chia 8). Tải bộ phim 4 GB với mạng "100 Mb" sẽ mất hơn 5 phút chứ không phải 40 giây.

---

## 7. Vì sao máy tính chạy chậm?

Giờ đã hiểu các bộ phận, ta có thể "bắt bệnh" như một bác sĩ. Máy chậm hầu như luôn do một trong các nguyên nhân sau:

### a) Hết chỗ trên bàn làm việc (thiếu RAM)

Mở quá nhiều chương trình = bày quá nhiều giấy tờ lên một chiếc bàn nhỏ. Khi RAM đầy, OS phải làm một việc cực chậm: tạm cất bớt giấy tờ trên bàn vào tủ hồ sơ (gọi là **swap** — tráo đổi bộ nhớ), rồi khi cần lại lôi ra. Cứ cất vào lấy ra liên tục, mọi thứ ì ạch hẳn.

**Dấu hiệu**: mở nhiều tab trình duyệt thì máy khựng, chuyển giữa các ứng dụng rất lâu.
**Cách xử lý**: đóng bớt ứng dụng/tab, tắt chương trình chạy ngầm, hoặc nâng cấp RAM.

### b) Nhân viên quá tải (CPU 100%)

Một chương trình "ngốn" hết sức của CPU — như giao cho nhân viên duy nhất một núi việc, các việc khác phải xếp hàng.

**Dấu hiệu**: quạt máy kêu to, máy nóng, mọi thao tác đều chậm.
**Cách xử lý**: mở Task Manager xem tiến trình nào chiếm CPU cao nhất và tắt nó nếu không cần.

### c) Tủ hồ sơ cũ kỹ hoặc gần đầy (ổ cứng)

- Ổ HDD cũ vốn đã chậm sẵn.
- Ổ cứng đầy trên ~90% khiến OS không còn chỗ xoay xở (nhớ vụ swap ở trên — swap cũng cần chỗ trống trong "tủ").

**Cách xử lý**: xóa bớt file không dùng, hoặc nâng cấp lên SSD.

### d) Quá nhiều chương trình khởi động cùng máy

Nhiều phần mềm tự đặt mình vào danh sách "chạy ngay khi bật máy" — như mỗi sáng chưa kịp ngồi xuống đã có 15 người ùa vào giao việc.

**Cách xử lý**: vào Task Manager → tab Startup, tắt bớt những thứ không cần khởi động cùng máy.

### e) Virus / phần mềm độc hại

Phần mềm xấu chạy ngầm, âm thầm chiếm CPU, RAM và mạng — như một kẻ lẻn vào văn phòng, vừa sai vặt nhân viên của bạn vừa lục tủ hồ sơ.

**Cách xử lý**: quét bằng phần mềm diệt virus, chỉ cài phần mềm từ nguồn tin cậy.

> 💡 **Ghi nhớ — quy trình bắt bệnh nhanh**: Máy chậm → mở Task Manager → nhìn xem cột nào đang đỏ rực: CPU (nhân viên quá tải), Memory/RAM (bàn hết chỗ), hay Disk (tủ hồ sơ quá tải) → xử lý đúng thủ phạm. Đừng vội nghĩ "máy hỏng rồi" — đa số trường hợp chỉ là văn phòng đang bừa bộn.

---

## Tổng kết: một ngày trong văn phòng máy tính

Ghép tất cả lại, đây là chuyện xảy ra khi bạn bật máy và mở một file ảnh:

1. **Bật máy** → Hệ điều hành (người quản lý) được nạp từ ổ cứng vào RAM và bắt đầu điều hành văn phòng.
2. **Nháy đúp vào file ảnh** → OS nhìn đuôi `.jpg`, biết cần gọi chương trình xem ảnh.
3. **Chương trình xem ảnh** được lấy từ ổ cứng (kệ sách), nạp vào RAM (bàn làm việc), trở thành một **tiến trình**.
4. **CPU** (nhân viên) thực hiện hàng tỷ phép tính mỗi giây để giải mã file ảnh thành các điểm màu.
5. Kết quả được gửi ra **màn hình** — và bạn thấy bức ảnh, tất cả trong chưa đầy một giây.

### Bảng thuật ngữ của bài

| Thuật ngữ | Nghĩa ngắn gọn |
|---|---|
| CPU | Bộ xử lý — "nhân viên" làm mọi tính toán |
| Xung nhịp (GHz) | Tốc độ làm việc của CPU |
| Nhân (core) | Số việc CPU làm được cùng lúc |
| RAM | Bộ nhớ tạm — "bàn làm việc", tắt máy là mất |
| Ổ cứng (HDD/SSD) | Lưu trữ lâu dài — "tủ hồ sơ" |
| Hệ điều hành (OS) | "Người quản lý" điều phối tất cả |
| Chương trình | Phần mềm nằm trong ổ cứng (cuốn công thức) |
| Tiến trình | Chương trình đang chạy (đang nấu món ăn) |
| File / Thư mục | Giấy tờ / ngăn kéo chứa giấy tờ |
| Bit / Byte | Đơn vị đo dữ liệu; 1 byte = 8 bit ≈ 1 ký tự |

Bài tiếp theo, chúng ta sẽ rời văn phòng nhỏ này để xem chuyện gì xảy ra khi **hàng tỷ văn phòng nối với nhau** — đó chính là Internet.
