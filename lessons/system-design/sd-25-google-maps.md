# Case study: Google Maps — bản đồ, định tuyến & ETA

> Bài này khó không phải vì "tìm đường ngắn nhất" — thuật toán đó sinh viên năm hai đã học. Nó khó vì **quy mô biến thuật toán quen thuộc thành thứ không chạy nổi**: Dijkstra trên đồ thị 20 tỉ cạnh mất hàng chục giây cho một request, trong khi người dùng chờ 200 ms; bản đồ thế giới là hàng chục petabyte ảnh nhưng phải hiện ra trong nửa giây trên 4G yếu; và "thời gian tới nơi" không phải một phép chia quãng đường cho tốc độ, mà là một bài dự báo dựa trên dữ liệu chính điện thoại người dùng đang gửi về ngay lúc này.

Google Maps là case study hiếm hoi đụng **cả ba loại bài** cùng lúc: một bài **serving static content ở quy mô khổng lồ** (map tile), một bài **tính toán nặng trên đồ thị** (routing), và một bài **stream processing realtime** (traffic + ETA). Ba mảng này gần như không chia sẻ gì về kiến trúc — và chính chỗ đó là nơi người phỏng vấn muốn thấy bạn tách bạch được.

Giả định xuyên suốt bài: bạn đã nắm geohash / quadtree / S2 cell từ bài **Proximity Service** (sd-23). Ở đây ta chỉ nhắc lại đúng một câu: *thế giới được chia đệ quy thành bốn ô con, mỗi ô có một mã chuỗi, ô cha là tiền tố của ô con* — và dùng nó như công cụ, không giải thích lại.

---

## 1. Làm rõ yêu cầu

### Functional — chốt 3 mảng, bỏ phần còn lại

Google Maps thật có hàng chục tính năng (Street View, review địa điểm, đặt bàn, chỉ đường trong nhà, Live View AR...). Trong 45 phút phỏng vấn, ôm hết là tự sát. Chốt ba mảng, và nói rõ vì sao chọn ba mảng đó:

| Mảng | Gồm gì | Vì sao phải có |
|---|---|---|
| **Map rendering** | Hiện bản đồ theo vị trí + mức zoom, kéo/phóng mượt | Không có nó thì không phải "bản đồ". Đây là thứ **mọi** người dùng chạm vào, kể cả người không đi đâu cả |
| **Navigation & routing** | Từ A đến B, ra danh sách chỉ dẫn rẽ từng bước (turn-by-turn), nhiều travel mode | Đây là tính năng tạo giá trị lớn nhất và cũng là phần tính toán nặng nhất |
| **ETA & traffic** | Ước lượng thời gian tới nơi, cập nhật theo tình trạng giao thông, tự đổi đường khi tắc | Đây là thứ phân biệt Google Maps với một tấm bản đồ giấy. Cũng là mảng dùng dữ liệu người dùng nhiều nhất |

**Chốt bỏ (nói ra miệng, đừng im lặng bỏ):** tìm kiếm địa điểm / POI (đã có bài Proximity Service lo), review & ảnh địa điểm, multi-stop optimization (bài toán TSP, thuộc mảng enterprise), chỉ đường trong nhà, AR.

**Chốt giữ nhưng nói ngắn:** geocoding (địa chỉ ⇄ toạ độ) — vì nó nằm ngay đầu luồng navigation, không có nó thì không nhận được input dạng "1600 Amphitheatre Parkway".

### Non-functional — bốn ràng buộc, mỗi cái đẻ ra một quyết định

| Ràng buộc | Mức cụ thể | Quyết định kiến trúc nó ép ra |
|---|---|---|
| **Độ chính xác (accuracy)** | Chỉ đường sai = người dùng đi nhầm đường cao tốc, mất 20 phút. Nghiêm trọng hơn "feed load chậm" rất nhiều | Ưu tiên **đúng** hơn **nhanh** ở đường routing: chấp nhận 200–500 ms để ra route tốt, thay vì 50 ms ra route tệ |
| **Render mượt** | Kéo bản đồ phải 60 fps, tile mới xuất hiện < 100 ms | Tile phải ở gần người dùng ⇒ **CDN là kiến trúc chính**, không phải "optimization thêm vào sau" |
| **Tiết kiệm data & pin** | Điện thoại, thường là gói data giới hạn, GPS ngốn pin | Batch vị trí gửi lên, vector tile thay raster, tính toán một phần ở client, chế độ offline |
| **Availability & scale** | 1 tỉ DAU, phủ 99% thế giới | Không có "một database". Mỗi mảng có store riêng phù hợp bản chất của nó |

> 💡 **Nguyên tắc**: Ba mảng chức năng có **ba profile tải hoàn toàn khác nhau** — tile là read-only cực nặng nhưng bất biến; routing là compute-bound; location update là write-heavy. Đừng cố nhét chúng vào cùng một kiến trúc. Câu đầu tiên nên nói với người phỏng vấn chính là câu này.

### Giả định chốt

```
Người dùng          : 1 tỉ DAU
Thời lượng dùng     : ~35 phút/tuần/người  → ~5 phút/ngày/người
Dữ liệu bản đồ thô  : hàng TB raw (ảnh vệ tinh, khảo sát đường, dữ liệu bên thứ ba)
Tile đã render      : ~50 PB (sau nén; ước lượng chi tiết ở §2)
Số nút giao (node)  : ~vài trăm triệu trên toàn cầu
Số đoạn đường (edge): ~1–2 tỉ (mỗi đường 2 chiều = 2 cạnh có hướng)
Vị trí gửi lên      : mỗi 1–5 giây khi đang navigate, batch lại trước khi gửi
Tỉ lệ đang navigate : ~5% phiên dùng app là navigation thật sự
```

> ⚠️ **Bẫy phỏng vấn**: đừng nói "chúng ta lưu bản đồ thế giới trong database". Bản đồ không phải dữ liệu giao dịch. Nó là **artifact được build offline** — giống như bạn build một static site rồi đẩy lên CDN, chỉ là site đó nặng 50 petabyte.

---

## 2. Back-of-envelope estimation

Bài này có ba phép tính đáng giá, và mỗi phép tính dẫn thẳng tới một quyết định kiến trúc lớn. Làm đúng ba cái này là bạn đã ăn điểm phần estimation.

### 2.1 Số lượng tile — phép nhân 4 mũ z

Đây là con số nền của toàn bộ mảng rendering. Quy ước Web Mercator: **zoom level 0 = toàn thế giới trong đúng một tile 256×256 pixel**. Mỗi khi zoom thêm một bậc, mỗi tile bị chia thành 4 tile con (chia đôi theo chiều ngang, chia đôi theo chiều dọc).

```
Số tile ở zoom level z = 4^z   (tức 2^z × 2^z)

z = 0   : 4^0  = 1 tile               → cả thế giới
z = 1   : 4^1  = 4 tile
z = 2   : 4^2  = 16 tile
z = 5   : 4^5  = 1,024 tile           → cỡ quốc gia
z = 10  : 4^10 ≈ 1.05 triệu tile      → cỡ thành phố
z = 15  : 4^15 ≈ 1.07 tỉ tile         → cỡ khu phố
z = 20  : 4^20 ≈ 1.1 nghìn tỉ tile    → cỡ toà nhà / vạch kẻ đường

Tổng từ z=0 đến z=21:
  1 + 4 + 16 + ... + 4^21
  = (4^22 - 1) / 3 ≈ 5.87 × 10^12 tile   (~5.9 nghìn tỉ)
```

Nhìn phép tính này, ba điều lộ ra ngay:

1. **Chuỗi cấp số nhân bị chi phối bởi số hạng cuối.** Tổng ≈ 4/3 × (số tile ở zoom lớn nhất). Nghĩa là **hơn 99% chi phí lưu trữ nằm ở 2–3 zoom level sâu nhất**. Nếu cần cắt chi phí, cắt ở zoom sâu — ví dụ chỉ render z=20,21 cho vùng đô thị, sa mạc thì dừng ở z=16.
2. **Không thể render on-the-fly ở zoom sâu, cũng không thể precompute mù quáng ở zoom sâu.** Ta sẽ quay lại ở §4.4.
3. **Không tile nào được sinh cho đại dương và sa mạc theo cách bình thường.** ~70% bề mặt Trái Đất là nước; tile nước là một ô xanh đồng nhất, nén xuống vài trăm byte hoặc dùng chung một tile duy nhất.

### 2.2 Dung lượng lưu trữ tile

```
Giả định tile PNG 256×256, đã nén: ~50–100 KB cho vùng có chi tiết
Lấy trung bình 50 KB (đã tính cả tile trống gần như 0 byte)

Nếu render đầy đủ mọi tile tới z=21:
  5.9 × 10^12 tile × 50 KB ≈ 2.9 × 10^17 byte ≈ 295 PB    ← không khả thi

Sau khi loại bỏ / gộp tile đồng nhất (đại dương, sa mạc, rừng, băng):
  ~70% bề mặt là nước → gần như miễn phí
  thêm ~15% là vùng dân cư thưa, không render sâu
  => còn lại ~15% bề mặt cần render đầy đủ ở zoom sâu
  295 PB × 0.15 ≈ 44 PB   → làm tròn ~50 PB
```

Con số **~50 PB** chính là con số đề bài đưa ra, và đây là cách bạn *dẫn ra* nó thay vì đọc thuộc. Nó nói gì?

- 50 PB thì **không có database nào là lựa chọn đúng**. Đây là object storage (S3/GCS) + CDN. Không index, không transaction, không query — chỉ có `GET /tile/{z}/{x}/{y}.png`.
- 50 PB thì **không thể để CDN cache toàn bộ**. CDN chỉ giữ được phần nóng. May mắn là phân bố truy cập cực kỳ lệch: vài phần trăm tile (thành phố lớn) chiếm phần lớn lượt xem.
- 50 PB thì **rebuild toàn bộ là chuyện của nhiều ngày**, nên pipeline cập nhật phải là **incremental** (chỉ build lại tile bị ảnh hưởng), không phải full rebuild.

### 2.3 QPS — tile request và navigation request

```
--- Tile request ---
1 tỉ DAU × 5 phút/ngày dùng app
Một phiên xem bản đồ, người dùng kéo/zoom vài lần:
  ước lượng ~50–100 tile tải về mỗi phiên (viewport ~20 tile × vài lần đổi khung)
  → 1e9 × 60 tile = 6 × 10^10 tile request/ngày
  → 6e10 / 86,400 ≈ 700,000 tile QPS trung bình
  → peak ×3 ≈ 2 triệu tile QPS

=> 2 triệu QPS là con số KHÔNG origin server nào chịu được.
   Nhưng đây là static content → CDN gánh 95–99%.
   Origin chỉ thấy ~20,000–100,000 QPS (cache miss).

--- Navigation request ---
1 tỉ DAU × 5 phút/ngày = 5 tỉ phút navigation-ish/ngày
Vị trí gửi mỗi ~5s, nhưng batch lại gửi mỗi ~15–30s
  5e9 phút × 60 = 3 × 10^11 giây-người/ngày
  Nếu gửi 1 request mỗi 15 giây:
    3e11 / 15 = 2 × 10^10 request/ngày
    → 2e10 / 86,400 ≈ 230,000 QPS   → làm tròn ~200K QPS
    → peak ×5 (giờ cao điểm đi làm) ≈ 1 triệu QPS
```

Hai con số đáng nhớ: **~2 triệu tile QPS (CDN gánh)** và **~200K–1M location-update QPS (hệ ta gánh)**.

### 2.4 Bandwidth khi navigation — phép tính hay bị bỏ qua

Đề bài nhấn mạnh phép tính này vì nó quyết định **giao thức** và **kích thước payload**, hai thứ ảnh hưởng trực tiếp tới pin và gói cước của người dùng.

```
--- Hướng lên (client → server) ---
Một điểm vị trí: (lat float64, lng float64, timestamp int64, accuracy, heading, speed)
  ≈ 8 + 8 + 8 + 4 + 4 + 4 = 36 byte payload thô
  Đóng gói JSON thô: ~120–150 byte/điểm  ← lãng phí gấp 4 lần
  Đóng gói protobuf + delta encoding: ~12–20 byte/điểm

Gửi 1 điểm/5 giây, batch 15 giây = 3 điểm/batch:
  JSON:     3 × 130 + overhead HTTP header (~500–800 byte!) ≈ 1.2 KB / 15s
  Protobuf trên WebSocket: 3 × 16 + frame overhead ~6 byte ≈ 54 byte / 15s

  → chênh nhau ~22 lần, và phần lớn chênh lệch là HTTP header, không phải dữ liệu.

Tổng bandwidth vào hệ thống, lấy con số protobuf/WebSocket:
  1 triệu QPS peak × 54 byte ≈ 54 MB/s   → hoàn toàn tầm thường
  Nếu dùng JSON qua HTTP: 1e6 × 1.2 KB ≈ 1.2 GB/s → tốn kém thật sự, và tốn pin của 1 tỉ máy

--- Hướng xuống (server → client) trong một phiên navigation 30 phút ---
Route ban đầu (polyline mã hoá + chỉ dẫn rẽ): ~20–80 KB
Vector tile dọc đường: ~30 tile × 40 KB ≈ 1.2 MB
Cập nhật ETA / cảnh báo tắc: mỗi 30s × 60 lần × ~200 byte ≈ 12 KB
Reroute (nếu có, 1–2 lần): 2 × 40 KB = 80 KB
  Tổng ≈ 1.3–1.5 MB cho một chuyến 30 phút

Nếu dùng raster tile thay vì vector: 30 tile × 100 KB = 3 MB  → gấp ~2.5 lần
```

Ba kết luận rút thẳng ra từ bảng số này:

1. **HTTP header giết chết chúng ta, không phải dữ liệu vị trí.** Gói tin thật chỉ 36 byte mà header 600 byte. ⇒ dùng **kết nối lâu dài** (WebSocket, hoặc HTTP/2 với header compression), không phải POST rời rạc.
2. **Batch phía client là thắng lợi lớn nhất mà rẻ nhất.** Gom 3–6 điểm rồi gửi một lần: giảm số lần đánh thức radio của điện thoại — mà **đánh thức radio mới là thứ ngốn pin**, không phải byte truyền đi. Một lần bật radio LTE tốn năng lượng tương đương truyền vài chục KB.
3. **Vector tile tiết kiệm hơn một nửa băng thông tải xuống** so với raster — và đó chỉ là một trong các lý do nó thắng (§4.3).

### 2.5 Bảng tổng kết estimation

| Đại lượng | Con số | Dẫn tới quyết định |
|---|---|---|
| Tổng tile tới z=21 | ~5.9 nghìn tỉ | >99% ở 2–3 zoom sâu nhất ⇒ cắt chi phí ở đó |
| Storage tile | ~50 PB | Object storage + CDN, không phải DB; build incremental |
| Tile QPS | ~700K trung bình, 2M peak | CDN là kiến trúc chính, origin chỉ thấy cache miss |
| Location update QPS | ~200K trung bình, 1M peak | Write-heavy store (Cassandra/DynamoDB) + stream (Kafka/Kinesis) |
| Bandwidth lên | ~54 MB/s với protobuf; ~1.2 GB/s với JSON | Protobuf + WebSocket, batch phía client |
| Bandwidth xuống / chuyến 30 phút | ~1.4 MB (vector) vs ~3 MB (raster) | Vector tile |
| Routing graph trong RAM | ~1–2 tỉ cạnh × ~20 byte ≈ 20–40 GB nén | Không vừa một máy phổ thông ⇒ shard theo routing tile |

---

## 3. Nền tảng bản đồ — bốn khái niệm phải nắm trước khi thiết kế

Phần này ngắn, nhưng thiếu nó thì mọi thiết kế phía sau đều lơ lửng.

### 3.1 Toạ độ và phép chiếu (map projection)

Trái Đất là hình cầu (gần đúng: ellipsoid), vị trí biểu diễn bằng **vĩ độ (latitude)** — bao xa về phía bắc/nam, từ −90° tới +90° — và **kinh độ (longitude)** — bao xa về phía đông/tây, từ −180° tới +180°.

Màn hình thì phẳng. Việc trải mặt cầu lên mặt phẳng gọi là **phép chiếu bản đồ (map projection)**, và có một định lý toán học khó chịu: **không phép chiếu nào giữ được đồng thời cả góc, diện tích và khoảng cách**. Luôn phải hy sinh thứ gì đó.

| Phép chiếu | Giữ được | Hy sinh | Dùng khi |
|---|---|---|---|
| **Mercator** | Góc (conformal) — hình dạng địa phương đúng, hướng bắc luôn thẳng đứng | Diện tích — Greenland trông to bằng châu Phi (thực tế nhỏ hơn 14 lần) | Hàng hải, và... bản đồ web |
| **Equal-area** (Mollweide, Gall-Peters) | Diện tích đúng | Hình dạng méo mó | Bản đồ thống kê, mật độ dân số |
| **Equidistant** | Khoảng cách từ một điểm gốc | Mọi thứ khác | Bản đồ hàng không từ một sân bay |

Google Maps dùng **Web Mercator** — Mercator được đơn giản hoá (coi Trái Đất là hình cầu chứ không phải ellipsoid, để phép tính nhanh hơn) và cắt bỏ vùng cực (|lat| > ~85.05°) để bản đồ thành **hình vuông hoàn hảo**.

**Vì sao chọn Mercator dù nó bóp méo diện tích tệ đến vậy?** Ba lý do rất thực dụng, và đây là chỗ nên nói ra trong phỏng vấn:

1. **Bảo toàn góc là điều bắt buộc cho bản đồ điều hướng.** Khi bạn zoom vào một ngã tư, ngã tư đó phải trông giống thực tế — góc rẽ 90° phải hiện ra 90°. Nếu góc bị méo, chỉ dẫn "rẽ phải" trở nên vô nghĩa về mặt hình ảnh.
2. **Thế giới thành hình vuông ⇒ chia tile bằng luỹ thừa 2 là hiển nhiên.** Toàn bộ hệ tile 4^z ở §2.1 chỉ gọn gàng như vậy vì bản đồ là hình vuông. Đây là quyết định kỹ thuật ăn theo lựa chọn phép chiếu.
3. **Hệ số tỉ lệ chỉ phụ thuộc vĩ độ, không phụ thuộc kinh độ.** Nghĩa là tile ở cùng một hàng (cùng dải vĩ độ) có cùng tỉ lệ — mọi phép toán chuyển đổi đều đơn giản và cục bộ.

Cái giá phải trả — méo diện tích — **không quan trọng với bài toán này**, vì người ta dùng Google Maps để đi từ A tới B ở quy mô vài km, chứ không để so sánh diện tích Greenland với châu Phi. Đây chính là mẫu tư duy đánh đổi mà người phỏng vấn muốn nghe: *biết mình hy sinh gì, và biết vì sao thứ đó không quan trọng trong ngữ cảnh này.*

Công thức chuyển đổi, đáng nhớ vì nó xuất hiện ở cả client lẫn server:

```
Cho (lat, lng) và zoom level z:
  n = 2^z                                    # số tile mỗi chiều
  x_tile = floor( n × (lng + 180) / 360 )
  y_tile = floor( n × (1 − ln(tan(lat) + sec(lat)) / π) / 2 )

Ví dụ: (lat=10.7769, lng=106.7009) — Quận 1, TP.HCM — ở z=15:
  n = 32,768
  x = floor(32768 × (286.7009/360)) = floor(26,096.6) = 26,096
  y ≈ 15,585
  → tile URL: /tiles/15/26096/15585.pbf
```

> 💡 **Nguyên tắc**: Client tự tính được `(z, x, y)` từ vị trí và mức zoom — **không cần hỏi server**. Đây là điều làm cho tile trở thành static content thuần tuý, và là nền móng cho toàn bộ chiến lược CDN.

### 3.2 Geocoding — địa chỉ ⇄ toạ độ

**Geocoding** biến "1600 Amphitheatre Parkway, Mountain View" thành `(37.4224, −122.0842)`. Chiều ngược lại — từ toạ độ ra địa chỉ gần nhất — gọi là **reverse geocoding**, dùng khi hiển thị "Bạn đang ở gần Nguyễn Huệ".

Cách làm cốt lõi là **nội suy (interpolation)**: dữ liệu nguồn không cho biết chính xác số nhà 1600 nằm ở đâu, mà chỉ cho biết đoạn đường này có số nhà từ 1500 đến 1700 và hình học của đoạn đường đó. Muốn tìm số 1600 thì nội suy tuyến tính — nó nằm khoảng giữa đoạn. Vì thế geocoding đôi khi trỏ lệch vài chục mét; các địa chỉ "ROOFTOP" (đã khảo sát chính xác vị trí toà nhà) thì đúng hơn, và API thật có trả về trường `location_type` để phân biệt.

Về mặt hệ thống, geocoding là một **read-heavy key-value lookup có chuẩn hoá text nặng phía trước**: ta phải xử lý "Q1", "Quận 1", "District 1", viết sai chính tả, thiếu tỉnh thành. Đây là lookup nhanh, ghi rất hiếm ⇒ **Redis / in-memory index** là lựa chọn tự nhiên, với một search engine (OpenSearch) phía sau cho fuzzy matching.

### 3.3 Geohash — nhắc lại đúng một đoạn

Chia thế giới đệ quy thành 4 ô, mỗi ô lại chia 4, mã hoá đường đi xuống thành một chuỗi. Hai tính chất ta sẽ dùng liên tục ở bài này:

- **Ô cha là tiền tố của ô con.** `9q8yy` nằm trong `9q8y` nằm trong `9q8`. Điều này cho phép biểu diễn "một vùng ở độ phân giải bất kỳ" chỉ bằng cách cắt ngắn chuỗi — ta sẽ tận dụng nó cho cả routing tile phân cấp (§5) lẫn adaptive rerouting (§7.6).
- **Hai điểm gần nhau thường có tiền tố chung** (nhưng không phải luôn luôn — vấn đề đường biên, đã bàn ở sd-23).

Chi tiết geohash vs quadtree vs S2 nằm ở bài Proximity Service. Ở đây nó chỉ là **cách đặt tên cho ô** — cho map tile, cho routing tile, và cho khoá cache.

### 3.4 Tile — đơn vị của mọi thứ trong bài này

Từ khoá quan trọng nhất của bài: **tile không chỉ là ảnh**. Trong thiết kế này có **hai loại tile hoàn toàn khác nhau**, dùng chung ý tưởng chia ô nhưng phục vụ hai mục đích khác nhau. Nhầm lẫn hai thứ này là lỗi phổ biến nhất khi trình bày bài Google Maps:

| | **Map tile** (§4) | **Routing tile** (§5) |
|---|---|---|
| Nội dung | Hình ảnh / hình học để **vẽ** | Đồ thị nút–cạnh để **tính đường** |
| Người tiêu thụ | Client (trình duyệt, app) | Server (shortest-path service) |
| Kích thước | ~20–100 KB | ~vài trăm KB tới vài MB |
| Số lượng | Nghìn tỉ (mọi zoom) | Hàng chục triệu (3–4 cấp) |
| Đường phân phối | **CDN** | Object storage + cache trong RAM của routing server |
| Tần suất đổi | Hiếm (đổi khi bản đồ đổi) | Hiếm về cấu trúc, nhưng **trọng số cạnh đổi liên tục** |


---

## 4. API design

Ba mảng chức năng ⇒ ba nhóm API với ba đặc tính hoàn toàn khác nhau. Chính sự khác nhau đó là điều đáng nói ra.

```
### Nhóm 1 — Map tile (static, không auth theo user, cache mãi mãi)

GET /tiles/v{version}/{z}/{x}/{y}.pbf          # vector tile (mặc định)
GET /tiles/v{version}/{z}/{x}/{y}@2x.png       # raster tile, màn hình retina
    Cache-Control: public, max-age=2592000, immutable
    ETag: "v37-a1b2c3"
    → 200 với thân là Mapbox Vector Tile (protobuf) hoặc PNG/WebP
    → 204 No Content nếu tile trống hoàn toàn (đại dương)

   Lưu ý: KHÔNG có tham số query, KHÔNG có Authorization header ở đường nóng.
   Mọi thứ nằm trong path → CDN cache key đơn giản nhất có thể.
   Phiên bản (`v37`) nằm trong path để invalidation = deploy path mới, không
   cần purge CDN (xem §4.6).

### Nhóm 2 — Navigation (request/response, tính toán nặng, có auth)

POST /v1/routes
  body: {
    "origin":      {"lat": 10.7769, "lng": 106.7009},   # hoặc "address": "..."
    "destination": {"lat": 10.8231, "lng": 106.6297},
    "mode":        "driving" | "walking" | "cycling" | "transit",
    "prefs":       {"avoid": ["tolls", "highways", "ferries"],
                    "optimize": "time" | "distance" | "fuel"},
    "departure_time": "now" | <epoch>,      # để ETA dùng dự báo traffic
    "alternatives": true
  }
  → 200 {
      "routes": [{
        "summary": "Đường Điện Biên Phủ",
        "distance_m": 8420,
        "duration_s": 1260,                  # ETA có traffic
        "duration_in_traffic_s": 1680,       # ETA hiện tại
        "polyline": "_fhcFjbhgVuAwDsCal...", # encoded polyline, xem §4.5
        "legs": [{ "steps": [
            {"instruction": "Đi về hướng đông bắc trên Lê Lợi",
             "distance_m": 320, "duration_s": 48,
             "maneuver": "turn-right", "polyline": "..."} ]}],
        "route_tiles": ["9q8yy", "9q8yz", ...]   # dùng cho adaptive rerouting
      }],
      "route_id": "r_8f3a...",               # để theo dõi phiên navigation
      "expires_at": <epoch+300>              # route cũ hơn 5 phút thì tính lại
    }

GET /v1/geocode?address=1600+Amphitheatre+Parkway
GET /v1/reverse-geocode?lat=10.77&lng=106.70

GET /v1/eta?route_id=r_8f3a&progress_m=3200   # ETA nhẹ, không tính lại route

### Nhóm 3 — Navigation session (stateful, hai chiều, sống suốt chuyến đi)

WebSocket  wss://nav.example.com/v1/session

  client → server   { "t": "loc",
                      "route_id": "r_8f3a",
                      "pts": [ {"lat":..,"lng":..,"ts":..,"acc":12,"spd":8.3,"hdg":47},
                               {...}, {...} ] }        # batch 3–6 điểm

  server → client   { "t": "eta",     "remaining_s": 940, "arrival_ts": ... }
                    { "t": "traffic", "ahead_m": 1800, "delay_s": 420,
                                      "severity": "heavy" }
                    { "t": "reroute", "reason": "accident",
                                      "saving_s": 480, "route": {...} }
                    { "t": "snap",    "lat":.., "lng":.., "edge_id":..,
                                      "step_idx": 7 }   # kết quả map matching
```

Ba điều đáng chỉ ra khi trình bày API này:

1. **Tile API không có auth và không có query param.** Đó không phải lười — đó là cố ý, để CDN cache key là chuỗi path thuần. Thêm một `?key=abc` là bạn vừa phân mảnh cache thành hàng triệu bản sao (trừ khi cấu hình CDN bỏ qua query string, nhưng khi đó `key` cũng vô dụng). Chống lạm dụng làm ở tầng khác: referrer check, token ký ở URL path, hoặc rate limit theo IP ở edge.
2. **`/v1/routes` trả về `route_tiles`.** Đây là chi tiết nhỏ nhưng người phỏng vấn rất thích: danh sách ô mà route đi qua chính là thứ cho phép ta, khi có tai nạn ở ô `9q8yz`, tìm ngay ra ai đang đi qua đó mà không cần quét toàn bộ người dùng. Chi tiết ở §7.6.
3. **Phiên navigation là WebSocket, không phải polling.** Vì nó **hai chiều**: client đẩy vị trí lên liên tục, server đẩy cảnh báo tắc đường xuống bất chợt. Chi tiết so sánh ở §8.

---

## 5. High-level design

### 5.1 Kiến trúc tổng thể

```
                              ┌──────────────┐
                              │  Client app  │
                              │ (iOS/Android │
                              │   / Web)     │
                              └──┬───┬────┬──┘
             tile GET (HTTPS)    │   │    │  WebSocket (phiên navigation)
        ┌──────────────────────── ┘   │    └────────────────────────┐
        v                             │ HTTPS                       v
┌───────────────┐            ┌────────v────────┐          ┌──────────────────┐
│      CDN      │            │  API Gateway /  │          │  WebSocket layer │
│  (edge POPs)  │            │   Load balancer │          │  (sticky, stateful)
│  cache 95-99% │            └────────┬────────┘          └─────────┬────────┘
└───────┬───────┘                     │                             │
        │ cache miss        ┌─────────┼──────────┐                  │
        v                   v         v          v                  v
┌───────────────┐   ┌────────────┐ ┌────────┐ ┌────────────┐ ┌──────────────┐
│ Tile origin   │   │ Geocoding  │ │ Route  │ │    ETA     │ │  Location    │
│ (S3 / object  │   │  service   │ │planner │ │  service   │ │  service     │
│  storage)     │   └─────┬──────┘ └───┬────┘ └─────┬──────┘ └──────┬───────┘
└───────▲───────┘         │            │            │               │
        │                 v            v            v               v
        │          ┌────────────┐ ┌─────────────┐ ┌──────┐  ┌───────────────┐
        │          │  Geo index │ │Shortest-path│ │ ML   │  │ Message queue │
        │          │  (Redis)   │ │  service    │ │model │  │ (Kafka/Kinesis│
        │          └────────────┘ └──────┬──────┘ └──▲───┘  └───────┬───────┘
        │                                │           │              │
        │                          ┌─────v──────┐    │        ┌─────v────────┐
        │                          │  Routing   │    │        │   Stream     │
        │                          │  tile store│    │        │  processing  │
        │                          │ (S3+cache) │    │        │(Flink/Spark) │
        │                          └─────▲──────┘    │        └─────┬────────┘
        │                                │           │              │
        │                                │      ┌────┴──────┐       │ map matching
        │                                │      │ Historical│       │ + tổng hợp
        │                                │      │  traffic  │       v
        │                                │      │ warehouse │  ┌────────────┐
        │                                │      └───────────┘  │  Traffic   │
        │                                │                     │  weights   │
        │                                └─────────────────────┤  (Redis)   │
        │                                   đọc trọng số cạnh  └─────┬──────┘
        │                                                            │
   ┌────┴─────────────────────────────────────────────────────┐      │
   │        OFFLINE PIPELINE (chạy theo lô, không đồng bộ)    │      │
   │  Ảnh vệ tinh + Street View + dữ liệu bên thứ ba          │      │
   │  + báo cáo người dùng + dấu vết GPS tổng hợp             │<─────┘
   │        │                                                  │
   │        v                                                  │
   │  ┌──────────────┐    ┌────────────────┐                   │
   │  │ Tile renderer│    │ Graph builder  │                   │
   │  │  (EMR/Spark) │    │  + CH preproc  │                   │
   │  └──────┬───────┘    └───────┬────────┘                   │
   └─────────┼────────────────────┼────────────────────────────┘
             │ đẩy tile mới       │ đẩy routing tile mới
             v                    v
       (Tile origin)        (Routing tile store)
```

### 5.2 Vai trò từng thành phần — và vì sao nó ở đó

| Thành phần | Làm gì | Vì sao tách riêng |
|---|---|---|
| **CDN** | Phục vụ 95–99% tile request tại edge | 2 triệu QPS không thể về origin. Tile bất biến nên cache hit rate cực cao. Đây là **thành phần quan trọng nhất của mảng rendering**, không phải một optimization |
| **Tile origin (object storage)** | Nguồn sự thật cho tile đã render | Không cần tính năng database. Chỉ cần GET theo key, độ bền 11 số 9, và rẻ |
| **Geocoding service** | Địa chỉ ⇄ toạ độ | Read-heavy thuần, cache hit rate cao, tách ra để scale độc lập và để mảng routing không phải gánh chuẩn hoá text |
| **Route planner** | Điều phối: geocode → shortest-path → ETA → rank | Tầng orchestration mỏng. Tách ra để logic nghiệp vụ (avoid tolls, sắp xếp phương án) không lẫn vào code thuật toán |
| **Shortest-path service** | Chạy A\*/CH trên routing tile | **CPU-bound và memory-bound**, profile hoàn toàn khác mọi service khác. Phải scale theo CPU và cần máy nhiều RAM để giữ graph nóng. Nhốt riêng để không bị service khác tranh tài nguyên |
| **ETA service** | Biến "một chuỗi cạnh" thành "bao nhiêu phút" | Gọi ML model, phụ thuộc traffic realtime + lịch sử. Tách ra vì nó cần deploy model độc lập với nhịp deploy của routing |
| **Location service** | Nhận vị trí, ghi vào store, đẩy vào stream | Write-heavy 200K–1M QPS. Phải là service mỏng nhất hệ thống — nhận, validate, đẩy đi, xong |
| **Stream processing** | Map matching + tổng hợp tốc độ theo cạnh | Realtime, stateful, cửa sổ thời gian. Đây là nơi dữ liệu thô biến thành "đường này đang đi được 12 km/h" |
| **Traffic weight store** | Trọng số cạnh hiện tại | Ghi liên tục, đọc cực nhiều (mọi routing request). In-memory là bắt buộc |
| **Offline pipeline** | Build lại tile & routing graph | Chạy hàng giờ/ngày, hoàn toàn tách khỏi đường phục vụ. Sự cố ở đây không làm sập app |

> 💡 **Nguyên tắc**: Nhìn sơ đồ, thấy ngay **ba luồng dữ liệu không giao nhau ở đường nóng**: (1) client ↔ CDN cho tile, (2) client ↔ routing cho đường đi, (3) client → stream → traffic. Chúng chỉ gặp nhau ở hai điểm: traffic weight nuôi routing, và offline pipeline sinh ra cả tile lẫn graph. Vẽ được sự tách bạch này là bạn đã trình bày đúng bản chất bài toán.

---

## 6. Deep dive A — Map tile: vì sao chia ảnh, và chia thế nào

### 6.1 Vì sao không gửi cả bản đồ, cũng không render ảnh riêng cho từng người

Có đúng ba cách để đưa bản đồ lên màn hình người dùng, và hai cách đầu chết ngay ở phép tính đầu tiên:

| Cách | Ý tưởng | Vì sao hỏng |
|---|---|---|
| **Tải cả bản đồ về client** | Như game offline: nhét toàn bộ dữ liệu vào app | 50 PB. Không cần tính thêm gì nữa |
| **Render một ảnh riêng cho mỗi request** | Server nhận `(lat, lng, zoom, width, height)`, vẽ đúng khung hình đó rồi trả PNG | Mỗi request là một ảnh **khác nhau** ⇒ cache hit rate ≈ 0 ⇒ mỗi lần người dùng nhích bản đồ 1 pixel là một lần render. 700K QPS × render ảnh = cần hàng trăm nghìn máy chỉ để vẽ |
| **Chia thành tile cố định theo lưới** | Thế giới chia lưới theo zoom; client tải đúng những ô rơi vào khung nhìn rồi ghép lại như khảm | ✅ Cùng một ô được **hàng triệu người dùng chung** ⇒ cache được. Kéo bản đồ chỉ cần tải thêm vài ô ở rìa, không vẽ lại gì |

Điểm mấu chốt và cũng là câu đáng nói nhất trong phần này: **chia tile biến một bài toán render động thành một bài toán phân phối file tĩnh.** Bài toán render động cần hàng trăm nghìn CPU; bài toán phân phối file tĩnh thì ngành CDN đã giải xong từ hai thập kỷ trước với giá rẻ mạt. Đây là một ví dụ kinh điển của kỹ thuật *"đổi bài toán khó lấy bài toán đã có lời giải sẵn"*.

### 6.2 Lưới tile hoạt động thế nào

```
z = 0                z = 1                    z = 2
┌─────────┐          ┌────┬────┐              ┌──┬──┬──┬──┐
│         │          │0,0 │1,0 │              │  │  │  │  │
│  toàn   │   ───>   ├────┼────┤     ───>     ├──┼──┼──┼──┤
│  thế    │          │0,1 │1,1 │              │  │  │  │  │
│  giới   │          │    │    │              ├──┼──┼──┼──┤
└─────────┘          └────┴────┘              │  │  │  │  │
 1 tile               4 tile                  ├──┼──┼──┼──┤
 256×256px            mỗi tile vẫn 256×256px  │  │  │  │  │
                      → độ phân giải gấp đôi  └──┴──┴──┴──┘
                                               16 tile

Mỗi tile luôn 256×256 pixel. Zoom thêm 1 bậc = mỗi ô chia 4,
tổng pixel gấp 4 → độ chi tiết tuyến tính gấp đôi.
```

**Client tải bao nhiêu tile?** Đây là phép tính nhỏ nhưng đắt giá trong phỏng vấn:

```
Màn hình điện thoại: 1080 × 2340 pixel (logic ~390 × 844 pt)
Tile 256×256 px:
  theo chiều ngang: ceil(1080/256) + 1 = 6
  theo chiều dọc:   ceil(2340/256) + 1 = 11
  (+1 vì tile ở rìa bị cắt một phần → phải tải tile kế tiếp)
  → ~66 tile cho một khung nhìn đầy đủ ở màn hình lớn

Thực tế thấp hơn nhiều vì:
  - màn hình retina dùng tile @2x (512×512) → chỉ ~20 tile
  - app thường prefetch thêm 1 vòng tile quanh viewport để kéo mượt
  → ~20 tile hiển thị + ~16 tile prefetch ≈ 36 tile

Khi người dùng kéo bản đồ sang phải một khoảng bằng một tile:
  chỉ cần tải thêm 1 cột = ~5 tile, KHÔNG phải 36 tile.
  → đây chính là lý do bản đồ kéo mượt trên mạng kém.
```

> 💡 **Nguyên tắc**: Kích thước dữ liệu cần tải tỉ lệ với **chu vi vùng mới lộ ra**, không phải với diện tích khung nhìn. Đó là món quà miễn phí mà cách chia tile tặng cho ta, và là lý do nó tồn tại ở mọi hệ bản đồ web từ 2005 tới nay.

### 6.3 Raster tile vs vector tile — vì sao vector thắng

**Raster tile** là ảnh đã vẽ sẵn: PNG/WebP 256×256, server đã quyết định màu đường, cỡ chữ, ngôn ngữ nhãn, chủ đề sáng/tối. Client chỉ việc dán lên màn hình.

**Vector tile** là **mô tả hình học**: "có một đường polyline đi qua các điểm này, loại `motorway`, tên `Quốc lộ 1A`", "có một đa giác này, loại `park`". Client nhận mô tả và **tự vẽ** bằng GPU theo bộ style của riêng nó.

| Tiêu chí | Raster tile | Vector tile | Ai thắng |
|---|---|---|---|
| **Kích thước** | 50–100 KB/tile (ảnh nén) | 20–40 KB/tile (protobuf hình học) | **Vector**, ~2–3× nhẹ hơn. Với 1 tỉ DAU, đây là hàng petabyte băng thông mỗi ngày |
| **Xoay bản đồ** | Xoay ảnh → **chữ bị xoay ngược**, đọc không nổi | Client vẽ lại, chữ luôn nằm ngang | **Vector**, và đây là lý do quyết định cho navigation — khi lái xe, bản đồ xoay theo hướng đi |
| **Đổi theme (sáng/tối/xe hơi)** | Phải render **một bộ tile riêng cho mỗi theme** → nhân 50 PB lên 3 lần | Đổi style file phía client, cùng một tile | **Vector**, khác biệt sinh tử về chi phí lưu trữ |
| **Đa ngôn ngữ** | Mỗi ngôn ngữ một bộ tile → nhân thêm ~20 lần | Tile chứa cả `name:vi`, `name:en`, client chọn | **Vector**, và đây là lý do lớn nhất, xem §11 |
| **Zoom mượt giữa các bậc** | Phóng to ảnh → vỡ hình (pixelate) rồi mới nhảy sang tile mới | Vẽ lại theo tỉ lệ bất kỳ → nét ở mọi mức | **Vector** |
| **Chi phí CPU/pin ở client** | Gần như bằng không, chỉ dán ảnh | Phải parse + vẽ mỗi khung hình | **Raster** — đây là điểm yếu thật sự của vector |
| **Hỗ trợ máy cũ / trình duyệt cũ** | Chạy ở mọi nơi | Cần WebGL / GPU tử tế | **Raster** |
| **Ảnh vệ tinh** | Bắt buộc (ảnh thật thì không có "hình học") | Không áp dụng | **Raster** |
| **Độ phức tạp render phía server** | Render một lần, đơn giản | Cần toolchain phức tạp hơn, nhưng nhẹ hơn khi build | Hoà |

**Kết luận thực tế**: dùng **vector cho bản đồ đường phố** (mặc định) và **raster cho lớp ảnh vệ tinh** (không có lựa chọn khác), kèm **fallback raster** cho client cũ. Đây là đúng những gì Google Maps, Mapbox và Apple Maps đều làm.

> ⚠️ **Bẫy**: Đừng nói "vector tile nhẹ hơn nên ta dùng vector" rồi dừng lại. Lý do **nặng ký nhất** không phải kích thước mà là **chống nhân bản**: nếu bạn cần bản đồ ở 40 ngôn ngữ × 3 theme × 2 mật độ màn hình, raster buộc bạn render và lưu **240 bản** của 50 PB. Vector thì vẫn một bản. Đây là một phép nhân, không phải một cải thiện vài phần trăm.

### 6.4 Precompute (render trước) vs on-the-fly (render khi có request)

Nhớ lại §2.1: hơn 99% số tile nằm ở vài zoom sâu nhất, và phần lớn trong đó **sẽ không bao giờ có ai xem** (một ô 10m × 10m giữa rừng Amazon ở z=21).

| | Precompute toàn bộ | Render on-the-fly toàn bộ | **Hybrid (đáp án đúng)** |
|---|---|---|---|
| Cách làm | Build sẵn mọi tile, đẩy lên object storage | Chỉ giữ dữ liệu nguồn; render khi có request | Precompute z=0..~14, render động z≥15 rồi cache |
| Latency | Tốt nhất — chỉ là một lần đọc file | Kém — render mất 50–500 ms mỗi tile, mà một khung hình cần 20 tile | Tốt ở vùng nóng, chấp nhận được ở vùng hiếm |
| Chi phí lưu trữ | Khổng lồ, phần lớn lãng phí | Gần như bằng không | Vừa phải — z≤14 chỉ chiếm ~0.4% tổng số tile |
| Chi phí CPU | Một lần lúc build | Liên tục, tỉ lệ với traffic | Thấp — chỉ render phần đuôi dài |
| Cache hit rate | Không liên quan (đã là file) | Phụ thuộc hoàn toàn vào cache | Cao, vì vùng nóng đã precompute |
| Cập nhật bản đồ | Phải rebuild tile bị ảnh hưởng ở mọi zoom | Tự động đúng ngay | Rebuild ít tile hơn nhiều |

Phép tính biện minh cho hybrid:

```
Tile từ z=0 tới z=14 = (4^15 − 1)/3 ≈ 3.6 × 10^8 ≈ 360 triệu tile
So với tổng 5.9 × 10^12  →  chỉ 0.006% số tile!
Dung lượng: 360M × 50 KB ≈ 18 TB   ← precompute thoải mái, rẻ như cho

Nhưng 360 triệu tile này phục vụ bao nhiêu phần traffic?
  Người dùng phần lớn thời gian ở z=12–16 (xem khu phố / thành phố).
  z ≤ 14 phủ khoảng 60–70% lượt xem.
  Phần còn lại (z=15–21) render động + cache → cache hit rate vẫn rất cao
  vì vùng zoom sâu người ta xem là các thành phố, tập trung cực kỳ.
```

> 💡 **Nguyên tắc**: Khi phân bố truy cập lệch theo luật luỹ thừa (power law) và không gian khoá thì khổng lồ, **đừng vật chất hoá toàn bộ không gian khoá**. Vật chất hoá phần đầu, tính động phần đuôi, để cache nối hai phần lại. Đây cũng chính là mẫu bạn đã gặp ở Autocomplete (sd-15) và Ad Click Aggregation (sd-18).

Trong thực tế còn một biến thể quan trọng: với **vector tile**, người ta thường precompute sâu hơn (tới z=14–16) rồi để client **overzoom** — dùng tile z=14 để vẽ ở mức zoom 15, 16, 17 bằng cách nội suy hình học. Vì vector vẽ lại được ở tỉ lệ bất kỳ, chất lượng vẫn nét (chỉ là không có thêm chi tiết mới). Đây là mánh giảm số zoom level cần build đi 3–4 bậc — tức giảm số tile đi **64–256 lần**.

### 6.5 Vì sao CDN là kiến trúc, không phải optimization

Ba tính chất của map tile khiến nó là **trường hợp lý tưởng nhất có thể tưởng tượng** cho CDN:

1. **Bất biến (immutable).** Tile `/v37/15/26096/15585.pbf` không bao giờ đổi nội dung — muốn đổi thì tăng version. ⇒ `Cache-Control: max-age=31536000, immutable`, không cần revalidate, không có bài toán invalidation.
2. **Dùng chung tuyệt đối.** Mọi người ở Quận 1 tải cùng một tile. Không cá nhân hoá, không auth, không cookie. ⇒ một bản cache ở edge phục vụ cả triệu người.
3. **Cục bộ theo địa lý.** Người ở Việt Nam xem tile Việt Nam. POP Singapore/HCM chỉ cần giữ tile Đông Nam Á, không phải toàn thế giới. ⇒ working set của mỗi POP nhỏ hơn tổng hàng nghìn lần.

```
Không CDN:
  client (HCM) ──── 250 ms RTT ────> origin (us-east-1)
  20 tile × 250 ms (dù song song vẫn bị TCP/TLS handshake) → bản đồ hiện sau ~1 s

Có CDN:
  client (HCM) ──── 8 ms RTT ────> POP (HCM)
  20 tile, HTTP/2 multiplexing trên một kết nối → bản đồ hiện sau ~80 ms
  Origin chỉ thấy lần miss đầu tiên của mỗi tile trong vùng.
```

**Ước lượng hiệu quả cache:**

```
Working set của một POP (ví dụ POP phục vụ Việt Nam):
  Tile z=0..14 cho vùng VN: vài trăm nghìn tile ≈ vài chục GB
  Tile z=15..18 cho các đô thị lớn: vài triệu tile ≈ vài trăm GB
  → toàn bộ vừa trong ổ SSD của POP.

Cache hit rate thực tế: 95–99%.
Origin QPS = 2,000,000 × (1 − 0.97) ≈ 60,000 QPS
  → object storage xử lý thoải mái.
```

### 6.6 Invalidation — và mẹo tránh nó hoàn toàn

Vấn đề: khi một con đường mới mở, tile chứa con đường đó phải đổi. Nhưng CDN đang bảo mọi client "cache tile này một năm". Purge CDN ở quy mô hàng triệu tile là chậm, đắt, và hay sót.

**Mẹo chuẩn: đưa version vào đường dẫn (path), đừng purge.**

```
Trước:  /tiles/15/26096/15585.pbf                  ← phải purge khi đổi
Sau:    /tiles/v37/15/26096/15585.pbf              ← không bao giờ purge

Client lấy version hiện tại từ một file manifest nhỏ, TTL ngắn:
  GET /tiles/manifest.json      Cache-Control: max-age=300
  → { "version": "v37", "styles": "s12", "min_client": "4.2" }

Khi build xong đợt tile mới:
  1. Đẩy tile mới vào path /v38/... (không đụng /v37/...)
  2. Đợi replication hoàn tất
  3. Đổi manifest → "v38"
  4. Client dần dần (trong 5 phút) chuyển sang v38
  5. Sau vài ngày, xoá /v37/ khỏi origin (CDN tự evict vì không ai hỏi)
```

Lợi ích: **rollout dần và rollback tức thì**. Tile mới bị lỗi? Đổi manifest về `v37`, xong trong 5 phút. Không cần purge gì cả.

> ⚠️ **Bẫy**: Đừng version toàn cầu cho **mọi** thay đổi nhỏ. Nếu một con đường ở Hà Nội đổi mà bạn bump version toàn cầu, bạn vừa làm mất hiệu lực cache của cả hành tinh — CDN miss 100% trong vài giờ, origin bị đè bẹp. Thực tế người ta version **theo vùng**: `/tiles/{region}/{version}/{z}/{x}/{y}`, và chỉ bump version của vùng thật sự đổi.


---

## 7. Deep dive B — Biến bản đồ thành đồ thị, và chia đồ thị thành routing tile

### 7.1 Mô hình hoá: nút là gì, cạnh là gì

Cách biểu diễn tự nhiên nhất: **nút (node/vertex) = nút giao thông, cạnh (edge) = đoạn đường giữa hai nút giao**.

```
         C                    Đồ thị:
         │                      Nút:  A, B, C, D, E
    A────B────D                 Cạnh: A→B (120m, 50km/h, 2 làn)
         │                            B→A (120m, 50km/h)
         E                            B→C, C→B, B→D, D→B, B→E, E→B

Mỗi cạnh mang thuộc tính:
  length_m        : độ dài hình học
  speed_limit     : tốc độ giới hạn
  road_class      : motorway / trunk / primary / residential / footway
  oneway          : chiều
  access          : car / bike / foot / bus — cạnh nào loại phương tiện nào đi được
  toll            : có thu phí không
  turn_restrictions: từ cạnh này KHÔNG được rẽ sang cạnh kia (cấm rẽ trái)
  elevation       : độ cao — quan trọng cho xe đạp và tiêu hao nhiên liệu
```

Hai chi tiết mà ứng viên hay bỏ sót, và nói ra thì rất ghi điểm:

**(a) Đường hai chiều = hai cạnh có hướng.** Đồ thị là **có hướng (directed)**. Một đường một chiều chỉ có một cạnh. Điều này nhân đôi số cạnh và là lý do "1 tỉ nút giao" lại thành "~2 tỉ cạnh".

**(b) Cấm rẽ không biểu diễn được bằng nút và cạnh đơn thuần.** "Từ Lê Lợi không được rẽ trái vào Nguyễn Huệ" là một ràng buộc trên **cặp cạnh**, không phải trên một cạnh. Có hai cách xử lý:

| Cách | Làm sao | Đánh đổi |
|---|---|---|
| **Turn table** | Giữ bảng phụ "(edge_in, edge_out) → cấm / +chi phí 30s (rẽ trái chờ đèn)"; thuật toán kiểm tra bảng khi mở rộng | Đồ thị nhỏ gọn, nhưng thuật toán phải mang theo "đến từ cạnh nào" — tăng không gian trạng thái |
| **Edge-based graph** (line graph) | Biến mỗi **cạnh** thành một **nút**; rẽ trở thành cạnh. Cấm rẽ = không có cạnh đó | Thuật toán sạch sẽ, Dijkstra chuẩn chạy được ngay. Nhưng đồ thị phình lên ~3–4 lần |

Hệ thống định tuyến production nghiêm túc (OSRM, Valhalla, Google) đều dùng **edge-based graph** cho phần lõi, vì chi phí rẽ (turn cost) là thứ ảnh hưởng lớn tới chất lượng route trong đô thị — rẽ trái qua ngã tư đông có thể tốn 60 giây, hơn cả việc đi vòng thêm 300 m.

### 7.2 Vì sao không thể giữ một đồ thị toàn cầu trong RAM

```
Số cạnh toàn cầu: ~2 × 10^9 (edge-based thì ~6 × 10^9)
Mỗi cạnh cần lưu: id đích (8B) + trọng số (4B) + cờ thuộc tính (4B) + hình học ref (8B)
                  ≈ 24 byte tối thiểu, thực tế 40–60 byte với hình học

2 × 10^9 × 40 byte = 80 GB          ← vừa một máy RAM lớn, nhưng...
Cộng hình học chi tiết để vẽ route: thêm ~200–400 GB
Cộng edge-based expansion (×3):     ~500 GB – 1 TB
```

Vấn đề không chỉ là **có vừa RAM không**, mà là ba thứ khác nghiêm trọng hơn:

1. **Không thể deploy.** Mỗi lần cập nhật bản đồ, mỗi máy routing phải nạp lại hàng trăm GB. Thời gian khởi động tính bằng chục phút; rolling deploy trở thành ác mộng.
2. **Lãng phí khủng khiếp.** Một request "từ Quận 1 tới Quận 3" chỉ chạm vài nghìn cạnh. Giữ 2 tỉ cạnh trong RAM để phục vụ nó là vô nghĩa.
3. **Cache miss của CPU giết hiệu năng.** Duyệt đồ thị là truy cập bộ nhớ ngẫu nhiên. Trên một đồ thị 500 GB, gần như **mọi** lần truy cập đều là cache miss L3 (~100 ns). Một triệu lần mở rộng nút = 100 ms chỉ riêng chờ RAM.

⇒ **Chia đồ thị thành routing tile**, đúng ý tưởng như map tile: chia thế giới theo lưới, mỗi ô chứa đồ thị con của vùng đó, cộng thêm **danh sách cạnh biên trỏ sang ô hàng xóm**.

```
┌──────────┬──────────┐     Routing tile 9q8y:
│  9q8w    │  9q8y    │       nodes: [n1..n8500]
│          │  ●──●──●─┼──►    edges: [...]
│       ●──┼──●  │  │ │       boundary_edges: [
│          │  ●──●──● │         { edge: n8500→X, neighbor_tile: "9q8z",
├──────────┼──────────┤           neighbor_node: 412 }, ... ]
│  9q8t    │  9q8v    │
└──────────┴──────────┘     Thuật toán duyệt tới cạnh biên → nạp tile hàng xóm → duyệt tiếp
```

Lợi ích trực tiếp: một request chỉ nạp **những tile nằm trên đường đi**, chứ không phải cả thế giới. Với chuyến nội thành: 2–6 tile, vài MB. Với chuyến xuyên thành phố: vài chục tile.

### 7.3 Nhưng chia tile phẳng vẫn chưa đủ — và đây là chỗ phải phân cấp

Thử một chuyến thật: **TP.HCM → Hà Nội, ~1,700 km**.

```
Nếu routing tile ở độ phân giải khu phố (mỗi tile ~5 km):
  1,700 km / 5 km ≈ 340 tile trên đường thẳng
  Nhưng thuật toán không đi thẳng — nó mở rộng theo hình quạt/ellipse
  → thực tế chạm 2,000–10,000 tile

  Mỗi tile ~2 MB → nạp 4–20 GB dữ liệu cho MỘT request.
  Thời gian: vài chục giây. Người dùng đã đóng app từ lâu.
```

Vấn đề: ở giữa chuyến Sài Gòn–Hà Nội, **ta không quan tâm tới các con hẻm ở Quảng Ngãi**. Chỉ cần biết Quốc lộ 1A. Nhưng routing tile độ phân giải cao lại bắt ta nạp hết mọi con hẻm đó.

**Giải pháp: routing tile có nhiều cấp chi tiết**, giống hệt map tile có nhiều zoom level:

| Cấp | Chứa gì | Kích thước ô | Dùng khi |
|---|---|---|---|
| **Level 0 — local** | Mọi đường: hẻm, đường nội bộ, đường đi bộ | ~2–5 km | Đầu và cuối chuyến — "ra khỏi nhà tới đường lớn" và "từ đường lớn vào đích" |
| **Level 1 — arterial** | Đường trục, tỉnh lộ, đường chính đô thị. Bỏ hẻm | ~20–50 km | Đoạn giữa của chuyến trong thành phố / liên huyện |
| **Level 2 — highway** | Chỉ cao tốc và quốc lộ | ~200–500 km | Phần lớn quãng đường của chuyến liên tỉnh |

```
Chuyến TP.HCM → Hà Nội, chiến lược phân cấp:

  [L0] nhà → đường lớn      : ~8 tile local, vài trăm mét đầu
       │ leo cấp (upward)
  [L1] đường lớn → cao tốc  : ~4 tile arterial
       │ leo cấp
  [L2] ─────── 1,650 km trên mạng cao tốc ───────  : ~6 tile highway
       │ xuống cấp (downward)
  [L1] cao tốc → đường lớn HN : ~4 tile arterial
       │ xuống cấp
  [L0] đường lớn → đích     : ~8 tile local

  Tổng: ~30 tile thay vì 2,000–10,000  →  giảm ~100–300 lần
```

Đây chính là **hierarchical routing**, và nó phản ánh đúng cách con người nghĩ về đường đi: bạn không nhớ từng ngã rẽ suốt 1,700 km, bạn nhớ "ra Quốc lộ 1, đi tới Hà Nội, rồi tìm đường vào nhà".

> 💡 **Nguyên tắc**: Phân cấp hoạt động được vì **một tính chất thật của mạng lưới đường**: một chuyến đi càng dài thì tỉ lệ quãng đường nằm trên đường cấp cao càng lớn. Chuyến 1,700 km có >97% quãng đường trên cao tốc/quốc lộ. Không có tính chất này — ví dụ trên một đồ thị ngẫu nhiên — phân cấp sẽ vô dụng. Nói được câu này là bạn cho thấy hiểu **vì sao** kỹ thuật hoạt động, chứ không chỉ **nó là gì**.

> ⚠️ **Bẫy**: Phân cấp là **heuristic, không đảm bảo tối ưu**. Có thể tồn tại một con đường tỉnh lộ cắt ngang ngắn hơn cao tốc, nhưng vì nó không có trong Level 2 nên thuật toán không thấy. Trong thực tế người ta chấp nhận: sai lệch thường < 1% và người dùng không phân biệt được. **Nói ra sự đánh đổi này** thay vì giả vờ kết quả luôn tối ưu — đó là dấu hiệu của ứng viên cấp cao.

### 7.4 Lưu routing tile ở đâu

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| **Database quan hệ** (bảng nodes, edges) | Query linh hoạt, cập nhật từng dòng | Duyệt đồ thị thành hàng triệu query. Chậm hơn 1000× | ❌ Sai hoàn toàn |
| **Graph database** (Neo4j...) | Mô hình đúng, có ngôn ngữ truy vấn đồ thị | Overhead transaction/ACID mà ta không cần; khó scale tới tỉ cạnh; vẫn chậm hơn cấu trúc in-memory chuyên dụng | ❌ Nghe hợp lý nhưng sai |
| **Object storage (S3) chứa file nhị phân, cache trong RAM của routing server** | Đơn giản, rẻ, bất biến, dễ version. Tile nén thành mảng kề (adjacency array) đọc là dùng ngay | Cập nhật = build lại tile, không sửa từng dòng | ✅ **Đúng** |

Định dạng tile nên là **compressed adjacency array**, không phải danh sách kề bằng con trỏ:

```
Thay vì:  node → List<Edge>   (mỗi Edge là một object, con trỏ rải rác)

Dùng:     offsets[]  : mảng int, offsets[i] = vị trí bắt đầu cạnh của nút i
          targets[]  : mảng int, id nút đích, delta-encoded + varint
          weights[]  : mảng int, thời gian đi cơ sở (giây), varint

  Cạnh của nút i = targets[offsets[i] .. offsets[i+1]-1]

Lợi ích:
  - Cạnh của một nút nằm LIỀN NHAU trong bộ nhớ → một cache line lấy được nhiều cạnh
  - Không con trỏ → không pointer chasing, không overhead GC
  - Nén 3–5 lần so với cấu trúc object
  - mmap thẳng từ file → OS tự quản lý page cache, khởi động gần như tức thì
```

> 💡 **Nguyên tắc**: Ở tầng thuật toán trên dữ liệu lớn, **bố trí bộ nhớ quan trọng ngang với độ phức tạp thuật toán**. Một A\* viết tốt trên adjacency array có thể nhanh hơn 10–50 lần chính nó viết trên cấu trúc object — cùng một O(...).

### 7.5 Quản lý cache routing tile trong routing server

```
Routing server (ví dụ 64 GB RAM):
  ┌──────────────────────────────────────────┐
  │ Level-2 highway tiles : nạp SẴN TOÀN BỘ  │  ~2–5 GB, pin cứng trong RAM
  │   (mọi request liên tỉnh đều cần)         │
  ├──────────────────────────────────────────┤
  │ Level-1 arterial tiles: LRU cache        │  ~20 GB
  ├──────────────────────────────────────────┤
  │ Level-0 local tiles   : LRU cache        │  ~30 GB
  │   (miss → tải từ S3, ~20–50 ms)          │
  └──────────────────────────────────────────┘
```

Kèm một tối ưu lớn: **định tuyến request theo vùng địa lý**. Gửi mọi request có điểm xuất phát ở TP.HCM tới cùng một nhóm routing server ⇒ nhóm đó có sẵn tile TP.HCM nóng trong RAM, hit rate ~99%. Nếu phân phối request ngẫu nhiên, mọi server phải giữ tile của mọi nơi ⇒ hit rate sụp.

Đây đúng là bài toán **cache affinity** mà consistent hashing (sd-09) giải: băm theo **geohash của điểm xuất phát** thay vì theo user id.

> ⚠️ **Bẫy**: Băm theo geohash tạo ra **hot partition** — server phụ trách Tokyo/Jakarta/Delhi nhận tải gấp hàng nghìn lần server phụ trách sa mạc Sahara. Khắc phục: gán **số lượng server tỉ lệ với tải lịch sử của vùng** (một dạng weighted consistent hashing), và cho phép tràn sang nhóm kế cận khi quá tải — chịu hit rate thấp hơn còn hơn từ chối request.

---

## 8. Deep dive C — Thuật toán định tuyến: từ Dijkstra tới contraction hierarchies

Đây là phần "học thuật" nhất của bài, nhưng cách kể đúng là kể theo **chuỗi thất bại**: mỗi thuật toán giải được vấn đề của cái trước rồi lộ ra vấn đề mới.

### 8.1 Dijkstra — đúng, nhưng ngây thơ

Dijkstra mở rộng dần từ điểm xuất phát, luôn lấy ra nút có khoảng cách tạm thời nhỏ nhất, cho tới khi chạm đích.

```
Hình dung vùng Dijkstra khám phá: một ĐƯỜNG TRÒN quanh điểm xuất phát,
lớn dần cho tới khi chạm đích.

        ..........
      ...  ┌───┐  ...
    ...    │ S │────────────────→ ● D
    ...    └───┘    ...
      ...        ...
        ..........
    Vùng đã duyệt = hình tròn bán kính |SD|
    → duyệt cả những nút đi NGƯỢC hướng đích
```

```
Số nút duyệt ≈ diện tích hình tròn bán kính d
Với d = 1,700 km và mật độ nút ~2,000 nút/km² ở vùng có dân:
  π × 1700² ≈ 9 triệu km² × (mật độ trung bình, kể cả biển ~200 nút/km²)
  ≈ hàng trăm triệu nút

Thời gian: với ~10 triệu nút/giây (đã tối ưu tốt), vẫn mất hàng chục giây.
Bộ nhớ: priority queue hàng chục triệu phần tử.
```

Chấp nhận được với chuyến 2 km trong thành phố. Hoàn toàn không chấp nhận được với chuyến liên tỉnh.

### 8.2 A\* — thêm hướng đi, thu hình tròn thành hình elip

A\* dùng một **hàm heuristic** `h(n)` ước lượng "còn bao xa từ n tới đích", và ưu tiên mở rộng nút có `f(n) = g(n) + h(n)` nhỏ nhất — thay vì chỉ `g(n)` như Dijkstra.

Heuristic tự nhiên cho bản đồ: **khoảng cách đường chim bay chia cho tốc độ tối đa của mạng lưới**.

```
h(n) = haversine(n, đích) / v_max        # v_max = 120 km/h chẳng hạn
```

Điều kiện để A\* vẫn cho kết quả **tối ưu**: heuristic phải **admissible** — không bao giờ ước lượng quá lên. Đường chim bay chia tốc độ tối đa thoả điều kiện đó, vì không có cách nào tới đích nhanh hơn bay thẳng ở tốc độ tối đa.

```
Vùng A* khám phá: một hình ELIP hướng về đích

      ┌───┐ ..............................  ● D
      │ S │ ..............................
      └───┘ ..............................
    → hẹp hơn hình tròn nhiều, nhưng vẫn phình ra ở giữa
```

| | Dijkstra | A\* với haversine |
|---|---|---|
| Hình vùng duyệt | Tròn | Elip hướng đích |
| Nút duyệt, chuyến 1,700 km | ~hàng trăm triệu | ~vài chục triệu |
| Tăng tốc | 1× | **3–10×** |
| Vẫn tối ưu? | Có | Có (heuristic admissible) |

**Và vẫn quá chậm.** Vài chục triệu nút vẫn là vài giây. Lý do sâu xa: heuristic hình học **quá yếu** vì nó không biết gì về mạng lưới đường. Nó không biết có cao tốc thẳng tắp hay có dãy núi chắn ngang. Ở châu Âu/Bắc Mỹ, tăng tốc thực tế của A\* thường chỉ **2–3 lần** — đáng giá, nhưng không đủ cứu chuyến xuyên lục địa.

> ⚠️ **Bẫy phổ biến nhất của bài này**: dừng lại ở "dùng A* thay Dijkstra". Nhiều ứng viên nói đúng câu đó rồi tưởng đã xong. Người phỏng vấn giỏi sẽ hỏi ngay: *"A* nhanh hơn bao nhiêu lần? Có đủ cho chuyến xuyên lục địa không?"* — và đáp án trung thực là **không đủ, kém 2–3 bậc độ lớn**.

### 8.3 Bidirectional search — chặt đôi vùng tìm kiếm

Chạy đồng thời hai tìm kiếm: một từ điểm xuất phát đi tới, một từ đích đi ngược lại (trên đồ thị đảo chiều). Dừng khi hai vùng gặp nhau.

```
Một chiều:              Hai chiều:
  ┌───┐                   ┌───┐              ┌───┐
  │ S │(((((((((( ● D     │ S │(((((  )))))  │ D │
  └───┘                   └───┘      gặp     └───┘
  1 vùng bán kính d       2 vùng bán kính d/2

Diện tích: π·d²      vs      2 × π·(d/2)² = π·d²/2
→ giảm ĐÚNG MỘT NỬA số nút với Dijkstra 2D

Trong thực tế trên mạng đường (chiều "fractal" ~1.5–2), lợi ích
thường là 2–4 lần. Và lợi ích lớn hơn nhiều khi kết hợp với CH (§8.4).
```

> ⚠️ **Bẫy**: điều kiện dừng của bidirectional **không phải** "khi hai vùng chạm nhau lần đầu". Nút gặp đầu tiên chưa chắc nằm trên đường ngắn nhất. Điều kiện đúng: dừng khi `top(queue_forward) + top(queue_backward) ≥ độ_dài_đường_tốt_nhất_đã_tìm_thấy`, và phải tiếp tục cập nhật đáp án tốt nhất mỗi khi một nút được cả hai phía chạm tới. Đây là lỗi kinh điển, và nói đúng chi tiết này ghi điểm rất mạnh.

### 8.4 Contraction Hierarchies — tiền xử lý offline, tăng tốc hàng nghìn lần

Đây là kỹ thuật thật sự giải quyết bài toán, và cũng là phần đáng đầu tư nhất khi trình bày.

**Nhận xét nền tảng**: đường đi tối ưu đường dài gần như luôn **leo lên** mạng lưới cấp cao rồi **đi xuống**. Mọi thứ ở giữa — hàng triệu nút giao nội bộ — chỉ làm chậm việc tìm kiếm. Vậy tại sao không **nén chúng lại trước** thành các "đường tắt"?

**Giai đoạn tiền xử lý (offline, chạy hàng giờ trên cụm máy):**

```
1. Xếp hạng mọi nút theo "độ quan trọng"
   (heuristic: bậc nút, số shortcut sẽ sinh ra, độ trải rộng...)
   → nút hẻm cụt: hạng thấp; nút giao cao tốc: hạng cao

2. Lần lượt "co" (contract) từng nút theo thứ tự hạng từ thấp lên cao.
   Co nút v nghĩa là: tạm gỡ v ra, và với mọi cặp hàng xóm (u, w) mà
   đường ngắn nhất u→w đi QUA v, thêm một cạnh SHORTCUT u→w với
   trọng số = w(u,v) + w(v,w).

        Trước co v:          Sau khi co v:
          u ──5── v ──3── w     u ────8──── w     (shortcut, nhớ "qua v")
```

```
3. Kết quả: đồ thị gốc + ~1–1.5 lần số cạnh shortcut,
   mỗi nút có một thứ hạng.
```

**Giai đoạn truy vấn (online, vài mili-giây):**

```
Chạy bidirectional Dijkstra với MỘT LUẬT DUY NHẤT:
  chỉ đi theo cạnh dẫn tới nút có THỨ HẠNG CAO HƠN.

  Chiều xuôi từ S: chỉ leo lên
  Chiều ngược từ D: chỉ leo lên (trên đồ thị đảo)
  → hai phía gặp nhau ở nút hạng cao nhất trên đường đi

            hạng cao
                ▲
         ╱╲    ╱ ╲    ╱╲
        ╱  ╲  ╱   ╲  ╱  ╲      ← chỉ đi lên, không bao giờ đi xuống
       S    ...gặp...      D

Vùng tìm kiếm co lại còn vài trăm tới vài nghìn nút — kể cả chuyến xuyên lục địa.
```

Sau khi tìm được đường trên đồ thị đã co, phải **bung (unpack) shortcut** trở lại chuỗi cạnh thật để hiển thị chỉ dẫn rẽ — việc này rẻ vì mỗi shortcut chỉ nhớ nút trung gian, bung đệ quy là xong.

| Phương pháp | Tiền xử lý | Thời gian truy vấn (đường 1,000 km) | Bộ nhớ thêm | Tối ưu? |
|---|---|---|---|---|
| Dijkstra | 0 | ~10–30 s | 0 | ✅ |
| A\* (haversine) | 0 | ~3–10 s | 0 | ✅ |
| A\* + bidirectional | 0 | ~1–3 s | 0 | ✅ |
| Hierarchical tiles (§7.3) | Vài giờ | ~100–500 ms | ~1.5× | ❌ heuristic |
| **Contraction Hierarchies** | Vài giờ–ngày | **~0.1–5 ms** | ~1.5–2× | ✅ **vẫn tối ưu!** |
| CH + goal-directed (CALT/hub labels) | Lâu hơn nữa | **< 0.1 ms** | ~10–50× | ✅ |

Điều khiến CH ấn tượng: nó **vừa nhanh hơn hàng nghìn lần, vừa vẫn cho đúng đường tối ưu**. Không phải một heuristic đánh đổi chất lượng — nó là một phép biến đổi bảo toàn đáp án.

**Nhưng CH có một điểm yếu chí mạng, và đây là câu hỏi tiếp theo mà người phỏng vấn giỏi sẽ hỏi:**

> ⚠️ **CH giả định trọng số cạnh là tĩnh.** Tiền xử lý mất hàng giờ. Nhưng trọng số của ta **đổi mỗi vài phút theo tình hình giao thông**. Nếu phải chạy lại CH mỗi khi có tắc đường, kỹ thuật này vô dụng.

Ba cách xử lý, và bạn nên nêu cả ba rồi chọn:

| Cách | Ý tưởng | Đánh đổi |
|---|---|---|
| **Customizable Route Planning (CRP)** | Tách tiền xử lý làm hai pha: pha *metric-independent* (phân hoạch đồ thị, chỉ phụ thuộc cấu trúc — chạy hàng giờ, hiếm khi lặp lại) và pha *customization* (tính lại chi phí trên biên các phân vùng — chạy **vài giây tới vài phút**) | Truy vấn chậm hơn CH thuần ~2–5 lần (~1–10 ms), nhưng **cập nhật traffic trong vài giây**. Đây là thứ Google/Bing thật sự dùng |
| **CH + sửa cục bộ** | Giữ CH xây trên trọng số "giờ bình thường"; khi có tắc, chỉ cập nhật những shortcut chạm cạnh bị ảnh hưởng | Phức tạp, và tắc đường lan rộng thì phải sửa rất nhiều shortcut |
| **CH theo khung giờ** | Build sẵn nhiều bộ CH: giờ cao điểm sáng, trưa, cao điểm chiều, đêm, cuối tuần | Đơn giản, nhưng không phản ứng được với **sự cố đột xuất** (tai nạn) — mà đó đúng là lúc người dùng cần nhất |

**Kiến trúc thực tế nên chọn (và nên nói ra):**

```
Chuyến NGẮN (< 30 km, ~95% request):
  → Bidirectional A* trên routing tile Level-0/1
    với trọng số traffic realtime đọc thẳng từ Redis
  → 10–50 ms, luôn dùng dữ liệu mới nhất

Chuyến DÀI (> 30 km, ~5% request):
  → CRP / CH được customize lại mỗi 2–5 phút với traffic mới
  → 1–10 ms trên phần cao tốc
  → đầu và cuối chuyến vẫn dùng A* trên tile local với traffic realtime

Nói cách khác: traffic realtime chi tiết ở HAI ĐẦU chuyến (nơi tắc đường
thật sự ảnh hưởng và nơi có nhiều lựa chọn thay thế), traffic được
customize theo lô ở PHẦN GIỮA (nơi chỉ có vài lựa chọn cao tốc).
```

> 💡 **Nguyên tắc**: Khi một kỹ thuật tăng tốc mạnh nhưng đòi hỏi tiền xử lý đắt, câu hỏi đúng không phải "dùng hay không dùng", mà **"phần nào của bài toán thật sự đổi thường xuyên?"**. Ở đây: *cấu trúc* mạng lưới gần như bất biến, chỉ có *trọng số* đổi. Tách hai thứ đó ra chính là toàn bộ ý tưởng của CRP.

### 8.5 Nhiều loại route và hàm chi phí (cost function)

Người dùng không phải lúc nào cũng muốn "nhanh nhất". Điều hay là **cùng một thuật toán phục vụ mọi nhu cầu** — chỉ cần đổi hàm chi phí trên cạnh.

```
cost(edge) = base_time(edge) × traffic_factor(edge, t)
           + turn_penalty(prev_edge, edge)
           + toll_cost(edge)      × w_toll
           + elevation_penalty(edge) × w_elev
           + road_class_penalty(edge) × w_class
           + surface_penalty(edge)   × w_surface
```

| Loại route | Hàm chi phí | Điểm cần lưu ý |
|---|---|---|
| **Nhanh nhất** (mặc định) | `cost = thời gian đi có traffic` | Traffic factor là tất cả |
| **Ngắn nhất** | `cost = length_m` | ⚠️ Hay ra route tệ: xuyên khu dân cư, nhiều đèn đỏ, tiết kiệm 200 m nhưng mất thêm 8 phút. Vì thế mặc định **không** là "ngắn nhất" |
| **Tránh phí** | `toll_cost × ∞` (hoặc một số rất lớn) | Dùng ∞ = cấm tuyệt đối; dùng số lớn hữu hạn = "tránh nếu không quá bất tiện" — cách sau thường tốt hơn cho trải nghiệm |
| **Tránh cao tốc** | `road_class_penalty` cao cho motorway | ⚠️ Phá vỡ CH! Vì CH giả định cao tốc là nút hạng cao. Thường phải dùng đồ thị/metric riêng cho chế độ này |
| **Xe đạp** | Ưu tiên làn xe đạp, phạt độ dốc **rất mạnh** và **bất đối xứng** (lên dốc đắt hơn xuống dốc nhiều), phạt đường ô tô đông | Đồ thị khác hẳn: nhiều cạnh ô tô không đi được, và nhiều cạnh chỉ xe đạp/đi bộ mới đi được |
| **Đi bộ** | Bỏ hoàn toàn oneway (đi bộ đi hai chiều được), thêm lối tắt, cầu vượt bộ hành, tốc độ ~5 km/h | ⚠️ Tuyệt đối không dùng đồ thị ô tô: sẽ chỉ người ta đi bộ lên đường cao tốc |
| **Tiết kiệm nhiên liệu** | Phạt tăng/giảm tốc, ưu tiên tốc độ ổn định, phạt độ dốc lên | Cần mô hình tiêu hao theo loại xe |
| **Xe tải** | Thêm ràng buộc cứng: chiều cao cầu, tải trọng, cấm giờ, hàng nguy hiểm | Đây là các ràng buộc **lọc cạnh**, không phải chi phí |

Hệ quả kiến trúc quan trọng: **mỗi travel mode cần một bộ routing tile (và một bộ CH) riêng**.

```
Số bộ dữ liệu = số mode × số profile
  driving (fastest)     — có CH
  driving (avoid tolls) — cần metric riêng
  walking               — đồ thị khác, nhưng chuyến ngắn → không cần CH
  cycling               — đồ thị khác + elevation
  truck                 — nhiều profile theo kích thước xe

⇒ Lưu trữ nhân lên 3–5 lần. Nhưng routing tile chỉ vài TB,
   nên nhân 5 vẫn là chuyện nhỏ so với 50 PB map tile.
   ⇒ Đây là đánh đổi RẤT đáng: tốn storage rẻ để đổi lấy CPU đắt.
```

> 💡 **Nguyên tắc**: Khi có N biến thể của cùng một phép tính và kết quả ổn định theo thời gian, hãy **precompute cả N** nếu chi phí lưu trữ nhỏ so với chi phí tính lại. Lưu trữ rẻ hơn CPU nhiều bậc — và đây là cùng một lập luận đã dẫn tới precompute map tile ở §6.4.

### 8.6 Nhiều phương án đường đi (alternative routes)

Google Maps luôn đưa 2–3 lựa chọn. Chạy thuật toán 3 lần với 3 hàm chi phí sẽ ra 3 đường gần như giống hệt nhau — vô dụng. Kỹ thuật chuẩn là **plateau method**:

```
1. Chạy Dijkstra từ S (ra cây đường ngắn nhất xuôi)
2. Chạy Dijkstra từ D trên đồ thị đảo (ra cây ngược)
3. Tìm các "plateau": những đoạn đường LIÊN TỤC mà trên đó, cây xuôi và
   cây ngược đồng ý với nhau — tức đoạn đó nằm trên đường tối ưu tới mọi
   điểm của nó từ cả hai phía. Plateau càng dài, phương án càng "tự nhiên".
4. Với mỗi plateau dài, dựng route: S → đầu plateau → cuối plateau → D
5. Lọc bằng ba tiêu chí:
   - không dài hơn đường tốt nhất quá ~20–25%
   - chồng lấn (overlap) với đường tốt nhất < ~60–80%
   - "bounded stretch": mọi đoạn con của nó cũng phải gần tối ưu
     (loại các đường có đoạn vòng vô lý)
```

Tiêu chí thứ ba là thứ ngăn hệ thống đề xuất những đường trông ngớ ngẩn — ví dụ đường đi vòng qua một khu công nghiệp rồi quay lại. Nêu được tiêu chí này cho thấy bạn hiểu rằng "đưa nhiều lựa chọn" là bài toán chất lượng, không chỉ là chạy thuật toán thêm vài lần.


---

## 9. Deep dive D — ETA & traffic: nơi dữ liệu người dùng quay lại nuôi hệ thống

Routing cho ta **một chuỗi cạnh**. ETA biến chuỗi đó thành **một con số phút**. Nghe đơn giản, nhưng đây là mảng khó nhất và cũng là thứ tạo ra lợi thế cạnh tranh thật sự của Google Maps.

### 9.1 Vì sao không thể tính ETA bằng quãng đường chia tốc độ

```
ETA ngây thơ = Σ (length_m / speed_limit)

Sai ở đâu:
  - Đèn đỏ: một ngã tư đô thị trung bình cộng 30–60 s. Chuyến 5 km trong
    trung tâm qua 15 ngã tư → 10–15 phút chỉ để dừng đèn. Đây thường LỚN HƠN
    thời gian di chuyển thật.
  - Không ai đi đúng tốc độ giới hạn: đường 60 km/h giờ cao điểm đi 15 km/h;
    đường vắng ban đêm có khi 70 km/h.
  - Rẽ trái qua dòng ngược chiều: 20–90 s.
  - Thời tiết, ngày lễ, trận bóng vừa tan, trường học tan học.
  - Chính chiếc xe: xe tải leo đèo khác xe máy.

Sai số thực tế của công thức ngây thơ: 50–200%. Vô dụng.
```

⇒ ETA phải dựa trên **dữ liệu quan sát thật**: người ta *thực sự* đi đoạn đường này mất bao lâu, vào giờ này, ngày này.

### 9.2 Crowdsourcing — điện thoại người dùng chính là mạng cảm biến

Đây là vòng phản hồi (feedback loop) làm nên Google Maps và cũng là lý do một startup rất khó cạnh tranh:

```
Người dùng mở app điều hướng
        │ gửi vị trí mỗi vài giây
        v
Hệ thống biết tốc độ thật trên từng đoạn đường
        │
        v
ETA chính xác hơn  →  app hữu ích hơn  →  nhiều người dùng hơn
        ^                                          │
        └──────────────────────────────────────────┘
                    (vòng lặp tự củng cố)
```

Nguồn dữ liệu, xếp theo chất lượng:

| Nguồn | Tần suất | Chất lượng | Vấn đề |
|---|---|---|---|
| Người đang navigate | 1–5 s | **Tốt nhất** — biết họ đang đi đường nào (đã có route) | Chỉ ~5% người dùng |
| Người mở app nhưng không navigate | 10–60 s | Khá | Không biết họ đi đường nào, phải map matching |
| Location history chạy nền (có đồng ý) | Vài phút | Kém, thưa | Quyền riêng tư, chính xác thấp |
| Cảm biến hạ tầng (loop detector, camera) | Liên tục | Rất tốt tại điểm đặt | Chỉ có ở vài trăm điểm mỗi thành phố |
| Báo cáo người dùng (kiểu Waze: "tai nạn phía trước") | Sự kiện rời rạc | Nhanh nhất với sự cố | Có thể sai / bị phá hoại |

Con số thô: 1 tỉ DAU, ~5% đang navigate ⇒ ~50 triệu thiết bị gửi vị trí, ~200K–1M điểm/giây. Đó là một mạng cảm biến dày đặc hơn mọi hệ thống hạ tầng giao thông từng xây.

> ⚠️ **Quyền riêng tư — phải nói ra, đừng chờ bị hỏi**: dấu vết GPS là dữ liệu nhạy cảm bậc nhất (nó cho biết bạn ngủ ở đâu, làm ở đâu, đi khám bệnh gì). Ba biện pháp tối thiểu: **(1)** tách định danh — luồng tính traffic chỉ nhận `(session_id tạm thời, điểm)`, không nhận `user_id`; xoay `session_id` sau mỗi 10–15 phút để không ghép được cả chuyến đi; **(2)** k-anonymity — chỉ công bố tốc độ của một đoạn khi có **ít nhất k (5–10) thiết bị khác nhau** đóng góp, nếu không thì một chiếc xe duy nhất trên đường vắng sẽ bị suy ra danh tính; **(3)** cắt đầu-đuôi chuyến (~vài trăm mét quanh điểm xuất phát và điểm đến) trước khi đưa vào luồng phân tích — đó chính là nhà và nơi làm việc.

### 9.3 Map matching — biến chuỗi GPS lệch thành chuỗi cạnh đúng

Đây là phần **khó nhất và hay bị bỏ qua nhất** của cả bài. Nếu bạn chỉ nói đúng một thứ trong phần ETA, hãy nói thứ này.

**Vấn đề**: GPS không chính xác. Sai số điển hình 5–10 m ngoài trời quang, **20–50 m hoặc hơn** giữa phố cao tầng (hiệu ứng "urban canyon" — tín hiệu dội từ mặt kính toà nhà), và hoàn toàn mất tín hiệu trong hầm.

```
Thực tế xe đang đi trên đường A, nhưng điểm GPS rơi vãi thế này:

   ═══════════ Đường A (đường chính) ═══════════
        ●   ●        ●              ●
          ●      ●        ●     ●        ← điểm GPS thô
   ─────────── Đường B (song song, cách 18 m) ──────────

Nếu "snap về đường gần nhất" cho từng điểm độc lập:
   điểm 1 → A, điểm 2 → B, điểm 3 → A, điểm 4 → B, điểm 5 → A ...
   → kết luận: xe nhảy qua nhảy lại giữa hai đường 10 lần trong 30 giây.
   → Vô lý về mặt vật lý, và làm hỏng số liệu traffic của CẢ HAI đường.
```

Đây chính là lý do **snap từng điểm độc lập là sai**: bài toán không phải "điểm này gần đường nào nhất", mà **"chuỗi đường nào giải thích tốt nhất cả chuỗi điểm, với điều kiện chuỗi đó liên thông và xe di chuyển hợp lý"**.

**Lời giải chuẩn công nghiệp: Hidden Markov Model (HMM).**

```
Trạng thái ẩn (hidden state) : cạnh đường mà xe THẬT SỰ đang ở
Quan sát (observation)        : điểm GPS đo được

Hai xác suất cần mô hình hoá:

1. Xác suất phát xạ (emission) — "nếu xe đang ở cạnh e, khả năng
   GPS đo ra điểm z là bao nhiêu?"
     P(z | e) ∝ exp( − dist(z, e)² / (2σ²) )     với σ ≈ 10–20 m
   → điểm càng gần cạnh, xác suất càng cao. Đây là phần "snap".

2. Xác suất chuyển (transition) — "nếu điểm trước ở cạnh e_i và điểm
   này ở cạnh e_j, chuyển đó hợp lý tới đâu?"
     so sánh  route_distance(e_i → e_j)  với  haversine(z_{t-1}, z_t)
     P(e_j | e_i) ∝ exp( − |route_dist − straight_dist| / β )
   → nếu đi từ e_i sang e_j phải vòng 2 km trong khi hai điểm GPS chỉ
     cách nhau 30 m, xác suất gần 0. Đây là phần "liên thông + hợp lý".

Giải: thuật toán Viterbi tìm chuỗi cạnh có xác suất tích lớn nhất.
   → ra một chuỗi đường ĐI ĐƯỢC, liên tục, hợp lý về vật lý.
```

```
Kết quả sau map matching:

   ═══●══●══●══●══●══●═══ Đường A  ← toàn bộ chuỗi khớp về A
   ──────────────────────  Đường B  ← không điểm nào

   Kèm output quan trọng: xe đi từ km 1.2 tới km 2.4 của cạnh A
   trong 95 giây  →  tốc độ 45 km/h  →  ĐÂY mới là số liệu traffic dùng được.
```

Vài chi tiết production đáng nói thêm, mỗi cái là một điểm cộng:

| Tình huống | Xử lý |
|---|---|
| **Đường song song / đường trên cao và đường dưới** (cầu vượt) | HMM giải được nhờ ràng buộc liên thông: nếu xe đã ở trên cầu vượt thì không thể đột ngột ở đường dưới vì hai đồ thị không nối nhau tại đó |
| **Hầm — mất GPS 3 phút** | Không có quan sát nào. Dùng **dead reckoning**: suy vị trí từ tốc độ cuối + hình học đường + cảm biến quán tính của điện thoại. HMM nối hai đầu hầm lại thành một đoạn |
| **Xe đang navigate (đã có route)** | Dễ hơn nhiều: ta đã biết chuỗi cạnh dự kiến, chỉ cần khớp điểm vào route đó và phát hiện khi nào lệch khỏi route (→ trigger reroute) |
| **Chạy realtime hay theo lô?** | Realtime dùng **HMM cửa sổ trượt**: giữ vài giả thuyết tốt nhất trong 30–60 giây gần nhất, chốt lại khi bằng chứng đủ mạnh. Đây là *online Viterbi*, chấp nhận độ trễ vài giây để đổi lấy độ chính xác |
| **Chi phí tính toán** | Viterbi trên ~10 cạnh ứng viên mỗi điểm, 1 triệu điểm/giây → hàng chục triệu phép tính/giây. Phải chạy trên stream engine phân tán (Flink), phân vùng **theo geohash** để mỗi worker chỉ giữ đồ thị vùng của nó |

> 💡 **Nguyên tắc**: Map matching là ví dụ đẹp của mẫu *"một điểm dữ liệu thì mơ hồ, một chuỗi thì rõ ràng"*. Khi mỗi quan sát đơn lẻ quá nhiễu để quyết định, đừng cố làm sạch từng quan sát — hãy áp **ràng buộc lên cả chuỗi**. Cùng mẫu tư duy này xuất hiện ở nhận dạng giọng nói, gõ phím dự đoán và phát hiện gian lận.

### 9.4 Từ tốc độ quan sát tới trọng số cạnh

```
Kinesis/Kafka  →  Flink job (phân vùng theo geohash)
                    │
                    ├─ map matching (HMM)
                    ├─ tính tốc độ trên từng cạnh đã khớp
                    ├─ cửa sổ trượt 5 phút, gom theo edge_id
                    ├─ lọc outlier (xe dừng ăn trưa giữa đường không
                    │   phải là "tắc đường"; xe cấp cứu không phải
                    │   tốc độ đại diện) — dùng trung vị, không phải trung bình
                    ├─ chỉ công bố khi đủ k mẫu (k-anonymity + độ tin cậy)
                    v
              Redis: edge:{id} → { speed_kmh, confidence, n_samples, ts }
                    │
                    ├─→ routing service đọc khi tính đường
                    ├─→ ETA service đọc khi ước lượng
                    └─→ lưu vào warehouse để huấn luyện mô hình lịch sử
```

Ba quyết định thiết kế đáng biện luận:

**(a) Vì sao trung vị (median), không phải trung bình?** Một chiếc xe dừng lại 10 phút mua cà phê giữa đoạn đường sẽ kéo trung bình xuống thảm hại. Trung vị miễn nhiễm với ngoại lệ. Thực tế dùng percentile 50 cho ETA trung tâm, và giữ thêm p85 để ước lượng "trường hợp xấu".

**(b) Điều gì xảy ra với đoạn đường không có dữ liệu?** Phần lớn các đoạn đường trên thế giới **không có ai đi qua trong 5 phút vừa rồi**. Ta không thể nói "không biết". Thứ tự dự phòng (fallback chain):

```
1. Dữ liệu realtime của chính cạnh này (5 phút gần nhất)   ← tốt nhất
2. Dữ liệu realtime của các cạnh lân cận cùng loại đường
   (tắc đường lan theo không gian — đây là giả định hợp lý)
3. Mô hình lịch sử của cạnh này theo (thứ, giờ)             ← phủ hầu hết
4. Tốc độ trung bình theo road_class trong vùng             ← cuối cùng

Kèm cờ confidence để ETA service biết nó đang tin vào cái gì,
và để UI hiển thị "khoảng ETA" rộng hơn khi độ tin cậy thấp.
```

**(c) Redis là lựa chọn đúng vì đâu?** Trọng số cạnh có ba tính chất khớp hoàn hảo: nhỏ (~2 tỉ cạnh × 16 byte ≈ 32 GB, nhưng thực tế chỉ ~5–10% cạnh có dữ liệu sống ⇒ vài GB), ghi liên tục, và **đọc bởi mọi request routing** — tức hàng trăm nghìn lần mỗi giây. Mất dữ liệu không thảm hoạ (fallback về lịch sử). Đây là định nghĩa của một cache in-memory, không phải một database bền vững.

### 9.5 Dự đoán ETA bằng ML

Traffic realtime cho ta biết **hiện tại**. Nhưng chuyến đi 45 phút thì đoạn cuối sẽ được đi vào **45 phút nữa** — và lúc đó tình hình đã khác. ETA đúng phải là một bài **dự báo**.

```
Bài toán: cho một chuỗi cạnh và thời điểm khởi hành t0,
          dự đoán thời gian tới đích.

Đặc trưng (features):
  Theo cạnh:   road_class, length, speed_limit, số làn, số ngã tư,
               loại giao lộ, có đèn tín hiệu không, độ dốc
  Thời gian:   giờ trong ngày, thứ trong tuần, ngày lễ,
               thời điểm DỰ KIẾN tới cạnh đó (không phải t0!)
  Lịch sử:     tốc độ trung bình của cạnh này ở đúng (thứ, giờ) đó,
               trong 4–8 tuần gần nhất
  Realtime:    tốc độ 5 phút gần nhất trên cạnh và vùng lân cận
  Ngữ cảnh:    thời tiết, sự kiện lớn gần đó, công trình đang thi công
  Người dùng:  loại phương tiện; (tuỳ chọn) phong cách lái cá nhân
```

| Cách tiếp cận | Ưu | Nhược |
|---|---|---|
| **Trung bình lịch sử theo (cạnh, thứ, giờ)** | Cực đơn giản, rẻ, dễ giải thích, đã tốt hơn công thức ngây thơ rất nhiều | Không xử lý được sự kiện bất thường; không nắm được tương tác giữa các cạnh |
| **Gradient boosting (XGBoost/LightGBM) trên từng cạnh, rồi cộng lại** | Mạnh, dễ huấn luyện, giải thích được feature importance | **Cộng thời gian từng cạnh bỏ qua tương quan** — tắc đường không độc lập giữa các cạnh kề nhau; sai số cộng dồn có hệ thống |
| **Graph Neural Network trên siêu đoạn (supersegment)** | Nắm được tương quan không gian; đây là thứ DeepMind làm cho Google Maps, giảm sai số 20–50% ở các thành phố lớn | Đắt để huấn luyện và phục vụ; khó debug |
| **Hồi quy trên cả tuyến (whole-route)** | Trực tiếp tối ưu thứ ta quan tâm | Không tổng quát hoá cho tuyến chưa từng thấy |

**Kiến trúc thực tế nên trình bày**: chia tuyến thành **supersegment** (chuỗi vài chục cạnh liên tiếp hay đi cùng nhau, ví dụ một đoạn cao tốc giữa hai nút giao lớn), dự đoán thời gian cho từng supersegment bằng mô hình có nhận thông tin đồ thị, rồi cộng lại kèm một mô hình hiệu chỉnh cho phần chuyển tiếp giữa các supersegment. Việc gom thành supersegment vừa giảm số lần suy luận (từ hàng trăm cạnh xuống vài chục đơn vị), vừa nắm được tương quan cục bộ.

**Vòng lặp huấn luyện** rất đẹp vì nhãn (label) đến miễn phí: ta **biết chuyến đi thật mất bao lâu** — chính người dùng đã đi. Không cần gán nhãn thủ công. Huấn luyện lại hàng ngày/hàng tuần trên dữ liệu chuyến đi thật.

**Phục vụ mô hình (serving)**: ETA nằm trên đường nóng, ngân sách chỉ vài chục mili-giây. Ba mẹo:

1. **Precompute theo lô**: dự đoán trước thời gian đi của mọi supersegment cho từng khung 15 phút trong 2 giờ tới, lưu vào Redis. ETA online chỉ còn là phép **tra bảng + cộng**, không phải suy luận mô hình.
2. **Chỉ suy luận online phần bất thường**: những supersegment mà realtime lệch mạnh so với dự báo.
3. Giữ một **mô hình dự phòng cực nhẹ** (trung bình lịch sử) để dùng khi hệ ML chết — xem §12.

> ⚠️ **Bẫy**: đừng trả về ETA là một con số duy nhất trong nội bộ hệ thống. Hãy giữ **phân phối** (p50, p85). Hiển thị p50 cho người dùng thường, nhưng với người đang bắt chuyến bay thì p85 mới là con số họ cần. Nhiều ứng viên bỏ qua điều này, mà nó là khác biệt giữa "một con số" và "một dự báo".

### 9.6 Rerouting — và câu hỏi thật sự khó: *khi nào* nên báo đổi đường

Phần tính toán không khó. Phần khó là **quyết định có nên làm phiền người đang lái xe hay không**.

**Tìm ai bị ảnh hưởng.** Khi có sự cố ở ô `9q8yz`, ta cần biết ai đang đi qua đó. Quét toàn bộ 50 triệu phiên navigation là không thể. Mẹo dùng tính chất tiền tố của geohash:

```
Cách ngây thơ — lưu MỌI ô mà route đi qua:
  user_1 → [r_1, r_2, r_3, ..., r_k]      k có thể tới hàng nghìn ô
  50 triệu phiên × 500 ô = 25 tỉ dòng. Quá nhiều để ghi và để quét.

Cách gọn — lưu ô xuất phát và các ô CHA của nó, leo lên cho tới khi
ô cha bao trùm luôn cả đích:
  user_1 → [ 9q8yy, 9q8y, 9q8, 9q ]       chỉ 4–6 dòng

Khi có sự cố tại ô X:
  1. tính mọi tiền tố của X: 9q8yzab, 9q8yza, 9q8yz, 9q8y, 9q8, 9q, 9
  2. tra ngược index: ai có một trong các ô đó trong danh sách của mình?
  → ra một TẬP ỨNG VIÊN nhỏ (lọc thô, có dương tính giả)
  3. với từng ứng viên, kiểm tra chính xác route có đi qua X không
  → lọc tinh trên vài nghìn người thay vì 50 triệu
```

Đây là mẫu **lọc thô rẻ rồi lọc tinh đắt** — đúng như Bloom filter dùng trong web crawler (sd-13): chấp nhận dương tính giả ở bước rẻ để tránh quét toàn bộ.

**Ngưỡng báo đổi đường.** Bài toán ở đây là chi phí gián đoạn:

```
Đổi đường có chi phí THẬT với người dùng:
  - phải xử lý thông tin mới trong khi đang lái  → nguy hiểm
  - mất cảm giác quen thuộc với tuyến đã chấp nhận
  - nếu đường mới cũng tắc → mất niềm tin vào app, và đây là
    tổn thất lớn nhất vì niềm tin rất khó lấy lại

Luật ngưỡng nên dùng (nêu vài điều kiện AND, đừng chỉ nêu một):
  1. Tiết kiệm tuyệt đối  ≥ 5 phút   VÀ
  2. Tiết kiệm tương đối  ≥ 15% thời gian còn lại   VÀ
  3. Độ tin cậy dữ liệu traffic ≥ ngưỡng (nhiều mẫu, mới)  VÀ
  4. Điểm rẽ sang đường mới còn ≥ 60 s phía trước (đủ thời gian chuyển làn) VÀ
  5. Chưa reroute trong 5 phút vừa rồi (chống dao động — flapping)  VÀ
  6. Đường mới không đi qua chính vùng đang có sự cố

Điều chỉnh ngưỡng theo ngữ cảnh:
  - Đang ở cao tốc, lối ra kế tiếp cách 8 km → ngưỡng cao hơn nhiều,
    vì chi phí chuyển đổi lớn
  - Người dùng đã tự ý đi lệch route → reroute NGAY, không cần ngưỡng
    (đây không phải đề xuất, đây là sửa lỗi)
  - Đường phía trước bị ĐÓNG hoàn toàn → reroute ngay, ngưỡng không áp dụng
```

> ⚠️ **Bẫy flapping**: nếu chỉ dùng ngưỡng "nhanh hơn 5 phút", hệ thống sẽ đẩy người dùng qua lại giữa hai tuyến mỗi khi dữ liệu dao động. Bắt buộc phải có **histeresis**: một khi đã ở tuyến A, ngưỡng để chuyển sang B phải **cao hơn** ngưỡng ban đầu để chọn B (ví dụ đòi hỏi tiết kiệm gấp rưỡi). Đây là cùng nguyên lý histeresis trong alerting (sd-17) — và chỉ ra được sự tương đồng đó là một điểm cộng rõ rệt trong phỏng vấn.

Còn một tác động ngược đáng nói: **nếu dồn tất cả mọi người sang cùng một tuyến thay thế, tuyến đó sẽ tắc.** Hệ thống định tuyến ở quy mô này **tự ảnh hưởng tới hiện tượng nó đang đo**. Cách giảm nhẹ: phân bổ ngẫu nhiên người dùng vào nhiều tuyến thay thế gần tương đương, và đưa lưu lượng dự kiến (chứ không chỉ lưu lượng hiện tại) vào hàm chi phí.

---

## 10. Deep dive E — Phiên navigation: giao thức, chia việc client/server, offline

### 10.1 Vì sao WebSocket

| Phương án | Phù hợp? | Lý do |
|---|---|---|
| **HTTP POST định kỳ** | ❌ | Header 600 byte cho payload 50 byte; TLS handshake lặp lại; server không đẩy xuống được |
| **Long polling** | ⚠️ | Đẩy xuống được nhưng tốn kết nối chờ + tái lập liên tục; tệ hơn WebSocket ở mọi mặt |
| **Server-Sent Events** | ⚠️ | Một chiều (chỉ xuống). Ta vẫn cần đường lên cho vị trí ⇒ phải ghép hai kênh |
| **Push notification** | ❌ | Payload bé, độ trễ không đảm bảo, không có trên web |
| **WebSocket** | ✅ | Hai chiều, một kết nối, frame overhead ~2–6 byte, giữ TLS session |
| **UDP / QUIC** | ✅✅ | Vị trí là dữ liệu **có thể mất được**: mất điểm ở giây thứ 3 không sao, giây thứ 8 đã có điểm mới. TCP sẽ *chặn dòng* (head-of-line blocking) để truyền lại một gói đã hết giá trị. QUIC cho ta datagram không tin cậy + mã hoá + roaming IP khi đổi mạng |

**Kết luận nên trình bày**: WebSocket (trên HTTP/2 hoặc HTTP/3) là mặc định đúng và là câu trả lời an toàn trong phỏng vấn. Nhưng nói thêm rằng **hướng lên của vị trí về bản chất hợp với UDP/QUIC datagram hơn**, vì dữ liệu vị trí là *lossy-tolerant*, và nêu được lý do head-of-line blocking — đó là chi tiết phân biệt ứng viên đã từng làm hệ realtime thật.

Một chi tiết vận hành: **WebSocket là stateful**, nên tầng này phải tách riêng khỏi API server stateless (đã vẽ ở §5.1). Deploy tầng WebSocket = ngắt hàng chục triệu kết nối ⇒ cần drain dần, client tự reconnect với backoff + jitter, và **phiên navigation phải khôi phục được** (client giữ `route_id`, server đọc lại trạng thái phiên từ store chung).

### 10.2 Chia việc: client tính gì, server tính gì

| Việc | Ai làm | Vì sao |
|---|---|---|
| Vẽ bản đồ từ vector tile | **Client** | GPU sẵn có, 60 fps không thể qua mạng |
| Snap vị trí vào route đang đi | **Client** | Phải tức thì (mũi tên phải bám đường ngay); chỉ cần khớp vào một route đã biết nên rất rẻ |
| Phát ra chỉ dẫn thoại ("rẽ phải sau 200 m") | **Client** | Đã có toàn bộ danh sách bước; cần đúng thời điểm, không chịu được độ trễ mạng |
| Đếm ngược ETA giữa hai lần server cập nhật | **Client** | Nội suy cục bộ; nếu chờ server thì số nhảy giật |
| Phát hiện đi lệch route | **Client** phát hiện → báo server | Client biết ngay sau vài giây; server chỉ nhận tín hiệu rồi tính route mới |
| Tính route ban đầu | **Server** | Cần đồ thị toàn cầu + traffic |
| Tính lại route khi đổi đường | **Server** | Như trên |
| ETA có traffic | **Server** | Cần dữ liệu realtime toàn cục |
| Map matching để đóng góp dữ liệu traffic | **Server** | Cần đồ thị đầy đủ và tính toán nặng |

> 💡 **Nguyên tắc**: Đẩy về client mọi thứ **cần tức thì và chỉ cần dữ liệu cục bộ**; giữ ở server mọi thứ **cần cái nhìn toàn cục**. Áp dụng luật này, app vẫn dùng được khi mạng chập chờn — mũi tên vẫn chạy, thoại vẫn nhắc rẽ, chỉ ETA là đứng yên. Đó đúng là trải nghiệm khi đi qua vùng sóng yếu.

### 10.3 Chế độ offline

Người dùng tải trước một vùng (ví dụ "Đà Lạt", 200 MB) trước khi đi vùng không sóng.

```
Gói offline chứa:
  - vector tile của vùng, z=10..16  (z>16 bỏ, dùng overzoom)
  - routing tile Level-0/1 của vùng + Level-2 phủ đường vào vùng
  - dữ liệu geocoding + POI cơ bản của vùng
  - KHÔNG có: ảnh vệ tinh, Street View, traffic

Hệ quả khi offline:
  ✅ xem bản đồ, tìm địa chỉ trong vùng, tính route, chỉ đường từng bước
  ❌ ETA chỉ dựa trên mô hình lịch sử nhúng sẵn (sai số lớn hơn)
  ❌ không reroute theo tắc đường (vẫn reroute được khi đi lệch — vì
     việc đó chỉ cần đồ thị cục bộ)
  ⚠️ hết hạn sau ~30 ngày → buộc tải lại, tránh chỉ đường theo bản đồ cũ
```

Điểm hay để nói: **chế độ offline chỉ khả thi vì routing tile nhỏ.** Một vùng cỡ một tỉnh có vài chục nghìn cạnh, nén lại chỉ vài MB. Nếu ta đã chọn kiến trúc "graph database tập trung" ở §7.4 thì offline là bất khả thi. Một quyết định lưu trữ ở tầng sâu quyết định một tính năng người dùng nhìn thấy — đó là loại liên hệ đáng nêu ra.


---

## 11. Cập nhật dữ liệu bản đồ — pipeline offline

Thế giới thay đổi: đường mới mở, đường một chiều đổi chiều, cầu đóng sửa, quán đóng cửa. Google Maps nhận **hàng chục triệu cập nhật mỗi ngày**. Toàn bộ việc này nằm **ngoài đường phục vụ** — và sự tách bạch đó là điều quan trọng nhất cần nói.

### 11.1 Nguồn dữ liệu

| Nguồn | Đặc điểm | Độ trễ tới bản đồ |
|---|---|---|
| **Ảnh vệ tinh / hàng không** | Phủ rộng, tự động phát hiện đường mới bằng thị giác máy tính | Tuần–tháng |
| **Street View** | Xe chụp thực địa; đọc được biển báo, tên đường, số nhà, biển cấm rẽ bằng OCR | Tháng–năm cho một khu vực |
| **Dữ liệu chính quyền / bên thứ ba** | Chính xác, có thẩm quyền (quy hoạch, đường mới) | Tuần |
| **Báo cáo người dùng** | "Đường này đã đóng", "sai chiều" | Giờ–ngày, sau khi kiểm chứng |
| **Dấu vết GPS tổng hợp** | **Nguồn tự động mạnh nhất**: nếu hàng nghìn xe đi qua nơi bản đồ không có đường → đó là đường mới. Nếu không xe nào đi theo một chiều ghi trong bản đồ → chiều đường đã đổi | Ngày |

Dấu vết GPS đáng nói riêng vì nó tạo **vòng phản hồi khép kín**: dữ liệu người dùng không chỉ cập nhật *trọng số* (traffic) mà còn cập nhật *cấu trúc* đồ thị. Hệ thống tự học bản đồ từ hành vi.

### 11.2 Pipeline và nguyên tắc hai nhịp

```
Nguồn thô  ──►  Conflation  ──►  Kiểm chứng  ──►  Bản đồ chuẩn (canonical)
(ảnh, GPS,      (hợp nhất,       (tự động +        │
 báo cáo,        khử trùng lặp,   con người cho    │
 chính quyền)    giải mâu thuẫn)  thay đổi lớn)    │
                                                    ├──► Tile renderer ──► /vNN/ trên CDN
                                                    ├──► Graph builder ──► routing tile + CH
                                                    └──► Geocoding index ──► Redis/OpenSearch

Hai nhịp cập nhật khác nhau — và đây là điểm mấu chốt:

  NHỊP CHẬM (hàng tuần, toàn cầu): rebuild tile + graph + CH
    Vì đổi cấu trúc bản đồ là hiếm và rebuild rất đắt.

  NHỊP NHANH (vài phút, chồng lên trên): "lớp phủ sự cố" (incident overlay)
    Đường đóng, tai nạn, công trình → KHÔNG rebuild graph,
    chỉ ghi vào Redis một bản ghi "cạnh e bị chặn / phạt +N giây".
    Routing đọc lớp phủ này và áp lên trọng số gốc lúc truy vấn.
```

> 💡 **Nguyên tắc**: Đừng ép mọi thay đổi đi qua cùng một pipeline. Tách **thay đổi cấu trúc** (hiếm, đắt, build theo lô) khỏi **thay đổi trạng thái** (thường xuyên, rẻ, ghi đè lúc truy vấn). Không có sự tách này thì "một con đường đóng vì tai nạn" sẽ đòi rebuild một đồ thị hàng tỉ cạnh — điều bất khả thi.

**Build incremental, không full rebuild.** Khi một con đường ở Quận 1 đổi, chỉ những tile chứa nó và các tile phân cấp phía trên bị ảnh hưởng:

```
Đường đổi tại ô 9q8yy
  → map tile bị bẩn: z=21..0 tại toạ độ tương ứng ≈ 22 tile (mỗi zoom 1 ô)
    (cộng vài ô kề nếu đường vắt qua biên)
  → routing tile bị bẩn: L0 ô đó, L1 ô cha, L2 ô ông
  → CH: phải chạy lại customization cho phân vùng chứa cạnh đó
    (đây chính là lý do CRP thắng CH thuần — customization cục bộ và rẻ)

Full rebuild 50 PB = nhiều ngày. Incremental = vài phút cho một thay đổi.
```

**Kiểm soát chất lượng** là phần không được bỏ qua: một lỗi trong pipeline có thể chỉ hàng triệu người đi sai. Cần: so sánh diff số lượng (số cạnh đổi >0.1% thì chặn lại, đòi người duyệt), chạy một bộ **route hồi quy** (vài nghìn cặp A→B đã biết đáp án đúng) trên bản đồ mới trước khi phát hành, canary phát hành theo vùng, và **khả năng rollback tức thì** — chính là mẹo version trong path ở §6.6.

### 11.3 Localization — và vì sao nó quyết định cả lựa chọn vector tile

Bản đồ phải hiển thị đúng với người xem, và "đúng" phụ thuộc người xem là ai:

| Khía cạnh | Vấn đề | Cách xử |
|---|---|---|
| **Tên địa danh** | "TP.HCM" / "Ho Chi Minh City" / "胡志明市" | Vector tile mang **nhiều trường tên** (`name`, `name:vi`, `name:en`, `name:ja`), client chọn theo locale. Đây là lý do **nặng ký nhất** khiến vector thắng raster (§6.3) |
| **Chữ viết & hướng chữ** | Tiếng Ả Rập viết phải-sang-trái; tiếng Thái có dấu phức tạp | Client render bằng font hệ thống → xử lý đúng mọi script mà không cần server biết gì |
| **Đơn vị** | km vs dặm, mét vs feet | Client, theo locale |
| **Luật giao thông** | Đi bên trái (Anh, Nhật, Thái) ảnh hưởng chi phí rẽ và chỉ dẫn | Thuộc tính vùng trong routing tile; "rẽ trái" ở Anh là rẽ dễ, ở Việt Nam là rẽ khó |
| **Địa chỉ** | Nhật đánh số theo khối, không theo đường; Việt Nam có "số nhà 12/3A" | Geocoding phải có bộ phân tích riêng theo quốc gia |
| **Biên giới tranh chấp** | Cùng một vùng đất, các nước vẽ khác nhau; hiển thị sai có thể bị chặn dịch vụ tại quốc gia đó | Server chọn bộ hình học biên giới theo **quốc gia phát hành app**, không theo ngôn ngữ. Đây là một **yêu cầu pháp lý**, không phải tính năng |
| **Chỉ dẫn thoại** | Phát âm tên đường bản địa | TTS phía client, kèm gợi ý phiên âm trong dữ liệu khi cần |

> ⚠️ **Bẫy**: biên giới tranh chấp là thứ duy nhất trong bài này **không giải được bằng kỹ thuật**. Nó là quyết định pháp lý/chính sách, và thiết kế chỉ cần đảm bảo **có khả năng phục vụ nhiều phiên bản hình học theo vùng phát hành**. Nêu ra được điều này cho thấy bạn nghĩ tới ràng buộc ngoài kỹ thuật — điều rất được đánh giá cao ở vị trí senior trở lên.

---

## 12. Bottleneck & failure mode

### 12.1 Cái gì nghẽn trước

| Thứ tự | Nghẽn ở đâu | Dấu hiệu | Cách gỡ |
|---|---|---|---|
| 1 | **Băng thông CDN / tile origin** khi cache hit rate tụt | Origin QPS tăng vọt sau mỗi lần bump version toàn cầu | Version theo vùng (§6.6); rollout dần; giữ tile cũ trên origin |
| 2 | **CPU của shortest-path service** giờ cao điểm | p99 route latency tăng; hàng đợi dâng | Autoscale theo CPU; giảm cấp chất lượng (§12.3); route theo geohash để giữ hit rate cache tile |
| 3 | **Ingest location update** giờ cao điểm đi làm | Lag của Kafka/Kinesis tăng | Tăng shard; batch phía client dày hơn; giảm tần suất gửi khi tải cao (backpressure xuống client) |
| 4 | **Map matching (Flink)** — công đoạn đắt nhất trong stream | Watermark lag tăng, traffic weight cũ dần | Tăng parallelism theo geohash; lấy mẫu (sample) bớt khi quá tải — traffic không cần 100% dữ liệu |
| 5 | **Redis traffic weight** — đọc cực nhiều | Latency đọc tăng | Replica đọc; cache cục bộ trong routing server với TTL 30 s |
| 6 | **Tầng WebSocket** — số kết nối | Bộ nhớ và file descriptor cạn | Thêm node; kết nối là stateful nên phải drain khi deploy |

### 12.2 Component chết thì sao

| Chết | Ảnh hưởng ngay | Giảm nhẹ |
|---|---|---|
| **CDN edge POP** | Người dùng vùng đó tải tile chậm | Anycast tự chuyển sang POP kế; client có cache đĩa cục bộ nên bản đồ vùng vừa xem vẫn hiện |
| **Tile origin (S3)** | Cache miss trả lỗi; vùng nóng vẫn chạy nhờ CDN | Multi-region origin; CDN cấu hình **stale-while-revalidate** và **stale-if-error** — phục vụ tile cũ còn hơn không có bản đồ |
| **Traffic weight store (Redis)** | Routing mất traffic realtime | **Fallback sang trọng số lịch sử.** Route vẫn ra, ETA kém chính xác hơn. Hiển thị ETA dạng khoảng rộng hơn. Đây là suy giảm chấp nhận được |
| **ETA / ML service** | Không có dự báo | Fallback sang trung bình lịch sử, rồi tới `length/speed_limit` ở bước cuối. Luôn có số để hiển thị |
| **Shortest-path service** | **Không tính được đường mới** — đây là hỏng nặng nhất, không có fallback rẻ | Nhiều AZ; cache route cho các cặp origin–destination phổ biến; hạ cấp: chỉ phục vụ chuyến ngắn (rẻ), từ chối chuyến liên tỉnh kèm thông báo rõ ràng |
| **Location ingest** | Mất dữ liệu traffic mới | Client **buffer cục bộ** và gửi lại sau; traffic tạm dùng lịch sử. Điều hướng của từng người **không bị ảnh hưởng** vì nó chạy ở client |
| **WebSocket layer** | Phiên navigation rớt | Client tự reconnect có backoff; trong lúc đó vẫn điều hướng offline bằng route đã tải. Người dùng gần như không nhận ra |
| **Geocoding** | Không nhập được địa chỉ dạng chữ | Vẫn chọn điểm trên bản đồ được; cache các truy vấn phổ biến |
| **Offline pipeline** | Bản đồ ngừng cập nhật | **Không ảnh hưởng người dùng trong nhiều ngày.** Đây là lợi ích lớn nhất của việc tách offline khỏi online |

> 💡 **Nguyên tắc thiết kế suy giảm (graceful degradation)**: xếp các thành phần theo thứ tự "mất nó thì tệ đến đâu": *bản đồ hiện ra* > *tính được đường* > *ETA đúng* > *tự đổi đường khi tắc*. Mọi fallback đều đi xuống theo thang này. Người dùng thà có bản đồ với ETA sai 20% còn hơn một màn hình trắng.

### 12.3 Suy giảm có chủ đích khi quá tải

```
Mức 0 (bình thường):  CH + traffic realtime + ML ETA + alternatives + reroute chủ động
Mức 1 (tải cao 70%):  bỏ alternatives; nới TTL cache route lên 5 phút
Mức 2 (tải cao 85%):  ETA dùng bảng precompute, không suy luận online;
                      giảm tần suất cập nhật traffic weight xuống 15 phút
Mức 3 (quá tải 95%):  chỉ dùng trọng số lịch sử; reroute chỉ khi đường ĐÓNG
Mức 4 (khẩn cấp):     chặn tải chuyến > 100 km; phục vụ route từ cache; 
                      map tile vẫn phục vụ bình thường (CDN không liên quan)
```

Điểm đáng nhấn: **mảng rendering gần như không bao giờ phải suy giảm**, vì nó nằm trên CDN. Toàn bộ thang suy giảm chỉ áp cho mảng compute. Đó là phần thưởng của quyết định kiến trúc ở §6.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| Phân phối map tile ở biên | **CloudFront** (+ Origin Shield) | Đúng bài của CDN: nội dung bất biến, dùng chung, cục bộ theo địa lý. Origin Shield thêm một tầng cache giữa POP và S3, giúp 400+ POP không cùng lúc đập vào origin sau mỗi lần phát hành phiên bản mới. Bật Brotli và HTTP/3 (QUIC) — HTTP/3 giúp rõ rệt trên mạng di động chập chờn |
| Lưu 50 PB tile đã render | **S3** (Standard cho vùng nóng, **Intelligent-Tiering** cho phần đuôi dài) | Object storage thuần, không cần tính năng DB. Intelligent-Tiering rất hợp vì phân bố truy cập theo luật luỹ thừa: tile sa mạc ở z=19 sẽ tự trôi xuống tầng lạnh mà không cần ai quản lý. ⚠️ Số lượng object hàng nghìn tỉ ⇒ chi phí **request** mới là khoản lớn, không phải chi phí lưu trữ |
| Tính (z,x,y)→URL, chuẩn hoá cache key, chọn phiên bản theo vùng | **CloudFront Functions** (rẻ, dưới 1 ms) hoặc **Lambda@Edge** (khi cần logic nặng hơn) | Ép logic chọn version/locale xuống edge để giữ cache key ổn định (§6.6). CloudFront Functions đủ cho việc viết lại URL và rất rẻ ở 2 triệu QPS |
| Render tile động cho zoom sâu (§6.4) | **Lambda** (tile lẻ) hoặc **ECS/Fargate** (khi lưu lượng đều), đặt sau CloudFront | Đuôi dài, tải rời rạc và khó đoán ⇒ đúng hình dạng của serverless. CloudFront cache kết quả nên mỗi tile chỉ render một lần |
| Bản đồ, route, geocoding, tracker, geofence **dựng sẵn** | **Amazon Location Service** (Maps / Routes / Places / Trackers / Geofences) | Nếu bạn đang xây một sản phẩm chứ không phải xây Google Maps, đây là câu trả lời đúng: có sẵn vector tile, style, routing ma trận, geocoding, và **Trackers + Geofence Collection** cho vị trí động. ⚠️ Nhưng nó **không cho bạn kiểm soát thuật toán, hàm chi phí hay dữ liệu traffic** — nên trong phỏng vấn hãy nêu nó như baseline rồi nói rõ vì sao bài này phải tự xây |
| Nhận vị trí từ hàng chục triệu thiết bị | **API Gateway WebSocket API** (+ Lambda) hoặc **NLB → ECS** giữ WebSocket | API Gateway WebSocket cho bạn quản lý kết nối, auth, throttle mà không phải vận hành flotilla. ⚠️ Ở mức 1 triệu QPS, chi phí per-message của API Gateway trở nên đáng kể — lúc đó NLB + fleet ECS tự quản rẻ hơn nhiều. Nêu được ngưỡng đánh đổi này ghi điểm |
| Thiết bị nhúng / thiết bị IoT gửi vị trí (xe tải, đội xe) | **AWS IoT Core** | Đúng khi client là thiết bị chứ không phải app: MQTT nhẹ hơn WebSocket nhiều, có device identity bằng chứng chỉ X.509, shadow state khi mất kết nối, và rule engine đẩy thẳng vào Kinesis mà không cần server trung gian |
| Đường ống telemetry vị trí | **Kinesis Data Streams** (phân vùng theo **geohash**, không phải user_id) | Phân vùng theo geohash để map matching ở bước sau chỉ cần giữ đồ thị vùng của shard đó trong bộ nhớ. Dùng **on-demand mode** vì tải lên xuống mạnh theo giờ cao điểm. ⚠️ Coi chừng hot shard ở các đô thị lớn — cần chia nhỏ prefix cho vùng đông |
| Map matching + tổng hợp tốc độ realtime | **Managed Service for Apache Flink** | Cần đúng thứ Flink mạnh: xử lý **stateful** theo khoá (giữ mấy chục giây lịch sử mỗi phiên cho HMM cửa sổ trượt), cửa sổ theo event time, watermark cho dữ liệu tới trễ (điện thoại mất sóng rồi gửi bù). Kinesis Data Analytics SQL hay Lambda đều **không** làm được HMM có trạng thái |
| Trọng số cạnh hiện tại + lớp phủ sự cố | **ElastiCache for Redis/Valkey** (cluster mode) | Vài GB, ghi liên tục, đọc bởi mọi request routing. Đọc từ replica; mỗi routing server cache thêm cục bộ TTL 30 s để cắt bớt round-trip. Mất dữ liệu không thảm hoạ vì có fallback lịch sử |
| Lưu lịch sử vị trí thô | **DynamoDB** (PK `session_id`, SK `timestamp`, bật TTL) hoặc **Keyspaces** (nếu muốn giữ mô hình Cassandra) | Write-heavy thuần, không cần join, không cần transaction. **TTL là bắt buộc** — đặt 7–30 ngày để dữ liệu nhạy cảm tự biến mất thay vì phải nhớ đi xoá. Ghi thẳng vào S3 qua Firehose cho phần phân tích dài hạn |
| Kho dữ liệu lịch sử để huấn luyện | **S3 (Parquet, phân vùng theo ngày/vùng) + Glue Catalog + Athena** | Dữ liệu chuyến đi là bất biến, chỉ ghi thêm, quét theo cột ⇒ đúng bài của data lake. Rẻ hơn nhiều lần so với giữ trong DynamoDB |
| Build tile & routing graph + tiền xử lý CH | **EMR (Spark)** hoặc **AWS Batch** trên **Spot Instances** | Job theo lô, chạy hàng giờ, chịu được gián đoạn ⇒ Spot giảm 70–90% chi phí. Tiền xử lý CH là bài toán song song hoá theo phân vùng đồ thị — hợp Spark |
| Điều phối pipeline offline | **Step Functions** (+ EventBridge Scheduler) | Pipeline nhiều bước có cổng kiểm duyệt (diff quá lớn thì dừng chờ người duyệt) — Step Functions diễn đạt đúng loại luồng đó, kèm retry và quan sát được |
| Huấn luyện & phục vụ mô hình ETA | **SageMaker** (Training Jobs + **Batch Transform** cho precompute, Endpoint cho phần suy luận online) | Điểm mấu chốt: **Batch Transform** để dự đoán trước mọi supersegment cho 2 giờ tới rồi đổ vào ElastiCache (§9.5) — đường nóng chỉ còn tra bảng. Endpoint chỉ dùng cho phần bất thường, nên rẻ |
| Lưu routing tile | **S3** + cache cục bộ trên instance store NVMe của routing server | Tile bất biến, version hoá theo path. NVMe cục bộ cho phép `mmap` gần như tức thì, không đụng mạng |
| Cụm shortest-path | **ECS/EKS trên instance nhiều RAM** (r7g/r8g, Graviton) + **autoscaling theo CPU** | CPU-bound và memory-bound, cần instance sống lâu để giữ tile nóng ⇒ **Lambda là lựa chọn sai** ở đây (state biến mất giữa các lần gọi, nạp lại graph mỗi request). Graviton cho hiệu năng/giá tốt hơn rõ với workload duyệt đồ thị |
| Định tuyến request theo vùng địa lý (cache affinity) | **Route 53 latency/geolocation routing** → ALB theo vùng; hoặc **ALB target group weighted** theo geohash | Hiện thực hoá ý §7.5: request TP.HCM tới cụm giữ sẵn tile TP.HCM |
| Bảo vệ trước lạm dụng tile / cào dữ liệu | **WAF** (rate-based rule) + **CloudFront signed URL** cho lớp cao cấp | Tile không có auth ở đường nóng, nên phòng thủ phải ở edge: chặn quét lưới toạ độ có hệ thống — mối đe doạ thật với dữ liệu bản đồ |
| Quyền riêng tư vị trí | **KMS** cho mã hoá; **S3 Lifecycle** + **DynamoDB TTL** để tự xoá; log đã làm tròn về geohash | §9.2. Đặt vòng đời dữ liệu từ ngày đầu; gỡ về sau thì đã muộn cả về kỹ thuật lẫn pháp lý |
| Giám sát | **CloudWatch** (cache hit rate CDN, p99 route latency, Flink watermark lag, tuổi của traffic weight) | ⚠️ Metric quan trọng nhất mà người ta hay quên: **tuổi trung bình của trọng số traffic**. Hệ thống có thể "khoẻ" theo mọi metric hạ tầng trong khi đang chỉ đường bằng dữ liệu của 40 phút trước |

**Ba câu chốt đáng nhớ:**

1. *"50 petabyte tile nhưng chi phí phục vụ gần như bằng không — vì tile bất biến và dùng chung, nên CloudFront gánh 97% và origin chỉ thấy vài chục nghìn QPS. Toàn bộ mảng rendering là một bài static content được nguỵ trang."*
2. *"Phần đắt nhất không phải lưu trữ mà là CPU của routing. Nên tôi tiêu tiền vào tiền xử lý offline — CRP/CH trên EMR Spot — để đường nóng chỉ còn vài mili-giây. Đổi compute rẻ lúc rảnh lấy compute đắt lúc cao điểm."*
3. *"Map matching là thứ duy nhất trong kiến trúc này bắt buộc phải stateful và realtime, nên nó là lý do duy nhất tôi cần Flink. Mọi thành phần khác đều là stateless serving hoặc batch."*

---

## Cách trình bày khi phỏng vấn / review

1. **Mở đầu bằng việc tách ba mảng.** Câu đầu tiên nên là: *"Bài này thực ra là ba hệ thống có profile tải khác hẳn nhau — tile là static content 2 triệu QPS, routing là compute-bound, traffic là stream processing. Tôi sẽ thiết kế từng mảng rồi chỉ ra chúng gặp nhau ở đâu."* Câu này lập tức cho thấy bạn nhìn ra cấu trúc bài toán, và nó cũng là **khung để quản lý thời gian** — người phỏng vấn sẽ nói cho bạn biết họ muốn đào sâu mảng nào.

2. **Chốt scope to và rõ, nói ra cả thứ mình bỏ.** "Không làm POI search vì đó là bài Proximity Service; không làm multi-stop vì đó là TSP." Bỏ sót thì bị trừ điểm, bỏ có chủ đích thì được cộng.

3. **Làm phép tính 4^z ngay trên bảng.** Đây là con số đặc trưng của bài này. Từ nó dẫn ra ba kết luận liền mạch: hơn 99% tile nằm ở zoom sâu → nên precompute nông và render sâu → và 50 PB thì buộc phải là object storage + CDN. Một phép tính nuôi ba quyết định — đó là cách estimation *nên* được dùng.

4. **Khi nói tile, nhấn vào chữ "bất biến".** Cả kiến trúc CDN đứng trên một tính chất duy nhất đó. Và ngay sau đó nêu mẹo version-trong-path để tránh invalidation — chi tiết này cho thấy bạn từng vận hành CDN thật, không chỉ vẽ box.

5. **Đừng dừng ở "dùng A\* thay Dijkstra".** Đây là bẫy lớn nhất của bài. Hãy kể chuỗi: Dijkstra (hình tròn) → A* (hình elip, nhanh 2–10×, **vẫn không đủ**) → bidirectional (chia đôi) → **contraction hierarchies** (tiền xử lý offline, nhanh hàng nghìn lần mà vẫn tối ưu) → và ngay lập tức tự nêu điểm yếu của CH: *"nhưng CH giả định trọng số tĩnh, mà traffic đổi mỗi vài phút"* → CRP tách pha customization. Tự đặt ra và tự trả lời câu hỏi phản biện là dấu hiệu rõ nhất của ứng viên cấp cao.

6. **Giải thích shortcut của CH bằng một hình vẽ ba nút.** `u —5— v —3— w` thành `u —8— w`, nhớ "đi qua v". Ba nút là đủ để người nghe hiểu ý tưởng; đừng sa vào thứ tự co nút hay heuristic xếp hạng trừ khi được hỏi.

7. **Dành thời gian xứng đáng cho map matching.** Đây là phần hầu hết ứng viên bỏ qua, nên nó là cơ hội tạo khác biệt lớn nhất. Kể theo đúng thứ tự: GPS lệch 20–50 m trong phố → snap từng điểm độc lập cho ra "xe nhảy qua lại giữa hai đường song song" → nên phải khớp **cả chuỗi** bằng HMM với hai xác suất (emission theo khoảng cách, transition theo tính đi được) → Viterbi. Vẽ hình hai đường song song với các chấm GPS rơi vãi — hình đó bán ý tưởng tốt hơn mọi đoạn văn.

8. **Với ETA, nhấn rằng nhãn đến miễn phí.** "Ta biết chuyến đi thật mất bao lâu vì chính người dùng vừa đi xong nó." Đây là điều khiến bài ML này khác hẳn đa số bài ML khác, và nó giải thích vì sao vòng phản hồi dữ liệu là lợi thế cạnh tranh không thể sao chép.

9. **Với rerouting, chuyển trọng tâm từ tính toán sang trải nghiệm.** Việc tìm đường mới là dễ; việc quyết định **có nên làm phiền người đang lái xe** mới khó. Nêu vài điều kiện AND, nêu histeresis chống flapping, và nêu tác động ngược "dồn hết mọi người sang một tuyến thì tuyến đó tắc". Ba ý này cho thấy bạn nghĩ tới người dùng thật, không chỉ tới thuật toán.

10. **Luôn gắn mỗi con số với một quyết định.** Không nói "khoảng 200K QPS" rồi thôi. Nói "200K QPS với JSON qua HTTP là 1.2 GB/s chỉ để chuyển 36 byte dữ liệu thật — nên tôi dùng protobuf trên kết nối lâu dài, và quan trọng hơn là batch phía client vì thứ ngốn pin là số lần bật radio, không phải số byte."

11. **Khi bị hỏi "hệ thống chết thì sao", trả lời theo thang suy giảm**, đừng liệt kê từng component. *"Thứ tự ưu tiên của tôi là: bản đồ hiện ra > tính được đường > ETA đúng > tự đổi đường. Traffic store chết thì tụt xuống trọng số lịch sử — route vẫn ra, ETA kém đi, và người dùng gần như không nhận ra. Shortest-path service chết mới là hỏng thật, vì không có fallback rẻ."*

12. **Chốt bằng đúng một câu về sự tách bạch.** *"Điều tôi thích nhất ở thiết kế này là pipeline offline có thể chết vài ngày mà không ai nhận ra, còn CDN có thể phục vụ bản đồ ngay cả khi toàn bộ phần compute sập. Ba mảng gần như không phụ thuộc nhau — và đó là thứ giữ cho một hệ thống 1 tỉ người dùng đứng vững."*
