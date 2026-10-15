# Designing for Scalability

Scalability là khả năng hệ thống xử lý được lượng tải tăng dần (hoặc đột biến) bằng cách thêm tài nguyên — mà không phải đập đi xây lại kiến trúc. Trong đề SAA-C03, đây là chủ đề "xương sống": đa số câu hỏi tình huống đều quy về *làm sao hấp thụ traffic spike* và *làm sao tách read khỏi write*. Bài này đi từ nguyên tắc đến từng service cụ thể, kèm bẫy thường gặp.

## 1. Horizontal vs Vertical Scaling

| Tiêu chí | Vertical (scale up) | Horizontal (scale out) |
|---|---|---|
| Cách làm | Đổi instance lớn hơn (t3.medium → m5.4xlarge) | Thêm nhiều instance giống nhau |
| Giới hạn | Có trần phần cứng, phải reboot | Gần như vô hạn |
| Downtime | Thường có (resize cần stop/start) | Không, thêm node nóng |
| Resilience | Vẫn là single point of failure | Tăng độ sẵn sàng (nhiều AZ) |
| Phù hợp | RDS, tier stateful khó phân tán | Web/app tier stateless, container, Lambda |

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Vertical scaling (scale up) so với Horizontal scaling (scale out)</title>
  <desc>Bên trái: vertical scaling đổi một instance nhỏ thành một instance lớn hơn (hộp cao to hơn) nhưng vẫn là một node duy nhất. Bên phải: horizontal scaling giữ kích thước node nhưng thêm nhiều node giống nhau trải qua nhiều AZ.</desc>
  <text x="180" y="26" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Vertical — scale UP</text>
  <text x="540" y="26" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Horizontal — scale OUT</text>
  <line x1="360" y1="40" x2="360" y2="300" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="5 4"/>
  <text x="180" y="46" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">đổi instance lớn hơn — 1 node</text>
  <rect x="70" y="200" width="60" height="60" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="100" y="234" font-size="11" text-anchor="middle" fill="currentColor">t3</text>
  <text x="100" y="248" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">nhỏ</text>
  <path d="M148 230 h44" stroke="currentColor" stroke-opacity="0.55" fill="none" marker-end="url(#suArr)"/>
  <rect x="210" y="62" width="100" height="198" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="260" y="156" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">m5.4xlarge</text>
  <text x="260" y="174" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">CPU/RAM lớn hơn</text>
  <text x="180" y="288" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">có trần phần cứng · cần reboot · vẫn 1 SPOF</text>
  <text x="540" y="46" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.6">thêm nhiều node giống nhau qua AZ</text>
  <g>
    <rect x="410" y="66" width="116" height="56" rx="7" fill="#3b82f6" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 3"/>
    <text x="418" y="80" font-size="10" text-anchor="start" fill="currentColor" opacity="0.6">AZ-a</text>
    <rect x="420" y="88" width="44" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="472" y="88" width="44" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  </g>
  <g>
    <rect x="550" y="66" width="116" height="56" rx="7" fill="#3b82f6" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 3"/>
    <text x="558" y="80" font-size="10" text-anchor="start" fill="currentColor" opacity="0.6">AZ-b</text>
    <rect x="560" y="88" width="44" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="612" y="88" width="44" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  </g>
  <g>
    <rect x="480" y="134" width="116" height="56" rx="7" fill="#3b82f6" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="4 3"/>
    <text x="488" y="148" font-size="10" text-anchor="start" fill="currentColor" opacity="0.6">AZ-c</text>
    <rect x="490" y="156" width="44" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
    <rect x="542" y="156" width="44" height="28" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  </g>
  <text x="540" y="224" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">… thêm node nóng, không downtime …</text>
  <text x="540" y="288" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">gần như vô hạn · tăng cả availability (nhiều AZ)</text>
  <defs>
    <marker id="suArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

> Mẹo thi: Đề thi gần như **luôn ưu tiên horizontal scaling** vì nó vừa tăng scalability vừa tăng availability. Khi thấy đáp án "resize to a larger instance" cho web tier có khả năng cao là bẫy. Vertical chỉ hợp lý cho thành phần khó phân tán (ví dụ một RDS primary cần ghi mạnh hơn).

Nguyên tắc vàng: **muốn scale out thì tier đó phải stateless**. Đẩy session/state ra ngoài (DynamoDB, ElastiCache, hoặc dùng sticky session chỉ khi bất đắc dĩ).

## 2. Auto Scaling Policies (EC2 Auto Scaling Group)

**Auto Scaling Group (ASG)** là một nhóm EC2 instance giống hệt nhau mà AWS tự thêm bớt giúp bạn. Bạn khai ba con số: `min` (không bao giờ ít hơn), `max` (không bao giờ nhiều hơn, để chặn hoá đơn) và `desired` (số instance đang muốn có). ASG luôn cố giữ số instance thật bằng `desired`, rải đều qua các AZ, và thay instance nào hỏng.

**Scaling policy** là quy tắc quyết định *khi nào* `desired` thay đổi và *đổi bao nhiêu*. Có năm loại; đề thi chủ yếu hỏi bạn chọn đúng loại cho đúng kiểu tải.

### 2.1 Ba policy phản ứng theo metric (dynamic scaling)

Cả ba đều dựa vào một **CloudWatch alarm**: một phép so sánh kiểu "CPU trung bình của nhóm > 60% trong vài phút liền" — khi điều kiện đúng thì alarm bật và kích hoạt policy.

**Target tracking — giống cái điều nhiệt.** Bạn chỉ nói "giữ CPU trung bình ở 50%". AWS tự tạo alarm, tự tính cần bao nhiêu instance để kéo metric về mức đó, và tự giảm khi tải xuống. Phép tính đại ý là tỉ lệ thuận:

```
Đang có 4 instance, CPU trung bình 80%, mục tiêu 50%
Số instance cần ≈ 4 × 80 ÷ 50 = 6,4  → làm tròn LÊN 7  → thêm 3 instance
```

Scale-in thì chậm hơn có chủ đích: AWS giảm từ từ để tránh cảnh vừa bớt xong lại phải thêm. Đây là loại AWS khuyến nghị dùng mặc định. Metric có sẵn gồm CPU trung bình, network in/out, và số request mỗi target của ALB (`ALBRequestCountPerTarget`).

**Step scaling — tự viết bậc thang.** Bạn tự đặt alarm và tự quy định "lệch bao nhiêu thì thêm bấy nhiêu". Ví dụ với alarm CPU > 60%:

```
CPU 60% – 80%   → thêm 1 instance
CPU trên 80%    → thêm 3 instance
CPU dưới 30%    → bớt 1 instance   (một alarm khác)
```

Dùng khi bạn muốn kiểm soát phản ứng cụ thể hơn target tracking — tải lệch ít thì nhích nhẹ, lệch nhiều thì thêm mạnh.

**Simple scaling — bản cũ của step.** Mỗi alarm chỉ gắn **một** hành động ("CPU > 60% thì thêm 1"), và sau mỗi lần scale phải chờ hết **cooldown** rồi mới nhận alarm tiếp. *Cooldown* là khoảng nghỉ bắt buộc sau một hoạt động scale, để instance mới kịp gánh tải trước khi ASG quyết định thêm nữa; mặc định **300 giây**. Trong 300 giây đó dù tải tăng gấp ba ASG cũng đứng im — đó là lý do step scaling thay thế nó.

> Cooldown 300 giây **chỉ áp cho simple scaling**. Target tracking và step scaling không dùng cooldown mà dùng **instance warmup**: khoảng thời gian một instance mới chưa được tính vào metric trung bình của nhóm (vì nó còn đang khởi động, CPU chưa phản ánh tải thật). Trong lúc đó ASG vẫn tiếp tục scale-out được nếu các instance cũ còn vượt ngưỡng.

### 2.2 Hai policy đi trước tải (proactive scaling)

**Scheduled scaling** đổi `min`/`max`/`desired` theo lịch cố định (một lần hoặc cron). Ví dụ: 8h30 sáng thứ Hai đến thứ Sáu nâng `desired` lên 10, 19h hạ về 2. Không nhìn metric nào cả — bạn phải biết trước lịch.

**Predictive scaling** dùng machine learning học từ lịch sử metric của chính ASG, dự báo tải cho các giờ sắp tới, rồi launch instance **trước** khi tải đến. Khác scheduled ở chỗ bạn không cần tự viết lịch — AWS tự tìm ra quy luật ngày/tuần. Nó chỉ lo scale-out trước; thường dùng **kèm** target tracking để xử lý phần tải lệch khỏi dự báo.

### 2.3 Đặt năm loại cạnh nhau

| Policy | Cơ chế | Khi nào dùng |
|---|---|---|
| **Target tracking** | Giữ một metric ở mức mục tiêu (vd CPU = 50%) | Mặc định khuyến nghị, đơn giản, tự tính số instance cần thêm/bớt |
| **Step scaling** | Thêm/bớt theo bậc tuỳ mức vượt ngưỡng alarm | Cần kiểm soát chi tiết phản ứng theo độ lệch metric |
| **Simple scaling** | Một hành động cho mỗi alarm, có cooldown 300 giây | Cũ, ít dùng — step scaling thay thế |
| **Scheduled** | Scale theo lịch (cron) | Tải có quy luật thời gian biết trước (9h sáng thứ Hai tăng) |
| **Predictive** | ML dự báo tải tương lai, provision trước | Tải tuần hoàn theo ngày/tuần, muốn tránh độ trễ khởi động |

> Mẹo thi:
> - Tải **biết trước theo giờ/ngày** (batch tối, giờ hành chính) → **Scheduled scaling**.
> - Tải **lặp theo chu kỳ nhưng muốn AWS tự dự báo** → **Predictive scaling**.
> - Spike **đột ngột, không đoán được** → Target tracking phản ứng nhanh, hoặc kết hợp với queue (mục 6).

### 2.4 Vì sao dynamic scaling luôn trễ vài phút

Policy phản ứng theo metric thì phải đợi metric đổi trước đã. Từ lúc tải tăng tới lúc instance mới thật sự nhận request có bốn chặng nối tiếp nhau:

```
1. Metric lên CloudWatch     : EC2 mặc định gửi 5 phút/lần; bật detailed monitoring thì 1 phút/lần
2. Alarm bật                 : cần vài điểm dữ liệu liên tiếp vượt ngưỡng  → thêm vài phút
3. Launch + boot instance    : giả sử ~1–2 phút (tuỳ AMI và script khởi động)
4. Qua health check của ELB  : thêm vài chục giây tới ~1 phút
→ Tổng: cỡ vài phút, kể cả khi đã bật detailed monitoring
```

(Chặng 3–4 là số minh hoạ; chúng phụ thuộc hoàn toàn vào ứng dụng của bạn.) Vài phút là ổn với tải tăng dần, nhưng một flash sale tăng gấp 10 lần trong 30 giây thì ASG không đuổi kịp.

> Bẫy: Target tracking có **độ trễ** cỡ vài phút như trên. Nếu spike rất nhanh và đề nhấn "instantaneous"/"immediate", câu trả lời thường là **kiến trúc đệm bằng queue/serverless**, không phải tinh chỉnh ASG.

### 2.5 Warm pools và lifecycle hooks

**Warm pool** rút ngắn chặng 3 ở trên. Đó là một nhóm instance **đã launch và khởi tạo xong từ trước**, rồi được cất ở trạng thái `Stopped` hoặc `Hibernated` (hoặc để `Running`). Khi cần scale-out, ASG lấy instance từ warm pool ra bật lên thay vì launch mới từ AMI, nên bỏ qua được phần cài đặt/khởi động ứng dụng vốn chậm nhất. Instance đang `Stopped` không tính tiền compute, chỉ tính tiền EBS volume — rẻ hơn nhiều so với để sẵn instance chạy không. Hợp với ứng dụng boot lâu (nạp dữ liệu lớn, JVM khởi động chậm).

**Lifecycle hook** là điểm dừng bạn chèn vào quá trình launch hoặc terminate để chạy việc riêng. Khi có hook, instance bị giữ ở trạng thái chờ — `Pending:Wait` lúc vào, `Terminating:Wait` lúc ra — cho tới khi bạn báo "xong" hoặc hết timeout (mặc định **1 giờ**).

- Lúc **launch**: cài agent, kéo config, nạp cache trước khi instance nhận traffic.
- Lúc **terminate**: đẩy log lên S3, hoàn tất request dang dở, huỷ đăng ký khỏi hệ thống khác.

> Bẫy: Khi instance bị terminate lúc scale-in mà connection chưa drain → dùng **lifecycle hook (Terminating:Wait)** + connection draining (deregistration delay) ở ELB, đừng để mất request đang xử lý. *Deregistration delay* là khoảng thời gian ELB ngừng gửi request mới tới instance nhưng vẫn chờ các request đang chạy hoàn tất; mặc định **300 giây**.

## 3. Scaling Reads — Tách Read khỏi Write

Đây là chủ đề bị hỏi *cực nhiều*. Hầu hết workload là read-heavy — một trang sản phẩm được xem hàng nghìn lần cho mỗi lần sửa giá — nên scale phần đọc là cách rẻ và nhanh nhất. Với database quan hệ, ghi thì chỉ một node làm được (để giữ dữ liệu nhất quán), nhưng đọc thì chia cho nhiều bản sao được.

### RDS Read Replicas

**Nó là gì.** Read replica là một DB instance thứ hai chứa **bản sao chỉ-đọc** của database chính (primary). Primary ghi nhận mọi thay đổi rồi gửi sang replica để replica áp lại. App gửi lệnh ghi vào primary, còn các câu `SELECT` nặng thì gửi sang replica.

**Vì sao có "lag".** Việc sao chép là **bất đồng bộ** (asynchronous): primary trả "ghi xong" cho app ngay, *không đợi* replica nhận được. Nhờ vậy ghi không bị chậm đi, nhưng replica luôn đi sau primary một chút — khoảng trễ đó gọi là **replica lag**, bình thường dưới một giây, nhưng có thể lên nhiều giây hoặc phút khi primary ghi dồn dập. Hệ quả gọi là **eventual consistency**: đọc từ replica có thể ra dữ liệu cũ, một lúc sau mới đúng.

```
10:00:00,000  User đổi tên thành "Lan"  → ghi vào primary, primary trả OK
10:00:00,050  App reload trang hồ sơ    → SELECT đi tới replica
              Replica chưa nhận thay đổi → trả tên cũ "Hoa"   ← user tưởng lưu lỗi
10:00:00,400  Replica áp xong thay đổi  → từ giờ đọc mới ra "Lan"
```

Cách xử lý thường gặp: những màn hình "đọc lại ngay thứ mình vừa ghi" thì đọc từ primary; còn báo cáo, danh sách, tìm kiếm thì đọc từ replica.

**Các điểm cần nhớ:**

- Mỗi primary có tối đa **15 read replica** (RDS MySQL, MariaDB, PostgreSQL). Aurora cũng 15 nhưng cơ chế khác hẳn — xem mục dưới.
- Mỗi replica có **endpoint riêng** (một địa chỉ DNS riêng). RDS thường không tự chia tải: **ứng dụng phải chủ động** gửi query đọc sang endpoint của replica.
- Replica có thể đặt ở **region khác** (cross-region) để user ở xa đọc gần hơn, hoặc làm bản dự phòng.
- Replica có thể được **promote** thành một database độc lập, nhưng đó là thao tác thủ công.
- Dùng cho: offload báo cáo/analytics khỏi primary, scale lượng đọc, đọc cross-region.

> Bẫy phân biệt **Read Replica vs Multi-AZ**:
> - **Multi-AZ** = *high availability/disaster recovery*. Standby **không phục vụ read**, chỉ để failover tự động. (Trừ Multi-AZ DB cluster mới có 2 readable standby.)
> - **Read Replica** = *scale read performance*. Không tự failover (trừ khi promote thủ công).
> - Câu hỏi nói "offload reads / scale read traffic" → Read Replica. Nói "survive AZ failure / automatic failover" → Multi-AZ.

Nguyên nhân gốc của khác biệt: Multi-AZ sao chép **đồng bộ** (primary đợi standby nhận xong mới trả OK) nên standby không bao giờ thiếu dữ liệu và failover được an toàn; read replica sao chép **bất đồng bộ** nên nhanh, nhưng có thể thiếu vài giao dịch cuối — vì thế AWS không tự failover sang nó.

### Aurora Replicas

Aurora giải bài toán lag bằng cách đổi kiến trúc: **mọi instance trong cluster dùng chung một storage volume**. Writer ghi dữ liệu xuống volume đó; các replica (Aurora gọi là *reader*) đọc thẳng từ chính volume đó chứ không giữ bản sao dữ liệu riêng. Vì không phải chép cả dữ liệu sang, lag thường **dưới 100 mili-giây** — so với RDS thường là từ dưới một giây tới nhiều giây.

- Một cluster có tối đa **15 Aurora Replica**, rải qua các AZ.
- **Reader endpoint**: một địa chỉ DNS duy nhất, Aurora tự chia connection đọc qua các reader. App chỉ cần nhớ hai endpoint — *writer endpoint* để ghi và *reader endpoint* để đọc — thêm bớt reader không phải sửa config.
- Reader cũng là **đích failover**: writer chết thì Aurora tự promote một reader lên thay. Tức là ở Aurora, một replica vừa scale read vừa lo HA — khác với RDS thường phải tách Read Replica và Multi-AZ.
- **Aurora Auto Scaling** tự thêm/bớt reader theo metric (CPU trung bình hoặc số connection của các reader), giống target tracking của ASG.
- **Aurora Global Database**: một cluster chính ở một region và các cluster phụ chỉ-đọc ở region khác, lag thường dưới 1 giây. Cho user ở xa đọc tại chỗ, đồng thời là phương án DR khi cả region chính gặp sự cố.

### ElastiCache (Redis / Memcached)

**Nó là gì.** ElastiCache là dịch vụ chạy hộ bạn một **in-memory cache** — kho key-value giữ dữ liệu trong RAM thay vì trên đĩa, nên một lần đọc mất dưới 1 mili-giây, trong khi một câu SQL có `JOIN` thường mất vài tới vài chục mili-giây. Đặt cache trước database: kết quả một query tốn kém được lưu lại với một key (ví dụ `product:123`); các request sau lấy từ RAM, không chạm DB. Cả tải đọc lẫn latency cùng giảm.

Bạn chọn một trong hai engine. (ElastiCache nay có thêm **Valkey**, một bản fork tương thích Redis; đề thi vẫn nói "Redis" là chủ yếu.)

**Redis** là lựa chọn mặc định khi cần hơn một cái cache đơn thuần. Năm tính năng hay được nhắc trong đề:

- **Replication**: mỗi node chính (primary) có tới 5 **replica** chỉ-đọc. Primary chết thì một replica tự được đưa lên thay (Multi-AZ với automatic failover); bình thường thì replica chia bớt tải đọc.
- **Cluster mode**: chia dữ liệu thành nhiều **shard** — mỗi shard là một nhóm primary + replica giữ một phần của tập key. Đây là cách scale cả *ghi* lẫn *dung lượng* vượt quá sức một node.
- **Persistence**: ghi được dữ liệu trong RAM ra đĩa (snapshot hoặc log), nên restart không mất trắng và có thể backup/restore.
- **Pub/sub**: một bên publish message vào một kênh, mọi bên đang subscribe nhận được ngay — dùng cho chat, thông báo real-time.
- **Cấu trúc dữ liệu**: không chỉ chuỗi mà còn list, hash, set và **sorted set** — tập phần tử tự xếp hạng theo điểm số. Bảng xếp hạng game (leaderboard) là ví dụ kinh điển: cập nhật điểm và lấy top 10 đều là một lệnh.

**Memcached** thì ngược lại, cố tình tối giản: chỉ lưu key → chuỗi, **không** replication, **không** persistence, không failover — node chết là mất dữ liệu trên node đó. Đổi lại nó **đa luồng** (tận dụng hết CPU nhiều core của một node) và scale ngang đơn giản bằng cách thêm node, client tự chia key cho các node.

| | **Redis** | **Memcached** |
|---|---|---|
| Kiểu dữ liệu | Chuỗi, list, hash, set, sorted set… | Chỉ chuỗi |
| Replication / failover | Có (Multi-AZ, tự failover) | Không |
| Persistence, backup | Có | Không |
| Pub/sub | Có | Không |
| Luồng xử lý | Lệnh chạy trên một luồng chính | Đa luồng |
| Chọn khi | Cần HA, đọc từ replica, session quan trọng, leaderboard, pub/sub | Cache đơn giản, mất dữ liệu cache cũng không sao |

> Mẹo thi: thấy "high availability", "failover", "backup", "leaderboard / sorted set", "pub/sub" → **Redis**. Thấy "simple", "multi-threaded", "không cần bền vững" → **Memcached**.

### DynamoDB

DynamoDB là database NoSQL key-value do AWS quản lý hoàn toàn: không có instance nào để chọn cỡ, dữ liệu tự chia ra nhiều partition phía sau. Vì vậy "scale DynamoDB" không phải là thêm máy mà là **mua bao nhiêu thông lượng đọc/ghi**.

**Đơn vị đo: RCU và WCU.**

- **1 RCU** (read capacity unit) = 1 lần đọc *strongly consistent* mỗi giây cho item tới **4 KB**, hoặc 2 lần đọc *eventually consistent* mỗi giây. (Strongly consistent: luôn trả dữ liệu mới nhất. Eventually consistent — mặc định — có thể trả dữ liệu cũ hơn một chút, đổi lại rẻ bằng nửa.)
- **1 WCU** (write capacity unit) = 1 lần ghi mỗi giây cho item tới **1 KB**.
- Item lớn hơn thì làm tròn **lên** theo bội số của 4 KB (đọc) hoặc 1 KB (ghi).

```
Đọc 500 item/giây, mỗi item 6 KB:
  6 KB ÷ 4 KB = 1,5 → làm tròn lên 2 RCU cho mỗi lần đọc
  Strongly consistent  : 500 × 2      = 1.000 RCU
  Eventually consistent: 500 × 2 ÷ 2  =   500 RCU

Ghi 200 item/giây, mỗi item 2,5 KB:
  2,5 KB ÷ 1 KB → làm tròn lên 3 WCU cho mỗi lần ghi
  200 × 3 = 600 WCU
```

**Hai chế độ trả tiền cho thông lượng đó:**

| | **Provisioned (+ Auto Scaling)** | **On-demand** |
|---|---|---|
| Bạn khai gì | Số RCU/WCU của bảng | Không khai gì |
| Trả tiền | Theo RCU/WCU đã đặt, **mỗi giờ, dùng hay không cũng trả** | Theo từng request thực tế |
| Vượt mức | Request bị throttle (`ProvisionedThroughputExceededException`) | DynamoDB tự nới theo tải |
| Auto Scaling | Tự chỉnh RCU/WCU trong khoảng min–max để giữ mức sử dụng mục tiêu (AWS khuyến nghị 70%); phản ứng sau **vài phút** | Không cần |
| Hợp khi | Tải ổn định, đoán trước được | Tải thất thường, spike khó đoán, bảng mới chưa biết tải |

On-demand đắt hơn *trên mỗi request*: hiện khoảng **3,5 lần** so với provisioned được dùng hết 100% (tài liệu cũ ghi ~7 lần, từ trước đợt giảm giá on-demand). Nhưng provisioned trả tiền cả lúc bảng rảnh, nên phép so đúng là theo mức sử dụng trung bình:

```
Điểm hoà vốn ≈ 1 ÷ 3,5 ≈ 29%
Bảng dùng trung bình DƯỚI ~29% capacity đã đặt  → on-demand rẻ hơn
Bảng dùng đều trên mức đó                        → provisioned rẻ hơn
```

Một bảng chỉ bận 2 giờ mỗi ngày rồi gần như im → on-demand. Một bảng chạy đều suốt ngày đêm → provisioned + Auto Scaling.

**DAX (DynamoDB Accelerator)** là một cụm cache in-memory đặt trước DynamoDB và **nói cùng API với DynamoDB**: bạn đổi client SDK sang client DAX, code `GetItem`/`Query` giữ nguyên. Đọc trúng cache trả về trong **micro-giây** thay vì vài mili-giây của DynamoDB (nhanh hơn cỡ 10 lần trở lên). DAX chỉ giúp phần **đọc eventually consistent**; đọc strongly consistent và ghi vẫn đi thẳng xuống bảng. DAX chỉ dùng được với DynamoDB.

**Global Tables** sao chép một bảng sang nhiều region và cho **ghi ở mọi region** (multi-active): user châu Âu ghi vào region châu Âu, user châu Á ghi vào region châu Á, DynamoDB tự đồng bộ hai chiều. Được cả đọc/ghi độ trễ thấp tại chỗ lẫn khả năng chịu sự cố cấp region.

> Mẹo thi: "DynamoDB read latency cao, cần microsecond" → **DAX**. "Cache cho RDS / kết quả query SQL tuỳ ý" → **ElastiCache**, KHÔNG phải DAX.

Mẫu tổng hợp tách read/write cho RDS/Aurora: app **ghi** qua một endpoint tới primary/writer, còn **đọc** đi qua reader endpoint được load-balance trên nhiều read replica, và một lớp cache đứng trước để chặn bớt read trúng DB.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Tách read khỏi write: writer endpoint cho ghi, reader endpoint load-balance qua nhiều read replica, cache đứng trước</title>
  <desc>Ứng dụng gửi write tới writer endpoint nối vào primary. Đọc đi qua cache ElastiCache trước; nếu miss thì qua reader endpoint load-balance tới nhiều read replica. Primary replicate bất đồng bộ sang các replica.</desc>
  <rect x="40" y="150" width="120" height="56" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="100" y="174" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">Ứng dụng</text>
  <text x="100" y="192" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">read + write</text>
  <path d="M160 166 C 210 150, 240 96, 300 96" stroke="#f59e0b" stroke-opacity="0.85" stroke-width="2" fill="none" marker-end="url(#rwArr)"/>
  <text x="222" y="108" font-size="11" font-weight="700" fill="currentColor">write</text>
  <path d="M160 190 C 210 210, 240 250, 300 250" stroke="#10b981" stroke-opacity="0.85" stroke-width="2" fill="none" marker-end="url(#rwArr)"/>
  <text x="218" y="248" font-size="11" font-weight="700" fill="currentColor">read</text>
  <rect x="300" y="70" width="150" height="50" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="375" y="90" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Writer endpoint</text>
  <text x="375" y="107" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">→ Primary (1 node)</text>
  <rect x="252" y="226" width="120" height="48" rx="9" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="312" y="246" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Cache</text>
  <text x="312" y="262" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">ElastiCache</text>
  <path d="M372 250 h28" stroke="#10b981" stroke-opacity="0.7" stroke-width="2" fill="none" marker-end="url(#rwArr)"/>
  <text x="386" y="242" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">miss</text>
  <rect x="400" y="226" width="150" height="48" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="475" y="246" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">Reader endpoint</text>
  <text x="475" y="262" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">load-balance read</text>
  <rect x="560" y="60" width="130" height="44" rx="8" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="625" y="86" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">Primary</text>
  <path d="M450 95 h100" stroke="currentColor" stroke-opacity="0.5" fill="none" marker-end="url(#rwArr)"/>
  <rect x="560" y="150" width="130" height="38" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="625" y="174" font-size="10.5" text-anchor="middle" fill="currentColor">Read replica 1</text>
  <rect x="560" y="196" width="130" height="38" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="625" y="220" font-size="10.5" text-anchor="middle" fill="currentColor">Read replica 2</text>
  <rect x="560" y="242" width="130" height="38" rx="8" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="625" y="266" font-size="10.5" text-anchor="middle" fill="currentColor">Read replica … (tới 15)</text>
  <path d="M550 250 C 552 220, 554 190, 558 175" stroke="currentColor" stroke-opacity="0.45" fill="none" marker-end="url(#rwArr)"/>
  <path d="M550 250 h6" stroke="currentColor" stroke-opacity="0.45" fill="none" marker-end="url(#rwArr)"/>
  <path d="M550 250 C 552 256, 554 258, 558 260" stroke="currentColor" stroke-opacity="0.45" fill="none" marker-end="url(#rwArr)"/>
  <g stroke="#f59e0b" stroke-opacity="0.55" stroke-dasharray="4 3" fill="none">
    <path d="M625 104 V 150" marker-end="url(#rwArr)"/>
    <path d="M690 104 C 720 150, 720 200, 692 210" marker-end="url(#rwArr)"/>
  </g>
  <text x="700" y="130" font-size="9.5" fill="currentColor" opacity="0.7" transform="rotate(90 700 130)">replicate async (lag)</text>
  <defs>
    <marker id="rwArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

## 4. Caching Layers — Đặt cache ở đâu

**Cache** là bản sao tạm của một kết quả đã tính, đặt ở chỗ lấy ra nhanh hơn nơi gốc. Request sau hỏi đúng thứ đó thì trả luôn bản sao (*cache hit*); không có thì mới đi hỏi nơi gốc rồi lưu lại (*cache miss*). Cache đẩy dữ liệu gần người dùng hoặc gần compute hơn, nên vừa giảm tải backend vừa giảm latency.

Ba từ đi kèm mọi loại cache:

- **TTL (time to live)**: thời hạn sống của một bản sao, tính bằng giây. Hết TTL thì bản sao bị bỏ, request kế tiếp là một miss và phải lấy lại từ nguồn.
- **Stale**: bản sao đã **cũ so với nguồn** — dữ liệu gốc đổi rồi mà cache chưa hết hạn. TTL càng dài thì cache càng đỡ tải cho backend, nhưng người dùng càng có thể thấy dữ liệu stale lâu hơn.
- **Invalidate**: chủ động xoá một bản sao trước khi hết TTL, vì biết dữ liệu gốc vừa đổi.

Trên AWS có bốn chỗ đặt cache, tính từ người dùng vào trong:

**CloudFront (edge).** Mạng CDN với các *edge location* đặt gần người dùng trên khắp thế giới. Bản sao nằm ở edge nên request không cần đi về region của bạn. Cache được file tĩnh, video, và cả response API nếu cho phép. TTL lấy từ header `Cache-Control` mà origin trả về hoặc từ cache policy của distribution; muốn xoá sớm thì tạo một **invalidation** theo đường dẫn (ví dụ `/images/*`).

**API Gateway caching.** Cache response của **REST API** ngay tại API Gateway, bật theo từng **stage** — stage là một bản triển khai có tên của API (`dev`, `prod`…), mỗi stage có URL và cấu hình riêng. TTL mặc định **300 giây**, tối đa **3.600 giây**; đặt 0 là tắt cache. Khi bật, mặc định chỉ method `GET` được cache. Client có thể ép lấy bản mới bằng header `Cache-Control: max-age=0` (nên giới hạn quyền này bằng IAM), hoặc bạn flush cả cache của stage. Cache này là một instance riêng, tính tiền theo giờ theo dung lượng bạn chọn.

**ElastiCache.** Cache do **code ứng dụng** tự đọc/ghi: kết quả query, session, leaderboard, bộ đếm rate-limit. Ứng dụng tự đặt TTL cho từng key và tự xoá key khi dữ liệu gốc đổi (xem hai chiến lược bên dưới).

**DAX.** Cache riêng cho DynamoDB như đã nói ở §3: item và kết quả query được giữ theo TTL cấu hình trên cụm DAX; ghi qua DAX thì item trong cache được cập nhật luôn.

| Layer | Service | Cache cái gì |
|---|---|---|
| Edge (gần user) | **CloudFront** | Static + dynamic content, API responses, video |
| Database/app | **ElastiCache** | Kết quả query, session, leaderboard, rate-limit counter |
| DynamoDB | **DAX** | Item/query reads của DynamoDB |
| API | **API Gateway caching** | Response của REST API theo stage |

> Mẹo thi: "Giảm tải cho origin/web server, phục vụ user toàn cầu, hấp thụ spike đọc nội dung tĩnh" → **CloudFront**. Nó còn hấp thụ được spike đột biến (flash sale, viral) cho static/cacheable content mà không cần scale backend.

Mẫu kiến trúc nhiều tầng cache điển hình: **CloudFront → API Gateway (cache) → ElastiCache → RDS/DynamoDB(+DAX)**. Mỗi tầng trả lời được phần lớn request tới nó và chỉ để lọt phần miss xuống tầng sau. Ví dụ với tỉ lệ hit giả định 95% ở edge và 80% ở tầng cache ứng dụng:

```
1.000 request/giây tới CloudFront, 95% hit  → còn 50 request/giây về origin
50 request/giây tới ElastiCache, 80% hit    → còn 10 query/giây chạm database
```

Database chỉ phải chịu 1% lượng request ban đầu — đó là lý do thêm cache thường rẻ hơn nhiều so với scale database.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cache nhiều tầng: CloudFront ở edge, API Gateway cache, ElastiCache, rồi RDS/DynamoDB với DAX — mỗi tầng chặn bớt tải xuống backend</title>
  <desc>Request đi từ trái sang phải qua các tầng cache. Mỗi tầng phục vụ phần lớn request (cache hit) và chỉ để lọt phần nhỏ xuống tầng sau, nên lượng tải tới database nhỏ dần. Thứ tự: CloudFront edge, API Gateway cache, ElastiCache, cuối cùng RDS/DynamoDB kèm DAX.</desc>
  <text x="16" y="24" font-size="12.5" font-weight="700" fill="currentColor">Mỗi tầng cache chặn bớt — tải xuống backend nhỏ dần</text>
  <rect x="20" y="60" width="120" height="120" rx="10" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="80" y="86" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">CloudFront</text>
  <text x="80" y="103" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">edge, gần user</text>
  <text x="80" y="120" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">tĩnh + API resp</text>
  <rect x="180" y="72" width="116" height="96" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="238" y="98" font-size="11.5" font-weight="700" text-anchor="middle" fill="currentColor">API Gateway</text>
  <text x="238" y="114" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">cache theo</text>
  <text x="238" y="128" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">stage</text>
  <rect x="336" y="84" width="112" height="72" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="392" y="110" font-size="11" font-weight="700" text-anchor="middle" fill="currentColor">ElastiCache</text>
  <text x="392" y="126" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">query/session</text>
  <rect x="488" y="96" width="100" height="48" rx="10" fill="#8b5cf6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="538" y="118" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">DAX</text>
  <text x="538" y="133" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.7">cache DynamoDB</text>
  <rect x="616" y="96" width="86" height="48" rx="10" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="659" y="116" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">RDS /</text>
  <text x="659" y="132" font-size="10.5" font-weight="700" text-anchor="middle" fill="currentColor">DynamoDB</text>
  <g fill="none" stroke="currentColor">
    <path d="M140 120 h40" stroke-opacity="0.55" stroke-width="3" marker-end="url(#cArr)"/>
    <path d="M296 120 h40" stroke-opacity="0.5" stroke-width="2.2" marker-end="url(#cArr)"/>
    <path d="M448 120 h40" stroke-opacity="0.45" stroke-width="1.6" marker-end="url(#cArr)"/>
    <path d="M588 120 h28" stroke-opacity="0.4" stroke-width="1" marker-end="url(#cArr)"/>
  </g>
  <text x="160" y="210" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">phần lớn request</text>
  <text x="160" y="226" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">dừng sớm ở edge</text>
  <text x="540" y="210" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">chỉ phần nhỏ (miss)</text>
  <text x="540" y="226" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">mới chạm DB</text>
  <path d="M250 245 h220" stroke="currentColor" stroke-opacity="0.4" fill="none" marker-end="url(#cArr)"/>
  <text x="360" y="262" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">tải còn lại giảm dần qua từng tầng</text>
  <defs>
    <marker id="cArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

Hai chiến lược cache phổ biến (đôi khi bị hỏi) — khác nhau ở chỗ **lúc nào** dữ liệu được đưa vào cache:

- **Lazy loading (cache-aside)**: app hỏi cache trước; miss thì đọc DB, trả kết quả, đồng thời ghi kết quả vào cache. Chỉ những thứ thật sự được đọc mới chiếm bộ nhớ, và cache chết thì app vẫn chạy (chỉ chậm đi). Đổi lại, lần miss đầu tốn ba bước nên chậm, và dữ liệu có thể stale: DB đổi rồi mà cache vẫn giữ bản cũ cho tới khi hết TTL.
- **Write-through**: mỗi lần ghi DB thì ghi luôn vào cache. Dữ liệu cache luôn mới, đọc không bao giờ stale. Đổi lại, mỗi lần ghi tốn thêm một bước, và cache chứa cả những thứ không ai đọc. Thường kèm **TTL** để những key lâu không ai đụng tự biến mất khỏi bộ nhớ.

Thực tế hay dùng **cả hai**: write-through cho dữ liệu vừa ghi, lazy loading cho phần còn lại, TTL làm lưới an toàn.

## 5. Scaling Stateless Tiers

Để scale out web/app tier mượt mà:
- **Tách state ra ngoài**: session → ElastiCache for Redis hoặc DynamoDB; file upload → S3; không lưu trên local disk instance.
- **ELB phía trước ASG**: ALB cho HTTP/HTTPS (layer 7, path/host routing), NLB cho TCP/UDP cực nhanh và static IP.
- **Health check** để ASG thay thế instance hỏng; **connection draining** khi scale-in.

> Bẫy: Sticky session (session affinity) trói user vào một instance → khi instance đó scale-in, user mất session, và load phân bổ không đều. Đề thi thích đáp án **externalize session vào ElastiCache/DynamoDB** hơn là bật sticky session.

## 6. Queue-Based Load Leveling — Hấp thụ Spike

Đây là *pattern kinh điển* để xử lý traffic spike mà SAA-C03 rất thích hỏi.

**Vấn đề**: Producer (frontend) tạo request nhanh hơn nhiều so với tốc độ Consumer (backend xử lý). Spike trực tiếp vào backend → quá tải, mất request.

**Giải pháp**: Chèn **SQS** giữa hai tầng. Queue đóng vai trò *buffer*:
- Producer đẩy message vào queue *ngay lập tức* (queue co giãn gần vô hạn) → frontend không bao giờ bị nghẽn.
- Fleet consumer (ASG hoặc Lambda) đọc và xử lý theo **tốc độ ổn định của riêng nó**, không bị spike đè bẹp.
- Scale consumer dựa trên **chiều dài queue** (`ApproximateNumberOfMessagesVisible`). Với target tracking, AWS khuyến nghị dùng metric tự tính **backlog trên mỗi instance** (số message đang chờ ÷ số instance) thay vì con số thô, vì số thô không giảm tỉ lệ thuận khi thêm instance.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 270" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Queue-based load leveling: frontend spike đẩy vào SQS làm buffer, consumer ASG/Lambda đọc và scale theo độ dài queue (backlog)</title>
  <desc>Frontend tạo traffic đột biến lởm chởm, đẩy message ngay vào SQS đóng vai trò buffer co giãn. Phía sau, fleet consumer ASG hoặc Lambda đọc message với tốc độ ổn định và tự scale theo độ dài backlog của queue, nên backend không bị spike đè bẹp.</desc>
  <rect x="20" y="80" width="150" height="86" rx="10" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="95" y="106" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Frontend</text>
  <text x="95" y="123" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">producer</text>
  <g stroke="currentColor" stroke-opacity="0.6" fill="none" stroke-width="1.4">
    <path d="M38 152 l8 -18 l8 22 l8 -28 l8 24 l8 -14 l8 16"/>
  </g>
  <text x="95" y="160" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.6">traffic spike</text>
  <path d="M170 123 h44" stroke="currentColor" stroke-opacity="0.55" stroke-width="2" fill="none" marker-end="url(#qArr)"/>
  <text x="192" y="113" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">đẩy ngay</text>
  <rect x="216" y="74" width="190" height="98" rx="10" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="311" y="98" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">SQS Queue</text>
  <text x="311" y="114" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">buffer co giãn gần vô hạn</text>
  <g>
    <rect x="236" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="260" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="284" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="308" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.45" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="332" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="356" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="380" y="130" width="20" height="26" rx="3" fill="#3b82f6" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
  </g>
  <path d="M406 123 h44" stroke="currentColor" stroke-opacity="0.55" stroke-width="2" fill="none" marker-end="url(#qArr)"/>
  <text x="428" y="113" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">poll đều</text>
  <rect x="452" y="74" width="172" height="98" rx="10" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.45"/>
  <text x="538" y="98" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">ASG / Lambda</text>
  <text x="538" y="114" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">consumers, tốc độ ổn định</text>
  <g>
    <rect x="466" y="128" width="40" height="30" rx="5" fill="#10b981" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="514" y="128" width="40" height="30" rx="5" fill="#10b981" fill-opacity="0.3" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="562" y="128" width="40" height="30" rx="5" fill="#10b981" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.3"/>
  </g>
  <path d="M538 172 C 538 208, 420 208, 360 196" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="5 4" fill="none" marker-end="url(#qArr)"/>
  <rect x="206" y="196" width="320" height="40" rx="8" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
  <text x="366" y="214" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.85">scale consumer theo độ dài queue</text>
  <text x="366" y="229" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.65">metric: ApproximateNumberOfMessagesVisible</text>
  <defs>
    <marker id="qArr" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0 0 L8 3 L0 6 z" fill="currentColor" fill-opacity="0.6"/></marker>
  </defs>
</svg>

> Mẹo thi: Bất cứ khi nào đề mô tả "spiky/unpredictable traffic", "decouple", "không được mất request khi backend bận", "smooth out the load" → nghĩ ngay **SQS (queue-based load leveling)**.

### Phân biệt các dịch vụ decoupling

SQS không phải dịch vụ duy nhất đứng giữa producer và consumer. Năm dịch vụ dưới đây khác nhau ở một câu hỏi: **một message được giao cho ai, và giao xong thì còn hay mất?**

**SQS (standard queue)** — hàng đợi công việc. Một message được **một** worker lấy ra; trong lúc worker xử lý, message bị ẩn khỏi các worker khác (khoảng ẩn gọi là *visibility timeout*, mặc định 30 giây); xử lý xong thì worker **xoá** nó. Nhiều worker cùng đọc một queue là để **chia việc**, không phải để mỗi người nhận một bản. Message chưa ai xử lý được giữ mặc định 4 ngày, tối đa 14 ngày. Standard queue không đảm bảo thứ tự và thỉnh thoảng giao trùng một message (*at-least-once*).

**SQS FIFO** — vẫn là queue, nhưng giữ **đúng thứ tự** gửi và **không giao trùng** (*exactly-once processing*). Cái giá là thông lượng có trần: **300 thao tác/giây** cho mỗi API, hoặc 3.000 message/giây khi gửi theo batch 10 message (có chế độ high throughput nếu cần hơn). Standard queue thì gần như không giới hạn.

**SNS** — phát thanh (pub/sub). Producer publish một message vào một **topic**; **mọi** subscriber của topic đều nhận một bản (queue SQS, Lambda, HTTP endpoint, email…). SNS **đẩy** message đi ngay và không lưu lại: subscriber nào chưa đăng ký lúc đó thì không nhận được. Việc một message được nhân ra cho nhiều nơi nhận gọi là **fan-out**.

**Kinesis Data Streams** — cuốn sổ ghi nối đuôi. Record ghi vào thì nằm lại trong stream theo thứ tự, **đọc không làm mất**: mỗi ứng dụng tự nhớ mình đọc tới đâu, nên nhiều ứng dụng đọc độc lập cùng một dữ liệu và đọc lại từ đầu (*replay*) được. Stream chia thành các **shard** — mỗi shard là một làn ghi riêng, chịu được 1 MB/giây hoặc 1.000 record/giây chiều ghi và 2 MB/giây chiều đọc; cần thông lượng lớn hơn thì thêm shard. Thứ tự chỉ được giữ **trong từng shard**. Dữ liệu được giữ mặc định 24 giờ, tăng được tới 365 ngày.

**EventBridge** — tổng đài định tuyến sự kiện. Các nguồn (dịch vụ AWS, ứng dụng của bạn, SaaS như Zendesk, Datadog) gửi event vào một **event bus**; bạn viết **rule** so khớp nội dung event (ví dụ `source = "orders"` và `status = "FAILED"`) để quyết định gửi nó tới target nào. Khác SNS ở chỗ lọc/định tuyến theo nội dung là chức năng chính, và có sẵn tích hợp với SaaS bên ngoài.

| Service | Mô hình | Dùng khi |
|---|---|---|
| **SQS** | Queue; mỗi message được một worker lấy & xoá | Load leveling, xử lý bất đồng bộ, mỗi message xử lý một lần |
| **SNS** | Pub/sub, fan-out nhiều subscriber | Một event → nhiều hệ thống nhận |
| **SQS FIFO** | Thứ tự + exactly-once | Cần đảm bảo thứ tự; chấp nhận trần 300 thao tác/giây (3.000 message/giây với batch) |
| **Kinesis Data Streams** | Streaming, replay, nhiều consumer đọc cùng dữ liệu | Real-time analytics, cần thứ tự theo từng shard, giữ dữ liệu 24 giờ → 365 ngày |
| **EventBridge** | Event bus, routing theo rule, tích hợp SaaS | Event-driven, định tuyến theo nội dung |

> Bẫy SQS vs Kinesis: SQS message bị **xoá sau khi xử lý**, không replay được, không giữ thứ tự (standard). Kinesis **giữ lại data** cho phép nhiều consumer & replay, theo thứ tự trong shard. Đề nói "multiple consumers cùng đọc một stream", "real-time analytics", "replay" → **Kinesis**, không phải SQS.

**Pattern SNS + SQS fan-out**: SNS publish một event, fan-out vào nhiều SQS queue, mỗi queue có fleet riêng xử lý độc lập và scale riêng. Ví dụ event "đơn hàng mới" được đẩy vào ba queue: thanh toán, kho, email. Nếu dịch vụ email chậm thì chỉ queue của nó dài ra, hai bên kia không bị ảnh hưởng. Vừa decouple vừa hấp thụ spike cho nhiều downstream.

## 7. ECS / EKS Auto Scaling

Trước hết là vài từ. **Container** là một gói chứa ứng dụng kèm mọi thư viện nó cần, chạy cô lập trên một máy chủ. AWS có hai dịch vụ điều phối container:

- **ECS** (Elastic Container Service) — hệ điều phối của riêng AWS. Đơn vị chạy là **task**: một hoặc vài container chạy cùng nhau như một bản sao của ứng dụng. Một **service** giữ cho luôn có đủ N task đang chạy.
- **EKS** (Elastic Kubernetes Service) — Kubernetes do AWS quản lý. Đơn vị chạy là **pod** (tương đương task của ECS). Máy chủ chứa pod gọi là **node** — thường là một EC2 instance.

Container scaling vì thế có **hai tầng**, và phải lo cả hai: tầng ứng dụng (bao nhiêu task/pod) và tầng hạ tầng (bao nhiêu máy để chứa chúng). Thêm task mà cluster hết CPU/RAM trống thì task treo ở trạng thái chờ, không chạy được.

### ECS

**Tầng task — Service Auto Scaling.** Tăng/giảm số task của một service theo CPU, memory, hoặc số request ALB trên mỗi task. Dùng đúng các loại policy của §2: target tracking, step, scheduled. Về ý tưởng nó là ASG, chỉ khác là đếm task chứ không đếm instance.

**Tầng hạ tầng** — tuỳ bạn chọn task chạy ở đâu (*launch type*):

- **EC2 launch type**: task chạy trên các EC2 instance do bạn sở hữu, nằm trong một ASG. Cần thêm **Capacity Provider** — thành phần nối ECS với ASG đó. Khi có task không tìm được chỗ, capacity provider tự nâng `desired` của ASG để thêm instance, rồi hạ xuống khi instance trống (tính năng này gọi là *ECS Cluster Auto Scaling*). Bạn vẫn chịu trách nhiệm chọn instance type, vá OS, cập nhật AMI.
- **Fargate**: không có EC2 nào của bạn cả. Bạn khai mỗi task cần bao nhiêu vCPU và RAM, AWS tự tìm chỗ chạy và tính tiền theo đúng lượng đó trong thời gian task sống. Chỉ còn một tầng phải scale: số task. Đề nhấn "không muốn quản lý server/cluster capacity" → **Fargate**.

### EKS

Cùng hai tầng, khác tên:

- **Tầng pod**: **HPA** (Horizontal Pod Autoscaler) thêm/bớt số pod theo CPU, memory hoặc metric tuỳ chỉnh — tương đương Service Auto Scaling của ECS.
- **Tầng node**: khi có pod không xếp được chỗ, cần một bộ thêm node. **Cluster Autoscaler** làm việc đó bằng cách tăng kích thước các node group (thực chất là ASG) đã định nghĩa sẵn, mỗi group một loại instance cố định. **Karpenter** là công cụ mới hơn: nó nhìn tổng yêu cầu của các pod đang chờ rồi gọi thẳng EC2 để launch loại instance vừa khít nhất, không qua ASG — vì bớt một lớp trung gian nên node sẵn sàng sớm hơn và ít lãng phí tài nguyên hơn.
- EKS cũng chạy được pod trên **Fargate**, khi đó không còn tầng node để lo.

### Đặt cạnh nhau

| | Scale đơn vị ứng dụng | Scale hạ tầng |
|---|---|---|
| **ECS trên EC2** | Service Auto Scaling (task) | Capacity Provider + ASG |
| **ECS trên Fargate** | Service Auto Scaling (task) | Không cần — AWS lo |
| **EKS trên EC2** | HPA (pod) | Cluster Autoscaler hoặc Karpenter (node) |
| **EKS trên Fargate** | HPA (pod) | Không cần — AWS lo |

> Mẹo thi: "Chạy container không muốn quản lý infrastructure/patching, scale theo nhu cầu" → **Fargate**. "Cần kiểm soát instance type/GPU, tối ưu chi phí với reserved/spot" → **EC2 launch type + Capacity Provider**.

## 8. Lambda Concurrency & Scaling

Lambda không có instance để bạn đếm. Mỗi request tới được chạy trong một **execution environment** — một môi trường cô lập chứa code của bạn — và mỗi environment chỉ xử lý **một request tại một thời điểm**. Request thứ hai đến khi cái đầu chưa xong thì Lambda tạo thêm environment thứ hai. "Lambda tự scale" nghĩa là vậy.

### Concurrency là gì và tính thế nào

**Concurrency** = số environment đang bận xử lý request tại cùng một thời điểm. Nó **không** phải là số request mỗi giây, mà phụ thuộc cả vào việc mỗi request chạy bao lâu:

```
Concurrency ≈ số request/giây × thời gian chạy trung bình (giây)

  500 request/giây × 0,2 giây = 100 concurrency      → dư sức
2.000 request/giây × 1   giây = 2.000 concurrency    → vượt hạn mức mặc định 1.000
```

Hạn mức mặc định là **1.000 concurrency cho cả account trong một region**, **chia chung** cho mọi function (xin tăng được qua Service Quotas). Function nào chạy lâu và nhiều request có thể ăn hết phần của các function khác. Vượt hạn mức thì request bị **throttle**: Lambda từ chối và trả lỗi 429.

### Tốc độ scale cũng có giới hạn

Ngoài trần tổng, Lambda còn giới hạn **tốc độ tăng**: mỗi function được thêm tối đa **1.000 environment mỗi 10 giây**. Hai phép tính để hình dung:

```
Từ 0 lên 1.000 concurrency : trong vòng ~10 giây
Từ 0 lên 3.000 concurrency : ~30 giây (và phải xin nâng hạn mức account trước)
```

So với ASG cần vài phút (§2.4), nhanh hơn hàng chục lần — vì vậy Lambda là một đáp án cho spike "tức thời". Request đến nhanh hơn tốc độ đó vẫn bị throttle 429. Đề thi và tài liệu cũ gọi hiện tượng này là **burst concurrency** và mô tả một cơ chế cũ, chậm hơn (burst ban đầu rồi tăng theo bước mỗi phút); ý cần nhớ không đổi: Lambda scale rất nhanh nhưng **không vô hạn và không tức thì**.

### Cold start

Khi Lambda phải tạo một environment mới, nó tải code về, khởi động runtime, rồi chạy phần code khởi tạo của bạn (import thư viện, mở connection) trước khi chạy handler. Khoảng chờ thêm đó gọi là **cold start**, dài từ dưới 100 mili-giây tới hơn 1 giây tuỳ runtime và kích thước gói code. Request rơi vào environment đã có sẵn (*warm start*) thì không phải chịu. Cold start xảy ra nhiều nhất đúng lúc đang scale-out — tức là đúng lúc có spike.

### Hai nút chỉnh: Reserved và Provisioned

**Reserved concurrency** là *chia phần* trong hạn mức account cho một function. Đặt reserved = 200 cho function `checkout` có hai tác dụng cùng lúc:

- **Đảm bảo**: 200 đơn vị đó luôn dành cho `checkout`, function khác không lấn vào được (cả account chỉ còn 800 cho phần còn lại).
- **Giới hạn trần**: `checkout` không bao giờ chạy quá 200 environment — dùng để bảo vệ downstream yếu hơn, ví dụ một RDS chỉ chịu được vài trăm connection.

Reserved không tốn thêm tiền và **không** làm environment khởi tạo sẵn.

**Provisioned concurrency** là *giữ ấm sẵn*. Đặt provisioned = 50 thì Lambda khởi tạo trước 50 environment và giữ chúng luôn sẵn sàng; 50 request đồng thời đầu tiên không gặp cold start. Bạn trả tiền cho 50 environment đó suốt thời gian bật, kể cả khi không có request. Có thể dùng Application Auto Scaling để tăng giảm con số này theo lịch hoặc theo mức sử dụng. Dùng cho API nhạy latency.

| | **Reserved concurrency** | **Provisioned concurrency** |
|---|---|---|
| Giải quyết | Chia quota, chặn trần | Cold start |
| Environment khởi tạo sẵn? | Không | Có |
| Tốn thêm tiền? | Không | Có, tính theo thời gian bật |
| Từ khoá trong đề | "guarantee capacity", "limit", "protect downstream", "throttle" | "cold start", "consistent low latency", "latency-sensitive" |

> Bẫy Lambda + RDS: Lambda scale ra hàng nghìn concurrent execution có thể **làm cạn connection pool của RDS** — mỗi environment mở connection riêng, trong khi database chỉ nhận một số connection có hạn (một instance nhỏ cỡ vài trăm). Giải pháp: **RDS Proxy** (đứng giữa, giữ một pool connection tới DB và cho hàng nghìn environment dùng chung), hoặc đặt **reserved concurrency** để giới hạn. Đề hay hỏi tình huống "too many database connections" này.

> Bẫy cold start: Latency-sensitive API spike → **Provisioned concurrency**. Đừng nhầm với Reserved concurrency (cái này không loại bỏ cold start, chỉ phân bổ/giới hạn quota).

## 9. Cây quyết định nhanh cho phòng thi

- **Spike đột ngột, không mất request** → SQS buffer + consumer scale theo queue depth (hoặc Lambda).
- **Tải biết trước theo lịch** → Scheduled scaling. **Tuần hoàn để AWS dự báo** → Predictive scaling.
- **Read-heavy SQL, offload đọc** → Read Replica / Aurora reader endpoint. **Sống sót khi AZ chết** → Multi-AZ.
- **Giảm DB read latency**: kết quả SQL → ElastiCache; DynamoDB → DAX.
- **Phục vụ global, hấp thụ spike nội dung cacheable** → CloudFront.
- **Container không muốn quản hạ tầng** → Fargate. **Cần control/spot** → ECS on EC2 + Capacity Provider.
- **Lambda làm sập RDS connection** → RDS Proxy / reserved concurrency. **Cold start API** → Provisioned concurrency.
- **Web/app tier scale out** → stateless + externalize session (ElastiCache/DynamoDB) + ASG sau ALB.

## 10. Tổng kết các bẫy hay gặp

- Vertical scaling cho web tier thường là **đáp án sai** — ưu tiên horizontal.
- **Multi-AZ ≠ Read Replica**: HA vs scale read.
- **DAX chỉ cho DynamoDB**, ElastiCache cho phần còn lại.
- Spike "tức thời" không giải bằng tinh chỉnh ASG mà bằng **queue / serverless / cache**.
- **SQS không replay / Kinesis có replay** + multi-consumer.
- **Provisioned concurrency** xử lý cold start, **Reserved concurrency** xử lý phân bổ/giới hạn quota — đừng nhầm.
- Sticky session là giải pháp kém; **externalize state** mới đúng tinh thần scalable.
- Quên **lifecycle hook / connection draining** khi scale-in → mất request đang xử lý.
