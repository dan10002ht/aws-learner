# Concurrency & Parallelism

Code "tuần tự" rất dễ hình dung: làm xong việc A rồi mới sang việc B, mọi thứ diễn ra theo đúng một thứ tự. Nhưng phần mềm thật gần như không bao giờ chạy một mình một đường: web server xử lý hàng nghìn request cùng lúc, app mobile vừa tải ảnh vừa cuộn mượt, một job batch chia việc ra nhiều CPU core. Khi nhiều luồng việc cùng "đang chạy", một lớp bug hoàn toàn mới xuất hiện — bug **không tái hiện được**, chạy 100 lần đúng 99 lần. Bài này giải thích bản chất bên dưới: vì sao những bug đó xảy ra, và làm sao tránh chúng.

## Concurrency vs Parallelism — không phải một thứ

Hai từ này hay bị dùng lẫn, nhưng chúng trả lời hai câu hỏi khác nhau:

- **Concurrency (đồng thời / xen kẽ):** *cấu trúc* chương trình để **xử lý nhiều việc trong cùng một khoảng thời gian** — nhưng không nhất thiết chạy thật sự cùng lúc. Một CPU có thể nhảy qua nhảy lại giữa các việc, mỗi việc một chút.
- **Parallelism (song song):** *thực thi* nhiều việc **thật sự cùng một thời điểm vật lý** — cần nhiều CPU core (hoặc nhiều máy).

Analogy: một **đầu bếp** nấu 3 món. Anh ta xào món A một lúc, để đó, đi luộc món B, quay lại đảo món A... — đó là **concurrency**: một người, nhiều việc, xen kẽ. Còn nếu có **3 đầu bếp** mỗi người một món — đó là **parallelism**: nhiều người, chạy thật sự song song.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Concurrency so với Parallelism trên timeline</title>
  <desc>Concurrency: một core nhảy xen kẽ giữa task A, B, C theo thời gian. Parallelism: ba core, mỗi core chạy liền một task song song cùng lúc.</desc>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Concurrency — 1 core, xen kẽ</text>
  <text x="16" y="42" font-size="11" fill="currentColor" opacity="0.65">một core nhảy qua lại giữa các task, mỗi task một chút</text>
  <text x="16" y="78" font-size="12" font-weight="700" fill="currentColor">core 1</text>
  <g stroke="currentColor" stroke-opacity="0.5">
    <line x1="70" y1="100" x2="690" y2="100"/>
    <line x1="70" y1="56" x2="70" y2="100"/>
  </g>
  <g font-size="12" font-weight="700" text-anchor="middle">
    <rect x="70" y="62" width="78" height="30" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="109" y="82" fill="currentColor">A</text>
    <rect x="148" y="62" width="78" height="30" rx="5" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="187" y="82" fill="currentColor">B</text>
    <rect x="226" y="62" width="78" height="30" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="265" y="82" fill="currentColor">A</text>
    <rect x="304" y="62" width="78" height="30" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="343" y="82" fill="currentColor">C</text>
    <rect x="382" y="62" width="78" height="30" rx="5" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="421" y="82" fill="currentColor">B</text>
    <rect x="460" y="62" width="78" height="30" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="499" y="82" fill="currentColor">A</text>
    <rect x="538" y="62" width="78" height="30" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="577" y="82" fill="currentColor">C</text>
    <rect x="616" y="62" width="74" height="30" rx="5" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="653" y="82" fill="currentColor">B</text>
  </g>
  <text x="690" y="116" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.6">thời gian →</text>
  <text x="16" y="172" font-size="14" font-weight="700" fill="currentColor">Parallelism — 3 core, đồng thời</text>
  <text x="16" y="190" font-size="11" fill="currentColor" opacity="0.65">mỗi core chạy liền một task, thật sự song song cùng thời điểm</text>
  <g font-size="12" font-weight="700">
    <text x="16" y="225" fill="currentColor">core 1</text>
    <rect x="70" y="210" width="620" height="22" rx="5" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="380" y="225" text-anchor="middle" fill="currentColor">task A</text>
    <text x="16" y="255" fill="currentColor">core 2</text>
    <rect x="70" y="240" width="620" height="22" rx="5" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="380" y="255" text-anchor="middle" fill="currentColor">task B</text>
    <text x="16" y="285" fill="currentColor">core 3</text>
    <rect x="70" y="270" width="620" height="22" rx="5" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/>
    <text x="380" y="285" text-anchor="middle" fill="currentColor">task C</text>
  </g>
  <text x="690" y="308" font-size="10.5" text-anchor="end" fill="currentColor" opacity="0.6">thời gian →</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Race condition: hai thread xen kẽ làm mất một lần tăng counter</title>
  <desc>Thread A và Thread B xen kẽ các bước READ, ADD, WRITE theo thời gian đi xuống. B đọc giá trị 41 trước khi A kịp ghi, nên hai lần tăng chỉ làm counter từ 41 lên 42 thay vì 43.</desc>
  <text x="120" y="26" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Thread A</text>
  <text x="360" y="26" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">Thread B</text>
  <text x="630" y="26" font-size="13.5" font-weight="700" text-anchor="middle" fill="currentColor">counter</text>
  <g stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 4">
    <line x1="120" y1="36" x2="120" y2="330"/>
    <line x1="360" y1="36" x2="360" y2="330"/>
    <line x1="630" y1="36" x2="630" y2="330"/>
  </g>
  <g font-size="12" font-weight="700" text-anchor="middle">
    <rect x="44" y="52" width="152" height="28" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="120" y="71" fill="currentColor">READ tmp=41</text>
    <text x="630" y="71" fill="currentColor">41</text>

    <rect x="284" y="96" width="152" height="28" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="360" y="115" fill="currentColor">READ tmp=41</text>
    <text x="630" y="115" fill="currentColor">41</text>
    <text x="630" y="135" font-size="10" font-weight="400" fill="#f59e0b">B đọc trước khi A ghi!</text>

    <rect x="44" y="148" width="152" height="28" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="120" y="167" fill="currentColor">ADD tmp=42</text>
    <text x="630" y="167" fill="currentColor">41</text>

    <rect x="284" y="192" width="152" height="28" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="360" y="211" fill="currentColor">ADD tmp=42</text>
    <text x="630" y="211" fill="currentColor">41</text>

    <rect x="44" y="236" width="152" height="28" rx="6" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.25"/><text x="120" y="255" fill="currentColor">WRITE counter=42</text>
    <text x="630" y="255" fill="currentColor">42</text>

    <rect x="284" y="280" width="152" height="28" rx="6" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.25"/><text x="360" y="299" fill="currentColor">WRITE counter=42</text>
    <text x="630" y="299" fill="#f59e0b">42</text>
    <text x="630" y="320" font-size="10" font-weight="400" fill="#f59e0b">mất 1 lần tăng (43→42)</text>
  </g>
  <text x="16" y="200" font-size="10.5" fill="currentColor" opacity="0.6" transform="rotate(-90 16 200)" text-anchor="middle">thời gian ↓</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Deadlock vòng chờ khép kín và cách phá vòng bằng thứ tự lock cố định</title>
  <desc>Bên trái: Thread 1 giữ lock A chờ lock B, Thread 2 giữ lock B chờ lock A, tạo vòng tròn khép kín nên kẹt vĩnh viễn. Bên phải: cả hai thread luôn lấy lock theo cùng thứ tự A rồi B nên không tạo được vòng tròn, hết deadlock.</desc>
  <defs>
    <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker>
  </defs>
  <text x="180" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Vòng chờ khép kín → DEADLOCK</text>
  <text x="540" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Thứ tự lock cố định → an toàn</text>
  <line x1="360" y1="44" x2="360" y2="300" stroke="currentColor" stroke-opacity="0.2"/>

  <g font-size="12" text-anchor="middle">
    <rect x="40" y="70" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="100" y="88" font-weight="700" fill="currentColor">Thread 1</text>
    <text x="100" y="103" font-size="10.5" fill="currentColor" opacity="0.7">giữ A</text>
    <rect x="200" y="70" width="120" height="40" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="260" y="88" font-weight="700" fill="currentColor">lock B</text>
    <rect x="40" y="230" width="120" height="40" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="100" y="248" font-weight="700" fill="currentColor">lock A</text>
    <rect x="200" y="230" width="120" height="40" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="260" y="248" font-weight="700" fill="currentColor">Thread 2</text>
    <text x="260" y="263" font-size="10.5" fill="currentColor" opacity="0.7">giữ B</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#ah)" stroke-width="1.6">
    <path d="M160 86 H196"/>
    <path d="M196 254 H164"/>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#ah)" stroke-width="1.6" stroke-dasharray="5 4">
    <path d="M260 110 V226"/>
    <path d="M100 230 V114"/>
  </g>
  <text x="180" y="135" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">T1 chờ B</text>
  <text x="178" y="207" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">T2 chờ A</text>

  <g font-size="12" text-anchor="middle">
    <rect x="420" y="64" width="120" height="36" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="480" y="86" font-weight="700" fill="currentColor">Thread 1</text>
    <rect x="600" y="64" width="120" height="36" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="660" y="86" font-weight="700" fill="currentColor">Thread 2</text>
    <rect x="440" y="150" width="100" height="34" rx="8" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="490" y="172" font-weight="700" fill="currentColor">lock A</text>
    <rect x="440" y="220" width="100" height="34" rx="8" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="490" y="242" font-weight="700" fill="currentColor">lock B</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#ah)" stroke-width="1.6">
    <path d="M474 100 V146"/>
    <path d="M648 100 C620 124 540 130 526 148"/>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#ah)" stroke-width="1.6">
    <path d="M490 184 V216"/>
  </g>
  <text x="660" y="200" font-size="11" text-anchor="middle" fill="currentColor">cả hai lấy</text>
  <text x="660" y="216" font-size="11" text-anchor="middle" fill="currentColor" font-weight="700">A trước, B sau</text>
  <text x="612" y="278" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.75">không có vòng tròn → không kẹt</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Event loop một thread với async/await</title>
  <desc>Event loop chạy code đến chỗ await fetch thì đăng ký callback và đi làm task khác trong lúc chờ. Khi mạng trả lời, callback được đẩy vào hàng đợi callback. Event loop nhặt callback từ hàng đợi và chạy tiếp.</desc>
  <defs>
    <marker id="ev" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker>
  </defs>
  <text x="16" y="24" font-size="14" font-weight="700" fill="currentColor">Event loop — 1 thread duy nhất</text>

  <circle cx="180" cy="170" r="78" fill="#8b5cf6" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="180" y="166" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">event loop</text>
  <text x="180" y="184" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">vòng lặp mãi</text>

  <g font-size="11.5" text-anchor="middle">
    <rect x="340" y="60" width="200" height="48" rx="9" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="440" y="80" font-weight="700" fill="currentColor">chạy code → gặp await fetch</text>
    <text x="440" y="97" font-size="10" fill="currentColor" opacity="0.7">đăng ký "khi xong gọi tôi"</text>

    <rect x="560" y="146" width="148" height="48" rx="9" fill="#f59e0b" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="634" y="166" font-weight="700" fill="currentColor">mạng / I/O</text>
    <text x="634" y="183" font-size="10" fill="currentColor" opacity="0.7">đang chờ trả lời</text>

    <rect x="340" y="248" width="200" height="56" rx="9" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/>
    <text x="440" y="270" font-weight="700" fill="currentColor">hàng đợi callback</text>
    <text x="440" y="288" font-size="10" fill="currentColor" opacity="0.7">mạng trả lời → đẩy callback vào</text>
  </g>

  <g stroke="currentColor" fill="none" marker-end="url(#ev)" stroke-width="1.6">
    <path d="M256 130 C300 110 320 96 338 88"/>
    <path d="M540 100 C580 116 600 130 612 144"/>
    <path d="M560 188 C500 230 480 240 466 248"/>
    <path d="M338 280 C300 270 280 230 250 200"/>
  </g>
  <text x="300" y="96" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">① chạy task</text>
  <text x="595" y="120" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">② chờ</text>
  <text x="565" y="232" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">③ xong</text>
  <text x="262" y="246" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">④ nhặt callback, chạy tiếp</text>
  <text x="180" y="270" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">trong lúc ② chờ:</text>
  <text x="180" y="286" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.7">loop đi làm task khác</text>
</svg>

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

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" style="width:100%;max-width:720px;height:auto;display:block;margin:1.25rem auto" font-family="ui-sans-serif, system-ui, sans-serif">
  <title>Shared memory so với Message passing</title>
  <desc>Bên trái: ba thread cùng ghi vào một biến chung nên cần lock và dễ race. Bên phải: Producer gửi message qua queue tới Consumer, mỗi worker giữ dữ liệu riêng nên không race, không cần lock.</desc>
  <defs>
    <marker id="mp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker>
  </defs>
  <text x="180" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Shared memory</text>
  <text x="180" y="42" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">cần lock, dễ race</text>
  <text x="540" y="24" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">Message passing</text>
  <text x="540" y="42" font-size="10.5" text-anchor="middle" fill="currentColor" opacity="0.65">mỗi worker giữ dữ liệu riêng</text>
  <line x1="360" y1="56" x2="360" y2="285" stroke="currentColor" stroke-opacity="0.2"/>

  <g font-size="12" text-anchor="middle" font-weight="700">
    <rect x="30" y="80" width="86" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/><text x="73" y="102" fill="currentColor">T1</text>
    <rect x="30" y="138" width="86" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/><text x="73" y="160" fill="currentColor">T2</text>
    <rect x="30" y="196" width="86" height="34" rx="7" fill="#3b82f6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/><text x="73" y="218" fill="currentColor">T3</text>
    <rect x="206" y="124" width="120" height="62" rx="9" fill="#f59e0b" fill-opacity="0.18" stroke="currentColor" stroke-opacity="0.35"/>
    <text x="266" y="150" fill="currentColor">biến chung</text>
    <text x="266" y="170" font-size="9.5" font-weight="400" fill="currentColor" opacity="0.75">ai cũng ghi</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#mp)" stroke-width="1.6">
    <path d="M116 97 C160 110 175 130 204 145"/>
    <path d="M116 155 H202"/>
    <path d="M116 213 C160 200 175 180 204 165"/>
  </g>
  <text x="266" y="210" font-size="10.5" text-anchor="middle" fill="#f59e0b" font-weight="700">→ phải khoá (lock)</text>

  <g font-size="12" text-anchor="middle" font-weight="700">
    <rect x="402" y="128" width="104" height="44" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="454" y="155" fill="currentColor">Producer</text>
    <rect x="542" y="128" width="70" height="44" rx="8" fill="#8b5cf6" fill-opacity="0.14" stroke="currentColor" stroke-opacity="0.3"/><text x="577" y="155" fill="currentColor">queue</text>
    <rect x="640" y="128" width="60" height="44" rx="8" fill="#10b981" fill-opacity="0.16" stroke="currentColor" stroke-opacity="0.3"/><text x="670" y="150" fill="currentColor" font-size="11">Consu</text><text x="670" y="164" fill="currentColor" font-size="11">mer</text>
  </g>
  <g stroke="currentColor" fill="none" marker-end="url(#mp)" stroke-width="1.6">
    <path d="M506 150 H538"/>
    <path d="M612 150 H636"/>
  </g>
  <text x="522" y="120" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">msg</text>
  <text x="624" y="120" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.75">msg</text>
  <text x="540" y="208" font-size="10.5" text-anchor="middle" fill="#10b981" font-weight="700">1 chủ sở hữu tại 1 thời điểm → không race</text>
</svg>

Mô hình này không chỉ tránh bug — nó còn **scale ra nhiều máy**: "message qua queue" trên một máy và "message qua queue qua mạng" giữa nhiều máy là **cùng một mô hình tư duy**.

> 💡 Ghi nhớ: Cách an toàn nhất để xử lý concurrency là **giảm tối đa state chia sẻ có thể thay đổi** (shared mutable state). Không có dữ liệu chung bị sửa → không có race. Immutability và message passing đều phục vụ đúng mục tiêu đó.

## Vì sao kỹ sư cần biết

- **Debug:** Khi gặp bug "thỉnh thoảng sai", "chạy lại thì hết", "có khi treo không rõ lý do" — phản xạ đầu tiên phải là nghi **race condition / deadlock / visibility**. Biết rằng `counter += 1` không atomic, hay một hàm đồng bộ nặng chặn event loop Node, giúp bạn khoanh vùng trong phút thay vì ngày. Heisenbug (thêm log thì hết bug) gần như chắc chắn là bug concurrency.
- **Performance:** Chọn đúng công cụ theo **I/O bound vs CPU bound** quyết định thành bại. Dùng thread cho CPU bound trong Python (GIL) là vô ích; spawn process cho I/O bound là lãng phí. Lock quá rộng (lock contention) biến hệ thống "đa luồng" thành tuần tự trá hình — một nguyên nhân tụt throughput rất hay bị bỏ sót.
- **System design & AWS:** Mô hình **message passing** chính là nền tảng kiến trúc phân tán hiện đại. AWS **SQS** (queue) và **SNS** (pub/sub) cho phép các service giao tiếp qua message thay vì chia sẻ state — đúng triết lý "share by communicating", và nhờ đó decouple, retry, scale độc lập được. Khi nhiều **Lambda** chạy song song cùng ghi vào một item DynamoDB, bạn gặp lại y hệt race condition ở quy mô phân tán — và lời giải cũng tương tự: thao tác **atomic** (DynamoDB `UpdateExpression` / conditional write, optimistic locking) thay vì "đọc rồi ghi". Hiểu concurrency ở mức một máy giúp bạn lập tức hiểu vì sao hệ phân tán cần những công cụ đó.
