# Case study: Proximity Service — tìm địa điểm gần tôi

> Bài này trông như một câu truy vấn: *"cho tôi các nhà hàng trong bán kính 500 m"*. Và đó là cái bẫy. Câu truy vấn ấy viết bằng SQL mất đúng ba dòng, chạy đúng, trả về đúng kết quả — chỉ có điều nó mất vài giây trên 200 triệu bản ghi, và nó sẽ **không bao giờ nhanh lên** dù bạn thêm bao nhiêu index. Không phải vì database dở, mà vì **cấu trúc index mà mọi database quan hệ dùng — B-tree — về bản chất là một chiều, còn bài toán của bạn là hai chiều.** Toàn bộ phần còn lại của bài là các cách khác nhau để **ép hai chiều xuống một chiều mà vẫn giữ được tính "gần nhau"**.

Đây là **bài nền của mọi hệ thống geo**: tìm bạn bè gần đây, gọi xe, giao đồ ăn, geofencing, bản đồ — tất cả dùng lại đúng một ý tưởng (**space-filling curve** hoặc **cây phân hoạch không gian**), chỉ khác ở chỗ dữ liệu đứng yên hay chuyển động. Ở bài này dữ liệu **đứng yên**: một nhà hàng không tự bò đi chỗ khác. Chính giả định đó mở ra hàng loạt tối ưu (index bất biến, nhét hết vào RAM, replica đọc thoải mái) mà bài "nearby friends" sẽ không còn được hưởng.

Nếu chỉ nhớ một câu: **bài này không phải bài tìm kiếm, nó là bài đánh index. Chọn xong cấu trúc index là xong 80% thiết kế.**

---

## 1. Làm rõ yêu cầu

### Functional

| # | Yêu cầu | Ghi chú phạm vi |
|---|---|---|
| 1 | **Tìm business gần vị trí người dùng** theo `(lat, long, radius)` | Đây là core. Trả về danh sách business trong bán kính, đã sắp xếp. |
| 2 | **Xem chi tiết một business** | Tên, địa chỉ, ảnh, giờ mở cửa, rating, review. Một lookup theo khoá — dễ, nhưng QPS rất cao. |
| 3 | **Chủ cửa hàng thêm / sửa / xoá business** | CRUD thuần. **Không cần realtime**: sửa giờ mở cửa lúc 10 h sáng mà 10 h 30 mới hiện là hoàn toàn chấp nhận được. |
| 4 | **Lọc kết quả** theo loại (nhà hàng / xăng / ATM), giờ mở cửa, rating tối thiểu | Đây là thứ hay bị bỏ quên trong thiết kế, và nó ảnh hưởng thật tới cách chọn index (§9.3). |

Cố ý **bỏ ngoài phạm vi**, nói ra để định nghĩa rõ bài toán chứ không phải để né:

- **Vị trí người dùng stream liên tục lên server** — đó là bài *nearby friends*: ghi nhiều gấp hàng nghìn lần, index phải cập nhật mỗi vài giây, không cache được. Ở đây vị trí chỉ là **tham số của một request**, không phải trạng thái được lưu.
- **Chỉ đường, ETA** — bài *Google Maps*, cần graph đường đi và shortest path.
- **Tìm kiếm toàn văn** — cần search engine; ta chỉ lọc theo thuộc tính có cấu trúc.

> 💡 **Nguyên tắc**: câu đầu tiên đáng nói trong buổi phỏng vấn bài này là *"dữ liệu business gần như tĩnh"*. Nó không phải một chi tiết nhỏ — nó là **giả định cho phép toàn bộ kiến trúc read-optimized** ở §9 tồn tại. Nếu người phỏng vấn đổi giả định đó, bạn phải đổi thiết kế, và nói ra được điều đó là ghi điểm.

### Non-functional

| Thuộc tính | Mục tiêu | Nó dẫn dắt thiết kế thế nào |
|---|---|---|
| **Latency thấp** | p99 < 100 ms cho search | Người dùng đang đứng ngoài đường, tay cầm điện thoại, mạng 4G. Ràng buộc **số một** → index phải nằm trong RAM, không được quét DB |
| **High availability** | 99,99%, chịu được peak giờ ăn trưa ở khu trung tâm | Lưu lượng lệch nặng theo **không gian và thời gian**: 12 h trưa quận 1 có thể gấp 50 lần 3 h sáng ngoại thành |
| **Read-heavy cực đoan** | Tỉ lệ đọc:ghi ~ 10.000:1 | Toàn bộ kiến trúc là replica + cache. Ghi có thể chậm, có thể async, có thể batch |
| **Data privacy** | GDPR / CCPA | Vị trí người dùng là **dữ liệu nhạy cảm**. Không log toạ độ thô, hoặc log ở độ chính xác thấp; không gắn với user id lâu dài |
| **Eventual consistency là đủ** | Trễ vài phút tới vài giờ đều ổn | Đây là món quà lớn nhất của bài. Không cần transaction phân tán, không cần quorum read, replica lag không phải vấn đề |

### Giả định chốt

```
- 100 triệu DAU
- 200 triệu business trên toàn cầu
- Mỗi user tìm kiếm ~5 lần/ngày
- Bán kính mặc định 5 km, tối đa 20 km, tối thiểu 500 m
- Business thay đổi: ~0,1%/ngày (200K bản ghi/ngày)
- Mỗi trang kết quả 20 business
- Vị trí business KHÔNG thay đổi (trừ khi chủ sửa)
```

> 💡 Mỗi giả định ở trên đều sẽ **nhân lên thành một con số** ở phần sau. "200K bản ghi đổi/ngày" không phải chi tiết trang trí — nó là thứ sẽ quyết định ta chọn **rebuild index theo batch** hay **cập nhật incremental**, ở §10.

---

## 2. Back-of-envelope estimation

### QPS search

```
Search QPS = 100.000.000 DAU × 5 lần/ngày ÷ 86.400 giây
           = 500.000.000 ÷ 86.400
           ≈ 5.800 QPS          (làm tròn ~5.000 QPS như con số thường trích)

Peak (giờ trưa + giờ tan tầm, hệ số 3–5×):
           ≈ 20.000 – 30.000 QPS
```

Con số này **nhỏ đến mức đáng ngạc nhiên** — và đó chính là thông tin quan trọng nhất của cả phần estimation. 5.800 QPS là thứ mà **vài chục máy** xử lý được nếu mỗi request chỉ là tra cứu trong RAM. Nói cách khác:

> ⚠️ **Bài này không nghẽn ở throughput mà ở chỗ "một request tốn bao nhiêu việc".** Nếu mỗi request phải quét 20 triệu row MySQL thì 5.800 QPS là thảm hoạ; nếu mỗi request là 9 lệnh `SMEMBERS` trên Redis thì đó là chuyện vặt. **Chênh lệch không nằm ở số máy mà ở cấu trúc dữ liệu** — nên đây là "bài thuật toán", không phải "bài scale".

### QPS xem chi tiết business

Mỗi lần search trả 20 kết quả, người dùng bấm vào ~2 → `5.800 × 2 ≈ **12.000 QPS**` (peak ~50.000). Đây là **lookup theo primary key** — đúng bài của cache, và hit rate sẽ rất cao vì truy cập theo luật lũy thừa: vài nghìn địa điểm nổi tiếng chiếm phần lớn lượt xem.

### Storage

```
Bảng business (metadata đầy đủ):
  200M × ~1 KB (tên, địa chỉ, mô tả, giờ mở cửa, ảnh URL, rating)
  = 200 GB

Bảng geospatial index (geohash → business_id):
  200M row × (geohash 8 byte + business_id 8 byte + overhead ~8 byte)
  ≈ 200M × 24 B ≈ 5 GB
```

> 💡 **Con số 5 GB này là cú twist của bài.** Toàn bộ index không gian của **200 triệu business trên cả hành tinh** nhét vừa RAM của **một** máy tầm trung. Điều đó có nghĩa là: bạn **không cần shard** geospatial index vì lý do dung lượng. Nếu có shard thì là vì **throughput** hoặc **blast radius**, không phải vì hết chỗ. Nói được câu này trong phỏng vấn sẽ tách bạn khỏi những người phản xạ "dữ liệu lớn → shard".

Kể cả tính overhead của Redis, con số thực tế vẫn trong khoảng **10–20 GB** — vừa một instance `cache.r7g.xlarge`.

### Băng thông

Response search ≈ 6 KB (20 × 300 B) → `5.800 × 6 KB ≈ 35 MB/s ≈ 280 Mbps`, peak ~1,4 Gbps. Response detail ~2 KB → ~24 MB/s. Băng thông không phải vấn đề — **trừ ảnh**, và ảnh thì không bao giờ đi qua application server, chúng nằm trên object storage sau CDN.

### Ghi

```
200K business thay đổi/ngày ÷ 86.400 ≈ 2,3 writes/giây
```

**2,3 ghi mỗi giây.** Một chiếc laptop cũ làm được. Hãy đặt con số này cạnh 5.800 đọc/giây và 12.000 detail/giây:

| Loại | QPS trung bình | Tỉ lệ |
|---|---:|---:|
| Xem chi tiết business | 12.000 | 67,4% |
| Search nearby | 5.800 | 32,6% |
| **Ghi (CRUD business)** | **2,3** | **0,013%** |

Tỉ lệ đọc:ghi ≈ **7.700 : 1**. Đây là con số biện minh cho gần như mọi quyết định sau đó: primary-replica với rất nhiều replica, index dựng sẵn trong RAM, cache mọi tầng, và chấp nhận index "trễ" vài phút so với database.

---

## 3. API design

Tối giản, và cố tình **tách làm hai nhóm** — vì chúng chạy trên hai service khác nhau với hai hồ sơ tải hoàn toàn khác nhau.

### Nhóm 1 — Location-Based Service (đọc thuần, tính toán không gian)

```
GET /v1/search/nearby
    ?latitude=37.776720
    &longitude=-122.416730
    &radius=500              # mét, mặc định 5000
    &type=restaurant         # tuỳ chọn, lọc theo loại
    &open_now=true           # tuỳ chọn
    &limit=20
    &cursor=eyJkIjoxMjM0fQ== # phân trang (§9.4)

200 →
{
  "businesses": [
    { "id": "b_8fa21", "name": "Phở Hòa",
      "lat": 37.77712, "lng": -122.41590,
      "distance_m": 87, "rating": 4.6, "open_now": true },
    ...
  ],
  "next_cursor": "eyJkIjo1MTJ9",
  "search_radius_m": 500
}
```

Ba điểm nhỏ nhưng có chủ đích: **`radius` có trần cứng** (20 km) — không có nó, một request biến thành lệnh quét toàn bộ index, và giới hạn tài nguyên phải đặt ở **tầng API** chứ không phải hy vọng tầng dưới chịu được; **`distance_m` do server trả về** vì server đã phải tính để sắp xếp, và như vậy client/server nhất quán về cách tính; và **`cursor` chứ không phải `offset`** — lý do ở §9.4, một trong những chỗ dễ sai nhất của bài.

### Nhóm 2 — Business Service (CRUD + đọc chi tiết)

| Endpoint | Mục đích | Đặc tính tải |
|---|---|---|
| `GET /v1/businesses/{id}` | Chi tiết một business | **Đọc rất nhiều**, cache hit rate cao |
| `POST /v1/businesses` | Tạo mới | 2,3/s, cần auth chủ cửa hàng |
| `PUT /v1/businesses/{id}` | Cập nhật | 2,3/s |
| `DELETE /v1/businesses/{id}` | Xoá (soft delete) | Rất hiếm |

> 💡 **Vì sao tách hai service?** Không phải vì "microservice cho hiện đại", mà vì hai hồ sơ vận hành khác hẳn: LBS **stateless, CPU-bound, đọc thuần**, giữ index trong RAM nên cần nhiều RAM và có thể **khởi động chậm**; Business Service có **ghi**, cần auth/validate/transaction nhưng khởi động trong một giây. Nhốt chung một deployment là tự trói tay mình.

---

## 4. High-level design

```
                                 ┌──────────────┐
   Điện thoại / web  ──────────▶ │ Load Balancer│
                                 └──────┬───────┘
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
            ┌────────────────────────┐   ┌──────────────────────────┐
            │ Location-Based Service │   │    Business Service      │
            │  (LBS) — ĐỌC THUẦN     │   │  (CRUD + đọc chi tiết)   │
            │  · geo index in-memory │   │  · auth chủ cửa hàng     │
            │  · stateless           │   │  · validate + geocode    │
            └──────────┬─────────────┘   └───────┬──────────┬───────┘
                       │                         │ ghi      │ đọc
                       │ đọc index               ▼          │
                       │                  ┌─────────────┐   │
                       │                  │  DB PRIMARY │   │
                       │                  │ (business)  │   │
                       │                  └──────┬──────┘   │
                       │                         │ replication
                       ▼                         ▼          ▼
          ┌────────────────────────┐     ┌────────────────────────┐
          │  Geo Index Store       │     │   DB REPLICA  × N      │
          │  Redis / in-memory     │◀────│   (đọc business)       │
          │  geohash → [biz_id]    │ sync└────────────────────────┘
          └────────────────────────┘  (job)
                       ▲
                       │
          ┌────────────────────────┐
          │ Index Builder (batch / │
          │ incremental — §10)     │
          └────────────────────────┘
```

Đáng nhớ không phải các hộp mà là **ba dòng dữ liệu tách biệt**:

- **Ghi** (2,3 rps): chủ cửa hàng → Business Service → validate → **geocode** địa chỉ thành `(lat, long)` → DB primary → (async) sự kiện → Index Builder cập nhật Geo Index Store.
- **Đọc search** (5.800 rps): client → LBS → tính geohash + 8 ô lân cận → tra Geo Index lấy `business_id` → tra metadata (cache/replica) → lọc theo bán kính thật và thuộc tính → sắp xếp → trả về.
- **Đọc detail** (12.000 rps): client → Business Service → cache → replica.

Ba đường này **hầu như không đụng nhau**, và đó là chủ ý: đường ghi chậm, hiếm, cần đúng; đường đọc nhanh, dày, được phép trễ. Tách ra thì tối ưu mỗi đường theo hướng ngược nhau mà không đánh nhau.

### Data model

Hai bảng, và **sự tách biệt của chúng chính là ý tưởng chính** của toàn bộ bài.

**Bảng `business`** — nguồn sự thật, mọi thứ về một địa điểm:

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `business_id` | BIGINT PK | Khoá chính, cũng là khoá shard |
| `name`, `address`, `city`, `country` | VARCHAR | |
| `latitude`, `longitude` | DOUBLE | Toạ độ chính xác |
| `type` | VARCHAR | restaurant / gas_station / atm / ... |
| `opening_hours` | JSON | Theo từng ngày trong tuần + timezone |
| `rating`, `review_count` | FLOAT / INT | Cập nhật bởi job riêng |
| `updated_at` | TIMESTAMP | Dùng cho incremental index (§10.2) |

**Bảng `geospatial_index`** — chỉ có đúng hai cột, và nó tồn tại chỉ để trả lời một câu hỏi:

| `geohash` | `business_id` |
|---|---|
| `9q9hvu` | 343 |
| `9q9hvu` | 347 |
| `9q9hvu` | 112 |
| `9q9hvv` | 891 |

> ⚠️ **Bẫy schema hay gặp**: nhiều người thiết kế bảng này thành `geohash → danh sách business_id` gộp chung một dòng (một cột JSON array). Đừng. Một dòng cho một cặp `(geohash, business_id)` với **composite primary key `(geohash, business_id)`** thì: thêm/xoá một business là một câu INSERT/DELETE không cần đọc-sửa-ghi, không có race condition khi hai business cùng ô được thêm đồng thời, và không có dòng nào phình to bất thường ở khu trung tâm. Gộp thành JSON array thì mỗi lần cập nhật phải đọc cả mảng, sửa, ghi lại — kinh điển của lost update.

Còn một lựa chọn nhỏ nhưng đáng nói: lưu **một dòng với geohash dài nhất** rồi truy vấn bằng prefix scan (`LIKE '9q9hvu%'`), hay lưu **nhiều dòng, mỗi độ dài ta thật sự truy vấn một dòng** (4, 5, 6)? Cách sau tốn gấp ba chỗ (vẫn chỉ ~15 GB) nhưng biến mọi truy vấn thành **lookup chính xác theo khoá**, không range scan — và với Redis thì đó là lựa chọn tự nhiên. Đọc gấp 7.700 lần ghi, dung lượng rẻ như cho, nên cách sau thắng.

---

## 5. Deep dive 1 — Vì sao truy vấn hai chiều bằng SQL lại chậm

Đây là **trái tim của cả bài**. Nếu bạn chỉ hiểu được một phần, hãy hiểu phần này, vì mọi giải pháp sau đó đều là câu trả lời cho vấn đề được nêu ở đây.

### Cách làm ngây thơ

Cách nghĩ tự nhiên nhất: người dùng ở `(lat₀, lng₀)`, bán kính `r`. Vẽ một hình vuông bao quanh, lấy mọi thứ bên trong:

```sql
SELECT business_id, latitude, longitude
FROM business
WHERE latitude  BETWEEN lat0  - r_deg AND lat0  + r_deg
  AND longitude BETWEEN lng0  - r_deg AND lng0  + r_deg;
```

Rồi lọc tiếp bằng Haversine để bỏ các điểm trong hình vuông nhưng ngoài hình tròn. **Câu này đúng về mặt logic.** Vấn đề duy nhất: nó chậm, và chậm theo cách không sửa được bằng phần cứng.

### Vì sao thêm index không cứu được

Giả sử bạn làm điều hiển nhiên — index trên cả hai cột.

```sql
CREATE INDEX idx_lat  ON business(latitude);
CREATE INDEX idx_lng  ON business(longitude);
```

**B-tree là cấu trúc sắp xếp tuyến tính**: nó xếp mọi giá trị lên một trục từ nhỏ đến lớn, cho phép nhảy tới một điểm rồi đi ngang. Nó cực giỏi trả lời "mọi hàng có `latitude` trong khoảng này" — một **đoạn liên tục** trên trục đã sắp xếp. Nhưng bài toán của bạn cần **giao của hai đoạn trên hai trục khác nhau**, và đây là chỗ mọi thứ sụp đổ:

```
Trục LATITUDE  (index idx_lat)
   ├─────────────────────────────────────────────────────────┤
              [══════ dải lat0±r ══════]
              ← khoảng 20 TRIỆU business nằm trong dải này →
              (cả một vành đai vòng quanh Trái Đất!)

Trục LONGITUDE (index idx_lng)
   ├─────────────────────────────────────────────────────────┤
                        [═══ dải lng0±r ═══]
                        ← khoảng 20 TRIỆU business →
                        (cả một múi từ Bắc Cực xuống Nam Cực!)

                  GIAO của hai tập  =  ~vài trăm business
```

Đây là điểm mấu chốt, nói cho thật rõ:

**Một dải vĩ độ rộng 500 m không phải là "một vùng nhỏ". Nó là một vành đai chạy vòng quanh toàn bộ Trái Đất** — đi qua Thái Bình Dương, Đại Tây Dương, mọi lục địa ở cùng vĩ độ đó. Tương tự, một dải kinh độ rộng 500 m là **một múi chạy từ Bắc Cực xuống Nam Cực**. Mỗi tập riêng lẻ chứa hàng chục triệu bản ghi. Vùng bạn thật sự cần — **giao** của hai dải — chỉ chứa vài trăm.

Database có ba lựa chọn, và cả ba đều tệ:

| Chiến lược của query planner | Nó làm gì | Vì sao tệ |
|---|---|---|
| **Dùng `idx_lat` rồi lọc** | Quét 20 triệu entry của index lat, với mỗi entry phải **đọc row** để kiểm tra longitude | 20 triệu lần random I/O. Đây là trường hợp hay xảy ra nhất trong thực tế. |
| **Dùng `idx_lng` rồi lọc** | Đối xứng, cũng 20 triệu | Y hệt |
| **Index intersection / bitmap AND** | Đọc cả hai index, dựng hai bitmap 20 triệu phần tử, AND lại | Phải **materialise hai tập khổng lồ trong RAM** trước khi biết giao của chúng bé tí. Tốn RAM, tốn CPU, và vẫn phải đọc đủ hai index. |
| **Composite index `(lat, lng)`** | B-tree sắp theo lat trước, lng sau | **Không giúp gì.** Sau khi chọn dải lat, các hàng trong dải đó được sắp theo lng nhưng **rải rác thành 20 triệu đoạn nhỏ**, không phải một đoạn liên tục. Composite index chỉ hiệu quả khi cột đầu là **đẳng thức**, còn ở đây nó là **khoảng**. |

> ⚠️ **Bẫy phỏng vấn kinh điển**: ứng viên đề xuất composite index `(latitude, longitude)` và tưởng đã giải xong. Hãy nhớ quy tắc *leftmost prefix*: khi cột bên trái của composite index là một **range predicate** (`BETWEEN`), thì mọi cột bên phải **mất khả năng seek** — chúng chỉ còn dùng được để lọc sau khi đã quét. Đó chính xác là tình huống ở đây, và nó cũng là lý do một câu trả lời nghe rất chuyên nghiệp lại hoàn toàn sai.

### Phát biểu vấn đề ở dạng trừu tượng

Bóc hết chi tiết đi, ta còn lại một câu:

> **B-tree index chỉ tăng tốc tìm kiếm trên MỘT chiều. Tìm kiếm không gian vốn là bài toán HAI chiều. Muốn dùng lại được toàn bộ hạ tầng index một chiều (B-tree, sorted set, key-value), ta phải ánh xạ hai chiều xuống một chiều — sao cho hai điểm gần nhau trong mặt phẳng thì cũng gần nhau trên trục một chiều.**

Câu cuối là **điều kiện khó**. Ánh xạ 2D → 1D thì dễ (cứ nối chuỗi lat và lng lại là xong); ánh xạ **bảo toàn tính gần nhau (locality-preserving)** mới là vấn đề. Và về mặt toán học, **không tồn tại ánh xạ nào bảo toàn hoàn hảo** — luôn có những cặp điểm gần nhau trong 2D bị đẩy xa nhau trên trục 1D. Đó là nguồn gốc của **boundary issue** ở §7.4, và nó không phải lỗi triển khai mà là một giới hạn không thể tránh. Mọi giải pháp thực tế đều là: **chấp nhận ánh xạ không hoàn hảo, rồi vá lỗ hổng bằng cách tìm thêm các ô lân cận.**

Có một phương án nữa mà database quan hệ có sẵn: **R-tree** (trong PostgreSQL là **GiST index**). Nó không ánh xạ xuống 1D mà tổ chức các **hình chữ nhật bao lồng nhau** thành cây — giải pháp đúng đắn về mặt học thuật, và PostGIS dùng rất hiệu quả. Vì sao hệ quy mô lớn vẫn hay chọn geohash/S2? Vì R-tree là **cấu trúc cây sống trong một database cụ thể**: khó phân tán, khó nhét vào key-value store, khó cache theo từng ô, và không cho bạn một **chuỗi ký tự** để làm cache key hay partition key. Geohash cho bạn một chuỗi — và chuỗi thì đi được khắp nơi.

---

## 6. Deep dive 2 — Bản đồ các họ giải pháp

Trước khi đi sâu vào từng cái, hãy nhìn toàn cảnh. Mọi geospatial index đều thuộc một trong hai họ:

```
                    GEOSPATIAL INDEX
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
      HỌ "HASH"                        HỌ "CÂY"
  (chia không gian theo             (chia không gian theo
   quy tắc CỐ ĐỊNH, không            DỮ LIỆU, thích ứng
   phụ thuộc dữ liệu)                với mật độ)
           │                               │
     ┌─────┴─────┐              ┌──────────┼──────────┐
     ▼           ▼              ▼          ▼          ▼
 Even grid    Geohash        Quadtree   Google S2   R-tree
                                       (Hilbert)
```

Sự khác biệt căn bản giữa hai họ, và nó quyết định mọi thứ khác:

- **Họ hash**: ô được xác định bởi **công thức thuần tuý** từ toạ độ. Muốn biết điểm `(lat, lng)` thuộc ô nào? Tính ra, xong — **không cần đọc dữ liệu, không cần cấu trúc gì cả**. Hệ quả: hai server bất kỳ luôn đồng ý về việc một điểm thuộc ô nào, thêm/xoá business không ảnh hưởng ai, và "index" chỉ là một bảng key-value tầm thường.
- **Họ cây**: ranh giới ô **phụ thuộc vào dữ liệu hiện có**. Thêm business có thể khiến một ô bị tách làm bốn. Hệ quả: index là một **cấu trúc có trạng thái** phải được xây dựng, phải được đồng bộ, và mọi server phải có cùng một bản.

### Even grid — và vì sao nó hỏng

Ý tưởng đơn giản nhất: chia cả thế giới thành lưới ô vuông đều nhau, ví dụ mỗi ô 1 km × 1 km. Business nào rơi vào ô nào thì gán vào ô đó. Tìm kiếm thì lấy ô của mình cộng các ô xung quanh.

Nó **hỏng vì phân bố business cực kỳ không đều**: một ô 1 km² ở Manhattan chứa ~6.000 business, ở Quận 1 TP.HCM ~4.000, ở ngoại ô Cần Thơ ~15, giữa Sahara hay giữa Thái Bình Dương thì bằng 0.

Hậu quả, cả hai đều nghiêm trọng: **ô dày đặc** — truy vấn ở Manhattan trả 6.000 business từ một ô, tải hết về, tính khoảng cách, sắp xếp rồi vứt đi 5.980 cái, tức latency tệ nhất ở đúng chỗ đông người dùng nhất; và **ô rỗng** — 70% bề mặt Trái Đất là nước, phần lớn ô trống rỗng nhưng vẫn chiếm không gian khoá.

> 💡 **Bài học tổng quát vượt ra ngoài bài này**: một sơ đồ phân hoạch **đều về mặt hình học** hầu như không bao giờ **đều về mặt tải**, bởi vì dữ liệu thực tế không bao giờ phân bố đều. Đây chính xác là cùng một sai lầm với "hash mod N" trong consistent hashing, với "shard theo khoảng id" trong database, và với "chia đều partition" trong Kafka. Cái ta muốn là chia đều **công việc**, không phải chia đều **không gian**.

Nhưng even grid không vô dụng — nó là **nền tảng khái niệm** của geohash. Geohash chính là even grid được làm **phân cấp**: thay vì một kích thước ô duy nhất, bạn có 12 mức từ 5.000 km xuống 3,7 cm và **chọn mức phù hợp với truy vấn**. Vẫn không thích ứng theo mật độ dữ liệu, nhưng có một núm vặn.

### Bảng so sánh bốn phương án

| Tiêu chí | **Even grid** | **Geohash** | **Quadtree** | **Google S2** |
|---|---|---|---|---|
| **Bản chất** | Lưới cố định một mức | Lưới phân cấp 12 mức, mã hoá thành chuỗi | Cây chia bốn theo dữ liệu | Hilbert curve trên mặt cầu, 30 mức |
| **Thích ứng mật độ** | ❌ Không | ❌ Không (nhưng chọn được mức) | ✅ Có, tự động | ✅ Có (chọn min/max level) |
| **Cần build cấu trúc?** | Không | **Không** — chỉ là phép tính | **Có** — dựng cây lúc khởi động | Có, nếu dùng region cover |
| **Cập nhật một điểm** | O(1), tầm thường | **O(1), tầm thường** | Phức tạp — có thể phải tách/gộp node | Trung bình |
| **Lưu ở đâu** | KV store bất kỳ | **KV store bất kỳ, chuỗi làm khoá** | **Bắt buộc in-memory** trên mỗi server | KV store (cell id là int64) |
| **k-nearest / bán kính cố định** | Kém / Tốt | Khá / **Tốt** | **Xuất sắc** / Khá | Tốt / Tốt |
| **Phủ vùng bất kỳ, geofencing** | Kém | Kém | Khá | **Xuất sắc** (region cover) |
| **Méo ở cực** | Có | Có (ô hẹp dần về cực) | Có | **Ít nhất** (chia trên mặt cầu) |
| **Độ khó triển khai** | Rất dễ | **Dễ** | Trung bình | Khó (nên dùng thư viện) |
| **Ai dùng** | — | Redis GEO, Elasticsearch, nhiều startup | Nhiều hệ tìm kiếm địa điểm | Google Maps, Uber (kết hợp H3), Foursquare |

Còn một cái thứ năm đáng nhắc tên: **H3 của Uber** — lưới **lục giác** phân cấp, nơi cả sáu hàng xóm đều cách tâm một khoảng bằng nhau (ô vuông thì hàng xóm cạnh cách `d`, hàng xóm chéo cách `d√2`). Uber dùng nó cho mô hình cung-cầu chứ không phải tìm kiếm bán kính.

> 💡 **Cách chọn trong 10 giây, dùng được trong phỏng vấn**: dữ liệu **gần như tĩnh + truy vấn bán kính cố định** → **geohash** (đơn giản nhất mà đủ dùng, và đơn giản là một tính năng). Cần **k gần nhất** với k nhỏ và mật độ rất lệch → **quadtree**. Cần **geofence hình dạng bất kỳ** (vùng giao hàng, khu vực cấm, biên giới hành chính) → **S2**. Dữ liệu **chuyển động liên tục** → geohash hoặc S2, **tuyệt đối không quadtree** (lý do ở §8.3).

---

## 7. Deep dive 3 — Geohash, mổ xẻ đến tận cùng

Geohash là lựa chọn chính của bài này, nên nó xứng đáng được hiểu tới từng bit chứ không chỉ "nó mã hoá toạ độ thành chuỗi".

### 7.1 Thuật toán: chia đôi lặp lại, xen kẽ hai trục

Ý tưởng là một phép **tìm kiếm nhị phân trên không gian**. Bắt đầu với toàn bộ Trái Đất, rồi lặp lại: chia đôi, xem điểm nằm nửa nào, ghi lại một bit.

Nhưng mẹo nằm ở chỗ: **mỗi bước ta đổi trục**. Bit đầu chia theo kinh độ, bit sau chia theo vĩ độ, bit sau nữa lại kinh độ... Chính sự **xen kẽ (interleaving)** này là thứ biến một cặp số thành một mã bảo toàn tính gần nhau ở **cả hai chiều** — nếu chỉ nối chuỗi lat rồi lng thì hai điểm cùng lat nhưng khác lng chút xíu sẽ có mã cách xa nhau hoàn toàn.

Cụ thể với điểm `(37.7767, -122.4167)` — San Francisco:

```
Kinh độ, khoảng đầu [-180, 180]:      Vĩ độ, khoảng đầu [-90, 90]:
 bit1: -122.4 < 0     → 0  [-180,  0]  bit1: 37.8 > 0    → 1  [  0, 90]
 bit2: -122.4 < -90   → 0  [-180,-90]  bit2: 37.8 < 45   → 0  [  0, 45]
 bit3: -122.4 > -135  → 1  [-135,-90]  bit3: 37.8 > 22.5 → 1  [22.5,45]
 bit4: -122.4 < -112.5→ 0  ...          ...

Xen kẽ (bắt đầu bằng kinh độ):  lng 0 0 1 0…  lat 1 0 1…
                          →  0 1 0 0 1 0 1 0 …
```

Mỗi lần thêm **một bit** là **giảm một nửa** kích thước ô theo một chiều. Sau 5 bit ta gom thành một ký tự **base32**.

### 7.2 Base32 và bảng độ chính xác

Geohash dùng bảng base32 riêng (`0123456789bcdefghjkmnpqrstuvwxyz` — **bỏ các ký tự `a`, `i`, `l`, `o`** để tránh nhầm lẫn khi con người đọc/đánh máy). Mỗi ký tự = 5 bit, và vì ta xen kẽ hai trục nên mỗi ký tự thêm vào **chia nhỏ diện tích ô khoảng 32 lần**.

| Độ dài geohash | Số bit | Kích thước ô (xấp xỉ, ở xích đạo) | Dùng cho bán kính |
|---:|---:|---|---|
| 1 | 5 | 5.000 km × 5.000 km | — (vô dụng) |
| 2 | 10 | 1.250 km × 625 km | — |
| 3 | 15 | 156 km × 156 km | — |
| 4 | 20 | 39,1 km × 19,5 km | ~20 km |
| **5** | 25 | **4,9 km × 4,9 km** | **~5 km (mặc định)** |
| **6** | 30 | **1,2 km × 0,6 km** | **~1 km** |
| **7** | 35 | **153 m × 153 m** | **~500 m** |
| 8 | 40 | 38,2 m × 19,1 m | ~100 m |
| 9–12 | 45–60 | 4,8 m xuống 3,7 cm | — (GPS còn không chính xác tới mức này) |

Chú ý hình dạng ô **đổi giữa các mức**: độ dài lẻ cho ô gần vuông, độ dài chẵn cho ô chữ nhật nằm ngang — hệ quả trực tiếp của việc xen kẽ bắt đầu từ kinh độ.

**Cách chọn độ dài từ bán kính** — quy tắc thực chiến: **chọn độ dài geohash nhỏ nhất mà kích thước ô vẫn ≥ bán kính tìm kiếm**. Lý do: ô phải đủ lớn để cùng với 8 ô lân cận, nó bao trọn hình tròn bán kính `r`. Nếu ô nhỏ hơn `r`, thì 3×3 ô vẫn không phủ hết hình tròn và bạn sẽ **bỏ sót** kết quả ở rìa.

```
Bán kính 500 m  → ô phải ≥ ~500 m  → geohash length 6 (1,2 km × 0,6 km)
Bán kính 2 km   → geohash length 5 (4,9 km)
Bán kính 20 km  → geohash length 4 (39 km × 19,5 km)
```

> ⚠️ Bảng trên là **ở xích đạo**. Ô geohash **hẹp dần theo chiều ngang khi tiến về hai cực** vì kinh tuyến hội tụ — ở vĩ độ 60° một độ kinh độ chỉ còn bằng một nửa chiều dài ở xích đạo. Với Việt Nam (8°–23° N) sai lệch không đáng kể (~3%), nhưng nếu hệ thống của bạn phục vụ Bắc Âu hay Canada, hãy hiệu chỉnh bằng `cos(latitude)` khi chọn độ dài, hoặc chuyển hẳn sang S2 (chia trên mặt cầu nên không có vấn đề này).

### 7.3 Tính chất vàng: tiền tố chung = gần nhau

Đây là lý do geohash tồn tại:

> **Hai geohash càng chung nhiều ký tự đầu thì hai điểm càng gần nhau.**

```
9q9hvu  và  9q9hvv   → chung 5 ký tự  → hai ô kề nhau, cách vài trăm mét
9q9hvu  và  9q9j2k   → chung 4 ký tự  → cùng khu vực, cách vài km
9q9hvu  và  9qc1x3   → chung 2 ký tự  → cùng bang California
9q9hvu  và  dr5ru7   → chung 0 ký tự  → San Francisco vs New York
```

Tính chất này biến tìm kiếm không gian thành bài toán mà **mọi công cụ sẵn có đều xử lý được**: trong SQL là `WHERE geohash LIKE '9q9hvu%'` — một **prefix scan** mà B-tree làm cực nhanh vì các giá trị cùng tiền tố nằm liền kề trên trục sắp xếp; trong Redis là `SMEMBERS geo:9q9hvu` O(1); trong DynamoDB geohash prefix làm **partition key** nên một `Query` là xong; và trong cache nó là **cache key hoàn hảo** (§9.2). Nói cách khác, geohash đã làm đúng nhiệm vụ đặt ra ở §5: **ép 2D xuống 1D mà vẫn giữ locality**, sản phẩm là một chuỗi ASCII đi được khắp nơi.

### 7.4 Bẫy thứ nhất: boundary issue

Nhớ lại §5: **không tồn tại ánh xạ 2D → 1D nào bảo toàn locality hoàn hảo**. Geohash cũng không thoát. Và chỗ nó hỏng là **ở biên của các ô**.

Có hai dạng hỏng, dạng thứ hai nghiêm trọng hơn nhiều:

**Dạng 1 — gần nhau nhưng khác ô.** Hai quán cà phê đối diện nhau qua một con phố, cách 20 m, nhưng con phố đó trùng ranh giới ô: một quán ở `9q9hvu`, quán kia ở `9q9hvv`. Bạn đứng ở quán A tìm bán kính 200 m và **không thấy quán B** dù nó ngay trước mặt.

**Dạng 2 — rất gần nhau nhưng KHÔNG chung ký tự nào.** Hai điểm cách nhau 1 m nhưng nằm hai bên **xích đạo** (hoặc **kinh tuyến gốc**, hoặc **đường đổi ngày**). Bit đầu tiên — bit quyết định "bán cầu nào" — **khác nhau**, nên ký tự base32 đầu tiên khác nhau, và tiền tố chung là **chuỗi rỗng**.

```
                 ↑ vĩ độ
   ●  điểm P: lat = +0.000001   → bit đầu (lat) = 1
─────────────────────────────── XÍCH ĐẠO (lat = 0)
   ●  điểm Q: lat = -0.000001   → bit đầu (lat) = 0

   Khoảng cách thực tế: ~20 cm
   Tiền tố chung của geohash: 0 ký tự
```

> ⚠️ **Đây là hệ quả không thể tránh, không phải bug.** Ranh giới của phép chia đôi đầu tiên là một **vết cắt toàn cầu**, và mọi cặp điểm nằm hai bên nó đều bị đẩy ra hai đầu của không gian mã. Mọi space-filling curve đều có các vết cắt như vậy; Hilbert curve của S2 ít và ngắn hơn nên đỡ hơn, nhưng không miễn nhiễm.

**Cách giải: luôn tìm cả 8 ô lân cận.** Thay vì hỏi một ô, ta hỏi **9 ô** — ô của mình cộng 8 ô bao quanh:

```
    ┌────────┬────────┬────────┐
    │   NW   │    N   │   NE   │
    ├────────┼────────┼────────┤
    │   W    │  ★ ME  │    E   │     ★ = ô chứa người dùng
    ├────────┼────────┼────────┤
    │   SW   │    S   │   SE   │
    └────────┴────────┴────────┘
```

Vì sao đúng 8 mà không phải vành 5×5? Vì ta **đã chọn độ dài geohash sao cho ô ≥ bán kính tìm kiếm** (§7.2): khi đó dù người dùng đứng ở góc tệ nhất của ô, hình tròn bán kính `r` cũng không vươn quá ô kề bên. **Điều kiện "ô ≥ bán kính" chính là thứ biện minh cho con số 8.** Chọn ô nhỏ hơn bán kính để giảm số kết quả phải lọc là đánh đổi hợp lệ, nhưng khi đó bạn **bắt buộc** phải mở ra vành lớn hơn.

Tính 8 ô lân cận không tầm thường (giải mã ngược ra khoảng, dịch một bước, mã hoá lại, xử lý wrap-around ở kinh tuyến ±180°) — nhưng mọi thư viện đều có `neighbors()`, đừng tự viết. Và điểm đẹp nhất: **9 lệnh tra cứu độc lập nhau nên chạy song song**; với Redis pipeline chúng gộp thành **một round-trip**.

### 7.5 Bẫy thứ hai: không đủ business trong ô

Bẫy thứ nhất là *bỏ sót kết quả ở rìa*. Bẫy thứ hai ngược lại: **không có kết quả nào cả**.

Người dùng ở vùng nông thôn tìm nhà hàng trong 500 m. Geohash length 6, tra 9 ô, trả về 2 kết quả — hoặc 0. Về kỹ thuật thì **đúng**; về sản phẩm thì đó là một màn hình trống và người dùng đóng app.

**Cách giải: nới prefix từng bậc (progressive prefix widening).** Bỏ dần ký tự cuối của geohash để leo lên một mức trong cây phân cấp — mỗi bậc mở rộng vùng tìm kiếm khoảng 32 lần về diện tích:

```
Bắt đầu: geohash length 6  →  9 ô × 1,2 km    →  chỉ được 2 kết quả
Chưa đủ 20  →  bỏ 1 ký tự:
         geohash length 5  →  9 ô × 4,9 km    →  được 8 kết quả
Chưa đủ 20  →  bỏ tiếp:
         geohash length 4  →  9 ô × 39 km     →  được 47 kết quả  ✓ dừng
```

Cụ thể bằng mã giả:

```python
def search_nearby(lat, lng, radius_m, want=20, min_len=4):
    length = geohash_length_for_radius(radius_m)   # ví dụ 500 m → 6
    results = []
    while length >= min_len:
        cells = [geohash_encode(lat, lng, length)]
        cells += geohash_neighbors(cells[0])       # 8 ô lân cận
        ids = redis.sunion(*[f"geo:{c}" for c in cells])   # song song / 1 round-trip
        results = fetch_and_filter(ids, lat, lng, radius_m)
        if len(results) >= want:
            break
        length -= 1                                # nới một bậc
        radius_m *= 2                              # nới cả bán kính "mềm"
    return sorted(results, key=lambda b: b.distance)[:want]
```

Ba chi tiết hay bị bỏ qua: (1) **phải có `min_len`** — không có nó, một người dùng giữa Thái Bình Dương sẽ khiến vòng lặp leo lên length 1, tức **đọc một phần tư Trái Đất vào RAM**, và một truy vấn duy nhất hạ cả server; (2) **nới bán kính cùng với nới ô**, nếu không bạn đọc thêm rất nhiều rồi lọc bỏ hết mà vẫn 2 kết quả — và phải **nói rõ trên UI** rằng đây là kết quả trong 2 km chứ không phải 500 m; (3) **tối đa 2–3 lần nới**, vì mỗi bậc tăng khối lượng ~32 lần.

> 💡 Nhìn kỹ thì hai cái bẫy của geohash là **hai đầu của cùng một cái cân**: ô nhỏ → nhanh nhưng dễ thiếu kết quả và dễ sót ở rìa; ô lớn → đủ kết quả nhưng phải lọc bỏ nhiều, tốn băng thông và CPU. Đó chính xác là điểm yếu mà quadtree ra đời để giải: **đừng chọn một kích thước ô, hãy để dữ liệu tự chọn.**

### 7.6 Code: geohash encode

Toàn bộ thuật toán gọn trong 25 dòng — và đọc nó một lần sẽ xoá sạch cảm giác "geohash là thứ gì đó huyền bí":

```python
BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"   # bỏ a, i, l, o

def geohash_encode(lat, lng, precision=6):
    lat_r, lng_r = [-90.0, 90.0], [-180.0, 180.0]
    out, nbits, ch = [], 0, 0
    even = True                     # True = đang chia kinh độ

    while len(out) < precision:
        rng, val = (lng_r, lng) if even else (lat_r, lat)
        mid = (rng[0] + rng[1]) / 2
        if val > mid:
            ch = (ch << 1) | 1;  rng[0] = mid    # nửa trên/phải → bit 1
        else:
            ch = (ch << 1);      rng[1] = mid    # nửa dưới/trái → bit 0

        even = not even             # đổi trục mỗi bit — mấu chốt!
        nbits += 1
        if nbits == 5:              # đủ 5 bit → một ký tự base32
            out.append(BASE32[ch]); nbits, ch = 0, 0

    return "".join(out)

# geohash_encode(37.776720, -122.416730, 6)  →  '9q8yyw'
```

Điểm đáng nhớ duy nhất trong đoạn code này là dòng `even = not even`. **Sự xen kẽ trục chính là toàn bộ thuật toán**; phần còn lại chỉ là tìm kiếm nhị phân tầm thường.

### 7.7 Code: dùng Redis GEO trực tiếp

Trong thực tế bạn hiếm khi tự cài geohash, vì **Redis đã có sẵn** — và nó cài geohash bên dưới một cách rất khéo: dùng **Sorted Set**, với `score` là geohash 52-bit dưới dạng số nguyên. Nhờ đó Redis có thể range-scan trên score để lấy ra một ô, và toàn bộ hạ tầng Sorted Set (đã tối ưu suốt 15 năm) được dùng lại nguyên vẹn.

```bash
# GHI — chú ý thứ tự LONGITUDE trước, LATITUDE sau (ngược thói quen "lat, lng")
GEOADD businesses:restaurant -122.416730 37.776720 "b_8fa21"

# ĐỌC — trong bán kính 500 m, sắp theo khoảng cách, lấy 20
GEOSEARCH businesses:restaurant FROMLONLAT -122.416730 37.776720 \
    BYRADIUS 500 m ASC COUNT 20 WITHCOORD WITHDIST
# → 1) "b_1c3d9"  "87.3421"  (-122.415900, 37.777120)

# Hình chữ nhật — hợp với viewport bản đồ hơn hình tròn
GEOSEARCH businesses:restaurant FROMLONLAT -122.4167 37.7767 BYBOX 2 1.5 km ASC

GEOHASH businesses:restaurant "b_8fa21"              # → "9q8yyw8x7h" (cache key)
GEODIST businesses:restaurant "b_8fa21" "b_1c3d9" m  # khoảng cách
```

> 💡 **`GEOSEARCH` đã tự xử lý boundary issue cho bạn.** Nó không chỉ đọc ô của bạn — nó tính ra các ô cần thiết (gồm cả lân cận), quét chúng, rồi lọc bằng khoảng cách thật. Đây là lý do nên dùng nó thay vì tự cài: bạn được cả thuật toán lẫn phần vá lỗ hổng, và kết quả **chính xác** chứ không phải xấp xỉ.

Hai điều cần biết trước khi tin tưởng hoàn toàn vào Redis GEO:

- **`COUNT n` không giảm công việc quét**, nó chỉ cắt bớt kết quả trả về. Redis vẫn phải duyệt hết các ô liên quan rồi mới sắp xếp. Ở một ô Manhattan với 6.000 business, `COUNT 20` vẫn tốn công như thường. (Có biến thể `COUNT n ANY` trả về sớm khi đủ `n` phần tử — nhanh hơn nhiều nhưng **không đảm bảo là n cái gần nhất**, chỉ dùng khi bạn thật sự không cần thứ tự chính xác.)
- **Không lọc được theo thuộc tính.** Không có cách nào nói "chỉ lấy nhà hàng đang mở cửa". Cách vòng: **tách key theo loại** (`businesses:restaurant`, `businesses:atm`) như ví dụ trên, rồi lọc phần còn lại ở tầng ứng dụng. Xem thêm §9.3.

### 7.8 Vì sao geohash thắng ở bài này

Mỗi ưu điểm của nó **ánh xạ thẳng vào một yêu cầu ở §1**: không cần build cấu trúc (server khởi động tức thì, deploy không đau — trái ngược quadtree ở §8.3); cập nhật một điểm là O(1) và không ảnh hưởng điểm khác (200K cập nhật/ngày thoải mái); là một **chuỗi** nên làm được cache key, partition key và prefix scan; hợp đúng dạng truy vấn "trong bán kính r"; và có sẵn trong Redis, PostGIS, OpenSearch, DynamoDB nên không phải tự cài.

Nhược điểm duy nhất đáng kể — **không thích ứng theo mật độ** — được vá bằng hai mẹo rẻ tiền: chọn độ dài theo bán kính (§7.2) và nới prefix khi thiếu kết quả (§7.5). Với dữ liệu gần như tĩnh, đó là cuộc đổi chác quá hời.

---

## 8. Deep dive 4 — Quadtree và Google S2

### 8.1 Quadtree: để dữ liệu tự quyết định kích thước ô

Quadtree sửa đúng cái mà geohash không sửa được: thay vì áp một kích thước ô lên toàn thế giới, nó **chia nhỏ chỗ nào đông, để nguyên chỗ nào vắng**.

Luật xây cây gọn trong một câu: **nếu một node chứa nhiều hơn N business (thường N = 100), tách nó thành 4 con và phân phát business xuống; lặp lại cho đến khi mọi lá đều ≤ N.**

```
        ROOT (cả thế giới, 200M)  > 100 → tách
      ┌────────┬────────┬────────┐
    Tây Bắc  Đông Bắc  Tây Nam  Đông Nam
     (48M)    (61M)     (12M)    (79M)     … tách tiếp …
        │
     Bắc Mỹ → California → San Francisco → Downtown  (vẫn >100, tách tiếp)
                                              │
                                  ┌───────┬───┴───┬───────┐
                                87 biz  94 biz  61 biz  78 biz   ← LÁ ≤ 100, dừng
```

Kết quả là bản đồ **có độ phân giải biến thiên**: lá ở downtown San Francisco rộng 100 m, lá giữa sa mạc Nevada rộng 200 km, nhưng **cả hai đều chứa dưới 100 business**. Đúng điều ta muốn từ đầu: **chia đều công việc, không chia đều không gian** — và hệ quả là **thời gian truy vấn gần như hằng số bất kể mật độ** (Manhattan đi sâu 14 tầng rồi lấy 100, Nevada đi sâu 6 tầng rồi lấy 100), trong khi geohash cùng một độ dài ô thì Manhattan trả 6.000 còn Nevada trả 0.

Và đây là chỗ quadtree vô địch: **k-nearest neighbors** — "5 trạm xăng gần nhất, không giới hạn bán kính". Geohash phải đoán bán kính, tra, thiếu, nới, tra lại. Quadtree đi xuống lá chứa điểm truy vấn, thu ứng viên, rồi **leo ngược lên** và chỉ duyệt nhánh anh em nào có bounding box gần hơn kết quả tệ nhất hiện tại (branch-and-bound). Không đoán, không lặp.

### 8.2 Quadtree tốn bao nhiêu RAM

Đây là câu hỏi quyết định quadtree có khả thi hay không, nên phải tính chứ không đoán.

```
Số node LÁ ≈ 200.000.000 business ÷ 100 mỗi lá ≈ 2.000.000 lá
  (thực tế nhiều hơn vì lá không đầy hoàn toàn, ước ~2,5M)

Cây 4 nhánh: số node trong ≈ số lá / 3 ≈ 0,8M
  → tổng ~3 triệu node

Bộ nhớ:
  Node trong:  4 con trỏ (32 B) + bounding box (32 B) + header ≈ 100 B
               0,8M × 100 B ≈ 80 MB
  Node lá:     header + mảng 100 business_id (8 B mỗi cái) ≈ 850 B
               2,5M × 850 B ≈ 2,1 GB
  ─────────────────────────────────────────
  Tổng ≈ 2,2 GB  (thực tế 2–5 GB tuỳ ngôn ngữ và overhead con trỏ)
```

**Kết luận: vừa RAM một máy** — instance 16 GB chứa thoải mái. Điều đó quan trọng vì quadtree **bắt buộc nằm trọn trong RAM một tiến trình**: không có cách hợp lý nào phân tán một cây con trỏ qua nhiều máy mà vẫn nhanh (14 tầng mà mỗi tầng một lời gọi mạng thì hết cửa). Với ngôn ngữ có GC, hãy dùng biểu diễn "phẳng" — cây lưu trong một mảng `int[]`, chỉ số thay con trỏ — để 3 triệu object thành 1 object và xoá sạch áp lực GC.

### 8.3 Nhược điểm chí mạng: cập nhật

Đây là chỗ quadtree trả giá cho sự thông minh của nó.

**Với geohash**, thêm một business là: tính geohash, `SADD` vào một set. Xong. Không có gì khác trong hệ thống thay đổi.

**Với quadtree**, thêm một business là: đi từ gốc xuống lá, thêm vào lá, nếu lá vượt N thì **tách thành 4 con** và phân phối lại; xoá thì có thể phải gộp 4 lá anh em. Mọi thao tác đó **sửa cấu trúc cây trong lúc truy vấn khác đang đọc** → cần khoá hoặc copy-on-write.

Tệ hơn: **mỗi LBS server giữ một bản cây độc lập.** 50 server là 50 bản phải giống nhau — cập nhật một business nghĩa là cập nhật 50 cấu trúc dữ liệu trên 50 tiến trình, hoặc rebuild cả 50.

**Thời gian build**: dựng cây là O(n log n) với n = 200 triệu. Trong thực tế, **vài phút** (3–10 phút tuỳ máy và tuỳ có phải đọc từ DB không). Và đây là hệ quả vận hành đau nhất:

> ⚠️ **Trong lúc dựng cây, server KHÔNG phục vụ được traffic.** Với 50 server, nếu bạn deploy một lượt thì hệ thống chết 5 phút. Nên: **rolling deploy từng nhóm nhỏ** (10–20% một lượt), health check phải **đợi cây build xong** mới báo healthy, và load balancer phải tôn trọng health check đó. Nếu instance khởi động trong autoscaling group, nhớ đặt **health check grace period đủ dài** (ví dụ 600 s) — nếu không, ASG sẽ thấy instance "unhealthy" sau 5 phút, giết nó, tạo cái mới, cái mới lại build 5 phút, và bạn có một vòng lặp giết instance vĩnh viễn. Đây là sự cố kinh điển và rất khó chẩn đoán nếu chưa gặp bao giờ.

Hai chiến lược cập nhật, không có cái nào hoàn hảo:

| Chiến lược | Cách làm | Ưu | Nhược |
|---|---|---|---|
| **Rebuild định kỳ** | Job đêm dựng cây mới từ DB, đẩy ra dạng snapshot; server tải snapshot lúc khởi động | Đơn giản, không cần khoá, cây luôn cân bằng tối ưu | Dữ liệu trễ tới 24 h; rolling restart để áp dụng |
| **Cập nhật tại chỗ** | Sửa cây trực tiếp khi có sự kiện thay đổi | Gần realtime | Cần khoá (đọc-ghi đồng thời), cây dần mất cân bằng, khó debug, mỗi server có thể lệch nhau |

Với bài này — dữ liệu gần như tĩnh — **rebuild định kỳ thắng rõ ràng**. Nhưng hãy chú ý: chiến lược ấy chỉ hợp lý **nhờ giả định ở §1**. Đổi giả định thành "vị trí thay đổi mỗi 5 giây" (bài nearby friends) thì quadtree **sụp hoàn toàn** — bạn không thể rebuild một cây 200 triệu node mỗi 5 giây, và cũng không thể khoá nó hàng nghìn lần mỗi giây.

### 8.4 Google S2 và Hilbert curve

S2 là cách tiếp cận tinh vi nhất trong ba cái, và ý tưởng cốt lõi của nó khác hẳn:

1. **Chiếu mặt cầu Trái Đất lên 6 mặt của một hình lập phương** bao quanh nó. Đây là bước quan trọng nhất và ít được nhắc tới: nó **loại bỏ vấn đề méo ở hai cực** mà geohash mắc phải, vì ta không còn chia một hình chữ nhật phẳng giả vờ là mặt cầu.
2. **Trên mỗi mặt, chia đệ quy thành 4** (giống quadtree, nhưng theo quy tắc cố định — thuộc họ hash, không phụ thuộc dữ liệu), tới 30 mức. Mức 30 cho ô cỡ **1 cm²**.
3. **Đánh số các ô theo thứ tự Hilbert curve**, không phải theo thứ tự xen kẽ bit như geohash. Kết quả là mỗi ô có một **`cell_id` kiểu int64** duy nhất.

**Hilbert curve là gì và vì sao nó hơn?** Nó là đường gấp khúc đi qua **mọi ô** của lưới đúng một lần, xây đệ quy từ hình chữ U xoay. Tính chất quyết định: **hai ô liền nhau trên đường Hilbert thì luôn kề nhau về mặt hình học** (chung một cạnh). Đường xen kẽ bit của geohash — **Z-order curve** (Morton order) — **không** có tính chất đó: nó có những cú "nhảy" hình chữ Z dài, khiến hai ô liền kề trên trục 1D lại cách rất xa trong 2D.

```
  Z-order (geohash)            Hilbert (S2)
  ┌───┐   ┌───┐                ┌───┐   ┌───┐
  │ 0 │→ │ 1 │                │ 0 │→ │ 3 │
  └───┘   └───┘                └─┬─┘   └─▲─┘
    ↘       ↙  ← cú nhảy dài      ↓       │  ← không bao giờ nhảy
  ┌───┐   ┌───┐                ┌─▼─┐   ┌─┴─┐
  │ 2 │→ │ 3 │                │ 1 │→ │ 2 │
  └───┘   └───┘                └───┘   └───┘
```

Hệ quả: **S2 ít bị boundary issue hơn geohash**, và quan trọng hơn, **phủ một vùng hình dạng bất kỳ hiệu quả hơn nhiều**. Đây là siêu năng lực của nó, gọi là **region covering**: đưa vào một đa giác bất kỳ (khu vực giao hàng, ranh giới một quận, vùng phủ sóng) kèm `min_level`, `max_level`, `max_cells`, nó trả về một tập ô **kích thước khác nhau** phủ vừa khít — ô lớn ở giữa, ô nhỏ dần ở rìa để bám đường biên.

Vì sao điều đó quý? Vì câu hỏi **"điểm P có nằm trong vùng R không?"** — bài toán **geofencing** — trở thành: tính `cell_id` của P ở max_level, rồi kiểm tra xem nó có nằm trong một trong các khoảng `cell_id` của cover không. Một phép so sánh số nguyên, thay vì thuật toán point-in-polygon. Đó là nền tảng của "thông báo khi bạn đến gần cửa hàng", "tính phí theo khu vực", "chỉ hiện tài xế trong vùng hoạt động".

**Nhược điểm của S2**: phức tạp hơn hẳn, nhiều khái niệm phải học (`S2CellId`, `S2Cap`, `S2RegionCoverer`), và **không nên tự cài** — dùng thư viện chính thức. Với bài toán chỉ cần "trong bán kính r", toàn bộ sự tinh vi đó không mang lại lợi ích tương xứng.

> 💡 **Quy tắc chọn, nói thẳng**: geohash cho **bán kính**, S2 cho **vùng**. Nếu yêu cầu của bạn chỉ có chữ "trong bán kính X mét", geohash là đủ và đơn giản hơn nhiều. Ngay khi xuất hiện chữ "trong khu vực này" với khu vực là một hình dạng thật — quận, phường, vùng giao hàng, biên giới — thì S2 là công cụ đúng và mọi thứ khác đều là chắp vá.

---

## 9. Deep dive 5 — Scale, cache và xếp hạng

### 9.1 Vì sao geo index nên nằm trong Redis, và có cần shard không

Nhắc lại hai con số: geo index ~**5–15 GB**, đọc:ghi ~**7.700:1**. Dữ liệu nhỏ nên **không cần shard vì dung lượng**; read-heavy cực đoan nên thêm bao nhiêu read replica cũng được, mỗi replica là một bản đầy đủ, không cần định tuyến thông minh, không có cross-shard query; ghi rất ít nên replication lag không bao giờ là vấn đề; và eventual consistency thì chấp nhận được. Kiến trúc thành ra rất buồn tẻ — một Redis primary nhận ghi từ Index Builder, N replica phục vụ LBS — và buồn tẻ ở đây là lời khen.

**Khi nào mới cần shard?** Không phải vì hết chỗ, mà vì throughput vượt một node (shard theo **prefix geohash** 2–3 ký tự đầu), vì muốn giảm blast radius (shard theo vùng địa lý), hoặc vì muốn đặt dữ liệu gần người dùng và tuân thủ data residency (triển khai theo region).

Shard theo prefix geohash có một tính chất rất tiện: **9 ô lân cận trong cùng một truy vấn hầu như luôn chung prefix ngắn**, nên rơi vào cùng shard. Một truy vấn = một shard, không scatter-gather.

> ⚠️ Nhưng nó cũng kế thừa đúng bệnh của even grid: **shard chứa Manhattan sẽ nóng gấp hàng trăm lần shard chứa Thái Bình Dương.** Cách chữa: đừng `hash % N`, hãy dùng **bảng ánh xạ prefix → shard** do bạn kiểm soát, để có thể tách riêng các prefix nóng ra shard riêng và di chuyển chúng khi cần. Và với dữ liệu nhỏ thế này, cách chữa rẻ nhất vẫn là: **đừng shard, nhân bản toàn bộ** — mọi replica đều có Manhattan.

### 9.2 Cache: vì sao khoá phải là geohash chứ không phải toạ độ

Bản năng đầu tiên là cache theo toạ độ: `cache["37.776720,-122.416730,500"]`. **Hit rate gần bằng 0**, vì GPS không bao giờ trả về cùng một con số hai lần (sai số 5–20 m, chữ số thập phân thứ sáu đổi mỗi lần đọc — hai người đứng cạnh nhau sinh hai key), vì người dùng di chuyển (đi bộ 3 m là key mới), và vì không gian khoá là số thực liên tục nên vô hạn.

Dùng **geohash làm khoá** thì cả ba vấn đề biến mất cùng lúc, vì geohash chính là **phép lượng tử hoá không gian**: mọi toạ độ trong ô 1,2 km × 0,6 km đều ánh xạ về **cùng một chuỗi**.

| Cache key | Value | TTL | Ghi chú |
|---|---|---|---|
| `geo:{geohash6}` | Danh sách `business_id` trong ô | dài (giờ) | Chỉ đổi khi có business thêm/xoá trong ô đó |
| `geo:{geohash6}:{type}` | Danh sách đã lọc theo loại | dài | Tránh đọc thừa rồi vứt (§9.3) |
| `biz:{business_id}` | Metadata đầy đủ | trung bình (phút) | Đổi khi chủ sửa; invalidate theo id — dễ |
| `biz:{business_id}:rating` | Rating + review count | ngắn (giây) | Đổi thường xuyên, tách riêng để không phải invalidate cả object |

Hit rate thực tế rất cao vì truy cập theo **luật lũy thừa**: cache 100K ô nóng nhất (vài trăm MB) phục vụ được 90%+ truy vấn.

> 💡 Hãy nhìn kỹ điều vừa xảy ra: geohash không chỉ là **cấu trúc index**, nó là **đơn vị lượng tử hoá** của toàn hệ thống — cache key, partition key, đơn vị invalidate, chiều để gom log và metric. Một khái niệm dùng lại ở năm tầng: dấu hiệu của một trừu tượng đúng.

### 9.3 Lọc theo thuộc tính: ba cách, chọn cái nào

Người dùng hiếm khi tìm "mọi thứ gần đây" — họ tìm **nhà hàng đang mở cửa, rating ≥ 4**. Đây là chỗ thiết kế dễ bị hỏng ngầm.

| Cách | Cách làm | Ưu | Nhược |
|---|---|---|---|
| **Lọc sau** | Lấy hết business trong 9 ô, đọc metadata, lọc trong bộ nhớ | Đơn giản, một index duy nhất | **Tệ khi tỉ lệ lọc cao**: ở Manhattan lấy 6.000 để giữ lại 30 → lãng phí 99,5% băng thông và CPU |
| **Index tách theo loại** | Mỗi loại một tập key: `geo:restaurant:{gh}` | Nhanh, lọc "miễn phí" vì đã lọc lúc ghi | Chỉ dùng được cho thuộc tính **rời rạc, ít giá trị, ít đổi** (loại business). Không dùng được cho rating hay giờ mở cửa |
| **Search engine** | OpenSearch/Elasticsearch với `geo_point` + bool filter | Lọc tuỳ ý, nhiều điều kiện, kết hợp cả full-text | Nặng hơn, chậm hơn Redis, phải vận hành thêm một cụm |

Cách thực tế là **kết hợp**: tách index theo `type` (vì đó là bộ lọc được dùng nhiều nhất và có ít giá trị), rồi lọc phần còn lại (rating, giờ mở cửa) sau khi đã đọc metadata từ cache.

**Giờ mở cửa là cái bẫy tinh vi nhất nhóm này.** `open_now` **không phải thuộc tính của business** mà là **hàm của (business, thời điểm, múi giờ)**: không tiền tính vào index được, vì kết quả đúng lúc 11 h thì sai lúc 15 h, và "bây giờ" ở Hà Nội khác "bây giờ" ở Paris. Nên lưu `opening_hours` có cấu trúc kèm **timezone của business** (không phải của người dùng, không phải UTC), tính `open_now` tại thời điểm request ở tầng ứng dụng, và **đừng cache trường đó**. Nhớ các ca lệch chuẩn: quán mở 22 h–2 h sáng (qua nửa đêm), ngày lễ, đóng cửa tạm thời.

### 9.4 Xếp hạng và phân trang

**Xếp hạng.** "Gần nhất" không phải "tốt nhất" — quán 50 m rating 2,1 thua quán 400 m rating 4,8. Điểm tổng hợp thực tế trông như:

```
score = w1 × f_distance(d)      # giảm dần theo khoảng cách, ví dụ 1/(1 + d/500)
      + w2 × normalize(rating)  # 0..1
      + w3 × log(review_count)  # nhiều review = đáng tin hơn
      + w4 × popularity         # lượt xem/lượt ghé gần đây
      + w5 × is_open_now        # đang mở thì hữu ích hơn hẳn
```

Dùng `f_distance` **giảm dần phi tuyến** thay vì `-d` tuyến tính: chênh lệch 50 m với 200 m rất quan trọng với người đi bộ, còn 4 km với 4,2 km thì gần như vô nghĩa.

> 💡 **Xếp hạng luôn diễn ra SAU khi đã lọc theo không gian**, trên một tập nhỏ (vài chục tới vài nghìn) — đừng để nó lẫn vào bước index. Index trả lời "cái nào gần"; xếp hạng trả lời "cái nào đáng hiện trước".

**Phân trang** — và đây là chỗ dễ sai nhất của cả bài:

> ⚠️ **`OFFSET` là sai trong bài này.** Giữa trang 1 và trang 2, người dùng **đã di chuyển**. Toạ độ đổi → tập ô đổi → thứ tự đổi. `OFFSET 20` trên một tập kết quả *khác* sẽ cho bạn kết quả trùng lặp và kết quả bị nhảy cóc. Đây không phải trường hợp hiếm — nó là **trường hợp bình thường**, vì người dùng của bạn đang đi trên đường.

Ba cách, theo thứ tự đáng dùng: **(1) neo truy vấn** — trang đầu trả về một `search_token` chứa toạ độ gốc, bán kính, bộ lọc và con trỏ; các trang sau dùng lại **đúng toạ độ gốc** đó, nhất quán và đúng kỳ vọng người dùng (họ đang duyệt kết quả của *chỗ họ đã tìm*). **(2) cursor theo khoảng cách** (`WHERE distance > last_distance`), nhớ tie-break bằng `business_id`. **(3) không phân trang** — trả 50 kết quả, client tự cuộn; với UI bản đồ đây thường là câu trả lời đúng.

---

## 10. Cập nhật index: batch hay incremental

Đường ghi của bài này rất thưa (2,3/giây), nhưng **cách bạn lan thay đổi đó vào index** là một quyết định kiến trúc thật sự.

### 10.1 Hai chiến lược

| | **Batch rebuild** | **Incremental** |
|---|---|---|
| Cách làm | Job định kỳ (mỗi đêm / mỗi giờ) đọc toàn bộ bảng `business`, dựng lại index, đẩy sang Redis/snapshot | Business Service ghi DB xong thì phát sự kiện; consumer cập nhật index ngay |
| Độ trễ | Giờ tới ngày | Giây |
| Độ phức tạp | Thấp — một job, chạy lại được, idempotent | Trung bình — cần message queue, retry, xử lý trùng, xử lý lệch |
| Khôi phục khi lỗi | **Chạy lại là xong** | Phải tìm và phát lại các sự kiện bị mất |
| Nguy cơ trôi (drift) | **Không có** — mỗi lần chạy là một lần đồng bộ lại từ nguồn sự thật | **Có** — sự kiện mất, xử lý sai, hay bug sẽ tích tụ âm thầm |
| Tài nguyên | Đợt lớn, chiếm CPU/IO trong lúc chạy | Đều, nhỏ |

### 10.2 Cách thực tế: dùng cả hai

Đây là mẫu thiết kế xuất hiện đi xuất hiện lại trong hệ thống thật, và nó chính là **kiến trúc Lambda** thu nhỏ:

```
Chủ cửa hàng sửa business
          │
          ▼
   Business Service ──▶ DB primary (nguồn sự thật)
          │
          ├──▶ Event queue ──▶ Index Updater ──▶ Redis geo index
          │    (incremental: vài giây, cho đường nhanh)
          │
          └──▶ (mỗi đêm) Batch Rebuilder đọc toàn bộ DB
                 ──▶ dựng index mới ──▶ hoán đổi nguyên tử
                 (đối chiếu và sửa mọi sai lệch tích tụ)
```

**Incremental lo trải nghiệm** (chủ quán sửa giờ mở cửa thì thấy hiệu lực gần như ngay); **batch lo tính đúng đắn** — nó không quan tâm incremental đã làm gì, cứ dựng lại từ nguồn sự thật, nên mọi sự kiện bị mất, mọi bug trong consumer, mọi lệch tích tụ đều bị xoá sạch sau mỗi lần chạy. Đó là cơ chế **tự chữa lành**, đáng giá hơn nhiều so với chi phí một cron job. Với **quadtree** thì batch không còn là lựa chọn mà là **bắt buộc** (§8.3).

**Mẹo hoán đổi nguyên tử với Redis**: đừng ghi đè key đang phục vụ. Dựng index mới vào một namespace mới (`geo:v42:*`), kiểm tra sanity (số lượng key, vài truy vấn mẫu so với bản cũ), rồi đổi một con trỏ duy nhất (`current_index_version = 42`). Rollback là đổi con trỏ về 41 — **một thao tác, tức thì**. Bản cũ giữ thêm một chu kỳ rồi mới xoá.

> ⚠️ **Bước sanity check không phải thủ tục hình thức.** Nếu job batch gặp lỗi và dựng ra một index có 3 triệu business thay vì 200 triệu, hoán đổi mù quáng sẽ biến "hệ thống hơi trễ" thành "hệ thống trả về rỗng cho 98% truy vấn". Quy tắc đơn giản và hiệu quả: **từ chối hoán đổi nếu số lượng lệch quá ±5% so với bản hiện tại**, và bắt con người xác nhận.

---

## 11. Bottleneck và failure mode

### 11.1 Cái gì nghẽn trước

Xếp theo thứ tự thực tế sẽ gặp:

| # | Nghẽn ở đâu | Triệu chứng | Cách gỡ |
|---|---|---|---|
| 1 | **Ô nóng (hot cell)** — Manhattan giờ ăn trưa | p99 của một số geohash cao vọt, các ô khác bình thường | Dùng geohash **dài hơn** (ô nhỏ hơn) cho vùng đông; cache riêng ô nóng; giới hạn số kết quả tối đa |
| 2 | **Đọc metadata (fan-out)** — 1 search = 1 tra index + N tra business | N tăng thì latency tăng tuyến tính | `MGET` gom lô thay vì N lần gọi; cache; **lưu sẵn trường tối thiểu (id, toạ độ, rating) ngay trong geo index** để khỏi phải tra |
| 3 | **Job batch rebuild** | Đọc 200M row làm DB replica chậm hẳn trong lúc chạy | Chạy trên **replica riêng cho analytics**, vào giờ thấp điểm, đọc theo lô kèm throttle |
| 4 | **CPU tính khoảng cách** | Haversine cho 6.000 điểm × 5.800 QPS | Lọc bằng **bounding box rẻ** trước rồi mới Haversine; so sánh bình phương khoảng cách để khỏi tính `sqrt` |

> 💡 Điểm số 2 đáng nhấn mạnh vì nó là **tối ưu hiệu quả nhất của cả bài mà ít người nghĩ tới**: nếu geo index lưu sẵn `(business_id, lat, lng, type, rating)` thay vì chỉ `business_id`, thì LBS **lọc và sắp xếp xong toàn bộ mà không cần đọc bảng business một lần nào**. Chỉ 20 kết quả cuối cùng mới cần đọc metadata đầy đủ. Đánh đổi: index phình từ 5 GB lên ~15 GB (vẫn vừa RAM), và phải cập nhật index khi rating đổi. Gần như luôn xứng đáng.

### 11.2 Component chết thì sao

| Chết cái gì | Hậu quả | Hành vi mong muốn |
|---|---|---|
| **Một LBS instance** | Không ảnh hưởng — stateless | LB loại nó ra, instance mới lên. ⚠️ Nếu dùng quadtree, **grace period phải dài hơn thời gian build** (§8.3) |
| **Redis primary / replica** | Mất replica = mất một phần công suất đọc; mất primary = **không ghi được index nhưng đọc vẫn chạy** | Automatic failover; giữ dư ít nhất một replica. Vài phút không cập nhật index thì người dùng cuối không nhận ra |
| **Toàn bộ Redis** | Search chết | **Fallback: truy vấn bounding box trên DB replica** — chậm (vài trăm ms), nhưng *có kết quả* còn hơn trang lỗi. Kèm cầu dao (circuit breaker) để đường fallback không giết luôn DB |
| **DB primary** | Không CRUD được business | Search và xem chi tiết **vẫn hoạt động đầy đủ** (đọc từ replica + cache). Chỉ chủ cửa hàng bị ảnh hưởng — đúng người ít quan trọng nhất trong 3 nhóm |
| **Index Updater / queue** | Index đứng yên, dần cũ | Cảnh báo theo **tuổi của dữ liệu index**, không phải theo độ dài hàng đợi. Batch rebuild sẽ tự chữa (§10.2) |
| **Một AZ / region** | Mất một phần công suất | LBS stateless + index nhỏ ⇒ **mỗi region giữ một bản đầy đủ**. Đây là món quà của việc index chỉ 5 GB: replication toàn cầu gần như miễn phí |

> 💡 **Tính chất đẹp nhất của kiến trúc này**: cả hệ thống đọc **suy giảm từ từ chứ không sụp đổ**, vì mọi tầng đều là bản sao chỉ-đọc của dữ liệu ít đổi. Không có tầng nào giữ trạng thái mà mất là mất luôn. Trạng thái duy nhất phải-đúng nằm ở DB primary — nơi chịu **2,3 ghi mỗi giây**. Nói câu đó ra trong phỏng vấn cho thấy bạn đã nhìn ra hình dạng thật của bài toán.

### 11.3 Quyền riêng tư — đừng bỏ qua

Toạ độ người dùng là dữ liệu nhạy cảm theo GDPR/CCPA và bài này chạm vào chúng ở mọi request. Ba quy tắc tối thiểu: **đừng log toạ độ thô gắn với user id** (nếu cần phân tích thì log geohash length 5–6 — đủ đo phân bố tải, không đủ lần ra nhà ai); **đừng lưu lịch sử vị trí** trừ khi có tính năng cần và người dùng đồng ý rõ ràng, vì ở bài này vị trí là *tham số của request* chứ không phải trạng thái; và **đặt TTL cho mọi thứ dính vị trí** trong cache lẫn log — mặc định xoá, không mặc định giữ.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Geo index chính (geohash → business ids) | **ElastiCache for Redis/Valkey**, dùng `GEOADD` / `GEOSEARCH` / `GEOHASH` | Đúng cấu trúc cần: sorted set với score là geohash 52-bit. Cluster mode cho throughput, read replica cho đọc. 5–15 GB vừa một `cache.r7g.xlarge`. ⚠️ `GEOSEARCH ... COUNT n` vẫn quét hết ô — dùng `ANY` nếu chấp nhận kết quả không sắp xếp tuyệt đối |
| Bảng `business` (nguồn sự thật) | **Aurora PostgreSQL** (hoặc MySQL) primary + nhiều read replica | 200 GB, ghi 2,3/s, đọc rất nhiều → đúng bài của primary-replica. Aurora tách compute/storage nên thêm replica nhanh và rẻ |
| Truy vấn không gian **ngay trong SQL** | **Aurora PostgreSQL + PostGIS**, `GEOGRAPHY` + **GiST index**, `ST_DWithin` | Khi bạn không muốn vận hành thêm index riêng. GiST là R-tree — giải đúng bài toán hai chiều ở §5 bên trong database. ⚠️ Chậm hơn Redis vài lần và tốn kết nối DB, nhưng **là fallback tuyệt vời** khi Redis chết (§11.2) và là lựa chọn đúng ở quy mô nhỏ hơn |
| Geo index dạng serverless, không phải vận hành node | **DynamoDB** với **geohash prefix làm partition key**, `business_id` làm sort key | Mẫu này chính là thứ thư viện `dynamodb-geo` cài đặt: lưu `hashKey` (geohash cắt ngắn) + `geohash` đầy đủ, truy vấn bằng `Query` trên vài ô lân cận rồi lọc. Scale tự động, trả tiền theo request, không có node để patch. ⚠️ Coi chừng **hot partition** ở các ô đô thị — cắt prefix dài hơn cho vùng đông |
| Lọc nhiều điều kiện + tìm kiếm văn bản + geo | **OpenSearch Service**, field `geo_point`, query `geo_distance` / `geo_bounding_box` / `geo_shape` | Khi yêu cầu vượt quá "trong bán kính r": lọc theo rating, loại, giá, **cộng** tìm theo tên. `geo_shape` làm được cả geofence đa giác. ⚠️ Nặng hơn Redis nhiều, chỉ dùng khi thật sự cần |
| Geocoding địa chỉ → toạ độ, bản đồ, geofence sẵn | **Amazon Location Service** | Đường ghi cần biến "123 Lê Lợi, Q1" thành `(lat, lng)`; tự làm thì vừa sai vừa tốn. Có sẵn Tracker + Geofence Collection nếu sau này cần vị trí động |
| Tầng API cho LBS | **API Gateway + Lambda** (khởi đầu) hoặc **ALB + ECS/EKS** (quy mô lớn) | Lambda hợp vì LBS stateless và tải lệch theo giờ. ⚠️ Nhưng nếu dùng **quadtree in-memory** thì Lambda **sai hoàn toàn** — không thể build cây 5 phút trong một hàm chạy tối đa 15 phút và mất state giữa các lần gọi. Quadtree ⇒ ECS/EKS với instance sống lâu |
| Sự kiện "business đã đổi" → cập nhật index | **DynamoDB Streams** / **Aurora → DMS** → **EventBridge** → **SQS** → Lambda | Đường incremental ở §10.2. SQS + DLQ để sự kiện lỗi không biến mất âm thầm. Ở 2,3 sự kiện/giây thì chi phí gần bằng không |
| Batch rebuild index hằng đêm | **AWS Glue** / **EMR**, hoặc đơn giản là **ECS scheduled task** | Đọc 200M row và dựng index là việc theo lô. ⚠️ Đọc từ **replica riêng cho analytics**, đừng đụng replica đang phục vụ người dùng |
| Cache metadata business | **ElastiCache**, hoặc **DAX** nếu nguồn là DynamoDB | 12.000 QPS đọc chi tiết với phân bố lũy thừa ⇒ hit rate rất cao. DAX là cache write-through gắn sẵn, không phải viết code |
| Ảnh và tài nguyên tĩnh của business | **S3 + CloudFront** | Ảnh **không bao giờ** đi qua application server. CloudFront cũng cache luôn response của các truy vấn geo phổ biến ở tầng biên — ⚠️ nhưng TTL phải ngắn (30–60 s) và **đừng cache theo toạ độ thô**; chuẩn hoá về geohash ở CloudFront Function trước khi làm cache key |
| Phục vụ nhiều region, giảm latency | **Aurora Global Database** + **ElastiCache Global Datastore**; **Route 53 latency-based routing** | Index chỉ 5–15 GB nên **mỗi region giữ một bản đầy đủ** — replication toàn cầu gần như miễn phí. Đây là hệ quả trực tiếp của con số ở §2 |
| Bảo vệ trước truy vấn phá hoại | **WAF rate limiting** + validate tham số ở API Gateway | Chặn `radius` quá lớn và chặn quét toạ độ hàng loạt (cào toàn bộ business bằng cách quét lưới) — mối đe doạ thật với dữ liệu địa điểm |
| Quyền riêng tư vị trí | **CloudWatch Logs** với log đã làm tròn về geohash; **KMS**; **S3 lifecycle** để tự xoá | §11.3. Đặt TTL/lifecycle ngay từ ngày đầu; sau này đi gỡ ra thì đã muộn |

**Ba câu chốt đáng nhớ:**

1. *"Toàn bộ geospatial index của 200 triệu business chỉ khoảng 5–15 GB — vừa RAM một máy. Nên tôi **không shard vì dung lượng**; tôi nhân bản nó ra mọi region và mọi replica. Quyết định kiến trúc lớn nhất của bài này đến từ một phép nhân đơn giản."*
2. *"Tôi dùng geohash làm nhiều hơn một cấu trúc index: nó là cache key, là partition key, là đơn vị invalidate, và là chiều để gom metric. Một khái niệm dùng lại ở năm tầng."*
3. *"ElastiCache Redis GEO cho đường nóng, PostGIS trên Aurora làm đường lui khi Redis chết. Hai hệ dùng cùng một mô hình dữ liệu nên fallback không cần code lại logic — chỉ đổi chỗ hỏi."*

---

## Cách trình bày khi phỏng vấn / review

1. **Mở bằng việc đặt lại bản chất bài toán**, đừng vẽ box ngay: *"Đây không phải bài scale — 5.800 QPS thì vài chục máy là xong. Đây là bài **cấu trúc dữ liệu**: B-tree index chỉ nhanh trên một chiều, mà tìm kiếm không gian là hai chiều. Cả bài là các cách ép 2D xuống 1D mà vẫn giữ được tính gần nhau."* Câu này định khung toàn bộ phần còn lại và tách bạn khỏi những người sắp nói "dùng Elasticsearch".

2. **Dành nhiều thời gian nhất cho lý do SQL hai chiều chậm — và giải thích bằng hình, không bằng thuật ngữ**: *"Dải vĩ độ rộng 500 m là một vành đai chạy vòng quanh Trái Đất, chứa 20 triệu business. Dải kinh độ là một múi từ Bắc Cực xuống Nam Cực, cũng 20 triệu. Giao của chúng chỉ vài trăm — nhưng database buộc phải dựng ít nhất một trong hai tập khổng lồ trước khi biết điều đó."* Đây là chỗ ghi điểm mạnh nhất của bài.

3. **Chủ động bác bỏ composite index trước khi bị hỏi**: *"Người ta hay đề xuất index `(lat, lng)`. Nó không cứu được, vì khi cột trái là range predicate thì cột phải mất khả năng seek — chỉ còn dùng để lọc sau khi đã quét."* Một câu ngắn chứng minh bạn hiểu B-tree chứ không thuộc lòng mẹo.

4. **Trình bày các họ giải pháp như một cây quyết định, không như một danh sách**: hai họ — hash (quy tắc cố định, không phụ thuộc dữ liệu) và cây (thích ứng theo dữ liệu). Rồi chọn: *"Dữ liệu tĩnh + truy vấn bán kính cố định → geohash. Cần k gần nhất với mật độ rất lệch → quadtree. Cần geofence hình dạng bất kỳ → S2."* Việc chọn được và **nói ra tiêu chí chọn** quan trọng hơn việc biết cả bốn.

5. **Nêu even grid rồi giết nó bằng số cụ thể**: *"1 km² ở Manhattan có 6.000 business, 1 km² ở Nevada có 0. Lưới đều về hình học không bao giờ đều về tải — cùng một sai lầm với `hash % N` trong sharding."* Việc nối bài này với một bài khác cho thấy bạn có mô hình tư duy, không chỉ có ghi nhớ.

6. **Với geohash, nhớ nói cả hai cái bẫy — và nói rằng chúng là hai đầu của một cái cân**: boundary issue (hai điểm cách 20 cm hai bên xích đạo có **0 ký tự chung** — hệ quả không thể tránh của mọi space-filling curve, không phải bug) giải bằng **tìm cả 9 ô**; và không đủ kết quả ở vùng thưa, giải bằng **nới prefix từng bậc có chặn dưới**. Giải thích vì sao **đúng 8 hàng xóm là đủ**: vì ta đã chọn ô ≥ bán kính. Chi tiết đó cho thấy bạn hiểu chứ không chép.

7. **Ra con số 5 GB rồi rút ra kết luận kiến trúc từ nó**: *"200 triệu business, 24 byte mỗi entry, tức 5 GB. Toàn bộ index không gian của hành tinh vừa RAM một máy. Nên tôi không shard vì dung lượng — tôi nhân bản. Và vì nó nhỏ, mỗi region giữ một bản đầy đủ, replication toàn cầu gần như miễn phí."* Đây là ví dụ mẫu mực của việc **để estimation lái thiết kế**, thay vì tính xong rồi bỏ đó.

8. **Giải thích vì sao cache key là geohash chứ không phải toạ độ** — chỗ ghi điểm dễ mà nhiều người bỏ lỡ: *"GPS có sai số 5–20 m và người dùng thì đang đi bộ, nên toạ độ thô cho hit rate gần 0 và không gian khoá vô hạn. Geohash là phép lượng tử hoá: mọi điểm trong ô 1 km ánh xạ về cùng một khoá."* Rồi mở rộng: cùng khoá đó làm partition key, đơn vị invalidate và chiều gom metric.

9. **Đừng quên phân trang** — đây là chỗ hầu hết ứng viên trượt: *"`OFFSET` sai ở bài này, vì giữa trang 1 và trang 2 người dùng đã di chuyển, toạ độ đổi, tập ô đổi, thứ tự đổi. Tôi neo truy vấn vào toạ độ gốc trong một search token."* Nhận ra rằng **người dùng đang chuyển động** là dấu hiệu bạn đang nghĩ về sản phẩm chứ không chỉ về server.

10. **Với quadtree, nêu hệ quả vận hành chứ không chỉ cấu trúc**: *"Dựng cây mất vài phút, và trong lúc đó server không phục vụ được. Nên rolling deploy, health check phải đợi build xong, và ASG grace period phải dài hơn thời gian build — nếu không bạn có một vòng lặp giết instance vĩnh viễn."* Đây là loại kiến thức chỉ đến từ việc đã bị nó cắn một lần.

11. **Đóng lại bằng chiến lược cập nhật index**: *"Incremental cho trải nghiệm, batch rebuild hằng đêm cho tính đúng đắn. Batch không cần biết incremental đã làm gì — nó dựng lại từ nguồn sự thật nên mọi drift bị xoá sạch. Hoán đổi bằng cách đổi một con trỏ version, và từ chối hoán đổi nếu số lượng lệch quá 5%."*

> 💡 **Nguyên tắc cuối**: cả bài này là một câu duy nhất được đẩy tới cùng — **tìm kiếm không gian là bài toán hai chiều, còn mọi công cụ index ta có đều là một chiều; nên hãy ánh xạ 2D xuống 1D sao cho giữ được tính gần nhau, rồi vá chỗ ánh xạ bị hở bằng cách hỏi thêm các ô lân cận.** Geohash, quadtree, S2 chỉ là ba cách trả lời cùng một câu hỏi đó với ba mức đánh đổi khác nhau giữa **đơn giản** và **thích ứng**. Và ở bài toán cụ thể này — dữ liệu tĩnh, truy vấn bán kính, đọc gấp 7.700 lần ghi — **cái đơn giản nhất thắng**, bởi vì mọi lợi thế của cái phức tạp đều đang giải những vấn đề mà bài toán này không có.
