# Bài 15 — Database Design

**Prerequisite foundations:** [[foundations-01-cap-theorem]], [[foundations-02-consistency-models]], [[foundations-05-partitioning-and-sharding]].

## 1. Mục tiêu
- Áp dụng CAP/consistency vào chọn DB AWS.
- Thiết kế DynamoDB single-table với access pattern.
- Hiểu RDS Multi-AZ vs Read Replica vs Aurora vs Aurora Global.
- Pattern cache (DAX, ElastiCache) — when và how.

---

## 2. Lựa chọn DB qua lăng kính CAP

Mọi database chạy trên nhiều máy đều phải trả lời một câu hỏi: **khi các bản sao không nói chuyện được với nhau thì làm gì?** Định lý CAP đặt tên cho ba thứ liên quan:

- **C — Consistency (nhất quán):** đọc ở bản sao nào cũng thấy dữ liệu mới nhất vừa ghi.
- **A — Availability (sẵn sàng):** request nào gửi tới một node còn sống cũng nhận được câu trả lời, không bị từ chối.
- **P — Partition tolerance:** hệ thống vẫn chạy khi mạng giữa các node bị đứt (gọi là *network partition*).

Mạng đứt là chuyện không tránh được, nên trên thực tế chỉ còn hai lựa chọn khi nó xảy ra. Hệ **CP** thà từ chối request còn hơn trả dữ liệu cũ: ví dụ ngừng nhận ghi vài chục giây để chuyển sang máy dự phòng. Hệ **AP** thì vẫn trả lời, chấp nhận dữ liệu có thể cũ vài trăm mili-giây tới vài giây.

Bốn thuật ngữ xuất hiện trong bảng bên dưới, mỗi cái một câu:

- **Sync replication (đồng bộ):** primary chỉ báo "ghi xong" sau khi bản sao cũng đã nhận dữ liệu. Không mất dữ liệu khi primary chết, đổi lại mỗi lệnh ghi chậm thêm một chút.
- **Async replication (bất đồng bộ):** primary báo "ghi xong" ngay, bản sao nhận sau. Ghi nhanh, nhưng bản sao luôn đi sau primary một khoảng gọi là **replication lag**.
- **Strong vs eventual consistency:** *strong* là đọc ngay sau khi ghi chắc chắn thấy giá trị mới. *Eventual* là có thể thấy giá trị cũ trong một khoảng ngắn, sau đó mọi bản sao sẽ khớp nhau.
- **Quorum:** thay vì chờ *tất cả* bản sao, chỉ cần **đa số** xác nhận là coi như ghi xong. "Quorum 4/6" nghĩa là 4 trong 6 bản sao (giải thích kỹ ở §4.1).

Hai thuật ngữ riêng của DynamoDB: **RCU** (read capacity unit) là đơn vị đo và tính tiền cho lượt đọc, xem §5.3. **Last-writer-wins** là cách xử lý khi hai region cùng sửa một item: bản ghi có timestamp muộn hơn thắng, bản kia bị ghi đè (§5.8).

Bảng dưới là **bản đồ tổng quan**. Lần đầu đọc chỉ cần lướt qua cột "Use case"; đọc xong §3–§5 rồi quay lại thì từng ô sẽ có nghĩa.

| Service | CAP | Consistency mặc định | Use case |
|---------|-----|----------------------|----------|
| **RDS single-AZ** | CA (giả định không network partition trong AZ) | Strong | Dev/test, single-instance |
| **RDS Multi-AZ** | CP (failover khi partition) | Strong (sync replication) | Prod HA single-region |
| **RDS Read Replica** | AP (async lag) | **Eventual** (read replica) | Scale read |
| **Aurora** | CP (6 replica 3 AZ, quorum 4/6 write, 3/6 read) | Strong | Prod, high-perf |
| **Aurora Global** | AP cross-region | Strong intra-region, **eventual** cross-region (~1s) | Multi-region read |
| **DynamoDB** | AP default | **Eventual** default, **strong** opt-in (2x cost RCU) | NoSQL, scale lớn |
| **DynamoDB Global Tables** | AP | **Eventual**, last-writer-wins | Multi-region active-active |
| **ElastiCache Redis cluster** | CP (with replication) | Strong primary, eventual replica | Cache |

Nhãn CA/CP/AP ở đây là **cách nhớ gần đúng**, không phải phân loại chính thức của AWS. Ví dụ RDS single-AZ được gắn "CA" vì chỉ có một máy, không có bản sao nào để lệch nhau; cái giá là máy đó chết thì mất dịch vụ. Còn dòng DynamoDB Global Tables mô tả chế độ mặc định; từ 2025 có thêm chế độ strong consistency đa region (§5.8).

→ Đọc kỹ [[foundations-01-cap-theorem]] để hiểu trade-off.

---

## 3. RDS deep

**RDS (Relational Database Service)** là database quan hệ (MySQL, PostgreSQL…) do AWS vận hành hộ: AWS lo cài đặt, vá lỗi, backup, failover; bạn vẫn chọn cỡ máy (instance class) và dung lượng đĩa. Một RDS instance về bản chất là **một máy chạy một database engine, đĩa là EBS gắn riêng cho máy đó**. Hầu hết giới hạn của RDS (và lý do Aurora ra đời ở §4) xuất phát từ mô hình "mỗi máy một đĩa" này.

### 3.1 Multi-AZ vs Read Replica

| | Multi-AZ | Read Replica |
|--|----------|---------------|
| Mục đích | HA failover | Scale read |
| Replication | **Sync** | **Async** |
| Standby serve read | **Không** | **Có** |
| Failover | Auto, 60-120s, DNS update | Manual promote |
| Cross-AZ | Same region (multi-AZ DB instance: 2 AZ; multi-AZ cluster: 3 AZ) | Same hoặc **cross-region** |
| Latency tăng write | Có (sync) | Không (async không ảnh hưởng primary) |

**Vì sao hai thứ này không thay được nhau.** Standby của Multi-AZ được sao chép đồng bộ ở tầng đĩa và không mở cho client kết nối; nó chỉ tồn tại để thế chỗ primary. Khi failover, RDS đổi bản ghi DNS của endpoint sang standby, nên ứng dụng giữ nguyên connection string và chỉ cần kết nối lại. Read Replica thì ngược lại: là một instance đầy đủ, có endpoint riêng để đọc, nhưng vì async nên có thể thiếu vài giao dịch cuối, và muốn nó thành primary thì phải **promote bằng tay** rồi sửa endpoint trong ứng dụng. Một primary có tối đa **15** read replica (quota mặc định).

> Bẫy thi: *"giảm tải đọc / báo cáo làm chậm production"* → **Read Replica**. *"chịu được mất một AZ, tự failover, không mất dữ liệu"* → **Multi-AZ**. Hai tính năng bật được cùng lúc trên một DB.

### 3.2 Multi-AZ DB Cluster (mới, 2022)

Kiểu triển khai thứ ba, nằm giữa hai kiểu trên: lấy khả năng tự failover của Multi-AZ và khả năng phục vụ đọc của Read Replica.

- Gồm **3 instance ở 3 AZ**: 1 writer + 2 reader.
- **Reader serve read** (khác Multi-AZ Instance, nơi standby nằm im). Cluster có writer endpoint và reader endpoint riêng.
- Sao chép kiểu **semi-synchronous**: writer chỉ commit sau khi **ít nhất 1 trong 2** reader xác nhận đã nhận thay đổi. Không cần chờ cả hai nên ghi thường nhanh hơn Multi-AZ instance, mà vẫn luôn có một bản sao đủ dữ liệu.
- **Failover thường dưới 35 giây** (so với 60–120 giây của Multi-AZ instance), vì reader đã là một database đang chạy sẵn chứ không phải máy chờ.
- Chỉ hỗ trợ **MySQL và PostgreSQL**.

Lưu ý tên gọi: "Multi-AZ DB cluster" là của **RDS**, không phải Aurora, dù cũng có writer/reader.

### 3.3 Backup

- **Automated backup:** RDS chụp snapshot toàn bộ mỗi ngày trong backup window và lưu liên tục transaction log. Ghép hai thứ lại cho **PITR (point-in-time recovery)**: khôi phục về một thời điểm bất kỳ trong thời hạn lưu, chính xác tới giây. Thời hạn lưu chỉnh được **0–35 ngày**; đặt 0 là tắt hẳn automated backup.
- **Manual snapshot:** bạn tự bấm chụp, **giữ tới khi tự xoá** (không bị giới hạn 35 ngày), và share được sang account khác hoặc copy sang region khác.
- Khôi phục (từ snapshot hay PITR) luôn tạo ra **một DB instance mới** với endpoint mới, không ghi đè lên instance cũ.
- **Encryption** chỉ bật được **lúc tạo** instance, không bật sau và không tắt được. Cách mã hoá một DB đang chạy không mã hoá: chụp snapshot → copy snapshot đó và chọn bật mã hoá (KMS key) → restore từ bản copy thành instance mới.

### 3.4 RDS Proxy

**Bài toán.** Database quan hệ giới hạn số kết nối đồng thời (`max_connections`), vì mỗi kết nối ngốn RAM trên máy DB. Trên RDS con số mặc định tính từ RAM của instance:

```
MySQL:      max_connections ≈ RAM (byte) ÷ 12.582.880   (cứ ~12 MB RAM cho 1 kết nối)

db.t3.micro  (1 GiB RAM)  → khoảng 60 kết nối
db.m7g.large (8 GiB RAM)  → khoảng 630 kết nối  (lý thuyết 683, trừ phần RAM dành cho OS)
```

Một app chạy trên EC2/ECS giữ một pool vài chục kết nối và dùng lại, nên không sao. **Lambda thì khác:** mỗi lượt chạy đồng thời (concurrent execution) là một môi trường riêng, tự mở kết nối riêng và không chia sẻ được với lượt khác. Quota concurrency mặc định của Lambda là **1.000 mỗi region**:

```
1.000 Lambda chạy đồng thời × 1 kết nối  = 1.000 kết nối
db.m7g.large chịu được                   ≈   630 kết nối
→ khoảng 370 request nhận lỗi "too many connections"
```

**RDS Proxy giải thế nào.** Nó là một lớp trung gian do AWS vận hành, đứng giữa app và DB. App mở bao nhiêu kết nối tới proxy cũng được; proxy chỉ giữ một **pool nhỏ** kết nối thật tới DB và cho mượn theo từng transaction (gọi là *multiplexing*): transaction xong là kết nối trả về pool cho request khác dùng. 1.000 Lambda có thể chỉ cần vài chục kết nối thật.

- **Failover êm hơn:** proxy giữ kết nối phía app và tự trỏ sang instance mới, không phụ thuộc DNS cache của client. Theo docs, giảm thời gian failover **tới 66%** với Aurora/RDS Multi-AZ. (Tài liệu ôn thi hay ghi gọn là "failover dưới 1 giây"; con số chính thức AWS công bố là mức giảm 66%.)
- **Bảo mật:** app xác thực với proxy bằng **IAM**, còn mật khẩu DB nằm trong **Secrets Manager**, không nằm trong code Lambda.
- Proxy chỉ truy cập được **trong VPC**, không có endpoint public.
- Hạn chế cần biết: một số thao tác (đổi biến session, temporary table…) khiến proxy phải gắn chặt một kết nối cho một client (*pinning*), lúc đó mất tác dụng dùng chung.

> Bẫy thi: *"Lambda + RDS/Aurora bị too many connections / cạn kết nối"* → **RDS Proxy**. Về kỹ thuật không phải "bắt buộc", nhưng với đề SAA đây là đáp án mặc định cho cặp Lambda + database quan hệ.

### 3.5 Engine option
- MySQL, PostgreSQL, MariaDB, Oracle, SQL Server (và IBM Db2, mới thêm sau, ít gặp trong đề).
- **RDS Custom for Oracle / SQL Server:** RDS thường không cho bạn SSH vào máy chủ. RDS Custom mở quyền **OS-level và quyền quản trị database** cho các ứng dụng legacy cần cài patch riêng, agent riêng. Hiếm cần; dấu hiệu trong đề là *"cần truy cập hệ điều hành bên dưới nhưng vẫn muốn AWS tự động hoá backup/vận hành"*.

---

## 4. Aurora deep

### 4.1 Đặc điểm

**Nó là gì.** Aurora là database quan hệ do AWS tự viết lại phần lưu trữ, **tương thích MySQL và PostgreSQL** (app dùng driver cũ, không đổi code). Khác biệt gốc so với RDS: **tách compute khỏi storage**. Ở RDS, mỗi instance có đĩa EBS riêng và replica phải tự chép lại toàn bộ dữ liệu. Ở Aurora, mọi instance trong cluster cùng đọc ghi vào **một cluster volume dùng chung**, và volume đó tự nhân bản bên dưới.

**Storage: 6 bản sao trên 3 AZ.** Mỗi mẩu dữ liệu được lưu **6 bản, 2 bản mỗi AZ**, dù cluster của bạn chỉ có đúng 1 instance. Volume tự nở theo dữ liệu nên không phải cấp trước dung lượng. Trần là **128 TiB** (con số đề thi dùng; các bản engine mới từ 2025 lên **256 TiB**). Bạn chỉ trả tiền cho phần đang dùng.

**Quorum 4/6 và 3/6 — vì sao đúng hai con số đó.** Một lệnh ghi được coi là xong khi **4 trong 6** bản xác nhận; để đọc chắc chắn được dữ liệu mới nhất cần hỏi **3 trong 6** bản. Hai con số này thoả hai điều kiện:

```
Tổng số bản V = 6, quorum ghi W = 4, quorum đọc R = 3

R + W > V   →  3 + 4 = 7 > 6   nhóm đọc và nhóm ghi luôn trùng nhau ít nhất 1 bản
                                → lượt đọc nào cũng gặp ít nhất một bản có dữ liệu mới nhất
W > V / 2   →  4 > 3            không thể có hai nhóm ghi tách rời cùng thành công
                                → không sinh ra hai phiên bản dữ liệu mâu thuẫn
```

Quy ra khả năng chịu lỗi:

```
Mất trọn 1 AZ          = mất 2 bản → còn 4 → vẫn GHI và đọc bình thường
Mất 1 AZ + 1 bản nữa   = mất 3 bản → còn 3 → hết ghi được, nhưng vẫn ĐỌC được
                                             và đủ dữ liệu để tự dựng lại các bản hỏng
```

AWS gọi mục tiêu này là **"AZ+1"**. Lý do không dùng 3 bản (mỗi AZ 1 bản, quorum 2/3) cho rẻ: mất một AZ là mọi dữ liệu đồng loạt còn 2 bản; trong lúc đó chỉ cần hỏng thêm một đĩa là còn 1 bản, không đủ quorum để đọc, ghi hay sửa. Sáu bản là để **chịu được sự cố AZ trùng lúc với một hỏng hóc lẻ khác** (chi tiết quorum ở [[foundations-03-replication-and-quorum]]).

**"5x MySQL, 3x PostgreSQL" là 5x cái gì.** AWS quảng cáo Aurora đạt thông lượng (số transaction/giây) **tới 5 lần MySQL và 3 lần PostgreSQL** tự cài trên cùng phần cứng. Đây là số benchmark của AWS, coi là mốc để thi chứ không phải cam kết cho mọi workload. Cái đáng hiểu là nguyên nhân: writer chỉ gửi **bản ghi log thay đổi** (redo log) xuống tầng storage và chờ 4/6 xác nhận, còn việc dựng lại các trang dữ liệu do tầng storage tự làm ở nền. MySQL truyền thống phải ghi cả log lẫn trang dữ liệu ra đĩa, rồi chép thêm một lần nữa sang replica.

**Failover.** Nếu cluster có ít nhất một Aurora Replica, replica được đưa lên làm writer, dịch vụ thường trở lại **trong dưới 60 giây, hay gặp là dưới 30 giây** (đề thi dùng mốc "< 30s"). Nhanh vì replica đã nhìn thấy sẵn cùng volume, không phải chép hay đuổi kịp dữ liệu. Nếu cluster chỉ có **một** instance, Aurora phải tạo instance mới, thường mất **dưới 10 phút**.

### 4.2 Cluster endpoints

Instance trong cluster có thể đổi vai sau failover, nên ứng dụng không kết nối thẳng tới từng máy mà kết nối tới các **endpoint** (tên DNS) do Aurora quản lý:

- **Cluster endpoint (writer)** — luôn trỏ vào writer hiện tại. Sau failover nó tự trỏ sang writer mới, connection string không đổi. Dùng cho mọi lệnh ghi.
- **Reader endpoint** — chia đều các kết nối **chỉ đọc** ra các Aurora Replica. Cân bằng theo kết nối, không theo từng câu query.
- **Custom endpoint** — bạn tự chọn một nhóm replica. Ví dụ hai replica cỡ lớn dành riêng cho báo cáo, để query nặng không tranh tài nguyên với replica phục vụ web.
- **Instance endpoint** — trỏ đúng một instance cụ thể. Chủ yếu để chẩn đoán; app không nên dùng vì mất khả năng failover.

### 4.3 Aurora Replica
- Tối đa **15** replica trong một cluster, rải được trên 3 AZ.
- **Share storage** với writer: replica không giữ bản dữ liệu riêng mà đọc chung cluster volume, nên gần như không có gì để "chép sang". Lag thường **dưới 100 ms rất nhiều** (cỡ vài chục ms). So với RDS Read Replica, nơi lag có thể tính bằng giây tới phút khi primary ghi nặng.
- Vừa phục vụ đọc vừa là **failover target**. Thứ tự ưu tiên khi promote đặt bằng *promotion tier* 0–15 (số nhỏ được chọn trước).

### 4.4 Aurora Global Database

**Nó là gì.** Một database trải nhiều region: **1 primary region** nhận mọi lệnh ghi, cộng các **secondary region chỉ đọc**. Đề thi và tài liệu cũ dùng con số **tối đa 5** secondary region; docs hiện tại đã nâng lên **10**.

**Cơ chế.** Việc sao chép diễn ra ở **tầng storage** bằng hạ tầng riêng (*dedicated infrastructure*), không đi qua database engine của writer. Nhờ vậy writer không tốn CPU cho việc đẩy dữ liệu đi, và độ trễ cross-region **thường dưới 1 giây**. Đây vẫn là sao chép **async**: region đọc có thể đi sau primary một chút, nên đọc ở secondary là eventual consistency.

- Mỗi secondary region là một cluster riêng có **reader endpoint** của nó; user ở châu Âu đọc từ cluster châu Âu với độ trễ nội vùng.
- **Chuyển primary sang region khác** có hai kiểu. *Switchover* dùng khi mọi thứ đang khoẻ (bảo trì, diễn tập): Aurora chờ secondary đồng bộ xong rồi mới đổi vai, **RPO = 0**. *Failover* dùng khi primary region thật sự sập: đổi vai ngay, có thể mất phần dữ liệu chưa kịp sao chép.
- **RPO/RTO:** con số AWS quảng cáo và đề thi dùng là **RPO ~1 giây, RTO dưới 1 phút**. (RPO là lượng dữ liệu tối đa chấp nhận mất tính theo thời gian, RTO là thời gian downtime.) Docs vận hành viết dè dặt hơn: RPO "tính bằng giây", còn managed failover thường xong "trong vài phút". Đi thi chọn theo 1 giây / 1 phút; đi làm thì tự đo.
- Secondary có thể là **headless** (chỉ có storage, không có instance) để tiết kiệm; khi cần failover phải thêm instance vào trước.
- Use case: app toàn cầu đọc nhiều, và DR cross-region với RPO/RTO thấp.

> Bẫy thi: Aurora Global chỉ có **một region ghi**. Cần *ghi được ở nhiều region cùng lúc* (active-active) → DynamoDB Global Tables (§5.8), không phải Aurora Global.

### 4.5 Aurora Serverless v2

Với Aurora thường (provisioned) bạn chọn cỡ instance cố định. Serverless v2 thay bằng một **khoảng dung lượng** và Aurora tự co giãn bên trong khoảng đó.

- Đơn vị là **ACU (Aurora Capacity Unit)**: 1 ACU ≈ **2 GiB RAM** kèm CPU và network tương ứng. Bạn đặt min và max, ví dụ 0,5–16 ACU, tức từ 1 GiB tới 32 GiB RAM.
- Scale **realtime** theo từng nấc nhỏ tới 0,5 ACU, ngay trong lúc có kết nối và transaction đang chạy, không ngắt kết nối. Khác v1 (đã bị AWS ngừng phát triển) phải tìm lúc rảnh mới đổi cỡ.
- Hỗ trợ **MySQL + PostgreSQL**; trần hiện tại 256 ACU.
- Về chuyện "pause": đề thi và tài liệu cũ ghi v2 **không scale về 0** (min 0,5 ACU), chỉ v1 mới tự pause. Từ cuối 2024, các bản engine mới của v2 **đã cho đặt min = 0 ACU** để tự tạm dừng khi không có kết nối. Gặp trong đề thì ưu tiên cách hiểu cũ.
- Use case: tải biến động khó đoán, môi trường dev/test, app mới chưa biết tải.

### 4.6 Aurora Backtrack
- **MySQL only** (Aurora PostgreSQL không có).
- **Tua ngược tại chỗ** cả cluster về một thời điểm trong tối đa **72 giờ** trước đó, xong trong vài phút. Tình huống điển hình: lỡ chạy `DELETE` thiếu `WHERE`.
- Khác restore/PITR ở chỗ **không tạo cluster mới**: endpoint giữ nguyên, không phải chờ hàng giờ khôi phục từ snapshot.
- Phải **bật khi tạo cluster** (hoặc khi restore từ snapshot), không bật thêm sau được. Tua là tua cả cluster, không chọn riêng một bảng. Không dùng được cùng Aurora Global Database.

### 4.7 I/O Optimized (2023)

Aurora có hai cách tính tiền storage:

- **Aurora Standard:** giá storage và instance thấp hơn, nhưng trả thêm theo **mỗi triệu thao tác I/O** đọc/ghi.
- **Aurora I/O-Optimized:** giá storage và instance cao hơn, đổi lại **I/O miễn phí**, hoá đơn dễ đoán.

Quy tắc AWS đưa ra: chọn I/O-Optimized khi tiền I/O chiếm **từ 25% tổng chi phí Aurora trở lên**. Ví dụ hoá đơn Aurora $1.000/tháng mà riêng dòng I/O đã $300 (30%) thì nên chuyển.

---

## 5. DynamoDB design deep

**DynamoDB** là database NoSQL dạng key-value, serverless hoàn toàn: không có instance để chọn, không có kết nối để quản lý, mọi thao tác là một lệnh gọi HTTPS. Độ trễ đọc/ghi thường **dưới 10 ms** ở mọi quy mô. Cái giá: **không có JOIN, không có query tuỳ ý**; bạn chỉ lấy được dữ liệu nhanh theo khoá đã thiết kế từ trước. Gần như toàn bộ §5 xoay quanh hệ quả của điều đó.

### 5.1 Data model

- **Table** chứa các **item** (tương đương row). Mỗi item là một tập **attribute** (tương đương column). Bảng là *schemaless*: ngoài khoá chính, mỗi item có thể mang những attribute khác nhau, không cần khai báo trước.
- **Primary key** có hai dạng:
  - Chỉ **partition key (PK)**. DynamoDB băm giá trị PK để quyết định item nằm ở *partition* (máy lưu trữ) nào. Mỗi giá trị PK là duy nhất trong bảng. Ví dụ `UserId`.
  - **Partition key + sort key (SK)**, gọi là composite key. Các item **cùng PK nằm cạnh nhau trên cùng partition, xếp sẵn theo SK**. Cặp (PK, SK) mới phải duy nhất. Ví dụ PK = `UserId`, SK = `OrderDate`.
- **Max item size 400 KB**, tính cả tên attribute lẫn giá trị. File lớn hơn thì để ở S3 và lưu đường dẫn trong item.

Vai trò của hai khoá quyết định bạn hỏi được gì:

```
GetItem  PK = "u1", SK = "2026-03-01"           → đúng 1 item
Query    PK = "u1"                              → mọi item của u1, đã xếp theo SK
Query    PK = "u1" AND SK BETWEEN "2026-03-01" AND "2026-03-31"   → đơn tháng 3 của u1
Scan                                            → đọc TOÀN BỘ bảng rồi mới lọc (chậm, đắt)
```

Điểm mấu chốt: **Query luôn cần biết chính xác PK**; SK chỉ dùng để lọc khoảng hoặc sắp xếp *bên trong* một PK. Muốn tìm theo một attribute khác thì cần index (§5.2), nếu không chỉ còn cách Scan.

### 5.2 Index

**Bài toán.** Bảng `Orders` có PK = `UserId`, SK = `OrderDate`. Câu hỏi "các đơn của user u1" trả lời được ngay. Nhưng "mọi đơn đang `pending`" hoặc "đơn của u1 xếp theo tổng tiền" thì không, vì `status` và `total` không phải khoá. **Secondary index** là một bản sắp xếp lại dữ liệu theo khoá khác, do DynamoDB tự duy trì mỗi khi bảng gốc thay đổi. Có hai loại:

- **LSI (Local Secondary Index): giữ nguyên PK, đổi SK.** "Local" vì nó nằm chung partition với dữ liệu gốc. Dùng khi vẫn hỏi theo cùng PK nhưng muốn xếp/lọc theo attribute khác, ví dụ đơn của u1 xếp theo `total`. Vì ở chung partition nên đọc **strong consistency** được và dùng chung capacity với bảng. Cũng vì thế nên phải khai báo **lúc tạo bảng**, và mọi item cùng một PK (kể cả phần index) không được vượt **10 GB**.
- **GSI (Global Secondary Index): đổi cả PK lẫn SK.** "Global" vì nó trải trên toàn bảng. Thực chất là một **bảng phụ** có partition riêng, DynamoDB chép dữ liệu sang **bất đồng bộ** sau mỗi lần ghi. Hai hệ quả trực tiếp: GSI chỉ đọc được **eventual** (bản chép có thể đi sau vài mili-giây), và GSI có **capacity riêng**. Nếu cấp WCU cho GSI quá thấp, lượt ghi vào **bảng gốc** cũng bị throttle theo.

**Projection** là chọn những attribute nào được chép sang index. `KEYS_ONLY` chỉ chép các khoá: index nhỏ và rẻ, nhưng cần attribute khác thì phải đọc thêm lần nữa ở bảng gốc. `INCLUDE` chép khoá cộng vài attribute bạn liệt kê. `ALL` chép toàn bộ item: tiện nhất, tốn gấp đôi storage và chi phí ghi.

| | LSI | GSI |
|--|-----|-----|
| Key | Same PK, **different SK** | **Different PK + SK** |
| Tạo | **Cùng lúc với table** | Bất cứ lúc nào |
| Throughput | Share với base table | **Riêng** |
| Consistency | Strong option | **Eventual only** |
| Max | 5 per table | 20 per table |
| Projection | KEYS_ONLY / INCLUDE / ALL | Same |

> Bẫy thi: *"cần thêm kiểu truy vấn mới trên bảng đang chạy production"* → **GSI** (LSI không thêm sau được). *"cần đọc strong consistency trên index"* → chỉ **LSI** làm được.

### 5.3 Capacity

DynamoDB không tính tiền theo máy mà theo **lượng đọc/ghi**, đo bằng hai đơn vị:

- **1 WCU** (write capacity unit) = **1 lượt ghi mỗi giây** cho item **tối đa 1 KB**. Item lớn hơn thì làm tròn lên từng KB.
- **1 RCU** (read capacity unit) = **1 lượt đọc strong mỗi giây** cho item **tối đa 4 KB**, hoặc **2 lượt đọc eventual**. Item lớn hơn thì làm tròn lên từng 4 KB.

Đọc strong đắt gấp đôi eventual vì DynamoDB phải hỏi bản sao giữ dữ liệu mới nhất thay vì bản nào cũng được. Transaction (§5.9) tốn gấp đôi nữa.

**Tính thử.** Item 6 KB, cần 100 lượt đọc/giây:

```
6 KB ÷ 4 KB = 1,5 → làm tròn lên 2 đơn vị cho mỗi lượt đọc

Strong:        2 × 100       = 200 RCU
Eventual:      200 ÷ 2       = 100 RCU
Transactional: 200 × 2       = 400 RCU
```

Item 2,5 KB, cần 50 lượt ghi/giây:

```
2,5 KB → làm tròn lên 3 đơn vị cho mỗi lượt ghi
3 × 50 = 150 WCU          (transactional: 300 WCU)
```

**Hai chế độ trả tiền:**

- **Provisioned:** bạn khai trước số RCU/WCU và **trả theo giờ dù có dùng hay không**. Vượt mức đã khai thì request bị từ chối (*throttle*, lỗi `ProvisionedThroughputExceededException`). Có **auto scaling** tự chỉnh mức khai theo tải, nhưng phản ứng trong vài phút, không kịp với cú tăng vọt trong vài giây. Bù lại có *burst capacity*: DynamoDB giữ lại tối đa **300 giây** capacity chưa dùng để đỡ các đỉnh ngắn.
- **On-Demand:** không khai gì, **trả theo từng request**. Bảng mới chịu được ngay **4.000 lượt ghi/giây và 12.000 lượt đọc/giây**, và luôn đáp ứng tức thì tới **gấp đôi đỉnh tải cao nhất từng đạt**. Chỉ bị throttle khi tải tăng quá gấp đôi đỉnh cũ trong vòng 30 phút.

**On-demand đắt hơn bao nhiêu?** Giá us-east-1, bảng Standard:

```
On-demand:    ~$0,625 / 1 triệu lượt ghi      ~$0,125 / 1 triệu lượt đọc
Provisioned:  ~$0,00065 / WCU-giờ             ~$0,00013 / RCU-giờ

Tải đều suốt tháng (730 giờ): 100 ghi/giây (1 KB) + 300 đọc strong/giây (4 KB)

Provisioned:  100 × 0,00065 × 730 + 300 × 0,00013 × 730  = 47,45 + 28,47  ≈ $75,92 / tháng
On-demand:    262,8 triệu ghi × 0,625 + 788,4 triệu đọc × 0,125
                                                         = 164,25 + 98,55 ≈ $262,80 / tháng
→ on-demand đắt gấp ~3,5 lần KHI capacity provisioned được dùng hết 100%
```

Nhưng provisioned hiếm khi dùng hết 100%. Nếu bảng chỉ thật sự bận khoảng **29% thời gian trở xuống** (ví dụ chỉ có tải giờ hành chính, hoặc vài đợt batch mỗi ngày) thì on-demand lại rẻ hơn, vì provisioned vẫn tính tiền những giờ ngồi không.

> Con số "on-demand đắt **~7x** provisioned" trong nhiều tài liệu ôn thi là theo giá **trước tháng 11/2024**. AWS đã giảm 50% giá on-demand, nên với giá hiện tại tỉ lệ là **~3,5x** ở mức dùng 100%. Kết luận cho đề thi không đổi: **tải đều, đoán trước được → provisioned (kèm auto scaling); tải thất thường, bảng mới, hay có đỉnh đột ngột → on-demand.**

### 5.4 Single-table design (Rick Houlihan)

**Bài toán.** DynamoDB không có JOIN. Nếu để `Users`, `Orders`, `Products` ở ba bảng như thói quen SQL, màn hình "hồ sơ user kèm các đơn hàng" phải gọi nhiều lượt rồi tự ghép trong code. Single-table design đi ngược lại: **để nhiều loại entity vào chung một bảng** và đặt khoá sao cho những thứ hay được đọc cùng nhau thì **nằm chung một PK**, lấy ra bằng một lượt Query.

**Cách đặt khoá:**
- PK mang tiền tố tên entity: `USER#u1`, `ORDER#o100`, `CAT#shoes`.
- SK mô tả loại item hoặc quan hệ, sắp xếp được: `PROFILE`, `ORDER#<ngày>#<id>`, `ITEM#<productId>`.
- Cột khoá đặt tên chung chung (`PK`, `SK`, `GSI1PK`, `GSI1SK`) vì mỗi loại item nhét ý nghĩa khác nhau vào đó. Kiểu dùng chung một GSI cho nhiều mục đích này gọi là **GSI overloading**.

Ví dụ bảng của một shop, phục vụ ba access pattern: đơn của một user, sản phẩm theo danh mục, đơn theo trạng thái.

| PK | SK | Attribute khác | GSI1PK | GSI1SK |
|----|----|----------------|--------|--------|
| `USER#u1` | `PROFILE` | name=An, email=… | | |
| `USER#u1` | `ORDER#2026-03-01#o100` | total=250000 | `STATUS#pending` | `2026-03-01T09:15` |
| `USER#u1` | `ORDER#2026-03-05#o117` | total=90000 | `STATUS#shipped` | `2026-03-05T14:02` |
| `USER#u2` | `PROFILE` | name=Bình, email=… | | |
| `USER#u2` | `ORDER#2026-03-02#o104` | total=120000 | `STATUS#pending` | `2026-03-02T20:40` |
| `ORDER#o100` | `ITEM#p1` | qty=2, price=125000 | | |
| `CAT#shoes` | `PRODUCT#p1` | name=Sneaker A, price=125000 | | |
| `CAT#shoes` | `PRODUCT#p7` | name=Sandal B, price=90000 | | |

Các câu query tương ứng:

```
1. Hồ sơ u1 kèm mọi đơn hàng           Query  PK = "USER#u1"
   → trả về 3 item (1 PROFILE + 2 ORDER) trong MỘT lượt gọi

2. Đơn tháng 3/2026 của u1             Query  PK = "USER#u1" AND begins_with(SK, "ORDER#2026-03")

3. Các món trong đơn o100              Query  PK = "ORDER#o100" AND begins_with(SK, "ITEM#")

4. Sản phẩm thuộc danh mục shoes       Query  PK = "CAT#shoes"

5. Mọi đơn đang pending, cũ nhất trước Query trên GSI1:  GSI1PK = "STATUS#pending"
   → o100, o104 (xếp theo GSI1SK là thời gian)
```

Query 1 chính là ý "một query nhận nhiều entity": profile và các đơn là hai loại dữ liệu khác nhau nhưng chung PK nên về cùng lúc. Query 5 không làm được trên bảng gốc (vì `status` không phải khoá), nên cần GSI1. Các item không có `GSI1PK` (profile, product) **không xuất hiện trong index**; đặc điểm này gọi là *sparse index* và giúp index nhỏ, rẻ.

**Lợi ích**: 1 query nhận multiple entity (User + their Orders) trong 1 round trip, ít bảng phải quản lý capacity và backup.

**Nhược**: phải **biết hết access pattern trước** khi thiết kế khoá; thêm một kiểu truy vấn mới sau này thường phải thêm GSI hoặc ghi lại dữ liệu; bảng khó đọc bằng mắt và khó cho người mới (cognitive complexity cao). Ngoài ra `STATUS#pending` chỉ có vài giá trị nên dễ thành hot partition trên GSI, xem §5.5.

### 5.5 Hot partition (foundation [[foundations-05-partitioning-and-sharding]])
- **DDB chia data theo hash(PK) → partition**. Mỗi partition limit 3000 RCU + 1000 WCU.
- PK low cardinality (status, country) → hot.
- Solution: **suffix PK** với random shard `USER#u1#${random(0,9)}` → write fan-out.
- **Adaptive capacity** (auto từ 2019) — DDB tự rebalance, nhưng giới hạn.

### 5.6 Streams + DDB Triggers

**DynamoDB Streams** là nhật ký ghi lại **mọi thay đổi** (thêm, sửa, xoá) trên từng item của bảng, theo đúng thứ tự xảy ra với item đó. Kiểu nhật ký này gọi là **CDC (change data capture)**.

- Record trong stream được giữ **24 giờ** rồi tự xoá.
- Bật stream thì chọn một trong 4 **view type**, quyết định mỗi record chứa gì: `KEYS_ONLY` (chỉ khoá của item bị đổi), `NEW_IMAGE` (item sau khi đổi), `OLD_IMAGE` (item trước khi đổi), `NEW_AND_OLD_IMAGES` (cả hai, dùng khi cần so sánh trước/sau).
- **Trigger:** gắn một hàm **Lambda** vào stream; Lambda tự chạy mỗi khi có thay đổi, rồi đẩy tiếp sang EventBridge hoặc dịch vụ ngoài.
- Use case: đồng bộ sang search index (OpenSearch), ghi audit log, gửi email khi có user mới, và **outbox pattern** (ghi dữ liệu và "sự kiện cần phát" vào cùng một bảng, stream đảm bảo sự kiện được phát đi).

Cần giữ thay đổi lâu hơn 24 giờ hoặc cho nhiều consumer đọc thì đẩy sang **Kinesis Data Streams** thay vì dùng Streams gốc.

### 5.7 DAX (DynamoDB Accelerator)

**Nó là gì.** Một cụm cache in-memory đặt trước DynamoDB, dùng **cùng API với DynamoDB**: đổi client sang DAX client là xong, gần như không sửa logic. DynamoDB vốn trả lời trong **vài mili-giây** (single-digit ms); DAX đưa lượt đọc trúng cache xuống **micro-giây**, tức nhanh hơn khoảng một bậc độ lớn (~10 lần).

**Cơ chế.** DAX chạy thành cluster **trong VPC** của bạn (1 node primary + tối đa 10 read replica; nên từ 3 node trên nhiều AZ).

- **Đọc:** trúng cache thì trả ngay. Trượt cache thì DAX đọc DynamoDB (eventual), lưu vào cache theo TTL, rồi trả về.
- **Ghi (write-through):** app ghi qua DAX; DAX ghi xuống DynamoDB trước, DynamoDB xác nhận xong thì DAX mới cập nhật cache của item đó. Nhờ vậy đọc lại ngay sau khi ghi (qua DAX) sẽ thấy giá trị mới mà không phải tự viết code xoá cache. (Pattern write-through nói chung ở §6.2.)

**Khi nào DAX không giúp được:**
- **Strong consistent read:** DAX chuyển thẳng xuống DynamoDB và **không cache kết quả**. Bạn chỉ tốn thêm một chặng mạng.
- **Ghi nhiều, đọc ít:** không có gì để cache, còn tốn công đồng bộ giữa các node.
- **Có nguồn ghi không đi qua DAX** (một service khác ghi thẳng DynamoDB): cache không biết, tiếp tục trả giá trị cũ cho tới khi hết TTL.
- Kết quả **Query/Scan** nằm ở một cache riêng và **không được cập nhật khi item thay đổi**, chỉ hết hạn theo TTL.

Use case: đọc rất nhiều, lặp lại trên một nhóm key nóng (flash sale, bảng xếp hạng game, real-time bidding), và chấp nhận eventual consistency. DAX còn giúp giảm RCU phải mua.

> Bẫy thi: *"giảm độ trễ đọc DynamoDB xuống micro-giây, sửa code ít nhất"* → **DAX**. *"cache kết quả tính toán / dữ liệu từ nhiều nguồn, cần sorted set, pub/sub"* → **ElastiCache** (§6.5). DAX **chỉ** dùng cho DynamoDB.

### 5.8 Global Tables

**Nó là gì.** Một bảng DynamoDB có bản sao (replica) ở nhiều region, **region nào cũng đọc và ghi được** (multi-region **active-active**). User ở Singapore ghi vào replica Singapore, user ở Frankfurt ghi vào replica Frankfurt; DynamoDB tự sao chép hai chiều.

**Chế độ mặc định — eventual (tên chính thức: MREC):**
- Sao chép **bất đồng bộ**, thường tới các region khác **trong khoảng 1 giây hoặc ít hơn**. Trong khoảng đó, đọc ở region khác có thể thấy giá trị cũ; kể cả bật strong read cũng chỉ "strong" với những gì đã ghi ở chính region đó.
- **Last-writer-wins:** nếu hai region sửa cùng một item gần như đồng thời, DynamoDB giữ bản có timestamp muộn hơn; bản kia **mất mà không báo lỗi**. Ví dụ Singapore đặt `stock = 5`, 200 ms sau Frankfurt đặt `stock = 8` → mọi region hội tụ về 8, lượt ghi của Singapore biến mất.
- Use case: app toàn cầu cần độ trễ thấp ở mọi nơi, chấp nhận lệch nhau khoảng một giây giữa các region.

**Chế độ strong consistency đa region (MRSC, có từ 2025).** Lượt ghi được sao chép **đồng bộ** sang ít nhất một region khác trước khi báo thành công, nên đọc strong ở region nào cũng thấy dữ liệu mới nhất và **RPO = 0**. Đổi lại: ghi chậm hơn (phải chờ đường truyền liên region), bắt buộc **đúng 3 region**, và không dùng được TTL, LSI, transaction. Đề SAA-C03 phần lớn viết trước khi có chế độ này, nên khi đề nói "Global Tables" hãy hiểu là **eventual + last-writer-wins**.

### 5.9 Transactions

Bình thường mỗi lệnh ghi DynamoDB độc lập với nhau. **Transaction** gom nhiều thao tác thành một khối **all-or-nothing**: hoặc tất cả thành công, hoặc không gì thay đổi. Ví dụ kinh điển: trừ tồn kho và tạo đơn hàng phải đi cùng nhau.

- Tối đa **100 item / tổng 4 MB** trong một transaction, được trải trên **nhiều bảng** miễn là cùng account và cùng region.
- Tốn **2x WCU/RCU**: DynamoDB thực hiện hai lượt cho mỗi item, một lượt chuẩn bị (prepare) và một lượt chốt (commit). Capacity vẫn bị tính kể cả khi transaction bị huỷ.
- Đảm bảo **ACID** trong phạm vi một region. Với Global Tables, region khác có thể thấy transaction "nửa chừng" trong lúc dữ liệu đang được sao chép sang.

### 5.10 TTL

**TTL (time to live)** cho DynamoDB tự xoá item hết hạn. Bạn chọn một attribute kiểu Number chứa **thời điểm hết hạn dạng Unix epoch tính bằng giây**; qua thời điểm đó, một tiến trình nền sẽ dọn item.

- **Free**: xoá bằng TTL **không tốn WCU**.
- **Không xoá đúng giờ.** Đề thi và tài liệu cũ ghi "trong vòng 48 giờ"; docs hiện tại viết "thường trong vài ngày". Trong lúc chờ, item hết hạn **vẫn hiện ra khi đọc**, nên app cần tự lọc (ví dụ thêm điều kiện `expiresAt > now`) nếu yêu cầu chính xác.
- Item bị TTL xoá vẫn đi vào Streams (§5.6), tận dụng được để chép sang S3 trước khi mất.
- Use case: session, token tạm, dữ liệu cảm biến cũ, soft-delete rồi archive.

---

## 6. Caching patterns

### 6.1 Cache-aside (lazy loading)
```
1. App GET cache(key)
2. Hit → return.
3. Miss → query DB → write cache TTL → return.
```
✓ Đơn giản. ✗ First request slow (cold miss).

### 6.2 Write-through
```
1. Write DB.
2. Write cache.
```
✓ Cache always warm. ✗ Write latency cao.

### 6.3 Write-behind
```
1. Write cache.
2. Async batch flush DB.
```
✓ Write fast. ✗ Risk lose data nếu cache fail.

### 6.4 Refresh-ahead
- Thay vì chờ key hết TTL rồi mới nạp lại (lượt đọc đầu tiên sau đó sẽ chậm), cache **chủ động nạp lại ở nền khi TTL gần hết** cho những key đang được đọc nhiều.
- ✓ Avoid cold miss spike: tránh cảnh nhiều request cùng trượt cache một lúc và cùng dồn xuống DB. ✗ Complex: phải đoán key nào còn cần; đoán sai thì tốn công nạp thứ không ai đọc.

### 6.5 ElastiCache choice

**ElastiCache** là dịch vụ cache in-memory do AWS vận hành, có hai họ engine. **Redis** (và **Valkey**, bản fork mã nguồn mở mà AWS hiện khuyến nghị; đề thi vẫn gọi chung là Redis) là một "máy chủ cấu trúc dữ liệu" chạy trong RAM: ngoài chuỗi còn có list, hash, sorted set…, có sao chép và tự failover. **Memcached** chỉ làm một việc là lưu cặp key → giá trị trong RAM, đa luồng nên tận dụng tốt máy nhiều core, nhưng không có sao chép: node chết là mất phần dữ liệu trên node đó.

Từ khác biệt gốc đó suy ra cả bảng:

| | Redis | Memcached |
|--|-------|-----------|
| Data structures | String, List, Set, Hash, Stream, Sorted Set, HyperLogLog | String only |
| Persistence | AOF, RDB snapshot | None |
| Replication | ✓ (cluster mode hoặc primary+replica) | ✗ |
| HA | ✓ Multi-AZ failover | ✗ |
| Pub/Sub | ✓ | ✗ |
| Cluster sharding | Cluster mode | Auto Discovery client-side |
| Use case | Cache + queue + leaderboard + session | Simple object cache |

Vài ô cần một câu giải thích. *Sorted set* là tập phần tử kèm điểm số, luôn được xếp sẵn, nên lấy "top 10" của bảng xếp hạng chỉ là một lệnh. *Persistence* là ghi dữ liệu RAM xuống đĩa để khởi động lại không mất trắng: RDB là chụp snapshot định kỳ, AOF là ghi nối đuôi từng lệnh. *Auto Discovery* của Memcached nghĩa là client tự lấy danh sách node rồi **tự chia key** ra các node; server không hề biết về nhau.

Redis trên ElastiCache có hai kiểu triển khai:

**Cluster mode disabled** (replication group): **1 primary + tối đa 5 replica**, mọi node giữ **toàn bộ** dữ liệu. Primary nhận ghi, replica phục vụ đọc và sẵn sàng thế chỗ. Scale đọc bằng cách thêm replica; dung lượng và tải ghi bị giới hạn bởi cỡ của một node. Bật Multi-AZ thì khi primary chết, replica có lag thấp nhất được đưa lên, ghi lại được **thường chỉ sau vài giây** (tài liệu ôn thi ghi an toàn là "dưới 1 phút").

**Cluster mode enabled** (sharded): dữ liệu được **chia ra nhiều shard** (tối đa 500), mỗi shard có primary riêng và 0–5 replica. Scale ngang cả dung lượng lẫn tải ghi. Cách chia: Redis định nghĩa cố định **16.384 hash slot**; mỗi key được băm ra một số slot trong khoảng đó, và mỗi shard nhận quản một dải slot. Ví dụ 3 shard thì chia 0–5460, 5461–10922, 10923–16383. Thêm shard nghĩa là chuyển bớt một số slot (cùng các key trong đó) sang shard mới, không phải băm lại toàn bộ. Với người thi SAA, con số 16.384 không cần thuộc; chỉ cần nhớ **cluster mode enabled = sharding = scale ghi và dung lượng**, còn **disabled = một shard, scale đọc bằng replica**.

Sao chép của Redis là **async**, nên failover có thể mất vài lượt ghi cuối chưa kịp sang replica. Chấp nhận được với cache; đừng dùng nó làm nơi lưu duy nhất cho dữ liệu không được phép mất.

> Bẫy thi: cần **HA / Multi-AZ / lưu lại sau khi restart / leaderboard / pub-sub / session bền** → **Redis**. Chỉ cần cache object đơn giản, đa luồng, không cần HA → **Memcached**.

---

## 7. Tự kiểm tra

1. App global, write-heavy, cần latency thấp toàn cầu, strong consistency cross-region. Service?
   <details><summary>Đáp án</summary>**Spanner GCP**. AWS không có 1:1. **Aurora Global** strong intra, eventual cross. **DDB Global Tables** AP. Nếu bắt buộc strong cross-region → workaround (single writer region + Route53 latency, hoặc external coordinator). <br><br>Cập nhật: đó là đáp án theo đề SAA-C03 truyền thống. Từ 2025 AWS đã có hai lựa chọn gần hơn: **DynamoDB Global Tables chế độ multi-Region strong consistency** (đúng 3 region, §5.8) và **Aurora DSQL** (SQL tương thích PostgreSQL, active-active, strong consistency đa region nhưng chưa trải được liên châu lục). Cả hai đều trả giá bằng độ trễ ghi cao hơn, nên "latency thấp toàn cầu + strong" vẫn là đánh đổi chứ không miễn phí.</details>

2. RDS PostgreSQL Multi-AZ. Promote standby thành writer khi nào?
   <details><summary>Đáp án</summary>**Tự động** khi primary fail (60-120s, DNS update). Multi-AZ DB cluster < 35s.</details>

3. Lambda + RDS connection exhaustion. Fix?
   <details><summary>Đáp án</summary>**RDS Proxy** — pool connection. Hoặc cân nhắc **DynamoDB** (no connection).</details>

4. DDB table với PK = `status` (4 giá trị). Vấn đề?
   <details><summary>Đáp án</summary>**Hot partition** — 4 PK chỉ map 4 partition, mỗi partition limit 3000 RCU. Fix: suffix random hoặc redesign PK (UserId, OrderId).</details>

5. App e-commerce, query: getUserOrders, getProductsByCategory, getOrdersByStatus. DDB design?
   <details><summary>Đáp án</summary>**Single-table**: PK=USER#id SK=ORDER#date, PK=CAT#name SK=PRODUCT#id. GSI1: `GSI1PK=STATUS#pending GSI1SK=timestamp`. (Bảng mẫu và câu query ở §5.4.)</details>

6. Aurora vs DynamoDB cho microservice catalog?
   <details><summary>Đáp án</summary>Depends. Có JOIN + transaction + ad-hoc query → **Aurora**. Scale lớn + access pattern fix + ms latency → **DDB**. Catalog thường ít write, nhiều read filter → **Aurora + ElastiCache** cache layer.</details>

7. ElastiCache Redis cluster mode disabled. Failover bao lâu?
   <details><summary>Đáp án</summary>**< 1 phút** với Multi-AZ. Replica auto promote (thực tế thường chỉ vài giây là ghi lại được, xem §6.5).</details>

8. DDB strong consistency read cost?
   <details><summary>Đáp án</summary>**2x** eventual. 1 RCU = 1 strong-read 4KB = 2 eventual-read 4KB. Ví dụ item 6 KB, 100 đọc/giây: strong 200 RCU, eventual 100 RCU (§5.3).</details>

9. Cache pattern: data update nhiều, đọc nhiều, không chấp nhận stale. Pattern?
   <details><summary>Đáp án</summary>**Write-through** + short TTL. Hoặc bypass cache cho read sau write.</details>

10. RDS encrypt unencrypted DB?
    <details><summary>Đáp án</summary>Snapshot → copy snapshot với encryption KMS → restore. Có downtime cutover hoặc dùng DMS để online.</details>

---

## 8. Đối chiếu GCP

| AWS | GCP |
|-----|-----|
| RDS | Cloud SQL |
| RDS Multi-AZ | Cloud SQL HA |
| RDS Read Replica | Cloud SQL Read Replica |
| Aurora | **AlloyDB** (closest, MS-PG compatible perf) |
| Aurora Global | **Spanner** (strong consistent multi-region multi-writer) |
| DynamoDB | Firestore / Bigtable |
| DDB Global Tables | Spanner / Firestore multi-region |
| ElastiCache Redis | Memorystore Redis |
| DAX | (không có) |
| Redshift | BigQuery |
| Athena | BigQuery (serverless query) |

**Bẫy lớn:**
1. **Spanner vs Aurora Global** — Spanner strong consistent multi-writer, Aurora Global 1 writer eventual reader region. Khác hẳn paradigm.
2. **Firestore vs DynamoDB** — Firestore document + real-time listener; DDB cần Streams + Lambda. Mindset query khác.
3. **BigQuery storage native**, Athena chỉ query S3. Migrate BQ → Athena cần move data sang S3 Parquet.

→ Đọc [[foundations-01-cap-theorem]] phần PACELC để hiểu vì sao Spanner và Aurora Global khác nhau căn bản.

---

## 9. Lưu ý SAA

- **Multi-AZ ≠ Read Replica** (đề thi hay bẫy).
- **Aurora 6 replica 3 AZ** built-in, quorum 4/6 write.
- **Aurora Global** RPO 1s, RTO < 1 phút.
- **DDB GSI eventual only**, **LSI strong option**.
- **DDB On-Demand đắt hơn provisioned** cho steady workload: ~3,5x theo giá hiện tại, tài liệu cũ ghi 7x (§5.3).
- **DDB hot partition** — PK cardinality cao.
- **DAX** µs cache, only DDB, in-VPC.
- **DDB Global Tables** active-active eventual.
- **RDS Proxy** là đáp án chuẩn cho Lambda + RDS (cạn kết nối).
- **Aurora Backtrack** MySQL 72h.
- **ElastiCache Redis Multi-AZ** với failover.
- **PITR** RDS 35 ngày, DDB 35 ngày.

## 10. Lưu ý đi làm

### Best practice
- **Default RDS PostgreSQL Multi-AZ Cluster**.
- Backup retention **35 ngày** cho prod.
- Performance Insights + Enhanced Monitoring ON.
- **Deletion Protection + Final Snapshot** ON.
- Custom Parameter Group + Option Group (không default).
- Maintenance window low-traffic.
- Monitor `ReplicaLag` (RDS), `ReplicationLatency` (Aurora Global).

### DDB best practice
- **Access pattern document trước** khi tạo table.
- **Single-table** cho microservice + đa entity.
- **PITR + on-demand backup** ON.
- **Auto-scaling provisioned** với target 70%.
- **Streams + Lambda** outbox pattern.
- **Conditional update + version attribute** chống lost update.

### Anti-pattern
- ✗ Self-managed MySQL EC2 prod.
- ✗ Multi-AZ thay vì Read Replica để scale read.
- ✗ Read Replica thay vì Multi-AZ cho HA.
- ✗ DDB scan thay vì query (full table = đắt + slow).
- ✗ Cache TTL quá dài → stale.
- ✗ ElastiCache Memcached prod cần HA.
- ✗ RDS unencrypted prod.

## 11. Foundations
- [[foundations-01-cap-theorem]] — RDS Multi-AZ là CP, DDB default AP.
- [[foundations-02-consistency-models]] — strong vs eventual ở DDB read option.
- [[foundations-03-replication-and-quorum]] — Aurora 4/6 quorum.
- [[foundations-04-latency-vs-consistency]] — Aurora Global vs Spanner.
- [[foundations-05-partitioning-and-sharding]] — DDB hot partition.

## 12. Flashcard

- **RDS Multi-AZ** — HA sync standby, không serve read (trừ Multi-AZ Cluster).
- **RDS Read Replica** — async, scale read, cross-region.
- **Multi-AZ Cluster** (2022) — 3 AZ, reader serve read, < 35s failover.
- **Aurora** — 5x MySQL, 6 replica 3 AZ, quorum 4/6.
- **Aurora Global** — 1 writer + 5 reader region (docs mới: 10), RPO 1s.
- **Aurora Serverless v2** — realtime ACU, MySQL+PG.
- **Aurora Backtrack** — MySQL 72h rewind.
- **Aurora I/O Optimized** — I/O free if > 25% cost.
- **RDS Proxy** — connection pool cho Lambda.
- **DDB On-Demand** — đắt hơn provisioned cho steady (~3,5x hiện tại; tài liệu cũ: 7x).
- **DDB Strong read** — 2x cost.
- **GSI eventual + own throughput**. **LSI strong option, share throughput, same PK**.
- **Hot partition** — PK cardinality cao + suffix shard.
- **Adaptive capacity** auto.
- **DAX** µs cache, in-VPC.
- **Streams** 24h CDC, 4 view types.
- **Global Tables** eventual + last-writer-wins.
- **PITR** 35 ngày DDB + RDS.
- **ElastiCache Redis** HA, Memcached không HA.
- **Cluster mode enabled** = sharded.
