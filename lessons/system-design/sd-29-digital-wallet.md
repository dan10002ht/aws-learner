# Case study: Digital Wallet — chuyển tiền giữa các ví

> Bài trước (`sd-28-payment-system`) lo phần **tiền đi vào và đi ra khỏi hệ thống**: PSP, thẻ, 3DS, webhook, PCI DSS, đối soát với ngân hàng. Bài này cố tình **không lặp lại** phần đó. Ở đây tiền đã nằm sẵn trong hệ thống rồi, và bài toán thu hẹp lại thành một câu duy nhất — nhưng là câu khó nhất trong cả mảng thanh toán: **chuyển một số tiền từ ví A sang ví B, đúng tuyệt đối, không bao giờ sai một xu, ở tốc độ 1 triệu giao dịch mỗi giây, và một năm sau vẫn chứng minh được rằng hôm nay nó đúng.**

Nhìn qua thì đây là bài dễ nhất trong sách: `A -= 1; B += 1`. Hai dòng code. Ai học lập trình tuần đầu cũng viết được. Đó chính là cái bẫy — và cũng là lý do bài này được dùng để phân loại ứng viên ở cấp Staff.

Cái khó không nằm ở phép tính. Nó nằm ở **ba ràng buộc đứng cùng một lúc và kéo nhau về ba hướng ngược nhau**:

1. **Đúng tuyệt đối.** Trong hầu hết mọi bài System Design khác, ta được phép nói "eventual consistency là chấp nhận được". Mất một cái like, đếm lệch 0,1% lượt xem quảng cáo, feed hiển thị chậm 5 giây — không ai chết. Ở đây thì **không có ngưỡng chấp nhận được**. Tiền bốc hơi là một sự cố pháp lý, không phải một chỉ số SLO. Tiền tự nhân đôi còn tệ hơn: nó là lỗ hổng để rút sạch hệ thống.

2. **Một triệu TPS.** Mà thật ra là **hai triệu**, vì mỗi lần chuyển tiền chạm vào hai tài khoản — một bên trừ, một bên cộng. Một instance PostgreSQL/MySQL trên cloud, được cấu hình tốt, chạy được cỡ **1.000 TPS** với giao dịch ghi thật sự bền vững. Khoảng cách giữa 1.000 và 2.000.000 là **ba bậc độ lớn**. Không có cách nào "tune" để vượt qua ba bậc độ lớn. Phải đổi mô hình.

3. **Tái tạo được lịch sử.** Không chỉ "hiện tại số dư đúng", mà là: *cho tôi biết số dư của ví X lúc 14:32:07 ngày 3 tháng trước, và chứng minh cho tôi rằng con số đó đúng.* Yêu cầu này — nghe như một tính năng phụ của phòng kế toán — thực ra là thứ **quyết định toàn bộ kiến trúc**. Nó là lý do cuối cùng ta chọn **event sourcing** chứ không phải "một cái database nhanh hơn".

Ba ràng buộc này ép nhau. Đúng tuyệt đối kéo ta về phía transaction ACID và khoá. Một triệu TPS kéo ta về phía phân tán, không khoá, không đồng bộ. Tái tạo lịch sử kéo ta về phía append-only, bất biến. Cả bài học này là hành trình đi qua **năm phương án**, mỗi phương án giải được một hoặc hai ràng buộc và chết ở ràng buộc còn lại, cho tới khi tới được một kiến trúc giải được cả ba.

> 💡 **Nguyên tắc mở đầu**: khi một bài toán có nhiều ràng buộc đối kháng, đừng đi tìm "kiến trúc đúng" ngay. Hãy đi tuần tự từ phương án ngây thơ nhất và **để từng phương án chết vì một lý do cụ thể**. Lý do chết chính là thứ dẫn đường tới phương án tiếp theo. Trong phỏng vấn, cách kể chuyện này mạnh hơn nhiều so với việc vẽ thẳng ra đáp án cuối — vì nó chứng minh bạn *hiểu* đáp án, chứ không phải *nhớ* nó.

---

## 1. Làm rõ yêu cầu

### 1.1 Cuộc hội thoại cần có

Trước khi vẽ bất cứ thứ gì, phải chốt phạm vi. Đây là những câu hỏi đáng hỏi, và câu trả lời ta sẽ dùng cho cả bài:

| Câu hỏi | Trả lời (giả định chốt) | Vì sao câu hỏi này quan trọng |
|---|---|---|
| Chỉ chuyển tiền **giữa các ví trong hệ thống**, hay cả nạp/rút ra ngân hàng? | Chỉ **ví ↔ ví**. Nạp/rút ra ngoài thuộc bài `sd-28` | Đây là quyết định lớn nhất: nếu chỉ nội bộ thì **tổng tiền trong hệ thống là bất biến**, và ta có một công cụ kiểm toán cực mạnh miễn phí |
| Bao nhiêu giao dịch mỗi giây? | **1 triệu TPS** | Con số này một mình đã loại bỏ toàn bộ họ giải pháp "một database" |
| Đảm bảo giao dịch (transactional guarantee) là đủ chứ? | Đủ — nhưng phải hiểu "transaction" ở đây nghĩa là gì khi dữ liệu nằm trên 200 node | Từ "transaction" nghe thì rõ, nhưng ở hệ phân tán nó là điểm bắt đầu của mọi tranh cãi |
| Có cần **chứng minh** tính đúng đắn không? | Có. Và **reconciliation là chưa đủ** — đối soát chỉ *phát hiện* lệch chứ không cho ta *nguyên nhân*. Ta muốn **replay lại từ đầu để tái dựng lịch sử** | Câu trả lời này là bản lề của cả bài. Nó biến yêu cầu từ "lưu số dư" thành "lưu **lịch sử thay đổi số dư**" |
| Yêu cầu khả dụng? | **99,99%** (~52 phút downtime/năm) | Không phải 5 số 9 — nghĩa là ta *được phép* chọn nhất quán hơn khả dụng khi phân vùng mạng (CP chứ không AP) |
| Có ngoại tệ / quy đổi tỉ giá không? | **Không**, ngoài phạm vi | Nếu có thì phải thêm một "ví trung gian FX" và bài toán nở ra gấp đôi |
| Một giao dịch có thể chạm quá 2 ví không (vd chia hoá đơn)? | Mặc định **2 ví**, nhưng thiết kế phải mở đường cho **N chân** | Ảnh hưởng tới việc chọn saga/TC-C: 2 chân thì dễ, N chân thì phải có coordinator thật sự |

### 1.2 Chốt lại yêu cầu

**Functional**
- Chuyển số dư giữa hai ví: `transfer(from, to, amount, currency, transaction_id)`.
- Truy vấn số dư hiện tại của một ví.
- Truy vấn **lịch sử giao dịch** và **số dư tại một thời điểm bất kỳ trong quá khứ**.
- Idempotent: client gửi lại cùng một `transaction_id` thì không được trừ tiền hai lần.

**Non-functional**
- **1 triệu TPS** (⇒ ~2 triệu thao tác cập nhật số dư/giây).
- **Đúng tuyệt đối**: không mất tiền, không sinh tiền, không âm số dư ngoài ý muốn.
- **Reliability 99,99%**, không mất dữ liệu đã xác nhận (durability là tuyệt đối, khác availability).
- **Reproducibility**: tái dựng được mọi trạng thái lịch sử bằng cách phát lại (replay).
- **Auditability**: mọi thay đổi có dấu vết bất biến, có thể chứng minh với kiểm toán viên bên ngoài.
- Latency: p99 dưới ~500 ms cho người dùng thấy kết quả (không cần dưới 10 ms — đây là tiền, không phải game).

> ⚠️ **Bẫy thường gặp ngay ở bước này**: rất nhiều ứng viên gộp "reliability" và "availability" làm một. Ở bài ví điện tử chúng **ngược nhau**. 99,99% availability nghĩa là ta chấp nhận 52 phút/năm hệ thống *từ chối phục vụ*. Nhưng ta **không** chấp nhận một giây nào mà hệ thống *phục vụ sai*. Khi mạng bị phân vùng, câu trả lời đúng là **dừng lại**, không phải "cứ cho chuyển rồi hoà giải sau". Nói rõ điều này sớm cho thấy bạn hiểu CAP không phải như một câu đố mà như một chính sách kinh doanh.

### 1.3 Cái gì cố tình để ngoài phạm vi

Nói rõ để không bị hiểu là thiếu sót:

- **Cổng thanh toán, thẻ, PCI DSS, 3DS, chargeback** → thuộc `sd-28-payment-system`. Ở đó tiền vượt ranh giới hệ thống; ở đây tiền chỉ di chuyển bên trong.
- **Chống gian lận / rửa tiền (AML)** → là một hệ thống riêng, tiêu thụ chính luồng sự kiện mà ta sắp xây (và đó là một lợi ích phụ rất lớn của event sourcing, sẽ nói ở §11.4).
- **Ngoại tệ** → ngoài phạm vi theo thoả thuận.
- **Lãi suất, phí, khuyến mãi** → đều mô hình hoá được như các loại lệnh (command) khác, không đổi kiến trúc.

---

## 2. Back-of-the-envelope estimation

Ước lượng ở bài này không phải để tính dung lượng đĩa. Nó để **chứng minh rằng phương án ngây thơ chết**, và để biết mình cần bao nhiêu node.

### 2.1 Từ TPS ra số node

```
Yêu cầu:        1.000.000 TPS (giao dịch chuyển tiền)
Mỗi giao dịch:  2 chân (leg) — trừ ví A, cộng ví B
=> Thao tác ghi số dư: 2.000.000 ops/giây

Khả năng một node:
  RDBMS đám mây điển hình, ghi bền vững (fsync), có index:
      ~1.000 TPS/node   (đây là con số làm mốc, không phải luật vật lý)

  => Số node cần = 2.000.000 / 1.000 = 2.000 node
```

Bảng này là thứ nên vẽ ra trên bảng trắng ngay phút thứ năm, vì nó nói lên **mục tiêu thiết kế thật sự**:

| TPS mỗi node | Số node cần | Nhận xét |
|---|---|---|
| 100 | 20.000 | Không khả thi: chi phí vận hành, số điểm hỏng, xác suất có node chết mỗi phút gần như 1 |
| 1.000 | 2.000 | Mốc của RDBMS truyền thống. Vẫn là một đội hình khổng lồ |
| 10.000 | 200 | Bắt đầu vận hành được. Cần bỏ index nặng, bỏ B-tree random write, chuyển sang **append-only** |
| 100.000 | 20 | Chỉ đạt được khi ghi tuần tự vào đĩa cục bộ + gộp lô (batching) + không đi qua mạng cho mỗi ghi |

> 💡 **Nguyên tắc**: ở bài này, **tăng TPS của một node quan trọng hơn tăng số node**. Mỗi node thêm vào không chỉ tốn tiền — nó còn tăng số lượng giao dịch **xuyên shard** (cross-shard), mà giao dịch xuyên shard là thứ đắt đỏ và phức tạp nhất trong cả thiết kế. Giảm số node là giảm bậc hai độ phức tạp. Đây là một trong số ít bài mà câu trả lời "scale up trước, scale out sau" là câu trả lời đúng.

### 2.2 Dung lượng sự kiện

Vì ta sẽ chọn event sourcing, cái phải lưu không phải số dư mà là **lịch sử**:

```
Mỗi giao dịch sinh 2 sự kiện (1 cho mỗi ví).
Kích thước một sự kiện (nhị phân gọn, không JSON):
   event_id(16) + wallet_id(16) + amount(8) + currency(2)
 + type(1) + seq(8) + ts(8) + tx_id(16) + checksum(4) ≈ 80 bytes
Cộng overhead khung/độ dài/padding  → làm tròn 100 bytes

Mỗi giây:   2.000.000 sự kiện × 100 B = 200 MB/s
Mỗi ngày:   200 MB/s × 86.400 s      ≈ 17,3 TB/ngày
Mỗi năm:    17,3 TB × 365            ≈ 6,3 PB/năm
Nhân 3 bản sao (Raft, quorum 3)      ≈ 19 PB/năm
```

Con số này dẫn tới ba quyết định ngay lập tức:

1. **Định dạng sự kiện phải là nhị phân gọn**, không phải JSON. Nếu mỗi sự kiện là 500 byte JSON thay vì 100 byte nhị phân, ta trả thêm **~25 PB/năm** cho mỗi bản sao. Đây là một trong những chỗ hiếm hoi mà "tối ưu micro" tạo ra khác biệt hàng triệu đô.
2. **Phải phân tầng lưu trữ (tiering)**: sự kiện nóng (vài ngày gần nhất) nằm trên SSD cục bộ để replay nhanh; sự kiện nguội đổ sang object storage rẻ (S3/Glacier) — vẫn giữ được audit và replay, chỉ chậm hơn.
3. **Phải có snapshot.** Nếu một năm có 6,3 PB sự kiện, thì replay từ Big Bang để biết số dư hôm nay là bất khả thi. Snapshot định kỳ biến "replay 6,3 PB" thành "nạp snapshot + replay vài GB". (§10)

### 2.3 Một con số nữa: bao nhiêu ví, và ví nóng cỡ nào

```
Giả định 500 triệu ví đang hoạt động.
Trạng thái mỗi ví: wallet_id + balance + seq + version ≈ 64 bytes
   => 500M × 64B ≈ 32 GB cho TOÀN BỘ trạng thái số dư
```

Đây là con số **gây sốc nhất của cả bài**, và đáng nói ra thật to trong phỏng vấn: **toàn bộ số dư của nửa tỉ người dùng chỉ nặng 32 GB**. Nó vừa trong RAM của *một máy chủ tầm trung*. Cái to không phải trạng thái — cái to là **lịch sử**. Thiết kế phải phản ánh đúng sự bất đối xứng này: trạng thái nhỏ, nóng, ở RAM; lịch sử khổng lồ, chỉ ghi thêm, ở đĩa.

Về phân bố: nghiệp vụ ví luôn có **ví nóng** — ví của các merchant lớn, ví trung gian của sàn, ví thu phí của chính nền tảng. Một ví merchant có thể nhận 50.000 giao dịch/giây trong khi ví của người dùng bình thường nhận 1 giao dịch/tuần. Sự lệch này (skew) sẽ là chế độ hỏng chính ở §9.5 — ghi nhớ nó ngay từ bước ước lượng.

---

## 3. API design

Bài này chỉ cần một endpoint để nói hết mọi thứ:

```
POST /v1/wallet/transfers
Headers:
  Authorization: Bearer <token>
  Idempotency-Key: 01589980-2664-11ec-9621-0242ac130002

Body:
{
  "from_wallet": "w_8f2a...",
  "to_wallet":   "w_31bc...",
  "amount":      "25.50",       // CHUỖI, không phải số thực — xem §13
  "currency":    "USD",
  "reference":   "order_9931"   // tuỳ chọn, để đối chiếu nghiệp vụ
}

202 Accepted
{
  "transaction_id": "01589980-2664-11ec-9621-0242ac130002",
  "status": "PENDING",
  "status_url": "/v1/wallet/transfers/01589980-..."
}
```

Bốn chi tiết nhỏ trong cái API này mang theo bốn quyết định kiến trúc lớn:

**(a) `amount` là chuỗi, không phải số.** Nếu kiểu dữ liệu là `number`, một client JavaScript sẽ vui vẻ gửi `0.1 + 0.2 = 0.30000000000000004`. Ép kiểu chuỗi buộc cả hai phía phải xử lý chính xác thập phân. §15 sẽ nói vì sao float là điều cấm kỵ tuyệt đối trong hệ thống tiền tệ.

**(b) `Idempotency-Key` do client sinh, không phải server.** Nếu server sinh ID, thì khi client gửi request rồi mất kết nối *trước khi nhận được phản hồi*, nó không có cách nào hỏi lại "cái lệnh vừa rồi có chạy không?". Client sinh key trước khi gửi ⇒ retry luôn mang cùng key ⇒ server nhận ra và trả lại kết quả cũ. §12 đào sâu.

**(c) Trả `202 Accepted` + `PENDING`, không phải `200 OK` + `SUCCESS`.** Đây là quyết định lớn. Ở 1 triệu TPS với event sourcing, lệnh được **xếp hàng rồi xử lý tuần tự theo shard**; giả vờ rằng nó đồng bộ sẽ biến mọi request thành một kết nối bị giữ. Trả về "đã nhận, đang xử lý" là trung thực và cho phép hệ thống điều tiết tải. Ở §11.3 ta sẽ thêm cơ chế **đẩy kết quả về (push)** qua reverse proxy để trải nghiệm vẫn giống thời gian thực.

**(d) Không có endpoint `PUT /balance`.** Không bao giờ cho phép **ghi đè số dư trực tiếp**, kể cả cho admin. Mọi thay đổi phải đi qua một lệnh có lý do. Nếu cần điều chỉnh thủ công (adjustment), đó vẫn là một lệnh có loại riêng, có người phê duyệt, có sự kiện. Một hệ thống tiền tệ mà có đường "set balance" là một hệ thống không kiểm toán được.

Bổ sung hai endpoint đọc:

```
GET /v1/wallet/{id}/balance                    -> số dư hiện tại
GET /v1/wallet/{id}/balance?at=2026-06-03T14:32:07Z  -> số dư tại thời điểm
GET /v1/wallet/{id}/transactions?cursor=...    -> lịch sử, phân trang
```

Cái `?at=` kia trông vô hại nhưng nó là **bài kiểm tra kiến trúc**: nếu hệ thống chỉ lưu số dư hiện tại, endpoint này **không thể tồn tại**. Việc nó tồn tại được hay không phân biệt hoàn toàn kiến trúc "state-based" với "event-based".

---

## 4. Phương án 1 — Một node in-memory (Redis / map trong RAM)

### 4.1 Ý tưởng

Số dư về bản chất là một `map<wallet_id, balance>`. Ở §2.3 ta vừa tính: toàn bộ map đó chỉ 32 GB. Vậy thì cứ nhét hết vào RAM. Một node Redis, hoặc thậm chí một `HashMap` trong tiến trình Java/Go, xử lý được **hàng trăm nghìn tới hàng triệu thao tác mỗi giây** vì không chạm đĩa, không đi qua mạng (nếu in-process), và không có khoá phức tạp.

```
             +---------------------------+
  request -->|  Wallet Service (stateless)|
             +-------------+-------------+
                           |
                           v
             +---------------------------+
             |   Redis / in-memory map   |
             |   w_8f2a -> 1250          |
             |   w_31bc ->  400          |
             +---------------------------+
```

Khi một node không đủ, băm ví ra nhiều node:

```
partition = hash(wallet_id) % N
```

và để ZooKeeper/etcd giữ bản đồ phân vùng + danh sách node sống (cấu hình phải khả dụng cao, và cả cụm phải nhìn thấy **cùng một** bản đồ, nếu không hai client sẽ sửa cùng một ví ở hai node khác nhau).

### 4.2 Vì sao nhanh

Ba lý do, đáng nói rõ vì chúng sẽ **được giữ lại** ở phương án cuối:

1. **Không có I/O đồng bộ trên đường nóng.** Chi phí một thao tác là vài trăm nanosecond thay vì vài mili-giây.
2. **Cấu trúc dữ liệu là hash map, không phải B-tree.** Không có page split, không có random write, không có ghi nhân bản (write amplification).
3. **Không có giao dịch đa hàng.** Cập nhật một số nguyên là thao tác nguyên tử tự nhiên trên một node đơn luồng.

### 4.3 Vì sao nó chết

**Chết vì mất dữ liệu.** RAM là bay hơi. Node chết vì mất điện, vì OOM killer, vì một lần deploy nhầm — và **số dư của hàng chục triệu người biến mất**. Không phải "chậm lại", không phải "mất 0,1%": biến mất.

Sẽ có người nói: "Redis có AOF và RDB mà, bật `appendfsync always` là bền vững." Đây là chỗ cần phản biện chính xác, vì nó cho thấy bạn hiểu vấn đề sâu hơn khẩu hiệu:

| Cơ chế | Chuyện thật sự xảy ra | Vì sao chưa đủ |
|---|---|---|
| `RDB` snapshot định kỳ | Đóng băng và dump toàn bộ dataset mỗi N phút | Mất toàn bộ thay đổi từ snapshot cuối. Với 2 triệu ops/s thì 1 phút = **120 triệu giao dịch bốc hơi** |
| `AOF` + `appendfsync everysec` | Ghi lệnh ra file, fsync mỗi giây | Mất tối đa 1 giây = **2 triệu giao dịch**. Ở ví điện tử con số đó không có ý nghĩa gì ngoài "thảm hoạ" |
| `AOF` + `appendfsync always` | fsync mỗi lệnh | Bây giờ ta lại bị ràng buộc bởi tốc độ fsync — TPS tụt về mức của đĩa, tức là ta vừa vứt bỏ chính lý do chọn in-memory |
| Replica + `WAIT` | Chờ N replica xác nhận | Redis replication là **bất đồng bộ theo thiết kế**; `WAIT` chỉ xác nhận replica *đã nhận*, không phải *đã ghi bền*. Failover vẫn có thể mất ghi (vấn đề đã được ghi nhận rõ trong các phân tích Jepsen về Redis Sentinel/Cluster) |

**Chết vì không nguyên tử xuyên node.** Ngay cả khi bỏ qua durability: A ở node 1, B ở node 2. Ta trừ A thành công, rồi node 2 chết. Tiền đã bốc hơi khỏi A mà chưa tới B. Redis không có giao dịch phân tán. Lệnh `MULTI/EXEC` chỉ nguyên tử **trong một node** (và trong Redis Cluster thì chỉ trong một hash slot).

**Chết vì không có lịch sử.** Map chỉ lưu giá trị hiện tại. Không có gì để kiểm toán, không có gì để replay, không trả lời được câu hỏi `?at=`. Yêu cầu reproducibility bị vi phạm hoàn toàn ngay từ dòng thiết kế đầu tiên.

> 💡 **Cái nên giữ lại từ phương án 1**: ý tưởng "trạng thái sống trong RAM" là **đúng** và sẽ quay lại ở phương án cuối. Cái sai không phải là để state trong RAM — cái sai là để RAM làm **nguồn sự thật (source of truth)**. Ở event sourcing, state trong RAM chỉ là một *projection* có thể vứt đi và dựng lại bất cứ lúc nào. Đó là toàn bộ sự khác biệt.

---

## 5. Phương án 2 — RDBMS + transaction

### 5.1 Ý tưởng

Quay về thứ đã được kiểm nghiệm 40 năm: một cơ sở dữ liệu quan hệ với giao dịch ACID.

```sql
BEGIN;
  UPDATE wallets SET balance = balance - 100 WHERE id = 'A' AND balance >= 100;
  -- kiểm tra số hàng bị ảnh hưởng = 1, nếu 0 thì ROLLBACK (không đủ tiền)
  UPDATE wallets SET balance = balance + 100 WHERE id = 'B';
  INSERT INTO ledger(tx_id, from_id, to_id, amount, ts) VALUES (...);
COMMIT;
```

Và đây là một thiết kế **rất tốt** — cho tới một ngưỡng nhất định. Nó giải quyết gọn gàng những thứ mà phương án 1 làm không nổi:

- **Nguyên tử**: hai chân cùng thành công hoặc cùng thất bại. Database lo hết.
- **Bền vững**: WAL + fsync. Commit xong là dữ liệu còn sau khi mất điện.
- **Cô lập**: mức `REPEATABLE READ`/`SERIALIZABLE` chặn được lost update khi hai giao dịch đụng cùng ví.
- **Kiểm tra số dư âm**: mệnh đề `AND balance >= 100` biến việc kiểm tra và trừ tiền thành **một thao tác nguyên tử duy nhất** — không có khe hở race condition giữa "đọc để kiểm tra" và "ghi để trừ". Đây là mẹo quan trọng, ta sẽ dùng lại nguyên tắc này ở §14.
- **Có lịch sử ở mức thô**: bảng `ledger` cho ta audit trail.

> 💡 Với **90% các hệ thống ví thật ngoài đời** — ví của một sàn thương mại điện tử quốc gia, ví của một app gọi xe — phương án này là **câu trả lời đúng**, và đi thẳng lên event sourcing khi mới có 300 TPS là over-engineering. Trong phỏng vấn, nói ra câu này sẽ ghi điểm rất cao: nó cho thấy bạn biết phân biệt "kiến trúc hay" với "kiến trúc phù hợp".

### 5.2 Vì sao nó chết ở 1 triệu TPS

Trần của một node là **~1.000 TPS** đối với ghi có giao dịch. Trần đó đến từ đâu? Không phải CPU, mà từ:

1. **fsync trên WAL.** Mỗi commit phải đảm bảo nhật ký đã nằm trên đĩa bền. Group commit gộp nhiều giao dịch một lần fsync, nhưng vẫn bị giới hạn bởi độ trễ fsync (~0,1–1 ms trên NVMe có power-loss protection, tệ hơn nhiều trên EBS).
2. **Random write vào B-tree.** Cập nhật số dư là sửa một hàng trong index — random I/O, page split, write amplification.
3. **Tranh chấp khoá (lock contention).** Hai giao dịch cùng đụng ví merchant nóng phải xếp hàng chờ nhau. Với ví có 50.000 TPS thì đây không còn là "hàng đợi", mà là **serialization hoàn toàn**: throughput của cả hệ thống rơi về `1 / thời_gian_giữ_khoá`.
4. **Deadlock.** Giao dịch 1 chuyển A→B, giao dịch 2 chuyển B→A, chạy đồng thời, khoá theo thứ tự ngược nhau ⇒ deadlock. Database phát hiện và huỷ một bên, nhưng ở tần suất cao thì tỉ lệ huỷ tăng vọt. *Cách chữa cổ điển: luôn khoá theo thứ tự sắp xếp của `wallet_id` (khoá `min(A,B)` trước) — một mẹo đáng nêu vì nó chứng tỏ bạn từng gặp deadlock thật.*

Với 2.000 node database, ta còn đối mặt với những thứ không phải kỹ thuật: chi phí license/instance, backup 2.000 cụm, nâng cấp phiên bản, và xác suất **luôn có một node đang chết** tại mọi thời điểm.

### 5.3 Và chết vì một lý do quan trọng hơn

Kể cả nếu giả sử có phép màu cho một RDBMS chạy 2 triệu TPS, nó **vẫn chưa trả lời được yêu cầu reproducibility**. Bảng `wallets` lưu **trạng thái hiện tại**. Bảng `ledger` lưu lịch sử — nhưng đó là hai nguồn sự thật song song, và chúng **có thể lệch nhau**:

- Một bug trong code làm cập nhật `balance` mà quên ghi `ledger`.
- Một DBA chạy `UPDATE wallets SET balance = ... WHERE id = ...` thủ công để "sửa lỗi".
- Một migration chạy sai, ghi đè một cột.

Khi đó `SUM(ledger)` ≠ `balance`, và ta không có cách nào biết bên nào đúng. Reconciliation sẽ **phát hiện** ra chênh lệch, nhưng nó không cho ta **nguyên nhân** — đúng như yêu cầu ở §1.1 đã cảnh báo.

> ⚠️ **Đây là hạt nhân triết học của cả bài**: khi bạn lưu **cả trạng thái lẫn lịch sử như hai nguồn ngang hàng**, bạn đã tạo ra khả năng chúng mâu thuẫn. Cách chữa triệt để không phải là "đồng bộ chúng cẩn thận hơn", mà là **xoá bỏ một trong hai vai trò**: chỉ lịch sử là sự thật, trạng thái chỉ là kết quả suy ra. Đó chính là event sourcing, và đó là lý do nó tồn tại.

---

## 6. Phương án 3 — Phân tán + Two-Phase Commit (2PC)

Nếu một database không đủ, hãy chia dữ liệu ra nhiều database và dùng **giao dịch phân tán** để giữ tính nguyên tử. Giao thức kinh điển là **2PC (two-phase commit)**, chuẩn hoá trong XA.

### 6.1 2PC hoạt động ra sao

Có một **coordinator** (điều phối viên — ở đây là Wallet Service) và các **participant** (những database shard tham gia).

```
          Coordinator                RM-1 (ví A)         RM-2 (ví B)
              |                          |                    |
 Pha 1  ------|--- PREPARE ------------->|                    |
 (bỏ phiếu)   |--- PREPARE --------------|------------------->|
              |                          | ghi WAL "prepared" |
              |                          | GIỮ KHOÁ trên A    | ghi WAL "prepared"
              |                          |                    | GIỮ KHOÁ trên B
              |<-- YES ------------------|                    |
              |<-- YES ------------------|--------------------|
              |
              | ghi quyết định COMMIT vào log của coordinator  <-- điểm không quay đầu
              |
 Pha 2  ------|--- COMMIT -------------->| áp dụng + nhả khoá |
 (thực thi)   |--- COMMIT ---------------|------------------->| áp dụng + nhả khoá
              |<-- ACK ------------------|<-------------------|
```

Hai pha có ý nghĩa rất cụ thể:

- **Pha 1 — prepare (chuẩn bị / bỏ phiếu).** Mỗi participant làm **mọi thứ trừ việc commit**: kiểm tra ràng buộc, giữ khoá, ghi các thay đổi vào WAL ở trạng thái "prepared". Khi trả lời `YES`, nó đang đưa ra một **lời hứa không thể rút lại**: "tôi bảo đảm rằng nếu anh bảo commit, tôi commit được, kể cả khi tôi restart ngay bây giờ." Để giữ lời hứa đó, nó **buộc phải giữ khoá** cho tới khi có quyết định.
- **Pha 2 — commit/abort.** Coordinator ghi quyết định vào log bền của chính nó (đây là **điểm không quay đầu**), rồi thông báo cho tất cả. Participant áp dụng và nhả khoá.

### 6.2 Các chế độ hỏng — và vì sao 2PC đáng sợ

Đây là phần đáng dành thời gian nhất, vì nó là câu hỏi phụ kinh điển: *"Nếu coordinator chết thì sao?"*

| Ai chết, lúc nào | Chuyện gì xảy ra | Có tự hồi phục được không |
|---|---|---|
| Participant chết **trước** khi trả lời prepare | Coordinator hết giờ chờ → abort toàn bộ | Có. An toàn |
| Participant chết **sau** khi trả lời YES | Khi khởi động lại, nó đọc WAL thấy "prepared", phải **hỏi coordinator** quyết định là gì | Có, nếu coordinator còn sống |
| Coordinator chết **trước** khi ghi quyết định | Participant đang giữ khoá và chờ. Coordinator khởi động lại, không thấy quyết định → abort | Có, nhưng khoá bị giữ suốt thời gian coordinator down |
| **Coordinator chết SAU khi một số participant đã prepare, và log quyết định mất** | Participant ở trạng thái **in-doubt**: đã hứa, không được phép tự quyết, và không ai nói cho nó biết kết quả. Nó **giữ khoá vô hạn** | **KHÔNG.** Đây là bế tắc thật sự — gọi là *blocking problem* của 2PC |
| Coordinator sống nhưng **mạng bị phân vùng** với một participant | Participant đó khoá vô hạn cho tới khi mạng lành | Chỉ khi mạng lành lại |

Trạng thái **in-doubt** là chỗ 2PC lộ bản chất: nó **không phải là giao thức chịu lỗi**. Nó là giao thức *nguyên tử*, và nó mua tính nguyên tử bằng cách **hi sinh tính khả dụng**. Participant bị kẹt không được phép đoán: nếu nó tự abort mà coordinator đã quyết commit, ta mất tiền; nếu nó tự commit mà coordinator đã abort, ta tạo ra tiền. Cả hai đều là thảm hoạ ở hệ thống ví. Nên nó đứng im — và trong lúc đứng im, **khoá của nó chặn mọi giao dịch khác đụng vào ví đó**.

Trong thực tế, cách chữa duy nhất là **can thiệp thủ công**: một DBA vào xem, đoán, rồi `COMMIT PREPARED` hoặc `ROLLBACK PREPARED` bằng tay. Vận hành như thế ở 1 triệu TPS là không thể.

> ⚠️ **Bẫy trong phỏng vấn**: rất nhiều người nói "dùng 2PC để đảm bảo nguyên tử" rồi dừng lại, tưởng đã trả lời xong. Câu hỏi tiếp theo *luôn* là "coordinator chết sau prepare thì sao?". Nếu bạn trả lời "bầu coordinator mới" thì phải nói tiếp: coordinator mới phải khôi phục được **log quyết định** — nghĩa là bản thân coordinator phải được nhân bản bằng consensus (Raft/Paxos). Lúc đó bạn vừa thừa nhận rằng **2PC không tự đứng được, nó phải dựa lên một tầng consensus** — và đó chính là lý do ta sẽ đi thẳng tới Raft ở §10.

### 6.3 Vì sao 2PC không dùng được ở quy mô này

Ngoài chuyện blocking, còn bốn lý do định lượng:

1. **Latency nhân đôi (ít nhất).** Một giao dịch cần 2 vòng mạng đồng bộ (prepare + commit) × 2 participant, cộng **2 lần fsync** ở mỗi participant (ghi prepared, ghi commit) và 1 lần ở coordinator. Từ ~1 ms lên ~5–10 ms.
2. **Khoá bị giữ suốt cả hai pha.** Thời gian giữ khoá dài gấp ~5–10 lần so với giao dịch cục bộ. Với ví merchant nóng, throughput tối đa của ví đó = `1 / thời_gian_giữ_khoá` ⇒ từ ~1.000 TPS rơi xuống **~100–200 TPS**. Đây là đòn chí mạng.
3. **Khả dụng là tích của các thành phần.** Giao dịch chỉ thành công nếu **tất cả** participant khoẻ. Hai node 99,9% ⇒ 99,8%. Ở 200–2.000 node với giao dịch trải rộng, xác suất "có ai đó đang chết" tiến tới 1. Thêm node làm hệ thống **kém khả dụng hơn** — ngược hoàn toàn với kỳ vọng.
4. **Hệ sinh thái đã bỏ rơi nó.** XA hoạt động tốt giữa các RDBMS truyền thống, nhưng **không** có trong Kafka, DynamoDB, Cassandra, hay bất kỳ hệ NoSQL nào ở quy mô lớn. Chọn 2PC là tự khoá mình vào một họ công nghệ hẹp.

---

## 7. Phương án 4 — Saga và TC/C (giao dịch bằng bù trừ)

Nếu không thể giữ nguyên tử **thật sự** xuyên node, thì hãy bỏ nó và thay bằng một lời hứa yếu hơn nhưng khả thi: **mỗi bước là một giao dịch cục bộ commit ngay; nếu bước sau hỏng, chạy một giao dịch bù trừ (compensating transaction) để đảo ngược bước trước.**

Đây gọi là **giao dịch phân tán bằng bù trừ**. Hai biến thể phổ biến: **Saga** và **TC/C (Try-Confirm/Cancel)**.

### 7.1 Saga

Các thao tác được xếp thành **một chuỗi tuyến tính**. Chạy từ đầu đến cuối. Nếu bước `k` hỏng, chạy ngược các thao tác bù trừ của `k-1, k-2, ..., 1`.

```
Thuận:   [T1: A -= 1]  ->  [T2: B += 1]  ->  xong
                            (hỏng)
Bù trừ:  [C1: A += 1]  <---'
```

Điều phối saga có hai kiểu, và chọn sai là một lỗi thiết kế thật:

| | **Choreography** (biên đạo) | **Orchestration** (điều phối) |
|---|---|---|
| Cách hoạt động | Mỗi service nghe sự kiện của service khác và tự biết phải làm gì tiếp | Một coordinator trung tâm ra lệnh từng bước theo đúng thứ tự |
| Ưu | Không có điểm tập trung, dịch vụ rời rạc, dễ thêm bên tiêu thụ mới | Logic nghiệp vụ nằm ở **một chỗ**, dễ đọc, dễ theo dõi trạng thái, dễ debug |
| Nhược | Logic nghiệp vụ **vỡ vụn ra khắp nơi**. Không ai trả lời được "giao dịch này đang ở bước nào". Thêm một bước ⇒ sửa nhiều service. Dễ sinh vòng lặp sự kiện | Coordinator là điểm hỏng và điểm nghẽn ⇒ phải nhân bản nó |
| Dùng khi | Luồng ngắn (2–3 bước), các bên độc lập thật sự | **Ví điện tử** — luồng có nghiệp vụ chặt, cần trạng thái tường minh, cần audit |

Với ví điện tử, **orchestration gần như luôn là lựa chọn đúng**: ta cần một bảng trạng thái tường minh để trả lời "giao dịch `tx_9931` đang ở đâu", và để có nơi cho một job hồi phục quét ra các giao dịch treo.

### 7.2 TC/C — Try / Confirm / Cancel

TC/C giống 2PC ở chỗ có hai pha, nhưng khác ở một điểm **quyết định**: trong 2PC, pha 1 **chưa commit gì cả** (mọi thứ nằm trong trạng thái prepared, giữ khoá); trong TC/C, **pha 1 đã commit thật** — chỉ là nó commit một trạng thái *trung gian* có thể đảo ngược.

| Pha | Thao tác | Ví A (người gửi) | Ví B (người nhận) |
|---|---|---|---|
| 1 | **Try** | Trừ 1$ (commit thật, cục bộ) — hoặc chuyển 1$ sang vùng "đang giữ" | NOP (không làm gì) |
| 2a | **Confirm** | NOP | Cộng 1$ (commit thật, cục bộ) |
| 2b | **Cancel** | Cộng lại 1$ (bù trừ) | NOP |

Và đây là bảng so sánh cốt lõi giữa hai giao thức — nên thuộc:

| | Pha 1 | Pha 2 khi thành công | Pha 2 khi thất bại |
|---|---|---|---|
| **2PC** | Giao dịch **chưa xong**, đang giữ khoá ở trạng thái prepared | Commit tất cả | Rollback tất cả (database tự làm, sạch sẽ) |
| **TC/C** | Mọi giao dịch **đã xong** — đã commit hoặc đã huỷ cục bộ | Chạy **giao dịch mới** nếu cần | Chạy **giao dịch đảo ngược** cái đã commit |

Hệ quả trực tiếp của sự khác biệt ấy:

- ✅ **TC/C không giữ khoá xuyên pha.** Đây là toàn bộ lý do nó tồn tại: khoá chỉ tồn tại trong phạm vi một giao dịch cục bộ vài trăm micro-giây. Không còn in-doubt, không còn blocking vô hạn.
- ✅ **Database-agnostic.** Chỉ cần mỗi shard hỗ trợ giao dịch cục bộ. Không cần XA. Chạy được trên DynamoDB, Cassandra với điều kiện, bất cứ thứ gì.
- ✅ **Song song được.** Các bước try có thể gửi đồng thời tới nhiều shard (khác với Saga tuyến tính). Đây là lý do chính để chọn TC/C thay vì Saga khi latency quan trọng.
- ⚠️ **Toàn bộ độ phức tạp chuyển sang tầng ứng dụng.** Database không còn lo giúp bạn nữa. Bạn phải tự viết đường bù trừ, tự viết hồi phục, tự viết dò treo — và **tự test** tất cả những nhánh hiếm gặp đó.
- ⚠️ **Có khoảnh khắc trạng thái không cân bằng** (§7.4).

### 7.3 Coordinator chết giữa chừng — bảng trạng thái pha

TC/C không bị blocking, nhưng nếu coordinator chết sau khi "try" thành công mà chưa "confirm", giao dịch sẽ **treo mãi**: tiền đã trừ khỏi A mà chưa cộng cho B.

Cách chữa là **phase status table** — bảng trạng thái pha, được ghi **nguyên tử cùng shard** với thao tác nghiệp vụ (để không tạo ra bài toán nguyên tử mới):

| Cột | Ý nghĩa |
|---|---|
| `tx_id` | Khoá chính, cũng là idempotency key |
| `payload` | Nội dung giao dịch phân tán (các chân, số tiền) |
| `try_status` | `NOT_SENT` / `SENT` / `RESPONDED_YES` / `RESPONDED_NO` |
| `phase2_name` | `CONFIRM` hay `CANCEL` |
| `phase2_status` | `NOT_SENT` / `SENT` / `DONE` |
| `out_of_order` | Cờ đánh dấu đã nhận cancel *trước* khi nhận try |
| `updated_at` | Để job quét tìm giao dịch treo quá lâu |

Khi coordinator mới lên (hoặc một job hồi phục chạy mỗi vài giây), nó quét bảng tìm các dòng chưa kết thúc và **đẩy chúng về phía trước hoặc phía sau** cho tới khi đạt trạng thái cuối. Vì mọi thao tác đều idempotent (§12), việc gửi lại confirm/cancel nhiều lần là an toàn.

### 7.4 Thứ tự thao tác — chi tiết dễ bị bỏ qua nhất

Trong pha try, phải chọn làm gì với A và với B. Có ba lựa chọn, và **chỉ một cái đúng**:

| Lựa chọn pha Try | Ví A | Ví B | Đánh giá |
|---|---|---|---|
| 1 | **−1$** | NOP | ✅ **Đúng** |
| 2 | NOP | **+1$** | ❌ Sai nghiêm trọng |
| 3 | **−1$** | **+1$** | ❌ Không khả thi |

- **Lựa chọn 2 sai** vì nó **tạo ra tiền trước khi tiêu huỷ tiền**. Nếu pha 2 hỏng và ta phải cancel, B có thể đã **tiêu mất số tiền đó** rồi — số tiền chưa bao giờ được trừ khỏi A. Ta vừa tự tạo ra một máy in tiền và một lỗ hổng khai thác được. Kẻ tấn công chỉ cần tạo giao dịch luôn-hỏng-ở-pha-2 rồi tiêu ngay khoản vừa nhận.
- **Lựa chọn 3 không khả thi** vì làm cả hai việc nguyên tử xuyên hai shard **chính là bài toán ta đang cố tránh**. Nếu làm được thì đã không cần TC/C.
- **Lựa chọn 1 đúng** vì trạng thái trung gian của nó là **an toàn về mặt tài chính**: tiền đã rời A nhưng chưa tới B — hệ thống tạm thời "thiếu" tiền chứ không "thừa" tiền. Thiếu tiền thì sửa được (cancel trả lại A). Thừa tiền thì không, vì nó có thể đã bị tiêu.

> 💡 **Nguyên tắc vàng của mọi hệ thống bù trừ**: **luôn trừ trước, cộng sau.** Đặt trạng thái trung gian ở phía "hệ thống bị thiếu", không bao giờ ở phía "hệ thống bị thừa". Nguyên tắc này áp dụng cho mọi thứ — trừ tồn kho trước khi tạo đơn, trừ hạn mức trước khi cấp quyền, thu hồi token trước khi phát token mới. Đây là một trong những câu đáng nhớ nhất của cả bài.

Hệ quả: tại mọi thời điểm có giao dịch đang bay, **tổng số dư thấy được sẽ nhỏ hơn hoặc bằng tổng thật**. Điều này chấp nhận được miễn là (a) ta luôn hồi phục về trạng thái cuối, và (b) người dùng không thể tiêu số tiền đang ở trạng thái trung gian. Cách sạch nhất là mô hình hoá tường minh: mỗi ví có `available_balance` và `held_balance`, pha try chuyển tiền từ available sang held thay vì làm nó biến mất.

### 7.5 Thực thi lệch thứ tự (out-of-order)

Một cạnh hiếm nhưng có thật: shard của A nhận lệnh **cancel trước cả lệnh try**. Xảy ra khi try bị chậm/mất gói trên mạng, coordinator hết giờ chờ và phát cancel, rồi try tới nơi muộn.

Nếu xử lý ngây thơ: cancel (cộng lại 1$ — nhưng chưa từng trừ!) rồi try tới sau và trừ 1$. Kết quả cuối *tình cờ* đúng ở ví dụ này, nhưng ở các nghiệp vụ khác thì không, và trong lúc đó số dư hiển thị sai.

Cách chữa: **cờ `out_of_order`**. Khi nhận cancel cho một `tx_id` chưa từng thấy try, ghi một dòng với cờ `out_of_order = true`. Khi try tới sau, nó kiểm tra cờ, thấy đã bị huỷ, và **từ chối thực thi**. Cùng nguyên lý với "tombstone" trong hệ phân tán: **ghi nhớ những gì đã bị huỷ, chứ đừng cho rằng cái chưa thấy là chưa xảy ra.**

### 7.6 So sánh TC/C và Saga

| | **TC/C** | **Saga** |
|---|---|---|
| Nơi đặt hành động bù trừ | Pha Cancel | Pha rollback |
| Điều phối tập trung | Có | Có (chế độ orchestration) |
| Thứ tự thực thi | Bất kỳ — **song song được** | **Tuyến tính**, tuần tự |
| Độ trễ | Thấp hơn (2 vòng song song) | Cao hơn (n bước nối tiếp) |
| Nhìn thấy trạng thái không nhất quán tạm thời | Có | Có |
| Logic nằm ở đâu | Ứng dụng | Ứng dụng |
| Số giao dịch cục bộ mỗi chân | 2 (try + confirm/cancel) | 1 (+1 nếu phải bù) |
| Phù hợp khi | **Độ trễ quan trọng**, nhiều chân độc lập | Luồng nghiệp vụ dài, có thứ tự bắt buộc, có bên thứ ba |

**Khác biệt thực chất: TC/C song song được, Saga thì không.** Nếu SLA đòi p99 dưới 300 ms và giao dịch có 4 chân, TC/C thắng rõ. Nếu luồng có ràng buộc thứ tự tự nhiên (phải kiểm tra KYC xong mới được giữ tiền, giữ tiền xong mới gọi đối tác), Saga phản ánh nghiệp vụ trung thực hơn. Đổi lại, TC/C tốn **gấp đôi số lần ghi** vì mỗi chân có hai giao dịch cục bộ.

### 7.7 Vì sao cả hai vẫn chưa đủ

Saga và TC/C giải quyết được **khả năng mở rộng** và **tránh được blocking của 2PC**. Chúng là kỹ thuật đúng và ta sẽ **giữ lại** — ở §11 chúng quay lại làm lớp điều phối giao dịch xuyên shard.

Nhưng chúng **không** trả lời được yêu cầu quan trọng nhất còn lại: *chứng minh tính đúng đắn và tái dựng lịch sử*. Sau khi một saga chạy xong, cái ta còn lại vẫn chỉ là **số dư mới** — cộng với một bảng trạng thái pha vốn được thiết kế để *dọn dẹp sau khi xong*, không phải để lưu trữ vĩnh viễn. Câu hỏi *"số dư của ví này lúc 14:32 hôm kia là bao nhiêu, và chứng minh đi"* vẫn chưa có lời đáp.

Tệ hơn: bù trừ **không phải là rollback**. Nó là một giao dịch mới đè lên giao dịch cũ. Khoảnh khắc "đã trừ nhưng chưa cộng" **đã thật sự xảy ra** và đã được commit. Nếu không lưu lại dấu vết của nó, lịch sử ta kể lại cho kiểm toán viên là một lịch sử *đã được chỉnh sửa*. Và nếu **chính hành động bù trừ cũng thất bại** — shard của A đang chết, hoặc bug làm cancel chạy sai — thì tiền thật sự bốc hơi, và ta không có gì trong tay ngoài một dòng log nói rằng "đã cố".

Cần một mô hình mà **mọi thứ đã xảy ra đều được ghi lại vĩnh viễn, kể cả sai lầm và kể cả sự sửa sai**. Đó là §8.

---

## 8. Phương án 5 — Event sourcing (trọng tâm của bài)

### 8.1 Đảo ngược câu hỏi

Bốn phương án trước đều trả lời câu hỏi *"làm sao cập nhật số dư cho đúng?"*. Event sourcing đổi câu hỏi thành:

> **Đừng lưu số dư. Hãy lưu mọi thứ đã xảy ra. Số dư chỉ là kết quả cộng dồn của những thứ đó.**

Đây không phải mẹo kỹ thuật — nó là cách ngành kế toán làm suốt 500 năm. Sổ cái không có ô "số dư" để sửa. Sổ cái là một danh sách bút toán chỉ ghi thêm; số dư là thứ bạn *tính ra* khi cần. Điểm mạnh không nằm ở tốc độ mà ở chỗ: **không thể nói dối một cuốn sổ chỉ ghi thêm mà không để lại dấu vết.**

### 8.2 Bốn khái niệm: command, event, state, state machine

Đây là phần lý thuyết phải nắm chắc, vì lẫn lộn command với event là lỗi phổ biến nhất khi làm event sourcing.

**Command (lệnh)** — *ý định* từ thế giới bên ngoài. "Hãy chuyển 1$ từ A sang B."
- Ở **thì mệnh lệnh**: `TransferMoney`.
- **Có thể thất bại**: không đủ tiền, ví bị khoá, số tiền âm.
- **Không tất định (non-deterministic)**: có thể chứa timestamp hiện tại, số ngẫu nhiên, kết quả gọi dịch vụ ngoài.
- Một command sinh ra **0, 1 hoặc nhiều** event.
- Cần có **thứ tự toàn cục trong phạm vi ví** ⇒ xếp vào hàng đợi FIFO.

**Event (sự kiện)** — *sự thật lịch sử* về thứ đã xảy ra. "Đã chuyển 1$ từ A sang B lúc 14:32:07."
- Ở **thì quá khứ**: `MoneyTransferred`. Cách đặt tên này không phải chuyện thẩm mỹ — nó ép bạn nhớ rằng sự kiện **không thể bị từ chối, không thể bị sửa, không thể bị xoá**.
- **Không bao giờ thất bại.** Nó đã xảy ra rồi. Bên tiêu thụ chỉ có thể áp dụng nó.
- **Đã tất định hoá**: mọi thứ không tất định (thời gian, số ngẫu nhiên, kết quả gọi ngoài) đã được **cố định thành giá trị cụ thể** trong lúc xử lý command. Đây là chi tiết tinh tế nhưng tối quan trọng — xem §8.6.
- Cũng có thứ tự, cũng vào hàng đợi FIFO.

**State (trạng thái)** — kết quả cộng dồn của các event. `map<wallet_id, balance>`. **Có thể vứt đi bất cứ lúc nào** và dựng lại từ event.

**State machine (máy trạng thái)** — thứ điều khiển toàn bộ quá trình. Nó làm đúng hai việc:
1. **Kiểm tra command** (đọc state hiện tại, áp dụng luật nghiệp vụ) rồi **sinh event**.
2. **Áp dụng event** để cập nhật state.

Và nó **bắt buộc phải tất định**: cùng một chuỗi event đầu vào, ở bất kỳ máy nào, bất kỳ lúc nào, phải cho ra cùng một state. Không đọc đồng hồ. Không gọi API ngoài. Không dùng `random()`. Không lặp qua hash map có thứ tự không ổn định. Tính tất định này là **nền móng của toàn bộ khả năng tái tạo** — vứt nó đi thì cả kiến trúc sụp.

```
        +-----------+     kiểm tra      +----------+     áp dụng      +---------+
 -----> | Command Q | ----------------> |  State   | --------------> |  State  |
 client |  (FIFO)   |                   | Machine  |                 | (RAM/KV)|
        +-----------+                   +----+-----+                 +---------+
                                             | sinh
                                             v
                                       +-----------+
                                       |  Event Q  | --> Event Store (append-only)
                                       |  (FIFO)   |     NGUỒN SỰ THẬT DUY NHẤT
                                       +-----------+
```

### 8.3 Luồng một giao dịch

```
1. Nhận: TransferMoney{tx_id, A, B, 25.50 USD}          <- COMMAND
2. Xếp vào command queue của shard chứa A
3. State machine lấy command ra, đọc state: balance(A) = 100.00
4. Kiểm tra: đủ tiền? ví A có bị khoá? tx_id đã xử lý chưa?
5a. Không hợp lệ -> sinh event TransferRejected{lý do} (VẪN là một event!)
5b. Hợp lệ -> sinh 2 event:
       BalanceDebited { wallet: A, amount: 25.50, tx_id, seq: 1042 }
       BalanceCredited{ wallet: B, amount: 25.50, tx_id, seq:  77  }
6. GHI EVENT VÀO EVENT STORE (append, fsync, nhân bản)   <- ĐIỂM COMMIT THẬT SỰ
7. Áp dụng event -> state: balance(A) = 74.50, balance(B) += 25.50
8. Phát event cho các bên tiêu thụ (đọc, thông báo, chống gian lận, kho dữ liệu)
```

**Bước 6 là điểm commit của toàn hệ thống.** Sau khi event nằm bền trên đĩa và đã được nhân bản đủ quorum, giao dịch **đã xảy ra vĩnh viễn** — kể cả khi mọi máy chủ chết ngay giây sau. Bước 7 chỉ là cập nhật một bản sao tiện lợi; mất nó thì chạy lại bước 7 từ event là xong.

Chú ý bước 5a: **một command bị từ chối cũng sinh ra event.** Đây là điểm phân biệt người đã làm event sourcing thật với người mới đọc lý thuyết. `TransferRejected{lý do: "không đủ số dư"}` là một sự thật lịch sử có giá trị: nó trả lời được câu hỏi của bộ phận chăm sóc khách hàng ("vì sao giao dịch của tôi hôm qua hỏng?"), nó là đầu vào cho mô hình chống gian lận (10 lần thử thất bại liên tiếp là tín hiệu mạnh), và nó khiến luồng event **giải thích được mọi thứ đã xảy ra**, không chỉ những thứ thành công.

### 8.4 CQRS — tách đường ghi khỏi đường đọc

**CQRS (Command Query Responsibility Segregation)** là bạn đồng hành gần như bắt buộc của event sourcing, vì event sourcing làm đường ghi rất nhanh nhưng làm đường đọc **rất bất tiện** (không ai muốn replay 6 PB để hiển thị một số dư).

Giải pháp: luồng event là nguồn sự thật duy nhất, nhưng nó nuôi **nhiều mô hình đọc (read model / projection) khác nhau**, mỗi cái tối ưu cho một truy vấn:

```
                    +----------------------+
                    |  EVENT STORE         |
                    |  (append-only,       |
                    |   nguồn sự thật)     |
                    +----------+-----------+
                               | (đọc tuần tự, ai cũng đọc được)
        +--------------+-------+-------+--------------+
        v              v               v              v
  +-----------+  +-----------+  +------------+  +-----------+
  | Số dư     |  | Lịch sử   |  | Chống gian |  | Kho dữ    |
  | hiện tại  |  | giao dịch |  | lận (Flink)|  | liệu/BI   |
  | (KV,RAM)  |  | (OLAP)    |  |            |  | (S3/Athena)|
  +-----------+  +-----------+  +------------+  +-----------+
```

Ba điều quan trọng về CQRS ở đây:

1. **Read model có thể vứt bỏ và dựng lại hoàn toàn.** Phát hiện bug trong cách tính lịch sử? Xoá bảng, replay event, dựng lại. Không migration, không sửa dữ liệu bằng tay. Đây là một siêu năng lực vận hành mà kiến trúc CRUD không bao giờ có.
2. **Thêm read model mới không đụng gì tới đường ghi.** Bộ phận rủi ro cần một góc nhìn mới? Viết một consumer mới, replay từ đầu, có ngay dữ liệu đầy đủ từ ngày một — kể cả cho những câu hỏi chưa ai nghĩ tới lúc thiết kế. Trong CRUD, dữ liệu bạn không nghĩ tới việc lưu là dữ liệu đã mất vĩnh viễn.
3. **Read model là eventually consistent** so với event store. Đây là cái giá phải trả, và nó tạo ra một vấn đề UX thật: người dùng chuyển tiền xong, bấm F5, chưa thấy số dư mới. §11.3 xử lý bằng cơ chế đẩy kết quả về.

> ⚠️ **Bẫy**: CQRS không có nghĩa là "hai database". Nó có nghĩa là **mô hình ghi và mô hình đọc là hai mô hình khác nhau**. Rất nhiều đội dựng hai database rồi vẫn để chúng cùng hình dạng, cùng một schema — lúc đó họ nhận hết chi phí của CQRS mà không nhận được lợi ích nào.

### 8.5 Reproducibility — điều mà bốn phương án trước không làm được

Quay lại ba câu hỏi kiểm toán từ §1, và xem event sourcing trả lời thế nào:

| Câu hỏi kiểm toán | Kiến trúc CRUD | Event sourcing |
|---|---|---|
| Số dư của ví X lúc 14:32:07 ngày 3/6 là bao nhiêu? | Không biết. Trừ khi có snapshot hằng ngày — mà cũng chỉ chính xác tới ngày | Replay mọi event của X có `ts <= 14:32:07`. **Chính xác tới từng sự kiện** |
| Làm sao biết số dư đó đúng? | "Tin vào code." Reconciliation thấy lệch nhưng không biết vì sao | Tính lại từ đầu. Nếu khớp, đúng. Nếu lệch, **so từng event để tìm chính xác event nào gây ra sai** |
| Sau khi đổi code, làm sao chứng minh logic vẫn đúng? | Test unit và cầu nguyện | Chạy **code cũ và code mới trên cùng luồng event thật**, so từng state. Khác nhau ở đâu là biết ngay (§19) |
| Ai đã làm gì, lúc nào? | Bảng audit log riêng — mà bảng đó có thể bị quên ghi | **Nội tại**. Không có đường nào thay đổi state mà không sinh event |

Và đây là điểm mà nhiều người bỏ lỡ: **audit là miễn phí, không phải là một tính năng phải xây.** Trong kiến trúc CRUD, audit log là thứ *thêm vào* — nghĩa là nó có thể bị quên, có thể lệch với dữ liệu thật, có thể bị vô hiệu hoá bởi một `UPDATE` thủ công. Trong event sourcing, **event store chính là audit log, và nó cũng chính là dữ liệu**. Không thể thay đổi cái này mà không thay đổi cái kia, vì chúng là một.

### 8.6 Hai cái bẫy sinh tử của event sourcing

**Bẫy 1 — tính không tất định lọt vào state machine.**

Nếu state machine gọi `now()`, `random()`, hoặc gọi API tỉ giá bên ngoài, thì replay sẽ cho kết quả **khác**. Lúc đó toàn bộ lời hứa reproducibility tan biến, và bạn có một hệ thống phức tạp gấp ba mà không nhận lại được gì.

Quy tắc: **mọi giá trị không tất định phải được "đóng băng" vào event khi nó được sinh ra lần đầu.** Không ghi `event.timestamp = now()` lúc *áp dụng*; ghi timestamp vào lúc *sinh event*, rồi khi replay thì dùng lại đúng giá trị đó. Tương tự với mọi thứ đến từ bên ngoài: gọi API tỉ giá **trước** khi sinh event, rồi nhét con số trả về **vào trong** event. Khi replay, không gọi API nữa — đọc từ event. Đây là lý do định nghĩa ở §8.2 nói "command có thể chứa yếu tố ngẫu nhiên, event thì không": **ranh giới giữa command và event chính là ranh giới giữa thế giới hỗn loạn và thế giới tất định.**

**Bẫy 2 — tiến hoá schema của event.**

Event là bất biến và sống mãi mãi. Nhưng code thì thay đổi. Sang năm bạn thêm trường `fee` vào `BalanceDebited`. Khi replay, code mới gặp những event cũ 3 năm trước không có trường đó thì sao?

Chiến lược thực tế:
- **Chỉ thêm, không bao giờ xoá hay đổi nghĩa trường.** Trường mới phải có giá trị mặc định hợp lý.
- **Đánh số phiên bản cho mỗi loại event** (`type: "BalanceDebited", v: 2`).
- **Upcasting**: một lớp chuyển đổi nâng event `v1` thành `v2` khi đọc, để phần còn lại của code chỉ biết một phiên bản.
- **Không bao giờ dùng lại tên trường cũ cho nghĩa mới.** Đây là cách nhanh nhất để làm hỏng lịch sử một cách âm thầm và không thể phát hiện.
- Dùng định dạng có schema tiến hoá được (Protobuf, Avro) thay vì JSON tự do.

> 💡 Event store là **cam kết vĩnh viễn**. Ngày bạn ghi event đầu tiên là ngày bạn nhận trách nhiệm đọc được nó mười năm sau. Thiết kế schema event xứng đáng được đầu tư nhiều hơn thiết kế bảng database gấp nhiều lần, vì bảng thì migrate được, còn lịch sử thì không.

---

## 9. Làm event sourcing đủ nhanh

Mô hình đúng rồi, nhưng nếu command queue là Kafka ở cụm khác và state ở PostgreSQL ở cụm khác nữa, thì mỗi giao dịch tốn 4–6 vòng mạng và ta lại quay về 1.000 TPS. Phần này là chuỗi tối ưu đưa một node từ ~1.000 lên **~100.000 TPS**.

### 9.1 Đưa hàng đợi xuống đĩa cục bộ

Thay vì gửi command/event qua mạng tới Kafka, **ghi thẳng vào file append-only trên đĩa cục bộ** của chính node xử lý.

Vì sao nhanh: ghi **tuần tự** vào đĩa là mẫu I/O nhanh nhất tồn tại — nhanh hơn ghi ngẫu nhiên hàng trăm lần trên HDD, và vẫn nhanh hơn đáng kể trên SSD (không có write amplification, thân thiện với FTL). Một NVMe hiện đại đạt **vài GB/s** ghi tuần tự; với event 100 byte thì đó là **hàng chục triệu event/giây** về mặt băng thông — nút thắt chuyển từ đĩa sang CPU và fsync.

Và ta bỏ được hoàn toàn độ trễ mạng (~0,5 ms mỗi vòng) khỏi đường nóng. Mất mạng không có nghĩa là mất khả năng ghi.

### 9.2 mmap — cache và ghi bền trong một

Dùng `mmap` để ánh xạ file event vào không gian địa chỉ của tiến trình. Kết quả: **ghi vào bộ nhớ chính là ghi vào file**; kernel lo việc đẩy page bẩn xuống đĩa. Đọc event gần đây thì trúng page cache, không chạm đĩa.

⚠️ Nhưng `mmap` **không tự động cho ta độ bền**. Dữ liệu nằm trong page cache có thể mất nếu máy mất điện trước khi kernel flush. Muốn bền thì vẫn phải `msync`/`fdatasync`. Cách giải quyết đúng: **gộp lô (batching)** — gom các event của 1–5 ms lại, fsync một lần, rồi báo thành công cho cả lô. Một lần fsync 1 ms cho 1.000 event ⇒ chi phí 1 μs/event. Đây chính là "group commit" mà database vẫn làm, chỉ là ta tự làm để kiểm soát được kích thước lô.

### 9.3 State ở local store: RocksDB thay vì database từ xa

State (`map<wallet_id, balance>`) cũng nên nằm cục bộ. Hai lựa chọn:

| | **SQLite** | **RocksDB** |
|---|---|---|
| Cấu trúc | B-tree | **LSM-tree** |
| Ghi | Random write, page split | **Append vào memtable → flush tuần tự** |
| Đọc | Rất nhanh, một lần tra | Có thể phải xem nhiều tầng SST (bù bằng bloom filter + block cache) |
| Có SQL | Có | Không (chỉ KV) |
| Phù hợp | Đọc nhiều, ghi vừa | **Ghi cực nhiều** ← đúng bài của ta |

Chọn **RocksDB**: LSM-tree biến ghi ngẫu nhiên thành ghi tuần tự, đúng hình dạng tải của ta. Chi phí là **compaction** chạy nền, ngốn I/O và gây tăng đột biến độ trễ — phải theo dõi và giới hạn băng thông compaction.

Thật ra với 32 GB state cho 500 triệu ví (§2.3), và mỗi node chỉ giữ một shard, state của một node chỉ cỡ **vài trăm MB** — **nằm gọn trong RAM**. RocksDB ở đây chủ yếu là lớp bền hoá cho phép khởi động lại nhanh mà không phải replay dài. Đây là lúc ý tưởng của phương án 1 quay lại, nhưng lần này nó **không phải nguồn sự thật** nên mất nó cũng không sao.

### 9.4 Snapshot

Khi node khởi động lại, nó phải dựng lại state từ event. Nếu event store có 6 PB, việc đó mất hàng tuần.

**Snapshot**: định kỳ (mỗi N event hoặc mỗi T phút) ghi lại toàn bộ state kèm **offset của event cuối cùng đã áp dụng**:

```
snapshot_20260914_1200.bin
  ├─ last_applied_event_seq: 8_421_993_017
  ├─ checksum: sha256(...)
  └─ w_8f2a: 1250 | w_31bc: 400 | ...

Khởi động = nạp snapshot + replay các event có seq > 8_421_993_017
          = vài giây thay vì vài tuần
```

Ba nguyên tắc quan trọng:

1. **Snapshot không bao giờ là nguồn sự thật.** Nó là cache có thể tính lại. Nếu nghi ngờ snapshot hỏng, vứt đi và replay. Đây là lý do checksum bắt buộc phải có — một snapshot hỏng âm thầm nguy hiểm hơn nhiều so với không có snapshot.
2. **Snapshot phải ghi bất đồng bộ**, không chặn đường nóng. Kỹ thuật: copy-on-write hoặc fork tiến trình (như cách Redis làm BGSAVE).
3. **Đừng xoá event sau khi snapshot.** Rất nhiều người bị cám dỗ: "đã có snapshot rồi, xoá event cũ cho nhẹ". Làm thế là **giết chính lý do chọn event sourcing**. Chuyển event cũ sang lưu trữ nguội (S3 Glacier) thì được, xoá thì không bao giờ.

Snapshot nên giữ **nhiều điểm mốc** (ví dụ hằng ngày, giữ 90 bản) chứ không chỉ bản mới nhất — để trả lời truy vấn `?at=` mà không phải replay từ đầu: tìm snapshot gần nhất *trước* thời điểm hỏi, rồi replay tiếp một đoạn ngắn.

### 9.5 Ngân sách một node — và nút thắt thật sự

```
Với mỗi giao dịch trên một node (đã tối ưu hết):
  - parse + kiểm tra command       ~1 μs
  - đọc state từ RAM               ~0,1 μs
  - sinh + tuần tự hoá 2 event     ~2 μs
  - ghi vào mmap buffer            ~1 μs
  - fsync (phân bổ theo lô 1.000)  ~1 μs
  - áp dụng vào state (RAM)        ~0,2 μs
                                   --------
                                   ~5 μs  =>  ~200.000 TPS/luồng lý thuyết
Trừ hao thực tế (GC, ngắt, jitter mạng, compaction): ~50.000-100.000 TPS
=> Cần ~20-40 node cho 2 triệu ops/giây. So với 2.000 node ban đầu: giảm 50-100 lần.
```

Và nút thắt thật sự thường **không phải** những con số trên, mà là **ví nóng**. Một ví merchant nhận 50.000 TPS: vì mọi lệnh của cùng một ví phải tuần tự (§13.2), ví đó bị giới hạn bởi **một luồng đơn**. Nếu một luồng xử lý được 100.000 TPS thì vừa đủ, nhưng không còn biên an toàn. Các cách chữa:

- **Chia ví nóng thành N ví con** (`merchant_X#0` … `merchant_X#15`), rải đều trên nhiều shard; số dư thật = tổng các ví con. Giao dịch vào chọn ví con ngẫu nhiên. Đổi lại: đọc số dư tổng phải cộng N ví, và rút tiền ra có thể phải gom từ nhiều ví con.
- **Gộp lô tiền vào (netting)**: với ví chỉ nhận (thu phí, doanh thu), gom 10.000 khoản cộng trong 100 ms thành **một** event `BatchCredited` kèm danh sách chi tiết. Giảm số event 10.000 lần mà vẫn giữ nguyên khả năng kiểm toán.
- **Tách đường cộng khỏi đường trừ**: cộng tiền không cần kiểm tra ràng buộc (không thể "cộng quá số dư"), nên nó có thể xử lý song song và gộp lô; chỉ đường trừ mới cần tuần tự hoá nghiêm ngặt.

---

## 10. Raft — nhân bản event store

### 10.1 Vì sao cần

Mọi tối ưu ở §9 đều biến dịch vụ thành **stateful**: dữ liệu sống trên đĩa cục bộ của một máy cụ thể. Máy đó chết = mất dữ liệu. Với 99,99% khả dụng và durability tuyệt đối, đó là điều không chấp nhận được.

Nhưng nhân bản **cái gì**? Phân tích cho ra một kết luận gọn gàng:

| Dữ liệu | Có tái tạo được không? | Cần nhân bản? |
|---|---|---|
| **State** | Có — từ event | Không |
| **Snapshot** | Có — từ event | Không (nhưng nhân bản vẫn tiện để khởi động nhanh) |
| **Command** | Có thể mất; client sẽ retry | Không bắt buộc |
| **Event** | **KHÔNG.** Không tái tạo được từ command, vì command không tất định | ✅ **Bắt buộc** |

Lý do ở dòng cuối tinh tế và đáng nói rõ: có người sẽ hỏi *"sao không nhân bản command cho rẻ, rồi mỗi replica tự sinh event?"*. Không được — vì command **không tất định** (§8.2). Hai replica xử lý cùng một command ở hai thời điểm khác nhau, với state khác nhau, có thể ra hai event khác nhau: một bên thấy đủ tiền, bên kia thấy không. Chỉ có **event** — đã được tất định hoá — mới an toàn để nhân bản.

Vậy: **chỉ cần nhân bản luồng event, và phải nhân bản nó hoàn hảo.** Hai đảm bảo cần có là (a) không mất dữ liệu đã xác nhận, và (b) **thứ tự tương đối của các event giống hệt nhau trên mọi bản sao**. Yêu cầu (b) là lý do nhân bản bất đồng bộ kiểu Redis/MySQL không đủ — chúng có thể mất đuôi log khi failover.

Thứ giải quyết đúng bài này là một **thuật toán đồng thuận (consensus)**: Raft hoặc Paxos. Raft được chọn vì nó được thiết kế để *dễ hiểu*, và có nhiều cài đặt đã kiểm chứng (etcd, TiKV, CockroachDB, Consul).

### 10.2 Raft trong ba ý

**(1) Bầu leader (leader election).** Mọi node ở một trong ba vai: `leader`, `follower`, `candidate`. Thời gian chia thành các **term** (nhiệm kỳ) được đánh số tăng dần. Follower không nhận được heartbeat từ leader trong một khoảng ngẫu nhiên (150–300 ms) sẽ tăng term lên, tự chuyển thành candidate và xin phiếu. Ai được **quá bán** phiếu thì thành leader của term đó. Vì mỗi node chỉ bỏ một phiếu mỗi term và quá bán của một tập hợp là duy nhất, **không thể có hai leader trong cùng một term**. Timeout ngẫu nhiên là mẹo đơn giản để tránh chia phiếu lặp đi lặp lại.

**(2) Nhân bản log (log replication).** Mọi ghi đi qua leader. Leader ghi event vào log của nó rồi gửi `AppendEntries` tới follower. Khi **quá bán** (bao gồm chính leader) đã ghi bền entry đó, leader đánh dấu nó **committed**, áp dụng vào state machine và trả lời client. Follower áp dụng theo sau. Mỗi entry mang `(term, index)`, và `AppendEntries` mang theo `(prevLogTerm, prevLogIndex)` — follower từ chối nếu không khớp, buộc leader lùi lại và đồng bộ hoá. Cơ chế này đảm bảo **Log Matching**: nếu hai log có cùng entry tại cùng index và term, thì **mọi entry trước đó đều giống hệt nhau**. Đó chính xác là đảm bảo (b) ta cần.

**(3) Quorum.** Cụm `2f+1` node chịu được `f` node chết. Thường là **3** (chịu 1) hoặc **5** (chịu 2). Vì mọi quorum ghi và mọi quorum bầu cử đều **giao nhau ít nhất một node**, leader mới luôn nhìn thấy mọi entry đã committed — nên entry đã committed **không bao giờ biến mất**. Đây là bất biến nền tảng và là toàn bộ lý do ta tin tưởng Raft với tiền.

```
                 client ghi event
                        |
                        v
                  +-----------+
                  |  LEADER   |  log: [...][e42]
                  +-----+-----+
             AppendEntries |  \
                 +---------+   +----------+
                 v                        v
           +-----------+            +-----------+
           | FOLLOWER 1|            | FOLLOWER 2|
           | log:[e42] |            | log:[...] |  (chậm hơn)
           +-----------+            +-----------+

 2/3 đã ghi bền  =>  e42 COMMITTED  =>  áp dụng + trả lời client
 Leader chết -> follower có log đầy đủ nhất được bầu lên -> không mất e42
```

### 10.3 Chi phí và chỗ đau

| Vấn đề | Thực tế |
|---|---|
| **Độ trễ ghi** | Tăng thêm 1 vòng mạng tới follower gần nhất trong quorum. Trong một AZ: ~0,5 ms. **Xuyên AZ: 1–2 ms. Xuyên region: 30–100 ms** ⇒ xuyên region trên đường nóng là không thể chấp nhận |
| **Ghi chỉ qua leader** | Không scale ghi bằng cách thêm node vào cùng nhóm Raft. Thêm follower chỉ tăng độ bền, còn **làm chậm** một chút vì leader phải gửi thêm. Muốn scale ghi thì **phải sharding** (§11) |
| **Số node lẻ** | Cụm 4 node chịu lỗi *bằng* cụm 3 node (cả hai chịu 1) nhưng chậm hơn. Luôn dùng số lẻ |
| **Bầu cử = khoảng chết** | Leader chết ⇒ 150–300 ms không phục vụ được. Ở 1 triệu TPS đó là ~300.000 giao dịch bị hoãn. Phải có retry + hàng đợi phía client |
| **Rải node theo AZ** | 3 node / 3 AZ chịu được mất một AZ. 3 node cùng một AZ thì mất AZ là mất tất cả |

> 💡 Điểm đáng nhớ: **Raft không giải quyết bài toán mở rộng, nó giải quyết bài toán độ bền.** Nó biến "một node có thể mất dữ liệu" thành "một nhóm 3 node không mất dữ liệu khi 1 node chết". Muốn tăng thông lượng thì vẫn phải chia thành **nhiều nhóm Raft** — và đó là §11.

---

## 11. Sharding và giao dịch xuyên shard

### 11.1 Shard theo cái gì

Một nhóm Raft không đủ 2 triệu ops/giây, nên phải chia dữ liệu thành nhiều nhóm Raft độc lập. Khoá phân mảnh **bắt buộc** phải là **`wallet_id`** (không phải `transaction_id`, không phải thời gian):

```
shard = hash(wallet_id) % N      (thực tế: consistent hashing — xem sd-09)
```

Ba lý do, theo thứ tự quan trọng:

1. **Mọi lệnh của cùng một ví rơi vào cùng một shard** ⇒ được xử lý tuần tự bởi cùng một state machine ⇒ không bao giờ có hai luồng cùng sửa một số dư. Đây là lý do số một và nó giết luôn toàn bộ họ lỗi race condition (§13, §14).
2. **Kiểm tra số dư trở thành thao tác cục bộ**, không cần khoá phân tán, không cần đọc từ xa.
3. **Đọc số dư và lịch sử của một ví chỉ chạm một shard.**

Nếu shard theo `transaction_id` thì mọi giao dịch chạm hai shard ngẫu nhiên và **không còn ví nào có nơi trú ngụ cố định** — kiểm tra số dư biến thành đọc phân tán. Đó là lỗi thiết kế nặng nhất có thể mắc ở bước này.

Dùng **consistent hashing với virtual node** thay vì `% N` để thêm/bớt shard chỉ di chuyển `1/N` dữ liệu. Bản đồ shard giữ ở etcd/ZooKeeper, và **mọi client phải nhìn thấy cùng một phiên bản bản đồ** — dùng số phiên bản (epoch) đính kèm request, shard từ chối request mang epoch cũ. Không có epoch thì trong lúc rebalance sẽ có hai node cùng nhận là chủ một ví.

### 11.2 Bài toán xuyên shard

A ở shard 1, B ở shard 2. Không còn giao dịch đơn lẻ nào bao được cả hai.

```
 Client -> Saga Coordinator (bản thân nó cũng là một nhóm Raft, có bảng trạng thái pha)
                |
                |  (1) ghi bản ghi saga: tx_id, PENDING, bước 1
                |
                +--(2)--> Shard 1 (Raft group 1): command DEBIT A 25.50
                |             -> kiểm tra số dư, sinh event BalanceDebited
                |             -> nhân bản qua Raft, committed
                |         <-- ACK (kèm event_seq)
                |
                |  (3) ghi bản ghi: bước 1 DONE, chuyển bước 2
                |
                +--(4)--> Shard 2 (Raft group 2): command CREDIT B 25.50
                |             -> sinh event BalanceCredited, committed
                |         <-- ACK
                |
                |  (5) ghi bản ghi: COMPLETED -> trả kết quả cho client
```

Nếu bước (4) hỏng vĩnh viễn (ví B bị khoá, bị đóng, không tồn tại), coordinator chạy **bù trừ**: gửi `CREDIT A 25.50` với lý do `COMPENSATION` về shard 1. Chú ý: **đó là một event mới, không phải xoá event cũ.** Lịch sử ghi lại đủ ba sự thật: đã trừ, đã hỏng, đã hoàn lại. Kiểm toán viên nhìn thấy toàn bộ câu chuyện — đúng thứ mà §7.7 nói Saga thuần không có được, và event sourcing bù vào.

Trạng thái trung gian: giữa bước (2) và (4), tiền đã rời A mà chưa tới B. Theo nguyên tắc §7.4 (**trừ trước, cộng sau**), trạng thái này an toàn. Để người dùng không thấy số dư "bốc hơi bí ẩn", mô hình hoá tường minh bằng `held_balance`: event `BalanceDebited` chuyển tiền từ `available` sang `held` ở A; event `TransferCompleted` mới xoá phần held. UI hiển thị "đang xử lý — 25,50$".

**Nếu chính hành động bù trừ cũng thất bại?** Đây là câu hỏi cuối cùng và không có câu trả lời hoàn hảo, chỉ có phòng thủ nhiều lớp:
- **Retry vô hạn với backoff** — vì thao tác idempotent nên retry an toàn. Phần lớn lỗi là tạm thời và tự khỏi.
- **Dead-letter queue + cảnh báo người trực.** Nếu sau N phút vẫn chưa xong, đó là sự cố cần người.
- **Ví treo (suspense account).** Nếu ví đích thật sự không nhận được (đã đóng), chuyển tiền vào một ví treo của hệ thống, ghi nhận rõ, và để quy trình nghiệp vụ xử lý. Tiền **không bao giờ biến mất** — nó chỉ chuyển sang một ví mà kế toán phải giải quyết. Đây chính là cách ngân hàng làm ngoài đời thật, và nói ra nó trong phỏng vấn cho thấy bạn hiểu rằng ở hệ thống tiền tệ, **mọi thất bại phải có một chỗ đậu có tên**, chứ không được rơi vào hư không.

### 11.3 Đường phản hồi: từ polling sang push

Vì command được xử lý bất đồng bộ (§3c) và read model là eventually consistent (§8.4), client không biết khi nào xong. Polling `GET /transfers/{id}` mỗi giây × 1 triệu giao dịch/giây = **hàng triệu request rỗng mỗi giây** đập vào tầng đọc.

Ba bước cải tiến:
1. **Reverse proxy gom polling**: client nói chuyện với proxy, proxy gom trạng thái của **nhiều giao dịch trong một truy vấn** tới read model. Giảm tải rõ rệt, nhưng vẫn chưa thời gian thực.
2. **Read state machine chủ động đẩy kết quả về proxy** ngay khi áp dụng xong event. Proxy giữ kết nối (WebSocket/SSE/long-poll) với client và bắn xuống. Độ trễ cảm nhận rơi từ "tới 1 giây" xuống "vài chục ms".
3. **Đối chiếu dự phòng**: vẫn giữ một đường polling thưa (mỗi 5 giây) làm lưới an toàn cho trường hợp push bị mất. Push là tối ưu, không phải bảo đảm.

### 11.4 Phần thưởng: ai cũng dùng được luồng event

Vì event store là append-only và có thứ tự, mọi hệ thống hạ nguồn chỉ cần **giữ offset của riêng nó**:

| Bên tiêu thụ | Dùng event để làm gì |
|---|---|
| Read model số dư | Projection chính, phục vụ `GET /balance` |
| Thông báo | Bắn push khi có `BalanceCredited` |
| Chống gian lận / AML | Flink tính đặc trưng theo cửa sổ trượt: số giao dịch 5 phút, tổng tiền ra 24 giờ |
| Kho dữ liệu / BI | Đổ sang S3/Parquet, truy vấn bằng Athena |
| Đối soát | Job hằng đêm tính lại tổng và kiểm tra bất biến (§16) |
| Môi trường test | Replay event production (đã ẩn danh) để dựng môi trường giống thật (§19) |

Thêm một bên tiêu thụ mới **không cần đụng gì tới đường ghi** — và nó được replay lại toàn bộ lịch sử từ ngày đầu. Đây là lợi ích mà kiến trúc CRUD không có cách nào mô phỏng.

---

## 12. Idempotency và exactly-once

### 12.1 Vì sao bắt buộc

Client gửi `transfer(A, B, 25.50)`, mạng đứt trước khi nhận phản hồi. Client **không biết** lệnh đã chạy hay chưa. Nó chỉ có hai lựa chọn: retry (rủi ro trừ tiền hai lần) hoặc không retry (rủi ro giao dịch không bao giờ xảy ra). Cả hai đều sai.

Đây không phải trường hợp hiếm: ở 1 triệu TPS, chỉ cần tỉ lệ timeout 0,01% cũng là **100 lần mỗi giây** rơi vào tình huống này.

### 12.2 Cách làm đúng

**Client sinh `transaction_id` (UUID) trước khi gửi lần đầu, và giữ nguyên qua mọi lần retry.** Ở phía shard, khi state machine xử lý command:

```
1. Tra tx_id trong bảng dedup (nằm TRONG CÙNG shard với ví nguồn)
2. Đã thấy?  -> KHÔNG sinh event mới. Trả lại kết quả đã lưu. Xong.
3. Chưa thấy -> kiểm tra nghiệp vụ, sinh event, VÀ ghi tx_id vào bảng dedup
                trong CÙNG một lần commit nguyên tử.
```

Điểm mấu chốt nằm ở chữ **"cùng một lần commit nguyên tử"**. Nếu ghi dedup và ghi event là hai thao tác riêng, sẽ có khe hở: crash ở giữa ⇒ event đã ghi mà dedup chưa ⇒ retry sẽ trừ tiền lần hai. May mắn là với event sourcing, điều này **tự nhiên đúng**: `tx_id` nằm **bên trong chính event**, nên bảng dedup chỉ là một projection của luồng event và không thể lệch.

Trong thực tế còn nhanh hơn: giữ một **bộ lọc Bloom + LRU cache** các `tx_id` gần đây trong RAM để đường nóng không phải tra đĩa; Bloom nói "chắc chắn chưa thấy" thì bỏ qua luôn, nói "có thể đã thấy" thì mới tra RocksDB.

### 12.3 Giữ `tx_id` trong bao lâu

Không thể giữ mãi trong RAM: 1 triệu/giây × 86.400 = **86 tỉ ID/ngày**.

| Phạm vi giữ | Kích thước | Đánh giá |
|---|---|---|
| 24 giờ trong RAM (hash/Bloom) | 86 tỉ × 16 B ≈ 1,4 TB (Bloom thì ~100 GB) | Đủ cho 99,999% retry — retry thật gần như luôn xảy ra trong vài giây |
| 30 ngày trên RocksDB cục bộ | ~40 TB/shard-set | Lưới an toàn cho retry chậm và điều tra sự cố |
| Vĩnh viễn trong event store | Miễn phí — `tx_id` đã nằm trong event | **Nguồn sự thật cuối cùng**: nếu cần, quét lịch sử của ví để kiểm tra |

Chính sách thực tế: **cửa sổ idempotency 24–72 giờ**, khai báo rõ trong hợp đồng API ("retry sau 72 giờ có thể được coi là giao dịch mới"). Sau cửa sổ đó, nếu vẫn cần kiểm tra, rơi xuống đường chậm là quét lịch sử ví.

### 12.4 "Exactly-once" thật ra là gì

Nói cho chính xác: **exactly-once delivery là bất khả thi** trong hệ phân tán có thể mất gói tin — đây là kết quả lý thuyết, không phải giới hạn kỹ thuật. Thứ ta thật sự đạt được là **at-least-once delivery + idempotent processing = exactly-once effect** (hiệu ứng đúng-một-lần).

Sự khác biệt không phải học thuật: nó nói cho bạn biết phải đặt nỗ lực ở đâu. Đừng cố làm cho mạng không mất gói. Hãy làm cho **việc xử lý lặp trở nên vô hại**. Mọi thao tác trong hệ thống này — command, event, confirm, cancel, bù trừ — đều phải idempotent, và mỗi thao tác phải có một **khoá tự nhiên** để nhận diện lặp: `tx_id` cho giao dịch, `(wallet_id, seq)` cho event, `(tx_id, phase)` cho bước saga.

---

## 13. Thứ tự trong một ví

### 13.1 Vì sao thứ tự quan trọng

Ví có số dư 100$. Hai lệnh tới gần như đồng thời: rút 80$ và rút 50$.

- Thứ tự (rút 80, rút 50): lệnh một thành công (còn 20), lệnh hai **bị từ chối**. Đúng.
- Thứ tự (rút 50, rút 80): lệnh một thành công (còn 50), lệnh hai **bị từ chối**. Cũng đúng, nhưng lệnh bị từ chối là lệnh *khác*.
- **Song song, không có thứ tự**: cả hai cùng đọc `balance = 100`, cả hai cùng thấy đủ tiền, cả hai cùng ghi. Số dư thành **−30**. **Sai — và hệ thống vừa cho vay 30$ mà không ai phê duyệt.**

Trường hợp thứ ba là **lost update**, và nó là lỗ hổng bị khai thác nhiều nhất trong các ứng dụng ví/tài chính thực tế: kẻ tấn công bắn 50 lệnh rút song song và rút được nhiều hơn số dư. Ở kiến trúc CRUD, chống nó phải bằng khoá bi quan (`SELECT ... FOR UPDATE`) hoặc lạc quan (`WHERE version = ?`).

### 13.2 Event sourcing giải nó bằng thiết kế

Trong kiến trúc của ta, **mọi lệnh của cùng một ví đi vào cùng một shard, vào cùng một hàng đợi FIFO, và được xử lý bởi một luồng đơn**. Không có hai lệnh nào của cùng một ví được xử lý đồng thời — bao giờ.

```
Command Q của shard 1:  [rút 80 từ A] [rút 50 từ A] [nạp 10 vào A] ...
                              |
                              v  một luồng, tuần tự
                        State Machine
```

Hệ quả:
- **Không cần khoá.** Không có tranh chấp, không có deadlock, không có `FOR UPDATE`.
- **Kiểm tra số dư luôn thấy trạng thái mới nhất**, vì không có ghi nào đang bay.
- **Không có lost update về mặt cấu trúc** — không phải "được phòng chống", mà là *không thể xảy ra*.
- Mỗi event mang một **số thứ tự tăng dần trong phạm vi ví** (`seq`), cho phép bên tiêu thụ phát hiện thiếu/lặp và cho phép khoá lạc quan ở tầng trên.

> 💡 Đây là câu chốt đáng nhớ của toàn bộ kiến trúc: **sharding theo `wallet_id` + xử lý một luồng cho mỗi shard = tuần tự hoá mà không cần khoá.** Ta không giải quyết bài toán tương tranh — ta **loại bỏ tương tranh**. Hiệu năng đi kèm miễn phí, vì thứ đắt nhất trong hệ thống giao dịch không phải là tính toán, mà là sự phối hợp.

Đánh đổi: một ví **không thể** được xử lý song song, nên một ví bị giới hạn bởi tốc độ của một luồng. Với ví thường (vài giao dịch/ngày) thì vô nghĩa; với ví merchant nóng thì đó chính là nút thắt đã bàn ở §9.5 và cách chữa là chia ví con.

Thứ tự **giữa các ví khác nhau** thì không cần đảm bảo, và đó là lý do kiến trúc này scale được: ta chỉ mua sự tuần tự ở đúng nơi nó có ý nghĩa nghiệp vụ, chứ không mua một thứ tự toàn cục đắt đỏ và vô dụng.

---

## 14. Số dư âm và race condition

Kiểm tra "đủ tiền không" là điểm dễ sai nhất trong mọi hệ thống ví.

**Cách sai — tách kiểm tra khỏi ghi:**
```
balance = read(A)             # 100
if balance >= 80: write(A, balance - 80)    # KHE HỞ giữa read và write
```
Giữa hai dòng đó, một lệnh khác có thể chen vào. Đây chính là §13.1.

**Cách đúng ở kiến trúc của ta** — nhờ §13.2, kiểm tra và sinh event xảy ra trong cùng một lượt xử lý tuần tự, không có khe hở nào. Command handler chỉ việc:

```
state = state_store[wallet]           # state mới nhất, không ai đang sửa
if state.available < amount:
    emit TransferRejected{reason: INSUFFICIENT_FUNDS}   # vẫn là một event
else:
    emit BalanceDebited{...}
```

**Nếu kiến trúc khác** thì phải dùng một trong các cách sau — đáng biết để so sánh:

| Cách | Cơ chế | Ghi chú |
|---|---|---|
| Khoá bi quan | `SELECT ... FOR UPDATE` | Đúng nhưng giữ khoá lâu, dễ deadlock, giới hạn throughput ví nóng |
| Ghi có điều kiện | `UPDATE ... WHERE balance >= 80` rồi kiểm tra số hàng bị ảnh hưởng | **Nguyên tử, không giữ khoá lâu.** Trên DynamoDB là `ConditionExpression` |
| Khoá lạc quan | `WHERE version = 42`, retry khi hỏng | Tốt khi ít tranh chấp; **thoái hoá thảm hại** ở ví nóng (retry storm) |
| CRDT / counter cộng dồn | Cho phép cộng song song | ❌ **Không dùng được cho số dư** vì CRDT không biểu diễn được ràng buộc "không âm" — đó là một bất biến toàn cục, còn CRDT chỉ đảm bảo hội tụ cục bộ |

Dòng cuối đáng nói vì có người sẽ đề xuất CRDT cho "cộng số dư song song". Nó hợp lý cho ví chỉ-nhận, nhưng **cấm dùng** cho ví có rút tiền: hai replica cùng cho phép rút, hội tụ lại thành số âm, và CRDT không có cách nào ngăn.

**Số dư âm có hợp lệ không?** Đôi khi có — thấu chi (overdraft), hoàn tiền sau khi đã rút, phí phạt. Nếu nghiệp vụ cho phép, hãy mô hình hoá tường minh bằng `credit_limit` thay vì để nó xảy ra do bug. Quy tắc bất biến là `available >= -credit_limit`, mặc định `credit_limit = 0`.

---

## 15. Tiền tệ và làm tròn

### 15.1 Vì sao không bao giờ dùng số thực dấu phẩy động

```
0.1 + 0.2 = 0.30000000000000004      (IEEE 754 double)
```

Không phải bug — đó là bản chất: nhị phân không biểu diễn chính xác được `0.1` cũng như thập phân không biểu diễn chính xác được `1/3`. Với một phép tính thì sai số vô hình. Với **86 tỉ phép tính mỗi ngày**, sai số tích luỹ thành những khoản lệch thật, và mỗi khoản lệch là một vé điều tra cho phòng tài chính.

Tệ hơn: `double` chỉ có 53 bit mantissa ⇒ chính xác tuyệt đối tới ~9.007.199.254.740.992. Với số dư tính bằng **xu** của một sàn lớn, con số đó không xa như người ta tưởng, và khi vượt qua thì phép cộng bắt đầu **âm thầm mất chữ số cuối**.

### 15.2 Cách đúng: số nguyên theo đơn vị nhỏ nhất

**Lưu tiền dưới dạng số nguyên của đơn vị nhỏ nhất** (minor unit):

| Tiền tệ | Số chữ số thập phân | 25,50 được lưu là |
|---|---|---|
| USD, EUR | 2 | `2550` (xu) |
| VND, JPY | 0 | `25` |
| BHD, KWD, TND | **3** | `25500` (fils) |
| Tiền mã hoá (ETH) | tới 18 | cần số nguyên 128/256 bit |

Dùng `int64` cho hầu hết trường hợp: `2^63 ≈ 9,2 × 10^18` xu ≈ 92 triệu tỉ đô — thoải mái. Nếu phải xử lý tiền mã hoá hoặc tiền tệ siêu lạm phát, dùng số nguyên 128 bit hoặc decimal chính xác tuỳ ý.

**Nguyên tắc bắt buộc:**
- **Số tiền luôn đi kèm mã tiền tệ.** Một `Money` là cặp `(amount_minor: int64, currency: string)`, không bao giờ là một con số trần trụi. Cộng hai `Money` khác currency phải là **lỗi biên dịch hoặc lỗi runtime**, không bao giờ im lặng.
- **API nhận và trả chuỗi** (`"25.50"`), tự parse sang số nguyên ở biên hệ thống. Không bao giờ để JSON number chạm vào tiền.
- **Không bao giờ chia** trên đường nóng. Chia là nơi duy nhất sinh ra nhu cầu làm tròn.

### 15.3 Khi buộc phải làm tròn

Chia tiền là không tránh được (chia hoá đơn, tính phí 2,9%, chia lãi). Ba quy tắc:

1. **Chọn và ghi rõ một chế độ làm tròn.** `HALF_UP` (thương mại), `HALF_EVEN`/banker's rounding (kế toán, giảm lệch hệ thống khi cộng nhiều khoản), hoặc luôn làm tròn **có lợi cho khách hàng**. Ghi vào tài liệu; đừng để nó là mặc định ngẫu nhiên của thư viện.
2. **Phân bổ phần dư một cách tường minh.** Chia 10,00$ cho 3 người: `3.33 + 3.33 + 3.33 = 9.99`, dư 1 xu. Phải có quy tắc rõ (người đầu tiên nhận thêm, hoặc chia vòng). Đừng để 1 xu bốc hơi — **tổng phải luôn khớp**.
3. **Làm tròn một lần, ở cuối.** Tính bằng độ chính xác cao trong suốt chuỗi phép tính, chỉ làm tròn khi ghi ra event. Làm tròn ở mỗi bước trung gian là cách chắc chắn nhất để tích luỹ sai số.

> ⚠️ Khoản lệch 1 xu do làm tròn là nguyên nhân **số một** của các vụ đối soát không khớp trong hệ thống thanh toán thật. Nó không gây thiệt hại tiền bạc đáng kể, nhưng nó đốt hàng trăm giờ điều tra và làm xói mòn niềm tin vào toàn bộ số liệu. Thiết kế nó ngay từ đầu rẻ hơn rất nhiều so với truy tìm nó sau.

---

## 16. Đối soát, bất biến kiểm toán và double-entry

### 16.1 Bất biến vàng

Vì ta chỉ chuyển tiền **nội bộ** (§1.3), có một bất biến cực mạnh:

```
Σ balance(mọi ví)  =  hằng số
```

Tiền không được tạo ra hay biến mất — chỉ đổi chỗ. Đây là **cơ chế phát hiện lỗi mạnh nhất trong toàn hệ thống**, và nó gần như miễn phí:

- **Kiểm tra liên tục**: với mỗi giao dịch, `Σ delta = 0` (một `−X` và một `+X`). Kiểm ngay trong state machine, chi phí gần bằng không.
- **Kiểm tra định kỳ**: job chạy mỗi giờ cộng tất cả số dư và so với hằng số đã biết.
- **Kiểm tra bằng replay**: cộng toàn bộ `delta` của mọi event từ đầu, phải ra đúng tổng hiện tại.

Nếu tổng lệch, ta biết **chắc chắn** có lỗi và biết **chính xác trong khoảng thời gian nào** (giữa hai lần kiểm) — rồi nhị phân tìm kiếm trong luồng event để ra chính xác event gây lỗi. Đây đúng là thứ mà §1.1 đòi hỏi: không chỉ *phát hiện* lệch, mà truy ra *nguyên nhân*.

Khi có nạp/rút ra ngoài, bất biến mở rộng thành: `Σ balance = Σ nạp − Σ rút`, và vế phải phải đối soát được với sao kê ngân hàng — đó là phần việc của `sd-28`.

### 16.2 Double-entry — nhắc ngắn

Kế toán bút toán kép (double-entry bookkeeping) nói rằng mọi giao dịch phải ghi **hai bút toán bằng nhau và ngược dấu**: một bên nợ (debit), một bên có (credit), và `Σ debit = Σ credit` luôn đúng.

Kiến trúc event sourcing của ta **tự nhiên là double-entry**: mỗi command sinh đúng hai event đối xứng `BalanceDebited(A, X)` và `BalanceCredited(B, X)`. Bất biến §16.1 chính là `Σ debit = Σ credit` viết theo cách khác. Chi tiết về sổ cái, tài khoản trung gian, tài khoản treo và cách đối soát với nhà cung cấp thanh toán nằm ở **`sd-28-payment-system`** — không lặp lại ở đây.

Một lời khuyên thực chiến: **đặt tên các loại event theo đúng từ vựng kế toán** (`debit`, `credit`, `settlement`, `reversal`, `adjustment`). Nghe như chuyện hình thức, nhưng nó có tác dụng rất thật: hệ thống tiền tệ nào cũng sẽ bị kiểm toán bởi người **không phải kỹ sư**, và dùng ngôn ngữ của họ giúp mô hình dữ liệu của bạn được hiểu và tin tưởng.

### 16.3 Ba tầng đối soát

| Tầng | Tần suất | Kiểm cái gì | Phát hiện được gì |
|---|---|---|---|
| Nội bộ giao dịch | Mỗi giao dịch | `Σ delta = 0`, `available >= 0` | Bug logic, tràn số |
| Nội bộ hệ thống | Mỗi giờ | `Σ balance` = hằng số; state == replay(event) | Lệch giữa projection và event store, bug áp dụng event |
| Với thế giới bên ngoài | Hằng ngày | Tổng nạp/rút vs sao kê ngân hàng | Giao dịch thiếu, giao dịch trùng, chênh lệch tỉ giá/phí |

Tầng giữa đáng nhấn mạnh vì nó **chỉ tồn tại được nhờ event sourcing**: lấy state hiện tại, dựng lại một state độc lập bằng cách replay toàn bộ event, so hai cái. Nếu khác nhau, projection đã sai (và cách chữa là **xoá và dựng lại**, không phải vá thủ công). Không có kiến trúc nào khác cho ta một bài kiểm tra tự thân mạnh như vậy.

### 16.4 Bất biến của chính event store

Event store phải tự bảo vệ:
- **Append-only về mặt kỹ thuật**, không chỉ về mặt quy ước: không cấp quyền `UPDATE`/`DELETE` cho bất kỳ ai, kể cả admin. Trên S3 là **Object Lock** ở chế độ compliance.
- **Chuỗi băm (hash chain)**: mỗi event mang `hash(event_trước)`. Sửa một event ở giữa làm hỏng toàn bộ chuỗi phía sau ⇒ giả mạo trở nên phát hiện được. Đây là ý tưởng nền của blockchain áp dụng vào một hệ tập trung, và nó rẻ.
- **Ghi neo định kỳ** (mỗi giờ): ký số hash gốc của đoạn log và lưu ở nơi khác (dịch vụ khác, tài khoản khác). Kiểm toán viên bên ngoài xác minh được mà không cần tin vào đội vận hành.

---

## 17. Nút thắt và chế độ hỏng

### 17.1 Cái gì nghẽn trước

Theo thứ tự thực tế hay gặp:

1. **Ví nóng.** Luôn là thứ đầu tiên. Một ví merchant vượt quá năng lực một luồng. Chữa bằng chia ví con / gộp lô (§9.5). **Đây là câu trả lời đúng cho câu hỏi "cái gì nghẽn trước?"** — không phải mạng, không phải đĩa.
2. **Độ trễ fsync.** Nếu dùng EBS thay vì NVMe cục bộ, mỗi fsync là một vòng mạng. Gộp lô lớn hơn hoặc đổi loại instance.
3. **Vòng mạng của Raft.** Xuyên AZ ~1 ms. Chấp nhận được; xuyên region thì không.
4. **Tỉ lệ giao dịch xuyên shard.** Với `N` shard và ví ngẫu nhiên, tỉ lệ cùng shard chỉ là `1/N` — nghĩa là **gần như mọi giao dịch đều xuyên shard**. Mỗi cái tốn một vòng saga. Ít shard hơn ⇒ ít xuyên shard hơn ⇒ lại một lý do nữa để tối ưu TPS/node trước khi thêm node.
5. **Compaction của RocksDB** gây tăng đột biến p99. Giới hạn băng thông compaction, giám sát write stall.
6. **Băng thông ghi event**: 200 MB/s × 3 bản sao = 600 MB/s mạng chỉ riêng cho nhân bản. Đáng kể nhưng không phải nút thắt đầu tiên.

### 17.2 Component chết thì sao

| Hỏng | Hậu quả tức thì | Hồi phục |
|---|---|---|
| **Follower Raft chết** | Không ảnh hưởng (quorum 2/3 vẫn đủ) | Node mới nạp snapshot + bắt kịp log |
| **Leader Raft chết** | Shard đó **ngừng nhận ghi 150–300 ms** | Bầu leader mới tự động; client retry. Không mất event đã committed |
| **Mất 2/3 node của một shard** | Shard **mất khả năng ghi hoàn toàn** (đúng theo thiết kế — thà dừng còn hơn sai) | Khôi phục từ snapshot + event ở lưu trữ nguội. Đây là lý do phải sao lưu event ra S3 liên tục |
| **Saga coordinator chết** | Giao dịch đang bay bị treo ở trạng thái trung gian | Coordinator mới đọc bảng trạng thái pha, đẩy tiếp hoặc bù trừ (§7.3) |
| **Read model chậm/chết** | Người dùng thấy số dư cũ. **Ghi không bị ảnh hưởng** | Bắt kịp từ offset; hoặc xoá và dựng lại toàn bộ |
| **Mất một AZ** | 1/3 số node biến mất. Các shard có leader ở AZ đó bầu lại | Cấp dư đủ để 2 AZ còn lại gánh được toàn bộ tải |
| **Event store hỏng dữ liệu ngầm (bit rot)** | Nguy hiểm nhất vì âm thầm | Chuỗi băm + checksum phát hiện; khôi phục bản sao từ node/S3 |
| **Bug logic ghi sai event** | Sự kiện sai đã bất biến, không xoá được | Ghi **event bù trừ**, giữ nguyên event sai. Lịch sử phản ánh cả lỗi lẫn việc sửa lỗi — đúng chuẩn kế toán |

> 💡 Dòng cuối là triết lý vận hành quan trọng: **trong event sourcing, bạn không sửa quá khứ, bạn viết thêm vào tương lai.** Ghi đè một event sai là hành vi nguy hiểm nhất có thể làm với hệ thống này — nó phá huỷ chính thứ duy nhất bạn có thể tin tưởng.

### 17.3 Khi mạng phân vùng: chọn C, không chọn A

Đây là quyết định phải nói thẳng. Với 99,99% availability và yêu cầu đúng tuyệt đối, khi có phân vùng mạng ta chọn **nhất quán (CP)**: shard mất quorum **từ chối phục vụ**. Người dùng thấy lỗi và thử lại sau vài giây — khó chịu nhưng vô hại. Lựa chọn ngược lại (cho phép ghi ở cả hai phía rồi hoà giải sau) trong hệ thống tiền tệ nghĩa là **chi tiêu kép**, và không có thuật toán hoà giải nào lấy lại được số tiền đã bị rút hai lần rồi tiêu mất.

---

## 18. Tự xây hay dùng Kafka + Flink

Câu hỏi luôn được hỏi: *"Sao không cứ Kafka làm event store và Flink làm state machine?"*

| | **Kafka + Flink** | **Tự xây (log cục bộ + Raft)** |
|---|---|---|
| Thời gian ra mắt | Vài tuần | Nhiều tháng tới cả năm |
| TPS/node | ~5.000–20.000 (giới hạn bởi mạng, tuần tự hoá, checkpoint) | 50.000–200.000 |
| Độ trễ p99 | 10–100 ms (checkpoint, buffer) | 1–5 ms |
| Độ bền | Rất tốt (ISR + `acks=all` + `min.insync.replicas=2`) | Rất tốt (Raft) — nhưng **bạn tự chịu trách nhiệm chứng minh** |
| Thứ tự | Đảm bảo **trong một partition** — khoá partition = `wallet_id` là khớp hoàn hảo | Đảm bảo trong một shard |
| Exactly-once | Có (transaction của Kafka + checkpoint của Flink) — nhưng đắt về throughput | Tự làm bằng idempotency |
| Lưu trữ dài hạn | ⚠️ Kafka **không được thiết kế làm kho lưu trữ vĩnh viễn**. Tiered storage giúp được, nhưng replay từ ngày đầu vẫn chậm và tốn | Phân tầng chủ động sang S3 |
| Vận hành | Đội đã biết, công cụ sẵn có, tuyển người dễ | Đội phải thành chuyên gia Raft, mmap, LSM, và phải test bằng fault injection |
| Rủi ro | Thấp | **Cao** — bug trong tầng nhân bản là bug mất tiền |

**Khuyến nghị theo giai đoạn** — và đây là câu trả lời nên đưa ra trong phỏng vấn:

- **Dưới ~10.000 TPS**: PostgreSQL + bảng event (append-only) + outbox pattern. Đơn giản, đủ dùng, đã có đủ mọi lợi ích kiểm toán của event sourcing. Hàng chục ví thật ngoài đời đang chạy như thế.
- **10.000 – 200.000 TPS**: **Kafka (khoá partition = `wallet_id`) + Flink hoặc consumer tự viết**. Điểm ngọt nhất về tỉ lệ giá trị/công sức. Kafka cho ta log có thứ tự, bền, phân vùng — đúng ba thứ event sourcing cần — mà không phải tự viết Raft.
- **Trên 500.000 TPS**: lúc này chi phí phần cứng và độ trễ mới **thật sự** biện minh cho việc tự xây. Và ngay cả khi đó, hãy giữ Kafka/Kinesis làm **đường ống ra** cho các bên tiêu thụ hạ nguồn, chỉ tự xây phần lõi giao dịch.

> ⚠️ **Bẫy phỏng vấn ngược**: nhảy thẳng vào "tự xây log Raft trên mmap" ngay từ đầu là dấu hiệu của over-engineering, kể cả khi đề bài nói 1 triệu TPS. Câu trả lời ghi điểm cao nhất là **nêu đủ lộ trình**, chỉ ra **ngưỡng nào biện minh cho bước nào**, rồi mới đi sâu vào phương án cuối vì đề bài đã chốt con số. Cho thấy bạn biết *khi nào* không nên xây thứ phức tạp còn giá trị hơn việc biết *cách* xây nó.

---

## 19. Test: replay lịch sử production

Đây là kỹ thuật test mạnh nhất mà event sourcing mở khoá, và gần như không kiến trúc nào khác làm được.

### 19.1 Regression bằng lịch sử thật

```
1. Lấy luồng event production (đã ẩn danh) của N ngày.
2. Chạy phiên bản code CŨ  trên luồng đó -> state_cũ
3. Chạy phiên bản code MỚI trên luồng đó -> state_mới
4. So sánh từng ví một.
   - Giống hệt   -> thay đổi an toàn (hoặc chỉ là tái cấu trúc)
   - Khác        -> phải giải thích được TỪNG khác biệt
```

Sức mạnh nằm ở chỗ: đây không phải dữ liệu test do người viết ra. Đây là **mọi tình huống kỳ quặc đã thật sự xảy ra** trong lịch sử hệ thống — những cạnh mà không ai nghĩ ra nổi khi ngồi viết unit test. Nó trả lời trực tiếp câu hỏi kiểm toán thứ ba ở §8.5: *làm sao chứng minh logic vẫn đúng sau khi đổi code?*

Quy trình vận hành đi kèm: khi có khác biệt, không được phép "chắc là ổn". Mỗi khác biệt phải được phân loại thành **(a) đã sửa một bug cũ** — cần ghi lại và cân nhắc phát event điều chỉnh cho dữ liệu lịch sử, hay **(b) vừa tạo ra một bug mới** — chặn phát hành.

### 19.2 Những cách test khác được mở khoá

- **Shadow / dark launch**: chạy hệ thống mới song song trên cùng luồng command thật, so kết quả, **không** phục vụ người dùng. Chạy vài tuần trước khi chuyển đổi.
- **Time-travel debugging**: một khách hàng báo số dư sai. Replay **chỉ luồng event của ví đó** trong debugger, xem từng bước. Tái hiện lỗi 100%, không cần đoán.
- **Property-based testing**: sinh chuỗi event ngẫu nhiên, kiểm tra các bất biến luôn đúng (`Σ balance` không đổi, không ví nào âm quá hạn mức, mỗi `tx_id` xuất hiện đúng một lần).
- **Chaos + so sánh**: giết node ngẫu nhiên giữa lúc tải cao, sau đó replay toàn bộ event và so với state đang chạy. Phải khớp tuyệt đối. Nếu lệch, tầng nhân bản có bug — và đây là **cách duy nhất** phát hiện loại bug đó trước khi nó ăn tiền thật.
- **Benchmark bằng tải thật**: replay lưu lượng production giờ cao điểm ở tốc độ 10× để tìm trần thật của một node, thay vì benchmark tổng hợp phân bố đều không giống thực tế.

> 💡 Khi giới thiệu event sourcing cho một đội, đây là lập luận thuyết phục nhất — mạnh hơn cả chuyện audit. **Bạn có thể chứng minh phiên bản mới đúng, bằng chính lịch sử thật của mình, trước khi đưa nó ra production.** Hầu như không hệ thống nào làm được điều đó.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp (và bẫy) |
|---|---|---|
| **Event store — phương án được chọn ở quy mô vừa** | **MSK (Managed Kafka)**, khoá partition = `wallet_id` | Khoá partition khớp *chính xác* với yêu cầu §13: Kafka đảm bảo thứ tự **trong một partition**, mà ta cần đúng "thứ tự trong một ví". Đặt `acks=all` + `min.insync.replicas=2` + `unclean.leader.election.enable=false` — thiếu cờ cuối là **cho phép mất dữ liệu đã ack** khi failover. Bật **tiered storage** để giữ log dài. ⚠️ Số partition là trần song song và **rất khó tăng** về sau (tăng partition làm vỡ ánh xạ `hash(key) % n`, phá thứ tự lịch sử) — hãy cấp dư ngay từ đầu |
| Event store — phương án serverless | **Kinesis Data Streams** | Mỗi shard 1 MB/s hoặc 1.000 bản ghi/s ⇒ 2 triệu event/s cần **~2.000 shard**; dùng on-demand để khỏi tự chia. ⚠️ **Retention tối đa 365 ngày** — nên Kinesis **không thể là nguồn sự thật vĩnh viễn**, chỉ là đường vận chuyển. Bắt buộc phải đổ song song sang S3 |
| **Kho lưu trữ sự thật vĩnh viễn** | **S3** + **Object Lock (compliance mode)** + Glacier Deep Archive cho dữ liệu nguội | Đây mới là "event store" thật về mặt pháp lý. Object Lock làm cho việc xoá/sửa **bất khả thi về mặt kỹ thuật** kể cả với tài khoản root — đúng thứ kiểm toán viên đòi. Versioning + MFA delete + replication sang tài khoản khác (chống cả trường hợp tài khoản chính bị chiếm) |
| Replay & truy vấn lịch sử | **Athena** trên event Parquet ở S3, phân vùng theo `ngày/shard` | "Số dư ví X lúc 14:32 ngày 3/6" thành một câu SQL quét đúng vài phân vùng. Rẻ hơn giữ mọi thứ nóng nhiều bậc. Dùng **Glue Catalog** để quản schema và **schema evolution** của event (§8.6) |
| **Trạng thái + giao dịch, phương án không tự xây** | **DynamoDB** — `TransactWriteItems` + `ConditionExpression` | ⭐ Ứng viên mạnh nhất cho phần lớn hệ thống ví thật. `ConditionExpression: balance >= :amt` cho ta **kiểm tra-và-trừ nguyên tử không cần khoá** (đúng nguyên tắc §14); `TransactWriteItems` cho **ACID xuyên nhiều item, nhiều bảng, cùng region** — tức là ta có transfer hai chân nguyên tử mà **không cần 2PC, không cần saga**, miễn là cả hai ví cùng region. ⚠️ Giới hạn: **100 item/transaction**, tiêu thụ **2× WCU**, và không có giao dịch xuyên region |
| Event log miễn phí kèm theo | **DynamoDB Streams** | Mọi thay đổi item thành một bản ghi stream có thứ tự **theo partition key** — tức là event log gần như cho không, đúng thứ tự trong mỗi ví. Nối vào Lambda/Kinesis để nuôi projection, chống gian lận, kho dữ liệu. ⚠️ Retention chỉ **24 giờ** — phải đổ ngay sang S3, đừng coi nó là kho lưu trữ |
| RDBMS cho giai đoạn đầu (< 10k TPS) | **Aurora PostgreSQL/MySQL** | Đúng câu trả lời cho §5 khi chưa tới quy mô này. Aurora tách compute/storage, replica đọc nhanh, failover ~30 s. **Aurora Limitless** khi cần sharding tự động. ⚠️ Vẫn là ~1.000–10.000 TPS ghi có giao dịch; đừng kỳ vọng nó phá trần |
| Trạng thái nóng trong RAM, **có** độ bền | **MemoryDB for Redis/Valkey** | Tốc độ Redis nhưng có **nhật ký giao dịch phân tán đa AZ** — tức là ghi được xác nhận là ghi bền thật, khác hẳn ElastiCache. Đây chính là câu trả lời cho §4.3: nó vá đúng lỗ hổng durability của phương án 1 bằng một cơ chế đồng thuận, "Raft-like". Vẫn **không** cho ta giao dịch xuyên shard hay lịch sử |
| Cache đọc thuần (số dư hiển thị) | **ElastiCache** / **DAX** | Chỉ cho projection đọc. ⚠️ **Tuyệt đối không** dùng làm nguồn sự thật cho số dư — nhân bản bất đồng bộ, mất ghi khi failover |
| **Saga / TC-C coordinator** | **Step Functions** (Standard, không Express) | Sinh ra đúng cho bài này: máy trạng thái bền, mỗi bước có retry/backoff/catch khai báo được, **đường bù trừ là một nhánh tường minh** chứ không phải code rải rác. Bản thân nó đã là "bảng trạng thái pha" của §7.3 — có sẵn lịch sử thực thi để audit. ⚠️ Standard tính tiền **theo mỗi bước chuyển trạng thái** ⇒ ở 1 triệu TPS chi phí là không tưởng. Dùng cho luồng giá trị cao/tần suất thấp (rút tiền lớn, hoàn tiền, xử lý tranh chấp); luồng nóng thì tự viết coordinator |
| Hàng đợi command | **SQS FIFO** (theo `MessageGroupId = wallet_id`) | Thứ tự + khử trùng lặp 5 phút sẵn có, đúng ngữ nghĩa §13. ⚠️ **Trần 3.000 msg/s mỗi FIFO queue khi bật batching** — cần hàng trăm queue cho quy mô này, hoặc chuyển sang MSK |
| Xử lý luồng, projection, chống gian lận | **Managed Service for Apache Flink**, hoặc **Lambda** đọc từ stream | Flink cho stateful windowing + exactly-once checkpoint. Lambda đơn giản hơn nhưng ⚠️ chú ý **concurrency và thứ tự**: Lambda đọc Kinesis/DynamoDB Streams giữ thứ tự **trong một shard**, nên một ví vẫn tuần tự — nhưng `BisectBatchOnFunctionError` và `MaximumRetryAttempts` phải cấu hình đúng để không bỏ qua bản ghi lỗi |
| Snapshot | **S3** (có versioning) + checksum trong metadata | Snapshot là dữ liệu vứt đi được ⇒ S3 Standard-IA là đủ. Giữ nhiều mốc theo ngày để trả lời `?at=` nhanh (§9.4) |
| Bản đồ shard, phát hiện dịch vụ | **etcd/Consul tự chạy trên EKS**, hoặc **DynamoDB + Streams** làm bản đồ nhẹ | Cần ngữ nghĩa watch + epoch để tránh hai node cùng nhận là chủ một ví trong lúc rebalance (§11.1). ⚠️ Cloud Map không có watch đủ mạnh cho việc này |
| Tự chạy lõi Raft | **EC2 với NVMe cục bộ** (i4i/im4gn/i3en), rải **3 AZ** | Đây là phần **không** dùng dịch vụ quản lý được: cần đĩa cục bộ độ trễ thấp cho mmap + fsync. ⚠️ Instance store là **ephemeral** — mất khi stop instance; đó là lý do Raft 3 AZ và sao lưu liên tục sang S3 là bắt buộc, không phải tuỳ chọn. EBS io2 Block Express là phương án thay thế an toàn hơn nhưng fsync đắt hơn |
| Bảo vệ khoá và dữ liệu | **KMS** (khoá riêng cho event store), **Nitro Enclaves** nếu cần cách ly cứng | Mã hoá at-rest cho event; chính sách khoá tách quyền để đội vận hành **không** giải mã được nội dung giao dịch |
| Dấu vết mọi hành động của con người | **CloudTrail** (bật data event cho bucket event store) + **CloudTrail Lake** | Kiểm toán không chỉ hỏi "dữ liệu nói gì" mà cả "ai đã chạm vào". Ghi log sang **tài khoản riêng** mà đội vận hành chính không có quyền xoá |
| Chứng minh tính bất biến với bên thứ ba | **S3 Object Lock** + hash chain tự ghi (§16.4) | ⚠️ QLDB — dịch vụ sổ cái bất biến có mã hoá xác minh — **đã ngừng nhận khách hàng mới (2025)**; đừng đề xuất nó cho hệ thống mới. Thay bằng hash chain tự làm trên S3 Object Lock, hoặc Aurora PostgreSQL với bảng append-only + trigger chặn UPDATE/DELETE |
| Quan sát | **CloudWatch** metric tuỳ biến: độ trễ commit p99, **độ trễ replay (lag)** của từng projection, số giao dịch treo, `Σ balance` mỗi giờ | Cảnh báo quan trọng nhất **không** phải CPU — mà là **`Σ balance` lệch khỏi hằng số** (§16.1) và **số saga treo quá 60 giây**. Hai chỉ số này là hệ thống miễn dịch của cả kiến trúc |
| Cách ly vùng lỗi | Bắt buộc **3 AZ**; đa region chỉ cho **DR bất đồng bộ**, không phải active-active | ⚠️ Active-active đa region cho ví điện tử nghĩa là ghi đồng thuận xuyên region (30–100 ms/ghi) hoặc chấp nhận chi tiêu kép. Câu trả lời đúng gần như luôn là: **một region là chủ, region kia là dự phòng ấm**, RPO gần 0 nhờ nhân bản event sang S3 tài khoản/region khác |

**Ba câu chốt đáng nhớ khi nói về AWS ở bài này:**

1. *"Trước khi tự xây Raft, tôi sẽ thử **DynamoDB `TransactWriteItems` + `ConditionExpression`** — nó cho tôi kiểm-tra-và-trừ nguyên tử và transfer hai chân ACID mà không cần 2PC cũng không cần saga, với điều kiện cùng region. Cộng thêm **DynamoDB Streams**, tôi có luôn event log gần như miễn phí, đúng thứ tự trong mỗi ví."*
2. *"**Kinesis retention tối đa 365 ngày, DynamoDB Streams 24 giờ, Kafka thì tuỳ cấu hình.** Không cái nào là kho lưu trữ vĩnh viễn. Nguồn sự thật của tôi là **S3 có Object Lock**; mọi thứ còn lại chỉ là đường vận chuyển."*
3. *"Chỉ số cảnh báo số một của tôi không phải CPU hay latency, mà là **tổng số dư toàn hệ thống lệch khỏi hằng số**. Đó là bất biến duy nhất mà mọi loại bug đều phải đi xuyên qua."*

---

## Cách trình bày khi phỏng vấn / review

1. **Mở bằng cách chỉ ra vì sao bài này khác mọi bài khác.** *"Ở News Feed hay URL Shortener, tôi được phép nói 'eventual consistency là chấp nhận được'. Ở đây **không có ngưỡng chấp nhận được**. Và ba ràng buộc — đúng tuyệt đối, 1 triệu TPS, tái tạo được lịch sử — kéo nhau về ba hướng ngược nhau. Cả thiết kế của tôi là hành trình thoả hiệp giữa ba thứ đó."* Một câu này định khung cho toàn bộ 45 phút còn lại.

2. **Ra số trước khi vẽ, và nhân đôi nó.** *"1 triệu TPS, nhưng mỗi giao dịch có hai chân, nên là 2 triệu thao tác ghi. Một RDBMS chạy 1.000 TPS ⇒ 2.000 node. Vậy mục tiêu thiết kế của tôi **không phải thêm node — mà là tăng TPS của một node**, vì mỗi node thêm vào còn làm tăng tỉ lệ giao dịch xuyên shard."* Vế sau là chỗ ghi điểm: nó cho thấy bạn hiểu chi phí phi tuyến của việc mở rộng.

3. **Đi tuần tự qua năm phương án, và để mỗi cái chết vì một lý do cụ thể.** In-memory chết vì **mất dữ liệu**; RDBMS chết vì **trần 1.000 TPS và vì state với history là hai nguồn sự thật có thể lệch nhau**; 2PC chết vì **blocking và khoá**; saga/TC-C sống sót nhưng **không tái tạo được lịch sử**. Cách kể này chứng minh bạn hiểu chứ không nhớ, và nó khiến event sourcing hiện ra như một *kết luận tất yếu* thay vì một từ khoá thời thượng.

4. **Khi nói 2PC, tự nêu chế độ hỏng trước khi bị hỏi.** *"Coordinator chết sau khi participant đã trả lời YES: participant đang giữ khoá, đã hứa nên không được tự quyết, và không ai nói cho nó biết kết quả — nó **khoá vô hạn**. Cách chữa duy nhất là một DBA vào `COMMIT PREPARED` bằng tay. Ở 1 triệu TPS thì đó không phải là một phương án."* Rồi đóng bằng nhận định sắc: ***"2PC không phải giao thức chịu lỗi. Nó là giao thức nguyên tử, và nó mua tính nguyên tử bằng tính khả dụng."***

5. **Nêu nguyên tắc "trừ trước, cộng sau" như một luật, không phải một chi tiết.** *"Trong mọi hệ thống bù trừ, đặt trạng thái trung gian ở phía hệ thống bị **thiếu** tiền, không bao giờ ở phía bị **thừa**. Thiếu thì sửa được. Thừa thì có thể đã bị tiêu mất — và bạn vừa xây một máy in tiền khai thác được."* Đây là một trong hai, ba câu đáng nhớ nhất của cả bài.

6. **Định nghĩa command và event bằng sự khác biệt, không bằng định nghĩa.** *"Command ở thì mệnh lệnh, **có thể thất bại**, và **không tất định**. Event ở thì quá khứ, **không bao giờ thất bại**, và **đã được tất định hoá**. Ranh giới giữa chúng chính là ranh giới giữa thế giới hỗn loạn và thế giới tái tạo được — mọi thứ ngẫu nhiên phải bị đóng băng thành giá trị cụ thể khi vượt qua ranh giới đó."* Thêm chi tiết ăn điểm: **lệnh bị từ chối cũng sinh event**.

7. **Bán event sourcing bằng ba câu hỏi kiểm toán, không bằng lý thuyết.** Số dư lúc 14:32 hôm kia? Làm sao biết nó đúng? Đổi code rồi làm sao biết vẫn đúng? *"Kiến trúc CRUD trả lời cả ba bằng 'tôi không biết'. Event sourcing trả lời cả ba bằng cùng một cơ chế: **replay**. Và audit không phải là tính năng tôi phải xây — **event store chính là audit log, và nó cũng chính là dữ liệu**, nên chúng không thể lệch nhau."*

8. **Giải thích vì sao shard theo `wallet_id` là quyết định then chốt, không phải một lựa chọn kỹ thuật.** *"Cùng ví ⇒ cùng shard ⇒ cùng hàng đợi FIFO ⇒ một luồng xử lý. Kết quả: **không khoá, không deadlock, không lost update — không phải vì tôi phòng chống, mà vì nó không thể xảy ra**. Tôi không giải quyết bài toán tương tranh, tôi loại bỏ tương tranh."* Rồi tự nêu cái giá ngay: một ví bị giới hạn bởi một luồng ⇒ ví merchant nóng là nút thắt ⇒ chia ví con hoặc gộp lô.

9. **Khi được hỏi "cái gì nghẽn trước?", đừng trả lời mạng hay đĩa.** *"**Ví nóng.** Ví thu tiền của một merchant lớn có thể nhận 50.000 TPS, mà theo thiết kế nó bị tuần tự hoá về một luồng. Tôi chia nó thành 16 ví con rải trên nhiều shard, hoặc gộp 10.000 khoản cộng trong 100 ms thành một event kèm chi tiết."* Câu trả lời này phân biệt người đã vận hành hệ thống thật với người mới đọc sách.

10. **Đừng bỏ qua chuyện tiền tệ — nó ngắn nhưng cực kỳ ăn điểm.** *"Tôi lưu tiền bằng **số nguyên theo đơn vị nhỏ nhất**, không bao giờ dùng float: `0.1 + 0.2` ra `0.30000000000000004`, và với 86 tỉ phép tính mỗi ngày thì sai số đó thành tiền thật. API nhận chuỗi. Mọi số tiền đi kèm mã tiền tệ. Và mọi chỗ phải làm tròn đều có quy tắc phân bổ phần dư — vì lệch 1 xu là nguyên nhân số một của các vụ đối soát không khớp."*

11. **Đưa bất biến toàn cục ra như hệ thống miễn dịch.** *"Vì chỉ chuyển nội bộ, **tổng số dư toàn hệ thống là hằng số**. Đó là cơ chế phát hiện lỗi mạnh nhất tôi có và nó gần như miễn phí. Nếu tổng lệch, tôi biết chắc có lỗi và biết nó nằm giữa hai lần kiểm — rồi nhị phân tìm kiếm trong luồng event ra đúng sự kiện gây lỗi. Đó là khác biệt giữa **phát hiện** lệch và tìm ra **nguyên nhân** — chính là thứ người phỏng vấn đã yêu cầu ở phần requirement."*

12. **Nói rõ triết lý vận hành: không sửa quá khứ.** *"Khi một bug ghi ra event sai, tôi **không xoá nó**. Tôi ghi một event bù trừ. Lịch sử phản ánh cả lỗi lẫn việc sửa lỗi — đúng chuẩn kế toán, và cũng là cách duy nhất để giữ được thứ duy nhất tôi có thể tin tưởng."*

13. **Chủ động nêu lộ trình để chứng minh bạn không over-engineer.** *"Dưới 10.000 TPS tôi dùng Postgres với bảng event append-only. Từ 10.000 tới 200.000 tôi dùng **Kafka với khoá partition là `wallet_id`** — Kafka cho tôi đúng ba thứ event sourcing cần: log có thứ tự, bền, phân vùng. Chỉ trên 500.000 TPS thì chi phí mới thật sự biện minh cho việc tự xây Raft trên mmap. Đề bài chốt 1 triệu nên tôi đi tới bước cuối — nhưng tôi muốn nói rõ rằng **biết khi nào KHÔNG nên xây thứ phức tạp cũng quan trọng như biết cách xây nó**."*

14. **Đóng lại bằng lập luận về testing, vì đó là đòn thuyết phục mạnh nhất và ít người nói tới.** *"Lợi ích lớn nhất của kiến trúc này không phải hiệu năng, cũng không phải audit. Là **tôi có thể chạy code mới trên toàn bộ lịch sử production thật và so sánh từng ví với code cũ trước khi phát hành**. Không phải dữ liệu test tôi bịa ra — mà **mọi tình huống kỳ quặc đã thật sự xảy ra**. Khi một khách hàng báo số dư sai, tôi replay đúng luồng event của ví đó trong debugger và tái hiện lỗi 100%. Hầu như không hệ thống nào làm được điều đó."*

> 💡 **Nguyên tắc cuối, gói cả bài trong một câu**: bốn phương án đầu đều hỏi *"làm sao cập nhật số dư cho đúng?"* và đều va vào cùng một bức tường — vì **số dư là một giá trị có thể bị ghi đè, và thứ gì ghi đè được thì nói dối được**. Event sourcing không trả lời câu hỏi đó; nó **xoá bỏ câu hỏi** bằng cách từ chối lưu số dư. Khi sự thật duy nhất là một chuỗi sự kiện chỉ ghi thêm, thì tính đúng đắn không còn là thứ bạn *hi vọng*, mà là thứ bạn **tính lại được bất cứ lúc nào**; audit không còn là tính năng, mà là hệ quả; và mọi bản sao trạng thái đều trở nên vứt đi được — đó chính là lý do hệ thống này vừa nhanh vừa đáng tin, hai thứ mà bình thường bạn phải chọn một.
