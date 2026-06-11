# Ngành tech có những nghề gì

Khi nghe đến "làm IT" hay "làm tech", nhiều người tưởng tượng ngay một người ngồi gõ phím cả ngày trước màn hình đen đầy chữ. Thực tế, ngành công nghệ giống như một... nhà hàng lớn: có đầu bếp, có người thiết kế thực đơn, có người nếm thử món ăn, có quản lý điều phối, có người lo chuyện bếp núc điện nước. Mỗi người một việc, và **không phải ai cũng phải "nấu ăn" (viết code)**.

Bài này sẽ dẫn bạn đi một vòng "nhà hàng tech", xem từng nghề làm gì hằng ngày, cần học gì, và quan trọng nhất: **lộ trình của khoá học này phù hợp với nghề nào**.

## Bức tranh toàn cảnh: một sản phẩm tech được tạo ra như thế nào?

Hãy lấy ví dụ một ứng dụng quen thuộc: **app đặt đồ ăn** (kiểu GrabFood, ShopeeFood). Để app đó đến tay bạn, cần cả một đội:

| Vai trò | Ví dụ trong app đặt đồ ăn |
|---|---|
| **Designer** (nhà thiết kế) | Vẽ giao diện: nút "Đặt món" màu gì, đặt ở đâu cho dễ bấm |
| **PM/BA** (quản lý sản phẩm / phân tích nghiệp vụ) | Quyết định app cần tính năng gì: "Tháng này làm tính năng theo dõi shipper trên bản đồ" |
| **Frontend Developer** | Lập trình phần bạn nhìn thấy: màn hình, nút bấm, hiệu ứng |
| **Backend Developer** | Lập trình phần "hậu trường": lưu đơn hàng, tính tiền, tìm shipper gần nhất |
| **Mobile Developer** | Làm app chạy trên điện thoại iPhone/Android |
| **DevOps/Cloud Engineer** | Đảm bảo hệ thống chạy ổn định khi 1 triệu người cùng đặt món lúc 12h trưa |
| **Data Analyst/Engineer** | Phân tích dữ liệu: "Món gà rán bán chạy nhất khung giờ nào?" |
| **QA/Tester** | Kiểm tra app trước khi phát hành: bấm thử mọi nút, cố tình làm app "gãy" để tìm lỗi |

> 💡 **Ghi nhớ**: Một sản phẩm tech là công sức của cả đội nhiều vai trò, không phải chỉ của "lập trình viên". Bạn có thể vào ngành tech qua nhiều cánh cửa khác nhau.

Giờ ta đi sâu vào từng nghề.

---

## 1. Developer (Lập trình viên) — người "xây nhà" bằng code

**Developer** (còn gọi là **dev**, lập trình viên) là người viết **code** — tức là viết các câu lệnh để máy tính hiểu và làm theo. Nếu sản phẩm tech là một ngôi nhà, dev là thợ xây. Nghề này lại chia thành nhiều nhánh:

### 1.1. Frontend Developer (FE) — người làm "mặt tiền"

**Frontend** (phần giao diện, "mặt trước") là tất cả những gì bạn **nhìn thấy và chạm vào** trên một trang web: nút bấm, menu, hình ảnh, form đăng nhập.

**Một ngày làm việc điển hình:**
- Nhận bản thiết kế từ Designer (một bức ảnh tĩnh vẽ giao diện)
- "Biến" bức ảnh đó thành trang web thật — bấm được, cuộn được, hiện đúng trên cả điện thoại lẫn máy tính
- Sửa các lỗi kiểu "nút này trên iPhone bị lệch sang trái"

**Cần học gì:** HTML, CSS, JavaScript (ba "ngôn ngữ" nền tảng của web — sẽ giải thích kỹ ở bài sau), sau đó là một **framework** (bộ khung công cụ làm sẵn) như React.

**Phù hợp với ai:** người thích cái đẹp, tỉ mỉ về giao diện, muốn thấy kết quả ngay lập tức trên màn hình.

### 1.2. Backend Developer (BE) — người làm "nhà bếp"

**Backend** (phần "hậu trường") là mọi thứ chạy phía sau mà bạn không nhìn thấy. Khi bạn bấm "Đặt món", chuyện gì xảy ra? Đơn hàng được lưu vào đâu? Ai tính tiền? Ai kiểm tra mã giảm giá còn hạn không? Tất cả là việc của backend.

**So sánh đời thường:** frontend là khu vực bàn ghế, thực đơn của nhà hàng — nơi khách ngồi. Backend là **nhà bếp** — khách không thấy, nhưng món ăn được làm ra ở đó.

**Một ngày làm việc điển hình:**
- Viết **API** (giao diện lập trình — hiểu nôm na là "cửa giao món" giữa nhà bếp và khu khách ngồi: frontend gọi món, backend trả món ra)
- Thiết kế **database** (cơ sở dữ liệu — cái "tủ hồ sơ khổng lồ" lưu thông tin người dùng, đơn hàng)
- Tối ưu để hệ thống xử lý được nhiều người dùng cùng lúc

**Cần học gì:** một ngôn ngữ lập trình (Python, Java, JavaScript/Node.js...), database, cách hoạt động của Internet và **server** (máy chủ — máy tính chạy 24/7 để phục vụ người dùng).

**Phù hợp với ai:** người thích logic, giải đố, không quá quan tâm đến "đẹp hay xấu" mà quan tâm "chạy đúng và nhanh không".

### 1.3. Fullstack Developer — người làm cả hai

**Fullstack** = frontend + backend. Giống một đầu bếp vừa nấu ăn vừa biết bưng bê phục vụ. Nghe "xịn" nhưng thực tế đa số fullstack dev **mạnh một bên, biết đủ dùng bên còn lại**. Người mới không nên đặt mục tiêu fullstack ngay từ đầu — hãy giỏi một mảng trước.

### 1.4. Mobile Developer — người làm app điện thoại

Chuyên làm ứng dụng chạy trên điện thoại: **iOS** (iPhone, học ngôn ngữ Swift) hoặc **Android** (học Kotlin), hoặc dùng công cụ "viết một lần chạy cả hai" như Flutter, React Native.

**Phù hợp với ai:** người mê điện thoại, muốn sản phẩm của mình nằm trên App Store/Google Play.

---

## 2. DevOps / Cloud Engineer — người "giữ cho đèn luôn sáng"

Đây là nghề nghe lạ tai nhất với người ngoài ngành, nhưng lại **cực kỳ quan trọng và đang rất "khát" nhân lực**.

**DevOps** (ghép từ Development + Operations: phát triển + vận hành) và **Cloud Engineer** (kỹ sư điện toán đám mây) là những người đảm bảo phần mềm **chạy ổn định ngoài đời thật**.

**So sánh đời thường:** dev xây xong ngôi nhà (viết xong code), nhưng ai lo kéo điện, nước, Internet vào nhà? Ai đảm bảo nhà không sập khi 1.000 khách kéo đến cùng lúc? Ai dựng hệ thống báo cháy? Đó là DevOps/Cloud.

**Cloud** (điện toán đám mây) là gì? Thay vì công ty tự mua máy chủ về đặt trong văn phòng, họ **thuê máy chủ qua Internet** từ các ông lớn như **AWS** (Amazon Web Services), Google Cloud, Microsoft Azure. Giống như thay vì tự đào giếng, bạn dùng nước máy — trả tiền theo lượng dùng, không phải lo bảo trì giếng.

**Một ngày làm việc điển hình:**
- Cài đặt và cấu hình hệ thống trên cloud (chọn loại máy chủ, cài bảo mật, nối các dịch vụ với nhau)
- Xây dựng **pipeline tự động** (dây chuyền tự động): dev vừa viết xong code, hệ thống tự kiểm tra và tự đưa lên cho người dùng — không cần làm tay
- Theo dõi hệ thống: nửa đêm app sập thì nhận cảnh báo và xử lý
- Tối ưu chi phí: "Tháng này tiền cloud tăng gấp đôi, vì sao?"

**Cần học gì:** hệ điều hành Linux, mạng máy tính, một nền tảng cloud (thường bắt đầu với AWS), và biết viết **script** (đoạn code nhỏ để tự động hoá việc lặp đi lặp lại).

**Phù hợp với ai:** người thích "hệ thống", thích mày mò cài đặt, thích cảm giác giữ cho mọi thứ chạy trơn tru. Không cần khiếu thẩm mỹ, không cần làm giao diện.

---

## 3. Nghề Data — người "đọc vị" dữ liệu

Mỗi cú bấm, mỗi đơn hàng, mỗi lượt xem đều tạo ra **dữ liệu** (data). Dữ liệu là "dầu mỏ" của thời đại số — nhưng dầu thô phải lọc mới dùng được. Nghề data chia làm vài nhánh:

| Nghề | Làm gì (nói đơn giản) | Ví dụ |
|---|---|---|
| **Data Analyst** (phân tích dữ liệu) | Nhìn vào số liệu, rút ra kết luận giúp sếp ra quyết định | "Khách bỏ giỏ hàng nhiều nhất ở bước nhập địa chỉ → nên đơn giản hoá bước này" |
| **Data Engineer** (kỹ sư dữ liệu) | Xây "đường ống" gom dữ liệu từ khắp nơi về một chỗ, sạch sẽ, sẵn sàng để phân tích | Như xây hệ thống ống nước dẫn về nhà máy lọc |
| **Data Scientist / AI-ML Engineer** | Dùng toán + code để dạy máy tính dự đoán | "Dự đoán khách nào sắp huỷ gói đăng ký", xây chatbot AI |

**Cần học gì:** Data Analyst cần Excel, **SQL** (ngôn ngữ truy vấn dữ liệu — cách "hỏi chuyện" cái tủ hồ sơ database), công cụ vẽ biểu đồ; ít code nhất trong nhóm tech. Data Engineer cần kỹ năng gần giống Backend. Data Scientist cần toán nhiều nhất (xác suất, thống kê).

**Phù hợp với ai:** người thích con số, thích đặt câu hỏi "tại sao", có tư duy phân tích. Data Analyst là cửa vào ngành tech khá "mềm" cho người trái ngành.

---

## 4. QA / Tester — người "vạch lá tìm sâu"

**QA** (Quality Assurance — đảm bảo chất lượng) hay **Tester** (người kiểm thử) là người **cố tình tìm cách làm hỏng phần mềm trước khi khách hàng kịp làm hỏng nó**.

**So sánh đời thường:** giống người kiểm định ô tô trước khi xuất xưởng — thử phanh gấp, thử đóng cửa mạnh, thử đổ nhầm nhiên liệu... để chắc chắn xe an toàn.

**Một ngày làm việc điển hình:**
- Đọc mô tả tính năng mới, nghĩ ra mọi kịch bản có thể xảy ra: "Nếu người dùng nhập số điện thoại toàn chữ thì sao? Nếu mất mạng giữa chừng thì sao?"
- Bấm thử theo kịch bản, ghi lại lỗi (gọi là **bug** — "con bọ") và báo cho dev sửa
- Tester giỏi hơn sẽ viết **automation test** (kiểm thử tự động): viết code để máy tự bấm thử hàng nghìn kịch bản

**Cần học gì:** tư duy phản biện, kỹ năng viết kịch bản kiểm thử; ban đầu **không bắt buộc biết code** (manual tester), về sau nên học code để làm automation (lương cao hơn đáng kể).

**Phù hợp với ai:** người cẩn thận, hay "soi", kiên nhẫn. Đây cũng là một cửa vào ngành phổ biến cho người trái ngành.

---

## 5. PM / BA — người "cầm trịch"

Hai nghề này **gần như không viết code**, nhưng làm việc sát sườn với đội kỹ thuật:

- **PM** (Product Manager — quản lý sản phẩm): quyết định sản phẩm **nên làm gì tiếp theo và vì sao**. Giống nhạc trưởng — không chơi nhạc cụ nào nhưng cả dàn nhạc nhìn vào để phối hợp. Hằng ngày: nói chuyện với khách hàng, sắp thứ tự ưu tiên tính năng, họp với dev/designer, theo dõi tiến độ.
- **BA** (Business Analyst — phân tích nghiệp vụ): cầu nối "phiên dịch" giữa người kinh doanh và người kỹ thuật. Khách nói "tôi muốn quản lý kho dễ hơn" → BA chuyển thành mô tả chi tiết để dev hiểu chính xác phải xây gì.

**Cần học gì:** kỹ năng giao tiếp, viết tài liệu rõ ràng, hiểu quy trình làm phần mềm, biết dùng công cụ quản lý dự án. Hiểu tech ở mức "nói chuyện được với dev" chứ không cần code.

**Phù hợp với ai:** người giỏi giao tiếp, tổ chức, thích làm việc với con người hơn với máy.

---

## 6. Designer — người "vẽ" trải nghiệm

Trong tech, designer chủ yếu là **UI/UX Designer**:

- **UI** (User Interface — giao diện người dùng): sản phẩm trông **như thế nào** — màu sắc, font chữ, bố cục. 
- **UX** (User Experience — trải nghiệm người dùng): dùng sản phẩm **cảm thấy ra sao** — có dễ hiểu không, mấy bước thì đặt được hàng, có chỗ nào gây bực mình không.

**So sánh đời thường:** UI là nội thất ngôi nhà đẹp hay xấu; UX là ở trong nhà có **tiện** không — công tắc đèn có nằm đúng chỗ tay với tới không.

**Cần học gì:** công cụ thiết kế (phổ biến nhất là Figma), nguyên tắc thẩm mỹ và tâm lý người dùng. **Không cần code.**

**Phù hợp với ai:** người có gu thẩm mỹ, thích quan sát hành vi con người.

---

## Vậy khoá học này dẫn bạn đến nghề nào?

Lộ trình của trang web này được thiết kế cho hướng **Backend và Cloud/DevOps** — cụ thể là nền tảng máy tính, Internet, rồi tiến tới **AWS** (nền tảng cloud phổ biến nhất thế giới) và các chứng chỉ AWS.

Vì sao hướng này đáng đi với người mới?

1. **Nhu cầu tuyển dụng lớn và bền**: mọi công ty đưa hệ thống lên cloud đều cần người làm backend và vận hành cloud.
2. **Có chứng chỉ làm "bằng chứng"**: với cloud, các chứng chỉ AWS được nhà tuyển dụng công nhận rộng rãi — người trái ngành có thứ "trưng ra" thay cho bằng cấp IT.
3. **Không đòi hỏi khiếu thẩm mỹ**: hợp với người thích logic, hệ thống.
4. **Kiến thức nền dùng được cho nhiều nghề**: hiểu máy tính, Internet, server là nền tảng chung — sau này rẽ sang Data Engineer hay Backend đều tận dụng được.

> 💡 **Ghi nhớ**: Học xong nền tảng ở khoá này, bạn chưa cần chốt nghề ngay. Nền "máy tính + Internet + cloud" là mẫu số chung — rẽ hướng nào cũng không phí.

---

## Hai câu hỏi ai cũng lo: Toán và Tiếng Anh

### Toán — cần ít hơn bạn tưởng rất nhiều

| Nghề | Mức toán thật sự cần |
|---|---|
| Frontend, Mobile, QA, PM/BA, Designer | Toán cấp 2 là đủ (cộng trừ nhân chia, tư duy logic) |
| Backend, DevOps/Cloud, Data Engineer | Logic tốt + chút toán rời rạc cơ bản; **không cần** giải tích, đạo hàm |
| Data Analyst | Thống kê cơ bản (trung bình, phần trăm — học lại được trong vài tuần) |
| Data Scientist / AI | Đây mới là nghề cần toán thật: xác suất thống kê, đại số tuyến tính |

Cái ngành này cần là **tư duy logic** — khả năng chia nhỏ vấn đề và suy luận từng bước — chứ không phải giải phương trình. Logic rèn được qua luyện tập, không phải năng khiếu trời cho.

### Tiếng Anh — quan trọng hơn toán, nhưng chỉ cần ĐỌC

Sự thật: **tài liệu tốt nhất của ngành đều bằng tiếng Anh**. Nhưng mức cần thiết là:

- **Bắt buộc**: đọc hiểu tài liệu kỹ thuật (từ vựng lặp lại rất nhiều, đọc 2-3 tháng là quen), tra Google bằng tiếng Anh.
- **Chưa cần ngay**: nghe nói trôi chảy. Làm công ty Việt Nam thì giao tiếp tiếng Việt; tiếng Anh nói chỉ cần khi làm công ty nước ngoài (lương cao hơn — đó là động lực học dần).
- **Mẹo**: vừa học tech vừa học tiếng Anh qua chính tài liệu tech — một công đôi việc.

> ⚠️ **Lỗi người mới hay gặp**: Trì hoãn học tech "chờ giỏi tiếng Anh đã". Sai thứ tự! Cứ học tech bằng tiếng Việt trước (như khoá này), gặp thuật ngữ Anh thì nhặt dần. Tiếng Anh kỹ thuật chỉ quanh quẩn vài trăm từ.

> ⚠️ **Lỗi người mới hay gặp**: Học dàn trải "mỗi nghề một ít" vì sợ chọn sai. Kết quả là biết mỗi thứ một chút, không đủ sâu để xin việc. Hãy chọn MỘT hướng, đi sâu 6-12 tháng, rồi mới tính chuyện rẽ nhánh.

---

## Bảng tổng kết nhanh

| Nghề | Có cần code? | Toán | Tiếng Anh | Hợp với người... |
|---|---|---|---|---|
| Frontend Dev | Có | Ít | Đọc hiểu | thích giao diện, thấy kết quả ngay |
| Backend Dev | Có | Logic tốt | Đọc hiểu | thích giải đố, hệ thống |
| Mobile Dev | Có | Ít | Đọc hiểu | mê app điện thoại |
| DevOps/Cloud | Có (script) | Ít | Đọc hiểu | thích vận hành, mày mò hệ thống |
| Data Analyst | Ít (SQL) | Thống kê cơ bản | Đọc hiểu | thích con số, đặt câu hỏi |
| QA/Tester | Ban đầu không | Ít | Đọc hiểu | cẩn thận, hay "soi" |
| PM/BA | Không | Ít | Đọc + giao tiếp | giỏi nói chuyện, tổ chức |
| Designer | Không | Ít | Đọc hiểu | có gu thẩm mỹ |

## Tóm tắt bài học

- Ngành tech có **nhiều nghề**, không phải ai cũng viết code: dev (FE/BE/fullstack/mobile), DevOps/Cloud, Data, QA, PM/BA, Designer.
- Mỗi nghề có một "tính cách" phù hợp — chọn theo điểm mạnh của bạn, không chọn theo trend.
- **Khoá học này đi theo hướng Backend/Cloud (AWS)** — hướng có nhu cầu cao, có chứng chỉ làm bằng chứng năng lực, hợp người trái ngành.
- Toán: hầu hết các nghề chỉ cần **logic**, không cần toán cao cấp (trừ Data Science/AI).
- Tiếng Anh: cần **đọc hiểu** là chính, học song song với tech, đừng chờ giỏi mới bắt đầu.

Bài tiếp theo, chúng ta sẽ bóc tách xem **bên trong một chiếc máy tính có gì** — bước đầu tiên trên con đường Backend/Cloud của bạn.
