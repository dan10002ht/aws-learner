# Từ máy chủ vật lý đến ảo hoá & container

Trước khi học bất kỳ chứng chỉ AWS nào, bạn cần trả lời được một câu hỏi nền tảng: **"Cloud thực chất chạy trên cái gì?"**. Câu trả lời là một hành trình tiến hoá hơn 20 năm: từ những chiếc máy chủ vật lý cồng kềnh → ảo hoá (virtualization) → container → và cuối cùng là serverless. Bài này sẽ đi qua từng chặng, giải thích **tại sao** mỗi bước tiến hoá ra đời, chứ không chỉ "nó là gì".

## 1. Máy chủ vật lý — nơi mọi thứ bắt đầu

### 1.1. Máy chủ (server) là gì?

Về bản chất, **máy chủ vật lý (physical server / bare metal)** chỉ là một chiếc máy tính — có CPU, RAM, ổ cứng, card mạng — nhưng được thiết kế để:

- Chạy **liên tục 24/7** (linh kiện bền hơn, có nguồn dự phòng).
- **Phục vụ nhiều người khác** qua mạng, thay vì phục vụ một người ngồi trước màn hình.

Hãy tưởng tượng sự khác biệt giữa **bếp nhà bạn** và **bếp nhà hàng**: cả hai đều nấu ăn được, nhưng bếp nhà hàng được thiết kế để phục vụ hàng trăm khách mỗi ngày, không được phép "nghỉ ốm".

### 1.2. Datacenter — "chung cư" của máy chủ

Một công ty lớn không chỉ có 1 máy chủ mà có hàng nghìn chiếc. Chúng được đặt trong **datacenter (trung tâm dữ liệu)** — một toà nhà chuyên dụng với:

| Thành phần | Vai trò | Ví dụ đời thường |
|---|---|---|
| Rack (tủ rack) | Giá đỡ xếp máy chủ theo tầng | Kệ sách nhiều ngăn |
| Điện dự phòng (UPS, máy phát) | Không bao giờ mất điện | Máy phát điện bệnh viện |
| Hệ thống làm mát | Máy chủ toả nhiệt rất lớn | Điều hoà công nghiệp |
| Mạng tốc độ cao | Kết nối nội bộ và ra Internet | Đường cao tốc riêng |
| An ninh vật lý | Kiểm soát ai được vào | Bảo vệ, vân tay, camera |

```
            DATACENTER
  +--------------------------------+
  |  [Rack 1]  [Rack 2]  [Rack 3]  |
  |  |server|  |server|  |server|  |
  |  |server|  |server|  |server|  |
  |  |server|  |server|  |server|  |
  |                                |
  |  Điện dự phòng | Làm mát | Mạng|
  +--------------------------------+
```

### 1.3. Vấn đề của thời kỳ "mỗi ứng dụng một máy chủ"

Trước năm ~2005, cách làm phổ biến là: mỗi ứng dụng quan trọng chạy trên **một máy chủ riêng** (để chúng không "giẫm chân" nhau). Hậu quả:

- **Lãng phí khủng khiếp**: máy chủ thường chỉ dùng 5–15% CPU. Giống như thuê nguyên một toà nhà chỉ để đặt một chiếc bàn làm việc.
- **Triển khai chậm**: muốn có máy chủ mới phải mua → chờ giao hàng → lắp đặt → cài đặt. Mất hàng tuần đến hàng tháng.
- **Khó co giãn**: lưu lượng tăng đột biến dịp lễ? Không kịp mua thêm máy. Hết lễ? Máy thừa nằm "đắp chiếu".

> 💡 **Ghi nhớ**: Động lực lớn nhất của mọi bước tiến hoá hạ tầng (ảo hoá → container → serverless) đều là **tăng mật độ sử dụng tài nguyên** và **rút ngắn thời gian từ ý tưởng đến triển khai**.

## 2. Ảo hoá (Virtualization) — chia một máy thật thành nhiều máy ảo

### 2.1. Ý tưởng cốt lõi

**Ảo hoá** là kỹ thuật dùng phần mềm để "cắt" một máy chủ vật lý thành nhiều **máy ảo (Virtual Machine — VM)**. Mỗi VM:

- Có CPU, RAM, ổ đĩa, card mạng **ảo** riêng.
- Chạy **hệ điều hành (OS) riêng** — VM này chạy Linux, VM kia chạy Windows, trên cùng một máy thật.
- **Tưởng rằng** mình đang chạy trên phần cứng thật — nó không hề biết mình là máy ảo.

Analogy: một **toà nhà (máy vật lý)** được chia thành nhiều **căn hộ (VM)**. Mỗi căn hộ có cửa khoá riêng, điện nước riêng, nội thất riêng — các hộ không nhìn thấy nhau, dù dùng chung móng nhà và hệ thống điện tổng.

### 2.2. Hypervisor — "ban quản lý toà nhà"

Phần mềm đứng giữa phần cứng thật và các VM gọi là **hypervisor**. Nhiệm vụ của nó: phân chia và điều phối tài nguyên thật (CPU, RAM, đĩa, mạng) cho từng VM, đồng thời **cách ly** chúng với nhau.

Có 2 loại hypervisor:

```
  TYPE 1 (bare-metal)            TYPE 2 (hosted)
  +------+ +------+ +------+     +------+ +------+
  | VM 1 | | VM 2 | | VM 3 |     | VM 1 | | VM 2 |
  +------+-+------+-+------+     +------+-+------+
  |       HYPERVISOR       |     |   HYPERVISOR   |
  +------------------------+     +----------------+
  |     PHẦN CỨNG THẬT     |     |  HỆ ĐIỀU HÀNH  |  ← (Windows/macOS của bạn)
  +------------------------+     +----------------+
                                 | PHẦN CỨNG THẬT |
                                 +----------------+
```

| Tiêu chí | Type 1 (bare-metal) | Type 2 (hosted) |
|---|---|---|
| Vị trí | Chạy **trực tiếp trên phần cứng** | Chạy **bên trên một OS** có sẵn |
| Hiệu năng | Cao (ít lớp trung gian) | Thấp hơn (qua thêm một lớp OS) |
| Dùng ở đâu | Datacenter, cloud (production) | Máy cá nhân (dev, học tập) |
| Ví dụ | VMware ESXi, KVM, Xen, AWS Nitro | VirtualBox, VMware Workstation, Parallels |

> 💡 **Ghi nhớ**: Cloud như AWS chạy trên **hypervisor Type 1**. Khi bạn tạo một "máy chủ" trên AWS (EC2 instance), thực chất bạn nhận một **VM** chạy trên hypervisor của AWS, đặt trong datacenter của AWS.

### 2.3. Lợi ích của việc tách phần mềm khỏi phần cứng

Đây là cuộc cách mạng thật sự. Khi OS + ứng dụng không còn "dính chặt" vào một chiếc máy cụ thể:

1. **Tận dụng tài nguyên**: một máy thật 64 CPU có thể chạy 20 VM nhỏ — mật độ sử dụng từ 10% lên 70–80%.
2. **Tạo máy trong vài phút**: VM chỉ là phần mềm — "tạo máy mới" = chạy một lệnh, không cần mua phần cứng.
3. **Snapshot & khôi phục**: chụp lại trạng thái VM, hỏng thì quay về trạng thái cũ — như nút "save game".
4. **Di chuyển (migration)**: máy thật cần bảo trì? Di chuyển VM sang máy thật khác, ứng dụng gần như không gián đoạn.
5. **Cách ly lỗi**: VM này sập không kéo theo VM kia.

Chính ảo hoá là nền móng kỹ thuật khiến **cloud computing** trở nên khả thi: AWS mua hàng triệu máy chủ, ảo hoá chúng, rồi "cho thuê" từng lát VM theo giờ.

## 3. Container — nhẹ hơn, nhanh hơn VM

### 3.1. Vấn đề còn lại của VM

VM giải quyết được lãng phí phần cứng, nhưng vẫn nặng nề:

- Mỗi VM phải chứa **nguyên một hệ điều hành** (vài GB), dù ứng dụng chỉ vài chục MB.
- Khởi động VM mất **hàng chục giây đến vài phút** (vì phải boot cả OS).
- Vấn đề kinh điển của developer: *"trên máy em chạy được mà!"* — môi trường dev khác môi trường production (khác phiên bản thư viện, khác cấu hình), ứng dụng chạy chỗ này hỏng chỗ kia.

### 3.2. Container là gì?

**Container** đóng gói ứng dụng **cùng toàn bộ những thứ nó cần để chạy** (thư viện, runtime, file cấu hình) — nhưng **không đóng gói cả hệ điều hành**. Tất cả container trên một máy **dùng chung kernel** (nhân hệ điều hành) của máy đó.

```
        VM                              CONTAINER
+------+ +------+              +------+ +------+ +------+
| App  | | App  |              | App  | | App  | | App  |
| Libs | | Libs |              | Libs | | Libs | | Libs |
| OS!  | | OS!  |  ← nặng      +------+-+------+-+------+
+------+-+------+              |   Container Engine     |  ← Docker
|   Hypervisor  |              +------------------------+
+---------------+              |     HỆ ĐIỀU HÀNH       |  ← dùng chung 1 kernel
|  Phần cứng    |              +------------------------+
+---------------+              |       Phần cứng        |
                               +------------------------+
```

Analogy: nếu VM là **căn hộ** (mỗi căn có hệ thống điện nước riêng hoàn chỉnh), thì container là **phòng trong ký túc xá chất lượng cao**: mỗi phòng có khoá riêng, đồ đạc riêng, nhưng dùng chung hệ thống điện nước của toà nhà → xây nhanh hơn, rẻ hơn, nhồi được nhiều phòng hơn.

### 3.3. Phép màu kỹ thuật: namespace và cgroup

Container không phải công nghệ "ảo hoá phần cứng" — nó là **cách ly ở mức hệ điều hành**, dựa trên 2 tính năng của Linux kernel:

- **Namespace** — quyết định container **"nhìn thấy" gì**. Mỗi container có cây tiến trình riêng, hostname riêng, hệ thống file riêng, network riêng… Tiến trình trong container tưởng rằng cả máy chỉ có mình nó. (Giống mỗi phòng ký túc có cửa riêng — bạn không nhìn thấy phòng bên cạnh.)
- **cgroup (control group)** — quyết định container **"được dùng" bao nhiêu**: giới hạn CPU, RAM, I/O. (Giống công tơ điện riêng từng phòng — bạn không thể xài hết điện của cả toà.)

> 💡 **Ghi nhớ**: VM ảo hoá **phần cứng** (mỗi VM một OS riêng, cách ly mạnh). Container cách ly **tiến trình** trên cùng một OS (namespace = nhìn thấy gì, cgroup = dùng được bao nhiêu). Vì thế container khởi động trong **mili-giây đến giây**, còn VM mất **phút**.

### 3.4. Docker, image và layer

**Docker** là công cụ phổ biến nhất giúp container trở nên dễ dùng. Ba khái niệm cốt lõi:

- **Dockerfile**: "công thức nấu ăn" — file văn bản mô tả từng bước tạo môi trường chạy ứng dụng (lấy nền Ubuntu → cài Node.js → copy code → chạy lệnh khởi động).
- **Image**: "món ăn đông lạnh đóng hộp" — kết quả build từ Dockerfile; một gói **bất biến (immutable)** chứa app + mọi thứ nó cần. Đẩy lên **registry** (kho image, như Docker Hub) để chia sẻ.
- **Container**: "món ăn đã hâm nóng và dọn ra bàn" — một **instance đang chạy** của image. Một image có thể chạy thành 100 container giống hệt nhau.

Image được tạo từ các **layer (lớp)** xếp chồng:

```
+----------------------------+
| Layer 4: code ứng dụng     |  ← thay đổi thường xuyên
+----------------------------+
| Layer 3: thư viện npm      |
+----------------------------+
| Layer 2: Node.js runtime   |
+----------------------------+
| Layer 1: nền Ubuntu        |  ← hiếm khi đổi
+----------------------------+
```

Mỗi layer chỉ lưu **phần thay đổi** so với layer dưới. Lợi ích: khi bạn sửa code (layer 4), Docker chỉ build lại và tải lại layer đó — các layer dưới được **cache và dùng chung** giữa nhiều image → build nhanh, tiết kiệm dung lượng và băng thông.

### 3.5. So sánh tổng kết VM vs Container

| Tiêu chí | VM | Container |
|---|---|---|
| Cách ly | Phần cứng ảo + OS riêng (mạnh nhất) | Namespace/cgroup trên OS chung |
| Kích thước | GB (chứa cả OS) | MB (chỉ app + thư viện) |
| Khởi động | Phút | Mili-giây → giây |
| Mật độ trên 1 máy | Hàng chục | Hàng trăm |
| Chạy OS khác nhau? | Có (Linux + Windows cùng máy) | Không (chung kernel với host) |
| Phù hợp | Cách ly mạnh, OS tuỳ ý, workload truyền thống | Microservices, CI/CD, đóng gói nhất quán |

Lưu ý: VM và container **không thay thế nhau** mà thường **xếp chồng**: trên cloud, container của bạn thực chất chạy **bên trong một VM**.

## 4. Orchestration — khi bạn có hàng trăm container

### 4.1. Vấn đề

Chạy 1–2 container bằng Docker thì dễ. Nhưng một hệ thống thật có thể có **hàng trăm container** trên **hàng chục máy**. Lúc đó hàng loạt câu hỏi nảy sinh:

- Container nên chạy trên **máy nào** (máy nào còn trống tài nguyên)?
- Container **chết** thì ai khởi động lại?
- Lưu lượng tăng thì ai **tự nhân bản** thêm container? Giảm thì ai dọn bớt?
- Cập nhật phiên bản mới **không gây downtime** bằng cách nào?
- Các container **tìm thấy nhau** qua mạng kiểu gì?

Làm tay tất cả việc trên là bất khả thi. Cần một "nhạc trưởng" — đó là **orchestration (điều phối container)**.

### 4.2. Kubernetes — ở mức ý tưởng

**Kubernetes (K8s)** là công cụ orchestration phổ biến nhất. Ý tưởng quan trọng nhất của nó là **mô hình khai báo (declarative)**:

> Bạn không ra lệnh từng bước ("chạy container A trên máy 3"). Bạn **khai báo trạng thái mong muốn** ("tôi muốn luôn có 5 bản app X, mỗi bản được 1 CPU"), và Kubernetes **liên tục tự điều chỉnh** thực tế cho khớp với mong muốn.

Analogy: thay vì tự lái xe (ra lệnh từng thao tác), bạn đặt **chế độ tự lái với đích đến**: "giữ tốc độ 80 km/h, đi làn giữa". Xe tự xử lý mọi tình huống để duy trì trạng thái đó. Container chết? K8s tự tạo cái mới. Máy hỏng? K8s dời container sang máy khác. Bạn chỉ cần mô tả "đích đến".

Vài khái niệm nghe tên cho quen (chưa cần học sâu): **cluster** (cụm máy do K8s quản lý), **node** (một máy trong cụm), **pod** (đơn vị nhỏ nhất K8s quản — chứa 1+ container), **deployment** (bản khai báo "tôi muốn N bản app này").

## 5. Serverless — bước tiến hoá tiếp theo (ở mức ý tưởng)

Hãy nhìn lại hành trình: mỗi bước, bạn **quản lý ít hơn** và **tập trung vào code nhiều hơn**:

```
Máy vật lý → VM → Container → Serverless
  (quản lý tất cả)          (chỉ quản lý code)
```

**Serverless** không có nghĩa là "không có server" — server vẫn tồn tại, chỉ là **bạn không thấy và không quản lý nó nữa**. Bạn chỉ viết **hàm (function)** xử lý một việc; nhà cung cấp cloud lo toàn bộ phần còn lại: máy chủ, OS, scaling, vá lỗi.

Đặc trưng của serverless:

- **Chạy theo sự kiện (event-driven)**: code chỉ chạy khi có chuyện xảy ra (request đến, file được upload…).
- **Tự co giãn về 0**: không có request → không chạy → **không tốn tiền**. Có 1 triệu request → tự nhân lên hàng nghìn bản.
- **Trả tiền theo lần chạy** (tính bằng mili-giây), thay vì trả tiền thuê máy theo giờ.

Analogy về "cách mua điện": máy vật lý = **tự xây nhà máy điện**; VM/container trên cloud = **thuê máy phát điện theo giờ** (chạy hay không vẫn trả tiền giờ thuê); serverless = **cắm điện lưới, trả theo số điện dùng**.

> 💡 **Ghi nhớ**: Trục đánh đổi xuyên suốt: càng đi về phía serverless, bạn càng **bớt việc vận hành** nhưng cũng **bớt quyền kiểm soát** (không chọn được OS, bị giới hạn thời gian chạy…). Không có lựa chọn "tốt nhất tuyệt đối" — chỉ có lựa chọn phù hợp với bài toán.

## 6. Liên hệ sang AWS

Toàn bộ khái niệm trong bài đều map trực tiếp sang các service bạn sẽ gặp khi học CLF-C02 / SAA-C03 / DVA-C02:

| Khái niệm trong bài | Service AWS tương ứng | Ghi chú |
|---|---|---|
| Datacenter | **Region / Availability Zone** | AWS vận hành datacenter toàn cầu, bạn chỉ "thuê" |
| VM trên hypervisor Type 1 | **EC2** (Elastic Compute Cloud) | Mỗi EC2 instance là một VM; hypervisor của AWS là **Nitro** |
| Image của VM | **AMI** (Amazon Machine Image) | "Khuôn" để tạo EC2 instance |
| Registry chứa Docker image | **ECR** (Elastic Container Registry) | Tương tự Docker Hub nhưng riêng tư trong AWS |
| Orchestration container | **ECS** (cách của AWS, đơn giản hơn) / **EKS** (Kubernetes do AWS quản lý) | ECS và EKS là 2 "nhạc trưởng" thay thế nhau |
| "Không muốn quản lý máy chạy container" | **Fargate** | Chạy container trên ECS/EKS mà không quản lý EC2 bên dưới — serverless cho container |
| Serverless function | **Lambda** | Viết hàm, AWS lo tất cả; trả tiền theo mili-giây chạy |

Bậc thang "mức độ tự quản lý" trên AWS — sẽ xuất hiện rất nhiều trong đề thi:

```
Quản lý nhiều  ←──────────────────────────→  Quản lý ít
   EC2      →   ECS/EKS trên EC2  →  Fargate  →  Lambda
  (thuê VM)    (tự quản máy chạy     (AWS quản    (chỉ viết
                 container)           máy hộ)       hàm)
```

> 💡 **Ghi nhớ**: Khi đề thi AWS hỏi *"ít công sức vận hành nhất (least operational overhead)"*, câu trả lời thường nằm về **phía phải** của bậc thang trên (Fargate, Lambda). Khi hỏi *"toàn quyền kiểm soát OS"*, đáp án nằm về **phía trái** (EC2).

## Tóm tắt

1. **Máy chủ vật lý** trong **datacenter** là nền móng của mọi thứ — nhưng dùng riêng từng máy thì lãng phí và chậm chạp.
2. **Ảo hoá** dùng **hypervisor** (Type 1 cho production, Type 2 cho máy cá nhân) chia một máy thật thành nhiều **VM**, tách phần mềm khỏi phần cứng — nền tảng kỹ thuật của cloud.
3. **Container** cách ly ở mức OS bằng **namespace** (thấy gì) và **cgroup** (dùng bao nhiêu); **Docker image** gồm các **layer** xếp chồng, giúp đóng gói nhất quán, khởi động trong giây.
4. **Orchestration (Kubernetes)** quản lý hàng trăm container theo mô hình **khai báo trạng thái mong muốn**.
5. **Serverless** là đỉnh của bậc thang: chỉ viết code, trả tiền theo lần chạy.
6. Trên AWS: **EC2** = VM, **ECS/EKS** = orchestration, **Fargate** = container không quản máy, **Lambda** = serverless function.
