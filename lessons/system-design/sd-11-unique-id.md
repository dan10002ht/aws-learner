# Sinh Unique ID trong hệ phân tán

> Bài này là bài **concept** chứ không phải case study sản phẩm. Nhưng nó xuất hiện trong gần như mọi buổi phỏng vấn System Design, vì nó là bài kiểm tra ngắn nhất xem ứng viên có hiểu **phân tán thật sự nghĩa là gì** hay không: bỏ đi một điểm tập trung (centralized point), bạn mất cái gì, và mua lại bằng cách nào.

Nghe qua thì "sinh ID duy nhất" là việc tầm thường — `AUTO_INCREMENT` trong MySQL, `SERIAL` trong Postgres, một dòng code. Nhưng cái làm cho `AUTO_INCREMENT` hoạt động không phải thuật toán, mà là **sự tồn tại của một người duy nhất giữ cây bút**: một node DB duy nhất, cầm một con số duy nhất, khoá nó lại mỗi lần cấp phát. Khoảnh khắc bạn có hai node cùng phát ID, cây bút đó biến mất. Và khi cây bút biến mất, bạn phải trả lời ba câu hỏi rất khó cùng lúc: làm sao **không trùng** mà không cần nói chuyện với nhau, làm sao **vẫn sắp xếp được theo thời gian** khi mỗi node có đồng hồ riêng và đồng hồ thì nói dối, và làm sao nhét tất cả vào **64 bit** để ID còn dùng được làm primary key.

Bài này đi qua: chốt yêu cầu → vì sao cách ngây thơ hỏng → bốn phương án kinh điển và trade-off → mổ xẻ Snowflake tới từng bit → ba vấn đề thực chiến mà sách hay bỏ qua (đồng hồ chạy lùi, cấp machine ID, lộ thông tin qua ID) → và cuối cùng là ánh xạ sang AWS, nơi bài toán "machine ID lấy từ đâu" trở nên rất thật khi bạn chạy Lambda.

---

## Bước 1 — Vấn đề nền: vì sao `AUTO_INCREMENT` chết khi ra phân tán

Hãy nhìn kỹ điều gì thực sự xảy ra khi DB cấp một ID tự tăng:

```
Client A ─┐
Client B ─┼──►  [ DB đơn ]  counter = 1042
Client C ─┘        │
                   ├─ lock counter
                   ├─ đọc 1042, ghi 1043
                   └─ unlock, trả 1043
```

Ba tính chất tốt đẹp ta đang hưởng miễn phí: **duy nhất tuyệt đối** (chỉ một counter, mọi đọc-ghi tuần tự hoá qua một khoá); **đơn điệu tăng toàn cục** (ID lớn hơn *chắc chắn* được cấp sau — thứ sau này rất khó mua lại); và **nhỏ gọn, đặc** (1042, 1043, 1044 — không lỗ hổng, vừa `BIGINT` 8 byte, B-tree luôn chèn vào cuối cây).

Cả ba đều **mua bằng cùng một thứ**: sự tồn tại của một điểm tập trung. Và điểm tập trung ấy đem theo ba cái giá mà ở quy mô nhỏ bạn không thấy: **throughput có trần cứng** (mọi ghi xếp hàng qua một khoá); **single point of failure** (counter chết thì hệ thống không *tạo* được bản ghi mới — mission-critical mà lại tầm thường); và **round-trip trên đường nóng** (mỗi lần tạo object là một lần đi mạng chỉ để xin một con số, kể cả khi dữ liệu thật sẽ ghi ở nơi khác).

> 💡 **Nguyên tắc**: Trong hệ phân tán, thứ đắt nhất không phải CPU hay disk mà là **sự phối hợp (coordination)**. Mọi thiết kế ID tốt đều là một cách trả lời: *"làm sao sinh ID mà các node không cần hỏi nhau?"* — nói cách khác, làm sao **chia không gian ID trước**, để mỗi node tự do trong phần của mình.

Ý tưởng trung tâm của cả bài nằm đúng ở câu in đậm đó. Bạn không tránh được việc phải phối hợp; bạn chỉ **dời nó ra khỏi đường nóng**: phối hợp một lần lúc khởi động (cấp machine ID), rồi chạy hàng triệu request không cần hỏi ai.

---

## Bước 2 — Chốt yêu cầu

Trong phỏng vấn, đây là phần phải hỏi trước khi vẽ. Bộ yêu cầu kinh điển của bài này:

**Functional**
- ID phải **duy nhất toàn cục** (globally unique) — không trùng, kể cả giữa các datacenter.
- ID là **số** (numeric), không phải chuỗi — để làm primary key hiệu quả và so sánh rẻ.
- ID **vừa 64 bit** — đúng một `BIGINT` / `int64`, không hơn.
- ID **sắp xếp được theo thời gian** (time-sortable): ID sinh sau thì lớn hơn ID sinh trước. Chú ý: "tăng theo thời gian" **không** đồng nghĩa "tăng đúng +1".
- Hệ thống sinh được **ít nhất 10,000 ID/giây**.

**Non-functional**
- **High availability** — đây là service mission-critical. Nó chết thì không post được bài, không tạo được order, không ghi được log. Mục tiêu thực tế: không có SPOF, và khả năng sinh ID vẫn sống khi mất mạng tới các hệ thống khác.
- **Latency cực thấp** — lý tưởng là sinh ID **trong process**, không đi mạng. Vài chục nanosecond thay vì vài millisecond.
- **Không tiết lộ thông tin nghiệp vụ** — ID xuất ra ngoài không nên cho phép đối thủ đếm số order/user của bạn (xem phần enumeration attack ở dưới).

**Giả định chốt lại để có số mà nói:**

```
- Throughput yêu cầu   : 10,000 ID/s (baseline)
- Peak dự phòng        : ×10 = 100,000 ID/s
- Vòng đời hệ thống    : tối thiểu 50 năm (đừng thiết kế thứ hết hạn trong nhiệm kỳ của bạn)
- Quy mô hạ tầng       : ≤ 32 datacenter/region, ≤ 32 node sinh ID mỗi nơi
- Độ phân giải thời gian: millisecond là đủ (không cần microsecond)
```

### Ước lượng nhanh — con số dẫn tới quyết định gì

```
Throughput → số bit cho sequence:
  10,000 ID/s  = 10 ID/ms          (rải đều)
  100,000 ID/s = 100 ID/ms         (peak)
  Một burst dồn vào 1 ms có thể lên vài trăm.
  => cần đếm được vài nghìn ID trong 1 ms  → 12 bit (4,096) là dư sức.

Vòng đời → số bit cho timestamp:
  50 năm ≈ 50 × 365 × 86,400 × 1000 ms ≈ 1.58 × 10^12 ms
  2^40 = 1.10 × 10^12 ms ≈ 34.9 năm   → KHÔNG đủ
  2^41 = 2.20 × 10^12 ms ≈ 69.7 năm   → đủ, có biên an toàn
  => 41 bit timestamp.

Quy mô → số bit cho node:
  32 datacenter × 32 machine = 1,024 node  → 10 bit.

Cộng lại: 1 (sign) + 41 (time) + 10 (node) + 12 (seq) = 64 bit. Vừa khít.
```

Con số cần nhớ: **41 bit ms ≈ 69.7 năm**, **12 bit ≈ 4,096 ID/ms/node ≈ 4.09 triệu ID/s/node**. Chỉ riêng *một* node đã dư 400 lần so với yêu cầu 10K/s. Điều này nói lên một sự thật quan trọng: **bài này chưa bao giờ là bài về throughput**. Throughput là phần dễ. Phần khó là uniqueness + ordering + vận hành.

> ⚠️ **Bẫy phỏng vấn**: Nhiều người lao vào tính QPS rồi kết luận "cần N node". Sai trọng tâm. Với Snowflake, một node là đủ cho 10K/s; bạn cần nhiều node vì **availability**, không phải vì throughput. Nói rõ điều đó ghi điểm rất mạnh.

### Vì sao "64 bit" lại là yêu cầu cứng, không phải sở thích

- **Primary key size lan toả.** Trong InnoDB, mọi **secondary index** đều chứa primary key làm con trỏ tới hàng. PK 8 byte → mỗi entry của mọi secondary index tốn 8 byte; PK 16 byte (UUID binary) → gấp đôi. Bảng có 5 index tức bạn vừa nhân đôi 5 cấu trúc dữ liệu lớn nhất của mình. Index nhỏ hơn còn đồng nghĩa nhiều node B-tree vừa buffer pool hơn — hiệu ứng phi tuyến: vừa RAM thì nhanh, vượt RAM một chút là sập hiệu năng.
- **Ngôn ngữ và giao thức.** `int64` là kiểu số nguyên lớn nhất mà mọi ngôn ngữ/DB/protobuf xử lý natively. Vượt 64 bit là rơi vào string hoặc binary blob — mất so sánh số, mất range query rẻ.
- **JSON/JavaScript.** `Number` của JS là double 53-bit mantissa, nên ID 64-bit **bị làm tròn sai** khi qua `JSON.parse`. Cách chuẩn: serialize ID ra **string** ở API layer (Twitter trả cả `id` lẫn `id_str`). Đây là bug production kinh điển.

---

## Bước 3 — Bốn phương án và trade-off

### Phương án 1 — Multi-master replication (auto_increment với bước nhảy)

Ý tưởng: vẫn dùng `AUTO_INCREMENT` của DB, nhưng cho mỗi master một **offset** và tăng theo **step** bằng số master.

```
k = 3 master

Master A: offset=1, step=3  →  1, 4, 7, 10, 13, ...
Master B: offset=2, step=3  →  2, 5, 8, 11, 14, ...
Master C: offset=3, step=3  →  3, 6, 9, 12, 15, ...
```

MySQL có sẵn `auto_increment_increment` (step) và `auto_increment_offset` cho đúng việc này. Không node nào đụng node nào, không cần phối hợp lúc runtime. Nhưng nó hỏng ở ba chỗ:

- **Không scale được số node.** Thêm master thứ 4 phải đổi `step` từ 3 lên 4 trên *tất cả* các node; trong lúc đổi, hai node có thể cùng cấp một số — thực tế phải dừng ghi để đổi.
- **ID không tăng theo thời gian đáng tin.** Master A đang ở 10,000 trong khi Master C mới ở 400 (traffic lệch) → ID 10,000 hoàn toàn có thể sinh *trước* ID 402. Tức **mất tính sortable** — yêu cầu chính của bài.
- **Vẫn đi mạng tới DB** cho mỗi ID, và ID gắn chặt vào tầng lưu trữ.

Đây là cách "vá" chứ không phải thiết kế. Nêu ra để thể hiện bạn biết nó tồn tại, rồi loại ngay bằng lý do **không sortable + không co giãn số node**.

### Phương án 2 — UUID

UUID là 128 bit, sinh **hoàn toàn cục bộ**, không cần biết node khác tồn tại. Đây là phương án "phi phối hợp" thuần khiết nhất. Nhưng "UUID" không phải một thứ — nó là một họ, và các phiên bản khác nhau *rất nhiều* về hành vi.

| Version | Cấu tạo | Sortable theo thời gian? | Ghi chú |
|---|---|---|---|
| **v1** | 60-bit timestamp (100ns từ 1582) + clock seq + **MAC address** | Lý thuyết có, **thực tế không** — byte thời gian bị đảo thứ tự (`time_low` trước `time_high`) nên so sánh bytes cho thứ tự hỗn loạn | Lộ MAC address → vấn đề privacy (virus Melissa 1999 truy được tác giả nhờ đúng cái này) |
| **v4** | 122 bit ngẫu nhiên | **Không** | Phổ biến nhất. Va chạm ~0 (cần ~2.7×10^18 UUID mới có 50% khả năng trùng) |
| **v6** | Như v1 nhưng **sắp lại thứ tự byte** | Có | Bản "sửa lỗi" của v1, ít dùng |
| **v7** | 48-bit Unix timestamp **ms** + 74 bit ngẫu nhiên (12 bit tuỳ chọn làm sub-ms counter) | **Có**, sort đúng cả khi so sánh bytes/chuỗi | Chuẩn hoá trong **RFC 9562** (2024). Lựa chọn mặc định đúng đắn ngày nay nếu chấp nhận 128 bit |

**Vì sao v4 là thảm hoạ với index — chuyện B-tree fragmentation**

Index của DB quan hệ là một **B+tree**, dữ liệu nằm ở các trang lá (leaf page, mặc định 16 KB trong InnoDB).

```
Chèn TUẦN TỰ (ID tăng dần):
  [p1: 1..400][p2: 401..800][p3: 801..1200][p4: 1201.. ▓░░░]
                                                       ↑ chỉ 1 trang "nóng"
  → trang nóng luôn nằm trong buffer pool, trang cũ đầy ~100%,
    gần như không có page split.

Chèn NGẪU NHIÊN (UUIDv4):
  [p1: a3..b1][p2: b2..c9][p3: d0..e4] ... [p900: ...]
       ↑ chèn      ↑ chèn       ↑ chèn       ↑ chèn    (rải khắp nơi)
  → phải ĐỌC trang đích lên trước khi ghi (random read I/O);
    trang đầy → PAGE SPLIT tách đôi, mỗi nửa chỉ ~50% đầy;
    index phình ~2×, working set vượt RAM → miss buffer pool → đọc disk.
```

Hệ quả đo được: trên bảng vài trăm triệu hàng, đổi PK từ UUIDv4 sang khoá tăng dần thường cho **throughput insert cao hơn 2–10 lần** và **index nhỏ hơn 30–50%**. Đây không phải tối ưu vi mô — đây là khác biệt giữa "chạy được" và "không chạy được".

Thêm ba cái giá nữa của UUID: **128 bit** vi phạm thẳng yêu cầu của bài và nhân đôi mọi secondary index; lưu dạng `CHAR(36)` tốn 36 byte thay vì 16 (nếu buộc dùng UUID thì lưu `BINARY(16)`); và dữ liệu ngẫu nhiên có entropy tối đa nên **không nén được** — ảnh hưởng tới backup, log, message payload.

> 💡 **Nguyên tắc**: Nếu bạn *phải* dùng UUID (ví dụ client sinh ID offline rồi mới sync lên), hãy dùng **UUIDv7** chứ đừng v4. Bạn giữ được tính phi phối hợp *và* lấy lại tính sortable — chỉ mất mỗi 64 bit thừa. Trong rất nhiều hệ thống thật, đó là đánh đổi tốt hơn Snowflake vì bạn không phải vận hành việc cấp machine ID.

### Phương án 3 — Ticket server

Ý tưởng (Flickr dùng thật): tách riêng **một DB nhỏ xíu chỉ làm một việc** — giữ counter.

```
App-1 ─┐
App-2 ─┼──►  [ Ticket Server ]   REPLACE INTO Tickets64 (stub) VALUES ('a');
App-3 ─┘      bảng 1 dòng         SELECT LAST_INSERT_ID();
              duy nhất
```

Ưu điểm thật sự: **đơn giản đến mức khó tin** (một bảng, một dòng, vài dòng SQL), và cho **ID số, đặc, tăng đơn điệu tuyệt đối** — tính chất tốt nhất trong tất cả phương án. Đủ cho phần lớn hệ thống quy mô vừa; đừng khinh nó.

Nhược điểm: **SPOF rõ ràng** (Flickr chữa bằng 2 ticket server chẵn/lẻ — quay lại đúng bài toán của phương án 1 khi muốn thêm server thứ 3); **round-trip mạng cho mỗi ID** 0.5–2 ms cộng vào p99 của mọi API tạo dữ liệu; và **trần throughput** chỉ vài chục nghìn/giây.

**Kỹ thuật cứu ticket server: cấp phát theo dải (range/block allocation).** Thay vì xin 1 ID, app xin *một khối 1,000 ID* rồi tiêu dần trong bộ nhớ:

```
App-1 xin block → nhận [1,000,000 .. 1,000,999]  → dùng local, 0 round-trip
App-2 xin block → nhận [1,001,000 .. 1,001,999]
```

Giảm tải ticket server **1,000 lần**, ID sinh trong process (nhanh như Snowflake). Cái giá: app chết giữa chừng thì phần block chưa dùng **mất luôn** (ID có lỗ hổng), và **thứ tự toàn cục bị vỡ** — App-2 có thể dùng ID 1,001,005 trước khi App-1 dùng tới 1,000,500. Đây gần như chính xác là trade-off của Snowflake, chỉ khác là bạn phải nuôi thêm một DB.

### Phương án 4 — Snowflake (Twitter)

Ý tưởng: **chia không gian 64 bit thành các vùng**, mỗi vùng do một "nguồn duy nhất" chịu trách nhiệm — thời gian do đồng hồ, node do cấu hình, thứ tự trong 1 ms do counter cục bộ. Ba nguồn đó độc lập nhau, nên **ba node không bao giờ cần nói chuyện với nhau**.

```
 1 bit   41 bit                     5 bit   5 bit    12 bit
┌──┬──────────────────────────────┬──────┬──────┬──────────────┐
│ 0│  timestamp (ms từ epoch)     │  DC  │ node │  sequence    │
└──┴──────────────────────────────┴──────┴──────┴──────────────┘
 ↑        ↑                           ↑      ↑          ↑
 sign     đồng hồ lo                config lo      counter cục bộ lo
 (luôn 0)  → tính sortable          → tính duy nhất giữa node
```

Đây là phương án được chọn, và phần tiếp theo mổ xẻ nó tới từng bit.

### Bảng so sánh tổng

| Tiêu chí | Multi-master | UUIDv4 | UUIDv7 | Ticket server | Snowflake |
|---|---|---|---|---|---|
| Kích thước | 64 bit | 128 bit | 128 bit | 64 bit | **64 bit** |
| Sortable theo thời gian | ❌ | ❌ | ✅ (theo ms) | ✅ tuyệt đối | ✅ (thô, theo ms) |
| Cần phối hợp lúc runtime | Không | **Không** | **Không** | **Có** (mỗi ID / mỗi block) | Không (chỉ lúc start) |
| SPOF | Không | Không | Không | **Có** | Không |
| Latency sinh ID | ~1 ms (DB) | **~ns** | **~ns** | ~1 ms | **~ns** |
| Thân thiện B-tree index | ✅ | ❌❌ | ✅ | ✅✅ | ✅ |
| Đoán được / enumerate được | ✅ dễ | ❌ | một phần (thời gian) | ✅ dễ | một phần (thời gian + node) |
| Độ phức tạp vận hành | Trung bình | **Rất thấp** | **Rất thấp** | Thấp | **Cao** (machine ID + đồng hồ) |
| Hợp khi | — (nên tránh) | ID nội bộ, không cần sort | Mặc định hợp lý ngày nay | Quy mô vừa, cần ID đặc | Quy mô lớn, cần 64-bit + sortable |

> 💡 **Nguyên tắc**: Trả lời phỏng vấn đừng nhảy thẳng vào Snowflake. Trình bày theo đúng thứ tự leo thang này — mỗi phương án hỏng ở đâu, và **cái hỏng đó đẩy ta tới phương án sau**. Người phỏng vấn chấm đường đi, không chấm đích đến.

---

## Deep dive 1 — Mổ xẻ Snowflake tới từng bit

### Từng vùng bit làm gì, và vì sao chia như thế

**1 bit dấu (sign bit) — luôn bằng 0.**
Vì sao phí một bit? Vì Java (và nhiều ngôn ngữ, nhiều DB) **không có kiểu unsigned 64-bit** — `long` của Java là signed, nên bit cao nhất bằng 1 sẽ làm số trở thành **âm**: sắp xếp sai, hiển thị xấu, một số hệ thống coi là invalid. Đây là ví dụ đẹp của việc **thiết kế bị ràng buộc bởi ngôn ngữ chứ không phải toán học**.

**41 bit timestamp — millisecond kể từ một epoch tuỳ chỉnh.**

Điểm tinh tế: **không dùng Unix epoch (1970)**. Twitter dùng epoch riêng `1288834974657` ms = **04/11/2010 01:42:54 UTC**.

```
Nếu dùng Unix epoch 1970:
  Từ 1970 tới 2026 đã tiêu ≈ 1.77 × 10^12 ms
  2^41 = 2.199 × 10^12 ms
  Còn lại ≈ 0.43 × 10^12 ms ≈ 13.6 năm  → hết hạn ~2039. ❌

Nếu dùng epoch riêng (ngày bạn deploy, ví dụ 2026):
  Toàn bộ 2^41 ms còn nguyên
  = 2,199,023,255,552 ms
  = 2,199,023,255 giây
  = 2,199,023,255 / 31,536,000 ≈ 69.7 năm  → hết hạn ~2095. ✅
```

Twitter epoch 2010 + 69.7 năm → **tràn vào khoảng năm 2080**. Ghi lại con số này, nó hay được hỏi.

> ⚠️ **Bẫy**: Epoch tuỳ chỉnh là **hằng số không bao giờ được đổi**. Đổi epoch sau khi đã sinh ID = ID mới có thể nhỏ hơn ID cũ = vỡ toàn bộ thứ tự và có thể trùng. Hard-code nó, comment rõ, và viết test khẳng định nó. Cũng đừng chọn epoch là "hôm nay" khi deploy trên nhiều môi trường — mọi môi trường phải dùng **cùng một** hằng số.

**5 + 5 bit = 10 bit node.** Tách thành datacenter (32) × machine (32) chỉ là quy ước cho dễ vận hành — bạn hoàn toàn có thể coi nó là **10 bit worker ID phẳng (1,024 node)**. Thực tế nhiều bản cài đặt hiện đại làm phẳng vì việc cấp ID phẳng từ một registry đơn giản hơn nhiều so với quản lý 2 tầng.

**12 bit sequence — counter cục bộ, reset mỗi ms.** Đây là thứ giải quyết bài toán "hai request trong cùng một millisecond trên cùng một node". Nó là một biến `int` trong RAM, tăng dần; sang ms mới thì về 0.

### Năng lực lý thuyết

```
Mỗi node : 2^12 = 4,096 ID / ms
         = 4,096,000 ID / giây ≈ 4.09 triệu/s
Toàn hệ  : 1,024 node × 4.096M = 4.19 tỉ ID / giây
Vòng đời : 2^41 ms ≈ 69.7 năm
Tổng ID  : 2^63 ≈ 9.22 × 10^18 (giới hạn của int64 dương)
```

Đối chiếu với yêu cầu 10,000 ID/s: **một node dùng hết 0.24% năng lực**. Nhắc lại lần nữa vì nó quan trọng — bạn chạy nhiều node vì availability và vì vị trí địa lý, chứ không vì throughput.

### Code minh hoạ

```js
const EPOCH = 1735689600000n;       // 2025-01-01T00:00:00Z — HẰNG SỐ, không đổi
const SEQ_BITS = 12n, NODE_BITS = 10n;
const MAX_SEQ  = (1n << SEQ_BITS) - 1n;    // 4095
const NODE_SHIFT = SEQ_BITS;                // 12
const TIME_SHIFT = SEQ_BITS + NODE_BITS;    // 22

class Snowflake {
  constructor(nodeId) {
    if (nodeId < 0n || nodeId > 1023n) throw new Error('nodeId ngoài [0,1023]');
    this.nodeId = nodeId; this.lastMs = -1n; this.seq = 0n;
  }

  next() {
    let now = BigInt(Date.now());

    // ĐỒNG HỒ CHẠY LÙI — xem deep dive 2. Tuyệt đối không sinh ID ở đây.
    if (now < this.lastMs) throw new Error(`clock backwards ${this.lastMs - now}ms`);

    if (now === this.lastMs) {
      this.seq = (this.seq + 1n) & MAX_SEQ;
      if (this.seq === 0n) {            // cạn 4096 slot trong 1ms
        while (now <= this.lastMs) now = BigInt(Date.now());  // chờ sang ms mới
      }
    } else {
      this.seq = 0n;                    // ms mới → reset counter
    }

    this.lastMs = now;
    return ((now - EPOCH) << TIME_SHIFT) | (this.nodeId << NODE_SHIFT) | this.seq;
  }
}

// Giải mã ngược — rất hữu ích khi debug production
const decode = (id) => ({
  time: new Date(Number((id >> TIME_SHIFT) + EPOCH)),
  node: Number((id >> NODE_SHIFT) & 1023n),
  seq:  Number(id & MAX_SEQ),
});
```

Ba chi tiết trong đoạn code trên đáng chỉ ra khi review: (1) **`seq` reset về 0 khi sang ms mới** — một số bản cài đặt reset về số ngẫu nhiên nhỏ (0–9) thay vì 0, vì ở traffic thấp mọi ID đều có sequence = 0 sẽ khiến ID dễ đoán hẳn; (2) **vòng `while` chờ sang ms mới** là *busy-wait*, chỉ chạy khi thật sự vượt 4,096 ID/ms — nếu nó chạy thường xuyên thì bạn đang thiếu node, cần **alarm** ở đây; (3) **`throw` khi đồng hồ lùi**, không phải `return` — đây là khác biệt giữa bản đồ chơi và bản dùng thật.

> ⚠️ **Bẫy**: Instance Snowflake **phải là singleton per process** và `next()` phải **thread-safe** (synchronized / mutex / atomic CAS). Hai thread cùng đọc `lastMs` và `seq` mà không đồng bộ = sinh trùng ID trên cùng một node — đúng thứ mà cả thiết kế này tồn tại để tránh. Trong Node.js single-thread thì miễn phí; trong Java/Go thì phải khoá.

---

## Deep dive 2 — Vấn đề đồng hồ (phần khó nhất)

Toàn bộ tính đúng đắn của Snowflake dựa trên một giả định: **đồng hồ chỉ tiến, không lùi**. Giả định đó **sai** trong thực tế. Đây là phần mà mọi bản cài đặt nghiêm túc phải xử lý, và là chỗ phỏng vấn hay đào sâu.

### Ba hiện tượng khác nhau, đừng gộp làm một

| Hiện tượng | Là gì | Ảnh hưởng tới Snowflake |
|---|---|---|
| **Clock drift** | Tinh thể thạch anh của mỗi máy chạy nhanh/chậm khác nhau, ~10–100 ppm (≈ 1–9 giây/ngày nếu không chỉnh) | Không gây trùng ID. Gây **sai thứ tự giữa các node** |
| **Clock skew** | Tại một thời điểm, đồng hồ hai máy đọc ra hai giá trị khác nhau | Sai thứ tự **giữa các node** (ID node A trông như sinh trước ID node B dù thực tế ngược lại) |
| **Clock going backwards** | Đồng hồ **nhảy lùi**: NTP step correction, VM live-migration / snapshot restore, admin chỉnh tay, leap second | **Nguy hiểm thật** — sinh lại đúng dải (timestamp, node, seq) đã dùng → **TRÙNG ID** |

Chỉ có cái thứ ba mới phá vỡ tính duy nhất. Hai cái đầu chỉ làm xấu thứ tự.

### Vì sao đồng hồ lùi lại gây trùng

```
t = 1000ms, node 7: sinh các ID (1000, 7, 0), (1000, 7, 1), (1000, 7, 2)
t = 1001ms, node 7: sinh (1001, 7, 0) ...
→ NTP nhảy lùi 5ms →
t = 996ms ... quay lại 1000ms, node 7: sinh (1000, 7, 0)  ⚠️ ĐÃ TỒN TẠI
```

Trùng khoá chính. Tuỳ hệ thống, đây là lỗi 500 (may mắn), hoặc **ghi đè mất dữ liệu** (thảm hoạ, nếu bạn upsert).

### Phòng tuyến 1 — NTP đúng cách: `slew` chứ không `step`

NTP có hai chế độ hiệu chỉnh: **step** nhảy thẳng đồng hồ tới giá trị đúng (nhanh, và có thể **nhảy lùi**); **slew** điều chỉnh *tốc độ trôi* của đồng hồ cho tới khi khớp, nên đồng hồ **không bao giờ lùi**, chỉ tiến chậm lại.

Cấu hình `chrony`/`ntpd` ở chế độ **slew-only** (`ntpd -x`, hoặc `maxslewrate` với chrony) trên các node sinh ID. Đánh đổi: hội tụ chậm hơn nhiều (slew tối đa ~0.5 ms/s, nên lệch 1 giây mất ~30 phút để chỉnh xong) — cái giá hoàn toàn xứng đáng.

### Phòng tuyến 2 — Dùng monotonic clock cho phần trôi

Trong process, đừng gọi `Date.now()` (wall clock) cho mỗi lần sinh. Mẫu chuẩn:

```
1. Lúc khởi động: đọc wall clock MỘT LẦN  → baseWall
                   đọc monotonic clock      → baseMono   (process.hrtime.bigint, CLOCK_MONOTONIC)
2. Mỗi lần sinh ID: now = baseWall + (monoNow - baseMono)
```

Monotonic clock **theo định nghĩa không bao giờ lùi** (nó đếm từ lúc boot, không bị NTP đụng vào). Bạn vẫn cần đọc lại wall clock định kỳ để không trôi quá xa so với thời gian thật, nhưng bạn miễn nhiễm với những cú nhảy đột ngột.

### Phòng tuyến 3 — Xử lý khi vẫn phát hiện lùi

Khi `now < lastMs` xảy ra bất chấp hai phòng tuyến trên, có bốn chiến lược:

| Chiến lược | Cách làm | Trade-off |
|---|---|---|
| **Từ chối (fail fast)** | Ném exception, để caller retry / để healthcheck loại node ra khỏi LB | **An toàn tuyệt đối** về uniqueness. Mất availability trong thời gian lùi. Đây là mặc định đúng |
| **Chờ (block)** | Busy-wait/sleep cho tới khi `now >= lastMs` | Chỉ dùng được khi lùi **rất nhỏ** (< vài chục ms). Lùi 5 giây thì bạn treo API 5 giây |
| **Mượn bit dự phòng** | Thêm/dùng lại một vài bit làm **generation counter**, tăng lên mỗi khi phát hiện lùi | Không mất availability, không trùng. Tốn bit, và ID mới có thể **nhỏ hơn** ID cũ (vỡ thứ tự) |
| **Dùng logical clock** | Node tự giữ một `lastMs` và **không bao giờ để nó giảm** — nếu wall clock lùi thì cứ dùng `lastMs` cũ và tiêu sequence | Không trùng, không mất availability. Rủi ro: nếu lùi lâu, 4,096 slot/ms cạn → phải chặn. Đây là cách **Sonyflake** và một số biến thể làm |

Thực tế phổ biến nhất trong production là **kết hợp**: lùi < 10 ms thì chờ, lùi lớn hơn thì từ chối sinh ID **và** tự đánh dấu node unhealthy để load balancer rút nó ra, kèm alarm gọi người.

```
if (now < lastMs) {
  const drift = lastMs - now;
  if (drift <= TOLERANCE_MS) { waitUntil(lastMs); }     // lùi nhỏ: chờ
  else { markUnhealthy(); throw new ClockBackwardsError(drift); }  // lùi lớn: bỏ cuộc
}
```

> ⚠️ **Bẫy**: VM snapshot / live migration / container restore là nguyên nhân đồng hồ lùi **phổ biến hơn NTP rất nhiều** trong cloud — một VM restore từ snapshot cũ có thể lùi hàng giờ. Có auto-scaling hay chạy spot instance thì phải giả định điều này *sẽ* xảy ra.

Một nguyên nhân nữa là **leap second**: giây nhuận khiến 23:59:60 tồn tại, và OS hay xử lý bằng cách lặp lại giây 23:59:59 — tức **lùi 1 giây**. Cách chống là dùng NTP server có **leap smearing** (dàn giây nhuận ra 24 giờ); AWS Time Sync Service và Google NTP đều làm sẵn — lý do rất tốt để dùng chúng thay vì pool NTP công cộng.

---

## Deep dive 3 — Machine ID lấy từ đâu

Đây là "món nợ" Snowflake để lại: né được phối hợp lúc runtime, nhưng vẫn cần phối hợp **một lần lúc khởi động** để không hai node nào cùng worker ID. Đó là phần vận hành nặng nhất.

| Cách cấp | Cơ chế | Ưu | Nhược |
|---|---|---|---|
| **Config tĩnh** | `node_id` trong file config / env var / biến Terraform | Đơn giản nhất, không thêm hạ tầng | Con người sẽ copy nhầm config; không auto-scale được. Chỉ hợp khi số node cố định và ít |
| **ZooKeeper / etcd (ephemeral znode)** | Node xin một znode sequential+ephemeral khi start; ZK đảm bảo không trùng; node chết → znode tự xoá → ID tái sử dụng | **Đúng đắn nhất.** Auto-scale được, tự thu hồi | Thêm một cụm ZK/etcd phải vận hành — mà chính nó lại là thứ phải HA |
| **Lease từ DB (DynamoDB/Redis)** | Bảng `worker_ids` 0..1023; node conditional-write để chiếm một ID, **gia hạn lease** định kỳ, TTL hết thì trả về | Dùng hạ tầng sẵn có, không thêm ZK | Phải viết đúng logic lease/heartbeat. Nguy hiểm nếu node bị pause (GC dài) rồi tỉnh lại sau khi lease hết |
| **Suy từ IP / hostname** | 10 bit cuối của private IP, hoặc ordinal StatefulSet (`pod-0`, `pod-1`) | Không cần phối hợp, zero hạ tầng | **Chỉ đúng khi IP không trùng trong 10 bit**: subnet /22 thì ổn, nhiều subnet /24 khác nhau thì hai node có thể ra cùng 10 bit → trùng ID âm thầm |
| **Suy từ MAC address** | Hash MAC xuống 10 bit | Không cần phối hợp | 1,024 slot với ~30 node vẫn có **~35% khả năng đụng** (nghịch lý ngày sinh). Không chấp nhận nếu thiếu bước phát hiện va chạm |

> 💡 **Nguyên tắc**: Với 10 bit (1,024 slot), mọi cách "hash cái gì đó xuống 10 bit" đều có xác suất va chạm cao đáng ngạc nhiên vì **birthday paradox** — chỉ cần ~38 node là xác suất đụng vượt 50%. Nếu dùng cách suy diễn, **bắt buộc** phải có bước tự kiểm tra va chạm lúc khởi động (ví dụ: đăng ký worker ID vào một registry và fail-fast nếu đã có người giữ).

### Vấn đề thật: khi bạn chạy serverless

Đây là chỗ Snowflake gãy trong kiến trúc hiện đại, và là một câu hỏi phỏng vấn rất hay.

Lambda **không có "machine" ổn định**: một function có thể có hàng nghìn execution environment chạy song song, mỗi cái sống vài phút rồi biến mất, và bạn không kiểm soát số lượng. Ba hệ quả: **số node vượt 1,024 dễ dàng** (concurrency 3,000 nhưng chỉ có 1,024 slot); **không có nơi lưu trạng thái giữa các invocation** một cách đảm bảo (environment được tái sử dụng nhưng không có hợp đồng nào bảo đảm); và **chi phí lease quá cao** — mỗi cold start thêm một round-trip DynamoDB là thêm vào đúng thứ đắt nhất của Lambda.

Các cách xử lý thực tế, theo thứ tự nên cân nhắc:

- **Bỏ Snowflake, dùng UUIDv7 hoặc KSUID** — câu trả lời đúng trong đa số trường hợp. Vẫn có time-ordering, vẫn không cần phối hợp, chỉ mất ràng buộc 64-bit. Nói thẳng điều này trong phỏng vấn cho thấy bạn biết **khi nào không dùng công cụ mình vừa thiết kế**.
- **Lease theo execution environment** — lấy lease từ DynamoDB một lần ở **module scope** (ngoài handler) để chỉ chạy lúc cold start, TTL lo thu hồi. Vẫn rủi ro khi concurrency > 1,024.
- **Suy từ `AWS_LAMBDA_LOG_STREAM_NAME`** — biến môi trường này duy nhất cho mỗi execution environment; hash xuống 10 bit, nhưng gặp đúng birthday paradox ở trên nên chỉ dùng khi concurrency thấp.
- **Tách riêng một ID service** — chạy Snowflake trên ECS/EKS (nơi *có* danh tính ổn định), Lambda gọi vào xin **một block ID** rồi tiêu dần. Quay lại mô hình ticket server + range allocation, nhưng lần này không SPOF.

> ⚠️ **Bẫy**: Đừng nói "dùng Snowflake" như một câu thần chú. Snowflake là sự đánh đổi **độ phức tạp vận hành lấy 64 bit + tính sortable**. Nếu hạ tầng của bạn không cho bạn một danh tính node ổn định và rẻ, cái giá đó không đáng, và UUIDv7 là lựa chọn kỹ thuật tốt hơn.

---

## Deep dive 4 — ID lộ thông tin gì, và cách che

### Enumeration attack — vì sao ID tuần tự nguy hiểm

Nếu order của bạn có ID `1001, 1002, 1003...`, đối thủ chỉ cần đặt hai đơn hàng cách nhau một tháng rồi trừ hai ID để biết **chính xác bạn bán được bao nhiêu đơn trong tháng đó**. Kỹ thuật này có tên: **German tank problem** — quân Đồng minh Thế chiến II ước lượng sản lượng xe tăng Đức từ số seri thu được, chính xác hơn tình báo rất nhiều.

Ba loại rò rỉ cần phân biệt:

| Loại rò rỉ | Từ đâu | Ai quan tâm |
|---|---|---|
| **Rò rỉ khối lượng nghiệp vụ** | Hiệu hai ID tuần tự → số bản ghi tạo ra giữa hai thời điểm | Đối thủ cạnh tranh, nhà đầu tư, báo chí |
| **Rò rỉ thời gian** | Snowflake/UUIDv7 nhúng timestamp → biết chính xác tài khoản/bài viết tạo lúc nào | Thường vô hại, đôi khi là vấn đề privacy |
| **IDOR (Insecure Direct Object Reference)** | Đoán được ID → thử `GET /orders/1002` để xem đơn của người khác | **Lỗ hổng bảo mật thật sự** |

> ⚠️ **Bẫy quan trọng nhất của mục này**: ID khó đoán **không phải** là biện pháp kiểm soát truy cập. IDOR được sửa bằng **authorization check** ("user này có quyền xem order này không?"), không phải bằng cách làm ID khó đoán. ID ngẫu nhiên chỉ là *defense in depth* — một lớp thêm, không phải lớp chính. Nói được câu này trong phỏng vấn/review là dấu hiệu rõ ràng của người hiểu bảo mật.

Snowflake rò rỉ gì? Vì nó chứa timestamp ms và node ID lộ thiên, ai cũng có thể decode một ID để biết **thời điểm tạo chính xác tới ms** và **node nào tạo**. Nó **không** rò rỉ tổng số bản ghi (vì sequence reset mỗi ms), nhưng nếu kẻ tấn công sinh ID liên tục và quan sát, họ ước lượng được throughput của bạn.

### Cách che: tách ID nội bộ và ID đối ngoại

Mẫu thiết kế chuẩn:

```
   ID nội bộ (internal)            ID đối ngoại (public)
   ────────────────────            ─────────────────────
   Snowflake int64                 chuỗi ngắn, khó đoán
   dùng làm PK, foreign key,       dùng trong URL, API response,
   index, join, sort               email, mã QR
        │                                   ▲
        └────────  encode / mapping  ───────┘
```

Bốn cách encode, từ yếu tới mạnh:

| Cách | Cơ chế | Che được gì | Ghi chú |
|---|---|---|---|
| **Base62** | Đổi cơ số 10 → 62 (`[0-9a-zA-Z]`) | **Không che gì cả** — chỉ ngắn hơn: `1002` → `g6`, `1003` → `g7` vẫn liền nhau | Dùng cho độ ngắn, đừng nhầm là bảo mật |
| **Hashids / Sqids** | Xáo bảng chữ cái theo một *salt* rồi encode | Che được **tính liền kề**: hai ID liên tiếp ra hai chuỗi trông không liên quan | **Không phải mã hoá** — thuật toán public, biết (hoặc brute-force được) salt thì giải ngược. Chống người tò mò, không chống attacker có động cơ |
| **Block cipher giữ độ dài (FPE)** | Mã hoá 64-bit ID bằng block cipher 64-bit (Feistel / FF1) với khoá bí mật | Che thật sự, **song ánh** nên giải ngược được, không cần lưu mapping | Tốt nhất khi cần vừa che vừa giữ 64 bit. Phức tạp hơn, phải quản lý khoá |
| **Random public ID riêng** | Thêm cột `public_id` = UUIDv4 / 128-bit random, đánh index | Che **hoàn toàn**, không có quan hệ toán học nào với ID nội bộ | Tốn 16 byte + một unique index. Đơn giản và an toàn nhất — đây là cái Stripe làm (`cus_xxx`, `ch_xxx`) |

Stripe còn thêm **tiền tố loại đối tượng** (`cus_`, `ch_`, `sub_`, `in_`) — nhìn một ID trong log biết ngay nó là gì, và API **từ chối sớm** khi ai đó truyền customer ID vào chỗ cần charge ID, thay vì trả 404 mơ hồ.

> 💡 **Nguyên tắc**: Quyết định "ID có được lộ ra ngoài không" ngay từ ngày đầu. Đổi định dạng public ID sau khi khách hàng đã lưu link/bookmark/tích hợp là một trong những migration đau đớn nhất. Chưa chắc thì mặc định **tách internal và public ID** — chi phí trả trước rất nhỏ so với chi phí sửa sau.

---

## Deep dive 5 — "Sắp xếp được theo thời gian" nghĩa là gì cho đúng

Đây là chỗ hay bị nói ẩu. Có **ba mức độ** rất khác nhau:

| Mức | Định nghĩa | Ai đạt được | Cái giá |
|---|---|---|---|
| **Totally ordered** (thứ tự toàn phần tuyệt đối) | Với mọi cặp sự kiện, ID phản ánh đúng thứ tự thực tế xảy ra | Ticket server đơn (một counter duy nhất) | Phải phối hợp mỗi lần sinh → SPOF + latency |
| **k-sorted** (sắp xếp thô) | ID sắp xếp "gần đúng": một phần tử sai lệch không quá k vị trí so với vị trí đúng | **Snowflake, UUIDv7, ULID, KSUID** | Không phối hợp, nhưng chấp nhận sai thứ tự trong cửa sổ nhỏ |
| **Unordered** | Không có quan hệ gì với thời gian | UUIDv4 | Đơn giản nhất, nhưng phá index và không query theo thời gian được |

Snowflake chỉ là **k-sorted**, và điều đó là *cố ý*: hai ID sinh trong **cùng một millisecond trên hai node khác nhau** có thứ tự do node ID quyết định, không do thời điểm thực. Cộng thêm clock skew giữa các node (kể cả NTP tốt cũng lệch ~1–10 ms trong datacenter), cửa sổ "không tin được thứ tự" thực tế là khoảng **vài chục ms**.

- ✅ **Dùng được** cho: sort feed theo thời gian, phân trang theo cursor (`WHERE id > ?`), xác định "cũ hơn / mới hơn" ở mức giây, partition key theo thời gian, TTL/archival theo dải ID.
- ❌ **Không dùng được** cho: quyết định "ai ghi sau thì thắng" (last-write-wins) giữa các node, xác định thứ tự nhân quả (causality), khoá phân tán, hay bất cứ thứ gì cần **linearizability**. Lúc đó bạn cần **Lamport clock**, **vector clock**, hoặc dịch vụ thời gian có cận sai số như **TrueTime** (Spanner) / **HLC** (CockroachDB, MongoDB). Nhận ra ranh giới này là dấu hiệu của trình độ Staff.

### Khi nào ULID / KSUID là lựa chọn đúng hơn

| Định dạng | Kích thước | Cấu tạo | Điểm mạnh riêng |
|---|---|---|---|
| **Snowflake** | 64 bit | 41 time + 10 node + 12 seq | Nhỏ nhất trong nhóm sortable. Decode được node để debug |
| **UUIDv7** | 128 bit | 48 time (ms) + 74 random | **Là chuẩn** (RFC 9562) — thư viện có sẵn ở mọi ngôn ngữ, Postgres 18 có `uuidv7()` native |
| **ULID** | 128 bit | 48 time (ms) + 80 random | Mã hoá **Crockford Base32, 26 ký tự**, không dấu gạch, an toàn khi copy/paste và đọc qua điện thoại. Sort đúng cả dạng chuỗi |
| **KSUID** | 160 bit | 32 time (**giây**) + 128 random | 27 ký tự base62. Độ ngẫu nhiên cực lớn (128 bit) nên yên tâm tuyệt đối về va chạm. Nhưng độ phân giải chỉ tới **giây** |
| **MongoDB ObjectId** | 96 bit | 32 time (giây) + 40 random per-process + 24 counter | Gọn hơn UUID, sortable tới giây. Gắn với hệ sinh thái Mongo |

Chọn thế nào, tóm gọn: **cần đúng 64 bit** (PK bảng cực lớn, giao thức binary chật, ID phải là số) → Snowflake, chấp nhận nuôi cơ chế cấp machine ID. **Không bị ràng buộc 64 bit** → UUIDv7, mặc định nên chọn cho hệ thống mới. **ID hiện ra cho con người** (đọc qua điện thoại, gõ tay, in hoá đơn) → ULID, vì Base32 của Crockford bỏ các ký tự dễ nhầm I/L/O/U. **Chạy serverless** → UUIDv7/KSUID, dứt khoát không Snowflake. **Cần thứ tự tuyệt đối, quy mô vừa** → ticket server + range allocation, đừng phức tạp hoá.

---

## Bottleneck & failure mode

Điều thú vị của thiết kế này là **đường nóng gần như không có bottleneck** — sinh ID là vài phép dịch bit trong RAM. Mọi rủi ro nằm ở rìa:

| Thành phần | Hỏng thế nào | Triệu chứng | Cách chống |
|---|---|---|---|
| **Đồng hồ node** | Nhảy lùi (NTP step, VM restore, leap second) | Trùng primary key, hoặc node từ chối sinh ID | NTP slew-only + leap smearing, monotonic clock, fail-fast + rút khỏi LB |
| **Cấp machine ID** | Hai node cùng worker ID (config sai, lease hết hạn mà node vẫn sống, hash đụng) | **Trùng ID âm thầm** — tệ nhất vì không lỗi ngay, chỉ vỡ khi hai bản ghi gặp nhau | Registry có tính duy nhất cưỡng chế (ZK ephemeral / conditional write), fail-fast khi không chiếm được ID |
| **ZooKeeper / etcd** | Cụm chết | Node **mới** không start được; node **đang chạy** vẫn sinh ID bình thường | Đây là điểm mạnh của thiết kế: ZK nằm ngoài đường nóng. Vẫn cần HA cho ZK để auto-scaling không kẹt |
| **Cạn sequence** | > 4,096 ID/ms trên một node | Busy-wait, latency p99 nhảy vọt | Alarm trên số lần rơi vào nhánh chờ. Thêm node hoặc tăng bit sequence |
| **Tràn timestamp** | Hết 2^41 ms kể từ epoch | ID tràn sang bit dấu → **ID âm** | Lịch hết hạn phải được ghi vào runbook. Alarm khi còn 5 năm |
| **Client JS** | ID 64-bit bị làm tròn qua JSON | ID sai ở những chữ số cuối, lookup 404 | **Serialize ID ra string** ở API boundary |
| **Node bị pause dài** (GC, VM suspend) | Tỉnh lại sau khi lease worker ID đã hết hạn và bị cấp cho node khác | Trùng ID | Kiểm tra lease còn hiệu lực **trước mỗi lần sinh** (hoặc mỗi batch), fencing token |

Ba metric đáng monitor nhất: **`clock_backwards_total`** (phải luôn bằng 0 — khác 0 là page người ngay), **`sequence_exhausted_total`** (số lần phải chờ sang ms mới; tăng đều = sắp chạm trần), **`worker_id_lease_age`** (gần hết mà chưa renew = sắp có sự cố trùng ID). Và một bài test bắt buộc trong CI: **sinh 10 triệu ID từ N thread song song, khẳng định không trùng** — rẻ, nhanh, bắt được gần hết lỗi thread-safety.

---

## Liên hệ sang AWS

| Thành phần thiết kế | Dịch vụ AWS | Vì sao hợp |
|---|---|---|
| **Ticket server / counter tập trung** | **DynamoDB atomic counter** (`UpdateItem` + `ADD #c :1`, `ReturnValues: UPDATED_NEW`) | Tăng nguyên tử, multi-AZ nên không SPOF, không phải vận hành DB riêng. **Giới hạn**: một partition key ≈ **1,000 WCU/s** — hot partition kinh điển. Thoát bằng **cấp block** (`ADD #c :1000`) rồi tiêu dần trong process |
| **Cấp / giữ machine ID (lease)** | **DynamoDB conditional write** (`attribute_not_exists(owner) OR lease_expiry < :now`) hoặc **Redis** `SET k v NX PX 30000` | Thay ZooKeeper mà không phải nuôi cụm ZK. Conditional write cho đúng ngữ nghĩa "chiếm được hoặc không", TTL lo thu hồi khi node chết |
| **Counter tốc độ cao / range allocation** | **ElastiCache (Redis)** `INCR` / `INCRBY` | Nguyên tử, sub-millisecond, hàng trăm nghìn op/s. Đổi lại có SPOF mềm (cần replica + Multi-AZ) và **mất counter nếu không bật persistence** — luôn cấp block lớn để một lần mất chỉ thủng một khoảng ID |
| **ID tuần tự đặc, thứ tự tuyệt đối** | **Aurora / RDS** — `SEQUENCE` (Postgres) hoặc `AUTO_INCREMENT` (MySQL) | Khi *cần* ID đặc và tăng đơn điệu (số hoá đơn, chứng từ kế toán — thường có ràng buộc pháp lý). `CACHE n` giảm round-trip, đổi lại có lỗ hổng khi restart |
| **Đồng bộ đồng hồ** | **Amazon Time Sync Service** (`169.254.169.123`) | NTP cục bộ mỗi AZ, **leap smearing sẵn**, không ra internet. Trên Nitro có **PTP hardware clock** chính xác cỡ microsecond — câu trả lời chuẩn cho "chống clock skew trên AWS thế nào" |
| **Danh tính node ổn định (nguồn machine ID)** | **EKS StatefulSet ordinal** (`pod-0`…`pod-N`), **ECS task ARN**, hoặc private IP trong subnet /22 | Ordinal là cách rẻ và đúng nhất: Kubernetes đảm bảo duy nhất và ổn định qua restart, ánh xạ thẳng sang 10 bit worker ID, không cần registry |
| **Sinh ID trong Lambda** | **UUIDv7 / KSUID trong code**, lease ở module scope, hoặc xin block từ ID service trên ECS | Lambda **không có danh tính node ổn định** và concurrency dễ vượt 1,024 → Snowflake thuần là lựa chọn sai |
| **Thứ tự trong stream** | **Kinesis sequence number** | Tăng đơn điệu **trong một shard** — rất tốt để dedup và checkpoint. Nhưng là chuỗi 128-bit thập phân, chỉ có thứ tự *trong shard*, gắn với vòng đời stream → **đừng dùng làm business ID** |
| **Thứ tự / dedup trong hàng đợi** | **SQS FIFO** (`MessageGroupId` + `MessageDeduplicationId`) | Khi thứ bạn thực sự cần là "xử lý đúng thứ tự, không trùng" chứ không phải "một con số duy nhất" |
| **Che ID đối ngoại** | **KMS** (giữ khoá cho FPE) hoặc cột `public_id` random có GSI/unique index | Tách internal Snowflake khỏi public ID; KMS giữ khoá nếu dùng format-preserving encryption |
| **Giám sát** | **CloudWatch custom metrics** + alarm | `clock_backwards_total` (ngưỡng > 0), `sequence_exhausted_total`, `worker_id_lease_age` |

**Một kiến trúc gọn trên AWS**, tuỳ compute:

```
Nếu chạy EKS/ECS (có danh tính node ổn định):
  StatefulSet ordinal ──► worker_id (10 bit)
  Amazon Time Sync (PTP) ──► đồng hồ tin cậy
  Snowflake sinh in-process, 0 round-trip
  CloudWatch alarm: clock_backwards > 0

Nếu chạy Lambda (không có danh tính node):
  UUIDv7 sinh in-process  ──► lưu BINARY(16)/DynamoDB S
  (hoặc) Lambda ──► DynamoDB ADD #c :1000 ──► block 1000 ID, tiêu trong execution env
```

> 💡 **Nguyên tắc**: Trước khi tự xây ID service, hỏi xem hạ tầng đã cho sẵn thứ bạn cần chưa. DynamoDB atomic counter + range allocation giải quyết đại đa số hệ thống thật với **hai chục dòng code và không có thành phần mới nào phải vận hành**. Snowflake chỉ đáng khi ràng buộc 64-bit là thật.

---

## Cách trình bày khi phỏng vấn / review

1. **Hỏi làm rõ ba ràng buộc trước khi vẽ**: ID có *bắt buộc* 64 bit không? Có *bắt buộc* là số không? "Sortable" nghĩa là thô theo ms hay tuyệt đối? Ba câu này quyết định toàn bộ phần còn lại.

2. **Nói ngay rằng throughput không phải vấn đề.** "10K/s tức 10 ID/ms, một node Snowflake làm được 4,096 ID/ms — bài này không phải bài về throughput mà về uniqueness, ordering và vận hành." Câu này nâng cuộc trò chuyện lên đúng tầng.

3. **Leo thang bốn phương án, mỗi cái hỏng ở đâu**: multi-master (không sortable, khó thêm node) → UUID (128 bit, v4 phá index) → ticket server (SPOF, round-trip) → Snowflake. Người phỏng vấn chấm **đường đi**, không chấm việc bạn biết tên Snowflake.

4. **Vẽ layout bit và tính số ngay trên bảng**: 1 + 41 + 5 + 5 + 12, rồi tính to 2^41 ms ≈ 69.7 năm và 2^12 = 4,096 ID/ms/node. Tính tại chỗ đáng giá hơn nhớ thuộc lòng.

5. **Chủ động nêu vấn đề đồng hồ trước khi bị hỏi.** Phân biệt drift / skew / **going backwards** và nói rõ chỉ cái thứ ba gây trùng ID, rồi đưa chiến lược: NTP slew-only → monotonic clock → fail-fast + rút khỏi LB khi lùi lớn. Đây là phần tách người đã vận hành thật khỏi người mới đọc sách.

6. **Chủ động nêu "machine ID lấy từ đâu"** — món nợ của Snowflake và là câu hỏi tiếp theo gần như chắc chắn. So sánh ZooKeeper/etcd vs lease DynamoDB vs config tĩnh vs suy từ IP, và **nhắc birthday paradox**: 1,024 slot thì ~38 node đã 50% khả năng đụng nếu hash bừa.

7. **Nêu giới hạn của chính thiết kế mình vừa chọn.** "Snowflake chỉ k-sorted, không phải totally ordered; cần thứ tự nhân quả thì đây là công cụ sai, lúc đó cần HLC hoặc TrueTime." Tự phản biện là tín hiệu Senior/Staff rõ nhất.

8. **Nhắc hai chi tiết nhỏ ai cũng quên**: ID 64-bit **phải serialize ra string** khi trả JSON cho JavaScript, và epoch tuỳ chỉnh là hằng số **vĩnh viễn không đổi**. Cả hai đều là sự cố production thật.

9. **Đặt bảo mật đúng chỗ.** Nói về enumeration attack và tách internal/public ID, **nhưng khẳng định rõ** ID khó đoán không thay thế authorization check.

10. **Kết bằng "khi nào không dùng cái này"**: không ràng buộc 64 bit → UUIDv7 đơn giản hơn nhiều; chạy serverless → Snowflake sai ngay từ tiền đề; quy mô vừa cần ID đặc → ticket server + block allocation là đủ. Biết **từ chối over-engineering** là thứ người ta thật sự muốn thuê.

> 💡 **Câu chốt đáng nhớ cho cả bài**: mọi thiết kế ID phân tán đều là một cách **đổi sự phối hợp lấy sự không hoàn hảo**. Ticket server giữ sự hoàn hảo (thứ tự tuyệt đối, ID đặc) và trả bằng SPOF. Snowflake và UUIDv7 vứt bỏ sự hoàn hảo (thứ tự chỉ thô, ID có lỗ hổng) để mua lấy khả năng chạy độc lập. Câu hỏi không bao giờ là "cái nào đúng", mà là **"hệ thống của tôi chịu được sự không hoàn hảo nào"**.
