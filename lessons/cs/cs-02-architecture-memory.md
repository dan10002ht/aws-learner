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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Kim tự tháp memory hierarchy</title>
  <desc>Tháp bộ nhớ từ đỉnh xuống đáy: Register, L1, L2, L3 cache, RAM, SSD, Disk. Lên trên nhanh nhỏ đắt, xuống dưới chậm to rẻ, kèm dung lượng mỗi tầng.</desc>
  <text x="360" y="26" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Memory Hierarchy — đánh đổi theo tầng</text>
  <!-- trục mũi tên trái: nhanh/nhỏ/đắt lên trên -->
  <g stroke="currentColor" stroke-width="1.4" fill="currentColor">
    <line x1="40" y1="360" x2="40" y2="58"/>
    <polygon points="40,48 35,62 45,62"/>
  </g>
  <text x="56" y="60" font-size="11.5" font-weight="600" fill="currentColor">nhanh · nhỏ · đắt</text>
  <!-- trục mũi tên phải: chậm/to/rẻ xuống dưới -->
  <g stroke="currentColor" stroke-width="1.4" fill="currentColor">
    <line x1="680" y1="58" x2="680" y2="350"/>
    <polygon points="680,360 675,346 685,346"/>
  </g>
  <text x="664" y="356" font-size="11.5" font-weight="600" text-anchor="end" fill="currentColor">chậm · to · rẻ</text>
  <!-- tầng 1: Register (đỉnh, hẹp nhất) -->
  <polygon points="300,52 420,52 432,96 288,96" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="72" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Register</text>
  <text x="360" y="88" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">&lt; 1 KB</text>
  <!-- L1 -->
  <polygon points="288,100 432,100 444,144 276,144" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="120" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">L1 cache</text>
  <text x="360" y="136" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">~32–64 KB / core</text>
  <!-- L2 -->
  <polygon points="276,148 444,148 456,192 264,192" fill="#10b981" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="168" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">L2 cache</text>
  <text x="360" y="184" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">~256 KB–1 MB / core</text>
  <!-- L3 -->
  <polygon points="264,196 456,196 468,240 252,240" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="216" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">L3 cache</text>
  <text x="360" y="232" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">~8–32 MB (chia chung)</text>
  <!-- RAM -->
  <polygon points="252,244 468,244 480,288 240,288" fill="#f59e0b" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="264" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">RAM</text>
  <text x="360" y="280" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">~8–64 GB</text>
  <!-- SSD -->
  <polygon points="240,292 480,292 492,336 228,336" fill="#f59e0b" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="312" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">SSD</text>
  <text x="360" y="328" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">~256 GB – vài TB</text>
  <!-- Disk (đáy, rộng nhất) -->
  <polygon points="228,340 492,340 504,384 216,384" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.22"/>
  <text x="360" y="360" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Disk (HDD)</text>
  <text x="360" y="376" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">nhiều TB</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Latency các tầng bộ nhớ theo thang logarit</title>
  <desc>Bar chart thang log so sánh latency: L1 1ns, L2 4ns, L3 12ns, RAM 100ns, mạng 0.5ms, SSD 100us, HDD 10ms. Chiều dài cột tỉ lệ log để thấy gap 100 lần giữa cache và RAM.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Latency theo thang log (mỗi vạch = ×10)</text>
  <!-- L1: 1ns, log0 -> base length -->
  <g>
    <text x="120" y="62" font-size="12" font-weight="600" text-anchor="end" fill="currentColor">L1 cache</text>
    <rect x="130" y="50" width="36" height="16" rx="3" fill="#10b981" fill-opacity="0.9"/>
    <text x="176" y="62" font-size="10.5" fill="currentColor" opacity="0.75">~1 ns · "3 giây"</text>
  </g>
  <!-- L2: 4ns ~ log 0.6 -->
  <g>
    <text x="120" y="92" font-size="12" font-weight="600" text-anchor="end" fill="currentColor">L2 cache</text>
    <rect x="130" y="80" width="58" height="16" rx="3" fill="#10b981" fill-opacity="0.75"/>
    <text x="198" y="92" font-size="10.5" fill="currentColor" opacity="0.75">~4 ns · "12 giây"</text>
  </g>
  <!-- L3: 12ns ~ log 1.08 -->
  <g>
    <text x="120" y="122" font-size="12" font-weight="600" text-anchor="end" fill="currentColor">L3 cache</text>
    <rect x="130" y="110" width="82" height="16" rx="3" fill="#10b981" fill-opacity="0.6"/>
    <text x="222" y="122" font-size="10.5" fill="currentColor" opacity="0.75">~12 ns · "40 giây"</text>
  </g>
  <!-- gap line giữa cache và RAM -->
  <line x1="130" y1="136" x2="690" y2="136" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 4"/>
  <text x="690" y="150" font-size="10.5" font-style="italic" text-anchor="end" fill="currentColor" opacity="0.7">↓ vực ~100× giữa cache và RAM ↓</text>
  <!-- RAM: 100ns ~ log 2 -->
  <g>
    <text x="120" y="174" font-size="12" font-weight="600" text-anchor="end" fill="currentColor">RAM</text>
    <rect x="130" y="162" width="150" height="16" rx="3" fill="#f59e0b" fill-opacity="0.85"/>
    <text x="290" y="174" font-size="10.5" fill="currentColor" opacity="0.75">~100 ns · "5 phút"</text>
  </g>
  <!-- Mạng: 0.5ms = 500000ns ~ log 5.7 -->
  <g>
    <text x="120" y="204" font-size="12" font-weight="600" text-anchor="end" fill="currentColor">Mạng (DC)</text>
    <rect x="130" y="192" width="420" height="16" rx="3" fill="#3b82f6" fill-opacity="0.7"/>
    <text x="560" y="204" font-size="10.5" fill="currentColor" opacity="0.75">~0.5 ms · "2 tuần"</text>
  </g>
  <!-- SSD: 100us = 100000ns ~ log 5 -->
  <g>
    <text x="120" y="234" font-size="12" font-weight="600" text-anchor="end" fill="currentColor">SSD (NVMe)</text>
    <rect x="130" y="222" width="370" height="16" rx="3" fill="#8b5cf6" fill-opacity="0.7"/>
    <text x="510" y="234" font-size="10.5" fill="currentColor" opacity="0.75">~100 µs · "3 ngày"</text>
  </g>
  <!-- HDD: 10ms = 10000000ns ~ log 7 -->
  <g>
    <text x="120" y="264" font-size="12" font-weight="600" text-anchor="end" fill="currentColor">HDD</text>
    <rect x="130" y="252" width="518" height="16" rx="3" fill="#8b5cf6" fill-opacity="0.9"/>
    <text x="130" y="286" font-size="10.5" fill="currentColor" opacity="0.75">~10 ms · "gần 1 năm"</text>
  </g>
  <!-- trục log đáy -->
  <line x1="130" y1="306" x2="660" y2="306" stroke="currentColor" stroke-opacity="0.35"/>
  <g font-size="9.5" fill="currentColor" opacity="0.6" text-anchor="middle">
    <text x="148" y="322">1 ns</text>
    <text x="280" y="322">100 ns</text>
    <text x="430" y="322">10 µs</text>
    <text x="580" y="322">1 ms</text>
  </g>
  <text x="360" y="344" font-size="10" font-style="italic" text-anchor="middle" fill="currentColor" opacity="0.6">trục logarit: mỗi cột dài thêm 1 đoạn = chậm gấp 10 lần</text>
</svg>

> 💡 **Ghi nhớ**: chênh lệch tốc độ giữa các tầng không phải vài %, mà là **bậc độ lớn (10×, 100×)**. Tối ưu performance phần lớn là tối ưu việc *dữ liệu nằm ở tầng nào* khi CPU cần nó.

---

## 4. Cache line & locality: cache hoạt động thế nào

Cache không lấy từng byte một. Khi CPU cần một byte không có trong cache (gọi là **cache miss**), nó kéo nguyên một khối liền kề từ RAM lên, gọi là **cache line** — thường **64 byte**.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Cache line 64 byte: xin 1 byte, kéo cả khối lên cache</title>
  <desc>CPU cần byte ở địa chỉ 1000 nhưng kéo nguyên cache line 64 byte liền kề từ RAM lên cache, minh hoạ spatial locality và temporal locality.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Cache line: xin 1 byte → CPU kéo cả khối 64 byte</text>
  <!-- RAM strip -->
  <text x="30" y="78" font-size="12" font-weight="700" fill="currentColor">RAM</text>
  <g>
    <!-- ô trước (không lấy) -->
    <rect x="80" y="62" width="44" height="34" rx="4" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="102" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.5">...960</text>
    <!-- cache line 64 byte = khối được kéo -->
    <rect x="128" y="58" width="360" height="42" rx="6" fill="#3b82f6" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.5"/>
    <text x="170" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">992</text>
    <!-- byte được xin -->
    <rect x="200" y="64" width="40" height="30" rx="4" fill="#f59e0b" fill-opacity="0.9"/>
    <text x="220" y="84" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">1000</text>
    <text x="300" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">...byte liền kề...</text>
    <text x="455" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.7">1055</text>
    <!-- ô sau (không lấy) -->
    <rect x="492" y="62" width="44" height="34" rx="4" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="514" y="84" font-size="9.5" text-anchor="middle" fill="currentColor" opacity="0.5">1056...</text>
  </g>
  <text x="308" y="118" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">cache line = 64 byte liền kề (992 → 1055)</text>
  <!-- mũi tên kéo lên cache -->
  <g stroke="currentColor" stroke-width="1.6" fill="currentColor">
    <line x1="308" y1="128" x2="308" y2="160"/>
    <polygon points="308,170 302,156 314,156"/>
  </g>
  <text x="320" y="150" font-size="10.5" fill="currentColor">kéo cả khối</text>
  <!-- cache box -->
  <text x="30" y="200" font-size="12" font-weight="700" fill="currentColor">L1 cache</text>
  <rect x="128" y="176" width="360" height="40" rx="6" fill="#10b981" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="308" y="201" font-size="10.5" text-anchor="middle" fill="currentColor">64 byte giờ đã ở cache → các byte sát bên: HIT</text>
  <!-- chú thích 2 locality -->
  <g font-size="10">
    <rect x="546" y="58" width="160" height="42" rx="6" fill="#3b82f6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="556" y="76" font-weight="700" fill="currentColor">Spatial</text>
    <text x="556" y="92" fill="currentColor" opacity="0.75">dùng X → sắp dùng X±1</text>
    <rect x="546" y="176" width="160" height="42" rx="6" fill="#8b5cf6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="556" y="194" font-weight="700" fill="currentColor">Temporal</text>
    <text x="556" y="210" fill="currentColor" opacity="0.75">dùng X → sắp dùng lại X</text>
  </g>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Duyệt mảng tuần tự so với ngẫu nhiên: hit và miss theo cache line</title>
  <desc>Mảng chia thành cache line 16 phần tử. Duyệt tuần tự: 1 miss đầu line rồi 15 hit. Duyệt ngẫu nhiên: gần như mỗi lần đọc là 1 miss vì nhảy giữa các line.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Tuần tự (1 miss + 15 hit) vs Ngẫu nhiên (toàn miss)</text>
  <!-- legend -->
  <rect x="190" y="36" width="16" height="14" rx="3" fill="#10b981" fill-opacity="0.85"/>
  <text x="212" y="48" font-size="11" fill="currentColor">HIT (đã có trong cache)</text>
  <rect x="400" y="36" width="16" height="14" rx="3" fill="#ef4444" fill-opacity="0.85"/>
  <text x="422" y="48" font-size="11" fill="currentColor">MISS (phải ra RAM ~100 ns)</text>
  <!-- TUẦN TỰ -->
  <text x="30" y="92" font-size="12.5" font-weight="700" fill="currentColor">Tuần tự</text>
  <!-- cache line 1: 16 ô, ô đầu miss, 15 hit -->
  <g>
    <rect x="30" y="100" width="304" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 3"/>
    <rect x="34" y="104" width="14" height="26" rx="2" fill="#ef4444" fill-opacity="0.85"/>
    <!-- 15 hit ô -->
    <g fill="#10b981" fill-opacity="0.8">
      <rect x="52" y="104" width="14" height="26" rx="2"/><rect x="70" y="104" width="14" height="26" rx="2"/><rect x="88" y="104" width="14" height="26" rx="2"/><rect x="106" y="104" width="14" height="26" rx="2"/><rect x="124" y="104" width="14" height="26" rx="2"/><rect x="142" y="104" width="14" height="26" rx="2"/><rect x="160" y="104" width="14" height="26" rx="2"/><rect x="178" y="104" width="14" height="26" rx="2"/><rect x="196" y="104" width="14" height="26" rx="2"/><rect x="214" y="104" width="14" height="26" rx="2"/><rect x="232" y="104" width="14" height="26" rx="2"/><rect x="250" y="104" width="14" height="26" rx="2"/><rect x="268" y="104" width="14" height="26" rx="2"/><rect x="286" y="104" width="14" height="26" rx="2"/><rect x="304" y="104" width="14" height="26" rx="2"/>
    </g>
    <text x="182" y="150" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">1 cache line = 16 phần tử</text>
  </g>
  <!-- line kế (tiếp tục cùng pattern) -->
  <g>
    <rect x="346" y="100" width="120" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 3"/>
    <rect x="350" y="104" width="14" height="26" rx="2" fill="#ef4444" fill-opacity="0.85"/>
    <g fill="#10b981" fill-opacity="0.8">
      <rect x="368" y="104" width="14" height="26" rx="2"/><rect x="386" y="104" width="14" height="26" rx="2"/><rect x="404" y="104" width="14" height="26" rx="2"/><rect x="422" y="104" width="14" height="26" rx="2"/><rect x="440" y="104" width="14" height="26" rx="2"/>
    </g>
  </g>
  <text x="480" y="122" font-size="11" fill="currentColor" opacity="0.7">→ ...</text>
  <text x="540" y="122" font-size="11.5" font-weight="600" fill="#10b981">~1 miss / 16 → nhanh</text>
  <!-- NGẪU NHIÊN -->
  <text x="30" y="206" font-size="12.5" font-weight="700" fill="currentColor">Ngẫu nhiên</text>
  <!-- nhiều line, mỗi lần đọc chạm line khác → toàn miss -->
  <g>
    <rect x="30" y="214" width="120" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3 3"/>
    <rect x="158" y="214" width="120" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3 3"/>
    <rect x="286" y="214" width="120" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3 3"/>
    <rect x="414" y="214" width="120" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3 3"/>
    <!-- 1 ô miss mỗi line, vị trí rải rác -->
    <rect x="108" y="218" width="14" height="26" rx="2" fill="#ef4444" fill-opacity="0.85"/>
    <rect x="176" y="218" width="14" height="26" rx="2" fill="#ef4444" fill-opacity="0.85"/>
    <rect x="356" y="218" width="14" height="26" rx="2" fill="#ef4444" fill-opacity="0.85"/>
    <rect x="430" y="218" width="14" height="26" rx="2" fill="#ef4444" fill-opacity="0.85"/>
  </g>
  <!-- mũi tên nhảy lung tung -->
  <g stroke="#ef4444" stroke-opacity="0.6" stroke-width="1.4" fill="none">
    <path d="M115 218 C 150 190, 150 190, 183 218"/>
    <path d="M183 244 C 280 270, 290 270, 363 244"/>
    <path d="M363 218 C 400 192, 400 192, 437 218"/>
  </g>
  <text x="556" y="234" font-size="11.5" font-weight="600" fill="#ef4444">~1 miss / 1 → chậm 5–10×</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Array so với Linked list trong bộ nhớ</title>
  <desc>Array là các ô liền kề trong RAM nên locality tốt. Linked list có các node rải rác khắp heap, con trỏ next nhảy lung tung, mỗi bước gần như một cache miss.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Array (liền mạch) vs Linked list (rải rác)</text>
  <!-- ARRAY -->
  <text x="30" y="76" font-size="12.5" font-weight="700" fill="currentColor">Array</text>
  <g>
    <rect x="120" y="58" width="56" height="36" rx="4" fill="#10b981" fill-opacity="0.7"/><text x="148" y="81" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">a</text>
    <rect x="176" y="58" width="56" height="36" rx="4" fill="#10b981" fill-opacity="0.7"/><text x="204" y="81" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">b</text>
    <rect x="232" y="58" width="56" height="36" rx="4" fill="#10b981" fill-opacity="0.7"/><text x="260" y="81" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">c</text>
    <rect x="288" y="58" width="56" height="36" rx="4" fill="#10b981" fill-opacity="0.7"/><text x="316" y="81" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">d</text>
    <rect x="344" y="58" width="56" height="36" rx="4" fill="#10b981" fill-opacity="0.7"/><text x="372" y="81" font-size="13" font-weight="700" text-anchor="middle" fill="#fff">e</text>
    <rect x="116" y="54" width="288" height="44" rx="6" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4 3"/>
  </g>
  <text x="420" y="74" font-size="11" fill="currentColor" opacity="0.8">nằm liền nhau trong RAM</text>
  <text x="420" y="90" font-size="11" font-weight="600" fill="#10b981">→ 1 cache line gom nhiều phần tử: HIT</text>
  <!-- LINKED LIST -->
  <text x="30" y="180" font-size="12.5" font-weight="700" fill="currentColor">Linked list</text>
  <text x="30" y="198" font-size="10" fill="currentColor" opacity="0.6">(heap)</text>
  <!-- nodes rải rác -->
  <g>
    <rect x="120" y="140" width="60" height="34" rx="4" fill="#3b82f6" fill-opacity="0.55"/><text x="150" y="162" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">a→</text>
    <rect x="500" y="148" width="60" height="34" rx="4" fill="#3b82f6" fill-opacity="0.55"/><text x="530" y="170" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">b→</text>
    <rect x="280" y="250" width="60" height="34" rx="4" fill="#3b82f6" fill-opacity="0.55"/><text x="310" y="272" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">c→</text>
    <rect x="600" y="248" width="60" height="34" rx="4" fill="#3b82f6" fill-opacity="0.55"/><text x="630" y="270" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">d→</text>
    <rect x="120" y="248" width="60" height="34" rx="4" fill="#3b82f6" fill-opacity="0.55"/><text x="150" y="270" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">e</text>
  </g>
  <!-- mũi tên next nhảy lung tung, mỗi bước 1 miss -->
  <g stroke="#ef4444" stroke-opacity="0.7" stroke-width="1.6" fill="none">
    <path d="M180 157 C 340 120, 360 130, 500 162" marker-end="url(#ar)"/>
    <path d="M530 182 C 460 230, 380 240, 340 256" marker-end="url(#ar)"/>
    <path d="M340 264 C 460 300, 520 300, 600 268" marker-end="url(#ar)"/>
    <path d="M600 270 C 400 320, 320 300, 180 270" marker-end="url(#ar)"/>
  </g>
  <defs>
    <marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#ef4444" fill-opacity="0.8"/></marker>
  </defs>
  <text x="360" y="306" font-size="11" font-weight="600" text-anchor="middle" fill="#ef4444">node->next = cú nhảy địa chỉ random → gần như mỗi bước 1 MISS</text>
</svg>

Trên giấy cả hai duyệt `O(N)`. Trên CPU thật, array thường nhanh **vài lần** vì linked list bắt CPU "chạy ra siêu thị" gần như mỗi bước. Đây là lý do `std::vector` / `ArrayList` thường thắng `std::list` / `LinkedList` ngay cả ở các thao tác mà linked list "đáng lẽ" tốt hơn.

Cùng nguyên lý:
- **Array of Structs vs Struct of Arrays**: nếu chỉ cần 1 field, gom field đó thành mảng riêng (SoA) → mỗi cache line chứa toàn dữ liệu bạn cần, không phí.
- **HashMap**: nhanh về Big-O nhưng các bucket rải rác → thường nhiều cache miss hơn duyệt array tuần tự.

---

## 7. Branch prediction: CPU đoán tương lai

CPU hiện đại không làm xong lệnh này mới bắt đầu lệnh sau. Nó **pipeline**: trong khi lệnh A đang execute, lệnh B đã fetch, lệnh C đang được chuẩn bị — như dây chuyền lắp ráp.

Rắc rối xảy ra ở lệnh `if`/rẽ nhánh (**branch**): CPU chưa biết sẽ đi nhánh nào, nhưng pipeline không cho phép đứng chờ. Nên nó **đoán** (branch prediction) — thường đoán "lần này giống các lần trước" — rồi chạy tiếp theo dự đoán.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 350" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Pipeline CPU và branch prediction: đoán đúng vs đoán sai</title>
  <desc>Pipeline fetch decode execute các lệnh chồng lấn như dây chuyền. Rẽ nhánh đoán đúng thì chạy mượt; đoán sai phải xả pipeline và chịu phạt khoảng 10 đến 20 nhịp.</desc>
  <text x="360" y="24" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">Pipeline chồng lấn + branch prediction</text>
  <!-- pipeline chong lap: 3 lệnh, mỗi lệnh F D E lệch 1 nhịp -->
  <g font-size="10.5">
    <!-- nhãn lệnh -->
    <text x="30" y="74" font-weight="600" fill="currentColor">Lệnh 1</text>
    <text x="30" y="104" font-weight="600" fill="currentColor">Lệnh 2</text>
    <text x="30" y="134" font-weight="600" fill="currentColor">Lệnh 3</text>
    <!-- lệnh 1 -->
    <rect x="90" y="60" width="60" height="22" rx="3" fill="#3b82f6" fill-opacity="0.6"/><text x="120" y="75" text-anchor="middle" fill="#fff">Fetch</text>
    <rect x="152" y="60" width="60" height="22" rx="3" fill="#10b981" fill-opacity="0.6"/><text x="182" y="75" text-anchor="middle" fill="#fff">Decode</text>
    <rect x="214" y="60" width="60" height="22" rx="3" fill="#f59e0b" fill-opacity="0.7"/><text x="244" y="75" text-anchor="middle" fill="#fff">Execute</text>
    <!-- lệnh 2 lệch 1 ô -->
    <rect x="152" y="90" width="60" height="22" rx="3" fill="#3b82f6" fill-opacity="0.6"/><text x="182" y="105" text-anchor="middle" fill="#fff">Fetch</text>
    <rect x="214" y="90" width="60" height="22" rx="3" fill="#10b981" fill-opacity="0.6"/><text x="244" y="105" text-anchor="middle" fill="#fff">Decode</text>
    <rect x="276" y="90" width="60" height="22" rx="3" fill="#f59e0b" fill-opacity="0.7"/><text x="306" y="105" text-anchor="middle" fill="#fff">Execute</text>
    <!-- lệnh 3 -->
    <rect x="214" y="120" width="60" height="22" rx="3" fill="#3b82f6" fill-opacity="0.6"/><text x="244" y="135" text-anchor="middle" fill="#fff">Fetch</text>
    <rect x="276" y="120" width="60" height="22" rx="3" fill="#10b981" fill-opacity="0.6"/><text x="306" y="135" text-anchor="middle" fill="#fff">Decode</text>
    <rect x="338" y="120" width="60" height="22" rx="3" fill="#f59e0b" fill-opacity="0.7"/><text x="368" y="135" text-anchor="middle" fill="#fff">Execute</text>
  </g>
  <text x="430" y="105" font-size="11" fill="currentColor" opacity="0.8">dây chuyền: lệnh sau bắt đầu khi lệnh trước chưa xong</text>
  <!-- nhánh: if (x > 0) -->
  <rect x="270" y="166" width="180" height="28" rx="6" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="360" y="185" font-size="12" font-weight="700" text-anchor="middle" fill="currentColor">branch: if (x &gt; 0)</text>
  <text x="360" y="210" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">CPU đoán "sẽ vào A" rồi chạy trước</text>
  <!-- hai nhánh -->
  <g stroke="currentColor" stroke-opacity="0.35" fill="none"><path d="M360 216 L 360 230 M200 248 L 360 230 L 520 248"/></g>
  <!-- ĐÚNG -->
  <rect x="60" y="252" width="280" height="78" rx="8" fill="#10b981" fill-opacity="0.13" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="200" y="274" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Đoán ĐÚNG</text>
  <g font-size="9.5">
    <rect x="78" y="284" width="44" height="20" rx="3" fill="#f59e0b" fill-opacity="0.7"/><text x="100" y="298" text-anchor="middle" fill="#fff">A1</text>
    <rect x="126" y="284" width="44" height="20" rx="3" fill="#f59e0b" fill-opacity="0.7"/><text x="148" y="298" text-anchor="middle" fill="#fff">A2</text>
    <rect x="174" y="284" width="44" height="20" rx="3" fill="#f59e0b" fill-opacity="0.7"/><text x="196" y="298" text-anchor="middle" fill="#fff">A3</text>
  </g>
  <text x="200" y="322" font-size="10.5" text-anchor="middle" fill="#10b981" font-weight="600">pipeline chạy mượt, không phí</text>
  <!-- SAI -->
  <rect x="380" y="252" width="290" height="78" rx="8" fill="#ef4444" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.25"/>
  <text x="525" y="274" font-size="12.5" font-weight="700" text-anchor="middle" fill="currentColor">Đoán SAI</text>
  <g font-size="9.5">
    <rect x="398" y="284" width="40" height="20" rx="3" fill="#ef4444" fill-opacity="0.35"/><text x="418" y="298" text-anchor="middle" fill="currentColor" opacity="0.6">A1</text>
    <rect x="442" y="284" width="40" height="20" rx="3" fill="#ef4444" fill-opacity="0.35"/><text x="462" y="298" text-anchor="middle" fill="currentColor" opacity="0.6">A2</text>
    <line x1="398" y1="284" x2="482" y2="304" stroke="#ef4444" stroke-width="1.5"/>
    <line x1="482" y1="284" x2="398" y2="304" stroke="#ef4444" stroke-width="1.5"/>
    <rect x="500" y="284" width="40" height="20" rx="3" fill="#f59e0b" fill-opacity="0.7"/><text x="520" y="298" text-anchor="middle" fill="#fff">B1</text>
  </g>
  <text x="525" y="322" font-size="10.5" text-anchor="middle" fill="#ef4444" font-weight="600">xả pipeline → phạt ~10–20 nhịp</text>
</svg>

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
