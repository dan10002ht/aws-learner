# Kiến trúc máy tính & Memory Hierarchy

Bạn viết code, nó chạy. Nhưng *vì sao* hai đoạn code có cùng độ phức tạp Big-O lại chênh nhau 10 lần về tốc độ? Vì sao đảo thứ tự hai vòng `for` lồng nhau có thể nhanh gấp mấy lần dù số phép tính y hệt? Câu trả lời không nằm ở thuật toán — nó nằm ở **phần cứng bên dưới**: CPU lấy lệnh và dữ liệu ra sao, bộ nhớ được xếp thành nhiều tầng thế nào.

Bài này mở nắp capo. Sau khi đọc xong, bạn sẽ nhìn một vòng lặp và *cảm* được nó nhanh hay chậm, trước cả khi đo.

Hình ảnh xuyên suốt: **CPU là một đầu bếp siêu nhanh trong một căn bếp**. Nguyên liệu (dữ liệu) nằm rải rác từ ngay trên thớt, tới tủ lạnh, tới siêu thị ngoài phố. Đầu bếp nhanh đến mức **thời gian phần lớn là đi lấy nguyên liệu, không phải nấu**.

---

## 1. CPU làm gì: vòng lặp fetch–decode–execute

Ở mức bản chất, CPU chỉ lặp đi lặp lại đúng một vòng, hàng tỷ lần mỗi giây:

```
┌─────────────────────────────────────────────┐
│  FETCH   →   DECODE   →   EXECUTE   →  (lặp) │
│  lấy lệnh    giải mã      thực thi            │
└─────────────────────────────────────────────┘
```

- **Fetch**: lấy lệnh tiếp theo từ bộ nhớ. Địa chỉ của lệnh này nằm trong một thanh ghi đặc biệt gọi là **PC** (Program Counter — con trỏ lệnh).
- **Decode**: giải mã lệnh đó nghĩa là gì — "cộng hai số", "so sánh", "nhảy tới chỗ khác".
- **Execute**: làm việc đó, rồi cập nhật PC trỏ tới lệnh kế tiếp.

Đầu bếp đọc một dòng công thức (fetch), hiểu nó bảo làm gì (decode), rồi thao tác (execute), rồi đọc dòng tiếp theo.

### Lệnh máy thực ra rất "ngu"

Một dòng code `total = a + b + c` của bạn, sau khi compile, biến thành chuỗi lệnh máy đại loại:

```
LOAD  R1, [a]      ; nạp giá trị a vào thanh ghi R1
LOAD  R2, [b]      ; nạp b vào R2
ADD   R1, R1, R2   ; R1 = R1 + R2
LOAD  R2, [c]      ; nạp c vào R2
ADD   R1, R1, R2   ; R1 = R1 + R2
STORE [total], R1  ; ghi kết quả ra biến total
```

CPU không biết "biến", "vòng lặp", "object". Nó chỉ biết: nạp, cộng, so sánh, ghi, nhảy. Mọi thứ phức tạp đều dựng từ vài chục lệnh sơ đẳng này.

> 💡 **Ghi nhớ**: CPU = vòng lặp fetch-decode-execute chạy hàng tỷ lần/giây trên những lệnh cực kỳ đơn giản. Code cao cấp của bạn cuối cùng đều phân rã thành chuỗi lệnh nạp/tính/ghi.

---

## 2. Register, RAM và bus: ba tầng đầu tiên

### Register — túi áo của đầu bếp

**Register** (thanh ghi) là những ô nhớ tí hon **nằm ngay bên trong CPU**. Một CPU 64-bit thường chỉ có khoảng 16–32 thanh ghi cho mục đích chung, mỗi cái chứa đúng 8 byte. Đây là chỗ *duy nhất* CPU có thể trực tiếp tính toán.

Giống cái túi áo của đầu bếp: lấy ra/bỏ vào tức thì, nhưng chỉ nhét được vài thứ. Mọi phép tính `ADD`, `SUB`, `CMP` đều thao tác trên register. Muốn cộng hai số đang nằm trong RAM, CPU **bắt buộc** phải `LOAD` chúng vào register trước.

### RAM — siêu thị ngoài phố

**RAM** (Random Access Memory) là bộ nhớ chính: hàng GB, chứa toàn bộ chương trình và dữ liệu đang chạy. "Random access" nghĩa là truy cập ô nào cũng *về lý thuyết* nhanh như nhau (khác ổ đĩa quay ngày xưa).

Vấn đề: so với tốc độ CPU, RAM **chậm kinh khủng**. CPU chạy 3 GHz làm một phép cộng trong ~0.3 nanosecond. Nhưng đi lấy một byte từ RAM mất ~100 nanosecond — tức CPU phải **đứng chờ ~300 nhịp** chỉ để có dữ liệu. Đầu bếp nấu xong món rồi mà nguyên liệu món sau còn đang trên đường từ siêu thị về.

### Bus — con đường vận chuyển

**Bus** là hệ thống dây dẫn chở dữ liệu và địa chỉ qua lại giữa CPU, RAM, và thiết bị I/O.

```
        ┌──────┐   address bus   ┌──────┐
        │      │ ───(địa chỉ)──► │      │
        │ CPU  │   data bus      │ RAM  │
        │      │ ◄──(dữ liệu)──► │      │
        └──────┘                 └──────┘
            │     control bus
            └──── (đọc/ghi?) ────►
```

- **Address bus**: CPU nói "tôi cần ô nhớ số mấy".
- **Data bus**: dữ liệu thực sự chạy qua đây. Độ rộng bus (64-bit) quyết định mỗi lần chuyển được bao nhiêu byte.
- **Control bus**: tín hiệu điều khiển (đọc hay ghi).

Bus là cổ chai vật lý: dù có nhiều core, chúng vẫn phải chia nhau con đường tới RAM.

---

## 3. Memory Hierarchy: vì sao có nhiều tầng bộ nhớ

Kỹ sư phần cứng đối mặt một mâu thuẫn: bộ nhớ **vừa nhanh vừa to vừa rẻ** là không tồn tại. Nhanh thì đắt và nhỏ; to và rẻ thì chậm. Giải pháp: xếp **nhiều tầng**, mỗi tầng đánh đổi khác nhau, gọi là **memory hierarchy**.

```
       nhanh, nhỏ, đắt
            ▲
   ┌────────────────┐
   │   Register     │  < 1 KB
   ├────────────────┤
   │   L1 cache     │  ~32–64 KB / core
   ├────────────────┤
   │   L2 cache     │  ~256 KB–1 MB / core
   ├────────────────┤
   │   L3 cache     │  ~8–32 MB (chia chung)
   ├────────────────┤
   │      RAM       │  ~8–64 GB
   ├────────────────┤
   │   SSD / Disk   │  ~256 GB – nhiều TB
   └────────────────┘
            ▼
       chậm, to, rẻ
```

Ý tưởng: giữ dữ liệu **đang dùng** ở tầng nhanh, dữ liệu *ít dùng* ở tầng chậm. CPU tự động kéo dữ liệu lên các tầng cache khi cần — bạn không phải code gì cả, nó diễn ra ngầm.

### Bảng latency numbers (phải khắc vào đầu)

Đây là "latency numbers every programmer should know", quy đổi sang đơn vị con người cảm được (lấy 1 nhịp CPU ≈ 1 giây):

| Truy cập | Latency thực | Quy đổi (1 nhịp = 1 giây) |
|---|---|---|
| Register | ~0.3 ns | ngay lập tức |
| L1 cache | ~1 ns | 3 giây |
| L2 cache | ~4 ns | 12 giây |
| L3 cache | ~12 ns | 40 giây |
| RAM | ~100 ns | **5 phút** |
| SSD (NVMe) | ~100 µs | **3 ngày** |
| HDD (đĩa quay) | ~10 ms | **gần 1 năm** |
| Mạng tới máy khác cùng datacenter | ~0.5 ms | ~2 tuần |

Nhìn cột bên phải: lấy dữ liệu từ L1 mất "3 giây", từ RAM mất "5 phút", từ SSD mất "3 ngày". **Khoảng cách giữa cache và RAM gấp ~100 lần.** Đây là lý do cốt lõi vì sao access pattern quan trọng hơn bạn tưởng.

> 💡 **Ghi nhớ**: chênh lệch tốc độ giữa các tầng không phải vài %, mà là **bậc độ lớn (10×, 100×)**. Tối ưu performance phần lớn là tối ưu việc *dữ liệu nằm ở tầng nào* khi CPU cần nó.

---

## 4. Cache line & locality: cache hoạt động thế nào

Cache không lấy từng byte một. Khi CPU cần một byte không có trong cache (gọi là **cache miss**), nó kéo nguyên một khối liền kề từ RAM lên, gọi là **cache line** — thường **64 byte**.

```
Bạn xin byte ở địa chỉ 1000:
RAM:  ... [992 ... 1000 ... 1055] ...
                    ▲
            CPU kéo cả khối 64 byte này lên cache
            (chứ không chỉ riêng byte 1000)
```

Logic của nhà thiết kế: "Nếu mày cần byte này, khả năng cao mày sắp cần mấy byte sát bên." Họ đặt cược vào hai nguyên lý **locality**:

| Loại locality | Nghĩa | Ví dụ |
|---|---|---|
| **Spatial locality** (không gian) | Dùng ô X thì sắp dùng ô gần X | Duyệt mảng tuần tự `a[0], a[1], a[2]...` |
| **Temporal locality** (thời gian) | Dùng ô X thì sắp dùng lại chính X | Biến đếm `i`, biến tổng `sum` được đụng tới mỗi vòng lặp |

Đầu bếp khi với tay lấy củ hành, tiện thể bê cả cái rổ rau gần đó đặt lên thớt — vì đoán sắp dùng tới. Nếu đoán đúng (locality tốt), mọi nguyên liệu kế tiếp đã sẵn trên thớt: **cache hit**. Nếu đoán sai, lại phải chạy ra siêu thị: **cache miss** ~100 ns.

---

## 5. Vì sao duyệt mảng tuần tự nhanh hơn ngẫu nhiên

Đây là ví dụ kinh điển nhất, và nó *trực tiếp* dùng được khi viết code.

Giả sử mảng `int arr[N]` (mỗi int 4 byte). Một cache line 64 byte chứa được **16 int liền nhau**.

**Duyệt tuần tự** `for i = 0..N: sum += arr[i]`:

```
arr: [ 0  1  2  ... 15 ][ 16 17 ... 31 ][ ... ]
      └── 1 cache line ─┘└── line kế ──┘
Đọc arr[0] → MISS, kéo 16 phần tử lên cache.
arr[1..15] → HIT hết (đã có sẵn). 1 miss cho 16 lần đọc.
```

**Duyệt ngẫu nhiên** (index random, hoặc nhảy bước lớn):

```
Đọc arr[8123] → MISS, kéo line lên.
Đọc arr[412]  → MISS (khác line), kéo line khác.
Đọc arr[991]  → MISS ...
Gần như MỌI lần đọc đều miss → mỗi lần ~100 ns.
```

Cùng số phép tính, cùng `O(N)`, nhưng:

| Cách duyệt | Cache miss | Thời gian tương đối |
|---|---|---|
| Tuần tự | ~1 miss / 16 phần tử | **1×** (nhanh) |
| Ngẫu nhiên | ~1 miss / 1 phần tử | **5–10×** (chậm) |

Đây cũng là lý do **đảo thứ tự vòng lặp lồng nhau** thay đổi tốc độ. Với mảng 2D lưu **row-major** (C, Go, NumPy mặc định) — các phần tử cùng hàng nằm liền nhau trong bộ nhớ:

```c
// NHANH: chạy theo hàng → đi dọc bộ nhớ liền mạch (spatial locality tốt)
for (i...) for (j...)  sum += m[i][j];

// CHẬM: chạy theo cột → mỗi bước nhảy cả một hàng trong bộ nhớ → miss liên tục
for (j...) for (i...)  sum += m[i][j];
```

Hai đoạn này khác nhau **đúng thứ tự hai dòng `for`**, nhưng đoạn dưới có thể chậm gấp 3–8 lần trên ma trận lớn. Big-O y hệt `O(N²)` — profiler mới lộ ra sự thật.

> ⚠️ **Bẫy**: "Cùng Big-O thì cùng tốc độ." Sai. Big-O đếm *số phép tính*, không đếm *dữ liệu nằm ở tầng nào*. Một thuật toán `O(N²)` cache-friendly có thể đánh bại `O(N log N)` cache-hostile trên dữ liệu vừa phải.

---

## 6. Cache miss tốn kém ra sao (liên hệ data structure)

Giờ ghép với data structure — đây là chỗ kiến thức này "ăn tiền".

**Array vs Linked list**, cùng lưu N phần tử, cùng duyệt hết:

```
Array:        [a][b][c][d][e]   ← nằm liền nhau trong RAM
                                  ↑ spatial locality TUYỆT VỜI

Linked list:  [a]→ ... →[d]→ ... →[b]→ ... →[e]
              mỗi node cấp phát rải rác khắp heap (malloc)
              mỗi lần `node = node->next` = một cú nhảy địa chỉ random
              → gần như mỗi node là 1 cache miss
```

Trên giấy cả hai duyệt `O(N)`. Trên CPU thật, array thường nhanh **vài lần** vì linked list bắt CPU "chạy ra siêu thị" gần như mỗi bước. Đây là lý do `std::vector` / `ArrayList` thường thắng `std::list` / `LinkedList` ngay cả ở các thao tác mà linked list "đáng lẽ" tốt hơn.

Cùng nguyên lý:
- **Array of Structs vs Struct of Arrays**: nếu chỉ cần 1 field, gom field đó thành mảng riêng (SoA) → mỗi cache line chứa toàn dữ liệu bạn cần, không phí.
- **HashMap**: nhanh về Big-O nhưng các bucket rải rác → thường nhiều cache miss hơn duyệt array tuần tự.

---

## 7. Branch prediction: CPU đoán tương lai

CPU hiện đại không làm xong lệnh này mới bắt đầu lệnh sau. Nó **pipeline**: trong khi lệnh A đang execute, lệnh B đã fetch, lệnh C đang được chuẩn bị — như dây chuyền lắp ráp.

Rắc rối xảy ra ở lệnh `if`/rẽ nhánh (**branch**): CPU chưa biết sẽ đi nhánh nào, nhưng pipeline không cho phép đứng chờ. Nên nó **đoán** (branch prediction) — thường đoán "lần này giống các lần trước" — rồi chạy tiếp theo dự đoán.

```
if (x > 0) { A } else { B }

Đoán "sẽ vào A" → CPU đã chạy trước A vài bước.
  ├─ Đoán ĐÚNG  → tuyệt, không phí gì.
  └─ Đoán SAI   → vứt hết việc đã làm, dọn pipeline,
                  bắt đầu lại từ B → phạt ~10–20 nhịp.
```

Hệ quả thực tế nổi tiếng: **xử lý mảng đã sort nhanh hơn mảng chưa sort**, dù code y hệt:

```c
for (i...) if (arr[i] > threshold) sum += arr[i];
```

- Mảng **đã sort**: điều kiện chuyển trạng thái đúng một lần (false...false rồi true...true). CPU đoán gần như luôn đúng → nhanh.
- Mảng **chưa sort**: điều kiện nhảy lung tung → CPU đoán sai liên tục → mỗi miss phạt chục nhịp → chậm vài lần.

> 💡 **Ghi nhớ**: branch khó đoán (random) làm chậm code. Đôi khi viết **branchless** (dùng phép toán thay `if`) lại nhanh hơn vì xoá luôn rủi ro đoán sai.

---

## 8. Vì sao kỹ sư cần biết

Đây không phải kiến thức "biết cho vui" — nó đổi cách bạn debug, tối ưu và thiết kế hệ thống:

**Debug performance.** Khi một vòng lặp chậm bất thường dù Big-O đẹp, nghi ngay **cache miss** hoặc **branch misprediction**. Dùng profiler (`perf stat` trên Linux cho `cache-misses`, `branch-misses`; Instruments trên macOS). Đừng đoán mò — đo. Cache miss là thủ phạm số một của kiểu lỗi "code đúng mà chậm khó hiểu".

**Chọn data structure & access pattern.** Mặc định ưu tiên cấu trúc **liền mạch trong bộ nhớ** (array/vector/slice) hơn cấu trúc rải rác (linked list, cây con trỏ) khi cần duyệt nhiều. Duyệt dữ liệu theo **đúng thứ tự nó nằm trong bộ nhớ**. Một dòng đổi thứ tự loop có thể là bản vá performance rẻ nhất bạn từng viết.

**Thiết kế hệ thống & chi phí.** Memory hierarchy không dừng ở CPU — nó mở rộng ra cả kiến trúc phân tán, với cùng một logic "tầng nhanh nhỏ đắt, tầng chậm to rẻ":

| Tầng "cache" trong system design | Vai trò |
|---|---|
| Biến trong RAM của process | nhanh nhất, mất khi restart |
| **Redis / ElastiCache** (in-memory) | cache chia sẻ giữa nhiều server |
| **CDN** (CloudFront) | cache nội dung gần người dùng |
| Database (RDS) | "RAM" của hệ thống |
| **S3 / object storage** | "disk" — to, rẻ, chậm hơn |

Trên AWS, chọn nhầm tầng = trả nhầm tiền và nhầm tốc độ: nhét dữ liệu nóng truy cập triệu lần/giây vào S3 (vai trò "đĩa") thay vì ElastiCache (vai trò "cache") thì vừa chậm vừa đắt — đúng kiểu bắt đầu bếp chạy ra siêu thị mỗi lần cần một nhúm muối. Bảng latency numbers ở mục 3 chính là thứ giúp bạn ước lượng nhanh "thao tác này nên đặt ở tầng nào" trước khi viết một dòng code.

**Tư duy gốc cần nhớ:** *CPU rất nhanh, bộ nhớ tương đối chậm, nên performance phần lớn là cuộc chơi giữ dữ liệu gần CPU.* Mọi mẹo tối ưu trong bài — locality, array liền mạch, sort để branch dễ đoán, cache nhiều tầng — đều là biến thể của đúng một câu đó.
