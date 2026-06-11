# Scaling & Stateless Design

Hãy tưởng tượng bạn mở một quán phở. Ngày đầu chỉ có 10 khách, một mình bạn vừa nấu vừa bưng vẫn ổn. Rồi quán lên báo, mỗi ngày 1.000 khách kéo đến. Bạn có hai lựa chọn: **tự luyện thành siêu đầu bếp nấu nhanh gấp 100 lần** (gần như bất khả thi), hoặc **thuê thêm 10 đầu bếp với 10 bếp giống hệt nhau** (hoàn toàn khả thi). Toàn bộ bài học hôm nay xoay quanh đúng lựa chọn đó — và những hệ quả thiết kế đi kèm khi bạn chọn "thuê thêm người".

## 1. Vertical scaling vs Horizontal scaling

### 1.1. Hai cách để "to" hơn

Khi hệ thống quá tải, có hai hướng mở rộng:

- **Vertical scaling (scale up)**: làm cho **một máy** mạnh hơn — thêm CPU, thêm RAM, ổ đĩa nhanh hơn. Giống như thay đầu bếp thường bằng một siêu đầu bếp.
- **Horizontal scaling (scale out)**: thêm **nhiều máy** giống nhau cùng chia tải. Giống như thuê thêm nhiều đầu bếp bình thường.

```
Vertical (scale up):            Horizontal (scale out):

   ┌─────────┐                  ┌───┐ ┌───┐ ┌───┐ ┌───┐
   │  MÁY    │                  │ M │ │ M │ │ M │ │ M │
   │  KHỔNG  │                  └───┘ └───┘ └───┘ └───┘
   │  LỒ     │                    nhiều máy nhỏ, chia tải
   └─────────┘
   một máy ngày càng to
```

### 1.2. Bảng so sánh

| Tiêu chí | Vertical (scale up) | Horizontal (scale out) |
|---|---|---|
| Cách làm | Nâng cấp phần cứng một máy | Thêm máy mới giống nhau |
| Giới hạn | Có trần cứng (máy to nhất thị trường) | Gần như không có trần |
| Chi phí | Tăng phi tuyến (máy to gấp đôi thường đắt hơn gấp đôi) | Tăng gần tuyến tính |
| Downtime khi nâng cấp | Thường phải restart/thay máy | Thêm máy mới không ảnh hưởng máy cũ |
| Chịu lỗi (fault tolerance) | Máy chết = sập toàn bộ (single point of failure) | Một máy chết, các máy khác gánh |
| Độ phức tạp phần mềm | Thấp — code không cần đổi | Cao hơn — cần load balancer, stateless design |

### 1.3. Vì sao horizontal thắng?

Vertical scaling đơn giản nhưng có **ba điểm chết**:

1. **Có trần**: đến một lúc, không tồn tại máy nào to hơn để mua.
2. **Đắt phi tuyến**: máy mạnh gấp 2 thường đắt gấp 3–4 lần.
3. **Một điểm hỏng duy nhất**: máy duy nhất ấy chết là cả hệ thống chết.

Horizontal scaling giải quyết cả ba: không trần, chi phí tuyến tính, và một máy hỏng chỉ làm giảm công suất chứ không sập hệ thống. Đây là lý do toàn bộ kiến trúc cloud hiện đại (và toàn bộ triết lý của AWS) xây quanh horizontal scaling.

> 💡 **Ghi nhớ**: Vertical scaling là "mua máy to hơn" — đơn giản nhưng có trần và là single point of failure. Horizontal scaling là "mua nhiều máy" — gần như vô hạn, chịu lỗi tốt, nhưng **đòi hỏi ứng dụng phải được thiết kế để chạy trên nhiều máy**. Cái giá phải trả cho horizontal scaling chính là chủ đề của phần tiếp theo: stateless design.

## 2. Stateless vs Stateful — cái giá của horizontal scaling

### 2.1. Vấn đề: "máy nào cũng phải như nhau"

Horizontal scaling chỉ hoạt động nếu **request nào rơi vào máy nào cũng được**. Quay lại quán phở: nếu khách gọi món với đầu bếp A, thì đầu bếp B cũng phải phục vụ được khách đó y hệt — muốn vậy, **thông tin về khách không được nằm trong đầu của riêng đầu bếp A**, mà phải ghi vào một cuốn sổ chung.

Trong phần mềm, "thông tin về khách" chính là **state** — ví dụ session đăng nhập, giỏ hàng, dữ liệu upload dở.

### 2.2. Server stateful — và vì sao nó cản trở scaling

Một server **stateful** lưu state của user ngay trong bộ nhớ/đĩa của chính nó:

```
User Lan ──▶ Server 1  (RAM: "Lan đã login, giỏ hàng: 2 áo")
User Lan ──▶ Server 2  (RAM: ??? — "Lan là ai?")  ✗ LỖI
```

Hệ quả:
- Load balancer buộc phải **ghim** user vào đúng một server (sticky session) — tải lệch, khó cân bằng.
- Server đó chết là **mất sạch session** của mọi user trên nó.
- Không thể thêm/bớt server tự do, vì thêm server mới thì server đó "không biết gì" về user cũ.

### 2.3. Server stateless — externalize session

Giải pháp: server **không giữ state nào của user** giữa các request. Mọi state được **đẩy ra ngoài (externalize)** vào một nơi lưu trữ chung — thường là một in-memory store như Redis, hoặc database.

```
              ┌──────────────┐
User Lan ──▶  │ Server 1/2/3 │ ── đọc/ghi session ──▶ ┌─────────────┐
 (request     │ (bất kỳ máy  │                        │ Redis / DB  │
  nào cũng    │  nào cũng    │                        │ (sổ chung)  │
  được)       │  xử lý được) │                        └─────────────┘
              └──────────────┘
```

Khi server stateless:
- **Máy nào cũng thay thế được nhau** → load balancer chia tải tự do.
- **Thêm máy = thêm công suất ngay lập tức**, không cần "làm nóng" dữ liệu.
- **Máy chết không mất gì** — state vẫn nằm an toàn ở store chung.
- Đây cũng là tiền đề cho **auto scaling**: máy được tạo ra và huỷ đi liên tục, nên không được phép chứa gì quý giá.

| | Stateful tier | Stateless tier |
|---|---|---|
| State của user nằm ở | Trong từng server | Store chung bên ngoài (Redis/DB) |
| Server hỏng | Mất session | Không mất gì |
| Thêm server | Phức tạp | Cắm vào là chạy |
| Load balancing | Cần sticky session | Tự do hoàn toàn |

> 💡 **Ghi nhớ**: Quy tắc vàng của thiết kế cloud: **app tier phải stateless, state dồn về data tier**. Server ứng dụng nên được coi như "gia súc" (cattle) — giống nhau, thay thế được, huỷ lúc nào cũng được — chứ không phải "thú cưng" (pet) được nuôi nấng riêng.

## 3. Load balancing — người chia việc

Có nhiều máy rồi thì cần một "lễ tân" đứng trước để chia request — đó là **load balancer (LB)**. Client chỉ biết địa chỉ của LB; LB chọn server phía sau để chuyển request.

```
                    ┌────▶ Server 1
Client ──▶ [ LB ] ──┼────▶ Server 2
                    └────▶ Server 3   (✗ chết → LB tự loại ra)
```

### 3.1. Các thuật toán phổ biến

| Thuật toán | Cách hoạt động | Khi nào hợp |
|---|---|---|
| **Round robin** | Chia lần lượt: 1 → 2 → 3 → 1 → ... | Server giống nhau, request nhẹ đều nhau |
| **Weighted round robin** | Như trên nhưng máy mạnh nhận nhiều hơn (theo trọng số) | Server không đồng đều cấu hình |
| **Least connections** | Chuyển request đến server đang có ít kết nối nhất | Request có thời gian xử lý chênh lệch nhiều |
| **IP hash** | Hash địa chỉ IP client → luôn ra cùng một server | Cần "dính" user vào một server (khi chưa stateless được) |

### 3.2. Health check — LB còn là người gác cổng

LB định kỳ "hỏi thăm" từng server (ví dụ gọi `GET /health` mỗi 10 giây). Server nào không trả lời hoặc trả lỗi sẽ bị **loại khỏi danh sách chia tải** cho đến khi khoẻ lại. Nhờ vậy, một máy chết gần như vô hình với người dùng.

> 💡 **Ghi nhớ**: Load balancer làm hai việc: **chia tải** (theo thuật toán) và **phát hiện máy hỏng** (health check). Kết hợp với stateless design, nó biến "nhiều máy nhỏ" thành "một hệ thống lớn đáng tin cậy" trong mắt client.

## 4. Auto scaling — thêm bớt máy tự động

### 4.1. Vấn đề: tải không phẳng

Tải thực tế lên xuống theo giờ, theo ngày, theo sự kiện:

```
Tải  ▲           ███
     │          █████          Nếu mua máy cho ĐỈNH tải:
     │    ██   ███████              → lãng phí lúc thấp điểm
     │  █████ █████████        Nếu mua máy cho ĐÁY tải:
     │ ███████████████████         → sập lúc cao điểm
     └─────────────────────▶ thời gian
      đêm   sáng  giờ vàng
```

Trước thời cloud, bạn buộc phải mua phần cứng theo đỉnh tải và chịu lãng phí. Cloud cho phép cách thứ ba: **số lượng máy co giãn theo tải thực tế**.

### 4.2. Ý tưởng: metric-based scaling

Auto scaling hoạt động theo vòng lặp đơn giản:

1. **Đo (metric)**: theo dõi một chỉ số phản ánh độ bận — phổ biến nhất là CPU trung bình, ngoài ra có số request/giây, độ dài hàng đợi, latency.
2. **So sánh với ngưỡng (threshold)**: ví dụ "CPU trung bình > 70% trong 5 phút".
3. **Hành động**: vượt ngưỡng trên → **thêm máy** (scale out); dưới ngưỡng dưới (ví dụ CPU < 30%) → **bớt máy** (scale in).
4. Máy mới tự đăng ký vào load balancer và bắt đầu nhận tải.

Kèm theo là các tham số an toàn: **min** (số máy tối thiểu, để không bao giờ về 0), **max** (trần chi phí), và **cooldown** (chờ một lúc sau mỗi lần thay đổi để metric ổn định, tránh thêm-bớt giật cục).

### 4.3. Vì sao auto scaling cần stateless?

Hãy nối các mảnh lại: auto scaling **tạo và huỷ máy liên tục, không báo trước**. Nếu server chứa session trong RAM, mỗi lần scale in là một đợt user bị đăng xuất oan. Chỉ khi app tier stateless, máy mới "sống chết vô danh" mà người dùng không hề hay biết.

> 💡 **Ghi nhớ**: Auto scaling = **metric → ngưỡng → thêm/bớt máy**, trong khung min/max. Nó chỉ thực sự hoạt động trơn tru khi app tier đã stateless. Đây là sự kết hợp kinh điển: Load balancer + Auto scaling + Stateless app = kiến trúc web co giãn chuẩn cloud.

## 5. Caching — đừng nấu lại tô phở đã nấu

Scaling không chỉ là thêm máy; cách rẻ nhất để chịu thêm tải là **đừng làm lại việc đã làm**. Cache là bản sao tạm của kết quả, đặt ở nơi truy cập nhanh hơn nguồn gốc.

### 5.1. Bốn tầng cache, từ gần user đến gần dữ liệu

```
User ──▶ [1.Browser cache] ──▶ [2.CDN] ──▶ App ──▶ [3.App cache] ──▶ [4.DB cache] ──▶ Database
          trên máy user        edge gần      Redis/Memcached      buffer của DB
                               user
```

| Tầng | Nằm ở đâu | Cache cái gì | Ví dụ đời thường |
|---|---|---|---|
| **Client (browser)** | Máy người dùng | Ảnh, CSS, JS, response API | Nhớ sẵn đường về nhà, không cần hỏi lại |
| **CDN** | Server đặt rải khắp thế giới, gần user | Nội dung tĩnh, video, ảnh | Kho hàng đặt sẵn ở từng tỉnh thay vì kho tổng |
| **Application cache** | Redis/Memcached cạnh app server | Kết quả query, session, dữ liệu hay đọc | Tờ giấy note dán trước mặt thay vì lục tủ hồ sơ |
| **Database cache** | Trong chính DB (buffer pool) | Trang dữ liệu hay đọc, nằm sẵn trong RAM | Hồ sơ hay dùng để trên bàn thay vì trong kho |

### 5.2. Hai vấn đề muôn thuở của cache

- **Cache hit / miss**: hit là tìm thấy trong cache (nhanh), miss là phải về nguồn lấy (chậm). Tỷ lệ hit càng cao, hệ thống càng nhẹ tải.
- **Cache invalidation (làm tươi dữ liệu)**: dữ liệu gốc đổi rồi mà cache còn bản cũ thì user thấy dữ liệu **stale** (cũ). Cách phổ biến: đặt **TTL** (time-to-live — bản cache tự hết hạn sau X giây), hoặc chủ động xoá cache khi ghi dữ liệu mới. Đây là một trong những bài toán khó nhất ngành — chấp nhận đánh đổi giữa "tươi" và "nhanh".

> 💡 **Ghi nhớ**: Cache là cách scale rẻ nhất: phục vụ lại kết quả cũ thay vì tính lại. Có 4 tầng: **client → CDN → app cache → DB cache**. Mặt trái duy nhất nhưng dai dẳng: dữ liệu có thể **stale**, kiểm soát bằng TTL và chiến lược invalidation.

## 6. Database scaling — phần khó nhất

### 6.1. Vì sao DB khó scale hơn app?

App tier scale dễ vì ta đã **đuổi hết state ra ngoài** — nhưng đuổi đi đâu? Về database. Tức là **database chính là nơi state dồn về**, và state thì không thể "stateless hoá" được nữa:

- Mỗi app server là bản sao y hệt nhau → thêm thoải mái.
- Nhưng nếu nhân đôi database, ta có **hai bản dữ liệu phải luôn khớp nhau**. Một lệnh ghi vào bản A phải xuất hiện ở bản B — đồng bộ qua mạng, có độ trễ, có thể lỗi. Nếu hai user cùng lúc ghi vào hai bản khác nhau thì bản nào đúng?

Đây là bài toán **consistency** (nhất quán) — bản chất của hệ phân tán, và là lý do người ta nói: *app scaling là bài toán đã giải xong, database scaling là bài toán phải đánh đổi*.

### 6.2. Read replica — scale phần đọc trước

Quan sát then chốt: đa số ứng dụng **đọc nhiều hơn ghi rất nhiều** (xem sản phẩm: nghìn lần; đặt hàng: một lần). Vậy hãy tách hai luồng:

- **Primary** (bản chính): nhận toàn bộ lệnh **ghi** (INSERT/UPDATE/DELETE).
- **Read replica** (bản sao chỉ đọc): nhận các lệnh **đọc** (SELECT). Dữ liệu được sao chép (replicate) từ primary sang, thường là **bất đồng bộ**.

```
            ghi (write)
  App ────────────────────▶ [ PRIMARY ]
   │                             │ replication (trễ vài ms~s)
   │        đọc (read)           ▼
   ├──────────────────────▶ [ Replica 1 ]
   └──────────────────────▶ [ Replica 2 ]   ← muốn thêm sức đọc? thêm replica
```

Lợi ích: tải đọc được chia ra nhiều máy — đọc scale gần như app tier. Ngoài ra replica còn là bản dự phòng nóng khi primary gặp sự cố.

Cái giá: **replication lag** — replica chậm hơn primary một nhịp. User vừa đổi avatar (ghi vào primary), refresh ngay (đọc từ replica chưa kịp đồng bộ) → vẫn thấy avatar cũ vài giây. Hiện tượng này gọi là **eventual consistency**: rồi sẽ nhất quán, nhưng không phải ngay lập tức.

### 6.3. Còn phần ghi thì sao?

Read replica không giúp gì cho **write** — mọi lệnh ghi vẫn dồn vào một primary. Khi write quá tải, các lựa chọn đều đau đớn hơn: scale up primary (quay lại vertical với trần của nó), **sharding** (chia dữ liệu thành nhiều mảnh, mỗi mảnh một DB — phức tạp hơn hẳn, sẽ học ở bài sau), hoặc đổi sang loại database thiết kế sẵn cho phân tán. Hiểu được "đọc dễ scale, ghi khó scale" là đã nắm được nửa môn thiết kế hệ thống.

> 💡 **Ghi nhớ**: Database khó scale vì nó **giữ state phải nhất quán giữa các bản sao**. Chiến lược chuẩn: **read replica** để chia tải đọc (chấp nhận replication lag / eventual consistency), còn tải ghi vẫn về một primary — khi ghi quá tải mới phải dùng đến sharding.

## 7. Ghép tất cả lại — kiến trúc web co giãn kinh điển

```
User ──▶ CDN ──▶ Load Balancer ──▶ App servers (stateless, auto scaling)
                                        │
                            ┌───────────┼───────────────┐
                            ▼           ▼               ▼
                       Cache (Redis)  DB Primary ──▶ Read Replicas
                       session +      (write)        (read)
                       hot data
```

Đọc sơ đồ này từ trái sang phải, bạn sẽ thấy đủ cả bài: CDN cache nội dung gần user; LB chia tải và loại máy hỏng; app tier stateless nên auto scaling tự do thêm bớt; session và dữ liệu nóng nằm trong cache chung; database tách đọc/ghi bằng read replica. Đây gần như là "bộ khung mẫu" mà mọi câu hỏi thiết kế hệ thống — và mọi kiến trúc tham chiếu của AWS — xoay quanh.

## Liên hệ sang AWS

Các khái niệm hôm nay map gần như 1-1 sang dịch vụ AWS mà bạn sẽ gặp trong CLF/SAA/DVA:

| Khái niệm trong bài | Dịch vụ AWS tương ứng |
|---|---|
| Horizontal scaling app tier | **EC2 Auto Scaling** (Auto Scaling Group với min/max/desired, scaling policy theo metric như CPU) |
| Load balancer + health check | **Elastic Load Balancing** (ALB/NLB) |
| Externalize session / app cache (Redis, Memcached) | **Amazon ElastiCache** (Redis/Memcached), session nhỏ còn có thể dùng **DynamoDB** |
| CDN | **Amazon CloudFront** |
| Read replica, replication lag | **Amazon RDS Read Replicas** (và Aurora Replicas) |
| Metric để auto scaling theo dõi | **Amazon CloudWatch** |

Khi đọc đề thi AWS, hễ thấy "users lose their session when an instance is terminated" → nghĩ ngay đến externalize session sang ElastiCache/DynamoDB; thấy "database read traffic is overwhelming" → RDS read replica; thấy "traffic varies during the day" → Auto Scaling Group sau một ALB. Bạn vừa học xong phần "vì sao" đứng đằng sau cả ba đáp án đó.
