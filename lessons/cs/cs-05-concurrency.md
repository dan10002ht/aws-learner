# Concurrency & Parallelism

Code "tuần tự" rất dễ hình dung: làm xong việc A rồi mới sang việc B, mọi thứ diễn ra theo đúng một thứ tự. Nhưng phần mềm thật gần như không bao giờ chạy một mình một đường: web server xử lý hàng nghìn request cùng lúc, app mobile vừa tải ảnh vừa cuộn mượt, một job batch chia việc ra nhiều CPU core. Khi nhiều luồng việc cùng "đang chạy", một lớp bug hoàn toàn mới xuất hiện — bug **không tái hiện được**, chạy 100 lần đúng 99 lần. Bài này giải thích bản chất bên dưới: vì sao những bug đó xảy ra, và làm sao tránh chúng.

## Concurrency vs Parallelism — không phải một thứ

Hai từ này hay bị dùng lẫn, nhưng chúng trả lời hai câu hỏi khác nhau:

- **Concurrency (đồng thời / xen kẽ):** *cấu trúc* chương trình để **xử lý nhiều việc trong cùng một khoảng thời gian** — nhưng không nhất thiết chạy thật sự cùng lúc. Một CPU có thể nhảy qua nhảy lại giữa các việc, mỗi việc một chút.
- **Parallelism (song song):** *thực thi* nhiều việc **thật sự cùng một thời điểm vật lý** — cần nhiều CPU core (hoặc nhiều máy).

Analogy: một **đầu bếp** nấu 3 món. Anh ta xào món A một lúc, để đó, đi luộc món B, quay lại đảo món A... — đó là **concurrency**: một người, nhiều việc, xen kẽ. Còn nếu có **3 đầu bếp** mỗi người một món — đó là **parallelism**: nhiều người, chạy thật sự song song.

```
Concurrency (1 core, xen kẽ):
core 1: [A][B][A][C][B][A][C][B] ...   <- nhảy qua lại rất nhanh

Parallelism (3 core, đồng thời):
core 1: [AAAAAAAAAAAA]
core 2: [BBBBBBBBBBBB]
core 3: [CCCCCCCCCCCC]
```

> 💡 Ghi nhớ: "Concurrency là *cách bạn tổ chức* công việc; parallelism là *cách phần cứng chạy* nó." Một chương trình có thể concurrent mà không parallel (1 core), và bạn viết code concurrent trước, rồi runtime/OS quyết định có chạy parallel hay không.

## Vì sao cần? — I/O bound vs CPU bound

Câu hỏi quan trọng nhất trước khi tối ưu: **việc của bạn đang chờ cái gì?**

| Loại tác vụ | Nút thắt cổ chai | Ví dụ | Giải pháp đúng |
|-------------|------------------|-------|----------------|
| **I/O bound** | Đang **chờ** thứ bên ngoài | Gọi API, query DB, đọc file, tải mạng | Concurrency (1 core là đủ) |
| **CPU bound** | Đang **tính toán** liên tục | Nén ảnh, hash, train model, sort khối lớn | Parallelism (cần nhiều core) |

Lý do then chốt: với **I/O bound**, CPU phần lớn thời gian **ngồi không chờ** mạng/đĩa trả lời (chậm hơn CPU hàng triệu lần). Trong lúc chờ request A, ta cứ việc đi gửi request B, C, D. Một core duy nhất phục vụ được hàng nghìn kết nối — vì việc thật sự chỉ là "chờ".

```
Tuần tự gọi 3 API, mỗi API mất 100ms:
[--A--][--B--][--C--]            -> 300ms, CPU ngồi không 297ms

Concurrent (xen kẽ trong lúc chờ):
[A gửi][B gửi][C gửi]....chờ.... -> ~100ms, vẫn 1 core
```

Với **CPU bound** thì ngược lại: CPU đã chạy 100%, xen kẽ thêm việc *không giúp gì* — chỉ tốn thêm chi phí chuyển ngữ cảnh. Lúc này cách duy nhất nhanh hơn là **chia việc ra nhiều core thật**.

> ⚠️ Bẫy: Áp nhầm công cụ là sai lầm kinh điển. Dùng đa luồng để "tăng tốc" một vòng lặp tính toán nặng trong Python sẽ **không nhanh hơn** (vì GIL, xem bên dưới). Ngược lại, spawn 1000 process để gọi 1000 API là phí tài nguyên — async một core làm tốt hơn.

## Race condition — gốc rễ mọi rắc rối

Khi nhiều luồng (thread) cùng đọc/ghi **chung một dữ liệu**, kết quả có thể phụ thuộc vào **thứ tự tình cờ** mà chúng chạy. Đó là **race condition** — "điều kiện chạy đua".

Ví dụ kinh điển nhất: hai thread cùng tăng một biến đếm `counter += 1`.

```python
counter = 0  # chung

def add_many():
    global counter
    for _ in range(1_000_000):
        counter += 1   # tưởng là 1 lệnh, thật ra là 3 bước!

# Chạy 2 thread cùng gọi add_many()
# Kỳ vọng: counter == 2_000_000
# Thực tế: thường < 2_000_000, mỗi lần chạy ra số khác nhau (!)
```

Vấn đề: `counter += 1` **không phải** một thao tác nguyên tử. CPU thực thi nó qua 3 bước:

```
1. READ   tmp <- counter      (đọc giá trị hiện tại vào thanh ghi)
2. ADD    tmp <- tmp + 1      (cộng 1)
3. WRITE  counter <- tmp      (ghi ngược lại)
```

Giờ tưởng tượng hai thread bị xen kẽ đúng lúc xấu (`counter` đang là 41):

```
Thread A           Thread B           counter
READ tmp=41                            41
                   READ tmp=41         41    <- B đọc trước khi A ghi!
ADD  tmp=42                            41
                   ADD  tmp=42         41
WRITE counter=42                       42
                   WRITE counter=42    42    <- mất 1 lần tăng!
```

Hai lần `+1` mà `counter` chỉ tăng 1. Mỗi lần chạy, OS lập lịch thread khác nhau → mất số lượng khác nhau → **bug không tái hiện ổn định**. Đoạn code đọc-sửa-ghi chung này gọi là **critical section** (vùng tới hạn): vùng mà tại một thời điểm **chỉ được phép một thread** vào.

> 💡 Ghi nhớ: Race condition không cần parallelism thật mới xảy ra. Chỉ cần **xen kẽ** (concurrency) tại điểm xấu là đủ — kể cả trên 1 core, OS có thể ngắt thread A giữa bước READ và WRITE.

## Mutex / Lock — xếp hàng vào critical section

Cách trực tiếp nhất để bảo vệ critical section: dùng **mutex** (mutual exclusion — loại trừ lẫn nhau), thường gọi là **lock**. Lock như **chìa khoá nhà vệ sinh một người**: ai muốn vào phải cầm chìa; ai đến sau phải **chờ** đến khi chìa được trả.

```python
import threading
counter = 0
lock = threading.Lock()

def add_many():
    global counter
    for _ in range(1_000_000):
        with lock:          # acquire — chờ nếu thread khác đang giữ
            counter += 1    # critical section, đảm bảo độc quyền
        # ra khỏi 'with' -> release tự động
# Bây giờ counter LUÔN == 2_000_000
```

```
Thread A: acquire(lock) -> [vào critical section] -> release(lock)
Thread B:        chờ............................^   -> acquire -> vào
```

Lock đúng đắn nhưng có giá: nó **tuần tự hoá** vùng được khoá. Nếu khoá quá rộng, bạn vô tình biến code song song trở lại thành tuần tự — gọi là **lock contention** (tranh chấp lock), một nguyên nhân tụt performance phổ biến.

> ⚠️ Bẫy: Khoá càng to càng "an toàn" nhưng càng chậm. Quy tắc: **giữ lock càng ngắn càng tốt** — đừng gọi network/đọc file *bên trong* critical section. Khoá đúng cái cần bảo vệ, làm phần chậm ngoài vùng khoá.

## Deadlock — khi tất cả cùng kẹt

Khi có nhiều hơn một lock, một thảm hoạ mới xuất hiện: **deadlock** — hai (hay nhiều) thread chờ nhau vĩnh viễn, không ai nhường.

Analogy: hai người đi ngược chiều trên cầu một làn. A bước nửa cầu, B cũng bước nửa cầu từ đầu kia. A chờ B lùi, B chờ A lùi — cả hai đứng im mãi mãi.

```python
lock_A = threading.Lock()
lock_B = threading.Lock()

def thread_1():
    with lock_A:           # giữ A
        with lock_B:       # chờ B...
            ...

def thread_2():
    with lock_B:           # giữ B
        with lock_A:       # chờ A...  -> DEADLOCK
            ...
```

```
Thread 1: giữ A, chờ B ─┐
                        ├─ vòng chờ khép kín -> kẹt vĩnh viễn
Thread 2: giữ B, chờ A ─┘
```

Deadlock chỉ xảy ra khi **cả 4 điều kiện Coffman** đồng thời đúng. Phá vỡ **bất kỳ một** điều kiện là hết deadlock:

| # | Điều kiện | Nghĩa | Cách phá vỡ |
|---|-----------|-------|-------------|
| 1 | **Mutual exclusion** | Tài nguyên chỉ một thread giữ được | Dùng tài nguyên chia sẻ được (khó với lock) |
| 2 | **Hold and wait** | Đang giữ lock này, lại chờ lock khác | Lấy hết lock cùng lúc, hoặc không lấy gì cả |
| 3 | **No preemption** | Không thể giật lock từ thread khác | Cho phép timeout rồi nhả ra (`tryLock`) |
| 4 | **Circular wait** | Chuỗi chờ tạo thành vòng tròn | **Luôn lấy lock theo một thứ tự cố định** |

Cách phá vỡ thực tế và dễ nhất là điều kiện **#4**: quy ước **mọi nơi luôn acquire lock theo cùng một thứ tự** (ví dụ luôn `lock_A` trước `lock_B`). Khi đó không thể tạo vòng tròn chờ.

> 💡 Ghi nhớ: Đa số deadlock production đến từ việc **lấy nhiều lock theo thứ tự khác nhau ở các nơi khác nhau**. Đặt một quy tắc thứ tự lock toàn cục và tuân thủ tuyệt đối là liều thuốc rẻ nhất.

## Atomic operation — "một phát ăn ngay"

Một thao tác **atomic** là thao tác mà CPU/runtime đảm bảo chạy **trọn vẹn, không thể bị ngắt giữa chừng**, không có thread nào nhìn thấy "trạng thái dở dang". Nó như lật một công tắc: hoặc bật, hoặc tắt — không có "đang lật".

Nhớ lại race condition: vấn đề là `counter += 1` *không* atomic (3 bước tách rời). Nhiều ngôn ngữ/CPU cung cấp lệnh atomic như "compare-and-swap" (CAS) hoặc kiểu `AtomicInteger`/`atomic<int>` để làm `+1` trong **một bước không chia cắt**:

```python
# Ý tưởng atomic increment (giả sử có sẵn):
atomic_counter.increment()   # READ+ADD+WRITE gộp thành 1 thao tác bất khả chia

# So với phiên bản hỏng:
counter += 1                 # 3 bước -> race
```

Atomic thường **nhanh hơn lock** cho các cập nhật đơn giản (đếm, set cờ), vì nó dùng chỉ thị phần cứng thay vì xếp hàng chờ. Nhưng nó chỉ hợp với thao tác **một biến, đơn giản**. Cập nhật phối hợp nhiều biến vẫn cần lock.

> ⚠️ Bẫy: "Mỗi lệnh atomic" không bằng "cả khối logic atomic". `if not exists: create()` gồm hai thao tác atomic riêng lẻ vẫn race — giữa `if` và `create`, thread khác có thể chen vào tạo trùng. Đây là bug "check-then-act" kinh điển.

## 3 mô hình chạy: async/await vs thread vs process

Có ba cách phổ biến để làm nhiều việc cùng lúc, mỗi cách hợp một bài toán:

| Mô hình | Đơn vị | Bộ nhớ chung? | Hợp với | Chi phí |
|---------|--------|----------------|---------|---------|
| **async/await** | Task trên 1 thread | Có (cùng thread, không race kiểu thread) | I/O bound | Rất rẻ (hàng nghìn task) |
| **Thread** | Luồng trong 1 process | **Có** → dễ race | I/O bound, vài CPU (ngôn ngữ không GIL) | Trung bình |
| **Process** | Tiến trình riêng | **Không** (cách ly) | CPU bound thật | Đắt (RAM, khởi tạo) |

### async/await & event loop (Node.js)

Node.js chạy code JS của bạn trên **một thread duy nhất** với một **event loop** — một vòng lặp liên tục hỏi: "có việc I/O nào xong chưa? Có thì chạy callback của nó." Khi bạn `await fetch(...)`, hàm **nhường quyền** lại cho event loop để nó đi làm việc khác trong lúc chờ mạng — chứ không block cả thread.

```
Event loop (1 thread):
  -> chạy code đến chỗ await fetch  (đăng ký "khi xong gọi tôi")
  -> đi làm task khác trong lúc chờ
  -> mạng trả lời  -> đặt callback vào hàng đợi
  -> event loop nhặt callback, chạy tiếp
```

Vì chỉ một thread chạy code JS, bạn **không gặp race kiểu hai thread ghi chung biến**. Đổi lại: một vòng lặp tính toán nặng (CPU bound) sẽ **chặn cả event loop** → cả server đứng hình. Đó là lý do trong Node, việc nặng CPU phải đẩy sang worker/process khác.

> ⚠️ Bẫy: Trong Node, một hàm "đồng bộ" tốn 2 giây (ví dụ `JSON.parse` file khổng lồ, hoặc vòng lặp tính toán) làm **mọi** request khác phải chờ 2 giây. Bug "server thỉnh thoảng treo" thường là một chỗ block event loop.

### Python GIL — vì sao thread không tăng tốc CPU

Python (bản CPython phổ biến) có **GIL** (Global Interpreter Lock): một lock toàn cục cho phép **chỉ một thread chạy bytecode Python tại một thời điểm**. Nghĩa là dù bạn tạo 8 thread trên máy 8 core, code Python thuần vẫn **không chạy song song thật** cho tác vụ CPU.

```
Máy 8 core, 8 thread Python, tác vụ CPU bound:
  Thực tế: chỉ 1 thread giữ GIL chạy tại 1 thời điểm
  -> không nhanh hơn 1 thread, thậm chí chậm hơn (chi phí tranh GIL)
```

Nhưng GIL **được nhả ra khi thread chờ I/O**. Nên với I/O bound (gọi API, query DB), nhiều thread vẫn hữu ích — trong lúc thread này chờ mạng, thread kia chạy. Còn muốn dùng nhiều core cho CPU bound trong Python, bạn cần **multiprocessing** (nhiều process, mỗi process một GIL riêng).

| Bài toán trong Python | Dùng | Lý do |
|-----------------------|------|-------|
| Gọi 100 API | `asyncio` hoặc threads | I/O bound, GIL nhả khi chờ |
| Nén 100 ảnh | `multiprocessing` | CPU bound, cần core thật |

> 💡 Ghi nhớ: "Thread trong Python tăng tốc I/O, *không* tăng tốc tính toán." Hiểu một câu này tránh được vô số giờ tối ưu sai hướng.

## Memory visibility — biến đã đổi mà thread khác không thấy

Một bug khó tin nhưng có thật: thread A gán `done = True`, nhưng thread B trong vòng `while not done:` **chạy mãi không dừng** — dù A *đã* gán xong từ lâu.

Nguyên nhân nằm ở phần cứng: mỗi CPU core có **cache riêng**. Thread A có thể ghi `done = True` vào cache của core nó, **chưa kịp đồng bộ** xuống RAM chung. Core của thread B vẫn đọc giá trị `False` cũ trong cache của nó. Ngoài ra, compiler/CPU còn được phép **sắp xếp lại thứ tự lệnh** (reordering) để tối ưu, miễn kết quả với *một thread* không đổi — nhưng với nhiều thread thì lộ ra bất ngờ.

```
Core A cache: done = True   (đã ghi, chưa flush)
RAM:          done = False  (giá trị cũ)
Core B cache: done = False  (đọc cũ -> while chạy mãi)
```

Giải pháp: dùng cơ chế ngôn ngữ đảm bảo **visibility** — `volatile` (Java), biến atomic, hoặc đơn giản là dùng lock (lock cũng ép đồng bộ memory). Đừng tự chế cờ bằng biến thường rồi giả định thread khác "sẽ thấy ngay".

> ⚠️ Bẫy: Code này có thể "chạy đúng trên máy bạn" rồi treo trên server production — vì kiến trúc CPU, số core, mức tải khác nhau làm lộ ra reordering/cache mà máy dev không lộ. Visibility bug là loại "không tái hiện" tệ nhất.

## Vì sao bug concurrency khó tái hiện — và cách né

Gom lại, ba thứ làm bug concurrency thành ác mộng:

1. **Phụ thuộc timing:** lỗi chỉ xảy ra khi hai thread xen kẽ đúng tích tắc xấu — xác suất thấp, không lặp lại.
2. **Heisenbug:** thêm `log`/debugger làm thay đổi timing → bug *biến mất* khi bạn quan sát.
3. **Phụ thuộc môi trường:** số core, tải, kiến trúc CPU khác nhau → dev máy không lộ, production lộ.

Vì *truy bắt* khó, chiến lược đúng là **thiết kế để bug không thể xảy ra ngay từ đầu**. Hai vũ khí mạnh nhất:

### 1. Immutability — dữ liệu không đổi thì không có race

Nếu dữ liệu **không bao giờ bị sửa** sau khi tạo, thì nhiều thread đọc nó **bao nhiêu cũng an toàn** — không ghi thì không có critical section. Muốn "thay đổi", tạo bản sao mới thay vì sửa tại chỗ.

```python
# Thay vì sửa config dùng chung (dễ race):
config["timeout"] = 30        # nhiều thread cùng ghi -> nguy hiểm

# Tạo bản mới, thay nguyên reference (an toàn hơn):
new_config = {**config, "timeout": 30}
```

### 2. Message passing — không chia sẻ bộ nhớ, mà gửi tin nhắn

Triết lý nổi tiếng của Go: *"Đừng giao tiếp bằng cách chia sẻ bộ nhớ; hãy chia sẻ bộ nhớ bằng cách giao tiếp."* Thay vì nhiều thread cùng đụng một biến (cần lock), mỗi worker giữ dữ liệu **riêng** của nó và **gửi message** cho nhau qua một hàng đợi (channel/queue). Chỉ một chủ sở hữu một dữ liệu tại một thời điểm → không race, không lock.

```
Chia sẻ bộ nhớ (cần lock, dễ race):
  T1 ─┐
  T2 ─┼─> [biến chung] <- ai cũng ghi -> phải khoá
  T3 ─┘

Message passing (mỗi worker riêng, gửi tin):
  Producer ──msg──> [queue] ──msg──> Consumer
                    (1 chủ sở hữu tại 1 thời điểm)
```

Mô hình này không chỉ tránh bug — nó còn **scale ra nhiều máy**: "message qua queue" trên một máy và "message qua queue qua mạng" giữa nhiều máy là **cùng một mô hình tư duy**.

> 💡 Ghi nhớ: Cách an toàn nhất để xử lý concurrency là **giảm tối đa state chia sẻ có thể thay đổi** (shared mutable state). Không có dữ liệu chung bị sửa → không có race. Immutability và message passing đều phục vụ đúng mục tiêu đó.

## Vì sao kỹ sư cần biết

- **Debug:** Khi gặp bug "thỉnh thoảng sai", "chạy lại thì hết", "có khi treo không rõ lý do" — phản xạ đầu tiên phải là nghi **race condition / deadlock / visibility**. Biết rằng `counter += 1` không atomic, hay một hàm đồng bộ nặng chặn event loop Node, giúp bạn khoanh vùng trong phút thay vì ngày. Heisenbug (thêm log thì hết bug) gần như chắc chắn là bug concurrency.
- **Performance:** Chọn đúng công cụ theo **I/O bound vs CPU bound** quyết định thành bại. Dùng thread cho CPU bound trong Python (GIL) là vô ích; spawn process cho I/O bound là lãng phí. Lock quá rộng (lock contention) biến hệ thống "đa luồng" thành tuần tự trá hình — một nguyên nhân tụt throughput rất hay bị bỏ sót.
- **System design & AWS:** Mô hình **message passing** chính là nền tảng kiến trúc phân tán hiện đại. AWS **SQS** (queue) và **SNS** (pub/sub) cho phép các service giao tiếp qua message thay vì chia sẻ state — đúng triết lý "share by communicating", và nhờ đó decouple, retry, scale độc lập được. Khi nhiều **Lambda** chạy song song cùng ghi vào một item DynamoDB, bạn gặp lại y hệt race condition ở quy mô phân tán — và lời giải cũng tương tự: thao tác **atomic** (DynamoDB `UpdateExpression` / conditional write, optimistic locking) thay vì "đọc rồi ghi". Hiểu concurrency ở mức một máy giúp bạn lập tức hiểu vì sao hệ phân tán cần những công cụ đó.
